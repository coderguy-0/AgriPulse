import { createWeatherService, WeatherError } from './weather-service.mjs';
import { z } from 'zod';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { deviceMetadataPatchSchema, deviceRegistrationSchema, demoSessionSchema, gatewayAssignmentSchema, loginSchema, pairingCompleteSchema, portalSwitchSchema, registerSchema, telemetryIngestSchema, heartbeatSchema } from './schemas.mjs';
import { clearSession, createSession, getUserByEmail, getUserById, readSessionFromRequest, toClientSession } from './auth-service.mjs';
import { assignGateway, completePairing, createPairingSession, getDevice, getDeviceEvents, getTelemetry, ingestTelemetry, listDevices, registerDevice, retireDevice, updateDeviceMetadata, recordHeartbeat } from './device-service.mjs';
import { newId, hashPassword, verifyPassword } from './security.mjs';
import { readWorkspace, storeAuditEvent, writeWorkspace } from './workspace.mjs';

const FARMER_ROLE = 'farmer';
const SELLER_ROLE = 'seller';
const PUBLIC_DEMO_EMAILS = new Set(['farmer.demo@agripulse.in', 'seller.demo@agripulse.in']);

export function isDemoAccessEnabled(environment = process.env) {
  const flag = String(environment.ALLOW_DEMO_SESSIONS || '').trim().toLowerCase();
  if (flag === 'false') return false;
  return environment.NODE_ENV === 'production' ? flag === 'true' : true;
}

function isSameOrigin(req, origin) {
  try {
    return new URL(origin).origin === `${req.protocol}://${req.get('host')}`;
  } catch {
    return false;
  }
}

function apiError(res, status, code, message, requestId, details) {
  return res.status(status).json({ error: { code, message, requestId, ...(details ? { details } : {}) } });
}

function statusForServiceError(code) {
  if (code === 'DEVICE_NOT_FOUND' || code === 'FARM_NOT_FOUND' || code === 'PLOT_NOT_FOUND') return 404;
  if (code === 'DUPLICATE_SERIAL') return 409;
  if (code === 'DEVICE_RETIRED' || code === 'FARM_ARCHIVED' || code === 'GATEWAY_REQUIRED') return 409;
  if (code === 'INVALID_GATEWAY' || code === 'NOT_SENSOR_NODE' || code === 'UNSUPPORTED_SENSOR') return 422;
  if (code === 'INVALID_COORDINATES') return 400;
  return 400;
}

function validateBody(schema, req, res) {
  const parsed = schema.safeParse(req.body);
  if (parsed.success) return parsed.data;
  apiError(res, 400, 'VALIDATION_ERROR', 'Check the highlighted fields and try again.', req.requestId,
    parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })));
  return null;
}

function makeInitialFarm(input, farmerProfile) {
  const now = new Date().toISOString();
  const rawArea = typeof input.landArea === 'number' ? input.landArea : Number.parseFloat(String(input.landArea || '0'));
  const id = `farm-${randomUUID()}`;
  return {
    id,
    name: farmerProfile.preferences.defaultCrop ? `${farmerProfile.name.split(' ')[0]}'s ${farmerProfile.preferences.defaultCrop} Farm` : `${farmerProfile.name.split(' ')[0]}'s Farm`,
    farmerName: farmerProfile.name,
    state: farmerProfile.state,
    district: farmerProfile.district,
    village: farmerProfile.village,
    totalArea: Number.isFinite(rawArea) && rawArea > 0 ? rawArea : 0,
    areaUnit: 'acre',
    bighaToAcreFactor: 0.25,
    ownershipType: 'Owned',
    soilType: 'Not recorded',
    waterSource: 'Not recorded',
    notes: 'Created during account setup. Add plot, soil and water details when available.',
    isArchived: false,
    isDemoRecord: false,
    createdAt: now,
    updatedAt: now,
  };
}

