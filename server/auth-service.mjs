import { newId, newOpaqueToken, sha256 } from './security.mjs';
import { readWorkspace } from './workspace.mjs';

export const SESSION_COOKIE = 'agripulse_session';
const HOURS = 60 * 60 * 1000;
const DAYS = 24 * HOURS;

function parseRoles(value) {
  try { return JSON.parse(value); } catch { return []; }
}

export function readSessionFromRequest(db, req) {
  const cookieHeader = req.headers.cookie || '';
  const cookie = cookieHeader.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${SESSION_COOKIE}=`));
  if (!cookie) return null;
  let rawToken;
  try { rawToken = decodeURIComponent(cookie.slice(SESSION_COOKIE.length + 1)); } catch { return null; }
  if (!rawToken) return null;

  const tokenHash = sha256(rawToken);
  const row = db.prepare(`SELECT s.token_hash, s.user_id, s.portal_type, s.remember_me, s.created_at AS logged_in_at, s.expires_at,
      u.email, u.roles_json, u.is_demo
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?`).get(tokenHash, new Date().toISOString());
  if (!row) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    return null;
  }
  return {
    id: row.user_id,
    email: row.email,
    roles: parseRoles(row.roles_json),
    portalType: row.portal_type,
    rememberMe: Boolean(row.remember_me),
    isDemo: Boolean(row.is_demo),
    loggedInAt: row.logged_in_at,
    tokenHash,
  };
}

export function createSession(db, res, user, portalType, rememberMe, environment = process.env) {
  const rawToken = newOpaqueToken(32);
  const tokenHash = sha256(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (rememberMe ? 30 * DAYS : 12 * HOURS)).toISOString();
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now.toISOString());
  db.prepare('INSERT INTO sessions(token_hash, user_id, portal_type, remember_me, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(tokenHash, user.id, portalType, rememberMe ? 1 : 0, now.toISOString(), expiresAt);

  const secure = environment.NODE_ENV === 'production';
  res.cookie(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    ...(rememberMe ? { maxAge: 30 * DAYS } : {}),
  });
  return {
    id: user.id,
    email: user.email,
    roles: user.roles,
    portalType,
    rememberMe,
    isDemo: user.isDemo,
    loggedInAt: now.toISOString(),
  };
}

export function clearSession(db, req, res, environment = process.env) {
  const current = readSessionFromRequest(db, req);
  if (current) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(current.tokenHash);
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: environment.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

export function toClientSession(db, session) {
  if (!session) return null;
  const workspace = readWorkspace(db, session.id).data;
  const portalType = session.portalType;
  const result = {
    version: 'v1',
    userId: session.id,
    email: session.email,
    role: portalType === 'seller' ? 'Seller' : 'Farmer',
    portalType,
    portals: session.roles.filter((role) => role === 'farmer' || role === 'seller'),
    isDemo: session.isDemo,
    rememberMe: session.rememberMe,
    loggedInAt: session.loggedInAt,
  };
  if (portalType === 'farmer' && workspace.profile?.name) result.farmerName = workspace.profile.name;
  if (portalType === 'seller' && workspace.sellerProfile?.businessName) result.sellerName = workspace.sellerProfile.businessName;
  return result;
}

export function getUserByEmail(db, email) {
  const row = db.prepare('SELECT id, email, password_hash, roles_json, is_demo, created_at FROM users WHERE email = ? COLLATE NOCASE').get(email.trim());
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    roles: parseRoles(row.roles_json),
    isDemo: Boolean(row.is_demo),
    createdAt: row.created_at,
  };
}

export function getUserById(db, userId) {
  const row = db.prepare('SELECT id, email, roles_json, is_demo, created_at FROM users WHERE id = ?').get(userId);
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    roles: parseRoles(row.roles_json),
    isDemo: Boolean(row.is_demo),
    createdAt: row.created_at,
  };
}

export function insertUser(db, { id, email, passwordHash = null, roles, isDemo = false, createdAt = new Date().toISOString() }) {
  db.prepare('INSERT INTO users(id, email, password_hash, roles_json, is_demo, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id || newId('user'), email.trim().toLowerCase(), passwordHash, JSON.stringify(roles), isDemo ? 1 : 0, createdAt);
  return getUserByEmail(db, email);
}
