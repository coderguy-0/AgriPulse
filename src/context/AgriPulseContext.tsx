import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AuthSession,
  CartItem,
  ChatMessage,
  CheckoutAddressDraft,
  CropRecord,
  DemoOrder,
  DictionaryEntry,
  DiseaseReport,
  DeviceEvent,
  DeviceMetadataPatch,
  DeviceRegistrationInput,
  DeviceStatus,
  IoTDevice,
  TelemetryReading,
  Farm,
  FarmActivity,
  FarmerProfile,
  FarmerRegistrationRequest,
  SellerRegistrationRequest,
  FarmPlot,
  FieldObservation,
  GovernmentScheme,
  NewsArticle,
  OrderStatus,
  PortalType,
  RainfallLog,
  SellerProfile,
  StoreProduct,
  WeatherSnapshot,
} from '../types';
import {
  INITIAL_CHAT_MESSAGES,
  loadInitialDataSnapshot,
  resetAllDemoDataToSeed,
  safeWriteStorage,
  STORAGE_KEYS,
} from '../services/storageService';
import { SEED_DICTIONARY_ENTRIES } from '../data/seedDictionary';
import { SEED_GOVERNMENT_SCHEMES, SEED_NEWS_ARTICLES } from '../data/seedNewsAndSchemes';
import { VALID_DEMO_PROMO_CODES } from '../data/seedProducts';
import { authApi, deviceApi, workspaceApi } from '../services/apiClient';

export const DEMO_MODE_ENABLED = import.meta.env.VITE_DEMO_MODE !== 'false';
export const DEMO_FARMER_EMAIL = 'farmer.demo@agripulse.in';
export const DEMO_SELLER_EMAIL = 'seller.demo@agripulse.in';
export const DEMO_PASSWORD = 'AgriPulseDemo!2026';
export const DEMO_ACCOUNT_EMAIL = DEMO_FARMER_EMAIL;

