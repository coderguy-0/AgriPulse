import { newId } from './security.mjs';

export const WORKSPACE_KEYS = new Set([
  'profile', 'sellerProfile', 'farms', 'plots', 'crops', 'observations', 'activities',
  'rainfallLogs', 'diseaseReports', 'dictBookmarks', 'dictRecent', 'products', 'cart',
  'wishlist', 'recentProducts', 'checkoutDraft', 'orders', 'newsBookmarks', 'chatHistory',
  'activeFarmId',
]);

const FORBIDDEN_KEYS = new Set([
  'password', 'passwordHash', 'secret', 'secrets', 'token', 'tokens', 'pairingToken',
  'deviceSecret', 'privateKey', 'apiKey', 'wifiPassword', 'networkPassword', 'simPin',
  'bankAccountNumber', 'ifscCode', 'ownerUserId', 'owner_user_id', 'telemetryCache',
  'deviceEvents', 'devices', 'session',
]);
const MAX_WORKSPACE_BYTES = 1_200_000;

export function blankWorkspace() {
  return {
    schemaVersion: 1,
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
}

function findForbiddenKey(value, path = '$') {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findForbiddenKey(value[index], `${path}[${index}]`);
      if (found) return found;
    }
    return null;
  }
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) return `${path}.${key}`;
    const found = findForbiddenKey(child, `${path}.${key}`);
    if (found) return found;
  }
  return null;
}

function validateFarmCollections(payload) {
  if (payload.farms !== undefined && !Array.isArray(payload.farms)) {
    return 'farms must be an array.';
  }
  if (payload.plots !== undefined && !Array.isArray(payload.plots)) {
    return 'plots must be an array.';
  }
  const farmIds = new Set();
  for (const farm of payload.farms || []) {
    if (!farm || typeof farm !== 'object' || typeof farm.id !== 'string' || !farm.id.trim()) {
      return 'Every farm must have a non-empty id.';
    }
    if (farmIds.has(farm.id)) return 'Farm IDs must be unique within a workspace.';
    if (typeof farm.name !== 'string' || !farm.name.trim() || farm.name.length > 160) return 'Every farm needs a name of 1–160 characters.';
    if (!Number.isFinite(farm.totalArea) || farm.totalArea < 0 || farm.totalArea > 100000) return 'Farm area must be a nonnegative number no greater than 100000.';
    if (!['acre', 'hectare', 'bigha'].includes(farm.areaUnit)) return 'Choose an explicit farm area unit: acre, hectare or bigha.';
    farmIds.add(farm.id);
  }
  const plotIds = new Set();
  for (const plot of payload.plots || []) {
    if (!plot || typeof plot !== 'object' || typeof plot.id !== 'string' || !plot.id.trim() || typeof plot.farmId !== 'string') {
      return 'Every plot must include an id and farmId.';
    }
    const uniqueKey = `${plot.farmId}:${plot.id}`;
    if (plotIds.has(uniqueKey)) return 'Plot IDs must be unique within their farm.';
    plotIds.add(uniqueKey);
    if (!Number.isFinite(plot.area) || plot.area <= 0 || !['acre', 'hectare', 'bigha'].includes(plot.areaUnit)) return 'Every plot requires a positive area and an explicit area unit.';
    if (!farmIds.has(plot.farmId)) return `Plot ${plot.id} references a farm outside this workspace.`;
  }
  for (const key of ['crops', 'observations', 'activities', 'rainfallLogs']) {
    if (payload[key] !== undefined && !Array.isArray(payload[key])) return `${key} must be an array.`;
    for (const record of payload[key] || []) {
      if (!record || typeof record.id !== 'string' || !farmIds.has(record.farmId)) return `Every ${key} record must reference a farm in this workspace.`;
    }
  }
  return null;
}

function normalizeWorkspace(payload, isDemo) {
  const result = { schemaVersion: 1 };
  for (const [key, value] of Object.entries(payload)) {
    if (!WORKSPACE_KEYS.has(key)) continue;
    result[key] = value;
  }
  result.farms ??= [];
  result.plots ??= [];
  result.crops ??= [];
  result.observations ??= [];
  result.activities ??= [];
  result.rainfallLogs ??= [];
  result.diseaseReports ??= [];
  result.dictBookmarks ??= [];
  result.dictRecent ??= [];
  result.cart ??= [];
  result.wishlist ??= [];
  result.recentProducts ??= [];
  result.orders ??= [];
  result.newsBookmarks ??= [];
  result.chatHistory ??= [];
  if (result.sellerProfile && typeof result.sellerProfile === 'object') {
    const sellerProfile = { ...result.sellerProfile };
    delete sellerProfile.bankAccountNumber;
    delete sellerProfile.ifscCode;
    sellerProfile.isVerified = false;
    sellerProfile.isDemoSeller = Boolean(isDemo);
    result.sellerProfile = sellerProfile;
  }
  return result;
}

export function readWorkspace(db, userId) {
  const row = db.prepare('SELECT revision, payload_json, updated_at FROM workspace_snapshots WHERE user_id = ?').get(userId);
  if (!row) return { initialized: false, revision: 0, updatedAt: null, data: blankWorkspace() };
  try {
    return {
      initialized: true,
      revision: row.revision,
      updatedAt: row.updated_at,
      data: JSON.parse(row.payload_json),
    };
  } catch {
    return { initialized: false, revision: 0, updatedAt: null, data: blankWorkspace() };
  }
}

