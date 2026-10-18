import assert from 'node:assert/strict';
import { it } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../db.mjs';

it('applies the additive migration once and retains existing records after reopening', () => {
  const directory = mkdtempSync(join(tmpdir(), 'agripulse-migrations-'));
  let db;
  try {
    const filename = join(directory, 'test.sqlite');
    db = openDatabase(filename);
    db.prepare('INSERT INTO users(id, email, roles_json, created_at) VALUES (?, ?, ?, ?)').run('existing-user', 'migration@example.test', '["farmer"]', new Date().toISOString());
    assert.equal(db.prepare('SELECT count(*) AS count FROM schema_migrations WHERE version = 2').get().count, 1);
    assert.ok(db.prepare('PRAGMA table_info(telemetry_readings)').all().some((column) => column.name === 'measurement_kind'));
    db.close();
    db = openDatabase(filename);
    assert.equal(db.prepare('SELECT id FROM users WHERE id = ?').get('existing-user').id, 'existing-user');
    assert.equal(db.prepare('SELECT count(*) AS count FROM schema_migrations WHERE version = 2').get().count, 1);
  } finally {
    db?.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
