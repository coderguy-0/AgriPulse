import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Store,
  Package,
  LayoutDashboard,
  Menu,
  Truck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  DollarSign,
  FileText,
  Printer,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Star,
  Users,
  Sprout,
  LogOut,
  Edit,
  Trash2,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  Eye,
  Check,
} from 'lucide-react';
import { AgriPulseLogo } from '../components/AgriPulseLogo';
import { AgriPulseLoader } from '../components/AgriPulseLoader';
import { useAgriPulse } from '../context/AgriPulseContext';
import { DemoOrder, OrderStatus, ProductCategory, StoreProduct } from '../types';

const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Seeds and planting material',
  'Fertilizers and soil nutrients',
  'Crop protection products',
  'Organic farming inputs',
  'Soil testing and farm-monitoring kits',
  'Irrigation equipment',
  'Sprayers and farm tools',
  'Hand tools and accessories',
  'Farm safety equipment',
  'Harvesting and storage supplies',
];

type SellerTabId = 'overview' | 'catalog' | 'orders' | 'payouts' | 'settings';
type SellerNavItem = {
  id: SellerTabId;
  label: string;
  mobileLabel: string;
  title: string;
  section: string;
  icon: LucideIcon;
};

const SELLER_NAV_GROUPS: { label: string; items: SellerNavItem[] }[] = [
  {
    label: 'Seller Workspace',
    items: [
      { id: 'overview', label: 'Dashboard Overview', mobileLabel: 'Overview', title: 'Dashboard Overview', section: 'Seller Workspace', icon: LayoutDashboard },
      { id: 'catalog', label: 'Catalog & Inventory', mobileLabel: 'Catalog', title: 'Catalog & Inventory', section: 'Seller Workspace', icon: Package },
      { id: 'orders', label: 'Demo Orders', mobileLabel: 'Orders', title: 'Demo Orders', section: 'Seller Workspace', icon: Truck },
    ],
  },
  {
    label: 'Business Management',
    items: [
      { id: 'payouts', label: 'Financials & Payouts', mobileLabel: 'Payouts', title: 'Financials & Payouts', section: 'Business Management', icon: DollarSign },
      { id: 'settings', label: 'Store Profile & GSTIN', mobileLabel: 'Profile', title: 'Store Profile & GSTIN', section: 'Business Management', icon: Building2 },
    ],
  },
];

