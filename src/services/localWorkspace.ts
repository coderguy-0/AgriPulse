/**
 * Local workspace storage for standalone (API-less) deployments.
 *
 * AGRIPULSE is designed to run against its Express API (`/api/*`), where accounts, sessions and
 * workspaces live in SQLite. When the frontend is served from a static host (Vercel/Netlify/GitHub
 * Pages) or the API cannot be reached, every `/api/*` request answers with the host's 404 page. In
 * that case the app runs in *standalone mode*: accounts, sessions, workspaces and device records are
 * kept in this browser's `localStorage` so the whole product stays explorable instead of failing at
 * the sign-in screen.
 *
 * Standalone mode is deliberately honest and limited:
 *  - data lives only in this browser profile and is never uploaded anywhere;
 *  - credentials never leave the device, and no real authentication or authorization is claimed;
 *  - no telemetry is invented — devices registered here stay "pending pairing" with no readings;
 *  - whenever the AGRIPULSE API is reachable the API is always used instead.
 *
 * This module is the ONLY place in the frontend that hashes a password. It exists purely to avoid
 * storing plaintext credentials on the demo device; it is not a security boundary.
 */
import { AuthSession, PortalType } from '../types';
import { hashPassword, verifyPassword } from './credentialHash';

export const WORKSPACE_LOCAL_PREFIX = 'AgriPulse:v1:local:';
export const LOCAL_ACCOUNTS_KEY = 'AgriPulse:v1:localAccounts';

/** Fields the server refuses to persist; kept out of browser storage for the same reason. */
const SENSITIVE_WORKSPACE_KEYS = new Set([
  'password',
  'passwordHash',
  'secret',
  'secrets',
  'token',
  'tokens',
  'pairingToken',
  'deviceSecret',
  'privateKey',
  'apiKey',
  'wifiPassword',
  'networkPassword',
  'simPin',
  'bankAccountName',
  'bankAccountNumber',
  'ifscCode',
  'ownerUserId',
  'owner_user_id',
]);

const MAX_WORKSPACE_BYTES = 1_200_000;

export interface LocalAccount {
  userId: string;
  email: string;
  roles: PortalType[];
  passwordHash: string | null;
  farmerName?: string;
  sellerName?: string;
  isDemo: boolean;
  createdAt: string;
}

interface StoredWorkspace {
  initialized: boolean;
  revision: number;
  updatedAt: string | null;
  data: Record<string, unknown>;
}

interface StoredSession {
  token: string;
  userId: string;
  portalType: PortalType;
  rememberMe: boolean;
  loggedInAt: string;
  expiresAt: string;
}

export interface WorkspaceSnapshotResponse {
  initialized: boolean;
  revision: number;
  updatedAt: string | null;
  data: Record<string, unknown>;
}

const browserStorage = (): Storage | null => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    // Touch the store: private-mode browsers can expose localStorage but throw on access.
    const probe = '__agripulse_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
};

