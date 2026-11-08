/**
 * Unit tests for the standalone (API-less) storage layer.
 *
 * These pin the guarantees that matter for a static deployment: accounts are never stored in
 * plaintext, credentials round-trip, workspaces version safely, and fields the hosted API refuses to
 * persist stay out of browser storage too.
 */
import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { hashPassword, verifyPassword } from '../src/services/credentialHash';
import {
  LOCAL_ACCOUNTS_KEY,
  clearLocalSession,
  createLocalAccount,
  createLocalSession,
  ensureDemoLocalAccounts,
  findLocalAccount,
  readLocalAccounts,
  readLocalSession,
  readLocalWorkspace,
  updateLocalSessionPortal,
  verifyLocalCredentials,
  writeLocalWorkspace,
} from '../src/services/localWorkspace';

class MemoryStorage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  key(index: number) { return Array.from(this.data.keys())[index] ?? null; }
  getItem(key: string) { return this.data.has(key) ? this.data.get(key)! : null; }
  setItem(key: string, value: string) { this.data.set(key, String(value)); }
  removeItem(key: string) { this.data.delete(key); }
  clear() { this.data.clear(); }
}

beforeEach(() => {
  const storage = new MemoryStorage();
  (globalThis as unknown as { window: { localStorage: MemoryStorage } }).window = { localStorage: storage };
});

describe('standalone credential hashing', () => {
  it('never stores the password itself', async () => {
    const encoded = await hashPassword('AgriPulseDemo!2026');
    assert.ok(!encoded.includes('AgriPulseDemo'));
    assert.ok(encoded.startsWith('pbkdf2$'));
  });

  it('accepts the right password and rejects the wrong one', async () => {
    const encoded = await hashPassword('correct horse battery staple');
    assert.equal(await verifyPassword('correct horse battery staple', encoded), true);
    assert.equal(await verifyPassword('correct horse battery stapl', encoded), false);
    assert.equal(await verifyPassword('', encoded), false);
  });

  it('treats malformed records as a failed verification', async () => {
    for (const bad of ['', 'plaintext', 'pbkdf2$notanumber$aa$bb', 'pbkdf2$1000$$']) {
      assert.equal(await verifyPassword('anything', bad), false);
    }
  });
});

describe('standalone accounts and sessions', () => {
  it('creates an account, stores only a digest and signs it in', async () => {
    const created = await createLocalAccount({
      email: 'New.Farmer@Example.test',
      password: 'standalone-password-1',
      portalType: 'farmer',
      farmerName: 'New Farmer',
    });
    assert.equal(created.ok, true);
    const raw = (globalThis as unknown as { window: { localStorage: MemoryStorage } }).window.localStorage.getItem(LOCAL_ACCOUNTS_KEY) || '';
    assert.ok(!raw.includes('standalone-password-1'), 'the plaintext password reached browser storage');

    const account = await verifyLocalCredentials('new.farmer@example.test', 'standalone-password-1');
    assert.ok(account);
    assert.deepEqual(account!.roles, ['farmer']);
    assert.equal(account!.isDemo, false);

    const session = createLocalSession(account!, 'farmer', true);
    assert.equal(session.email, 'new.farmer@example.test');
    assert.equal(readLocalSession()?.session.userId, account!.userId);
  });

  it('refuses a duplicate email', async () => {
    const input = { email: 'dup@example.test', password: 'standalone-password-1', portalType: 'farmer' as const };
    assert.equal((await createLocalAccount(input)).ok, true);
    const second = await createLocalAccount(input);
    assert.equal(second.ok, false);
    assert.equal(second.ok ? null : second.code, 'EMAIL_IN_USE');
  });

  it('seeds the demo accounts once and reuses them', async () => {
    const demos = [{ email: 'farmer.demo@agripulse.in', password: 'AgriPulseDemo!2026', roles: ['farmer' as const], farmerName: 'Demo' }];
    await ensureDemoLocalAccounts(demos);
    await ensureDemoLocalAccounts(demos);
    assert.equal(readLocalAccounts().filter((account) => account.email === 'farmer.demo@agripulse.in').length, 1);
    assert.equal(findLocalAccount('FARMER.DEMO@AGRIPULSE.IN')?.isDemo, true);
    assert.ok(await verifyLocalCredentials('farmer.demo@agripulse.in', 'AgriPulseDemo!2026'));
    assert.equal(await verifyLocalCredentials('farmer.demo@agripulse.in', 'wrong-password-here'), null);
  });

  it('switches portals only where the account is authorized, and logs out cleanly', async () => {
    await ensureDemoLocalAccounts([
      { email: 'seller.demo@agripulse.in', password: 'AgriPulseDemo!2026', roles: ['seller' as const] },
    ]);
    const account = await verifyLocalCredentials('seller.demo@agripulse.in', 'AgriPulseDemo!2026');
    createLocalSession(account!, 'seller', false);
    assert.equal(updateLocalSessionPortal(account!.userId, 'farmer'), null);

    assert.equal(readLocalSession()?.session.portalType, 'seller');
    clearLocalSession();
    assert.equal(readLocalSession(), null);
  });

  it('expires a session whose lifetime has passed', async () => {
    await ensureDemoLocalAccounts([{ email: 'farmer.demo@agripulse.in', password: 'AgriPulseDemo!2026', roles: ['farmer' as const] }]);
    const account = await verifyLocalCredentials('farmer.demo@agripulse.in', 'AgriPulseDemo!2026');
    createLocalSession(account!, 'farmer', true);
    const storage = (globalThis as unknown as { window: { localStorage: MemoryStorage } }).window.localStorage;
    const key = Array.from({ length: storage.length }, (_, index) => storage.key(index)!)
      .find((candidate) => candidate.includes('session:'));
    const stored = JSON.parse(storage.getItem(key!)!);
    storage.setItem(key!, JSON.stringify({ ...stored, expiresAt: new Date(Date.now() - 1_000).toISOString() }));
    assert.equal(readLocalSession(), null);
  });
});

