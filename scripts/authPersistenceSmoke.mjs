import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium as playwright } from '@playwright/test';
import chromium, { inflate, setupLambdaEnvironment } from '@sparticuz/chromium';

// Production-like, same-origin browser verification. Start the unified server first.
// Uses a unique record prefix; run against a disposable test database when possible.
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const productName = `Browser Seller Listing ${runId}`;
const editedProductName = `${productName} Edited`;
const farmName = `Browser Persistence Farm ${runId}`;
const interruptedFarmName = `Unsaved Session Farm ${runId}`;
const libraries = await inflate(fileURLToPath(new URL('../node_modules/@sparticuz/chromium/bin/al2023.tar.br', import.meta.url)));
setupLambdaEnvironment(join(libraries, 'lib'));
const launchBrowser = async () => playwright.launch({
  executablePath: process.env.CHROMIUM_PATH || await chromium.executablePath(),
  args: chromium.args.filter((arg) => !['--disable-web-security', '--allow-running-insecure-content'].includes(arg)),
  headless: true,
});
let browser = await launchBrowser();
mkdirSync('.smoke/screenshots', { recursive: true });

let checks = 0;
const pageErrors = [];
const pages = [];
const pass = (message) => { checks += 1; console.log(`ok ${checks} - ${message}`); };

function monitor(page) {
  pages.push(page);
  page.on('pageerror', (error) => pageErrors.push(error.message));
  return page;
}

function workspaceResponse(page, { includes, excludes, status = 200 } = {}) {
  return page.waitForResponse((response) => {
    if (!response.url().endsWith('/api/workspace') || response.request().method() !== 'PUT') return false;
    if (response.status() !== status) return false;
    const body = response.request().postData() || '';
    if (includes && !body.includes(includes)) return false;
    if (excludes && body.includes(excludes)) return false;
    return true;
  }, { timeout: 25_000 });
}

async function demoLogin(page, portal) {
  const isSeller = portal === 'seller';
  await page.goto(`${baseURL}${isSeller ? '/login' : '/farmer/login'}`, { waitUntil: 'networkidle' });
  const button = page.getByRole('button', { name: isSeller ? 'Use Seller Demo' : 'Use Farmer Demo', exact: true });
  try {
    await button.waitFor();
  } catch (error) {
    const session = await page.request.get(`${baseURL}/api/auth/session`);
    console.error('Demo launcher diagnostics', {
      portal, url: page.url(), session: await session.text(),
      visibleText: (await page.locator('body').innerText()).slice(0, 700),
    });
    throw error;
  }
  const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/auth/login') && response.request().method() === 'POST');
  await button.click();
  const response = await responsePromise;
  assert.equal(response.status(), 200, await response.text());
  const credentials = JSON.parse(response.request().postData() || '{}');
  assert.equal(credentials.email, `${portal}.demo@agripulse.in`);
  assert.equal(credentials.portalType, portal);
  await page.waitForURL(`${baseURL}${isSeller ? '/seller' : '/home'}`);
  await page.locator('h1').first().waitFor();
  const session = await page.request.get(`${baseURL}/api/auth/session`);
  const payload = await session.json();
  assert.equal(payload.session.portalType, portal);
  assert.deepEqual(payload.session.portals, [portal]);
  const cookie = (await page.context().cookies(baseURL)).find((item) => item.name === 'agripulse_session');
  assert.ok(cookie?.httpOnly, 'session cookie must be HTTP-only');
  pass(`${portal} demo launcher uses credential login and issues an HTTP-only ${portal}-only session`);
}

async function openCatalog(page) {
  await page.getByRole('button', { name: /Catalog & Inventory/ }).click();
  await page.getByPlaceholder('Search by name, brand, SKU...').waitFor();
}

