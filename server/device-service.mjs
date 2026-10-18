import { newId, newOpaqueToken, sha256 } from './security.mjs';
import { storeAuditEvent } from './workspace.mjs';

const SUPPORTED_SENSORS = new Set(['soil_moisture', 'soil_temperature', 'air_humidity', 'soil_npk']);

function parseJson(value, fallback = {}) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function deriveStatus(row, onlineWindowSeconds = 300, now = Date.now()) {
  if (row.retired_at) return 'retired';
  if (row.type === 'sensor_node' && !row.gateway_id) return 'pending_gateway_assignment';
  if (!row.paired_at || !row.last_seen_at) return 'pending_pairing';
  const age = now - new Date(row.last_seen_at).getTime();
  return age <= onlineWindowSeconds * 1000 ? 'online' : 'offline';
}

function toDevice(row, onlineWindowSeconds) {
  const metadata = parseJson(row.metadata_json);
  return {
    ...metadata,
    id: row.id,
    ownerUserId: row.owner_user_id,
    farmId: row.farm_id,
    plotId: row.plot_id || undefined,
    gatewayId: row.gateway_id || undefined,
    type: row.type,
    name: row.name,
    serialNumber: row.serial_number || undefined,
    status: deriveStatus(row, onlineWindowSeconds),
    lastSeenAt: row.last_seen_at || undefined,
    isDemoRecord: Boolean(row.is_demo_record),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function event(db, { device, actorUserId, type, title, description, source = 'backend' }) {
  const occurredAt = new Date().toISOString();
  db.prepare(`INSERT INTO device_events(id, device_id, owner_user_id, actor_user_id, event_type, title, description, source, occurred_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(newId('evt'), device.id, device.owner_user_id, actorUserId || null, type, title, description, source, occurredAt);
  return occurredAt;
}

function audit(db, user, action, resourceType, resourceId, metadata = {}) {
  storeAuditEvent(db, {
    actorUserId: user.id,
    ownerUserId: user.id,
    action,
    resourceType,
    resourceId,
    metadata,
  });
}

function rowById(db, ownerUserId, deviceId) {
  return db.prepare('SELECT * FROM devices WHERE owner_user_id = ? AND id = ?').get(ownerUserId, deviceId);
}

function validateFarmAndPlot(db, ownerUserId, farmId, plotId) {
  const farmRow = db.prepare('SELECT data_json FROM farms WHERE owner_user_id = ? AND id = ?').get(ownerUserId, farmId);
  if (!farmRow) return { ok: false, code: 'FARM_NOT_FOUND', message: 'Choose a farm in your account.' };
  const farm = parseJson(farmRow.data_json);
  if (farm.isArchived) return { ok: false, code: 'FARM_ARCHIVED', message: 'Devices cannot be registered to an archived farm.' };
  if (plotId) {
    const plot = db.prepare('SELECT id FROM plots WHERE owner_user_id = ? AND farm_id = ? AND id = ?').get(ownerUserId, farmId, plotId);
    if (!plot) return { ok: false, code: 'PLOT_NOT_FOUND', message: 'Choose a plot that belongs to the selected farm.' };
  }
  return { ok: true };
}

function validateGateway(db, ownerUserId, farmId, gatewayId) {
  if (!gatewayId) return { ok: true };
  const gateway = db.prepare('SELECT * FROM devices WHERE owner_user_id = ? AND id = ?').get(ownerUserId, gatewayId);
  if (!gateway || gateway.type !== 'lora_gateway' || gateway.farm_id !== farmId || gateway.retired_at) {
    return { ok: false, code: 'INVALID_GATEWAY', message: 'Choose an active LoRa gateway registered to the same farm.' };
  }
  return { ok: true, gateway };
}

export function listDevices(db, user, farmId, onlineWindowSeconds) {
  const rows = farmId
    ? db.prepare('SELECT * FROM devices WHERE owner_user_id = ? AND farm_id = ? ORDER BY created_at DESC').all(user.id, farmId)
    : db.prepare('SELECT * FROM devices WHERE owner_user_id = ? ORDER BY created_at DESC').all(user.id);
  return rows.map((row) => toDevice(row, onlineWindowSeconds));
}

export function getDevice(db, user, deviceId, onlineWindowSeconds) {
  const row = rowById(db, user.id, deviceId);
  return row ? toDevice(row, onlineWindowSeconds) : null;
}

export function registerDevice(db, user, input, onlineWindowSeconds) {
  const farmCheck = validateFarmAndPlot(db, user.id, input.farmId, input.plotId);
  if (!farmCheck.ok) return farmCheck;
  if (input.type === 'sensor_node' && input.gatewayId) {
    const gatewayCheck = validateGateway(db, user.id, input.farmId, input.gatewayId);
    if (!gatewayCheck.ok) return gatewayCheck;
  }
  if (input.type === 'lora_gateway' && input.gatewayId) {
    return { ok: false, code: 'INVALID_GATEWAY', message: 'A gateway cannot be assigned to another gateway.' };
  }
  const sensors = input.installedSensors || [];
  if (sensors.some((sensor) => !SUPPORTED_SENSORS.has(sensor))) {
    return { ok: false, code: 'UNSUPPORTED_SENSOR', message: 'One or more selected sensor types are not supported.' };
  }

  const now = new Date().toISOString();
  const id = newId('device');
  const serialNumber = input.serialNumber?.trim() || null;
  const metadata = { ...input };
  delete metadata.farmId;
  delete metadata.type;
  delete metadata.name;
  delete metadata.serialNumber;
  delete metadata.gatewayId;
  delete metadata.status;
  delete metadata.ownerUserId;
  delete metadata.id;

  try {
    db.transaction(() => {
      db.prepare(`INSERT INTO devices(id, owner_user_id, farm_id, plot_id, gateway_id, type, name, serial_number, metadata_json, is_demo_record, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, user.id, input.farmId, input.plotId || null, input.gatewayId || null, input.type, input.name.trim(), serialNumber, JSON.stringify(metadata), user.isDemo ? 1 : 0, now, now);
      const device = rowById(db, user.id, id);
      event(db, {
        device,
        actorUserId: user.id,
        type: 'registered',
        title: 'Device record registered',
        description: user.isDemo
          ? 'Demo device metadata is saved by the local development API. No physical pairing or sensor telemetry is implied.'
          : 'Device metadata is registered. Physical pairing and authenticated heartbeat are still required before any online status.',
        source: user.isDemo ? 'demo' : 'backend',
      });
      audit(db, user, 'device.register', 'device', id, { type: input.type, farmId: input.farmId });
    })();
  } catch (error) {
    if (String(error.message).includes('devices_serial_unique')) {
      return { ok: false, code: 'DUPLICATE_SERIAL', message: 'This serial number or device EUI is already registered.' };
    }
    if (String(error.message).includes('UNIQUE constraint failed: devices')) {
      return { ok: false, code: 'DUPLICATE_SERIAL', message: 'This serial number or device EUI is already registered.' };
    }
    throw error;
  }
  return { ok: true, device: getDevice(db, user, id, onlineWindowSeconds) };
}

