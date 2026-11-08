import { AuthSession, DeviceEvent, DeviceRegistrationInput, IoTDevice, TelemetryReading, PortalType } from '../types';
import {
  clearLocalSession,
  createLocalAccount,
  createLocalSession,
  ensureDemoLocalAccounts,
  readLocalSession,
  readLocalWorkspace,
  updateLocalSessionPortal,
  verifyLocalCredentials,
  writeLocalWorkspace,
} from './localWorkspace';

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
    details?: unknown;
  };
}

export class ApiError extends Error {
  status: number;
  code?: string;
  requestId?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, requestId?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

/**
 * Connectivity state for the AGRIPULSE API.
 *
 * A full-stack deployment answers `/api/health` with JSON. A static-only deployment (Vercel,
 * Netlify, GitHub Pages, or any host that only serves the built frontend) rewrites every address to
 * `index.html`, so `/api/*` answers 200/404 with an HTML page instead of JSON. That is exactly the
 * situation that produced a bare "The request failed with status 404" at sign-in: `/api/auth/login`
 * was being answered by the static host, not by the API.
 */
export type ApiMode = 'server' | 'standalone' | 'unknown';

let apiMode: ApiMode = 'unknown';

export const getApiMode = (): ApiMode => apiMode;
export const isStandaloneMode = (): boolean => apiMode === 'standalone';

let probeInFlight: Promise<ApiMode> | null = null;

/** Probes `/api/health` once and remembers the result until something proves otherwise. */
export function detectApiMode(force = false): Promise<ApiMode> {
  if (!force && apiMode !== 'unknown') return Promise.resolve(apiMode);
  if (probeInFlight) return probeInFlight;
  probeInFlight = (async () => {
    try {
      const response = await fetch('/api/health', {
        headers: { Accept: 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        signal: AbortSignal.timeout(8_000),
      });
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || !contentType.includes('application/json')) {
        apiMode = 'standalone';
        return apiMode;
      }
      const payload = await response.json().catch(() => null) as { service?: string } | null;
      apiMode = payload && payload.service === 'agripulse-api' ? 'server' : 'standalone';
      return apiMode;
    } catch {
      apiMode = 'standalone';
      return apiMode;
    } finally {
      probeInFlight = null;
    }
  })();
  return probeInFlight;
}

const unavailableMessage = () =>
  'The AGRIPULSE API is unavailable from this address. Sign in with a workspace account to continue in standalone mode, or run the full-stack server.';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (isStandaloneMode()) {
    throw new ApiError(unavailableMessage(), 0, 'API_UNAVAILABLE');
  }

  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers,
      credentials: 'include',
      signal: init.signal || AbortSignal.timeout(15_000),
      cache: 'no-store',
    });
  } catch {
    apiMode = 'standalone';
    throw new ApiError(unavailableMessage(), 0, 'API_UNAVAILABLE');
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null) as T | ApiErrorBody | null
    : null;

  if (!response.ok) {
    const error = (payload as ApiErrorBody | null)?.error;
    // An HTML answer means the request never reached the API: the host served its SPA fallback.
    // Remember that, so the UI can offer standalone mode instead of repeating a doomed request.
    if (!payload) apiMode = 'standalone';
    throw new ApiError(
      error?.message || (payload ? `The request failed with status ${response.status}.` : unavailableMessage()),
      response.status,
      error?.code || (payload ? undefined : 'API_UNAVAILABLE'),
      error?.requestId,
      error?.details,
    );
  }
  return payload as T;
}

const jsonBody = (value: unknown) => JSON.stringify(value);

export interface WorkspaceResponse {
  initialized: boolean;
  revision: number;
  updatedAt: string | null;
  data: Record<string, unknown>;
}

export interface WorkspaceSaveResponse {
  initialized: boolean;
  revision: number;
  updatedAt: string;
  data: Record<string, unknown>;
}

export interface PairingSessionResponse {
  ok: true;
  pairingSession: {
    id: string;
    pairingToken: string;
    expiresAt: string;
    expiresInSeconds: number;
    instructions: string;
  };
  device: IoTDevice;
}

