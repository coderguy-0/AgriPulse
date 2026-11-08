import { openDatabase } from './db.mjs';

// Startup runs the same idempotent migrations and demo seed. This command provides an
// explicit, executable setup step for deployment runbooks and diagnostics.
const db = openDatabase();
try {
  const accounts = db.prepare(`SELECT email, roles_json, is_demo
    FROM users WHERE email IN (?, ?) ORDER BY email`)
    .all('farmer.demo@agripulse.in', 'seller.demo@agripulse.in');
  const initialized = db.prepare(`SELECT count(*) AS count FROM workspace_snapshots
    WHERE user_id IN (SELECT id FROM users WHERE email IN (?, ?))`)
    .get('farmer.demo@agripulse.in', 'seller.demo@agripulse.in').count;

  if (accounts.length !== 2 || accounts.some((account) => !account.is_demo) || initialized !== 2) {
    throw new Error('Demo setup is incomplete. Check logs for reserved-email conflicts; no existing account was overwritten.');
  }

  console.info(JSON.stringify({
    operation: 'database.setup',
    status: 'ok',
    driver: db.driverName,
    migrations: db.prepare('SELECT count(*) AS count FROM schema_migrations').get().count,
    demoAccounts: accounts.map((account) => ({ email: account.email, roles: JSON.parse(account.roles_json) })),
    demoWorkspaces: initialized,
  }));
} finally {
  db.close();
}
