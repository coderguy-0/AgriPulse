import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium as playwright } from '@playwright/test';
import chromium, { inflate, setupLambdaEnvironment } from '@sparticuz/chromium';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// Uses the bundled Linux Chromium from npm; no browser download host is required.
// Run against a local DEVELOPMENT API with demo access enabled; creates a dedicated test account.
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const libraries = await inflate(fileURLToPath(new URL('../node_modules/@sparticuz/chromium/bin/al2023.tar.br', import.meta.url)));
setupLambdaEnvironment(join(libraries, 'lib'));
const browser = await playwright.launch({ executablePath: process.env.CHROMIUM_PATH || await chromium.executablePath(), args: chromium.args.filter((arg) => !['--disable-web-security', '--allow-running-insecure-content'].includes(arg)), headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
mkdirSync('.smoke/screenshots', { recursive: true });
let checks = 0;
async function checkRoute(route, width) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
  await page.locator('h1').first().waitFor();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert.equal(overflow, false, `${route} overflows at ${width}px`);
  assert.equal(await page.getByText('Loading secure AGRIPULSE session…', { exact: true }).count(), 0);
  checks++;
}
try {
  for (const width of [360, 390, 768, 1024, 1366, 1920]) {
    await checkRoute('/', width);
    assert.ok(await page.locator('.harvest-hero-image').evaluate((img) => img.complete && img.naturalWidth > 0));
    await page.screenshot({ path: `.smoke/screenshots/home-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  assert.equal(await page.locator('#site-mobile-nav').isVisible(), true);
  await page.getByRole('button', { name: 'Close menu', exact: true }).click();
  await checkRoute('/privacy', 390);
  await checkRoute('/terms', 1366);

  // Authenticate through the actual API; browser carries its HTTP-only session cookie.
  const registered = await page.request.post(`${baseURL}/api/auth/register`, { data: { portalType: 'farmer', name: 'Browser Test Farmer', email: `browser-${Date.now()}@example.test`, password: 'browser-test-password-123', state: 'Haryana', district: 'Karnal', landArea: 2 } });
  assert.equal(registered.status(), 201, await registered.text());
  for (const width of [390, 1366]) {
    for (const route of ['/home', '/farm', '/devices', '/monitoring', '/weather', '/dictionary', '/assistant', '/account', '/twin', '/insights', '/irrigation', '/soil', '/crop-health', '/alerts', '/reports', '/disease', '/store', '/cart', '/orders', '/wishlist', '/offers', '/news', '/schemes']) await checkRoute(route, width);
  }
  await checkRoute('/weather', 390);
  await page.getByRole('button', { name: 'Load forecast', exact: true }).click();
  await page.getByText('Weather could not be updated', { exact: true }).waitFor();
  assert.equal(await page.getByText('No current weather available', { exact: true }).isVisible(), true);
  await page.screenshot({ path: '.smoke/screenshots/weather-unavailable.png', fullPage: true });
  await page.request.post(`${baseURL}/api/auth/logout`);
  const seller = await page.request.post(`${baseURL}/api/auth/register`, { data: { portalType: 'seller', businessName: 'Browser Test Seller', contactPerson: 'Test Seller', category: 'Seeds', email: `seller-browser-${Date.now()}@example.test`, password: 'browser-test-password-456' } });
  assert.equal(seller.status(), 201, await seller.text());
  for (const width of [360, 390, 768, 1024, 1366, 1920]) await checkRoute('/seller', width);
  await page.screenshot({ path: '.smoke/screenshots/seller-desktop.png', fullPage: true });
  assert.deepEqual(errors, [], `Browser runtime errors: ${errors.join(', ')}`);
  console.log(`Passed ${checks} responsive route checks, image loading, mobile menu, real account sessions, weather failure state and zero page errors.`);
} finally { await browser.close(); }