const readJson = <T,>(storage: Storage, key: string, fallback: T): T => {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = (storage: Storage, key: string, value: unknown): boolean => {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

const newId = (prefix: string): string => {
  const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${random}`;
};

/** Recursively drop fields the hosted API also refuses to store. */
function stripSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripSensitive);
  if (!value || typeof value !== 'object') return value;
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_WORKSPACE_KEYS.has(key)) continue;
    result[key] = stripSensitive(child);
  }
  return result;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'account';
}

const workspaceKey = (userId: string) => `${WORKSPACE_LOCAL_PREFIX}workspace:${userId}`;
const sessionKey = (userId: string) => `${WORKSPACE_LOCAL_PREFIX}session:${userId}`;

/* ------------------------------------------------------------------------------------------ */
/* Accounts                                                                                    */
/* ------------------------------------------------------------------------------------------ */

export function readLocalAccounts(): LocalAccount[] {
  const storage = browserStorage();
  if (!storage) return [];
  const accounts = readJson<unknown>(storage, LOCAL_ACCOUNTS_KEY, []);
  if (!Array.isArray(accounts)) return [];
  return accounts.filter(
    (account): account is LocalAccount =>
      Boolean(account) &&
      typeof (account as LocalAccount).userId === 'string' &&
      typeof (account as LocalAccount).email === 'string' &&
      Array.isArray((account as LocalAccount).roles),
  );
}

function writeLocalAccounts(accounts: LocalAccount[]): void {
  const storage = browserStorage();
  if (!storage) return;
  writeJson(storage, LOCAL_ACCOUNTS_KEY, accounts);
}

export function findLocalAccount(email: string): LocalAccount | undefined {
  const normalized = email.trim().toLowerCase();
  return readLocalAccounts().find((account) => account.email.toLowerCase() === normalized);
}

export function findLocalAccountById(userId: string): LocalAccount | undefined {
  return readLocalAccounts().find((account) => account.userId === userId);
}

/**
 * Stores the built-in demo accounts on first use so the one-click launchers keep working with no
 * server. Demo passwords are derived here exactly like any other local credential.
 */
export async function ensureDemoLocalAccounts(
  demos: Array<{ email: string; farmerName?: string; sellerName?: string; roles: PortalType[]; password: string }>,
): Promise<void> {
  const accounts = readLocalAccounts();
  let changed = false;
  for (const demo of demos) {
    const email = demo.email.toLowerCase();
    const existing = accounts.find((account) => account.email.toLowerCase() === email);
    if (existing) continue;
    accounts.push({
      userId: `local-${slug(email)}`,
      email,
      roles: demo.roles,
      passwordHash: await hashPassword(demo.password),
      farmerName: demo.farmerName,
      sellerName: demo.sellerName,
      isDemo: true,
      createdAt: new Date().toISOString(),
    });
    changed = true;
  }
  if (changed) writeLocalAccounts(accounts);
}

export async function createLocalAccount(input: {
  email: string;
  password: string;
  portalType: PortalType;
  farmerName?: string;
  sellerName?: string;
  extraRoles?: PortalType[];
}): Promise<{ ok: true; account: LocalAccount } | { ok: false; code: 'EMAIL_IN_USE' | 'STORAGE_UNAVAILABLE' }> {
  const storage = browserStorage();
  if (!storage) return { ok: false, code: 'STORAGE_UNAVAILABLE' };
  const email = input.email.trim().toLowerCase();
  if (findLocalAccount(email)) return { ok: false, code: 'EMAIL_IN_USE' };
  const account: LocalAccount = {
    userId: newId('local-user'),
    email,
    roles: Array.from(new Set([input.portalType, ...(input.extraRoles || [])])),
    passwordHash: await hashPassword(input.password),
    farmerName: input.farmerName,
    sellerName: input.sellerName,
    isDemo: false,
    createdAt: new Date().toISOString(),
  };
  const accounts = readLocalAccounts();
  accounts.push(account);
  if (!writeJson(storage, LOCAL_ACCOUNTS_KEY, accounts)) {
    return { ok: false, code: 'STORAGE_UNAVAILABLE' };
  }
  return { ok: true, account };
}

export async function verifyLocalCredentials(
  email: string,
  password: string,
): Promise<LocalAccount | null> {
  const account = findLocalAccount(email);
  if (!account?.passwordHash) return null;
  return (await verifyPassword(password, account.passwordHash)) ? account : null;
}

/* ------------------------------------------------------------------------------------------ */
/* Sessions                                                                                    */
/* ------------------------------------------------------------------------------------------ */

const SESSION_TTL_DAYS = 30;
const SESSION_TTL_HOURS = 12;

function pruneExpiredSessions(storage: Storage): void {
  const now = Date.now();
  const accounts = readLocalAccounts();
  for (const account of accounts) {
    const stored = readJson<StoredSession | null>(storage, sessionKey(account.userId), null);
    if (stored && Date.parse(stored.expiresAt) <= now) {
      storage.removeItem(sessionKey(account.userId));
    }
  }
}

function writeSession(storage: Storage, userId: string, portalType: PortalType, rememberMe: boolean): StoredSession {
  const now = new Date();
  const ttlMs = rememberMe ? SESSION_TTL_DAYS * 24 * 60 * 60 * 1000 : SESSION_TTL_HOURS * 60 * 60 * 1000;
  const stored: StoredSession = {
    token: newId('local-session'),
    userId,
    portalType,
    rememberMe,
    loggedInAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
  };
  writeJson(storage, sessionKey(userId), stored);
  return stored;
}

function toAuthSession(account: LocalAccount, stored: StoredSession): AuthSession {
  return {
    version: 'v1',
    userId: account.userId,
    email: account.email,
    farmerName: account.farmerName,
    sellerName: account.sellerName,
    roles: account.roles,
    portalType: stored.portalType,
    isDemo: account.isDemo,
    rememberMe: stored.rememberMe,
    loggedInAt: stored.loggedInAt,
  };
}

export function createLocalSession(account: LocalAccount, portalType: PortalType, rememberMe: boolean): AuthSession {
  const storage = browserStorage();
  if (!storage) throw new Error('Browser storage is unavailable, so a standalone session cannot be created.');
  pruneExpiredSessions(storage);
  const stored = writeSession(storage, account.userId, portalType, rememberMe);
  return toAuthSession(account, stored);
}

export function readLocalSession(): { session: AuthSession; account: LocalAccount } | null {
  const storage = browserStorage();
  if (!storage) return null;
  pruneExpiredSessions(storage);
  for (const account of readLocalAccounts()) {
    const stored = readJson<StoredSession | null>(storage, sessionKey(account.userId), null);
    if (!stored) continue;
    if (Date.parse(stored.expiresAt) <= Date.now()) {
      storage.removeItem(sessionKey(account.userId));
      continue;
    }
    return { session: toAuthSession(account, stored), account };
  }
  return null;
}

/**
 * Switches the active portal for a local session. Authorization is enforced here as well as in the
 * API layer, so a caller can never move a session into a portal the account does not hold.
 */
export function updateLocalSessionPortal(userId: string, portalType: PortalType): AuthSession | null {
  const storage = browserStorage();
  if (!storage) return null;
  const account = findLocalAccountById(userId);
  const stored = readJson<StoredSession | null>(storage, sessionKey(userId), null);
  if (!account || !stored || !account.roles.includes(portalType)) return null;
  const next: StoredSession = { ...stored, portalType };
  writeJson(storage, sessionKey(userId), next);
  return toAuthSession(account, next);
}

export function clearLocalSession(userId?: string): void {
  const storage = browserStorage();
  if (!storage) return;
  if (userId) {
    storage.removeItem(sessionKey(userId));
    return;
  }
  for (const account of readLocalAccounts()) storage.removeItem(sessionKey(account.userId));
}

/* ------------------------------------------------------------------------------------------ */
/* Workspace                                                                                   */
/* ------------------------------------------------------------------------------------------ */

export function readLocalWorkspace(userId: string): WorkspaceSnapshotResponse {
  const storage = browserStorage();
  if (!storage) return { initialized: false, revision: 0, updatedAt: null, data: {} };
  const stored = readJson<StoredWorkspace | null>(storage, workspaceKey(userId), null);
  if (!stored || !stored.initialized) {
    return { initialized: false, revision: 0, updatedAt: null, data: {} };
  }
  return {
    initialized: true,
    revision: Number.isInteger(stored.revision) ? stored.revision : 0,
    updatedAt: stored.updatedAt,
    data: stored.data || {},
  };
}

export function writeLocalWorkspace(
  userId: string,
  data: Record<string, unknown>,
  expectedRevision?: number,
): { ok: true; workspace: WorkspaceSnapshotResponse } | { ok: false; code: 'WORKSPACE_CONFLICT' | 'WORKSPACE_TOO_LARGE' | 'STORAGE_UNAVAILABLE'; message: string } {
  const storage = browserStorage();
  if (!storage) {
    return { ok: false, code: 'STORAGE_UNAVAILABLE', message: 'Browser storage is unavailable, so workspace changes cannot be saved.' };
  }
  const current = readLocalWorkspace(userId);
  if (expectedRevision !== undefined && expectedRevision !== current.revision) {
    return {
      ok: false,
      code: 'WORKSPACE_CONFLICT',
      message: 'This workspace was changed somewhere else. Reload before saving again.',
    };
  }
  const sanitized = stripSensitive(data) as Record<string, unknown>;
  const serialized = JSON.stringify(sanitized);
  if (serialized.length > MAX_WORKSPACE_BYTES) {
    return { ok: false, code: 'WORKSPACE_TOO_LARGE', message: 'This workspace is too large to store in the browser.' };
  }
  const now = new Date().toISOString();
  const next: StoredWorkspace = {
    initialized: true,
    revision: current.revision + 1,
    updatedAt: now,
    data: sanitized,
  };
  if (!writeJson(storage, workspaceKey(userId), next)) {
    return { ok: false, code: 'WORKSPACE_TOO_LARGE', message: 'This browser is out of storage space for the workspace.' };
  }
  return {
    ok: true,
    workspace: { initialized: true, revision: next.revision, updatedAt: now, data: sanitized },
  };
}