export function updateDeviceMetadata(db, user, deviceId, patch, onlineWindowSeconds) {
  const row = rowById(db, user.id, deviceId);
  if (!row) return { ok: false, code: 'DEVICE_NOT_FOUND', message: 'Device record not found.' };
  if (row.retired_at) return { ok: false, code: 'DEVICE_RETIRED', message: 'Retired devices cannot be edited.' };
  const current = toDevice(row, onlineWindowSeconds);
  const nextLatitude = patch.latitude === null ? undefined : (patch.latitude ?? current.latitude);
  const nextLongitude = patch.longitude === null ? undefined : (patch.longitude ?? current.longitude);
  if ((nextLatitude === undefined) !== (nextLongitude === undefined)) {
    return { ok: false, code: 'INVALID_COORDINATES', message: 'Enter both coordinates or clear both fields.' };
  }
  const nextPlotId = patch.plotId === null ? undefined : (patch.plotId ?? current.plotId);
  if (nextPlotId) {
    const plotCheck = validateFarmAndPlot(db, user.id, row.farm_id, nextPlotId);
    if (!plotCheck.ok) return plotCheck;
  }
  const metadata = { ...parseJson(row.metadata_json) };
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'plotId') continue;
    if (value === null || value === undefined || value === '') delete metadata[key];
    else metadata[key] = value;
  }
  delete metadata.plotId;
  delete metadata.id;
  delete metadata.ownerUserId;
  delete metadata.farmId;
  delete metadata.type;
  delete metadata.name;
  delete metadata.serialNumber;
  delete metadata.gatewayId;
  delete metadata.status;
  if (patch.plotId === null) delete metadata.plotId;

  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare('UPDATE devices SET plot_id = ?, name = ?, metadata_json = ?, updated_at = ? WHERE owner_user_id = ? AND id = ?')
      .run(nextPlotId || null, patch.name ?? row.name, JSON.stringify(metadata), now, user.id, deviceId);
    const updated = rowById(db, user.id, deviceId);
    event(db, { device: updated, actorUserId: user.id, type: 'metadata_updated', title: 'Device details updated', description: 'Descriptive installation metadata was updated.', source: user.isDemo ? 'demo' : 'backend' });
    audit(db, user, 'device.metadata.update', 'device', deviceId);
  })();
  return { ok: true, device: getDevice(db, user, deviceId, onlineWindowSeconds) };
}

