import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { createServer } from 'node:http';
import { createApp } from '../app.mjs';
import { openDatabase } from '../db.mjs';
import { sha256 } from '../security.mjs';

const logger = { info() {}, error() {} };
let db;
let server;
let baseUrl;
let farmerCookie;
let sellerCookie;
let farmerSession;
let sellerSession;
let farmerWorkspace;
let sellerWorkspace;

async function startServer(environment = { NODE_ENV: 'test', ALLOW_DEMO_SESSIONS: 'true' }) {
  const database = openDatabase(':memory:');
  const httpServer = createServer(createApp({ db: database, environment, logger }));
  await new Promise((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(0, '127.0.0.1', resolve);
  });
  const address = httpServer.address();
  return { database, httpServer, url: `http://127.0.0.1:${address.port}` };
}

async function api(path, { method = 'GET', body, cookie, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

function responseCookie(response) {
  const value = response.headers.get('set-cookie');
  assert.ok(value, 'expected the API to issue a session cookie');
  return value.split(';', 1)[0];
}

async function registerFarmer(email) {
  return api('/api/auth/register', {
    method: 'POST',
    body: {
      portalType: 'farmer',
      name: 'Mira Singh',
      email,
      password: 'field-safe-password-123',
      mobile: '9876543210',
      state: 'Haryana',
      district: 'Karnal',
      village: 'Taraori',
      primaryCrop: 'Wheat',
      landArea: 8.5,
    },
  });
}

describe('AGRIPULSE authenticated API', () => {
  before(async () => {
    const running = await startServer();
    db = running.database;
    server = running.httpServer;
    baseUrl = running.url;

    const farmer = await registerFarmer('mira.farmer@example.test');
    assert.equal(farmer.response.status, 201);
    farmerCookie = responseCookie(farmer.response);
    farmerSession = farmer.data.session;
    farmerWorkspace = farmer.data.workspace;

    const seller = await api('/api/auth/register', {
      method: 'POST',
      body: {
        portalType: 'seller',
        businessName: 'Green Seed Cooperative',
        tradeName: 'Green Seed Co-op',
        contactPerson: 'Aman Kumar',
        email: 'aman.seller@example.test',
        password: 'seller-account-password-456',
        mobile: '9812345678',
        category: 'Seeds and planting material',
        gstin: '',
        licenseNumber: '',
        state: 'Haryana',
        district: 'Karnal',
        city: 'Karnal',
        address: 'Market Road',
        pincode: '132001',
      },
    });
    assert.equal(seller.response.status, 201, JSON.stringify(seller.data));
    sellerCookie = responseCookie(seller.response);
    sellerSession = seller.data.session;
    sellerWorkspace = seller.data.workspace;
  });

  after(async () => {
    if (server?.listening) await new Promise((resolve) => server.close(resolve));
    db?.close();
  });

  it('registers farmer and seller accounts with server-owned workspaces and secure sessions', async () => {
    assert.equal(farmerSession.portalType, 'farmer');
    assert.equal(farmerSession.isDemo, false);
    assert.equal(farmerWorkspace.initialized, true);
    assert.equal(farmerWorkspace.revision, 1);
    assert.equal(farmerWorkspace.data.profile.name, 'Mira Singh');
    assert.equal(farmerWorkspace.data.farms.length, 1);
    assert.equal(farmerWorkspace.data.farms[0].totalArea, 8.5);

    assert.equal(sellerSession.portalType, 'seller');
    assert.equal(sellerSession.isDemo, false);
    assert.equal(sellerWorkspace.initialized, true);
    assert.equal(sellerWorkspace.data.sellerProfile.businessName, 'Green Seed Cooperative');
    assert.equal(Object.hasOwn(sellerWorkspace.data.sellerProfile, 'bankAccountNumber'), false);
    assert.equal(Object.hasOwn(sellerWorkspace.data.sellerProfile, 'ifscCode'), false);

    const cookieHeader = (await api('/api/auth/session', { cookie: farmerCookie })).response.headers.get('set-cookie');
    assert.equal(cookieHeader, null, 'session reads should not reissue the cookie');
    const sessionResult = await api('/api/auth/session', { cookie: farmerCookie });
    assert.equal(sessionResult.data.session.userId, farmerSession.userId);

    const unauthenticated = await api('/api/devices');
    assert.equal(unauthenticated.response.status, 401);
  });

  it('authenticates credentials and enforces portal roles', async () => {
    const wrongPassword = await api('/api/auth/login', {
      method: 'POST',
      body: { email: 'mira.farmer@example.test', password: 'not-the-account-password', portalType: 'farmer' },
    });
    assert.equal(wrongPassword.response.status, 401);

    const login = await api('/api/auth/login', {
      method: 'POST',
      body: { email: 'mira.farmer@example.test', password: 'field-safe-password-123', portalType: 'farmer', rememberMe: false },
    });
    assert.equal(login.response.status, 200);
    assert.match(login.response.headers.get('set-cookie') || '', /HttpOnly/i);
    assert.match(login.response.headers.get('set-cookie') || '', /SameSite=Lax/i);

    const sellerCannotListDevices = await api('/api/devices', { cookie: sellerCookie });
    assert.equal(sellerCannotListDevices.response.status, 403);

    const sellerCannotAssumeFarmerRole = await api('/api/auth/portal', {
      method: 'PATCH',
      cookie: sellerCookie,
      body: { portalType: 'farmer' },
    });
    assert.equal(sellerCannotAssumeFarmerRole.response.status, 403);
  });

  it('stores workspace snapshots with revision control and rejects sensitive credentials', async () => {
    const read = await api('/api/workspace', { cookie: sellerCookie });
    assert.equal(read.response.status, 200);
    assert.equal(read.data.initialized, true);
    const data = structuredClone(read.data.data);
    data.sellerProfile.businessName = 'Green Seed Cooperative Ltd.';

    const saved = await api('/api/workspace', {
      method: 'PUT',
      cookie: sellerCookie,
      body: { data, revision: read.data.revision },
    });
    assert.equal(saved.response.status, 200, JSON.stringify(saved.data));
    assert.equal(saved.data.revision, read.data.revision + 1);
    assert.equal(saved.data.data.sellerProfile.isVerified, false);

    const conflict = await api('/api/workspace', {
      method: 'PUT',
      cookie: sellerCookie,
      body: { data, revision: read.data.revision },
    });
    assert.equal(conflict.response.status, 409);
    assert.equal(conflict.data.error.code, 'WORKSPACE_CONFLICT');

    const sensitive = structuredClone(saved.data.data);
    sensitive.sellerProfile.bankAccountNumber = '';
    const rejected = await api('/api/workspace', {
      method: 'PUT',
      cookie: sellerCookie,
      body: { data: sensitive, revision: saved.data.revision },
    });
    assert.equal(rejected.response.status, 400);
    assert.equal(rejected.data.error.code, 'SENSITIVE_FIELD_REJECTED');
  });

  it('registers devices as pending and requires a one-time pairing plus trusted telemetry heartbeat', async () => {
    const farmId = farmerWorkspace.data.farms[0].id;
    const gateway = await api('/api/devices', {
      method: 'POST',
      cookie: farmerCookie,
      body: {
        farmId,
        type: 'lora_gateway',
        name: 'Main farm gateway',
        serialNumber: 'AP-TEST-GW-01',
        locationLabel: 'Farmhouse east roof',
        backhaulType: 'ethernet',
        powerSource: 'mains',
      },
    });
    assert.equal(gateway.response.status, 201, JSON.stringify(gateway.data));
    assert.equal(gateway.data.device.status, 'pending_pairing');
    assert.equal(gateway.data.device.isDemoRecord, false);
    assert.equal(gateway.data.device.ownerUserId, farmerSession.userId);

    const node = await api('/api/devices', {
      method: 'POST',
      cookie: farmerCookie,
      body: {
        farmId,
        type: 'sensor_node',
        name: 'North field sensor node',
        serialNumber: 'AP-TEST-ND-01',
        locationLabel: 'North boundary by the canal',
        gatewayId: gateway.data.device.id,
        installedSensors: ['soil_moisture', 'soil_npk', 'air_humidity'],
        calibrationStatus: 'calibration_recorded',
        powerSource: 'solar_battery',
      },
    });
    assert.equal(node.response.status, 201, JSON.stringify(node.data));
    assert.equal(node.data.device.status, 'pending_pairing');
    assert.equal(node.data.device.lastSeenAt, undefined);

    const duplicate = await api('/api/devices', {
      method: 'POST',
      cookie: farmerCookie,
      body: {
        farmId,
        type: 'lora_gateway',
        name: 'Duplicate gateway',
        serialNumber: 'ap-test-gw-01',
        locationLabel: 'Another mounting point',
      },
    });
    assert.equal(duplicate.response.status, 409);
    assert.equal(duplicate.data.error.code, 'DUPLICATE_SERIAL');

    const tokenResult = await api(`/api/devices/${node.data.device.id}/pairing-sessions`, { method: 'POST', cookie: farmerCookie });
    assert.equal(tokenResult.response.status, 201, JSON.stringify(tokenResult.data));
    const pairingToken = tokenResult.data.pairingSession.pairingToken;
    assert.ok(pairingToken.length >= 40);
    const storedPairing = db.prepare('SELECT token_hash, used_at FROM pairing_sessions WHERE id = ?').get(tokenResult.data.pairingSession.id);
    assert.equal(storedPairing.token_hash, sha256(pairingToken));
    assert.equal(storedPairing.used_at, null);

    const completed = await api('/api/device-ingest/pairing/complete', {
      method: 'POST',
      body: { pairingToken },
    });
    assert.equal(completed.response.status, 200, JSON.stringify(completed.data));
    const deviceSecret = completed.data.deviceSecret;
    assert.ok(deviceSecret.length >= 60);
    const storedCredential = db.prepare('SELECT secret_hash FROM device_credentials WHERE device_id = ?').get(node.data.device.id);
    assert.equal(storedCredential.secret_hash, sha256(deviceSecret));

    const replay = await api('/api/device-ingest/pairing/complete', {
      method: 'POST',
      body: { pairingToken },
    });
    assert.equal(replay.response.status, 400);
    assert.equal(replay.data.error.code, 'PAIRING_TOKEN_INVALID');

    const noRainGauge = await api('/api/device-ingest/telemetry', {
      method: 'POST',
      headers: { Authorization: `Bearer ${deviceSecret}` },
      body: { readings: [{ sensorType: 'rainfall_mm', value: 0, unit: 'mm', measuredAt: new Date().toISOString() }] },
    });
    assert.equal(noRainGauge.response.status, 400);

    const measuredAt = new Date().toISOString();
    const calibratedReading = { sensorType: 'soil_moisture', value: 42, unit: '%', measuredAt, measurementKind: 'calibrated', calibrationMethod: 'Test fixture only: documented gravimetric calibration.' };
    const ingested = await api('/api/device-ingest/telemetry', {
      method: 'POST',
      headers: { Authorization: `Bearer ${deviceSecret}` },
      body: { readings: [calibratedReading] },
    });
    assert.equal(ingested.response.status, 202, JSON.stringify(ingested.data));
    assert.equal(ingested.data.readings[0].source, 'physical_sensor');

    const retry = await api('/api/device-ingest/telemetry', { method: 'POST', headers: { Authorization: `Bearer ${deviceSecret}` }, body: { readings: [calibratedReading, calibratedReading] } });
    assert.equal(retry.response.status, 202);
    assert.equal(retry.data.duplicates, 2);
    assert.equal(retry.data.readings.length, 0);
    const uncalibrated = await api('/api/device-ingest/telemetry', { method: 'POST', headers: { Authorization: `Bearer ${deviceSecret}` }, body: { readings: [{ sensorType: 'soil_moisture', value: 30, unit: '%', measuredAt }] } });
    assert.equal(uncalibrated.data.error.code, 'CALIBRATION_REQUIRED');
    const npkMissingComponent = await api('/api/device-ingest/telemetry', { method: 'POST', headers: { Authorization: `Bearer ${deviceSecret}` }, body: { readings: [{ sensorType: 'soil_npk', value: 30, unit: 'raw', measuredAt }] } });
    assert.equal(npkMissingComponent.data.error.code, 'INVALID_COMPONENT');
    const npk = await api('/api/device-ingest/telemetry', { method: 'POST', headers: { Authorization: `Bearer ${deviceSecret}` }, body: { readings: ['nitrogen', 'phosphorus', 'potassium'].map((component) => ({ sensorType: 'soil_npk', component, value: 30, unit: 'raw', measuredAt })) } });
    assert.equal(npk.response.status, 202);
    assert.equal(npk.data.readings.length, 3);
    const gatewayPairing = await api(`/api/devices/${gateway.data.device.id}/pairing-sessions`, { method: 'POST', cookie: farmerCookie });
    const gatewayPaired = await api('/api/device-ingest/pairing/complete', { method: 'POST', body: { pairingToken: gatewayPairing.data.pairingSession.pairingToken } });
    const heartbeat = await api('/api/device-ingest/heartbeat', { method: 'POST', headers: { Authorization: `Bearer ${gatewayPaired.data.deviceSecret}` }, body: {} });
    assert.equal(heartbeat.response.status, 202);
    const onlineGateway = await api(`/api/devices/${gateway.data.device.id}`, { cookie: farmerCookie });
    assert.equal(onlineGateway.data.device.status, 'online');
    assert.equal(onlineGateway.data.latestReadings.length, 0);

    const latest = await api(`/api/devices/${node.data.device.id}`, { cookie: farmerCookie });
    assert.equal(latest.response.status, 200);
    assert.equal(latest.data.device.status, 'online');
    assert.ok(latest.data.latestReadings.some((reading) => reading.sensorType === 'soil_moisture' && reading.value === 42));
    assert.equal(latest.data.latestReadings[0].source, 'physical_sensor');

    const events = await api(`/api/devices/${node.data.device.id}/events`, { cookie: farmerCookie });
    assert.equal(events.response.status, 200);
    assert.ok(events.data.events.some((event) => event.type === 'pairing_succeeded'));
    assert.ok(events.data.events.some((event) => event.type === 'heartbeat'));

    const retired = await api(`/api/devices/${node.data.device.id}/retire`, { method: 'POST', cookie: farmerCookie });
    assert.equal(retired.response.status, 200);
    assert.equal(retired.data.device.status, 'retired');
    const revokedCredential = db.prepare('SELECT revoked_at FROM device_credentials WHERE device_id = ?').get(node.data.device.id);
    assert.ok(revokedCredential.revoked_at);
  });

  it('isolates farm and device records between farmer accounts', async () => {
    const other = await registerFarmer('other.farmer@example.test');
    assert.equal(other.response.status, 201);
    const otherCookie = responseCookie(other.response);

    const list = await api('/api/devices', { cookie: otherCookie });
    assert.equal(list.response.status, 200);
    assert.equal(list.data.devices.length, 0);

    const hidden = await api('/api/devices/device-does-not-belong-to-this-user', { cookie: otherCookie });
    assert.equal(hidden.response.status, 404);
  });

  it('requires revisions, rejects cross-site changes and unavailable weather honestly', async () => {
    const noRevision = await api('/api/workspace', { method: 'PUT', cookie: farmerCookie, body: { data: farmerWorkspace.data } });
    assert.equal(noRevision.response.status, 428);
    const crossSite = await api('/api/auth/logout', { method: 'POST', cookie: farmerCookie, headers: { 'Sec-Fetch-Site': 'cross-site' } });
    assert.equal(crossSite.response.status, 403);
    assert.equal(crossSite.data.error.code, 'CSRF_REJECTED');
    const weather = await api('/api/weather?state=Haryana&district=Karnal', { cookie: farmerCookie });
    assert.equal(weather.response.status, 503);
    assert.equal(weather.data.error.code, 'WEATHER_NOT_CONFIGURED');
    assert.equal(Object.hasOwn(weather.data, 'snapshot'), false);
    assert.equal((await api('/api/weather?state=Haryana&district=Karnal', { cookie: sellerCookie })).response.status, 403);
    assert.equal((await api('/api/weather?state=Haryana&district=%3Cscript%3E', { cookie: farmerCookie })).response.status, 400);
    assert.equal((await api('/api/device-ingest/heartbeat', { method: 'POST', body: {} })).response.status, 401);
    const legacySensor = await api('/api/devices', { method: 'POST', cookie: farmerCookie, body: { farmId: farmerWorkspace.data.farms[0].id, type: 'sensor_node', name: 'Unsupported light sensor', locationLabel: 'North boundary', installedSensors: ['light'] } });
    assert.equal(legacySensor.response.status, 400);
  });

  it('keeps demo access off by default in production unless explicitly enabled', async () => {
    const demo = await api('/api/dev/demo-session', { method: 'POST', body: { portalType: 'farmer' } });
    assert.equal(demo.response.status, 200);
    assert.equal(demo.data.session.isDemo, true);

    // Production is demo-off by default; an explicit ALLOW_DEMO_SESSIONS=true opts a
    // production deployment in (labelled demo/staging sites); explicit false always wins.
    const scenarios = [
      [{ NODE_ENV: 'production', WEB_ORIGINS: 'https://app.example.test' }, 404],
      [{ NODE_ENV: 'production', ALLOW_DEMO_SESSIONS: 'true', WEB_ORIGINS: 'https://app.example.test' }, 200],
      [{ NODE_ENV: 'production', ALLOW_DEMO_SESSIONS: 'false', WEB_ORIGINS: 'https://app.example.test' }, 404],
      [{ NODE_ENV: 'development', ALLOW_DEMO_SESSIONS: 'false' }, 404],
    ];

    for (const [environment, expected] of scenarios) {
      const scenarioDb = openDatabase(':memory:');
      const scenarioServer = createServer(createApp({ db: scenarioDb, environment, logger }));
      await new Promise((resolve, reject) => {
        scenarioServer.once('error', reject);
        scenarioServer.listen(0, '127.0.0.1', resolve);
      });
      const { port } = scenarioServer.address();
      try {
        const result = await fetch(`http://127.0.0.1:${port}/api/dev/demo-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ portalType: 'farmer' }),
        });
        assert.equal(result.status, expected);
      } finally {
        await new Promise((resolve) => scenarioServer.close(resolve));
        scenarioDb.close();
      }
    }
  });
});