export const SellerPortalPage: React.FC = () => {
  const {
    session,
    workspaceSyncStatus,
    workspaceSyncError,
    sellerProfile,
    updateSellerProfile,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    orders,
    updateOrderStatus,
    switchPortal,
    logout,
  } = useAgriPulse();

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<SellerTabId>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileDrawerRef = useRef<HTMLElement>(null);
  const mobileDrawerCloseButtonRef = useRef<HTMLButtonElement>(null);
  const [catalogFilter, setCatalogFilter] = useState<'mine' | 'all'>('mine');
  const [catalogCategory, setCatalogCategory] = useState<string>('All');
  const [catalogSearch, setCatalogSearch] = useState('');

  // Add Product Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState<ProductCategory>('Seeds and planting material');
  const [newProdBrand, setNewProdBrand] = useState(sellerProfile.businessName || 'Your business brand');
  const [newProdPackSize, setNewProdPackSize] = useState('40 kg Bag');
  const [newProdPriceRs, setNewProdPriceRs] = useState('1450');
  const [newProdMrpRs, setNewProdMrpRs] = useState('1650');
  const [newProdStock, setNewProdStock] = useState('50');
  const [newProdShortDesc, setNewProdShortDesc] = useState('');
  const [newProdUsage, setNewProdUsage] = useState('');
  const [newProdSvgType, setNewProdSvgType] = useState('seeds-wheat');

  // Invoice Modal State
  const [invoiceOrder, setInvoiceOrder] = useState<DemoOrder | null>(null);

  // Status Filter for Orders Tab
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('All');

  useEffect(() => {
    if (mobileNavOpen) mobileDrawerCloseButtonRef.current?.focus();
  }, [mobileNavOpen]);

  // Filtered Products
  const displayedProducts = useMemo(() => {
    return products.filter((p) => {
      const isMine =
        p.sellerName.toLowerCase().includes('karnal') ||
        p.sellerName.toLowerCase().includes(sellerProfile.businessName.toLowerCase()) ||
        p.seller?.name?.toLowerCase().includes('karnal');

      if (catalogFilter === 'mine' && !isMine) {
        return false;
      }
      if (catalogCategory !== 'All' && p.category !== catalogCategory) {
        return false;
      }
      if (catalogSearch.trim()) {
        const query = catalogSearch.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesBrand = p.brand.toLowerCase().includes(query);
        const matchesCategory = p.category.toLowerCase().includes(query);
        if (!matchesName && !matchesBrand && !matchesCategory) return false;
      }
      return true;
    });
  }, [products, catalogFilter, catalogCategory, catalogSearch, sellerProfile.businessName]);

  // Orders statistics
  const pendingOrdersCount = useMemo(
    () => orders.filter((o) => o.orderStatus === 'Placed' || o.orderStatus === 'Processing').length,
    [orders]
  );

  const completedOrdersCount = useMemo(
    () => orders.filter((o) => o.orderStatus === 'Delivered').length,
    [orders]
  );

  const myListedProductsCount = useMemo(() => {
    return products.filter(
      (p) =>
        p.sellerName.toLowerCase().includes('karnal') ||
        p.sellerName.toLowerCase().includes(sellerProfile.businessName.toLowerCase())
    ).length;
  }, [products, sellerProfile.businessName]);

  const filteredOrders = useMemo(() => {
    if (orderStatusFilter === 'All') return orders;
    return orders.filter((o) => o.orderStatus === orderStatusFilter);
  }, [orders, orderStatusFilter]);

  const activeNavItem = SELLER_NAV_GROUPS
    .flatMap((group) => group.items)
    .find((item) => item.id === activeTab) || SELLER_NAV_GROUPS[0].items[0];
  const activeNavTitle = activeNavItem.id === 'orders'
    ? session?.isDemo ? 'Demo Orders' : 'Workspace Orders'
    : activeNavItem.title;

  const renderNavigationGroups = (closeOnSelect = false) => SELLER_NAV_GROUPS.map((group) => (
    <div key={group.label} className="app-nav-group">
      <div className="px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-forest-300/80">{group.label}</div>
      {group.items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        const navLabel = item.id === 'catalog'
          ? `${item.label} (${myListedProductsCount})`
          : item.id === 'orders'
            ? `${session?.isDemo ? 'Demo Orders' : 'Workspace Orders'} (${orders.length})`
            : item.label;
        const badgeCount = item.id === 'orders' ? pendingOrdersCount : 0;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setActiveTab(item.id);
              if (closeOnSelect) closeMobileNav();
            }}
            aria-current={isActive ? 'page' : undefined}
            className={`app-nav-link flex w-full items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-300 focus-visible:ring-offset-2 focus-visible:ring-offset-forest-950 ${isActive ? 'is-active' : ''}`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <Icon className="w-[17px] h-[17px] shrink-0" aria-hidden="true" />
              <span className="truncate">{navLabel}</span>
            </span>
            {badgeCount > 0 && (
              <span className="app-nav-count is-device" aria-label={`${badgeCount} pending orders`}>
                {badgeCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  ));

  const handleSwitchToFarmerPortal = async (destination = '/home') => {
    if (await switchPortal('farmer')) navigate(destination);
  };

  const closeMobileNav = () => {
    setMobileNavOpen(false);
    window.requestAnimationFrame(() => mobileMenuButtonRef.current?.focus());
  };

  const handleLogout = () => {
    void logout();
    navigate('/login', { replace: true });
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;

    const pricePaise = Math.round(parseFloat(newProdPriceRs || '0') * 100);
    const mrpPaise = Math.round(parseFloat(newProdMrpRs || '0') * 100);
    const stockCount = parseInt(newProdStock || '10', 10);

    addProduct({
      name: newProdName.trim(),
      category: newProdCategory,
      brand: newProdBrand.trim(),
      isSampleBrand: Boolean(session?.isDemo),
      packSize: newProdPackSize.trim(),
      pricePaise,
      mrpPaise,
      stockCount,
      availability: stockCount > 0 ? 'In Stock' : 'Out of Stock',
      sellerName: session?.isDemo ? `${sellerProfile.businessName} (Demo Seller)` : sellerProfile.businessName,
      isDemoSeller: Boolean(session?.isDemo),
      compatibleCrops: ['Wheat (गेहूं)', 'Rice / Paddy (धान)', 'Mustard (सरसों)', 'Vegetables'],
      seasonTag: 'All Season',
      shortDescription:
        newProdShortDesc.trim() ||
        (session?.isDemo
          ? `Demo listing for ${newProdName.trim()} from ${sellerProfile.businessName}. Certification and quality are not verified.`
          : `Seller draft for ${newProdName.trim()} from ${sellerProfile.businessName}. Product claims and certifications have not been verified.`),
      detailedDescription:
        newProdShortDesc.trim() ||
        (session?.isDemo
          ? 'Illustrative sample copy only. No warehouse, product testing, or certification is verified.'
          : 'Seller-provided draft copy. Product claims and certifications must be verified before publication.'),
      usageInstructions:
        newProdUsage.trim() || 'Follow recommended agronomic package of practices for optimal crop emergence.',
      storageInstructions: 'Store in a dry, rodent-safe godown on raised wooden pallets.',
      shippingEstimateDays: session?.isDemo ? 'Estimated 2–4 days (Demo Delivery)' : 'Shipping provider not connected',
      imageSvgType: newProdSvgType,
      isFeatured: false,
      isPopular: true,
      isNewArrival: true,
      rating: 0,
      reviewCount: 0,
    });

    setShowAddModal(false);
    // Reset inputs
    setNewProdName('');
    setNewProdShortDesc('');
    setNewProdUsage('');
  };

  const handleQuickStock = (productId: string, delta: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const newStock = Math.max(0, prod.stockCount + delta);
    updateProduct({
      ...prod,
      stockCount: newStock,
      availability: newStock > 0 ? 'In Stock' : 'Out of Stock',
    });
  };

  const handleToggleStock = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const isOut = prod.availability === 'Out of Stock';
    updateProduct({
      ...prod,
      availability: isOut ? 'In Stock' : 'Out of Stock',
      stockCount: isOut ? Math.max(10, prod.stockCount) : 0,
    });
  };

  return (
    <div className="app-shell min-h-screen bg-warmbg text-slate-900 flex flex-col lg:flex-row">
      {/* Seller navigation follows the same forest sidebar and active-item treatment as the Farmer Portal. */}
      <aside
        aria-label="Seller portal sidebar"
        className="app-sidebar hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-forest-950 text-white border-r border-forest-900 z-30"
      >
        <div className="app-sidebar-brand px-5 py-4 border-b border-forest-800/80 flex flex-col items-start justify-center gap-2">
          <Link to="/seller" onClick={() => setActiveTab('overview')} className="focus:outline-none" aria-label="Seller dashboard overview">
            <AgriPulseLogo size="md" theme="light" />
          </Link>
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-forest-300/90">Seller Central</span>
        </div>

        <nav className="app-sidebar-nav flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Seller portal navigation">
          {renderNavigationGroups()}
        </nav>

        <div className="app-sidebar-footer p-3 border-t border-forest-800/80 bg-forest-900/50">
          <div className="px-2.5 py-2 rounded-lg bg-forest-900/90 border border-forest-800">
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-[11px] font-semibold text-white truncate"
                title={sellerProfile.contactPerson || sellerProfile.businessName}
              >
                {sellerProfile.contactPerson || sellerProfile.businessName || 'Seller account'}
              </span>
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-leaf-500/20 text-leaf-300 border border-leaf-500/30">
                {session?.isDemo ? 'Demo' : 'Account'}
              </span>
            </div>
            <p className="text-[10px] text-forest-200 truncate mt-0.5" title={sellerProfile.businessName}>
              {sellerProfile.businessName || 'Business name not provided'}
            </p>
            <p className="text-[10px] text-forest-300 truncate mt-0.5">
              {[sellerProfile.city, sellerProfile.state].filter(Boolean).join(', ') || 'Business location not provided'}
            </p>
          </div>
        </div>
      </aside>

      <div className="app-main-column flex-1 lg:pl-64 flex flex-col min-h-screen min-w-0">
        <header className="app-header sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                ref={mobileMenuButtonRef}
                type="button"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open seller navigation menu"
                aria-expanded={mobileNavOpen}
                aria-controls="seller-mobile-navigation"
                className="lg:hidden rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-forest-700">
                  <span className="shrink-0">Seller Central Hub</span>
                  <span aria-hidden="true">/</span>
                  <span className="truncate" title={sellerProfile.businessName}>
                    {sellerProfile.businessName || 'Seller account'}
                  </span>
                </div>
                <h1 className="truncate text-sm font-bold text-slate-900 sm:text-base">
                  {activeNavTitle}
                </h1>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {session?.isDemo && (
                <span
                  title="Development Demo Workspace"
                  className="inline-flex items-center rounded-xl border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] font-semibold text-amber-900 sm:px-2.5 sm:text-[11px]"
                >
                  <span className="md:hidden">Demo</span>
                  <span className="hidden md:inline">Development Demo Workspace</span>
                </span>
              )}
              {session?.isDemo && (
                <div className="hidden items-center gap-2 lg:flex">
                  <button
                    type="button"
                    onClick={() => void handleSwitchToFarmerPortal('/store')}
                    aria-label="Preview Farmer Store"
                    title="Switch to the Farmer Portal and preview the store"
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-forest-200 bg-forest-50 px-2.5 text-xs font-semibold text-forest-900 hover:bg-forest-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500"
                  >
                    <Eye className="h-4 w-4" />
                    <span className="hidden xl:inline">Preview Farmer Store</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSwitchToFarmerPortal('/home')}
                    aria-label="Switch to Farmer Portal"
                    title="Open the development Farmer workspace"
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-forest-900 px-2.5 text-xs font-semibold text-white hover:bg-forest-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500"
                  >
                    <Sprout className="h-4 w-4 text-leaf-300" />
                    <span className="hidden xl:inline">Switch to Farmer Portal</span>
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out"
                title="Sign out"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </header>

        <main className="app-content flex-1 px-4 sm:px-6 lg:px-8 max-w-[1440px] w-full mx-auto space-y-6">
        <div role={workspaceSyncError ? 'alert' : 'status'} className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs ${workspaceSyncError ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
          {workspaceSyncStatus === 'saving' && <AgriPulseLoader size="sm" />}
          <span>{workspaceSyncError ? `Workspace sync issue: ${workspaceSyncError}` : workspaceSyncStatus === 'saving' ? 'Saving changes to your authenticated AGRIPULSE workspace…' : workspaceSyncStatus === 'error' ? 'Workspace save failed. Changes may not be stored.' : workspaceSyncStatus === 'saved' ? `${session?.isDemo ? 'Development demo' : 'Account'} workspace synced to the AGRIPULSE API.` : 'Connecting to the AGRIPULSE workspace…'}</span>
        </div>
        {/* Verification & Seller Callout Banner */}
        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Store className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {sellerProfile.businessName}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  {session?.isDemo ? 'Demo profile · not verified' : 'Account profile · not verified'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                GSTIN / dealer licence: not verified • {session?.isDemo ? 'Sample location' : 'Business address'}: {[sellerProfile.city, sellerProfile.state].filter(Boolean).join(', ') || 'Not provided'} • Category: {sellerProfile.category || 'Not provided'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Sample rating · not actual reviews</span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Sample demo sales value</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900">₹—</div>
                <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Illustrative figure only · no actual sales</span>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Demo orders</span>
                  <Truck className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900">{orders.length} Orders</div>
                <div className="mt-1 text-[11px] text-slate-500">
                  <strong className="text-amber-700 font-bold">{pendingOrdersCount} awaiting dispatch</strong> • {completedOrdersCount} delivered
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Active Catalog SKUs</span>
                  <Package className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900">{myListedProductsCount} Demo listings</div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Seeds, Fertilizer lots, Spray equipment
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Sample fulfillment metric</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900">—</div>
                <div className="mt-1 text-[11px] text-emerald-700 font-medium">
                  Shipping and delivery are not connected
                </div>
              </div>
            </div>

            {/* Attention Alert for Pending Orders */}
            {pendingOrdersCount > 0 && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
                  <div>
                    <h2 className="text-xs font-bold text-amber-950">
                      Demo workflow: {pendingOrdersCount} sample order{pendingOrdersCount > 1 ? 's' : ''} awaiting a status change
                    </h2>
                    <p className="text-[11px] text-amber-800">
                      Status changes are local simulations only; no shipment or notification is created.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-xs whitespace-nowrap self-start sm:self-center"
                >
                  Process Orders Now →
                </button>
              </div>
            )}

            {/* Recent Orders Overview */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Recent Demo orders</h2>
                  <p className="text-xs text-slate-500">
                    Sample order records for interface preview; no payments or dispatches are processed.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  View All Orders ({orders.length}) <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Order ID & Date</th>
                      <th className="py-3 px-4">Farmer Customer</th>
                      <th className="py-3 px-4">Items Ordered</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.slice(0, 5).map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">
                          <div>{order.id}</div>
                          <div className="text-[10px] text-slate-400 font-sans">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">
                            {order.deliveryDetails.customerName}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {order.deliveryDetails.village}, {order.deliveryDetails.district}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="truncate max-w-xs text-slate-800 font-medium">
                            {order.items.map((i) => `${i.productName} (x${i.quantity})`).join(', ')}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {order.items.length} unique line item{order.items.length > 1 ? 's' : ''}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          ₹{(order.totalPayablePaise / 100).toLocaleString('en-IN')}
                          <div className="text-[10px] text-slate-400 font-normal">
                            {order.paymentMode.includes('UPI') ? 'UPI (demo)' : 'COD (demo)'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              order.orderStatus === 'Delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.orderStatus === 'Dispatched'
                                ? 'bg-sky-100 text-sky-800'
                                : order.orderStatus === 'Processing'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {order.orderStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setInvoiceOrder(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition mr-2"
                          >
                            <FileText className="w-3 h-3 text-slate-500" />
                            Invoice
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CATALOG & INVENTORY */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            {/* Catalog Toolbar */}
            <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setCatalogFilter('mine')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition ${
                      catalogFilter === 'mine'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    My Store Products ({myListedProductsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogFilter('all')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition ${
                      catalogFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Marketplace ({products.length})
                  </button>
                </div>

                <select
                  value={catalogCategory}
                  onChange={(e) => setCatalogCategory(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="All">All Categories</option>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Search by name, brand, SKU..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product</span>
                </button>
              </div>
            </div>

            {/* Catalog Grid / List */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  Showing {displayedProducts.length} product listing{displayedProducts.length === 1 ? '' : 's'}
                </span>
                <span className="text-[11px] text-slate-500">
                  {session?.isDemo ? 'Changes sync to the development demo workspace; listings are not published to a live storefront.' : 'Changes sync to your account workspace; listings are not published to a live storefront.'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Product Details</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Price (₹)</th>
                      <th className="py-3 px-4">Inventory Stock</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Inventory Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedProducts.map((prod) => (
                      <tr key={prod.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-sm">{prod.name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {prod.brand} • Pack: <span className="font-semibold">{prod.packSize}</span>
                          </div>
                          <div className="text-[10px] text-emerald-800 font-medium">
                            Seller: {prod.sellerName}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-medium">
                            {prod.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-sm">
                            ₹{(prod.pricePaise / 100).toLocaleString('en-IN')}
                          </div>
                          {prod.mrpPaise > prod.pricePaise && (
                            <div className="text-[10px] text-slate-400 line-through">
                              ₹{(prod.mrpPaise / 100).toLocaleString('en-IN')}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold ${
                                prod.stockCount <= 5 ? 'text-rose-600 font-extrabold' : 'text-slate-800'
                              }`}
                            >
                              {prod.stockCount} units
                            </span>
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleQuickStock(prod.id, -5)}
                                title="Decrease stock by 5"
                                className="w-5 h-5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold flex items-center justify-center text-[10px]"
                              >
                                -5
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickStock(prod.id, 5)}
                                title="Increase stock by 5"
                                className="w-5 h-5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold flex items-center justify-center text-[10px]"
                              >
                                +5
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleStock(prod.id)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition ${
                              prod.availability === 'In Stock' && prod.stockCount > 0
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                            }`}
                          >
                            {prod.availability === 'In Stock' && prod.stockCount > 0
                              ? '● In Stock'
                              : '○ Out of Stock'}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/store/product/${prod.id}`}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                              title="View Product Page in Store"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => deleteProduct(prod.id)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600"
                              title="Delete Product from Store"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ORDERS & DISPATCHES */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Filter toolbar */}
            <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                {['All', 'Placed', 'Processing', 'Dispatched', 'Delivered'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                      orderStatusFilter === st
                        ? 'bg-forest-950 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Total {filteredOrders.length} Order{filteredOrders.length === 1 ? '' : 's'}
              </div>
            </div>

            {/* Orders Cards */}
            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-slate-500">
                  <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-800">No orders found in this status</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Try switching filters or place a test order from the Farmer Store.
                  </p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-4 hover:border-slate-300 transition"
                  >
                    {/* Header line */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-950">
                            {order.id}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              order.orderStatus === 'Delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.orderStatus === 'Dispatched'
                                ? 'bg-sky-100 text-sky-800'
                                : order.orderStatus === 'Processing'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            ● {order.orderStatus}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Placed on {new Date(order.createdAt).toLocaleDateString()} at{' '}
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setInvoiceOrder(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          <span>Demo GST Invoice</span>
                        </button>
                      </div>
                    </div>

                    {/* Customer & Items detail */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {/* Farmer info */}
                      <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Buyer Farmer Details
                        </span>
                        <div className="font-bold text-slate-900 text-sm">
                          {order.deliveryDetails.customerName}
                        </div>
                        <div className="text-slate-600">
                          📞 {order.deliveryDetails.mobileNumber}
                        </div>
                        <div className="text-slate-500 leading-tight">
                          📍 {order.deliveryDetails.deliveryAddress}, {order.deliveryDetails.village},{' '}
                          {order.deliveryDetails.district}, {order.deliveryDetails.state} -{' '}
                          {order.deliveryDetails.pinCode}
                        </div>
                      </div>

                      {/* Items */}
                      <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 md:col-span-2 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Dispatched Line Items ({order.items.length})
                        </span>
                        <div className="divide-y divide-slate-200">
                          {order.items.map((it) => (
                            <div key={it.productId} className="py-1.5 flex items-center justify-between">
                              <div>
                                <span className="font-semibold text-slate-900">{it.productName}</span>
                                <span className="text-[11px] text-slate-500 ml-2">
                                  ({it.packSize}) × {it.quantity}
                                </span>
                              </div>
                              <span className="font-bold text-slate-900">
                                ₹{(it.lineTotalPaise / 100).toLocaleString('en-IN')}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-sm text-slate-950">
                          <span>
                            Total Value ({order.paymentMode.includes('UPI') ? 'UPI' : 'COD'})
                          </span>
                          <span>₹{(order.totalPayablePaise / 100).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Advance Workflow Controls */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                      <div className="text-xs text-slate-500">
                        Dispatch Stage:{' '}
                        <strong className="text-slate-800">{order.orderStatus}</strong>
                      </div>

                      <div className="flex items-center gap-2">
                        {order.orderStatus === 'Placed' && (
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(order.id, 'Processing')}
                            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition"
                          >
                            📦 Pack & Process Order
                          </button>
                        )}
                        {order.orderStatus === 'Processing' && (
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(order.id, 'Dispatched')}
                            className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition"
                          >
                            🚚 Mark as Dispatched (Assign Tracking ID)
                          </button>
                        )}
                        {order.orderStatus === 'Dispatched' && (
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(order.id, 'Delivered')}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                          >
                            ✅ Confirm Delivered (simulate)
                          </button>
                        )}
                        {order.orderStatus === 'Delivered' && (
                          <span className="text-xs text-emerald-800 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Order Successfully Fulfilled
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: PAYOUTS */}
        {activeTab === 'payouts' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                  Payout integration
                </span>
                <div className="text-2xl font-extrabold text-slate-900">Not connected</div>
                <p className="text-[11px] text-slate-500 mt-1">No funds are collected or transferred in this demo.</p>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                  Settlement schedule
                </span>
                <div className="text-2xl font-extrabold text-slate-900">Unavailable</div>
                <p className="text-[11px] text-slate-500 font-semibold mt-1">
                  Requires a production payment provider and verified seller account.
                </p>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                  Bank account
                </span>
                <div className="text-sm font-bold text-slate-900">Not collected in this prototype</div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Never enter bank credentials in the browser demo.
                </p>
              </div>
            </div>

            {/* Payout records */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900">Settlement Transaction History</h2>
                <p className="text-xs text-slate-500">Illustrative sample rows only · no settlement service is connected</p>
              </div>

              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Cycle Period</th>
                    <th className="py-3 px-4">Sample reference (not a UTR)</th>
                    <th className="py-3 px-4">Delivered Orders</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">Oct 01 – Oct 07, 2026</td>
                    <td className="py-3 px-4 font-mono text-slate-600">DEMO-SETTLEMENT-001</td>
                    <td className="py-3 px-4">9 orders</td>
                    <td className="py-3 px-4 font-bold text-emerald-800">₹94,200</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Demo only
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">Sep 24 – Sep 30, 2026</td>
                    <td className="py-3 px-4 font-mono text-slate-600">DEMO-SETTLEMENT-002</td>
                    <td className="py-3 px-4">12 orders</td>
                    <td className="py-3 px-4 font-bold text-emerald-800">₹1,22,500</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Demo only
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">Sep 17 – Sep 23, 2026</td>
                    <td className="py-3 px-4 font-mono text-slate-600">DEMO-SETTLEMENT-003</td>
                    <td className="py-3 px-4">8 orders</td>
                    <td className="py-3 px-4 font-bold text-emerald-800">₹97,800</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Demo only
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs max-w-3xl space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">Store Profile & Tax Identity</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update your enterprise details as displayed on farmer invoices and catalog listings.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Business Name</label>
                  <input
                    type="text"
                    value={sellerProfile.businessName}
                    onChange={(e) => updateSellerProfile({ businessName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Authorized Contact</label>
                  <input
                    type="text"
                    value={sellerProfile.contactPerson}
                    onChange={(e) => updateSellerProfile({ contactPerson: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Registered GSTIN</label>
                  <input
                    type="text"
                    value={sellerProfile.gstin}
                    onChange={(e) => updateSellerProfile({ gstin: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">License Number</label>
                  <input
                    type="text"
                    value={sellerProfile.licenseNumber || ''}
                    onChange={(e) => updateSellerProfile({ licenseNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Dispatch Yard Address</label>
                  <input
                    type="text"
                    value={sellerProfile.address}
                    onChange={(e) => updateSellerProfile({ address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {workspaceSyncStatus === 'saving' ? 'Saving to server…' : workspaceSyncStatus === 'error' ? 'Server save failed' : 'Auto-saved to account workspace'}
                </span>
                <span className="text-xs font-semibold text-slate-600">Profile fields auto-save when the server sync completes.</span>
              </div>
            </div>
          </div>
        )}
        </main>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="fixed inset-0 bg-slate-900/60 cursor-default"
            onClick={closeMobileNav}
            aria-label="Close seller navigation menu"
          />
          <aside
            ref={mobileDrawerRef}
            id="seller-mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Seller portal navigation"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                closeMobileNav();
                return;
              }
              if (event.key !== 'Tab') return;
              const focusable = mobileDrawerRef.current?.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
              );
              if (!focusable?.length) return;
              const first = focusable[0];
              const last = focusable[focusable.length - 1];
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
              }
            }}
            className="relative z-10 flex h-full w-72 max-w-[82vw] flex-col bg-forest-950 text-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-forest-800 p-4">
              <Link to="/seller" onClick={() => { setActiveTab('overview'); closeMobileNav(); }} aria-label="Seller dashboard overview">
                <AgriPulseLogo size="sm" theme="light" />
              </Link>
              <button
                ref={mobileDrawerCloseButtonRef}
                type="button"
                onClick={closeMobileNav}
                aria-label="Close seller navigation menu"
                className="rounded-lg p-1.5 text-forest-200 hover:bg-forest-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3" aria-label="Seller portal sections">
              {renderNavigationGroups(true)}
            </nav>

            {session?.isDemo && (
              <div className="space-y-2 border-t border-forest-800 p-3">
                <button
                  type="button"
                  onClick={() => { closeMobileNav(); void handleSwitchToFarmerPortal('/home'); }}
                  className="app-seller-switch flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition"
                >
                  <Sprout className="h-4 w-4" />
                  <span>Switch to Farmer Portal</span>
                </button>
                <button
                  type="button"
                  onClick={() => { closeMobileNav(); void handleSwitchToFarmerPortal('/store'); }}
                  className="flex w-full items-center gap-3 rounded-xl border border-forest-700 bg-forest-900 px-3 py-2.5 text-xs font-semibold text-forest-200 transition hover:bg-forest-800 hover:text-white"
                >
                  <Eye className="h-4 w-4 text-leaf-300" />
                  <span>Preview Farmer Store</span>
                </button>
              </div>
            )}

            <div className="app-sidebar-footer border-t border-forest-800 p-3">
              <div className="rounded-lg border border-forest-800 bg-forest-900/90 px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="truncate text-[11px] font-semibold text-white"
                    title={sellerProfile.contactPerson || sellerProfile.businessName}
                  >
                    {sellerProfile.contactPerson || sellerProfile.businessName || 'Seller account'}
                  </span>
                  <span className="shrink-0 rounded border border-leaf-500/30 bg-leaf-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-leaf-300">
                    {session?.isDemo ? 'Demo' : 'Account'}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[10px] text-forest-200" title={sellerProfile.businessName}>
                  {sellerProfile.businessName || 'Business name not provided'}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-forest-300">
                  {[sellerProfile.city, sellerProfile.state].filter(Boolean).join(', ') || 'Business location not provided'}
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}

      <nav
        aria-label="Seller mobile navigation"
        className="app-mobile-bottom-nav lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 px-2 py-1.5 grid grid-cols-5 gap-1 shadow-lg"
      >
        {SELLER_NAV_GROUPS.flatMap((group) => group.items).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              title={item.title}
              className={`flex min-w-0 flex-col items-center justify-center rounded-lg py-1 text-[10px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500 ${isActive ? 'bg-forest-50 text-forest-800' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Icon className="mb-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="max-w-full truncate">{item.mobileLabel}</span>
            </button>
          );
        })}
      </nav>

      {/* ADD PRODUCT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="bg-forest-950 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  Add New Product to Store Catalog
                </h3>
                <p className="text-xs text-forest-300 mt-0.5">
                  This product will be instantly visible in the Farmer Marketplace
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-forest-800 text-forest-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="e.g., Pusa Tejas Foundation Wheat Seed Lot"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {PRODUCT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Brand Name</label>
                  <input
                    type="text"
                    value={newProdBrand}
                    onChange={(e) => setNewProdBrand(e.target.value)}
                    placeholder="e.g., Karnal Kisan Agro (Co-op)"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pack Size / Unit</label>
                  <input
                    type="text"
                    value={newProdPackSize}
                    onChange={(e) => setNewProdPackSize(e.target.value)}
                    placeholder="e.g., 40 kg Bag, 1 Litre Bottle"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stock Quantity (Units)</label>
                  <input
                    type="number"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    placeholder="50"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    value={newProdPriceRs}
                    onChange={(e) => setNewProdPriceRs(e.target.value)}
                    placeholder="1450"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">MRP (₹)</label>
                  <input
                    type="number"
                    value={newProdMrpRs}
                    onChange={(e) => setNewProdMrpRs(e.target.value)}
                    placeholder="1650"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Short Description & Benefits
                </label>
                <textarea
                  rows={2}
                  value={newProdShortDesc}
                  onChange={(e) => setNewProdShortDesc(e.target.value)}
                  placeholder="Certified high-germination seed lot tested for rust resistance and high yields."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Agronomic Usage Guidelines (For Farmer)
                </label>
                <input
                  type="text"
                  value={newProdUsage}
                  onChange={(e) => setNewProdUsage(e.target.value)}
                  placeholder="e.g., Sowing rate 40 kg/acre with seed drill at 4-5 cm depth."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm transition"
                >
                  Publish Product Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEMO GST INVOICE MODAL */}
      {invoiceOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-sm">Simulated Commercial GST Tax Invoice</span>
              </div>
              <button
                type="button"
                onClick={() => setInvoiceOrder(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs text-slate-800">
              {/* Invoice Meta */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h4 className="font-extrabold text-base text-slate-950">
                    {sellerProfile.businessName}
                  </h4>
                  <p className="text-slate-500">{sellerProfile.address}</p>
                  <p className="text-slate-500">
                    GSTIN: <span className="font-mono font-bold text-slate-800">{sellerProfile.gstin}</span>
                  </p>
                  <p className="text-slate-500">License: {sellerProfile.licenseNumber}</p>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-sm text-slate-900">
                    INV-{invoiceOrder.id.replace('ORD-', '')}
                  </div>
                  <div className="text-slate-500">
                    Date: {new Date(invoiceOrder.createdAt).toLocaleDateString()}
                  </div>
                  <div className="mt-1 inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    Status: {invoiceOrder.orderStatus}
                  </div>
                </div>
              </div>

              {/* Bill to */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Billed & Shipped To (Farmer)
                </span>
                <div className="font-bold text-slate-900 text-sm">
                  {invoiceOrder.deliveryDetails.customerName}
                </div>
                <div className="text-slate-600">
                  {invoiceOrder.deliveryDetails.deliveryAddress}, {invoiceOrder.deliveryDetails.village},{' '}
                  {invoiceOrder.deliveryDetails.district}, {invoiceOrder.deliveryDetails.state} -{' '}
                  {invoiceOrder.deliveryDetails.pinCode}
                </div>
                <div className="text-slate-500 mt-0.5">
                  Mobile: {invoiceOrder.deliveryDetails.mobileNumber}
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-[11px] font-bold text-slate-600">
                  <tr>
                    <th className="p-2.5">Item Description</th>
                    <th className="p-2.5 text-center">HSN</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Rate</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoiceOrder.items.map((item) => (
                    <tr key={item.productId}>
                      <td className="p-2.5 font-medium text-slate-900">
                        {item.productName}
                        <div className="text-[10px] text-slate-400">{item.packSize}</div>
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-500">1209</td>
                      <td className="p-2.5 text-center font-semibold">{item.quantity}</td>
                      <td className="p-2.5 text-right font-mono">
                        ₹{(item.unitPricePaise / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-950 font-mono">
                        ₹{(item.lineTotalPaise / 100).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Calculations */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Subtotal:</span>
                    <span>₹{(invoiceOrder.subtotalPaise / 100).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST (2.5%):</span>
                    <span>₹{(invoiceOrder.subtotalPaise * 0.025 / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST (2.5%):</span>
                    <span>₹{(invoiceOrder.subtotalPaise * 0.025 / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-950 text-sm pt-2 border-t border-slate-200">
                    <span>Total Invoice Value:</span>
                    <span>₹{(invoiceOrder.totalPayablePaise / 100).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-3 flex items-center justify-between">
                <span>Computer-generated tax invoice · AGRIPULSE demo seller workspace</span>
                <button
                  type="button"
                  onClick={() => window.print?.()}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold transition flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