export function assignGateway(db, user, deviceId, gatewayId, onlineWindowSeconds) {
  const device = rowById(db, user.id, deviceId);
  if (!device) return { ok: false, code: 'DEVICE_NOT_FOUND', message: 'Device record not found.' };
  if (device.type !== 'sensor_node') return { ok: false, code: 'NOT_SENSOR_NODE', message: 'Only sensor nodes can be assigned to a gateway.' };
  if (device.retired_at) return { ok: false, code: 'DEVICE_RETIRED', message: 'Retired devices cannot be reassigned.' };
  const gatewayCheck = validateGateway(db, user.id, device.farm_id, gatewayId || undefined);
  if (!gatewayCheck.ok) return gatewayCheck;
  if ((device.gateway_id || null) === (gatewayId || null)) return { ok: true, device: getDevice(db, user, deviceId, onlineWindowSeconds) };

  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare('UPDATE devices SET gateway_id = ?, paired_at = NULL, last_seen_at = NULL, updated_at = ? WHERE owner_user_id = ? AND id = ?')
      .run(gatewayId || null, now, user.id, deviceId);
    db.prepare('UPDATE device_credentials SET revoked_at = ? WHERE device_id = ? AND revoked_at IS NULL').run(now, deviceId);
    db.prepare('UPDATE pairing_sessions SET used_at = ? WHERE device_id = ? AND used_at IS NULL').run(now, deviceId);
    const updated = rowById(db, user.id, deviceId);
    event(db, { device: updated, actorUserId: user.id, type: 'gateway_assigned', title: gatewayId ? 'Gateway assignment updated' : 'Gateway assignment removed', description: gatewayId ? `Assigned to ${gatewayCheck.gateway.name}. A new secure pairing is required.` : 'The node is unassigned and must be assigned before commissioning.', source: user.isDemo ? 'demo' : 'backend' });
    audit(db, user, 'device.gateway.assign', 'device', deviceId, { gatewayId: gatewayId || null });
  })();
  return { ok: true, device: getDevice(db, user, deviceId, onlineWindowSeconds) };
}

export function retireDevice(db, user, deviceId, onlineWindowSeconds) {
  const row = rowById(db, user.id, deviceId);
  if (!row) return { ok: false, code: 'DEVICE_NOT_FOUND', message: 'Device record not found.' };
  if (row.retired_at) return { ok: true, device: toDevice(row, onlineWindowSeconds) };
  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare('UPDATE devices SET retired_at = ?, updated_at = ? WHERE owner_user_id = ? AND id = ?').run(now, now, user.id, deviceId);
    db.prepare('UPDATE device_credentials SET revoked_at = ? WHERE device_id = ? AND revoked_at IS NULL').run(now, deviceId);
    db.prepare('UPDATE pairing_sessions SET used_at = ? WHERE device_id = ? AND used_at IS NULL').run(now, deviceId);
    const updated = rowById(db, user.id, deviceId);
    event(db, { device: updated, actorUserId: user.id, type: 'retired', title: 'Device retired', description: 'The device is removed from active use. Historical events and telemetry are retained.', source: user.isDemo ? 'demo' : 'backend' });
    audit(db, user, 'device.retire', 'device', deviceId);
  })();
  return { ok: true, device: getDevice(db, user, deviceId, onlineWindowSeconds) };
}

