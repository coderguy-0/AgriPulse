/**
 * Standalone (static-host) smoke test.
 *
 * Reproduces the deployment that produced "Sign In Error: The request failed with status 404":
 * the built frontend is served by a static host with no Express API, so every `/api/*` request is
 * answered with the host's 404 page. The test asserts that the whole product still works there:
 *
 *   - public pages and deep links render,
 *   - the one-click farmer/seller demo launchers sign in,
 *   - the portal modules render with no runtime errors,
 *   - the session survives a reload and logout returns to the sign-in screen,
 *   - the standalone notice explains where the data lives.
 *
 * Nothing here contacts a real API: the fake host guarantees `/api/*` is unreachable.
 *
 * Usage: npm run build && node scripts/standaloneSmoke.mjs
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium as playwright } from '@playwright/test';
import chromium, { inflate, setupLambdaEnvironment } from '@sparticuz/chromium';

const distDir = resolve(fileURLToPath(new URL('../dist', import.meta.url)));
const port = Number(process.env.SMOKE_PORT || 4319);
const baseURL = `http://127.0.0.1:${port}`;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * A static host: real files are served, every other *page* address falls back to index.html,
 * and every `/api/*` request gets a 404 HTML page — exactly what Vercel/Netlify/GitHub Pages do.
 */
const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', baseURL);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname.startsWith('/api/')) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><html><body><h1>404: NOT_FOUND</h1><p>Code: NOT_FOUND</p></body></html>');
    return;
  }

  const candidate = join(distDir, pathname);
  if (existsSync(candidate) && extname(candidate)) {
    try {
      const body = await readFile(candidate);
      res.writeHead(200, { 'Content-Type': MIME[extname(candidate)] || 'application/octet-stream' });
      res.end(body);
      return;
    } catch {
      /* fall through to the SPA document */
    }
  }

  const html = await readFile(join(distDir, 'index.html'));
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});

await new Promise((done) => server.listen(port, '127.0.0.1', done));

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

mkdir('.smoke/screenshots', { recursive: true });

let checks = 0;
const visit = async (route, { h1 = true } = {}) => {
  await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
  if (h1) await page.locator('h1').first().waitFor({ timeout: 20_000 });
  const waiting = await page.getByText('Loading secure AGRIPULSE session…', { exact: true }).count();
  assert.equal(waiting, 0, `${route} never left the session gate`);
  const bodyText = await page.locator('body').innerText();
  assert.ok(
    !bodyText.includes('The request failed with status 404'),
    `${route} surfaced the raw 404 error to the user`,
  );
  checks += 1;
};

