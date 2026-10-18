import React, { Suspense, lazy } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { AgriPulseProvider, useAgriPulse } from './context/AgriPulseContext';
import { AppShell } from './components/AppShell';
import { SiteLayout } from './components/SiteLayout';
import { AgriPulseLoader } from './components/AgriPulseLoader';
import { PortalType } from './types';

/**
 * Route-level code splitting.
 *
 * The public website, the heaviest knowledge modules (disease encyclopedia, dictionary,
 * marketplace) and each portal module load on demand. Charts, icons and React remain in their own
 * vendor chunks, so a farmer opening the dashboard does not download the marketplace or the
 * 100-entry disease library.
 */
const HomeDashboardPage = lazy(() => import('./pages/HomeDashboardPage').then((m) => ({ default: m.HomeDashboardPage })));
const FarmManagementPage = lazy(() => import('./pages/FarmManagementPage').then((m) => ({ default: m.FarmManagementPage })));
const MonitoringPage = lazy(() => import('./pages/MonitoringPage').then((m) => ({ default: m.MonitoringPage })));
const DigitalTwinPage = lazy(() => import('./pages/DigitalTwinPage').then((m) => ({ default: m.DigitalTwinPage })));
const AiInsightsPage = lazy(() => import('./pages/AiInsightsPage').then((m) => ({ default: m.AiInsightsPage })));
const IrrigationPage = lazy(() => import('./pages/IrrigationPage').then((m) => ({ default: m.IrrigationPage })));
const SoilHealthPage = lazy(() => import('./pages/SoilHealthPage').then((m) => ({ default: m.SoilHealthPage })));
const CropHealthPage = lazy(() => import('./pages/CropHealthPage').then((m) => ({ default: m.CropHealthPage })));
const AlertsPage = lazy(() => import('./pages/AlertsPage').then((m) => ({ default: m.AlertsPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const AssistantPage = lazy(() => import('./pages/AssistantPage').then((m) => ({ default: m.AssistantPage })));
const WeatherIntelligencePage = lazy(() => import('./pages/WeatherIntelligencePage').then((m) => ({ default: m.WeatherIntelligencePage })));
const DictionaryPage = lazy(() => import('./pages/DictionaryPage').then((m) => ({ default: m.DictionaryPage })));
const DiseaseAnalysisPage = lazy(() => import('./pages/DiseaseAnalysisPage').then((m) => ({ default: m.DiseaseAnalysisPage })));
const StorePage = lazy(() => import('./pages/StorePage').then((m) => ({ default: m.StorePage })));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })));
const CartAndCheckoutPage = lazy(() => import('./pages/CartAndCheckoutPage').then((m) => ({ default: m.CartAndCheckoutPage })));
const OrdersPage = lazy(() => import('./pages/OrdersPage').then((m) => ({ default: m.OrdersPage })));
const WishlistPage = lazy(() => import('./pages/WishlistPage').then((m) => ({ default: m.WishlistPage })));
const OffersPage = lazy(() => import('./pages/OffersPage').then((m) => ({ default: m.OffersPage })));
const NewsPage = lazy(() => import('./pages/NewsPage').then((m) => ({ default: m.NewsPage })));
const SchemesPage = lazy(() => import('./pages/SchemesPage').then((m) => ({ default: m.SchemesPage })));
const AccountSettingsPage = lazy(() => import('./pages/AccountSettingsPage').then((m) => ({ default: m.AccountSettingsPage })));
const DeviceManagementPage = lazy(() => import('./pages/DeviceManagementPage').then((m) => ({ default: m.DeviceManagementPage })));
const DeviceDetailsPage = lazy(() => import('./pages/DeviceDetailsPage').then((m) => ({ default: m.DeviceDetailsPage })));
const SellerPortalPage = lazy(() => import('./pages/SellerPortalPage').then((m) => ({ default: m.SellerPortalPage })));
const LegalPage = lazy(() => import('./pages/site/LegalPage').then((m) => ({ default: m.LegalPage })));
const SiteHomePage = lazy(() => import('./pages/site/SiteHomePage').then((m) => ({ default: m.SiteHomePage })));
const PlatformPage = lazy(() => import('./pages/site/sitePages').then((m) => ({ default: m.PlatformPage })));
const AiCapabilitiesPage = lazy(() => import('./pages/site/sitePages').then((m) => ({ default: m.AiCapabilitiesPage })));
const DigitalTwinPublicPage = lazy(() => import('./pages/site/sitePages').then((m) => ({ default: m.DigitalTwinPublicPage })));
const HowItWorksPage = lazy(() => import('./pages/site/sitePages').then((m) => ({ default: m.HowItWorksPage })));
const TechnologyPage = lazy(() => import('./pages/site/sitePages').then((m) => ({ default: m.TechnologyPage })));
const ImpactPage = lazy(() => import('./pages/site/sitePages').then((m) => ({ default: m.ImpactPage })));
const RoadmapPage = lazy(() => import('./pages/site/sitePages').then((m) => ({ default: m.RoadmapPage })));
const AboutPage = lazy(() => import('./pages/site/sitePages').then((m) => ({ default: m.AboutPage })));
const FaqPage = lazy(() => import('./pages/site/supportPages').then((m) => ({ default: m.FaqPage })));
const ContactPage = lazy(() => import('./pages/site/supportPages').then((m) => ({ default: m.ContactPage })));
const SiteNotFoundPage = lazy(() => import('./pages/site/supportPages').then((m) => ({ default: m.SiteNotFoundPage })));