export function createPairingSession(db, user, deviceId, onlineWindowSeconds) {
  const row = rowById(db, user.id, deviceId);
  if (!row) return { ok: false, code: 'DEVICE_NOT_FOUND', message: 'Device record not found.' };
  if (row.retired_at) return { ok: false, code: 'DEVICE_RETIRED', message: 'A retired device cannot be paired.' };
  if (row.type === 'sensor_node' && !row.gateway_id) {
    return { ok: false, code: 'GATEWAY_REQUIRED', message: 'Assign this sensor node to a same-farm gateway before starting commissioning.' };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
  const pairingToken = newOpaqueToken(32);
  const sessionId = newId('pair');
  db.transaction(() => {
    db.prepare('UPDATE pairing_sessions SET used_at = ? WHERE device_id = ? AND used_at IS NULL').run(now.toISOString(), deviceId);
    db.prepare('INSERT INTO pairing_sessions(id, device_id, owner_user_id, token_hash, expires_at, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(sessionId, deviceId, user.id, sha256(pairingToken), expiresAt, user.id, now.toISOString());
    const current = rowById(db, user.id, deviceId);
    event(db, { device: current, actorUserId: user.id, type: 'pairing_requested', title: 'Pairing session created', description: 'A one-time pairing token was issued. It expires in 10 minutes and is shown only once.', source: user.isDemo ? 'demo' : 'backend' });
    audit(db, user, 'device.pairing.create', 'device', deviceId, { expiresAt });
  })();
  return {
    ok: true,
    pairingSession: {
      id: sessionId,
      pairingToken,
      expiresAt,
      expiresInSeconds: 600,
      instructions: 'Keep this code private. Enter it only in the trusted physical device or gateway commissioning flow. It is not saved in browser storage.',
    },
    device: getDevice(db, user, deviceId, onlineWindowSeconds),
  };
}

export function completePairing(db, pairingToken) {
  const now = new Date().toISOString();
  const session = db.prepare(`SELECT p.*, d.type, d.retired_at, d.owner_user_id AS device_owner_id
    FROM pairing_sessions p JOIN devices d ON d.id = p.device_id WHERE p.token_hash = ?`).get(sha256(pairingToken));
  if (!session || session.used_at || session.expires_at <= now || session.retired_at) {
    return { ok: false, code: 'PAIRING_TOKEN_INVALID', message: 'Pairing code is invalid, expired, already used, or the device is retired.' };
  }
  const deviceSecret = newOpaqueToken(48);
  const secretHash = sha256(deviceSecret);
  db.transaction(() => {
    db.prepare('UPDATE pairing_sessions SET used_at = ? WHERE id = ? AND used_at IS NULL').run(now, session.id);
    db.prepare('UPDATE device_credentials SET revoked_at = ? WHERE device_id = ? AND revoked_at IS NULL').run(now, session.device_id);
    db.prepare(`INSERT INTO device_credentials(device_id, owner_user_id, secret_hash, created_at, revoked_at)
      VALUES (?, ?, ?, ?, NULL)
      ON CONFLICT(device_id) DO UPDATE SET owner_user_id = excluded.owner_user_id, secret_hash = excluded.secret_hash, created_at = excluded.created_at, revoked_at = NULL`)
      .run(session.device_id, session.device_owner_id, secretHash, now);
    db.prepare('UPDATE devices SET paired_at = ?, last_seen_at = NULL, updated_at = ? WHERE id = ?').run(now, now, session.device_id);
    const current = db.prepare('SELECT * FROM devices WHERE id = ?').get(session.device_id);
    event(db, { device: current, actorUserId: null, type: 'pairing_succeeded', title: 'Physical device identity paired', description: 'The one-time commissioning code was redeemed. Device status remains pending until an authenticated heartbeat is received.', source: 'device' });
    audit(db, { id: session.device_owner_id }, 'device.pairing.complete', 'device', session.device_id);
  })();
  return { ok: true, deviceId: session.device_id, deviceSecret, instructions: 'This device secret is shown once. Store it only in the device secure element; never in the website or browser storage.' };
}

const SENSOR_RULES = {
  soil_moisture: { units: ['%', 'raw'], min: 0, max: 65535 },
  soil_temperature: { units: ['°C', 'C'], min: -40, max: 85 },
  air_humidity: { units: ['%'], min: 0, max: 100 },
  soil_npk: { units: ['mg/kg', 'raw'], min: 0, max: 65535 },
};

function authenticatedDevice(db, secret) {
  return db.prepare(`SELECT c.device_id, c.owner_user_id, d.farm_id, d.paired_at, d.retired_at, d.metadata_json
    FROM device_credentials c JOIN devices d ON d.id = c.device_id
    WHERE c.secret_hash = ? AND c.revoked_at IS NULL`).get(sha256(secret));
}

export function recordHeartbeat(db, secret) {
  const credential = authenticatedDevice(db, secret);
  if (!credential || !credential.paired_at || credential.retired_at) {
    return { ok: false, status: 401, code: 'DEVICE_CREDENTIAL_INVALID', message: 'Device credential is invalid or revoked.' };
  }
  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare('UPDATE devices SET last_seen_at = ?, updated_at = ? WHERE id = ?').run(now, now, credential.device_id);
    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(credential.device_id);
    event(db, { device, type: 'heartbeat', title: 'Authenticated heartbeat received', description: 'Device acknowledged connectivity. No sensor measurement was supplied.', source: 'device' });
  })();
  return { ok: true, receivedAt: now };
}

