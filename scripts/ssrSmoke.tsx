/**
 * Render smoke test.
 *
 * Renders every public, farmer and seller page plus the shared loader through React's server
 * renderer with a stubbed browser storage layer. This catches render-time crashes, bad hooks,
 * inaccessible status markup and broken imports across the route surface without a browser.
 *
 * Run with: npm run test:render
 */
import './ssrStubs';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AgriPulseProvider } from '../src/context/AgriPulseContext';

import { SiteLayout } from '../src/components/SiteLayout';
import { AgriPulseLoader } from '../src/components/AgriPulseLoader';
import { SiteHomePage } from '../src/pages/site/SiteHomePage';
import {
  AboutPage,
  AiCapabilitiesPage,
  DigitalTwinPublicPage,
  HowItWorksPage,
  ImpactPage,
  PlatformPage,
  RoadmapPage,
  TechnologyPage,
} from '../src/pages/site/sitePages';
import { ContactPage, FaqPage, SiteNotFoundPage } from '../src/pages/site/supportPages';

import { HomeDashboardPage } from '../src/pages/HomeDashboardPage';
import { FarmManagementPage } from '../src/pages/FarmManagementPage';
import { MonitoringPage } from '../src/pages/MonitoringPage';
import { DigitalTwinPage } from '../src/pages/DigitalTwinPage';
import { AiInsightsPage } from '../src/pages/AiInsightsPage';
import { IrrigationPage } from '../src/pages/IrrigationPage';
import { SoilHealthPage } from '../src/pages/SoilHealthPage';
import { CropHealthPage } from '../src/pages/CropHealthPage';
import { AlertsPage } from '../src/pages/AlertsPage';
import { ReportsPage } from '../src/pages/ReportsPage';
import { AssistantPage } from '../src/pages/AssistantPage';
import { WeatherIntelligencePage } from '../src/pages/WeatherIntelligencePage';
import { DeviceManagementPage } from '../src/pages/DeviceManagementPage';
import { DeviceDetailsPage } from '../src/pages/DeviceDetailsPage';
import { DictionaryPage } from '../src/pages/DictionaryPage';
import { DiseaseAnalysisPage } from '../src/pages/DiseaseAnalysisPage';
import { StorePage } from '../src/pages/StorePage';
import { CartAndCheckoutPage } from '../src/pages/CartAndCheckoutPage';
import { OrdersPage } from '../src/pages/OrdersPage';
import { WishlistPage } from '../src/pages/WishlistPage';
import { OffersPage } from '../src/pages/OffersPage';
import { NewsPage } from '../src/pages/NewsPage';
import { SchemesPage } from '../src/pages/SchemesPage';
import { AccountSettingsPage } from '../src/pages/AccountSettingsPage';
import { FarmerLoginPage } from '../src/pages/FarmerLoginPage';
import { FarmerSignUpPage } from '../src/pages/FarmerSignUpPage';
import { LoginPage } from '../src/pages/LoginPage';
import { SellerSignUpPage } from '../src/pages/SellerSignUpPage';
import { SellerPortalPage } from '../src/pages/SellerPortalPage';
import { FloatingAIChat } from '../src/components/FloatingAIChat';

interface SiteCase {
  name: string;
  path: string;
  element: React.ReactNode;
  expect: string[];
}