/** Demo accounts that exist without any server, mirroring the seeded API users. */
export const DEMO_ACCOUNTS = {
  farmer: { email: 'farmer.demo@agripulse.in', password: 'AgriPulseDemo!2026', farmerName: 'Rajeshwar Singh Chaudhary' },
  seller: { email: 'seller.demo@agripulse.in', password: 'AgriPulseDemo!2026', sellerName: 'Sample Agro Cooperative (Demo Seller)' },
} as const;

async function ensureLocalDemoAccounts(): Promise<void> {
  await ensureDemoLocalAccounts([
    { email: DEMO_ACCOUNTS.farmer.email, password: DEMO_ACCOUNTS.farmer.password, farmerName: DEMO_ACCOUNTS.farmer.farmerName, roles: ['farmer'] },
    { email: DEMO_ACCOUNTS.seller.email, password: DEMO_ACCOUNTS.seller.password, sellerName: DEMO_ACCOUNTS.seller.sellerName, roles: ['seller'] },
  ]);
}

const localAuth = {
  session() {
    const current = readLocalSession();
    return { session: current ? current.session : null };
  },
  async login(input: { email: string; password: string; rememberMe: boolean; portalType: PortalType }) {
    await ensureLocalDemoAccounts();
    const account = await verifyLocalCredentials(input.email, input.password);
    if (!account) {
      throw new ApiError(
        'Email or password is incorrect for this workspace account. Use the demo launchers, or create an account on this device.',
        401,
        'INVALID_CREDENTIALS',
      );
    }
    const portalType = account.roles.includes(input.portalType) ? input.portalType : account.roles[0];
    const session = createLocalSession(account, portalType, input.rememberMe);
    return { session, workspace: readLocalWorkspace(account.userId) };
  },
  async register(input: Record<string, unknown> & { portalType: PortalType; password: string }) {
    const email = String(input.email || '').trim();
    const password = input.password;
    const result = await createLocalAccount({
      email,
      password,
      portalType: input.portalType,
      farmerName: input.portalType === 'farmer' ? String(input.name || '') || undefined : undefined,
      sellerName: input.portalType === 'seller'
        ? (String(input.businessName || '') || String(input.tradeName || '') || undefined)
        : undefined,
    });
    if (!result.ok) {
      if (result.code === 'EMAIL_IN_USE') {
        throw new ApiError('An account with this email already exists on this device.', 409, 'EMAIL_ALREADY_REGISTERED');
      }
      throw new ApiError('This browser cannot store the new account. Enable site storage and try again.', 507, 'STORAGE_UNAVAILABLE');
    }
    const session = createLocalSession(result.account, input.portalType, true);
    const workspace = readLocalWorkspace(result.account.userId);
    return { session, workspace };
  },
  async demoSession(portalType: PortalType) {
    await ensureLocalDemoAccounts();
    const demo = portalType === 'seller' ? DEMO_ACCOUNTS.seller : DEMO_ACCOUNTS.farmer;
    const account = await verifyLocalCredentials(demo.email, demo.password);
    if (!account) throw new ApiError('The demo workspace could not be opened on this device.', 409, 'DEMO_UNAVAILABLE');
    return { session: createLocalSession(account, portalType, true) };
  },
  logout() {
    const current = readLocalSession();
    clearLocalSession(current?.account.userId);
    return { ok: true as const };
  },
  switchPortal(portalType: PortalType) {
    const current = readLocalSession();
    if (!current) throw new ApiError('Sign in to continue.', 401, 'AUTH_REQUIRED');
    if (!current.account.roles.includes(portalType)) {
      throw new ApiError('This account cannot switch to that portal.', 403, 'PORTAL_FORBIDDEN');
    }
    const session = updateLocalSessionPortal(current.account.userId, portalType);
    if (!session) throw new ApiError('Sign in to continue.', 401, 'AUTH_REQUIRED');
    return { session };
  },
};