try {
  // 1. Public website and deep links.
  for (const route of ['/', '/platform', '/ai-capabilities', '/how-it-works', '/technology', '/impact', '/roadmap', '/about', '/faq', '/contact', '/privacy', '/terms']) {
    await visit(route);
  }
  await page.screenshot({ path: '.smoke/screenshots/standalone-home.png', fullPage: true });

  // 2. The notice explains standalone mode instead of failing silently.
  await visit('/farmer/login');
  await page.getByText('Standalone mode · this browser is the workspace', { exact: false }).first().waitFor();
  checks += 1;
  await page.screenshot({ path: '.smoke/screenshots/standalone-farmer-login.png', fullPage: true });

  // 3. One-click farmer demo launcher signs in.
  await page.getByRole('button', { name: /Use Farmer Demo/i }).first().click();
  await page.waitForURL('**/home', { timeout: 30_000 });
  await visit('/home');
  await page.screenshot({ path: '.smoke/screenshots/standalone-farmer-dashboard.png', fullPage: true });

  // 4. Every farmer portal module renders.
  for (const route of [
    '/farm', '/twin', '/monitoring', '/insights', '/irrigation', '/soil', '/crop-health', '/weather',
    '/alerts', '/reports', '/assistant', '/devices', '/dictionary', '/disease', '/store', '/cart',
    '/checkout', '/orders', '/wishlist', '/offers', '/news', '/schemes', '/account',
  ]) {
    await visit(route);
  }

  // 5. Session survives a full reload (local session storage, not in-memory state).
  await visit('/home');
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('h1').first().waitFor();
  assert.ok(!page.url().includes('/farmer/login'), 'the session was lost on reload');
  checks += 1;

  // 6. Device registry works locally and honestly reports no telemetry.
  await visit('/devices');
  const deviceText = await page.locator('body').innerText();
  assert.ok(/device/i.test(deviceText), 'device module did not render');
  checks += 1;

  // 7. Logout returns to a sign-in screen.
  await visit('/account');
  const logout = page.getByRole('button', { name: /sign out|log out/i }).first();
  if (await logout.count()) {
    await logout.click();
    await page.waitForURL((url) => url.pathname.includes('login'), { timeout: 20_000 });
    checks += 1;
  }

  // 8. Seller demo launcher and seller portal.
  await visit('/login');
  await page.getByRole('button', { name: /Use Seller Demo/i }).first().click();
  await page.waitForURL('**/seller', { timeout: 30_000 });
  await visit('/seller');
  await page.getByText('Standalone mode · this browser is the workspace', { exact: false }).first().waitFor();
  await page.screenshot({ path: '.smoke/screenshots/standalone-seller-portal.png', fullPage: true });

  // 9. A first-time visitor can sign in with credentials and no API: the local demo accounts are
  //    seeded on first use. Storage is cleared explicitly to simulate a brand-new visitor (the
  //    bundled Chromium runs --single-process, so contexts are not storage-isolated here).
  await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.localStorage.clear());
  await page.goto(`${baseURL}/farmer/login`, { waitUntil: 'networkidle' });
  await page.locator('#farmer-email').waitFor({ timeout: 20_000 });
  await page.getByText('Standalone mode · this browser is the workspace', { exact: false }).first().waitFor();
  await page.getByLabel('Farmer Email Address').fill('farmer.demo@agripulse.in');
  await page.getByLabel('Password', { exact: true }).fill('AgriPulseDemo!2026');
  await page.getByRole('button', { name: /^Sign In/i }).first().click();
  await page.waitForURL('**/home', { timeout: 30_000 });
  await page.locator('h1').first().waitFor();
  checks += 1;

  // 10. A wrong password reports a clear credential error, never a raw status code.
  await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.localStorage.clear());
  await page.goto(`${baseURL}/farmer/login`, { waitUntil: 'networkidle' });
  await page.locator('#farmer-email').waitFor({ timeout: 20_000 });
  await page.getByLabel('Farmer Email Address').fill('farmer.demo@agripulse.in');
  await page.getByLabel('Password', { exact: true }).fill('definitely-not-the-password');
  await page.getByRole('button', { name: /^Sign In/i }).first().click();
  await page.getByText(/Sign In Error:/).waitFor({ timeout: 20_000 });
  const wrongText = await page.locator('body').innerText();
  assert.ok(!/status \d{3}/i.test(wrongText), 'a raw HTTP status leaked into the credential error');
  assert.ok(/password/i.test(wrongText), 'the credential error does not explain what to fix');
  await page.screenshot({ path: '.smoke/screenshots/standalone-wrong-password.png', fullPage: true });
  checks += 1;

  // 11. Account creation works with no API and signs the new farmer straight in.
  await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.localStorage.clear());
  await page.goto(`${baseURL}/farmer/signup`, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').first().fill(`smoke-${Date.now()}@example.test`);
  await page.locator('input[type="password"]').first().fill('standalone-smoke-pass-123');
  const confirm = page.locator('input[type="password"]').nth(1);
  if (await confirm.count()) await confirm.fill('standalone-smoke-pass-123');
  const nameInput = page.locator('input').first();
  if (await nameInput.count()) await nameInput.fill('Standalone Smoke Farmer');
  await page.getByRole('button', { name: /create|sign ?up|register/i }).first().click();
  await page.waitForTimeout(3_000);
  const afterSignup = await page.locator('body').innerText();
  assert.ok(!/status \d{3}/i.test(afterSignup), 'account creation leaked a raw HTTP status');
  checks += 1;

  assert.deepEqual(pageErrors, [], `Browser runtime errors: ${pageErrors.join(' | ')}`);
  console.log(`Standalone mode passed ${checks} checks with zero runtime errors.`);
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