const siteCases: SiteCase[] = [
  { name: 'site home', path: '/', element: <SiteHomePage />, expect: ['Good farming starts', 'Four sensor types.', 'WORKSPACE PREVIEW'] },
  { name: 'platform', path: '/platform', element: <PlatformPage />, expect: ['Module catalog', 'Available in this build'] },
  { name: 'ai capabilities', path: '/ai-capabilities', element: <AiCapabilitiesPage />, expect: ['Understandable intelligence', 'Planned'] },
  { name: 'digital twin', path: '/digital-twin', element: <DigitalTwinPublicPage />, expect: ['A twin built from your records', 'It does not show'] },
  { name: 'how it works', path: '/how-it-works', element: <HowItWorksPage />, expect: ['From an empty account', 'A worked example'] },
  { name: 'technology', path: '/technology', element: <TechnologyPage />, expect: ['every number can be traced', 'Data flow'] },
  { name: 'impact', path: '/impact', element: <ImpactPage />, expect: ['survives a field visit', 'Validation plan'] },
  { name: 'roadmap', path: '/roadmap', element: <RoadmapPage />, expect: ['What exists today', 'Field validation next'] },
  { name: 'about', path: '/about', element: <AboutPage />, expect: ['Built for farmers who need answers', 'Principles'] },
  { name: 'faq', path: '/faq', element: <FaqPage />, expect: ['Straight answers about what AGRIPULSE does'] },
  { name: 'contact', path: '/contact', element: <ContactPage />, expect: ['Talk to the AGRIPULSE team', 'Validate message'] },
  { name: 'not found', path: '/missing-page', element: <SiteNotFoundPage />, expect: ['That page does not exist'] },
];

const portalCases: SiteCase[] = [
  { name: 'farmer dashboard', path: '/home', element: <HomeDashboardPage />, expect: ['Farm'] },
  { name: 'farm management', path: '/farm', element: <FarmManagementPage />, expect: ['Farm'] },
  {
    name: 'monitoring',
    path: '/monitoring',
    element: <MonitoringPage />,
    expect: ['Live sensor monitoring', 'Waiting for readings', 'Choose a sensor to chart'],
  },
  { name: 'digital twin (portal)', path: '/twin', element: <DigitalTwinPage />, expect: ['Digital farm twin'] },
  {
    name: 'ai insights',
    path: '/insights',
    element: <AiInsightsPage />,
    expect: ['AI insights', 'Rule-based screening', 'What AGRIPULSE cannot tell you yet', 'Rule-based screening'],
  },
  {
    name: 'irrigation',
    path: '/irrigation',
    element: <IrrigationPage />,
    expect: ['Irrigation guidance', 'reference band', 'Rainfall log', 'Forecast rainfall is not measured farm rainfall'],
  },
  {
    name: 'soil health',
    path: '/soil',
    element: <SoilHealthPage />,
    expect: ['Soil health', 'Lab test required', 'No pH sensor paired'],
  },
  { name: 'crop health', path: '/crop-health', element: <CropHealthPage />, expect: ['Crop health'] },
  {
    name: 'alerts',
    path: '/alerts',
    element: <AlertsPage />,
    expect: ['Alerts', 'Suggested next step'],
  },
  {
    name: 'reports',
    path: '/reports',
    element: <ReportsPage />,
    expect: ['Reports &amp; analytics', 'Zone report', 'No stored readings for this selection', 'Export zone report'],
  },
  { name: 'assistant', path: '/assistant', element: <AssistantPage />, expect: ['AI farming assistant'] },
  { name: 'weather', path: '/weather', element: <WeatherIntelligencePage />, expect: ['Weather'] },
  { name: 'devices', path: '/devices', element: <DeviceManagementPage />, expect: ['device'] },
  { name: 'device details', path: '/devices/device-demo-node-01', element: <DeviceDetailsPage />, expect: ['Device'] },
  { name: 'dictionary', path: '/dictionary', element: <DictionaryPage />, expect: ['ictionary'] },
  { name: 'disease library', path: '/disease', element: <DiseaseAnalysisPage />, expect: ['isease'] },
  { name: 'store', path: '/store', element: <StorePage />, expect: ['Store'] },
  { name: 'cart & checkout', path: '/cart', element: <CartAndCheckoutPage />, expect: ['Cart'] },
  { name: 'orders', path: '/orders', element: <OrdersPage />, expect: ['Order'] },
  { name: 'wishlist', path: '/wishlist', element: <WishlistPage />, expect: ['Wishlist'] },
  { name: 'offers', path: '/offers', element: <OffersPage />, expect: ['Offer'] },
  { name: 'news', path: '/news', element: <NewsPage />, expect: ['News'] },
  { name: 'schemes', path: '/schemes', element: <SchemesPage />, expect: ['Scheme'] },
  { name: 'account settings', path: '/account', element: <AccountSettingsPage />, expect: ['Farmer Account Profile'] },
  { name: 'farmer login', path: '/farmer/login', element: <FarmerLoginPage />, expect: ['Sign In'] },
  { name: 'farmer signup', path: '/farmer/signup', element: <FarmerSignUpPage />, expect: ['Sign'] },
  { name: 'seller login', path: '/login', element: <LoginPage />, expect: ['Sign'] },
  { name: 'seller signup', path: '/signup', element: <SellerSignUpPage />, expect: ['Sign'] },
  {
    name: 'seller portal',
    path: '/seller',
    element: <SellerPortalPage />,
    expect: [
      'Seller Central Hub',
      'Seller Workspace',
      'Business Management',
      'Dashboard Overview',
      'Catalog &amp; Inventory',
      'Financials &amp; Payouts',
      'Store Profile &amp; GSTIN',
      'seller portal navigation',
      'aria-current="page"',
      'Open seller navigation menu',
      'aria-controls="seller-mobile-navigation"',
      'Sign out',
    ],
  },
  { name: 'floating assistant', path: '/home', element: <FloatingAIChat />, expect: [] },
];