function emptyWorkspaceForRegistration() {
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

function buildFarmerProfile(userId, input, farmId) {
  return {
    id: userId,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    mobile: input.mobile || '',
    state: input.state || '',
    district: input.district || '',
    village: input.village || '',
    role: 'Farmer',
    isDemoAccount: false,
    joinedDate: new Date().toISOString().slice(0, 10),
    preferences: {
      language: 'en',
      preferredAreaUnit: 'acre',
      bighaToAcreFactor: 0.25,
      bighaRegionLabel: input.state ? `${input.state} Local Bigha` : 'Regional Bigha (confirm locally)',
      defaultFarmId: farmId,
      defaultCrop: input.primaryCrop || '',
      weatherLocation: { state: input.state || '', district: input.district || '', locality: input.village || '' },
      notifications: { weatherAlerts: true, irrigationReminders: true, cropInspectionAlerts: true, orderUpdates: true, schemeUpdates: true },
    },
  };
}

function buildSellerProfile(userId, input) {
  return {
    id: userId,
    businessName: input.businessName.trim(),
    tradeName: input.tradeName || input.businessName.trim(),
    contactPerson: input.contactPerson.trim(),
    email: input.email.trim().toLowerCase(),
    mobile: input.mobile || '',
    category: input.category,
    gstin: input.gstin || '',
    licenseNumber: input.licenseNumber || '',
    state: input.state || '',
    district: input.district || '',
    city: input.city || '',
    address: input.address || '',
    pincode: input.pincode || '',
    isVerified: false,
    isDemoSeller: false,
    rating: 0,
    totalOrders: 0,
    totalRevenuePaise: 0,
    joinedDate: new Date().toISOString().slice(0, 10),
  };
}

export function createApp({ db, environment = process.env, logger = console } = {}) {
  if (!db) throw new Error('createApp requires a database instance.');
  const app = express();
  const weatherService = createWeatherService({ environment });
  const isProduction = environment.NODE_ENV === 'production';
  const demoEnabled = isDemoAccessEnabled(environment);
  const allowedOrigins = new Set(String(environment.WEB_ORIGINS || environment.WEB_ORIGIN || '').split(',').map((value) => value.trim()).filter(Boolean));
  const onlineWindowSeconds = Math.max(60, Math.min(Number(environment.DEVICE_ONLINE_WINDOW_SECONDS || 300), 86400));

  app.disable('x-powered-by');
  app.set('trust proxy', environment.TRUST_PROXY === 'true' ? 1 : false);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    res.setHeader('Cache-Control', 'no-store');
    const origin = req.get('origin');
    if (origin) {
      // Browser POST/PUT requests include Origin even on the same origin. Always allow the
      // origin serving this app; WEB_ORIGINS is only for additional, explicitly trusted origins.
      const allowed = !isProduction || isSameOrigin(req, origin) || allowedOrigins.has(origin);
      if (!allowed) return apiError(res, 403, 'ORIGIN_NOT_ALLOWED', 'This origin is not allowed to call the AGRIPULSE API.', req.requestId);
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, If-Match, X-Request-Id');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    }
    // SameSite cookies plus JSON-only mutation bodies and browser Fetch Metadata protection.
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('sec-fetch-site') === 'cross-site') {
      return apiError(res, 403, 'CSRF_REJECTED', 'Cross-site changes are not permitted.', req.requestId);
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  app.use(express.json({ limit: '1.2mb', strict: true }));
  app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      if (!req.path.startsWith('/api')) return;
      logger.info?.(JSON.stringify({ requestId: req.requestId, method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - startedAt }));
    });
    next();
  });

  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: { code: 'RATE_LIMITED', message: 'Too many sign-in attempts. Wait a few minutes and try again.' } } });
  const pairingLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });
  const telemetryLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false });

  const requireAuth = (req, res, next) => {
    const session = readSessionFromRequest(db, req);
    if (!session) return apiError(res, 401, 'AUTH_REQUIRED', 'Sign in to continue.', req.requestId);
    req.auth = session;
    next();
  };
  const requireRole = (role) => (req, res, next) => {
    if (!req.auth?.roles.includes(role)) return apiError(res, 403, 'PORTAL_FORBIDDEN', 'This account does not have access to this portal.', req.requestId);
    if (req.auth.portalType !== role) return apiError(res, 403, 'PORTAL_NOT_ACTIVE', 'Switch to the authorized portal before continuing.', req.requestId);
    next();
  };
  const routeError = (req, res, result) => {
    const status = result.status || statusForServiceError(result.code);
    return apiError(res, status, result.code || 'REQUEST_REJECTED', result.message || 'The request could not be completed.', req.requestId);
  };

  app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'agripulse-api', timestamp: new Date().toISOString() }));

  app.get('/api/auth/session', (req, res) => {
    const session = readSessionFromRequest(db, req);
    return res.json({ session: toClientSession(db, session) });
  });

  app.post('/api/auth/register', authLimiter, async (req, res) => {
    const input = validateBody(registerSchema, req, res);
    if (!input) return;
    const existing = getUserByEmail(db, input.email);
    if (existing) return apiError(res, 409, 'ACCOUNT_EXISTS', 'An account already uses this email. Sign in or use account recovery.', req.requestId);

    const id = newId('user');
    const passwordHash = await hashPassword(input.password);
    const now = new Date().toISOString();
    let data = emptyWorkspaceForRegistration();
    const roles = [input.portalType];
    if (input.portalType === FARMER_ROLE) {
      const initialFarm = makeInitialFarm(input, { name: input.name.trim(), preferences: { defaultCrop: input.primaryCrop || '' } });
      const profile = buildFarmerProfile(id, input, initialFarm.id);
      initialFarm.farmerName = profile.name;
      data = { ...data, profile, farms: [initialFarm], activeFarmId: initialFarm.id };
    } else {
      data = { ...data, sellerProfile: buildSellerProfile(id, input) };
    }

    try {
      db.transaction(() => {
        db.prepare('INSERT INTO users(id, email, password_hash, roles_json, is_demo, created_at) VALUES (?, ?, ?, ?, 0, ?)')
          .run(id, input.email.trim().toLowerCase(), passwordHash, JSON.stringify(roles), now);
        const write = writeWorkspace(db, { id, email: input.email.trim().toLowerCase(), isDemo: false }, data, 0);
        if (!write.ok) {
          const error = new Error(write.message);
          error.code = write.code;
          throw error;
        }
      })();
    } catch (error) {
      if (String(error.message).includes('UNIQUE constraint failed: users.email')) return apiError(res, 409, 'ACCOUNT_EXISTS', 'An account already uses this email. Sign in or use account recovery.', req.requestId);
      logger.error?.(JSON.stringify({ requestId: req.requestId, operation: 'account.register', error: error.message }));
      return apiError(res, 500, 'REGISTRATION_FAILED', 'Account registration could not be completed. Try again.', req.requestId);
    }
    const user = getUserById(db, id);
    const session = createSession(db, res, user, input.portalType, input.rememberMe, environment);
    storeAuditEvent(db, { actorUserId: id, ownerUserId: id, action: 'account.register', resourceType: 'user', resourceId: id, metadata: { portalType: input.portalType } });
    return res.status(201).json({ session: toClientSession(db, { ...session, id, email: user.email }), workspace: readWorkspace(db, id) });
  });

  app.post('/api/auth/login', authLimiter, async (req, res) => {
    const input = validateBody(loginSchema, req, res);
    if (!input) return;
    const user = getUserByEmail(db, input.email);
    const validPassword = user?.passwordHash
      ? await verifyPassword(input.password, user.passwordHash)
      : (await hashPassword(input.password), false);
    const requestedPortal = input.portalType || user?.roles[0];
    if (!validPassword || !user || !requestedPortal || !user.roles.includes(requestedPortal)) {
      return apiError(res, 401, 'INVALID_CREDENTIALS', 'Email or password is incorrect, or this account is not enabled for that portal.', req.requestId);
    }
    if (user.isDemo && (!demoEnabled || !PUBLIC_DEMO_EMAILS.has(user.email.toLowerCase()))) {
      return apiError(res, 403, 'DEMO_DISABLED', 'This demo account is not enabled on this deployment.', req.requestId);
    }
    const session = createSession(db, res, user, requestedPortal, input.rememberMe, environment);
    storeAuditEvent(db, { actorUserId: user.id, ownerUserId: user.id, action: 'account.login', resourceType: 'session', outcome: 'success', metadata: { portalType: requestedPortal } });
    return res.json({ session: toClientSession(db, { ...session, id: user.id, email: user.email }), workspace: readWorkspace(db, user.id) });
  });

  app.post('/api/auth/logout', (req, res) => {
    const current = readSessionFromRequest(db, req);
    if (current) storeAuditEvent(db, { actorUserId: current.id, ownerUserId: current.id, action: 'account.logout', resourceType: 'session' });
    clearSession(db, req, res, environment);
    return res.json({ ok: true });
  });

  app.patch('/api/auth/portal', requireAuth, (req, res) => {
    const input = validateBody(portalSwitchSchema, req, res);
    if (!input) return;
    if (!req.auth.roles.includes(input.portalType)) return apiError(res, 403, 'PORTAL_FORBIDDEN', 'This account is not authorized for that portal.', req.requestId);
    db.prepare('UPDATE sessions SET portal_type = ? WHERE token_hash = ?').run(input.portalType, req.auth.tokenHash);
    const next = { ...req.auth, portalType: input.portalType };
    return res.json({ session: toClientSession(db, next) });
  });

  const handleDemoSession = (req, res) => {
    if (!demoEnabled) {
      return apiError(res, 404, 'NOT_FOUND', 'Demo access is disabled on this deployment.', req.requestId);
    }
    const input = validateBody(demoSessionSchema, req, res);
    if (!input) return;
    const targetEmail = input.portalType === SELLER_ROLE ? 'seller.demo@agripulse.in' : 'farmer.demo@agripulse.in';
    const user = getUserByEmail(db, targetEmail);
    if (!user || !user.isDemo || !user.roles.includes(input.portalType)) {
      logger.error?.(JSON.stringify({ requestId: req.requestId, operation: 'auth.demo-session', portalType: input.portalType, reason: 'seeded_demo_account_unavailable' }));
      return apiError(res, 503, 'DEMO_UNAVAILABLE', 'The demo account is not initialized. Run npm run db:setup and try again.', req.requestId);
    }
    const session = createSession(db, res, user, input.portalType, true, environment);
    storeAuditEvent(db, { actorUserId: user.id, ownerUserId: user.id, action: 'account.demo_session', resourceType: 'session', outcome: 'success', metadata: { portalType: input.portalType } });
    return res.json({ session: toClientSession(db, { ...session, id: user.id, email: user.email }), workspace: readWorkspace(db, user.id) });
  };

  // The legacy path remains as an alias for older demo links. Both paths use the same
  // role-specific seeded identities and the same production gate; neither shares roles.
  app.post('/api/auth/demo-session', authLimiter, handleDemoSession);
  app.post('/api/dev/demo-session', authLimiter, handleDemoSession);

  app.get('/api/workspace', requireAuth, (req, res) => res.json(readWorkspace(db, req.auth.id)));
  app.put('/api/workspace', requireAuth, (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.hasOwn(body, 'data')) {
      return apiError(res, 400, 'INVALID_WORKSPACE', 'Send workspace data and its last known revision.', req.requestId);
    }
    let expectedRevision;
    const ifMatch = req.get('If-Match');
    if (ifMatch !== undefined) {
      expectedRevision = Number(ifMatch.replaceAll('"', ''));
      if (!Number.isInteger(expectedRevision) || expectedRevision < 0) return apiError(res, 400, 'INVALID_REVISION', 'Workspace revision is invalid.', req.requestId);
    } else if (Number.isInteger(body.revision)) expectedRevision = body.revision;
    if (expectedRevision === undefined) return apiError(res, 428, 'REVISION_REQUIRED', 'Reload the workspace and send its revision before saving.', req.requestId);
    const result = writeWorkspace(db, req.auth, body.data, expectedRevision);
    if (!result.ok) return routeError(req, res, result);
    return res.json({ initialized: true, revision: result.revision, updatedAt: result.updatedAt, data: result.data });
  });

  const weatherLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });
  app.get('/api/weather', requireAuth, requireRole(FARMER_ROLE), weatherLimiter, async (req, res) => {
    const location = z.object({ state: z.string().trim().min(2).max(80).regex(/^[\p{L} .'-]+$/u), district: z.string().trim().min(2).max(100).regex(/^[\p{L} .'-]+$/u) }).strict().safeParse(req.query);
    if (!location.success) return apiError(res, 400, 'INVALID_LOCATION', 'Choose a valid Indian state and district.', req.requestId);
    try { return res.json(await weatherService.get(location.data)); }
    catch (error) {
      if (error instanceof WeatherError) return apiError(res, error.status, error.code, error.message, req.requestId);
      throw error;
    }
  });

  app.get('/api/farms', requireAuth, (req, res) => {
    const rows = db.prepare('SELECT data_json FROM farms WHERE owner_user_id = ? ORDER BY id').all(req.auth.id);
    return res.json({ farms: rows.map((row) => JSON.parse(row.data_json)) });
  });

  app.get('/api/devices', requireAuth, requireRole(FARMER_ROLE), (req, res) => {
    const farmId = typeof req.query.farmId === 'string' ? req.query.farmId.trim() : undefined;
    if (farmId && !db.prepare('SELECT 1 FROM farms WHERE owner_user_id = ? AND id = ?').get(req.auth.id, farmId)) {
      return apiError(res, 404, 'FARM_NOT_FOUND', 'Farm not found in this account.', req.requestId);
    }
    return res.json({ devices: listDevices(db, req.auth, farmId, onlineWindowSeconds) });
  });

  app.post('/api/devices', requireAuth, requireRole(FARMER_ROLE), (req, res) => {
    const input = validateBody(deviceRegistrationSchema, req, res);
    if (!input) return;
    const result = registerDevice(db, req.auth, input, onlineWindowSeconds);
    if (!result.ok) return routeError(req, res, result);
    return res.status(201).json({ device: result.device });
  });

  app.get('/api/devices/:deviceId', requireAuth, requireRole(FARMER_ROLE), (req, res) => {
    const device = getDevice(db, req.auth, req.params.deviceId, onlineWindowSeconds);
    if (!device) return apiError(res, 404, 'DEVICE_NOT_FOUND', 'Device record not found in this account.', req.requestId);
    const latestReadings = getTelemetry(db, req.auth, device.id, { limit: 8 });
    return res.json({ device, latestReadings });
  });

  app.patch('/api/devices/:deviceId', requireAuth, requireRole(FARMER_ROLE), (req, res) => {
    const patch = validateBody(deviceMetadataPatchSchema, req, res);
    if (!patch) return;
    const result = updateDeviceMetadata(db, req.auth, req.params.deviceId, patch, onlineWindowSeconds);
    if (!result.ok) return routeError(req, res, result);
    return res.json({ device: result.device });
  });

  app.post('/api/devices/:deviceId/gateway', requireAuth, requireRole(FARMER_ROLE), (req, res) => {
    const input = validateBody(gatewayAssignmentSchema, req, res);
    if (!input) return;
    const result = assignGateway(db, req.auth, req.params.deviceId, input.gatewayId, onlineWindowSeconds);
    if (!result.ok) return routeError(req, res, result);
    return res.json({ device: result.device });
  });

  app.post('/api/devices/:deviceId/pairing-sessions', requireAuth, requireRole(FARMER_ROLE), pairingLimiter, (req, res) => {
    const result = createPairingSession(db, req.auth, req.params.deviceId, onlineWindowSeconds);
    if (!result.ok) return routeError(req, res, result);
    return res.status(201).json(result);
  });

  app.post('/api/devices/:deviceId/retire', requireAuth, requireRole(FARMER_ROLE), (req, res) => {
    const result = retireDevice(db, req.auth, req.params.deviceId, onlineWindowSeconds);
    if (!result.ok) return routeError(req, res, result);
    return res.json({ device: result.device });
  });

  app.get('/api/devices/:deviceId/telemetry', requireAuth, requireRole(FARMER_ROLE), (req, res) => {
    const { from, to } = req.query;
    const limit = Math.min(500, Math.max(1, Math.floor(Number(req.query.limit) || 500)));
    const parseDate = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : null;
    const fromDate = from === undefined ? undefined : parseDate(from);
    const toDate = to === undefined ? undefined : parseDate(to);
    if ((from !== undefined && !fromDate) || (to !== undefined && !toDate)) return apiError(res, 400, 'INVALID_DATE_RANGE', 'Use valid ISO timestamps for from and to.', req.requestId);
    if (fromDate && toDate && fromDate > toDate) return apiError(res, 400, 'INVALID_DATE_RANGE', 'The from time must be before the to time.', req.requestId);
    const readings = getTelemetry(db, req.auth, req.params.deviceId, { from: fromDate, to: toDate, limit });
    if (readings === null) return apiError(res, 404, 'DEVICE_NOT_FOUND', 'Device record not found in this account.', req.requestId);
    return res.json({ readings, source: 'physical_sensor' });
  });

  app.get('/api/devices/:deviceId/events', requireAuth, requireRole(FARMER_ROLE), (req, res) => {
    const limit = Math.min(200, Math.max(1, Math.floor(Number(req.query.limit) || 100)));
    const events = getDeviceEvents(db, req.auth, req.params.deviceId, limit);
    if (events === null) return apiError(res, 404, 'DEVICE_NOT_FOUND', 'Device record not found in this account.', req.requestId);
    return res.json({ events });
  });

  app.post('/api/device-ingest/pairing/complete', pairingLimiter, (req, res) => {
    const input = validateBody(pairingCompleteSchema, req, res);
    if (!input) return;
    const result = completePairing(db, input.pairingToken);
    if (!result.ok) return routeError(req, res, result);
    return res.json(result);
  });

  app.post('/api/device-ingest/heartbeat', telemetryLimiter, (req, res) => {
    if (!validateBody(heartbeatSchema, req, res)) return;
    const match = (req.get('authorization') || '').match(/^Bearer\s+([A-Za-z0-9_-]{32,256})$/i);
    if (!match) return apiError(res, 401, 'DEVICE_AUTH_REQUIRED', 'A device bearer credential is required.', req.requestId);
    const result = recordHeartbeat(db, match[1]);
    if (!result.ok) return routeError(req, res, result);
    return res.status(202).json(result);
  });

  app.post('/api/device-ingest/telemetry', telemetryLimiter, (req, res) => {
    const input = validateBody(telemetryIngestSchema, req, res);
    if (!input) return;
    const authorization = req.get('authorization') || '';
    const match = authorization.match(/^Bearer\s+([A-Za-z0-9_-]{32,256})$/i);
    if (!match) return apiError(res, 401, 'DEVICE_AUTH_REQUIRED', 'A device bearer credential is required.', req.requestId);
    const result = ingestTelemetry(db, match[1], input.readings);
    if (!result.ok) return apiError(res, result.status, result.code, result.message, req.requestId);
    return res.status(202).json(result);
  });

  app.use('/api', (req, res) => apiError(res, 404, 'API_ROUTE_NOT_FOUND', 'This API route does not exist.', req.requestId));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error?.type === 'entity.too.large') return apiError(res, 413, 'BODY_TOO_LARGE', 'Request body exceeds the API size limit.', req.requestId);
    if (error instanceof SyntaxError && 'body' in error) return apiError(res, 400, 'INVALID_JSON', 'Request body must contain valid JSON.', req.requestId);
    logger.error?.(JSON.stringify({ requestId: req.requestId, operation: 'api.error', message: error?.message || 'Unknown API error' }));
    return apiError(res, 500, 'INTERNAL_ERROR', 'The API could not complete this request.', req.requestId);
  });

  return app;
}