export function ingestTelemetry(db, bearerSecret, readings) {
  const credential = db.prepare(`SELECT c.device_id, c.owner_user_id, d.farm_id, d.paired_at, d.retired_at, d.metadata_json
    FROM device_credentials c JOIN devices d ON d.id = c.device_id
    WHERE c.secret_hash = ? AND c.revoked_at IS NULL`).get(sha256(bearerSecret));
  if (!credential || !credential.paired_at || credential.retired_at) {
    return { ok: false, status: 401, code: 'DEVICE_CREDENTIAL_INVALID', message: 'Device credential is invalid, revoked, or not commissioned.' };
  }
  const metadata = parseJson(credential.metadata_json);
  const installedSensors = new Set(metadata.installedSensors || []);
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  for (const reading of readings) {
    const rule = SENSOR_RULES[reading.sensorType];
    const measuredMs = new Date(reading.measuredAt).getTime();
    if (!rule || !installedSensors.has(reading.sensorType)) {
      return { ok: false, status: 400, code: 'UNSUPPORTED_SENSOR', message: `Sensor ${reading.sensorType} is not registered for this device.` };
    }
    const valueMin = typeof rule.min === 'function' ? rule.min(reading.unit) : rule.min;
    const valueMax = typeof rule.max === 'function' ? rule.max(reading.unit) : rule.max;
    if (!rule.units.includes(reading.unit) || reading.value < valueMin || reading.value > valueMax || (reading.sensorType === 'soil_moisture' && reading.unit === '%' && reading.value > 100)) {
      return { ok: false, status: 400, code: 'INVALID_READING', message: `Reading for ${reading.sensorType} has an unsupported unit or is outside the accepted range.` };
    }
    if ((reading.sensorType === 'soil_npk') !== Boolean(reading.component)) {
      return { ok: false, status: 400, code: 'INVALID_COMPONENT', message: 'NPK readings require nitrogen, phosphorus or potassium; other sensors must omit component.' };
    }
    if (['soil_moisture', 'soil_npk'].includes(reading.sensorType) && reading.unit !== 'raw' &&
        (reading.measurementKind !== 'calibrated' || !reading.calibrationMethod || metadata.calibrationStatus !== 'calibration_recorded')) {
      return { ok: false, status: 400, code: 'CALIBRATION_REQUIRED', message: 'Converted moisture and NPK measurements require recorded calibration and a documented conversion method.' };
    }
    if ((reading.unit === 'raw') !== (reading.measurementKind !== 'calibrated') && ['soil_moisture', 'soil_npk'].includes(reading.sensorType)) {
      return { ok: false, status: 400, code: 'INVALID_CONVERSION', message: 'Raw values must use raw units and calibrated values must use documented measurement units.' };
    }
    if (!Number.isFinite(measuredMs) || measuredMs > nowMs + 5 * 60 * 1000 || measuredMs < nowMs - 90 * 24 * 60 * 60 * 1000) {
      return { ok: false, status: 400, code: 'INVALID_TIMESTAMP', message: 'Reading timestamp is outside the accepted 90-day window.' };
    }
  }

  const inserted = [];
  db.transaction(() => {
    const insertReading = db.prepare(`INSERT INTO telemetry_readings(id, device_id, owner_user_id, farm_id, sensor_type, value, unit, measured_at, received_at, quality, source, component, measurement_kind, calibration_method)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'valid', 'physical_sensor', ?, ?, ?)`);
    const duplicate = db.prepare(`SELECT id FROM telemetry_readings WHERE device_id = ? AND sensor_type = ? AND measured_at = ? AND unit = ? AND value = ? AND component IS ? AND measurement_kind = ? AND calibration_method IS ? LIMIT 1`);
    for (const reading of readings) {
      const timestamp = new Date(reading.measuredAt).toISOString();
      if (duplicate.get(credential.device_id, reading.sensorType, timestamp, reading.unit, reading.value, reading.component || null, reading.measurementKind || 'raw', reading.calibrationMethod || null)) continue;
      const id = newId('reading');
      insertReading.run(id, credential.device_id, credential.owner_user_id, credential.farm_id, reading.sensorType, reading.value, reading.unit, timestamp, now, reading.component || null, reading.measurementKind || 'raw', reading.calibrationMethod || null);
      inserted.push({ id, ...reading, deviceId: credential.device_id, farmId: credential.farm_id, receivedAt: now, quality: 'valid', source: 'physical_sensor' });
    }
    db.prepare('UPDATE devices SET last_seen_at = ?, updated_at = ? WHERE id = ?').run(now, now, credential.device_id);
    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(credential.device_id);
    event(db, { device, actorUserId: null, type: 'heartbeat', title: 'Authenticated heartbeat received', description: `Received ${readings.length} validated physical sensor reading(s).`, source: 'device' });
    storeAuditEvent(db, { actorUserId: null, ownerUserId: credential.owner_user_id, action: 'device.telemetry.ingest', resourceType: 'device', resourceId: credential.device_id, metadata: { readingCount: readings.length } });
  })();
  return { ok: true, receivedAt: now, readings: inserted, duplicates: readings.length - inserted.length };
}