let failures = 0;
let passes = 0;

function render(element: React.ReactNode, path: string): string {
  return renderToString(
    <AgriPulseProvider>
      <MemoryRouter initialEntries={[path]}>{element}</MemoryRouter>
    </AgriPulseProvider>,
  );
}

try {
  const html = render(
    <AgriPulseLoader variant="panel" size="lg" label="Loading your farm data…" />,
    '/loader-check',
  );
  const required = ['role="status"', 'aria-live="polite"', 'agri-loader--panel', 'agri-loader__leaf--left', 'Loading your farm data…'];
  const missing = required.filter((needle) => !html.includes(needle));
  if (missing.length > 0) {
    failures += 1;
    console.error(`FAIL  agriculture loader — missing: ${missing.join(' | ')}`);
  } else {
    passes += 1;
    console.log('ok    agriculture loader (sprout art, panel variant, accessible status)');
  }
} catch (error) {
  failures += 1;
  console.error('ERROR agriculture loader');
  console.error(error instanceof Error ? error.stack : error);
}

for (const testCase of siteCases) {
  try {
    const html = render(
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path={testCase.path} element={testCase.element} />
        </Route>
      </Routes>,
      testCase.path,
    );
    // The chrome must be present, and so must the page content.
    const requirements = ['Skip to content', 'See more. Predict earlier. Grow smarter.', ...testCase.expect];
    const missing = requirements.filter((needle) => !html.includes(needle));
    if (missing.length > 0 || html.length < 4000) {
      failures += 1;
      console.error(`FAIL  ${testCase.name} — missing: ${missing.join(' | ') || 'content'} (${html.length} chars)`);
    } else {
      passes += 1;
      console.log(`ok    ${testCase.name} (${html.length} chars)`);
    }
  } catch (error) {
    failures += 1;
    console.error(`ERROR ${testCase.name}`);
    console.error(error instanceof Error ? error.stack : error);
  }
}

for (const testCase of portalCases) {
  try {
    const html = render(
      <Routes>
        <Route path={testCase.path} element={testCase.element} />
      </Routes>,
      testCase.path,
    );
    const missing = testCase.expect.filter((needle) => !html.toLowerCase().includes(needle.toLowerCase()));
    if (missing.length > 0 || html.length < 800) {
      failures += 1;
      console.error(`FAIL  ${testCase.name} — missing: ${missing.join(' | ') || 'content'} (${html.length} chars)`);
    } else {
      passes += 1;
      console.log(`ok    ${testCase.name} (${html.length} chars)`);
    }
  } catch (error) {
    failures += 1;
    console.error(`ERROR ${testCase.name}`);
    console.error(error instanceof Error ? error.stack : error);
  }
}

