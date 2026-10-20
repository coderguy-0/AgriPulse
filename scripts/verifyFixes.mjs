/**
 * Targeted verification for the bug fixes found in the audit.
 * Run against a dev server with ALLOW_DEMO_SESSIONS=true.
 *
 * Checks (the bundled Chromium is a single-process build, so every scenario
 * launches and closes its own browser — contexts cannot be reused):
 *  1. Freshly registered seller sees "My Store Products (0)", not the whole catalog.
 *  2. Demo seller still sees the 6 Karnal sample listings (regression check).
 *  3. Dashboard "Add Task" defaults the scheduled date to today.
 *  4. Farm "Add Crop Record" defaults the sowing date to today.
 *  5. Irrigation "3-day logged rain" chip renders from the 72 h window.
 */
import { createRequire } from 'node:module';
import sparticuzChromium, { inflate, setupLambdaEnvironment } from '@sparticuz/chromium';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const todayLocal = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

const launchArgs = sparticuzChromium.args.filter((arg) => !['--disable-web-security', '--allow-running-insecure-content'].includes(arg));

// Uses the bundled Linux Chromium from npm; no browser download host is required.
const libraries = await inflate(fileURLToPath(new URL('../node_modules/@sparticuz/chromium/bin/al2023.tar.br', import.meta.url)));
setupLambdaEnvironment(join(libraries, 'lib'));

/** Runs one scenario in a fresh browser, exactly like the official smoke script. */
async function withBrowser(scenario) {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || await sparticuzChromium.executablePath(), args: launchArgs, headless: true });
  try {
    return await scenario(browser);
  } finally {
    await browser.close();
  }
}

try {
  // --- 1. Fresh seller account: "My Store Products" must start at 0 ---
  await withBrowser(async (browser) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const email = `verify-seller-${Date.now()}@example.in`;
    const register = await context.request.post(`${BASE}/api/auth/register`, {
      data: {
        portalType: 'seller',
        email,
        password: 'VerifyFixes!2026',
        businessName: 'Verification Farms Supply',
        contactPerson: 'Test Seller',
        category: 'Seeds and planting material',
        tradeName: 'Verification Supply',
        city: 'Karnal',
      },
    });
    if (register.status() !== 201) {
      check('seller registration', false, `HTTP ${register.status()}`);
    } else {
      await page.goto(`${BASE}/seller`, { waitUntil: 'networkidle' });
      await page.getByText('Verification Farms Supply').first().waitFor({ timeout: 15000 });
      await page.getByRole('button', { name: /Catalog & Inventory/ }).first().click();
      await page.waitForTimeout(600);
      const mineTab = await page.getByRole('button', { name: /My Store Products \((\d+)\)/ }).first().textContent();
      const count = Number(mineTab.match(/\((\d+)\)/)?.[1] ?? -1);
      check('fresh seller "My Store Products" count is 0', count === 0, `got ${count}`);

      const allTab = await page.getByRole('button', { name: /All Marketplace \((\d+)\)/ }).first().textContent();
      const allCount = Number(allTab.match(/\((\d+)\)/)?.[1] ?? -1);
      check('fresh seller "All Marketplace" still lists the catalog', allCount > 0, `got ${allCount}`);
    }
    await context.close();
  });

  // --- 2. Demo seller still sees the Karnal sample listings (regression check) ---
  await withBrowser(async (browser) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const session = await context.request.post(`${BASE}/api/dev/demo-session`, { data: { portalType: 'seller' } });
    if (session.status() !== 200) {
      check('demo seller session', false, `HTTP ${session.status()}`);
    } else {
      await page.goto(`${BASE}/seller`, { waitUntil: 'networkidle' });
      await page.getByText('Sample Agro Cooperative').first().waitFor({ timeout: 15000 });
      await page.getByRole('button', { name: /Catalog & Inventory/ }).first().click();
      await page.waitForTimeout(600);
      const mineTab = await page.getByRole('button', { name: /My Store Products \((\d+)\)/ }).first().textContent();
      const count = Number(mineTab.match(/\((\d+)\)/)?.[1] ?? -1);
      check('demo seller "My Store Products" keeps sample listings', count === 6, `got ${count}`);
    }
    await context.close();
  });

  // --- 3, 4, 5. Farmer demo workspace ---
  await withBrowser(async (browser) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on('pageerror', (error) => console.log('PAGE ERROR:', error.message));
    const session = await context.request.post(`${BASE}/api/dev/demo-session`, { data: { portalType: 'farmer' } });
    if (session.status() !== 200) {
      check('farmer demo session', false, `HTTP ${session.status()}`);
    } else {
      // Dashboard "Add Task" date defaults to today.
      await page.goto(`${BASE}/home`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: /Farm dashboard/i }).first().waitFor({ timeout: 15000 });
      await page.getByRole('button', { name: /Add Task/ }).first().click();
      await page.waitForTimeout(300);
      const dateValue = await page.locator('input[type="date"]').first().inputValue();
      check('new activity scheduled date defaults to today', dateValue === todayLocal(), `got ${dateValue}, expected ${todayLocal()}`);
      await page.getByRole('button', { name: /Cancel/ }).first().click();

      // Farm page crop record: sowing date defaults to today.
      await page.goto(`${BASE}/farm`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /Crop Records/i }).first().click();
      await page.waitForTimeout(400);
      await page.getByRole('button', { name: /Add Crop Record/ }).first().click();
      await page.waitForTimeout(300);
      const sowingValue = await page.locator('input[type="date"]').first().inputValue();
      check('new crop sowing date defaults to today', sowingValue === todayLocal(), `got ${sowingValue}, expected ${todayLocal()}`);

      // Irrigation chip renders a value from the 72 h window.
      await page.goto(`${BASE}/irrigation`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: /Irrigation guidance/i }).first().waitFor({ timeout: 15000 });
      const chip = page.locator('.ap-chip', { hasText: /3-day logged rain/ }).first();
      const chipText = await chip.textContent();
      const mm = chipText.match(/([\d.]+) mm/);
      check('irrigation 3-day logged rain chip renders a value', Boolean(mm), chipText.trim());
    }
    await context.close();
  });
} catch (error) {
  console.error('VERIFICATION CRASHED:', error);
  process.exitCode = 1;
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} fix verifications passed`);
if (failed.length > 0) process.exitCode = 1;