export const authApi = {
  /** Reads this browser's standalone session without any network request (used on startup). */
  localSession: () => localAuth.session(),
  async session() {
    if (isStandaloneMode()) return localAuth.session();
    return request<{ session: AuthSession | null }>('/api/auth/session');
  },
  async login(input: { email: string; password: string; rememberMe: boolean; portalType: PortalType }) {
    if (isStandaloneMode()) return localAuth.login(input);
    try {
      return await request<{ session: AuthSession; workspace: WorkspaceResponse }>('/api/auth/login', { method: 'POST', body: jsonBody(input) });
    } catch (error) {
      // The API answered but refused the credentials: report that, do not fall back silently.
      if (error instanceof ApiError && error.code !== 'API_UNAVAILABLE') throw error;
      await detectApiMode(true);
      return localAuth.login(input);
    }
  },
  async register(input: Record<string, unknown> & { portalType: PortalType; password: string }) {
    if (isStandaloneMode()) return localAuth.register(input);
    try {
      return await request<{ session: AuthSession; workspace: WorkspaceResponse }>('/api/auth/register', { method: 'POST', body: jsonBody(input) });
    } catch (error) {
      if (error instanceof ApiError && error.code !== 'API_UNAVAILABLE') throw error;
      await detectApiMode(true);
      return localAuth.register(input);
    }
  },
  async demoSession(portalType: PortalType) {
    if (isStandaloneMode()) return localAuth.demoSession(portalType);
    try {
      return await request<{ session: AuthSession }>('/api/auth/demo-session', { method: 'POST', body: jsonBody({ portalType }) });
    } catch (firstError) {
      // A 404 here can mean either "no API host" or "demo sessions disabled on the server".
      // Only the former should be retried, and the fallback route distinguishes the two.
      if (firstError instanceof ApiError && firstError.code === 'API_UNAVAILABLE') {
        await detectApiMode(true);
        if (isStandaloneMode()) return localAuth.demoSession(portalType);
      }
      try {
        return await request<{ session: AuthSession }>('/api/dev/demo-session', { method: 'POST', body: jsonBody({ portalType }) });
      } catch {
        if (isStandaloneMode()) return localAuth.demoSession(portalType);
        throw firstError;
      }
    }
  },
  async logout() {
    if (isStandaloneMode()) return localAuth.logout();
    try {
      return await request<{ ok: true }>('/api/auth/logout', { method: 'POST' });
    } catch {
      // A local session must still be cleared even when the API cannot be reached.
      return localAuth.logout();
    }
  },
  async switchPortal(portalType: PortalType) {
    if (isStandaloneMode()) return localAuth.switchPortal(portalType);
    return request<{ session: AuthSession }>('/api/auth/portal', { method: 'PATCH', body: jsonBody({ portalType }) });
  },
};

const currentLocalUserId = (): string | null => readLocalSession()?.account.userId ?? null;

export const workspaceApi = {
  get: async (): Promise<WorkspaceResponse> => {
    if (isStandaloneMode()) {
      const userId = currentLocalUserId();
      if (!userId) throw new ApiError('Sign in to continue.', 401, 'AUTH_REQUIRED');
      return readLocalWorkspace(userId);
    }
    return request<WorkspaceResponse>('/api/workspace');
  },
  save: async (data: Record<string, unknown>, revision?: number): Promise<WorkspaceSaveResponse> => {
    if (isStandaloneMode()) {
      const userId = currentLocalUserId();
      if (!userId) throw new ApiError('Sign in to continue.', 401, 'AUTH_REQUIRED');
      const result = writeLocalWorkspace(userId, data, revision);
      if (!result.ok) {
        const status = result.code === 'WORKSPACE_CONFLICT' ? 409 : result.code === 'STORAGE_UNAVAILABLE' ? 507 : 413;
        throw new ApiError(result.message, status, result.code);
      }
      return {
        initialized: result.workspace.initialized,
        revision: result.workspace.revision,
        updatedAt: result.workspace.updatedAt || new Date().toISOString(),
        data: result.workspace.data,
      };
    }
    return request<WorkspaceSaveResponse>('/api/workspace', {
      method: 'PUT',
      body: jsonBody({ data, ...(revision !== undefined ? { revision } : {}) }),
    });
  },
};