const EMPTY_CHECKOUT_DRAFT: CheckoutAddressDraft = {
  customerName: '',
  mobileNumber: '',
  deliveryAddress: '',
  village: '',
  district: '',
  state: '',
  pinCode: '',
  deliveryInstructions: '',
  promoCode: '',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const workspaceList = <T,>(data: Record<string, unknown>, key: string): T[] =>
  Array.isArray(data[key]) ? data[key] as T[] : [];

interface CartTotals {
  subtotalPaise: number;
  shippingPaise: number;
  discountPaise: number;
  totalPayablePaise: number;
  appliedPromoDescription?: string;
  itemCount: number;
}

interface AgriPulseContextValue {
  // Auth
  session: AuthSession | null;
  sessionLoading: boolean;
  workspaceHydrated: boolean;
  workspaceSyncStatus: 'idle' | 'loading' | 'saving' | 'saved' | 'error';
  workspaceSyncError: string | null;
  loginWithCredentials: (
    email: string,
    password: string,
    rememberMe: boolean,
    intendedPortal?: PortalType
  ) => Promise<{ ok: boolean; portal: PortalType; error?: string }>;
  loginAsSellerDemo: () => Promise<{ ok: boolean; portal: PortalType; error?: string }>;
  loginAsFarmerDemo: () => Promise<{ ok: boolean; portal: PortalType; error?: string }>;
  registerSeller: (sellerData: SellerRegistrationRequest) => Promise<{ ok: boolean; error?: string }>;
  registerFarmer: (farmerData: FarmerRegistrationRequest) => Promise<{ ok: boolean; error?: string }>;
  switchPortal: (target: PortalType) => Promise<boolean>;
  logout: () => Promise<void>;

  // Seller Profile & Catalog Management
  sellerProfile: SellerProfile;
  updateSellerProfile: (updated: Partial<SellerProfile>) => void;
  addProduct: (product: Omit<StoreProduct, 'id'>) => StoreProduct;
  updateProduct: (product: StoreProduct) => void;
  deleteProduct: (productId: string) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;

  // Profile & Preferences (Farmer)
  profile: FarmerProfile;
  updateProfile: (updated: FarmerProfile) => void;
  resetAllDemoData: () => void;

  // Farms, Plots, Crops, Observations, Activities
  farms: Farm[];
  activeFarmId: string;
  activeFarm: Farm | undefined;
  setActiveFarmId: (farmId: string) => void;
  addFarm: (farm: Omit<Farm, 'id' | 'createdAt' | 'updatedAt'>) => Farm;
  updateFarm: (farm: Farm) => void;
  archiveFarm: (farmId: string, archive: boolean) => void;
  deleteFarm: (farmId: string) => void;

  plots: FarmPlot[];
  addPlot: (plot: Omit<FarmPlot, 'id'>) => FarmPlot;
  deletePlot: (plotId: string) => void;

  crops: CropRecord[];
  addCropRecord: (crop: Omit<CropRecord, 'id' | 'createdAt'>) => CropRecord;
  updateCropRecord: (crop: CropRecord) => void;
  deleteCropRecord: (cropId: string) => void;

  observations: FieldObservation[];
  addObservation: (obs: Omit<FieldObservation, 'id'>) => FieldObservation;
  deleteObservation: (obsId: string) => void;

  activities: FarmActivity[];
  addActivity: (act: Omit<FarmActivity, 'id'>) => FarmActivity;
  updateActivity: (act: FarmActivity) => void;
  toggleActivityComplete: (actId: string) => void;
  deleteActivity: (actId: string) => void;

  // Device identity, pairing, events and telemetry are server-owned.
  devices: IoTDevice[];
  devicesLoading: boolean;
  deviceApiError: string | null;
  refreshDevices: () => Promise<void>;
  deviceEvents: DeviceEvent[];
  telemetryCache: TelemetryReading[];
  registerDevice: (input: DeviceRegistrationInput) => Promise<IoTDevice>;
  updateDeviceMetadata: (deviceId: string, patch: DeviceMetadataPatch) => Promise<void>;
  assignDeviceGateway: (deviceId: string, gatewayId?: string) => Promise<boolean>;
  retireDevice: (deviceId: string) => Promise<void>;

  // Weather & Rainfall
  weather: WeatherSnapshot;
  setWeather: (w: WeatherSnapshot) => void;
  rainfallLogs: RainfallLog[];
  addRainfallLog: (log: Omit<RainfallLog, 'id'>) => void;
  deleteRainfallLog: (id: string) => void;

  // Disease Reports
  diseaseReports: DiseaseReport[];
  addDiseaseReport: (
    report: Omit<DiseaseReport, 'id' | 'createdAt' | 'updatedAt'>
  ) => DiseaseReport;
  updateDiseaseReportStatus: (
    reportId: string,
    status: DiseaseReport['status'],
    expertNotes?: string
  ) => void;

  // Dictionary
  dictionary: DictionaryEntry[];
  dictBookmarks: string[];
  toggleDictBookmark: (termId: string) => void;
  dictRecent: string[];
  recordDictView: (termId: string) => void;

  // Store, Cart, Wishlist, Orders
  products: StoreProduct[];
  cart: CartItem[];
  addToCart: (productId: string, quantity?: number) => { ok: boolean; message: string };
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  calculateCartTotals: (promoCode?: string) => CartTotals;

  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  recentProducts: string[];
  recordProductView: (productId: string) => void;
  addStoreProductReview: (
    productId: string,
    review: { userName: string; rating: number; title: string; comment: string }
  ) => void;

  checkoutDraft: CheckoutAddressDraft;
  updateCheckoutDraft: (draft: Partial<CheckoutAddressDraft>) => void;

  orders: DemoOrder[];
  placeDemoOrder: (
    paymentMode: DemoOrder['paymentMode'],
    promoCode?: string
  ) => { ok: boolean; order?: DemoOrder; error?: string };
  cancelDemoOrder: (orderId: string) => void;

  // News & Schemes
  newsArticles: NewsArticle[];
  newsBookmarks: string[];
  toggleNewsBookmark: (articleId: string) => void;
  schemes: GovernmentScheme[];

  // AI Chatbox
  chatHistory: ChatMessage[];
  appendChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearChatHistory: () => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  pendingChatPrompt: string | null;
  openChatWithPrompt: (prompt?: string) => void;
  clearPendingChatPrompt: () => void;
}

const AgriPulseContext = createContext<AgriPulseContextValue | undefined>(undefined);

export const AgriPulseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialSnapshot = useMemo(() => loadInitialDataSnapshot(), []);
  const workspaceRevisionRef = useRef(0);
  const workspaceWriteQueue = useRef<Promise<void>>(Promise.resolve());
  const hydrationGeneration = useRef(0);

  const [session, setSession] = useState<AuthSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [workspaceHydrated, setWorkspaceHydrated] = useState(false);
  const [workspaceSyncStatus, setWorkspaceSyncStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle');
  const [workspaceSyncError, setWorkspaceSyncError] = useState<string | null>(null);
  const [profile, setProfile] = useState<FarmerProfile>(initialSnapshot.profile);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile>(initialSnapshot.sellerProfile);
  const [farms, setFarms] = useState<Farm[]>(initialSnapshot.farms);
  const [plots, setPlots] = useState<FarmPlot[]>(initialSnapshot.plots);
  const [crops, setCrops] = useState<CropRecord[]>(initialSnapshot.crops);
  const [observations, setObservations] = useState<FieldObservation[]>(
    initialSnapshot.observations
  );
  const [activities, setActivities] = useState<FarmActivity[]>(initialSnapshot.activities);
  const [weather, setWeatherState] = useState<WeatherSnapshot>(initialSnapshot.weather);
  const [devices, setDevices] = useState<IoTDevice[]>(initialSnapshot.devices);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [deviceApiError, setDeviceApiError] = useState<string | null>(null);
  const [deviceEvents, setDeviceEvents] = useState<DeviceEvent[]>(initialSnapshot.deviceEvents);
  const [telemetryCache, setTelemetryCache] = useState<TelemetryReading[]>(initialSnapshot.telemetryCache);
  const [rainfallLogs, setRainfallLogs] = useState<RainfallLog[]>(initialSnapshot.rainfallLogs);
  const [diseaseReports, setDiseaseReports] = useState<DiseaseReport[]>(
    initialSnapshot.diseaseReports
  );
  const [dictBookmarks, setDictBookmarks] = useState<string[]>(initialSnapshot.dictBookmarks);
  const [dictRecent, setDictRecent] = useState<string[]>(initialSnapshot.dictRecent);
  const [products, setProducts] = useState<StoreProduct[]>(initialSnapshot.products);
  const [cart, setCart] = useState<CartItem[]>(initialSnapshot.cart);
  const [wishlist, setWishlist] = useState<string[]>(initialSnapshot.wishlist);
  const [recentProducts, setRecentProducts] = useState<string[]>(initialSnapshot.recentProducts);
  const [checkoutDraft, setCheckoutDraft] = useState<CheckoutAddressDraft>(
    initialSnapshot.checkoutDraft
  );
  const [orders, setOrders] = useState<DemoOrder[]>(initialSnapshot.orders);
  const [newsBookmarks, setNewsBookmarks] = useState<string[]>(initialSnapshot.newsBookmarks);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(initialSnapshot.chatHistory);

  const [activeFarmId, setActiveFarmIdState] = useState<string>(() => {
    const defId = initialSnapshot.profile.preferences.defaultFarmId;
    const exists = initialSnapshot.farms.some((f) => f.id === defId && !f.isArchived);
    if (exists) return defId;
    return initialSnapshot.farms.find((f) => !f.isArchived)?.id || initialSnapshot.farms[0]?.id || '';
  });

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [pendingChatPrompt, setPendingChatPrompt] = useState<string | null>(null);

  const makeWorkspacePayload = (): Record<string, unknown> => {
    const { bankAccountName: _bankName, bankAccountNumber: _bankNumber, ifscCode: _ifsc, ...safeSellerProfile } = sellerProfile;
    return {
      schemaVersion: 1,
      profile,
      sellerProfile: { ...safeSellerProfile, isVerified: false, isDemoSeller: Boolean(session?.isDemo) },
      farms,
      plots,
      crops,
      observations,
      activities,
      rainfallLogs,
      diseaseReports,
      dictBookmarks,
      dictRecent,
      products,
      cart,
      wishlist,
      recentProducts,
      checkoutDraft,
      orders,
      newsBookmarks,
      chatHistory,
      activeFarmId,
    };
  };

  const makeEmptyWorkspace = (currentSession: AuthSession): Record<string, unknown> => {
    const profileFallback: FarmerProfile = {
      id: currentSession.userId,
      name: currentSession.farmerName || '',
      email: currentSession.email,
      mobile: '',
      state: '',
      district: '',
      village: '',
      isDemoAccount: false,
      joinedDate: new Date().toISOString().slice(0, 10),
      preferences: {
        language: 'en',
        preferredAreaUnit: 'acre',
        bighaToAcreFactor: 0.25,
        bighaRegionLabel: 'Regional Bigha (confirm locally)',
        defaultFarmId: '',
        defaultCrop: '',
        weatherLocation: { state: '', district: '', locality: '' },
        notifications: { weatherAlerts: true, irrigationReminders: true, cropInspectionAlerts: true, orderUpdates: true, schemeUpdates: true },
      },
    };
    const { bankAccountName: _bankName, bankAccountNumber: _bankNumber, ifscCode: _ifsc, ...safeSellerProfile } = initialSnapshot.sellerProfile;
    return {
      schemaVersion: 1,
      profile: profileFallback,
      sellerProfile: { ...safeSellerProfile, id: currentSession.userId, email: currentSession.email, businessName: '', isVerified: false, isDemoSeller: false },
      farms: [], plots: [], crops: [], observations: [], activities: [], rainfallLogs: [], diseaseReports: [],
      dictBookmarks: [], dictRecent: [], products: initialSnapshot.products, cart: [], wishlist: [],
      recentProducts: [], checkoutDraft: EMPTY_CHECKOUT_DRAFT, orders: [], newsBookmarks: [], chatHistory: [],
      activeFarmId: '',
    };
  };

  const applyWorkspace = (data: Record<string, unknown>, currentSession: AuthSession) => {
    const profileData = isRecord(data.profile) ? data.profile as Partial<FarmerProfile> : undefined;
    const profilePreferences = isRecord(profileData?.preferences) ? profileData.preferences : {};
    const farmerProfile: FarmerProfile = {
      ...(currentSession.isDemo ? initialSnapshot.profile : {
        id: currentSession.userId, name: currentSession.farmerName || '', email: currentSession.email,
        mobile: '', state: '', district: '', village: '', joinedDate: new Date().toISOString().slice(0, 10),
        preferences: initialSnapshot.profile.preferences,
      }),
      ...profileData,
      id: currentSession.userId,
      email: profileData?.email || currentSession.email,
      isDemoAccount: currentSession.isDemo,
      preferences: { ...initialSnapshot.profile.preferences, ...profilePreferences } as FarmerProfile['preferences'],
    } as FarmerProfile;
    const sellerData = isRecord(data.sellerProfile) ? data.sellerProfile as Partial<SellerProfile> : undefined;
    const sellerBase: SellerProfile = currentSession.isDemo
      ? initialSnapshot.sellerProfile
      : { ...initialSnapshot.sellerProfile, id: currentSession.userId, businessName: '', tradeName: '', contactPerson: '', email: currentSession.email, mobile: '', category: '', gstin: '', licenseNumber: '', state: '', district: '', city: '', address: '', pincode: '', isDemoSeller: false, isVerified: false, rating: 0, totalOrders: 0, totalRevenuePaise: 0 };
    setProfile(farmerProfile);
    setSellerProfile({ ...sellerBase, ...sellerData, id: currentSession.userId, email: sellerData?.email || currentSession.email, bankAccountName: '', bankAccountNumber: '', ifscCode: '', isVerified: false, isDemoSeller: currentSession.isDemo } as SellerProfile);
    setFarms(workspaceList<Farm>(data, 'farms'));
    setPlots(workspaceList<FarmPlot>(data, 'plots'));
    setCrops(workspaceList<CropRecord>(data, 'crops'));
    setObservations(workspaceList<FieldObservation>(data, 'observations'));
    setActivities(workspaceList<FarmActivity>(data, 'activities'));
    setRainfallLogs(workspaceList<RainfallLog>(data, 'rainfallLogs'));
    setDiseaseReports(workspaceList<DiseaseReport>(data, 'diseaseReports'));
    setDictBookmarks(workspaceList<string>(data, 'dictBookmarks'));
    setDictRecent(workspaceList<string>(data, 'dictRecent'));
    setProducts(Array.isArray(data.products) ? data.products as StoreProduct[] : initialSnapshot.products);
    setCart(workspaceList<CartItem>(data, 'cart'));
    setWishlist(workspaceList<string>(data, 'wishlist'));
    setRecentProducts(workspaceList<string>(data, 'recentProducts'));
    const checkoutDefaults = currentSession.isDemo ? initialSnapshot.checkoutDraft : EMPTY_CHECKOUT_DRAFT;
    const checkoutData = isRecord(data.checkoutDraft) ? data.checkoutDraft : {};
    setCheckoutDraft({
      customerName: typeof checkoutData.customerName === 'string' ? checkoutData.customerName : checkoutDefaults.customerName,
      mobileNumber: typeof checkoutData.mobileNumber === 'string' ? checkoutData.mobileNumber : checkoutDefaults.mobileNumber,
      deliveryAddress: typeof checkoutData.deliveryAddress === 'string' ? checkoutData.deliveryAddress : checkoutDefaults.deliveryAddress,
      village: typeof checkoutData.village === 'string' ? checkoutData.village : checkoutDefaults.village,
      district: typeof checkoutData.district === 'string' ? checkoutData.district : checkoutDefaults.district,
      state: typeof checkoutData.state === 'string' ? checkoutData.state : checkoutDefaults.state,
      pinCode: typeof checkoutData.pinCode === 'string' ? checkoutData.pinCode : checkoutDefaults.pinCode,
      deliveryInstructions: typeof checkoutData.deliveryInstructions === 'string' ? checkoutData.deliveryInstructions : checkoutDefaults.deliveryInstructions,
      promoCode: typeof checkoutData.promoCode === 'string' ? checkoutData.promoCode : checkoutDefaults.promoCode,
    });
    setOrders(workspaceList<DemoOrder>(data, 'orders'));
    setNewsBookmarks(workspaceList<string>(data, 'newsBookmarks'));
    setChatHistory(workspaceList<ChatMessage>(data, 'chatHistory'));
    setWeatherState(initialSnapshot.weather);
    setTelemetryCache([]);
    setDeviceEvents([]);
    const preferredFarmId = typeof data.activeFarmId === 'string' ? data.activeFarmId : farmerProfile.preferences.defaultFarmId;
    setActiveFarmIdState(preferredFarmId || workspaceList<Farm>(data, 'farms').find((farm) => !farm.isArchived)?.id || '');
  };

  const hydrateWorkspace = async (currentSession: AuthSession, providedWorkspace?: Awaited<ReturnType<typeof workspaceApi.get>>) => {
    const generation = ++hydrationGeneration.current;
    setWorkspaceSyncStatus('loading');
    setWorkspaceSyncError(null);
    try {
      let remote = providedWorkspace || await workspaceApi.get();
      if (!remote.initialized) {
        const initialData = currentSession.isDemo ? makeWorkspacePayload() : makeEmptyWorkspace(currentSession);
        remote = await workspaceApi.save(initialData, remote.revision);
      }
      if (generation !== hydrationGeneration.current) return;
      workspaceRevisionRef.current = remote.revision;
      applyWorkspace(remote.data, currentSession);
      if (currentSession.portalType === 'farmer') {
        setDevicesLoading(true);
        try {
          const response = await deviceApi.list();
          if (generation === hydrationGeneration.current) {
            setDevices(response.devices);
            setDeviceApiError(null);
          }
        } catch (error) {
          if (generation === hydrationGeneration.current) {
            setDeviceApiError(error instanceof Error ? error.message : 'Device API is unavailable.');
            if (!currentSession.isDemo) setDevices([]);
          }
        } finally {
          if (generation === hydrationGeneration.current) setDevicesLoading(false);
        }
      }
      if (generation === hydrationGeneration.current) {
        setWorkspaceHydrated(true);
        setWorkspaceSyncStatus('saved');
      }
    } catch (error) {
      if (generation !== hydrationGeneration.current) return;
      const message = error instanceof Error ? error.message : 'Unable to load the account workspace.';
      setWorkspaceSyncError(message);
      setWorkspaceSyncStatus('error');
      if (!currentSession.isDemo) applyWorkspace(makeEmptyWorkspace(currentSession), currentSession);
      setWorkspaceHydrated(true);
    }
  };

  const refreshDevices = async (currentSession: AuthSession | null = session) => {
    if (!currentSession || currentSession.portalType !== 'farmer') return;
    setDevicesLoading(true);
    try {
      const response = await deviceApi.list();
      setDevices(response.devices);
      setDeviceApiError(null);
    } catch (error) {
      setDeviceApiError(error instanceof Error ? error.message : 'Device API is unavailable.');
    } finally {
      setDevicesLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    authApi.session()
      .then(async ({ session: existingSession }) => {
        if (!mounted) return;
        if (existingSession) {
          setSession(existingSession);
          await hydrateWorkspace(existingSession);
        }
      })
      .catch((error) => {
        if (mounted) {
          setWorkspaceSyncStatus('error');
          setWorkspaceSyncError(error instanceof Error ? error.message : 'Could not reach the AGRIPULSE API.');
        }
      })
      .finally(() => {
        if (mounted) setSessionLoading(false);
      });
    return () => {
      mounted = false;
      hydrationGeneration.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!session || !workspaceHydrated) return;
    const payload = makeWorkspacePayload();
    const timer = window.setTimeout(() => {
      setWorkspaceSyncStatus('saving');
      workspaceWriteQueue.current = workspaceWriteQueue.current
        .catch(() => undefined)
        .then(async () => {
          try {
            const result = await workspaceApi.save(payload, workspaceRevisionRef.current);
            workspaceRevisionRef.current = result.revision;
            setWorkspaceSyncStatus('saved');
            setWorkspaceSyncError(null);
          } catch (error) {
            setWorkspaceSyncStatus('error');
            setWorkspaceSyncError(error instanceof Error ? error.message : 'Workspace changes could not be saved.');
          }
        });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [session, workspaceHydrated, profile, sellerProfile, farms, plots, crops, observations, activities, rainfallLogs, diseaseReports, dictBookmarks, dictRecent, products, cart, wishlist, recentProducts, checkoutDraft, orders, newsBookmarks, chatHistory, activeFarmId]);

  // Sync activeFarmId if farms list changes
  useEffect(() => {
    const activeExists = farms.some((f) => f.id === activeFarmId && !f.isArchived);
    if (!activeExists) {
      const next = farms.find((f) => !f.isArchived) || farms[0];
      setActiveFarmIdState(next ? next.id : '');
    }
  }, [farms, activeFarmId]);

  const activeFarm = useMemo(
    () => farms.find((f) => f.id === activeFarmId) || farms.find((f) => !f.isArchived),
    [farms, activeFarmId]
  );

  const loginWithCredentials = async (
    email: string,
    password: string,
    rememberMe: boolean,
    intendedPortal: PortalType = 'farmer'
  ): Promise<{ ok: boolean; portal: PortalType; error?: string }> => {
    try {
      const response = await authApi.login({ email, password, rememberMe, portalType: intendedPortal });
      setSession(response.session);
      setSessionLoading(false);
      await hydrateWorkspace(response.session, response.workspace);
      return { ok: true, portal: response.session.portalType || intendedPortal };
    } catch (error) {
      return {
        ok: false,
        portal: intendedPortal,
        error: error instanceof Error ? error.message : 'Sign-in failed. Check your details and try again.',
      };
    }
  };

  const openDemoPortal = async (portal: PortalType): Promise<{ ok: boolean; portal: PortalType; error?: string }> => {
    if (!DEMO_MODE_ENABLED) return { ok: false, portal, error: 'Development demo access is disabled in this environment.' };
    try {
      const response = await authApi.demoSession(portal);
      setSession(response.session);
      setSessionLoading(false);
      await hydrateWorkspace(response.session);
      return { ok: true, portal };
    } catch (error) {
      return {
        ok: false,
        portal,
        error: error instanceof Error ? error.message : 'Could not open the development demo workspace.',
      };
    }
  };

  const loginAsSellerDemo = async (): Promise<{ ok: boolean; portal: PortalType; error?: string }> => {
    const demoRes = await openDemoPortal('seller');
    if (demoRes.ok) return demoRes;
    return loginWithCredentials(DEMO_SELLER_EMAIL, DEMO_PASSWORD, true, 'seller');
  };

  const loginAsFarmerDemo = async (): Promise<{ ok: boolean; portal: PortalType; error?: string }> => {
    const demoRes = await openDemoPortal('farmer');
    if (demoRes.ok) return demoRes;
    return loginWithCredentials(DEMO_FARMER_EMAIL, DEMO_PASSWORD, true, 'farmer');
  };

  const registerSeller = async (sellerData: SellerRegistrationRequest): Promise<{ ok: boolean; error?: string }> => {
    try {
      const response = await authApi.register({ portalType: 'seller', ...sellerData });
      setSession(response.session);
      setSessionLoading(false);
      await hydrateWorkspace(response.session, response.workspace);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Seller account creation failed.' };
    }
  };

  const registerFarmer = async (farmerData: FarmerRegistrationRequest): Promise<{ ok: boolean; error?: string }> => {
    try {
      const response = await authApi.register({ portalType: 'farmer', ...farmerData });
      setSession(response.session);
      setSessionLoading(false);
      await hydrateWorkspace(response.session, response.workspace);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Farmer account creation failed.' };
    }
  };

  const switchPortal = async (target: PortalType): Promise<boolean> => {
    if (!session) return false;
    if (session.portalType === target) return true;
    try {
      const response = await authApi.switchPortal(target);
      setSession(response.session);
      if (target === 'farmer') await refreshDevices(response.session);
      return true;
    } catch (error) {
      setWorkspaceSyncError(error instanceof Error ? error.message : 'This account cannot switch to that portal.');
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    setSession(null);
    setWorkspaceHydrated(false);
    setWorkspaceSyncStatus('idle');
    setWorkspaceSyncError(null);
    setDevices([]);
    setDeviceEvents([]);
    setTelemetryCache([]);
    setIsChatOpen(false);
    try { await authApi.logout(); } catch { /* The server session expires even if a local logout request cannot reach it. */ }
  };

  // Profile & Logo
  const updateProfile = (updated: FarmerProfile) => {
    setProfile(updated);
    safeWriteStorage(STORAGE_KEYS.PROFILE, updated);
    if (session) {
      const nextSession: AuthSession = {
        ...session,
        farmerName: updated.name,
      };
      setSession(nextSession);
    }
  };

  const updateSellerProfile = (updated: Partial<SellerProfile>) => {
    const next: SellerProfile = { ...sellerProfile, ...updated };
    setSellerProfile(next);
    safeWriteStorage(STORAGE_KEYS.SELLER_PROFILE, next);
    if (session && session.portalType === 'seller') {
      const nextSession: AuthSession = {
        ...session,
        sellerName: next.businessName,
      };
      setSession(nextSession);
    }
  };

  const addProduct = (prod: Omit<StoreProduct, 'id'>): StoreProduct => {
    const newProduct: StoreProduct = {
      ...prod,
      id: `prod-${Date.now()}`,
    };
    const next = [newProduct, ...products];
    setProducts(next);
    safeWriteStorage(STORAGE_KEYS.PRODUCTS, next);
    return newProduct;
  };

  const updateProduct = (updated: StoreProduct) => {
    const next = products.map((p) => (p.id === updated.id ? updated : p));
    setProducts(next);
    safeWriteStorage(STORAGE_KEYS.PRODUCTS, next);
  };

  const deleteProduct = (productId: string) => {
    const next = products.filter((p) => p.id !== productId);
    setProducts(next);
    safeWriteStorage(STORAGE_KEYS.PRODUCTS, next);
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    const next = orders.map((o) => (o.id === orderId ? { ...o, orderStatus: status } : o));
    setOrders(next);
    safeWriteStorage(STORAGE_KEYS.ORDERS, next);
  };

  const resetAllDemoData = () => {
    if (!DEMO_MODE_ENABLED || !session?.isDemo) {
      setWorkspaceSyncError('Reset is available only in a development demo workspace.');
      return;
    }
    resetAllDemoDataToSeed();
    const fresh = loadInitialDataSnapshot();
    setProfile(fresh.profile);
    setSellerProfile(fresh.sellerProfile);
    setFarms(fresh.farms);
    setPlots(fresh.plots);
    setCrops(fresh.crops);
    setObservations(fresh.observations);
    setActivities(fresh.activities);
    setWeatherState(fresh.weather);
    setDevices(fresh.devices);
    setDeviceEvents(fresh.deviceEvents);
    setTelemetryCache(fresh.telemetryCache);
    setRainfallLogs(fresh.rainfallLogs);
    setDiseaseReports(fresh.diseaseReports);
    setDictBookmarks(fresh.dictBookmarks);
    setDictRecent(fresh.dictRecent);
    setProducts(fresh.products);
    setCart(fresh.cart);
    setWishlist(fresh.wishlist);
    setRecentProducts(fresh.recentProducts);
    setCheckoutDraft(fresh.checkoutDraft);
    setOrders(fresh.orders);
    setNewsBookmarks(fresh.newsBookmarks);
    setChatHistory(fresh.chatHistory);
    setActiveFarmIdState(fresh.profile.preferences.defaultFarmId);
  };

  // Farm CRUD
  const setActiveFarmId = (farmId: string) => {
    setActiveFarmIdState(farmId);
  };

  const addFarm = (farmInput: Omit<Farm, 'id' | 'createdAt' | 'updatedAt'>): Farm => {
    const now = new Date().toISOString();
    const newFarm: Farm = {
      ...farmInput,
      id: `farm-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    const next = [newFarm, ...farms];
    setFarms(next);
    safeWriteStorage(STORAGE_KEYS.FARMS, next);
    setActiveFarmIdState(newFarm.id);
    return newFarm;
  };

  const updateFarm = (updatedFarm: Farm) => {
    const next = farms.map((f) =>
      f.id === updatedFarm.id ? { ...updatedFarm, updatedAt: new Date().toISOString() } : f
    );
    setFarms(next);
    safeWriteStorage(STORAGE_KEYS.FARMS, next);
  };

  const archiveFarm = (farmId: string, archive: boolean) => {
    const next = farms.map((f) =>
      f.id === farmId ? { ...f, isArchived: archive, updatedAt: new Date().toISOString() } : f
    );
    setFarms(next);
    safeWriteStorage(STORAGE_KEYS.FARMS, next);
  };

  const deleteFarm = (farmId: string) => {
    const nextFarms = farms.filter((f) => f.id !== farmId);
    const nextPlots = plots.filter((p) => p.farmId !== farmId);
    const nextCrops = crops.filter((c) => c.farmId !== farmId);
    const nextObs = observations.filter((o) => o.farmId !== farmId);
    const nextActs = activities.filter((a) => a.farmId !== farmId);

    setFarms(nextFarms);
    setPlots(nextPlots);
    setCrops(nextCrops);
    setObservations(nextObs);
    setActivities(nextActs);

    safeWriteStorage(STORAGE_KEYS.FARMS, nextFarms);
    safeWriteStorage(STORAGE_KEYS.PLOTS, nextPlots);
    safeWriteStorage(STORAGE_KEYS.CROPS, nextCrops);
    safeWriteStorage(STORAGE_KEYS.OBSERVATIONS, nextObs);
    safeWriteStorage(STORAGE_KEYS.ACTIVITIES, nextActs);
  };

  // Plot CRUD
  const addPlot = (plotInput: Omit<FarmPlot, 'id'>): FarmPlot => {
    const newPlot: FarmPlot = {
      ...plotInput,
      id: `plot-${Date.now()}`,
    };
    const next = [...plots, newPlot];
    setPlots(next);
    safeWriteStorage(STORAGE_KEYS.PLOTS, next);
    return newPlot;
  };

  const deletePlot = (plotId: string) => {
    const next = plots.filter((p) => p.id !== plotId);
    setPlots(next);
    safeWriteStorage(STORAGE_KEYS.PLOTS, next);
  };

  // Crop CRUD
  const addCropRecord = (cropInput: Omit<CropRecord, 'id' | 'createdAt'>): CropRecord => {
    const newCrop: CropRecord = {
      ...cropInput,
      id: `crop-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const next = [newCrop, ...crops];
    setCrops(next);
    safeWriteStorage(STORAGE_KEYS.CROPS, next);
    return newCrop;
  };

  const updateCropRecord = (updated: CropRecord) => {
    const next = crops.map((c) => (c.id === updated.id ? updated : c));
    setCrops(next);
    safeWriteStorage(STORAGE_KEYS.CROPS, next);
  };

  const deleteCropRecord = (cropId: string) => {
    const next = crops.filter((c) => c.id !== cropId);
    setCrops(next);
    safeWriteStorage(STORAGE_KEYS.CROPS, next);
  };

  // Observation CRUD
  const addObservation = (obsInput: Omit<FieldObservation, 'id'>): FieldObservation => {
    const newObs: FieldObservation = {
      ...obsInput,
      id: `obs-${Date.now()}`,
    };
    const next = [newObs, ...observations];
    setObservations(next);
    safeWriteStorage(STORAGE_KEYS.OBSERVATIONS, next);
    return newObs;
  };

  const deleteObservation = (obsId: string) => {
    const next = observations.filter((o) => o.id !== obsId);
    setObservations(next);
    safeWriteStorage(STORAGE_KEYS.OBSERVATIONS, next);
  };

  // Activity CRUD
  const addActivity = (actInput: Omit<FarmActivity, 'id'>): FarmActivity => {
    const newAct: FarmActivity = {
      ...actInput,
      id: `act-${Date.now()}`,
    };
    const next = [newAct, ...activities];
    setActivities(next);
    safeWriteStorage(STORAGE_KEYS.ACTIVITIES, next);
    return newAct;
  };

  const updateActivity = (updated: FarmActivity) => {
    const next = activities.map((a) => (a.id === updated.id ? updated : a));
    setActivities(next);
    safeWriteStorage(STORAGE_KEYS.ACTIVITIES, next);
  };

  const toggleActivityComplete = (actId: string) => {
    const next = activities.map((a) => {
      if (a.id !== actId) return a;
      const isNowComplete = a.status !== 'Completed';
      return {
        ...a,
        status: isNowComplete ? ('Completed' as const) : ('Pending' as const),
        completedAt: isNowComplete ? new Date().toISOString() : undefined,
      };
    });
    setActivities(next);
    safeWriteStorage(STORAGE_KEYS.ACTIVITIES, next);
  };

  const deleteActivity = (actId: string) => {
    const next = activities.filter((a) => a.id !== actId);
    setActivities(next);
    safeWriteStorage(STORAGE_KEYS.ACTIVITIES, next);
  };

  // Device identity, gateway relations, events and telemetry are owned by the authenticated API.
  const registerDevice = async (input: DeviceRegistrationInput): Promise<IoTDevice> => {
    try {
      const response = await deviceApi.register(input);
      setDevices((current) => [response.device, ...current.filter((device) => device.id !== response.device.id)]);
      setDeviceApiError(null);
      return response.device;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Device registration failed.';
      setDeviceApiError(message);
      throw error;
    }
  };

  const updateDeviceMetadata = async (deviceId: string, patch: DeviceMetadataPatch): Promise<void> => {
    try {
      const response = await deviceApi.patch(deviceId, patch as Record<string, unknown>);
      setDevices((current) => current.map((device) => device.id === deviceId ? response.device : device));
      setDeviceApiError(null);
    } catch (error) {
      setDeviceApiError(error instanceof Error ? error.message : 'Device details could not be saved.');
      throw error;
    }
  };

  const assignDeviceGateway = async (deviceId: string, gatewayId?: string): Promise<boolean> => {
    try {
      const response = await deviceApi.assignGateway(deviceId, gatewayId);
      setDevices((current) => current.map((device) => device.id === deviceId ? response.device : device));
      setDeviceApiError(null);
      return true;
    } catch (error) {
      setDeviceApiError(error instanceof Error ? error.message : 'Gateway assignment failed.');
      return false;
    }
  };

  const retireDevice = async (deviceId: string): Promise<void> => {
    try {
      const response = await deviceApi.retire(deviceId);
      setDevices((current) => current.map((device) => device.id === deviceId ? response.device : device));
      setDeviceApiError(null);
    } catch (error) {
      setDeviceApiError(error instanceof Error ? error.message : 'Device could not be retired.');
      throw error;
    }
  };

  // Weather & Rainfall
  const setWeather = (w: WeatherSnapshot) => {
    setWeatherState(w);
    safeWriteStorage(STORAGE_KEYS.WEATHER, w);
  };

  const addRainfallLog = (logInput: Omit<RainfallLog, 'id'>) => {
    const newLog: RainfallLog = {
      ...logInput,
      id: `rain-${Date.now()}`,
    };
    const next = [newLog, ...rainfallLogs];
    setRainfallLogs(next);
    safeWriteStorage(STORAGE_KEYS.RAINFALL_LOGS, next);
  };

  const deleteRainfallLog = (id: string) => {
    const next = rainfallLogs.filter((r) => r.id !== id);
    setRainfallLogs(next);
    safeWriteStorage(STORAGE_KEYS.RAINFALL_LOGS, next);
  };

  // Disease reports
  const addDiseaseReport = (
    input: Omit<DiseaseReport, 'id' | 'createdAt' | 'updatedAt'>
  ): DiseaseReport => {
    const now = new Date().toISOString();
    const newReport: DiseaseReport = {
      ...input,
      id: `dis-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    const next = [newReport, ...diseaseReports];
    setDiseaseReports(next);
    safeWriteStorage(STORAGE_KEYS.DISEASE_REPORTS, next);
    return newReport;
  };

  const updateDiseaseReportStatus = (
    reportId: string,
    status: DiseaseReport['status'],
    expertNotes?: string
  ) => {
    const next = diseaseReports.map((r) =>
      r.id === reportId
        ? {
            ...r,
            status,
            expertNotes: expertNotes !== undefined ? expertNotes : r.expertNotes,
            updatedAt: new Date().toISOString(),
          }
        : r
    );
    setDiseaseReports(next);
    safeWriteStorage(STORAGE_KEYS.DISEASE_REPORTS, next);
  };

  // Dictionary
  const toggleDictBookmark = (termId: string) => {
    const next = dictBookmarks.includes(termId)
      ? dictBookmarks.filter((id) => id !== termId)
      : [termId, ...dictBookmarks];
    setDictBookmarks(next);
    safeWriteStorage(STORAGE_KEYS.DICT_BOOKMARKS, next);
  };

  const recordDictView = (termId: string) => {
    const next = [termId, ...dictRecent.filter((id) => id !== termId)].slice(0, 8);
    setDictRecent(next);
    safeWriteStorage(STORAGE_KEYS.DICT_RECENT, next);
  };

  // Store & Cart (all calculations in integer paise!)
  const addToCart = (
    productId: string,
    quantity = 1
  ): { ok: boolean; message: string } => {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return { ok: false, message: 'Product not found in catalog.' };
    }
    if (product.availability === 'Out of Stock' || product.stockCount <= 0) {
      return { ok: false, message: `${product.name} is currently out of stock.` };
    }

    const existing = cart.find((item) => item.productId === productId);
    const currentQty = existing ? existing.quantity : 0;
    const targetQty = currentQty + quantity;

    if (targetQty > product.stockCount) {
      return {
        ok: false,
        message: `Maximum available demo stock for ${product.name} is ${product.stockCount} units.`,
      };
    }

    const nextCart: CartItem[] = existing
      ? cart.map((item) =>
          item.productId === productId ? { ...item, quantity: targetQty } : item
        )
      : [
          ...cart,
          {
            productId,
            quantity,
            addedAt: new Date().toISOString(),
          },
        ];

    setCart(nextCart);
    safeWriteStorage(STORAGE_KEYS.CART, nextCart);
    return { ok: true, message: `Added ${product.name} to cart.` };
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    const product = products.find((p) => p.id === productId);
    const maxStock = product ? product.stockCount : 99;
    const clampedQty = Math.min(Math.max(1, Math.round(quantity)), maxStock);

    const nextCart = cart.map((item) =>
      item.productId === productId ? { ...item, quantity: clampedQty } : item
    );
    setCart(nextCart);
    safeWriteStorage(STORAGE_KEYS.CART, nextCart);
  };

  const removeFromCart = (productId: string) => {
    const nextCart = cart.filter((item) => item.productId !== productId);
    setCart(nextCart);
    safeWriteStorage(STORAGE_KEYS.CART, nextCart);
  };

  const clearCart = () => {
    setCart([]);
    safeWriteStorage(STORAGE_KEYS.CART, []);
  };

  const calculateCartTotals = (promoCode?: string): CartTotals => {
    let subtotalPaise = 0;
    let itemCount = 0;

    for (const item of cart) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        const linePaise = Math.round(prod.pricePaise) * Math.round(item.quantity);
        subtotalPaise += linePaise;
        itemCount += Math.round(item.quantity);
      }
    }

    if (subtotalPaise === 0) {
      return {
        subtotalPaise: 0,
        shippingPaise: 0,
        discountPaise: 0,
        totalPayablePaise: 0,
        itemCount: 0,
      };
    }

    // Demo shipping rule: Free shipping on subtotal >= ₹999 (99900 paise); otherwise ₹65 (6500 paise)
    const shippingPaise = subtotalPaise >= 99900 ? 0 : 6500;

    let discountPaise = 0;
    let appliedPromoDescription: string | undefined;

    if (promoCode && promoCode.trim().length > 0) {
      const matchedPromo = VALID_DEMO_PROMO_CODES.find(
        (p) => p.code.toLowerCase() === promoCode.trim().toLowerCase()
      );
      if (matchedPromo && subtotalPaise >= matchedPromo.minSubtotalPaise) {
        const rawDiscount = Math.round((subtotalPaise * matchedPromo.discountPct) / 100);
        discountPaise = Math.min(rawDiscount, matchedPromo.maxDiscountPaise);
        appliedPromoDescription = matchedPromo.description;
      }
    }

    const totalPayablePaise = Math.max(0, subtotalPaise + shippingPaise - discountPaise);

    return {
      subtotalPaise,
      shippingPaise,
      discountPaise,
      totalPayablePaise,
      appliedPromoDescription,
      itemCount,
    };
  };

  const toggleWishlist = (productId: string) => {
    const next = wishlist.includes(productId)
      ? wishlist.filter((id) => id !== productId)
      : [productId, ...wishlist];
    setWishlist(next);
    safeWriteStorage(STORAGE_KEYS.WISHLIST, next);
  };

  const recordProductView = (productId: string) => {
    const next = [productId, ...recentProducts.filter((id) => id !== productId)].slice(0, 8);
    setRecentProducts(next);
    safeWriteStorage(STORAGE_KEYS.RECENT_PRODUCTS, next);
  };

  const addStoreProductReview = (
    productId: string,
    newRev: { userName: string; rating: number; title: string; comment: string }
  ) => {
    const nextProducts = products.map((p) => {
      if (p.id !== productId) return p;
      const existingReviews = p.reviews || [];
      const createdReview = {
        id: `rev-${Date.now()}`,
        userName: newRev.userName,
        rating: newRev.rating,
        title: newRev.title,
        comment: newRev.comment,
        date: new Date().toISOString().split('T')[0],
        verifiedPurchase: true,
      };
      const updatedReviews = [createdReview, ...existingReviews];
      const avgRating = Number(
        (updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length).toFixed(1)
      );
      return {
        ...p,
        reviews: updatedReviews,
        rating: avgRating,
        reviewCount: updatedReviews.length,
      };
    });
    setProducts(nextProducts);
    safeWriteStorage(STORAGE_KEYS.PRODUCTS, nextProducts);
  };

  const updateCheckoutDraft = (draft: Partial<CheckoutAddressDraft>) => {
    const next = { ...checkoutDraft, ...draft };
    setCheckoutDraft(next);
    safeWriteStorage(STORAGE_KEYS.CHECKOUT_DRAFT, next);
  };

  const placeDemoOrder = (
    paymentMode: DemoOrder['paymentMode'],
    promoCode?: string
  ): { ok: boolean; order?: DemoOrder; error?: string } => {
    if (cart.length === 0) {
      return { ok: false, error: 'Your shopping cart is empty.' };
    }

    const totals = calculateCartTotals(promoCode);
    const lineItems = cart
      .map((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (!prod) return null;
        return {
          productId: prod.id,
          productName: prod.name,
          packSize: prod.packSize,
          category: prod.category,
          unitPricePaise: prod.pricePaise,
          quantity: item.quantity,
          lineTotalPaise: Math.round(prod.pricePaise) * Math.round(item.quantity),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const uniqueSuffix = String(Math.floor(1000 + Math.random() * 9000));
    const newOrder: DemoOrder = {
      id: `ORD-DEMO-2026-${uniqueSuffix}`,
      createdAt: new Date().toISOString(),
      items: lineItems,
      subtotalPaise: totals.subtotalPaise,
      shippingPaise: totals.shippingPaise,
      discountPaise: totals.discountPaise,
      promoCodeApplied: totals.discountPaise > 0 ? promoCode?.trim().toUpperCase() : undefined,
      totalPayablePaise: totals.totalPayablePaise,
      paymentMode,
      demoPaymentStatus:
        paymentMode === 'Cash on Delivery (Demo)'
          ? 'Demo Pending on Delivery'
          : 'Simulated UPI Authorized (No Real Charge)',
      orderStatus: 'Placed',
      isDemoOrder: true,
      deliveryDetails: {
        customerName: checkoutDraft.customerName.trim(),
        mobileNumber: checkoutDraft.mobileNumber.trim(),
        deliveryAddress: checkoutDraft.deliveryAddress.trim(),
        village: checkoutDraft.village.trim(),
        district: checkoutDraft.district.trim(),
        state: checkoutDraft.state.trim(),
        pinCode: checkoutDraft.pinCode.trim(),
        deliveryInstructions: checkoutDraft.deliveryInstructions.trim() || undefined,
      },
    };

    const nextOrders = [newOrder, ...orders];
    setOrders(nextOrders);
    safeWriteStorage(STORAGE_KEYS.ORDERS, nextOrders);

    // Clear cart after successful demo order
    setCart([]);
    safeWriteStorage(STORAGE_KEYS.CART, []);

    return { ok: true, order: newOrder };
  };

  const cancelDemoOrder = (orderId: string) => {
    const next = orders.map((o) =>
      o.id === orderId && (o.orderStatus === 'Placed' || o.orderStatus === 'Processing')
        ? { ...o, orderStatus: 'Cancelled' as const }
        : o
    );
    setOrders(next);
    safeWriteStorage(STORAGE_KEYS.ORDERS, next);
  };

  // News
  const toggleNewsBookmark = (articleId: string) => {
    const next = newsBookmarks.includes(articleId)
      ? newsBookmarks.filter((id) => id !== articleId)
      : [articleId, ...newsBookmarks];
    setNewsBookmarks(next);
    safeWriteStorage(STORAGE_KEYS.NEWS_BOOKMARKS, next);
  };

  // AI Chat
  const appendChatMessage = (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setChatHistory((prev) => {
      const newMsg: ChatMessage = {
        ...msg,
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
      };
      const next = [...prev, newMsg];
      safeWriteStorage(STORAGE_KEYS.CHAT_HISTORY, next);
      return next;
    });
  };

  const clearChatHistory = () => {
    setChatHistory(INITIAL_CHAT_MESSAGES);
    safeWriteStorage(STORAGE_KEYS.CHAT_HISTORY, INITIAL_CHAT_MESSAGES);
  };

  const openChatWithPrompt = (prompt?: string) => {
    setIsChatOpen(true);
    if (prompt) {
      setPendingChatPrompt(prompt);
    }
  };

  const clearPendingChatPrompt = () => {
    setPendingChatPrompt(null);
  };

  const value: AgriPulseContextValue = {
    session,
    sessionLoading,
    workspaceHydrated,
    workspaceSyncStatus,
    workspaceSyncError,
    loginWithCredentials,
    loginAsSellerDemo,
    loginAsFarmerDemo,
    registerSeller,
    registerFarmer,
    switchPortal,
    logout,
    sellerProfile,
    updateSellerProfile,
    addProduct,
    updateProduct,
    deleteProduct,
    updateOrderStatus,
    profile,
    updateProfile,
    resetAllDemoData,
    farms,
    activeFarmId,
    activeFarm,
    setActiveFarmId,
    addFarm,
    updateFarm,
    archiveFarm,
    deleteFarm,
    plots,
    addPlot,
    deletePlot,
    crops,
    addCropRecord,
    updateCropRecord,
    deleteCropRecord,
    observations,
    addObservation,
    deleteObservation,
    activities,
    addActivity,
    updateActivity,
    toggleActivityComplete,
    deleteActivity,
    devices,
    devicesLoading,
    deviceApiError,
    refreshDevices,
    deviceEvents,
    telemetryCache,
    registerDevice,
    updateDeviceMetadata,
    assignDeviceGateway,
    retireDevice,
    weather,
    setWeather,
    rainfallLogs,
    addRainfallLog,
    deleteRainfallLog,
    diseaseReports,
    addDiseaseReport,
    updateDiseaseReportStatus,
    dictionary: SEED_DICTIONARY_ENTRIES,
    dictBookmarks,
    toggleDictBookmark,
    dictRecent,
    recordDictView,
    products,
    cart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    calculateCartTotals,
    wishlist,
    toggleWishlist,
    recentProducts,
    recordProductView,
    addStoreProductReview,
    checkoutDraft,
    updateCheckoutDraft,
    orders,
    placeDemoOrder,
    cancelDemoOrder,
    newsArticles: SEED_NEWS_ARTICLES,
    newsBookmarks,
    toggleNewsBookmark,
    schemes: SEED_GOVERNMENT_SCHEMES,
    chatHistory,
    appendChatMessage,
    clearChatHistory,
    isChatOpen,
    setIsChatOpen,
    pendingChatPrompt,
    openChatWithPrompt,
    clearPendingChatPrompt,
  };

  return <AgriPulseContext.Provider value={value}>{children}</AgriPulseContext.Provider>;
};

export function useAgriPulse(): AgriPulseContextValue {
  const ctx = useContext(AgriPulseContext);
  if (!ctx) {
    throw new Error('useAgriPulse must be used within an AgriPulseProvider');
  }
  return ctx;
}