describe('standalone workspace', () => {
  beforeEach(async () => {
    await ensureDemoLocalAccounts([{ email: 'farmer.demo@agripulse.in', password: 'AgriPulseDemo!2026', roles: ['farmer' as const] }]);
  });

  it('starts uninitialized and then versions every save', async () => {
    const account = findLocalAccount('farmer.demo@agripulse.in')!;
    assert.equal(readLocalWorkspace(account.userId).initialized, false);

    const first = writeLocalWorkspace(account.userId, { farms: [], profile: { name: 'A' } }, 0);
    assert.equal(first.ok, true);
    assert.equal(readLocalWorkspace(account.userId).revision, 1);

    const second = writeLocalWorkspace(account.userId, { farms: [], profile: { name: 'B' } }, 1);
    assert.equal(second.ok, true);
    assert.equal(readLocalWorkspace(account.userId).revision, 2);
    assert.deepEqual((readLocalWorkspace(account.userId).data.profile as { name: string }).name, 'B');
  });

  it('rejects a stale revision instead of overwriting newer work', async () => {
    const account = findLocalAccount('farmer.demo@agripulse.in')!;
    writeLocalWorkspace(account.userId, { farms: [] }, 0);
    const stale = writeLocalWorkspace(account.userId, { farms: [{ id: 'old' }] }, 0);
    assert.equal(stale.ok, false);
    assert.equal(stale.ok ? null : stale.code, 'WORKSPACE_CONFLICT');
    assert.equal(readLocalWorkspace(account.userId).revision, 1);
  });

  it('strips bank and secret fields the hosted API also refuses to store', async () => {
    const account = findLocalAccount('farmer.demo@agripulse.in')!;
    writeLocalWorkspace(account.userId, {
      sellerProfile: { businessName: 'Demo', bankAccountNumber: '123456789', ifscCode: 'DEMO0001', apiKey: 'secret' },
      farms: [{ id: 'farm-1', notes: 'keep' }],
    }, 0);
    const stored = JSON.stringify(readLocalWorkspace(account.userId).data);
    for (const forbidden of ['bankAccountNumber', 'ifscCode', 'apiKey', '123456789', 'DEMO0001']) {
      assert.ok(!stored.includes(forbidden), `${forbidden} was persisted to browser storage`);
    }
    assert.ok(stored.includes('farm-1'));
  });

  it('keeps workspaces isolated per account', async () => {
    const other = await createLocalAccount({ email: 'other@example.test', password: 'another-password-1', portalType: 'farmer' });
    const account = findLocalAccount('farmer.demo@agripulse.in')!;
    writeLocalWorkspace(account.userId, { farms: [{ id: 'mine' }] }, 0);
    assert.equal(readLocalWorkspace(other.ok ? other.account.userId : '').initialized, false);
  });
});