// Authentication screens stay in the initial bundle: they are the first thing a new user opens.
import { LoginPage } from './pages/LoginPage';
import { SellerSignUpPage } from './pages/SellerSignUpPage';
import { FarmerLoginPage } from './pages/FarmerLoginPage';
import { FarmerSignUpPage } from './pages/FarmerSignUpPage';


/** Farmer portal routes: unauthenticated visitors are sent to the farmer sign-in screen. */
const FARMER_ROUTES = [
  '/home',
  '/farm',
  '/twin',
  '/monitoring',
  '/insights',
  '/irrigation',
  '/soil',
  '/crop-health',
  '/weather',
  '/alerts',
  '/reports',
  '/assistant',
  '/devices',
  '/dictionary',
  '/disease',
  '/store',
  '/cart',
  '/checkout',
  '/orders',
  '/wishlist',
  '/offers',
  '/news',
  '/schemes',
  '/account',
];

const SessionGate: React.FC = () => (
  <div className="grid min-h-screen place-items-center bg-warmbg px-6 text-center">
    <div className="w-full max-w-sm">
      <AgriPulseLoader variant="panel" size="lg" label="Loading secure AGRIPULSE session…" />
      <p className="mt-2 text-xs text-slate-500">Checking your authenticated workspace with the API.</p>
    </div>
  </div>
);

/** Shown while a lazily loaded page chunk downloads. */
const PageLoading: React.FC = () => (
  <div className="grid min-h-[52vh] place-items-center px-6 text-center">
    <AgriPulseLoader size="md" label="Opening module…" />
  </div>
);

const ProtectedRouteGuard: React.FC<{ children: React.ReactNode; portal?: PortalType }> = ({ children, portal }) => {
  const { session, sessionLoading, workspaceHydrated } = useAgriPulse();
  const location = useLocation();

  if (sessionLoading || (session && !workspaceHydrated)) return <SessionGate />;

  if (!session) {
    const isFarmerPath = FARMER_ROUTES.some(
      (path) => location.pathname === path || location.pathname.startsWith(`${path}/`),
    );
    return <Navigate to={isFarmerPath || portal === 'farmer' ? '/farmer/login' : '/login'} state={{ from: location.pathname }} replace />;
  }

  if (portal && session.portalType !== portal) {
    return <Navigate to={session.portalType === 'seller' ? '/seller' : '/home'} replace />;
  }

  return <>{children}</>;
};

/**
 * The product website is public for everyone, signed in or not, so shared links keep working.
 * The header swaps its call to action to "Open my portal" for an authenticated visitor.
 */
const PublicSiteLayout: React.FC = () => {
  const { session, sessionLoading, workspaceHydrated } = useAgriPulse();
  if (sessionLoading || (session && !workspaceHydrated)) return <SessionGate />;
  return <SiteLayout />;
};

