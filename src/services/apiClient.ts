import { AuthSession, DeviceEvent, DeviceRegistrationInput, IoTDevice, TelemetryReading, PortalType } from '../types';

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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
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
    throw new ApiError('AGRIPULSE API is unavailable. Check your connection and the service deployment, then try again.', 0, 'API_UNAVAILABLE');
  }

  const responseText = await response.text();
  let payload: T | ApiErrorBody | null = null;
  if (responseText) {
    try {
      payload = JSON.parse(responseText) as T | ApiErrorBody;
    } catch {
      // A static host commonly returns index.html for /api routes. Never interpret that
      // response as a successful session or workspace payload.
      if (response.ok) {
        throw new ApiError('The AGRIPULSE API returned an invalid response. Verify that /api is routed to the Node service, not the static frontend.', response.status, 'INVALID_API_RESPONSE');
      }
    }
  }
  if (!response.ok) {
    const error = (payload as ApiErrorBody | null)?.error;
    throw new ApiError(
      error?.message || `The request failed with status ${response.status}.`,
      response.status,
      error?.code,
      error?.requestId,
      error?.details,
    );
  }
  if (payload === null) {
    throw new ApiError('The AGRIPULSE API returned an empty response. Check the service health and try again.', response.status, 'INVALID_API_RESPONSE');
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

export const authApi = {
  async session() {
    return request<{ session: AuthSession | null }>('/api/auth/session');
  },
  async login(input: { email: string; password: string; rememberMe: boolean; portalType: PortalType }) {
    return request<{ session: AuthSession; workspace: WorkspaceResponse }>('/api/auth/login', { method: 'POST', body: jsonBody(input) });
  },
  async register(input: Record<string, unknown> & { portalType: PortalType; password: string }) {
    return request<{ session: AuthSession; workspace: WorkspaceResponse }>('/api/auth/register', { method: 'POST', body: jsonBody(input) });
  },
  async logout() {
    return request<{ ok: true }>('/api/auth/logout', { method: 'POST' });
  },
  async switchPortal(portalType: PortalType) {
    return request<{ session: AuthSession }>('/api/auth/portal', { method: 'PATCH', body: jsonBody({ portalType }) });
  },
};

export const workspaceApi = {
  get: () => request<WorkspaceResponse>('/api/workspace'),
  save: (data: Record<string, unknown>, revision?: number) => request<WorkspaceSaveResponse>('/api/workspace', {
    method: 'PUT',
    body: jsonBody({ data, ...(revision !== undefined ? { revision } : {}) }),
  }),
};

export const deviceApi = {
  async list(farmId?: string) {
    const query = farmId ? `?farmId=${encodeURIComponent(farmId)}` : '';
    return request<{ devices: IoTDevice[] }>(`/api/devices${query}`);
  },
  async get(deviceId: string) {
    return request<{ device: IoTDevice; latestReadings: TelemetryReading[] }>(`/api/devices/${encodeURIComponent(deviceId)}`);
  },
  async register(input: DeviceRegistrationInput) {
    return request<{ device: IoTDevice }>('/api/devices', { method: 'POST', body: jsonBody(input) });
  },
  async patch(deviceId: string, patch: Record<string, unknown>) {
    return request<{ device: IoTDevice }>(`/api/devices/${encodeURIComponent(deviceId)}`, { method: 'PATCH', body: jsonBody(patch) });
  },
  async assignGateway(deviceId: string, gatewayId?: string) {
    return request<{ device: IoTDevice }>(`/api/devices/${encodeURIComponent(deviceId)}/gateway`, { method: 'POST', body: jsonBody({ gatewayId: gatewayId || null }) });
  },
  async retire(deviceId: string) {
    return request<{ device: IoTDevice }>(`/api/devices/${encodeURIComponent(deviceId)}/retire`, { method: 'POST' });
  },
  async createPairingSession(deviceId: string) {
    return request<PairingSessionResponse>(`/api/devices/${encodeURIComponent(deviceId)}/pairing-sessions`, { method: 'POST' });
  },
  async events(deviceId: string) {
    return request<{ events: DeviceEvent[] }>(`/api/devices/${encodeURIComponent(deviceId)}/events`);
  },
  async telemetry(deviceId: string, limit = 500) {
    return request<{ readings: TelemetryReading[]; source: 'physical_sensor' }>(`/api/devices/${encodeURIComponent(deviceId)}/telemetry?limit=${limit}`);
  },
};