export function getTelemetry(db, user, deviceId, { from, to, limit = 500 }) {
  const device = rowById(db, user.id, deviceId);
  if (!device) return null;
  const params = [deviceId, user.id];
  let where = 'device_id = ? AND owner_user_id = ?';
  if (from) { where += ' AND measured_at >= ?'; params.push(from); }
  if (to) { where += ' AND measured_at <= ?'; params.push(to); }
  params.push(limit);
  const readings = db.prepare(`SELECT id, device_id AS deviceId, farm_id AS farmId, sensor_type AS sensorType, value, unit, measured_at AS measuredAt, received_at AS receivedAt, quality, source, component, measurement_kind AS measurementKind, calibration_method AS calibrationMethod
    FROM telemetry_readings WHERE ${where} ORDER BY measured_at DESC LIMIT ?`).all(...params);
  return readings;
}

export function getDeviceEvents(db, user, deviceId, limit = 100) {
  if (!rowById(db, user.id, deviceId)) return null;
  return db.prepare(`SELECT id, device_id AS deviceId, event_type AS type, title, description, occurred_at AS occurredAt, source
    FROM device_events WHERE owner_user_id = ? AND device_id = ? ORDER BY occurred_at DESC LIMIT ?`)
    .all(user.id, deviceId, limit);
}
