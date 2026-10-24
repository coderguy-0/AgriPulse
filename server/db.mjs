import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

const require = createRequire(import.meta.url);

/**
 * The API uses a synchronous SQLite driver. `better-sqlite3` is preferred because it is the
 * vetted native driver used in development and deployment. Some sandboxes cannot compile
 * native modules and do not ship downloadable Node headers, so we fall back to Node's built-in
 * `node:sqlite` with a thin compatibility shim that exposes the small surface this codebase uses
 * (`pragma`, `exec`, `prepare().run/get/all`, `transaction`, `close`).
 *
 * Both drivers speak the same SQL and both bind positional `?` parameters, so the fallback does
 * not change application behaviour. It is a local-development convenience only: production must
 * run a managed database, not this file-backed shim. See docs/DEVICE_API_CONTRACTS.md.
 */
function loadDriver() {
  try {
    const BetterSqlite3 = require('better-sqlite3');
    return { name: 'better-sqlite3', create: (filename) => new BetterSqlite3(filename) };
  } catch {
    const { DatabaseSync } = require('node:sqlite');
    return { name: 'node:sqlite (development fallback)', create: (filename) => new NodeSqliteCompat(filename, DatabaseSync) };
  }
}

class NodeSqliteCompat {
  constructor(filename, DatabaseSync) {
    this.dialect = 'sqlite';
    this.driver = 'node:sqlite';
    this.handle = new DatabaseSync(filename);
  }

  /** Mirrors better-sqlite3's pragma helper: "name = value" sets, a bare name reads. */
  pragma(statement) {
    if (statement.includes('=')) {
      this.handle.exec(`PRAGMA ${statement}`);
      return undefined;
    }
    return this.handle.prepare(`PRAGMA ${statement}`).all();
  }

  exec(sql) {
    return this.handle.exec(sql);
  }

  prepare(sql) {
    return this.handle.prepare(sql);
  }

  transaction(fn) {
    return (...args) => {
      this.handle.exec('BEGIN');
      try {
        const result = fn(...args);
        this.handle.exec('COMMIT');
        return result;
      } catch (error) {
        try {
          this.handle.exec('ROLLBACK');
        } catch {
          /* the transaction may already be rolled back by the driver */
        }
        throw error;
      }
    };
  }

  close() {
    return this.handle.close();
  }
}

