// Deep smoke: capture console errors + warnings + failed network requests on every route.
// Single page reused throughout (the bundled Chromium is single-process; extra contexts OOM it).
import assert from 'node:assert/strict';
import { chromium as playwright } from '@playwright/test';
import chromium, { inflate, setupLambdaEnvironment } from '@sparticuz/chromium';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const libraries = await inflate(fileURLToPath(new URL('../node_modules/@sparticuz/chromium/bin/al2023.tar.br', import.meta.url)));
setupLambdaEnvironment(join(libraries, 'lib'));
const browser = await playwright.launch({ executablePath: process.env.CHROMIUM_PATH || await chromium.executablePath(), args: chromium.args.filter((arg) => !['--disable-web-security', '--allow-running-insecure-content'].includes(arg)), headless: true });

const findings = [];
const VITE_NOISE = /\[vite\]|React DevTools|Download the React DevTools/;
const page = await browser.newPage();
const consoleIssues = [];
const failedRequests = [];
page.on('console', (msg) => {
  if (msg.type() === 'error' && !VITE_NOISE.test(msg.text())) consoleIssues.push('console.error: ' + msg.text());
  if (msg.type() === 'warning' && !VITE_NOISE.test(msg.text())) consoleIssues.push('console.warn: ' + msg.text());
});
page.on('pageerror', (error) => consoleIssues.push('pageerror: ' + error.message));
page.on('requestfailed', (req) => failedRequests.push(req.url() + ' :: ' + (req.failure()?.errorText || 'unknown')));
page.on('response', (res) => {
  if (res.status() >= 400 && !res.url().includes('/api/weather')) failedRequests.push(res.url() + ' :: HTTP ' + res.status());
});

async function probe(route, width) {
  consoleIssues.length = 0;
  failedRequests.length = 0;
  try {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.locator('h1').first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(400);
    const bodyText = await page.evaluate(() => document.body?.innerText || '');
    if (/could not load|something went wrong|application error/i.test(bodyText)) {
      findings.push({ kind: 'UI-TEXT', route, message: 'possible error copy visible' });
    }
  } catch (error) {
    findings.push({ kind: 'NAV', route, message: 'navigation failed: ' + String(error.message).split('\n')[0] });
  }
  for (const e of consoleIssues) findings.push({ kind: 'CONSOLE', route, message: e });
  for (const r of failedRequests) findings.push({ kind: 'NETWORK', route, message: r });
}

try {
  const anonRoutes = ['/', '/privacy', '/terms', '/login', '/signup', '/seller/signup', '/seller/login'];
  const farmerRoutes = ['/home', '/farm', '/devices', '/monitoring', '/weather', '/dictionary', '/assistant', '/account', '/twin', '/insights', '/irrigation', '/soil', '/crop-health', '/alerts', '/reports', '/disease', '/store', '/cart', '/orders', '/wishlist', '/offers', '/news', '/schemes'];

  for (const width of [390, 1366]) {
    for (const route of anonRoutes) await probe(route, width);
  }

  const registered = await page.request.post(`${baseURL}/api/auth/register`, { data: { portalType: 'farmer', name: 'Deep Test Farmer', email: `deep-${Date.now()}@example.test`, password: 'deep-test-password-123', state: 'Haryana', district: 'Karnal', landArea: 2 } });
  assert.equal(registered.status(), 201, await registered.text());
  for (const route of farmerRoutes) {
    await probe(route, 1366);
    await probe(route, 390);
  }
  await page.request.post(`${baseURL}/api/auth/logout`);

  const seller = await page.request.post(`${baseURL}/api/auth/register`, { data: { portalType: 'seller', businessName: 'Deep Test Seller', contactPerson: 'Test Seller', category: 'Seeds', email: `deep-seller-${Date.now()}@example.test`, password: 'deep-test-password-456' } });
  assert.equal(seller.status(), 201, await seller.text());
  await probe('/seller', 1366);
  await probe('/seller', 390);

  const seen = new Set();
  const unique = findings.filter((f) => {
    const key = `${f.kind}|${f.route}|${f.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (unique.length) {
    console.log(`FINDINGS (${unique.length}):`);
    for (const f of unique) console.log(` [${f.kind}] ${f.route} :: ${f.message}`);
    process.exitCode = 1;
  } else {
    console.log('Deep smoke: zero console/network errors across all probed routes.');
  }
} finally { await browser.close(); }