export function writeWorkspace(db, user, payload, expectedRevision) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, status: 400, code: 'INVALID_WORKSPACE', message: 'Workspace data must be a JSON object.' };
  }
  const unknownKey = Object.keys(payload).find((key) => !WORKSPACE_KEYS.has(key) && key !== 'schemaVersion');
  if (unknownKey) {
    return { ok: false, status: 400, code: 'UNKNOWN_WORKSPACE_FIELD', message: `Workspace field “${unknownKey}” is not accepted.` };
  }
  const forbiddenPath = findForbiddenKey(payload);
  if (forbiddenPath) {
    return { ok: false, status: 400, code: 'SENSITIVE_FIELD_REJECTED', message: `Sensitive field ${forbiddenPath} is not stored in workspace snapshots.` };
  }
  const collectionError = validateFarmCollections(payload);
  if (collectionError) return { ok: false, status: 400, code: 'INVALID_WORKSPACE', message: collectionError };

  const data = normalizeWorkspace(payload, user.isDemo);
  const payloadJson = JSON.stringify(data);
  if (Buffer.byteLength(payloadJson, 'utf8') > MAX_WORKSPACE_BYTES) {
    return { ok: false, status: 413, code: 'WORKSPACE_TOO_LARGE', message: 'Workspace data exceeds the 1.2 MB limit.' };
  }

  const existing = db.prepare('SELECT revision FROM workspace_snapshots WHERE user_id = ?').get(user.id);
  const currentRevision = existing?.revision || 0;
  if (Number.isInteger(expectedRevision) && expectedRevision !== currentRevision) {
    return { ok: false, status: 409, code: 'WORKSPACE_CONFLICT', message: 'Workspace changed elsewhere. Reload the latest saved data before retrying.' };
  }
  const nextRevision = currentRevision + 1;
  const now = new Date().toISOString();

  try {
    const save = db.transaction(() => {
      const incomingFarms = data.farms;
      const incomingPlots = data.plots;
      const incomingFarmIds = new Set(incomingFarms.map((farm) => farm.id));
      const incomingPlotKeys = new Set(incomingPlots.map((plot) => `${plot.farmId}:${plot.id}`));

      const currentFarms = db.prepare('SELECT id FROM farms WHERE owner_user_id = ?').all(user.id);
      for (const removedFarm of currentFarms.filter((farm) => !incomingFarmIds.has(farm.id))) {
        const attachedDevice = db.prepare('SELECT id FROM devices WHERE owner_user_id = ? AND farm_id = ? LIMIT 1').get(user.id, removedFarm.id);
        if (attachedDevice) {
          const error = new Error('A farm with registered devices cannot be deleted. Retire or move its devices first.');
          error.code = 'FARM_HAS_DEVICES';
          throw error;
        }
      }

      const insertFarm = db.prepare(`INSERT INTO farms(owner_user_id, id, data_json) VALUES (?, ?, ?)
        ON CONFLICT(owner_user_id, id) DO UPDATE SET data_json = excluded.data_json`);
      for (const farm of incomingFarms) {
        const sanitized = { ...farm, farmerName: user.isDemo ? (farm.farmerName || 'AGRIPULSE Demo Farmer') : (farm.farmerName || '') };
        insertFarm.run(user.id, farm.id, JSON.stringify(sanitized));
      }

      const insertPlot = db.prepare(`INSERT INTO plots(owner_user_id, farm_id, id, data_json) VALUES (?, ?, ?, ?)
        ON CONFLICT(owner_user_id, farm_id, id) DO UPDATE SET data_json = excluded.data_json`);
      for (const plot of incomingPlots) {
        if (!incomingFarmIds.has(plot.farmId)) {
          const error = new Error(`Plot ${plot.id} references a farm that is not in this workspace.`);
          error.code = 'INVALID_PLOT_FARM';
          throw error;
        }
        insertPlot.run(user.id, plot.farmId, plot.id, JSON.stringify(plot));
      }

      const oldPlots = db.prepare('SELECT farm_id, id FROM plots WHERE owner_user_id = ?').all(user.id);
      const removePlot = db.prepare('DELETE FROM plots WHERE owner_user_id = ? AND farm_id = ? AND id = ?');
      const detachDevicePlot = db.prepare('UPDATE devices SET plot_id = NULL, updated_at = ? WHERE owner_user_id = ? AND farm_id = ? AND plot_id = ?');
      for (const plot of oldPlots) {
        if (!incomingPlotKeys.has(`${plot.farm_id}:${plot.id}`)) {
          detachDevicePlot.run(now, user.id, plot.farm_id, plot.id);
          removePlot.run(user.id, plot.farm_id, plot.id);
        }
      }

      for (const farm of currentFarms) {
        if (!incomingFarmIds.has(farm.id)) {
          db.prepare('DELETE FROM farms WHERE owner_user_id = ? AND id = ?').run(user.id, farm.id);
        }
      }

      db.prepare(`INSERT INTO workspace_snapshots(user_id, revision, payload_json, updated_at) VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET revision = excluded.revision, payload_json = excluded.payload_json, updated_at = excluded.updated_at`)
        .run(user.id, nextRevision, payloadJson, now);
    });
    save();
  } catch (error) {
    if (error.code === 'FARM_HAS_DEVICES') {
      return { ok: false, status: 409, code: error.code, message: error.message };
    }
    if (error.code === 'INVALID_PLOT_FARM') {
      return { ok: false, status: 400, code: error.code, message: error.message };
    }
    throw error;
  }

  return { ok: true, revision: nextRevision, updatedAt: now, data };
}

export function storeAuditEvent(db, {
  actorUserId = null,
  ownerUserId = null,
  action,
  resourceType,
  resourceId = null,
  outcome = 'success',
  metadata = {},
}) {
  db.prepare(`INSERT INTO audit_events(id, actor_user_id, owner_user_id, action, resource_type, resource_id, outcome, metadata_json, occurred_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(newId('audit'), actorUserId, ownerUserId, action, resourceType, resourceId, outcome, JSON.stringify(metadata), new Date().toISOString());
}