/** Standalone device registry: metadata only, no telemetry is ever invented. */
const LOCAL_DEVICES_KEY = 'AgriPulse:v1:local:devices';
const LOCAL_DEVICE_EVENTS_KEY = 'AgriPulse:v1:local:deviceEvents';

const readLocalDevices = (): IoTDevice[] => {
  try {
    const raw = window.localStorage.getItem(LOCAL_DEVICES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed as IoTDevice[] : [];
  } catch {
    return [];
  }
};
const writeLocalDevices = (devices: IoTDevice[]): void => {
  try { window.localStorage.setItem(LOCAL_DEVICES_KEY, JSON.stringify(devices)); } catch { /* ignore quota */ }
};
const readLocalDeviceEvents = (): DeviceEvent[] => {
  try {
    const raw = window.localStorage.getItem(LOCAL_DEVICE_EVENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed as DeviceEvent[] : [];
  } catch {
    return [];
  }
};
const appendLocalDeviceEvent = (event: DeviceEvent): void => {
  try {
    const next = [event, ...readLocalDeviceEvents()].slice(0, 500);
    window.localStorage.setItem(LOCAL_DEVICE_EVENTS_KEY, JSON.stringify(next));
  } catch { /* ignore quota */ }
};

const standaloneDeviceError = (message: string, status = 409) =>
  new ApiError(message, status, 'DEVICE_API_UNAVAILABLE');

const localDevices = {
  buildRecord(input: DeviceRegistrationInput, existing?: IoTDevice): IoTDevice {
    const now = new Date().toISOString();
    const currentUserId = currentLocalUserId() || 'local-user';
    const status = existing?.status && existing.status !== 'draft'
      ? existing.status
      : input.type === 'sensor_node' && !input.gatewayId
        ? 'pending_gateway_assignment'
        : 'pending_pairing';
    return {
      ...(existing || {}),
      id: existing?.id || `local-device-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      ownerUserId: existing?.ownerUserId || currentUserId,
      farmId: input.farmId ?? existing?.farmId ?? '',
      plotId: input.plotId ?? existing?.plotId,
      type: input.type ?? existing?.type ?? 'sensor_node',
      name: input.name ?? existing?.name ?? 'New device',
      serialNumber: input.serialNumber ?? existing?.serialNumber,
      locationLabel: input.locationLabel ?? existing?.locationLabel ?? '',
      state: input.state ?? existing?.state,
      district: input.district ?? existing?.district,
      locality: input.locality ?? existing?.locality,
      latitude: input.latitude ?? existing?.latitude,
      longitude: input.longitude ?? existing?.longitude,
      installedAt: input.installedAt ?? existing?.installedAt,
      status,
      gatewayId: input.gatewayId ?? existing?.gatewayId,
      installedSensors: input.installedSensors ?? existing?.installedSensors,
      backhaulType: input.backhaulType ?? existing?.backhaulType,
      powerSource: input.powerSource ?? existing?.powerSource,
      samplingIntervalMinutes: input.samplingIntervalMinutes ?? existing?.samplingIntervalMinutes,
      communicationProfile: input.communicationProfile ?? existing?.communicationProfile,
      calibrationStatus: input.calibrationStatus ?? existing?.calibrationStatus,
      calibrationDate: input.calibrationDate ?? existing?.calibrationDate,
      calibrationNotes: input.calibrationNotes ?? existing?.calibrationNotes,
      coverageNotes: input.coverageNotes ?? existing?.coverageNotes,
      notes: input.notes ?? existing?.notes,
      isDemoRecord: true,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
  },
  list(farmId?: string) {
    const devices = readLocalDevices();
    return { devices: farmId ? devices.filter((device) => device.farmId === farmId) : devices };
  },
  get(deviceId: string) {
    const device = readLocalDevices().find((item) => item.id === deviceId);
    if (!device) throw standaloneDeviceError('This device is not in this device-local registry.', 404);
    return { device, latestReadings: [] as TelemetryReading[] };
  },
  register(input: DeviceRegistrationInput) {
    const device = localDevices.buildRecord(input);
    writeLocalDevices([device, ...readLocalDevices().filter((item) => item.id !== device.id)]);
    appendLocalDeviceEvent({
      id: `local-event-${Date.now()}`,
      deviceId: device.id,
      type: 'registered',
      title: 'Device record saved in this browser',
      description: 'Stored locally because the AGRIPULSE API is not reachable. No hardware pairing or telemetry has occurred.',
      occurredAt: new Date().toISOString(),
      source: 'demo',
    } as DeviceEvent);
    return { device };
  },
  patch(deviceId: string, patch: Record<string, unknown>) {
    const devices = readLocalDevices();
    const existing = devices.find((item) => item.id === deviceId);
    if (!existing) throw standaloneDeviceError('This device is not in this device-local registry.', 404);
    const updated = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() } as IoTDevice;
    writeLocalDevices(devices.map((item) => (item.id === deviceId ? updated : item)));
    return { device: updated };
  },
  retire(deviceId: string) {
    return localDevices.patch(deviceId, { status: 'retired' as const });
  },
};

export const deviceApi = {
  async list(farmId?: string) {
    if (isStandaloneMode()) return localDevices.list(farmId);
    const query = farmId ? `?farmId=${encodeURIComponent(farmId)}` : '';
    return request<{ devices: IoTDevice[] }>(`/api/devices${query}`);
  },
  async get(deviceId: string) {
    if (isStandaloneMode()) return localDevices.get(deviceId);
    return request<{ device: IoTDevice; latestReadings: TelemetryReading[] }>(`/api/devices/${encodeURIComponent(deviceId)}`);
  },
  async register(input: DeviceRegistrationInput) {
    if (isStandaloneMode()) return localDevices.register(input);
    return request<{ device: IoTDevice }>('/api/devices', { method: 'POST', body: jsonBody(input) });
  },
  async patch(deviceId: string, patch: Record<string, unknown>) {
    if (isStandaloneMode()) return localDevices.patch(deviceId, patch);
    return request<{ device: IoTDevice }>(`/api/devices/${encodeURIComponent(deviceId)}`, { method: 'PATCH', body: jsonBody(patch) });
  },
  async assignGateway(deviceId: string, gatewayId?: string) {
    if (isStandaloneMode()) {
      const current = readLocalDevices().find((item) => item.id === deviceId);
      if (!current) throw standaloneDeviceError('This device is not in this device-local registry.', 404);
      const status = current.status === 'pending_gateway_assignment' && gatewayId ? 'pending_pairing' : current.status;
      return localDevices.patch(deviceId, { gatewayId: gatewayId || undefined, status });
    }
    return request<{ device: IoTDevice }>(`/api/devices/${encodeURIComponent(deviceId)}/gateway`, { method: 'POST', body: jsonBody({ gatewayId: gatewayId || null }) });
  },
  async retire(deviceId: string) {
    if (isStandaloneMode()) return localDevices.retire(deviceId);
    return request<{ device: IoTDevice }>(`/api/devices/${encodeURIComponent(deviceId)}/retire`, { method: 'POST' });
  },
  async createPairingSession(deviceId: string) {
    if (isStandaloneMode()) {
      throw standaloneDeviceError(
        'Device pairing needs the AGRIPULSE API with an authenticated broker. Standalone mode keeps registered metadata only; no pairing token is issued.',
      );
    }
    return request<PairingSessionResponse>(`/api/devices/${encodeURIComponent(deviceId)}/pairing-sessions`, { method: 'POST' });
  },
  async events(deviceId: string) {
    if (isStandaloneMode()) {
      return { events: readLocalDeviceEvents().filter((event) => event.deviceId === deviceId) };
    }
    return request<{ events: DeviceEvent[] }>(`/api/devices/${encodeURIComponent(deviceId)}/events`);
  },
  async telemetry(deviceId: string, limit = 500) {
    if (isStandaloneMode()) {
      // Honest empty result: this device has never reported to a backend.
      return { readings: [] as TelemetryReading[], source: 'physical_sensor' as const };
    }
    return request<{ readings: TelemetryReading[]; source: 'physical_sensor' }>(`/api/devices/${encodeURIComponent(deviceId)}/telemetry?limit=${limit}`);
  },
};