export const App: React.FC = () => {
  return (
    <AgriPulseProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* ---------------------------------------------------------------
              Public website. Signed-in users are redirected to their portal.
             --------------------------------------------------------------- */}
          <Route element={<PublicSiteLayout />}>
            <Route path="/" element={<SiteHomePage />} />
            <Route path="/platform" element={<PlatformPage />} />
            <Route path="/ai-capabilities" element={<AiCapabilitiesPage />} />
            <Route path="/digital-twin" element={<DigitalTwinPublicPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/technology" element={<TechnologyPage />} />
            <Route path="/impact" element={<ImpactPage />} />
            <Route path="/roadmap" element={<RoadmapPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy" element={<LegalPage />} />
            <Route path="/terms" element={<LegalPage />} />
          </Route>

          {/* Legacy alias kept so previously shared links still resolve */}
          <Route path="/product" element={<Navigate to="/platform" replace />} />

          {/* ---------------------------------------------------------------
              Authentication
             --------------------------------------------------------------- */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/seller/login" element={<LoginPage />} />
          <Route path="/signup" element={<SellerSignUpPage />} />
          <Route path="/seller/signup" element={<SellerSignUpPage />} />
          <Route path="/farmer/login" element={<FarmerLoginPage />} />
          <Route path="/farmer/signup" element={<FarmerSignUpPage />} />

          {/* ---------------------------------------------------------------
              Seller portal
             --------------------------------------------------------------- */}
          <Route
            path="/seller"
            element={
              <ProtectedRouteGuard portal="seller">
                <SellerPortalPage />
              </ProtectedRouteGuard>
            }
          />
          <Route
            path="/seller/dashboard"
            element={
              <ProtectedRouteGuard portal="seller">
                <SellerPortalPage />
              </ProtectedRouteGuard>
            }
          />

          {/* ---------------------------------------------------------------
              Farmer portal
             --------------------------------------------------------------- */}
          <Route
            element={
              <ProtectedRouteGuard portal="farmer">
                <AppShell />
              </ProtectedRouteGuard>
            }
          >
            <Route path="/home" element={<HomeDashboardPage />} />
            <Route path="/farm" element={<FarmManagementPage />} />
            <Route path="/twin" element={<DigitalTwinPage />} />
            <Route path="/monitoring" element={<MonitoringPage />} />
            <Route path="/insights" element={<AiInsightsPage />} />
            <Route path="/irrigation" element={<IrrigationPage />} />
            <Route path="/soil" element={<SoilHealthPage />} />
            <Route path="/crop-health" element={<CropHealthPage />} />
            <Route path="/weather" element={<WeatherIntelligencePage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/devices" element={<DeviceManagementPage />} />
            <Route path="/devices/:deviceId" element={<DeviceDetailsPage />} />
            <Route path="/dictionary" element={<DictionaryPage />} />
            <Route path="/disease" element={<DiseaseAnalysisPage />} />
            <Route path="/disease/:diseaseId" element={<DiseaseAnalysisPage />} />
            <Route path="/store" element={<StorePage />} />
            <Route path="/store/product/:productId" element={<ProductDetailPage />} />
            <Route path="/cart" element={<CartAndCheckoutPage />} />
            <Route path="/checkout" element={<CartAndCheckoutPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:orderId" element={<OrdersPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/offers" element={<OffersPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/schemes" element={<SchemesPage />} />
            <Route path="/account" element={<AccountSettingsPage />} />
          </Route>

          {/* ---------------------------------------------------------------
              Fallback for unknown addresses
             --------------------------------------------------------------- */}
          <Route element={<PublicFallback />}>
            <Route path="*" element={<SiteNotFoundPage />} />
          </Route>
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AgriPulseProvider>
  );
};

/**
 * Unknown addresses always render the recovery page inside the public chrome: it explains what
 * happened and offers navigation, instead of bouncing the visitor to an unrelated screen.
 * Portal pages remain protected by ProtectedRouteGuard and by server-side authorization.
 */
const PublicFallback: React.FC = () => {
  const { sessionLoading, session, workspaceHydrated } = useAgriPulse();
  if (sessionLoading || (session && !workspaceHydrated)) return <SessionGate />;
  return <SiteLayout />;
};