try {
  const sellerContext = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const sellerPage = monitor(await sellerContext.newPage());
  await demoLogin(sellerPage, 'seller');
  assert.equal(await sellerPage.getByRole('button', { name: 'Switch to Farmer Portal', exact: true }).count(), 0);
  const forbiddenSwitch = await sellerPage.request.patch(`${baseURL}/api/auth/portal`, { data: { portalType: 'farmer' } });
  assert.equal(forbiddenSwitch.status(), 403);
  await sellerPage.goto(`${baseURL}/home`, { waitUntil: 'networkidle' });
  await sellerPage.waitForURL(`${baseURL}/seller`);
  pass('seller has no farmer switch control and direct/API cross-role navigation is denied');

  await openCatalog(sellerPage);
  await sellerPage.getByRole('button', { name: 'Add New Product', exact: true }).click();
  let dialog = sellerPage.getByRole('dialog', { name: 'Add New Product to Workspace Catalog', exact: true });
  await dialog.getByPlaceholder('e.g., Pusa Tejas Foundation Wheat Seed Lot').fill(productName);
  let numbers = dialog.locator('input[type="number"]');
  assert.equal(await numbers.count(), 3);
  await numbers.nth(0).fill('17');
  await numbers.nth(1).fill('1234.50');
  await numbers.nth(2).fill('1400');
  let save = workspaceResponse(sellerPage, { includes: productName });
  await dialog.getByRole('button', { name: 'Save Product Listing', exact: true }).click();
  assert.equal((await save).status(), 200);
  await sellerPage.getByText(productName, { exact: true }).waitFor();
  pass('seller product creation returns a real successful workspace save');

  await sellerPage.reload({ waitUntil: 'networkidle' });
  await openCatalog(sellerPage);
  await sellerPage.getByText(productName, { exact: true }).waitFor();
  pass('seller product creation survives a full browser reload');

  let row = sellerPage.locator('tr').filter({ hasText: productName }).first();
  await row.getByRole('button', { name: `Edit ${productName}`, exact: true }).click();
  dialog = sellerPage.getByRole('dialog', { name: 'Edit Workspace Product Listing', exact: true });
  await dialog.getByPlaceholder('e.g., Pusa Tejas Foundation Wheat Seed Lot').fill(editedProductName);
  numbers = dialog.locator('input[type="number"]');
  await numbers.nth(0).fill('9');
  await numbers.nth(1).fill('1300');
  await numbers.nth(2).fill('1450');

  // Deliberately fail one save to verify the visible retry path. This is not a fake success.
  await sellerPage.route('**/api/workspace', async (route) => {
    if (route.request().method() === 'PUT' && (route.request().postData() || '').includes(editedProductName)) {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'TEST_SAVE_FAILURE', message: 'Intentional browser retry test failure.' } }) });
    } else {
      await route.continue();
    }
  });
  save = workspaceResponse(sellerPage, { includes: editedProductName, status: 503 });
  await dialog.getByRole('button', { name: 'Save Listing Changes', exact: true }).click();
  await save;
  await sellerPage.getByRole('button', { name: 'Retry save', exact: true }).waitFor();
  await sellerPage.unroute('**/api/workspace');
  pass('failed workspace save is visible and offers a retry instead of claiming success');

  save = workspaceResponse(sellerPage, { includes: editedProductName });
  await sellerPage.getByRole('button', { name: 'Retry save', exact: true }).click();
  assert.equal((await save).status(), 200);
  await sellerPage.reload({ waitUntil: 'networkidle' });
  await openCatalog(sellerPage);
  await sellerPage.getByText(editedProductName, { exact: true }).waitFor();
  row = sellerPage.locator('tr').filter({ hasText: editedProductName }).first();
  await row.getByText('9 units', { exact: true }).waitFor();
  pass('retried seller edit reaches the server and survives reload');

  const workspace = await (await sellerPage.request.get(`${baseURL}/api/workspace`)).json();
  const persistedProduct = workspace.data.products.find((product) => product.name === editedProductName);
  assert.ok(persistedProduct?.id);
  assert.equal(persistedProduct.sellerId, workspace.data.sellerProfile.id);
  sellerPage.once('dialog', (nativeDialog) => nativeDialog.accept());
  save = workspaceResponse(sellerPage, { excludes: persistedProduct.id });
  await row.getByRole('button', { name: `Delete ${editedProductName}`, exact: true }).click();
  assert.equal((await save).status(), 200);
  await sellerPage.reload({ waitUntil: 'networkidle' });
  await openCatalog(sellerPage);
  assert.equal(await sellerPage.getByText(editedProductName, { exact: true }).count(), 0);
  pass('confirmed seller deletion persists and preserves the authenticated sellerId before deletion');

  await sellerPage.getByRole('button', { name: /All Marketplace/ }).click();
  const readOnly = sellerPage.getByText('Read-only marketplace listing', { exact: true }).first();
  await readOnly.waitFor();
  const readOnlyRow = sellerPage.locator('tr').filter({ has: readOnly }).first();
  assert.equal(await readOnlyRow.locator('button').count(), 0);
  await sellerPage.screenshot({ path: '.smoke/screenshots/seller-catalog-verified.png', fullPage: true });
  pass('unowned marketplace samples are read-only and expose no mutation controls');
  // Use a separate browser process as well as a separate context for cross-role isolation.
  await browser.close();
  browser = await launchBrowser();
  const farmerContext = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const farmerPage = monitor(await farmerContext.newPage());
  await demoLogin(farmerPage, 'farmer');
  assert.equal(await farmerPage.getByRole('button', { name: 'Seller Portal', exact: true }).count(), 0);
  const forbiddenFarmerSwitch = await farmerPage.request.patch(`${baseURL}/api/auth/portal`, { data: { portalType: 'seller' } });
  assert.equal(forbiddenFarmerSwitch.status(), 403);
  await farmerPage.goto(`${baseURL}/seller`, { waitUntil: 'networkidle' });
  await farmerPage.waitForURL(`${baseURL}/home`);
  pass('farmer has no seller switch control and direct/API cross-role navigation is denied');

  await farmerPage.goto(`${baseURL}/farm`, { waitUntil: 'networkidle' });
  await farmerPage.getByRole('button', { name: 'Register Farm', exact: true }).click();
  let farmInput = farmerPage.getByPlaceholder('e.g., Satpura Progressive Farm');
  await farmInput.fill(farmName);
  let farmForm = farmerPage.locator('form').filter({ has: farmInput });
  save = workspaceResponse(farmerPage, { includes: farmName });
  await farmForm.getByRole('button', { name: 'Register Farm', exact: true }).click();
  assert.equal((await save).status(), 200);
  const postReloadSave = workspaceResponse(farmerPage, { includes: farmName });
  await farmerPage.reload({ waitUntil: 'networkidle' });
  assert.equal((await postReloadSave).status(), 200);
  await farmerPage.getByRole('heading', { name: farmName, exact: true }).waitFor();
  pass('farmer record creation returns a real save and survives reload');

  // Invalidate the actual HTTP-only cookie at the browser-context boundary, then cause a real
  // workspace request. The UI must discard protected state rather than retaining a stale session.
  const farmerCookie = (await farmerPage.context().cookies(baseURL)).find((item) => item.name === 'agripulse_session');
  assert.ok(farmerCookie);
  await farmerPage.context().addCookies([{ ...farmerCookie, value: 'invalid-or-expired-browser-session' }]);
  await farmerPage.getByRole('button', { name: 'Register Farm', exact: true }).click();
  farmInput = farmerPage.getByPlaceholder('e.g., Satpura Progressive Farm');
  await farmInput.fill(interruptedFarmName);
  farmForm = farmerPage.locator('form').filter({ has: farmInput });
  save = workspaceResponse(farmerPage, { status: 401 });
  await farmForm.getByRole('button', { name: 'Register Farm', exact: true }).click();
  await save;
  await farmerPage.waitForURL(`${baseURL}/farmer/login`);
  await farmerPage.getByText(/Your session expired\. Sign in again to continue\./).waitFor();
  const invalidSession = await (await farmerPage.request.get(`${baseURL}/api/auth/session`)).json();
  assert.equal(invalidSession.session, null);
  pass('invalid/expired session clears protected state and returns to sign-in with an actionable error');

  await demoLogin(farmerPage, 'farmer');
  const logoutResponse = farmerPage.waitForResponse((response) => response.url().endsWith('/api/auth/logout') && response.request().method() === 'POST');
  await farmerPage.getByRole('button', { name: 'Sign Out', exact: true }).first().click();
  assert.equal((await logoutResponse).status(), 200);
  await farmerPage.waitForURL(`${baseURL}/farmer/login`);
  await farmerPage.reload({ waitUntil: 'networkidle' });
  const loggedOut = await (await farmerPage.request.get(`${baseURL}/api/auth/session`)).json();
  assert.equal(loggedOut.session, null);
  await farmerPage.goto(`${baseURL}/home`, { waitUntil: 'networkidle' });
  await farmerPage.waitForURL(`${baseURL}/farmer/login`);
  pass('logout invalidates the server session and protected routes stay closed after refresh');

  assert.deepEqual(pageErrors, [], `Browser runtime errors: ${pageErrors.join(', ')}`);
  pass('zero uncaught browser runtime errors');
  console.log(`\nPassed ${checks} authentication, role, CRUD persistence, retry, expiry and logout browser checks.`);
} catch (error) {
  await Promise.all(pages.filter((page) => !page.isClosed()).map(async (page, index) => {
    await page.screenshot({ path: `.smoke/screenshots/auth-persistence-failure-${index}.png`, fullPage: true }).catch(() => undefined);
  }));
  throw error;
} finally {
  await browser.close();
}