export function openDatabase(filename = process.env.AGRIPULSE_DB_PATH || '.data/agripulse.sqlite') {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });

  const driver = loadDriver();
  const db = driver.create(filename);
  db.driverName = driver.name;
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  if (filename !== ':memory:') db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT,
      roles_json TEXT NOT NULL,
      is_demo INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1)),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      portal_type TEXT NOT NULL CHECK (portal_type IN ('farmer', 'seller')),
      remember_me INTEGER NOT NULL DEFAULT 0 CHECK (remember_me IN (0, 1)),
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS workspace_snapshots (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      revision INTEGER NOT NULL DEFAULT 1,
      payload_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS farms (
      owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      id TEXT NOT NULL,
      data_json TEXT NOT NULL,
      PRIMARY KEY (owner_user_id, id)
    );

    CREATE TABLE IF NOT EXISTS plots (
      owner_user_id TEXT NOT NULL,
      farm_id TEXT NOT NULL,
      id TEXT NOT NULL,
      data_json TEXT NOT NULL,
      PRIMARY KEY (owner_user_id, farm_id, id),
      FOREIGN KEY (owner_user_id, farm_id) REFERENCES farms(owner_user_id, id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS plots_farm_idx ON plots(owner_user_id, farm_id);

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      farm_id TEXT NOT NULL,
      plot_id TEXT,
      gateway_id TEXT,
      type TEXT NOT NULL CHECK (type IN ('sensor_node', 'lora_gateway')),
      name TEXT NOT NULL,
      serial_number TEXT,
      metadata_json TEXT NOT NULL,
      is_demo_record INTEGER NOT NULL DEFAULT 0 CHECK (is_demo_record IN (0, 1)),
      paired_at TEXT,
      last_seen_at TEXT,
      retired_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(owner_user_id, id),
      FOREIGN KEY (owner_user_id, farm_id) REFERENCES farms(owner_user_id, id) ON DELETE RESTRICT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS devices_serial_unique
      ON devices(lower(serial_number))
      WHERE serial_number IS NOT NULL AND trim(serial_number) <> '';
    CREATE INDEX IF NOT EXISTS devices_owner_farm_idx ON devices(owner_user_id, farm_id, retired_at);
    CREATE INDEX IF NOT EXISTS devices_gateway_idx ON devices(owner_user_id, gateway_id);

    CREATE TABLE IF NOT EXISTS pairing_sessions (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS pairing_device_idx ON pairing_sessions(device_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS device_credentials (
      device_id TEXT PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
      owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      secret_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      revoked_at TEXT
    );

    CREATE TABLE IF NOT EXISTS telemetry_readings (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
      owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      farm_id TEXT NOT NULL,
      sensor_type TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT NOT NULL,
      measured_at TEXT NOT NULL,
      received_at TEXT NOT NULL,
      quality TEXT NOT NULL CHECK (quality IN ('valid', 'suspect', 'invalid')),
      source TEXT NOT NULL DEFAULT 'physical_sensor' CHECK (source = 'physical_sensor')
    );
    CREATE INDEX IF NOT EXISTS telemetry_device_time_idx ON telemetry_readings(device_id, measured_at DESC);
    CREATE INDEX IF NOT EXISTS telemetry_owner_farm_idx ON telemetry_readings(owner_user_id, farm_id, measured_at DESC);

    CREATE TABLE IF NOT EXISTS device_events (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
      owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      actor_user_id TEXT REFERENCES users(id),
      event_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      source TEXT NOT NULL CHECK (source IN ('backend', 'device', 'demo')),
      occurred_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS device_events_device_idx ON device_events(device_id, occurred_at DESC);

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT REFERENCES users(id),
      owner_user_id TEXT REFERENCES users(id),
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      outcome TEXT NOT NULL CHECK (outcome IN ('success', 'denied', 'failure')),
      metadata_json TEXT NOT NULL DEFAULT '{}',
      occurred_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS audit_owner_time_idx ON audit_events(owner_user_id, occurred_at DESC);
  `);
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
  if (!db.prepare('SELECT version FROM schema_migrations WHERE version = ?').get(2)) {
    db.transaction(() => {
      db.exec(readFileSync(new URL('./migrations/002-telemetry-provenance.sql', import.meta.url), 'utf8'));
      db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)').run(2, new Date().toISOString());
      db.pragma('user_version = 2');
    })();
  }
  seedDemoAccounts(db);
  return db;
}

const DEMO_PASSWORD_HASH = 'scrypt$32768$8$1$79deb39026de761e5f433ee389b620d9$433b8b9690a254233af0a80e01d43ea32b3df8b58fd5f9737acdc0f2fc29460c235bac579b831870f98a7747b690483719a539237a2475bd84a9e3ad0b5fabea';

export function seedDemoAccounts(db) {
  const now = new Date().toISOString();

  // 1. Farmer demo user
  const farmerEmail = 'farmer.demo@agripulse.in';
  let farmerUser = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(farmerEmail);
  if (!farmerUser) {
    db.prepare('INSERT INTO users(id, email, password_hash, roles_json, is_demo, created_at) VALUES (?, ?, ?, ?, 1, ?)')
      .run('demo-farmer-user', farmerEmail, DEMO_PASSWORD_HASH, JSON.stringify(['farmer']), now);
    farmerUser = { id: 'demo-farmer-user' };
  }

  // 2. Seller demo user
  const sellerEmail = 'seller.demo@agripulse.in';
  let sellerUser = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(sellerEmail);
  if (!sellerUser) {
    db.prepare('INSERT INTO users(id, email, password_hash, roles_json, is_demo, created_at) VALUES (?, ?, ?, ?, 1, ?)')
      .run('demo-seller-user', sellerEmail, DEMO_PASSWORD_HASH, JSON.stringify(['seller']), now);
    sellerUser = { id: 'demo-seller-user' };
  }

  // 3. Multi-role dev demo user
  const devDemoEmail = 'demo.workspace@demo.agripulse.invalid';
  let devDemoUser = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(devDemoEmail);
  if (!devDemoUser) {
    db.prepare('INSERT INTO users(id, email, password_hash, roles_json, is_demo, created_at) VALUES (?, ?, ?, ?, 1, ?)')
      .run('demo-workspace-user', devDemoEmail, DEMO_PASSWORD_HASH, JSON.stringify(['farmer', 'seller']), now);
    devDemoUser = { id: 'demo-workspace-user' };
  }

  // Seed sample farms and devices for demo-farmer-user and demo-workspace-user
  for (const uid of [farmerUser.id, devDemoUser.id]) {
    const existingFarm = db.prepare('SELECT id FROM farms WHERE owner_user_id = ? LIMIT 1').get(uid);
    if (!existingFarm) {
      const farms = [
        { id: 'farm-001', name: 'Green Horizon Progressive Farm', farmerName: 'Rajeshwar Singh Chaudhary', state: 'Haryana', district: 'Karnal', village: 'Taraori', coordinates: { lat: 29.7857, lon: 76.9339 }, totalArea: 8.5, areaUnit: 'acre', bighaToAcreFactor: 0.25, ownershipType: 'Owned', soilType: 'Alluvial Loam (pH 7.1)', waterSource: 'Canal and borewell (sample)', notes: 'Sample farm record for demonstration.', isArchived: false, isDemoRecord: true, createdAt: '2025-11-15T08:00:00.000Z', updatedAt: now },
        { id: 'farm-002', name: 'Shivalik Foothill Mustard & Pulse Block', farmerName: 'Rajeshwar Singh Chaudhary', state: 'Haryana', district: 'Kurukshetra', village: 'Shahabad Markanda', coordinates: { lat: 30.1675, lon: 76.8704 }, totalArea: 4, areaUnit: 'acre', bighaToAcreFactor: 0.25, ownershipType: 'Family Holding', soilType: 'Sandy Clay Loam (sample)', waterSource: 'Supplemental irrigation (sample)', notes: 'Sample farm record for demonstration.', isArchived: false, isDemoRecord: true, createdAt: '2026-01-10T09:00:00.000Z', updatedAt: now },
      ];
      const plots = [
        { id: 'plot-101', farmId: 'farm-001', name: 'Plot A1 — North Canal Block', area: 4, areaUnit: 'acre', soilType: 'Alluvial Loam', irrigationMethod: 'Check Basin / Canal Regulated' },
        { id: 'plot-102', farmId: 'farm-001', name: 'Plot A2 — Central Tube-well Block', area: 3, areaUnit: 'acre', soilType: 'Clay Loam', irrigationMethod: 'Furrow / Border Strip Irrigation' },
        { id: 'plot-103', farmId: 'farm-001', name: 'Plot A3 — East Drip Vegetable Block', area: 1.5, areaUnit: 'acre', soilType: 'Sandy Loam', irrigationMethod: 'Inline Drip Irrigation' },
        { id: 'plot-201', farmId: 'farm-002', name: 'Plot B1 — Mustard Ridge Field', area: 2.5, areaUnit: 'acre', soilType: 'Sandy Clay Loam', irrigationMethod: 'Mini Sprinkler' },
        { id: 'plot-202', farmId: 'farm-002', name: 'Plot B2 — Pulse Rotation Field', area: 1.5, areaUnit: 'acre', soilType: 'Sandy Loam', irrigationMethod: 'Supplemental Sprinkler' },
      ];
      const insertFarm = db.prepare('INSERT INTO farms(owner_user_id, id, data_json) VALUES (?, ?, ?)');
      const insertPlot = db.prepare('INSERT INTO plots(owner_user_id, farm_id, id, data_json) VALUES (?, ?, ?, ?)');
      for (const farm of farms) insertFarm.run(uid, farm.id, JSON.stringify(farm));
      for (const plot of plots) insertPlot.run(uid, plot.farmId, plot.id, JSON.stringify(plot));
    }

    const existingDevice = db.prepare('SELECT 1 FROM devices WHERE owner_user_id = ? LIMIT 1').get(uid);
    if (!existingDevice) {
      const fixtures = [
        {
          id: `device-gw-${uid}`, farmId: 'farm-001', type: 'lora_gateway', name: 'Main Farm Gateway', serialNumber: `AP-GW-${uid.slice(0, 8)}`,
          metadata: { locationLabel: 'Farmhouse roof, east side', latitude: 29.7857, longitude: 76.9339, installedAt: '2026-10-07', backhaulType: 'ethernet', powerSource: 'mains', communicationProfile: 'Read from commissioned gateway (demo)', coverageNotes: 'Sample coverage note; not verified in a physical installation.', notes: 'Sample registration only. No gateway hardware has been provisioned.' },
          createdAt: '2026-10-07T08:30:00.000Z',
        },
        {
          id: `device-nd-${uid}`, farmId: 'farm-001', plotId: 'plot-101', gatewayId: `device-gw-${uid}`, type: 'sensor_node', name: 'North Canal Soil Node', serialNumber: `AP-ND-${uid.slice(0, 8)}`,
          metadata: { locationLabel: 'North boundary, beside the canal bund', latitude: 29.7862, longitude: 76.9347, installedAt: '2026-10-08', installedSensors: ['soil_moisture', 'soil_temperature', 'air_humidity', 'soil_npk'], powerSource: 'solar_battery', samplingIntervalMinutes: 30, communicationProfile: 'Inherited from gateway at commissioning', calibrationStatus: 'not_calibrated', notes: 'Sample registration only. Pairing and calibration have not been completed.' },
          createdAt: '2026-10-08T06:15:00.000Z',
        },
      ];
      for (const fixture of fixtures) {
        db.prepare(`INSERT INTO devices(id, owner_user_id, farm_id, plot_id, gateway_id, type, name, serial_number, metadata_json, is_demo_record, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`)
          .run(fixture.id, uid, fixture.farmId, fixture.plotId || null, fixture.gatewayId || null, fixture.type, fixture.name, fixture.serialNumber, JSON.stringify(fixture.metadata), fixture.createdAt, fixture.createdAt);
        db.prepare(`INSERT INTO device_events(id, device_id, owner_user_id, event_type, title, description, source, occurred_at)
          VALUES (?, ?, ?, 'registered', ?, ?, 'demo', ?)`)
          .run(`evt_${fixture.id}`, fixture.id, uid, `${fixture.type === 'lora_gateway' ? 'Demo gateway' : 'Demo sensor node'} record created`, 'Sample device metadata only. No hardware heartbeat or telemetry has been received.', fixture.createdAt);
      }
    }
  }

  // Seed initial farmer workspace snapshot
  const existingFarmerSnapshot = db.prepare('SELECT user_id FROM workspace_snapshots WHERE user_id = ?').get('demo-farmer-user');
  if (!existingFarmerSnapshot) {
    const farmerWorkspaceData = {
      schemaVersion: 1,
      profile: {
        id: 'demo-farmer-user',
        name: 'Rajeshwar Singh Chaudhary',
        email: farmerEmail,
        mobile: '9812456780',
        state: 'Haryana',
        district: 'Karnal',
        village: 'Taraori',
        role: 'Farmer',
        isDemoAccount: true,
        joinedDate: '2025-11-15',
        preferences: {
          language: 'en',
          preferredAreaUnit: 'acre',
          bighaToAcreFactor: 0.25,
          bighaRegionLabel: 'Haryana Standard Bigha (4 Bigha = 1 Acre)',
          defaultFarmId: 'farm-001',
          defaultCrop: 'Wheat',
          weatherLocation: { state: 'Haryana', district: 'Karnal', locality: 'Taraori' },
          notifications: { weatherAlerts: true, irrigationReminders: true, cropInspectionAlerts: true, orderUpdates: true, schemeUpdates: true },
        },
      },
      farms: [
        { id: 'farm-001', name: 'Green Horizon Progressive Farm', farmerName: 'Rajeshwar Singh Chaudhary', state: 'Haryana', district: 'Karnal', village: 'Taraori', totalArea: 8.5, areaUnit: 'acre', bighaToAcreFactor: 0.25, ownershipType: 'Owned', soilType: 'Alluvial Loam (pH 7.1)', waterSource: 'Canal and borewell (sample)', notes: 'Sample farm record for demonstration.', isArchived: false, isDemoRecord: true, createdAt: '2025-11-15T08:00:00.000Z', updatedAt: now },
        { id: 'farm-002', name: 'Shivalik Foothill Mustard & Pulse Block', farmerName: 'Rajeshwar Singh Chaudhary', state: 'Haryana', district: 'Kurukshetra', village: 'Shahabad Markanda', totalArea: 4, areaUnit: 'acre', bighaToAcreFactor: 0.25, ownershipType: 'Family Holding', soilType: 'Sandy Clay Loam (sample)', waterSource: 'Supplemental irrigation (sample)', notes: 'Sample farm record for demonstration.', isArchived: false, isDemoRecord: true, createdAt: '2026-01-10T09:00:00.000Z', updatedAt: now },
      ],
      plots: [
        { id: 'plot-101', farmId: 'farm-001', name: 'Plot A1 — North Canal Block', area: 4, areaUnit: 'acre', soilType: 'Alluvial Loam', irrigationMethod: 'Check Basin / Canal Regulated' },
        { id: 'plot-102', farmId: 'farm-001', name: 'Plot A2 — Central Tube-well Block', area: 3, areaUnit: 'acre', soilType: 'Clay Loam', irrigationMethod: 'Furrow / Border Strip Irrigation' },
        { id: 'plot-103', farmId: 'farm-001', name: 'Plot A3 — East Drip Vegetable Block', area: 1.5, areaUnit: 'acre', soilType: 'Sandy Loam', irrigationMethod: 'Inline Drip Irrigation' },
        { id: 'plot-201', farmId: 'farm-002', name: 'Plot B1 — Mustard Ridge Field', area: 2.5, areaUnit: 'acre', soilType: 'Sandy Clay Loam', irrigationMethod: 'Mini Sprinkler' },
        { id: 'plot-202', farmId: 'farm-002', name: 'Plot B2 — Pulse Rotation Field', area: 1.5, areaUnit: 'acre', soilType: 'Sandy Loam', irrigationMethod: 'Supplemental Sprinkler' },
      ],
      crops: [
        { id: 'crop-01', farmId: 'farm-001', plotId: 'plot-101', plotName: 'Plot A1 — North Canal Block', cropName: 'Wheat', variety: 'HD-2967 (Pusa Wheat)', season: 'Rabi 2025-26', sowingDate: '2025-11-10', expectedHarvestDate: '2026-04-15', growthStage: 'Grain Filling', healthStatus: 'Healthy', notes: 'Vigorous tillering observed; canopy well closed.' },
        { id: 'crop-02', farmId: 'farm-001', plotId: 'plot-102', plotName: 'Plot A2 — Central Tube-well Block', cropName: 'Mustard', variety: 'Pusa Bold', season: 'Rabi 2025-26', sowingDate: '2025-10-20', expectedHarvestDate: '2026-03-05', growthStage: 'Pod Formation', healthStatus: 'Healthy', notes: 'Flowering complete; uniform siliquae development.' },
        { id: 'crop-03', farmId: 'farm-001', plotId: 'plot-103', plotName: 'Plot A3 — East Drip Vegetable Block', cropName: 'Tomato', variety: 'Abhinav Hybrid', season: 'Rabi 2025-26', sowingDate: '2025-12-01', expectedHarvestDate: '2026-03-30', growthStage: 'Flowering & Fruit Set', healthStatus: 'Watch / Mild Stress', notes: 'Slight magnesium deficiency on lower leaves.' },
      ],
      observations: [
        { id: 'obs-01', farmId: 'farm-001', plotId: 'plot-101', plotName: 'Plot A1 — North Canal Block', timestamp: '2026-10-23T08:30:00.000Z', soilMoisturePct: 38, soilTempC: 22, symptoms: 'Normal vegetative vigor', sourceLabel: 'Farmer manual observation', standingWaterStatus: 'No standing water' },
        { id: 'obs-02', farmId: 'farm-001', plotId: 'plot-102', plotName: 'Plot A2 — Central Tube-well Block', timestamp: '2026-10-22T09:15:00.000Z', soilMoisturePct: 32, soilTempC: 23, symptoms: 'No pest incidence', sourceLabel: 'Farmer manual observation', standingWaterStatus: 'No standing water' },
      ],
      activities: [
        { id: 'act-01', farmId: 'farm-001', plotId: 'plot-101', title: 'Top-dress Urea & Zinc Sulphate', activityType: 'Fertilizer Application', scheduledDate: '2026-10-25', priority: 'High', status: 'Pending', notes: 'Apply 35 kg/acre urea alongside first CRI irrigation.' },
        { id: 'act-02', farmId: 'farm-001', plotId: 'plot-102', title: 'Check Aphid Population on Mustard', activityType: 'Pest / Disease Inspection', scheduledDate: '2026-10-26', priority: 'Medium', status: 'Pending', notes: 'Inspect 20 random inflorescences across diagonal line.' },
      ],
      rainfallLogs: [],
      diseaseReports: [],
      dictBookmarks: ['dict-06', 'dict-18', 'dict-30', 'dict-50'],
      dictRecent: ['dict-51', 'dict-18', 'dict-28'],
      cart: [],
      wishlist: ['prod-101', 'prod-601'],
      recentProducts: ['prod-501', 'prod-301', 'prod-201'],
      orders: [],
      newsBookmarks: ['news-01', 'news-03'],
      chatHistory: [],
      activeFarmId: 'farm-001',
    };
    db.prepare('INSERT INTO workspace_snapshots(user_id, revision, payload_json, updated_at) VALUES (?, 1, ?, ?)')
      .run('demo-farmer-user', JSON.stringify(farmerWorkspaceData), now);
  }

  // Seed initial seller workspace snapshot
  const existingSellerSnapshot = db.prepare('SELECT user_id FROM workspace_snapshots WHERE user_id = ?').get('demo-seller-user');
  if (!existingSellerSnapshot) {
    const sellerWorkspaceData = {
      schemaVersion: 1,
      sellerProfile: {
        id: 'demo-seller-user',
        businessName: 'Sample Agro Cooperative',
        tradeName: 'Karnal Kisan Agro Co-op',
        contactPerson: 'Gurpreet Singh Gill',
        email: sellerEmail,
        mobile: '9812498765',
        category: 'Seeds and planting material',
        gstin: '06AAACK1234F1Z5',
        licenseNumber: 'AGR-HR-2023-SEED-0914',
        state: 'Haryana',
        district: 'Karnal',
        city: 'Karnal',
        address: 'Shop No. 14, Anaj Mandi, GT Road',
        pincode: '132001',
        isVerified: true,
        isDemoSeller: true,
        rating: 4.8,
        totalOrders: 38,
        totalRevenuePaise: 18450000,
        joinedDate: '2024-03-15',
      },
      farms: [],
      plots: [],
      crops: [],
      observations: [],
      activities: [],
      rainfallLogs: [],
      diseaseReports: [],
      dictBookmarks: [],
      dictRecent: [],
      cart: [],
      wishlist: [],
      recentProducts: [],
      orders: [],
      newsBookmarks: [],
      chatHistory: [],
    };
    db.prepare('INSERT INTO workspace_snapshots(user_id, revision, payload_json, updated_at) VALUES (?, 1, ?, ?)')
      .run('demo-seller-user', JSON.stringify(sellerWorkspaceData), now);
  }
}