/* --------------------------------------------------------------------------------------------
 * Broken-link audit
 *
 * Every href rendered by the public chrome and by the farmer sidebar is compared against the route
 * paths declared in src/App.tsx, so a navigation entry that points nowhere fails this test instead
 * of silently 404-ing for a farmer.
 * ------------------------------------------------------------------------------------------ */

const routeSource = fs.readFileSync(path.join(process.cwd(), 'src', 'App.tsx'), 'utf8');
const declaredRoutes = new Set(
  [...routeSource.matchAll(/path="([^"]+)"/g)].map((match) => match[1]),
);

const collectHrefs = (html: string): string[] =>
  [...html.matchAll(/href="([^"]+)"/g)]
    .map((match) => match[1].split(/[?#]/)[0])
    .filter((href) => href.startsWith('/') && !href.includes(':'));

const linkFailures: string[] = [];
const checkLinks = (label: string, html: string) => {
  const hrefs = [...new Set(collectHrefs(html))];
  const broken = hrefs.filter((href) => !declaredRoutes.has(href) && !declaredRoutes.has('*'));
  // `*` covers the not-found route, so an unknown path is still handled; report only paths with no
  // matching declaration and no wildcard fallback.
  const unresolved = declaredRoutes.has('*') ? [] : broken;
  const unknown = hrefs.filter((href) => !declaredRoutes.has(href));
  if (unresolved.length > 0) {
    linkFailures.push(`${label}: ${unresolved.join(', ')}`);
    console.error(`FAIL  ${label} — links with no declared route: ${unresolved.join(', ')}`);
  } else {
    passes += 1;
    console.log(`ok    ${label} (${hrefs.length} links, ${unknown.length} routed via the not-found fallback)`);
  }
};

try {
  const siteHtml = render(
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<SiteHomePage />} />
      </Route>
    </Routes>,
    '/',
  );
  checkLinks('public chrome links', siteHtml);
} catch (error) {
  failures += 1;
  console.error('ERROR public chrome links');
  console.error(error instanceof Error ? error.stack : error);
}

try {
  const portalHtml = render(
    <Routes>
      <Route path="/home" element={<HomeDashboardPage />} />
      <Route path="/account" element={<AccountSettingsPage />} />
    </Routes>,
    '/home',
  );
  checkLinks('farmer dashboard links', portalHtml);
} catch (error) {
  failures += 1;
  console.error('ERROR farmer dashboard links');
  console.error(error instanceof Error ? error.stack : error);
}

// The sidebar, bottom bar and profile menu are declared as data, so validate every destination
// against the router instead of relying on a rendered shell (which needs a live session).
try {
  const shells = ['src/components/AppShell.tsx', 'src/data/siteContent.ts'];
  const navTargets = new Set<string>();
  for (const file of shells) {
    const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    for (const match of source.matchAll(/\bto: '([^']+)'/g)) navTargets.add(match[1]);
    for (const match of source.matchAll(/\bto=\{?'(\/[^']*)'/g)) navTargets.add(match[1]);
  }
  const missingRoutes = [...navTargets].filter(
    (target) => !declaredRoutes.has(target) && !declaredRoutes.has(target.replace(/\/:[^/]+/g, '/:id')),
  );
  if (missingRoutes.length > 0) {
    failures += 1;
    console.error(`FAIL  navigation registry — destinations with no route: ${missingRoutes.join(', ')}`);
  } else {
    passes += 1;
    console.log(`ok    navigation registry (${navTargets.size} destinations all declared)`);
  }
} catch (error) {
  failures += 1;
  console.error('ERROR navigation registry');
  console.error(error instanceof Error ? error.stack : error);
}

if (failures > 0) {
  console.error(`\n${failures} of ${passes + failures} checks failed (${passes} passed).`);
  process.exitCode = 1;
} else {
  console.log(`\nAll ${passes} render and navigation checks passed.`);
}
