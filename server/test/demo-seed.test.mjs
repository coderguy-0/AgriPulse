import assert from 'node:assert/strict';
import { it } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase, seedDemoAccounts } from '../db.mjs';

it('demo setup is idempotent, durable and limited to the two public role-specific accounts', () => {
  const directory = mkdtempSync(join(tmpdir(), 'agripulse-demo-seed-'));
  let db;
  try {
    const filename = join(directory, 'demo.sqlite');
    db = openDatabase(filename);
    const marker = db.prepare('SELECT payload_json FROM workspace_snapshots WHERE user_id = ?').get('demo-farmer-user').payload_json;
    seedDemoAccounts(db);
    assert.equal(db.prepare("SELECT count(*) AS count FROM users WHERE is_demo = 1 AND email IN ('farmer.demo@agripulse.in', 'seller.demo@agripulse.in')").get().count, 2);
    assert.equal(db.prepare("SELECT count(*) AS count FROM users WHERE email = 'demo.workspace@demo.agripulse.invalid'").get().count, 0);
    assert.equal(db.prepare('SELECT count(*) AS count FROM farms WHERE owner_user_id = ?').get('demo-farmer-user').count, 2);
    assert.equal(db.prepare('SELECT payload_json FROM workspace_snapshots WHERE user_id = ?').get('demo-farmer-user').payload_json, marker);
    db.close();

    db = openDatabase(filename);
    assert.equal(db.prepare('SELECT count(*) AS count FROM users WHERE email IN (?, ?)').get('farmer.demo@agripulse.in', 'seller.demo@agripulse.in').count, 2);
    assert.equal(db.prepare('SELECT count(*) AS count FROM workspace_snapshots WHERE user_id IN (?, ?)').get('demo-farmer-user', 'demo-seller-user').count, 2);
  } finally {
    db?.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

it('demo seeding never adds sample records to an unrelated account with a reserved email', () => {
  const db = openDatabase(':memory:');
  const originalWarning = console.warn;
  try {
    db.prepare('UPDATE users SET is_demo = 0, password_hash = NULL WHERE id = ?').run('demo-farmer-user');
    const beforeFarms = db.prepare('SELECT count(*) AS count FROM farms WHERE owner_user_id = ?').get('demo-farmer-user').count;
    const beforeWorkspace = db.prepare('SELECT payload_json FROM workspace_snapshots WHERE user_id = ?').get('demo-farmer-user').payload_json;
    console.warn = () => {};
    seedDemoAccounts(db);

    const account = db.prepare('SELECT is_demo, password_hash FROM users WHERE id = ?').get('demo-farmer-user');
    assert.equal(account.is_demo, 0);
    assert.equal(account.password_hash, null);
    assert.equal(db.prepare('SELECT count(*) AS count FROM users WHERE email = ?').get('farmer.demo@agripulse.in').count, 1);
    assert.equal(db.prepare('SELECT count(*) AS count FROM farms WHERE owner_user_id = ?').get('demo-farmer-user').count, beforeFarms);
    assert.equal(db.prepare('SELECT payload_json FROM workspace_snapshots WHERE user_id = ?').get('demo-farmer-user').payload_json, beforeWorkspace);
  } finally {
    console.warn = originalWarning;
    db.close();
  }
});
