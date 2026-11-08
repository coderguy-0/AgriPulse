/**
 * Hosted (API-backed) smoke test.
 *
 * The counterpart to `standaloneSmoke.mjs`: it starts the real production server (`server.mjs` with
 * `NODE_ENV=production`, serving `dist/` and the SQLite-backed API) and asserts the product still
 * authenticates against the API — i.e. the standalone fallback never takes over when an API is
 * present. Also proves static-host symptoms cannot reappear: `/api/*` answers JSON, and the
 * "Standalone mode" notice is absent.
 *
 * Usage: npm run build && node scripts/serverModeSmoke.mjs
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium as playwright } from '@playwright/test';
import chromium, { inflate, setupLambdaEnvironment } from '@sparticuz/chromium';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.SMOKE_PORT || 4321);
const baseURL = `http://127.0.0.1:${port}`;
const dbPath = join(root, '.smoke', 'serverMode.sqlite');

await rm(dbPath, { force: true });
mkdir('.smoke/screenshots', { recursive: true });

const server = spawn(process.execPath, ['server.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    HOST: '0.0.0.0',
    ALLOW_DEMO_SESSIONS: 'true',
    AGRIPULSE_DB_PATH: dbPath,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const serverLog = [];
server.stdout.on('data', (chunk) => serverLog.push(chunk.toString()));
server.stderr.on('data', (chunk) => serverLog.push(chunk.toString()));

const waitForHealth = async () => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${baseURL}/api/health`);
      if (response.ok && (response.headers.get('content-type') || '').includes('application/json')) return;
    } catch {
      /* not listening yet */
    }
    await new Promise((done) => setTimeout(done, 250));
  }
  throw new Error(`The production server did not become healthy:\n${serverLog.join('')}`);
};

await waitForHealth();

const libraries = await inflate(fileURLToPath(new URL('../node_modules/@sparticuz/chromium/bin/al2023.tar.br', import.meta.url)));
setupLambdaEnvironment(join(libraries, 'lib'));
const browser = await playwright.launch({
  executablePath: process.env.CHROMIUM_PATH || await chromium.executablePath(),
  args: chromium.args.filter((arg) => !['--disable-web-security', '--allow-running-insecure-content'].includes(arg)),
  headless: true,
});

const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));

let checks = 0;

try {
  // The API must answer JSON, never an HTML fallback page.
  const sessionResponse = await page.request.get(`${baseURL}/api/auth/session`);
  assert.equal(sessionResponse.status(), 200);
  assert.ok((sessionResponse.headers()['content-type'] || '').includes('application/json'));

  // No API route may be answered by the SPA document.
  for (const route of ['/api/auth/login', '/api/workspace', '/api/devices', '/api/weather']) {
    const response = await page.request.get(`${baseURL}${route}`);
    const contentType = response.headers()['content-type'] || '';
    assert.ok(contentType.includes('application/json'), `${route} returned ${contentType || 'no content type'}`);
  }
  checks += 1;

  // Sign in through the real API and confirm the app does NOT report standalone mode.
  const registered = await page.request.post(`${baseURL}/api/auth/register`, {
    data: {
      portalType: 'farmer',
      name: 'Server Mode Farmer',
      email: `server-mode-${Date.now()}@example.test`,
      password: 'server-mode-password-123',
      state: 'Haryana',
      district: 'Karnal',
      landArea: 3,
    },
  });
  assert.equal(registered.status(), 201, await registered.text());

  await page.goto(`${baseURL}/home`, { waitUntil: 'networkidle' });
  await page.locator('h1').first().waitFor({ timeout: 30_000 });
  const body = await page.locator('body').innerText();
  assert.ok(!body.includes('Standalone mode'), 'the standalone notice appeared even though the API is reachable');
  assert.ok(!body.includes('The request failed with status 404'), 'a raw 404 leaked into the UI');
  checks += 1;

  // Demo launchers are served by the API in this deployment.
  await page.request.post(`${baseURL}/api/auth/logout`);
  const demo = await page.request.post(`${baseURL}/api/auth/demo-session`, { data: { portalType: 'farmer' } });
  assert.equal(demo.status(), 200, await demo.text());
  checks += 1;

  // Deep links are served by the SPA and keep working after a hard reload.
  for (const route of ['/farmer/login', '/login', '/platform', '/devices']) {
    const response = await page.request.get(`${baseURL}${route}`);
    assert.equal(response.status(), 200, `${route} did not return the SPA document`);
  }
  checks += 1;

  assert.deepEqual(pageErrors, [], `Browser runtime errors: ${pageErrors.join(' | ')}`);
  console.log(`Hosted (API) mode passed ${checks} checks with zero runtime errors.`);
} finally {
  await browser.close();
  server.kill('SIGTERM');
  await new Promise((done) => server.once('exit', done));
}
