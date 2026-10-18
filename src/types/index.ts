export type AreaUnit = 'acre' | 'hectare' | 'bigha';

export type LanguageCode = 'en' | 'hi';

export type UserRole =
  | 'Farmer'
  | 'Seller'
  | 'Agricultural Expert'
  | 'Extension Officer'
  | 'Platform Administrator';

export type PortalType = 'seller' | 'farmer';

export interface SellerProfile {
  id: string;
  businessName: string;
  tradeName?: string;
  contactPerson: string;
  email: string;
  mobile: string;
  category: string;
  gstin: string;
  licenseNumber?: string;
  state: string;
  district: string;
  city: string;
  address: string;
  pincode: string;
  bankAccountName: string;
  bankAccountNumber: string;
  ifscCode: string;
  isVerified: boolean;
  isDemoSeller: boolean;
  rating: number;
  totalOrders: number;
  totalRevenuePaise: number;
  joinedDate: string;
}

export interface AuthSession {
  version: 'v1';
  userId: string;
  email: string;
  farmerName?: string;
  sellerName?: string;
  role?: UserRole;
  portalType?: PortalType;
  isDemo: boolean;
  rememberMe: boolean;
  loggedInAt: string;
}

export interface FarmerRegistrationRequest {
  name: string;
  email: string;
  password: string;
  mobile?: string;
  state?: string;
  district?: string;
  village?: string;
  primaryCrop?: string;
  landArea?: string | number;
}

export interface SellerRegistrationRequest {
  businessName: string;
  tradeName?: string;
  contactPerson: string;
  email: string;
  password: string;
  mobile?: string;
  category: string;
  gstin?: string;
  licenseNumber?: string;
  state?: string;
  district?: string;
  city?: string;
  address?: string;
  pincode?: string;
}

export interface UserPreferences {
  language: LanguageCode;
  preferredAreaUnit: AreaUnit;
  bighaToAcreFactor: number;
  bighaRegionLabel: string;
  defaultFarmId: string;
  defaultCrop: string;
  weatherLocation: {
    state: string;
    district: string;
    locality: string;
    lat?: number;
    lon?: number;
  };
  notifications: {
    weatherAlerts: boolean;
    irrigationReminders: boolean;
    cropInspectionAlerts: boolean;
    orderUpdates: boolean;
    schemeUpdates: boolean;
  };
}

export interface FarmerProfile {
  id: string;
  name: string;
  email: string;
  mobile: string;
  state: string;
  district: string;
  village: string;
  role?: UserRole;
  isDemoAccount: boolean;
  joinedDate: string;
  preferences: UserPreferences;
}

export interface FarmPlot {
  id: string;
  farmId: string;
  name: string;
  area: number;
  areaUnit: AreaUnit;
  soilType: string;
  irrigationMethod: string;
  currentCropId?: string;
  notes?: string;
}

export interface Farm {
  id: string;
  name: string;
  farmerName: string;
  state: string;
  district: string;
  village: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
  totalArea: number;
  areaUnit: AreaUnit;
  bighaToAcreFactor?: number;
  ownershipType: 'Owned' | 'Leased' | 'Shared / Co-operative' | 'Family Holding';
  soilType: string;
  waterSource: string;
  notes: string;
  isArchived: boolean;
  isDemoRecord: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CropGrowthStage =
  | 'Land Preparation'
  | 'Sowing / Transplanting'
  | 'Germination & Emergence'
  | 'Vegetative Growth'
  | 'Flowering / Booting'
  | 'Grain Filling / Fruiting'
  | 'Maturation'
  | 'Ready for Harvest'
  | 'Harvested';

export interface CropRecord {
  id: string;
  farmId: string;
  plotId: string;
  plotName: string;
  cropName: string;
  variety: string;
  cultivatedArea: number;
  areaUnit: AreaUnit;
  sowingDate: string;
  expectedHarvestDate: string;
  growthStage: CropGrowthStage;
  irrigationMethod: string;
  healthStatus: 'Healthy' | 'Watch / Mild Stress' | 'Needs Inspection';
  notes: string;
  photoDataUrl?: string;
  isDemoRecord: boolean;
  createdAt: string;
}

export type ObservationCategory =
  | 'Soil Moisture'
  | 'Visible Plant Symptoms'
  | 'Pest Sighting'
  | 'Leaf Color Change'
  | 'Standing Water'
  | 'Irrigation Observation'
  | 'Weather Damage'
  | 'General Inspection';

export interface FieldObservation {
  id: string;
  farmId: string;
  plotId?: string;
  plotName?: string;
  cropId?: string;
  cropName?: string;
  category: ObservationCategory;
  soilMoisturePct?: number;
  soilTempC?: number;
  symptoms?: string;
  pestDetails?: string;
  leafColorNotes?: string;
  standingWaterStatus?: 'None' | 'Moderate Puddling' | 'Waterlogged';
  irrigationStatus?: 'Adequate' | 'Irrigation Due' | 'Recently Irrigated' | 'Dry Topsoil';
  weatherDamageNotes?: string;
  notes: string;
  photoDataUrl?: string;
  severity: 'Normal' | 'Watch' | 'Action Needed';
  sourceLabel: 'Farmer Recorded' | 'Demo Sample Record';
  recordedAt: string;
}

export type ActivityCategory =
  | 'Irrigation'
  | 'Sowing'
  | 'Fertilizer Application'
  | 'Pest / Disease Inspection'
  | 'Harvest Planning'
  | 'General Fieldwork';

export interface FarmActivity {
  id: string;
  farmId: string;
  plotName?: string;
  cropName?: string;
  title: string;
  category: ActivityCategory;
  scheduledDate: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'Completed';
  notes: string;
  isDemoRecord: boolean;
  completedAt?: string;
}

export interface HourlyForecastItem {
  time: string;
  tempC: number;
  rainProbPct: number;
  condition: string;
  windKmh: number;
}

export interface DailyForecastItem {
  date: string;
  dayLabel: string;
  tempMinC: number;
  tempMaxC: number;
  condition: string;
  rainProbPct: number;
  expectedRainMm: number;
  humidityPct: number;
  windKmh: number;
  advisoryNote?: string;
}

export interface WeatherSnapshot {
  locationLabel: string;
  state: string;
  district: string;
  tempC: number;
  feelsLikeC: number;
  tempMinC: number;
  tempMaxC: number;
  condition: string;
  humidityPct: number;
  windSpeedKmh: number;
  windDirection: string;
  rainProbabilityPct: number;
  rainfallTodayMm: number;
  cloudCoverPct: number;
  visibilityKm: number;
  soilTempEstimateC: number | null;
  sourceType: 'Live API' | 'Demo Fallback Forecast';
  sourceProvider: string;
  updatedAt: string;
  hourly: HourlyForecastItem[];
  daily: DailyForecastItem[];
  warnings: {
    id: string;
    severity: 'Advisory' | 'Watch' | 'Warning';
    title: string;
    description: string;
    triggerCondition: string;
  }[];
}

export type DeviceType = 'sensor_node' | 'lora_gateway';

export type DeviceStatus =
  | 'draft'
  | 'pending_pairing'
  | 'pending_gateway_assignment'
  | 'online'
  | 'offline'
  | 'attention_required'
  | 'retired';

export type TelemetrySource = 'physical_sensor' | 'weather_api' | 'manual_observation' | 'demo';

export type InstalledSensorType =
  | 'air_humidity'
  | 'soil_moisture'
  | 'soil_temperature'
  | 'air_temperature_humidity'
  | 'light'
  | 'soil_ph'
  | 'soil_npk'
  | 'battery_voltage'
  | 'standing_water';

export type DevicePowerSource = 'solar_battery' | 'battery' | 'mains' | 'other';
export type DeviceBackhaulType = 'wifi' | 'ethernet' | 'cellular' | 'other';
export type SensorCalibrationStatus = 'not_calibrated' | 'calibration_recorded' | 'needs_review';

/**
 * Browser-side device records are demo metadata only. In production, the API and
 * database own device identity, pairing, status, telemetry, and audit history.
 */
export interface IoTDevice {
  id: string;
  ownerUserId: string;
  farmId: string;
  plotId?: string;
  type: DeviceType;
  name: string;
  serialNumber?: string;
  locationLabel: string;
  state?: string;
  district?: string;
  locality?: string;
  latitude?: number;
  longitude?: number;
  installedAt?: string;
  status: DeviceStatus;
  gatewayId?: string;
  installedSensors?: InstalledSensorType[];
  backhaulType?: DeviceBackhaulType;
  powerSource?: DevicePowerSource;
  samplingIntervalMinutes?: number;
  communicationProfile?: string;
  calibrationStatus?: SensorCalibrationStatus;
  calibrationDate?: string;
  calibrationNotes?: string;
  coverageNotes?: string;
  notes?: string;
  lastSeenAt?: string;
  isDemoRecord: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TelemetryReading {
  id: string;
  deviceId: string;
  farmId: string;
  sensorType: InstalledSensorType;
  component?: 'nitrogen' | 'phosphorus' | 'potassium';
  measurementKind?: 'raw' | 'calibrated' | 'legacy';
  calibrationMethod?: string;
  value: number;
  unit: string;
  measuredAt: string;
  receivedAt: string;
  source: 'physical_sensor' | 'demo';
  quality?: 'valid' | 'suspect' | 'invalid';
}

export type DeviceEventType =
  | 'registered'
  | 'metadata_updated'
  | 'gateway_assigned'
  | 'pairing_requested'
  | 'pairing_succeeded'
  | 'heartbeat'
  | 'fault'
  | 'provisioning_failed'
  | 'retired';

export interface DeviceEvent {
  id: string;
  deviceId: string;
  type: DeviceEventType;
  title: string;
  description: string;
  occurredAt: string;
  source: 'demo' | 'backend';
}

export interface DeviceRegistrationInput {
  farmId: string;
  plotId?: string;
  type: DeviceType;
  name: string;
  serialNumber?: string;
  locationLabel: string;
  state?: string;
  district?: string;
  locality?: string;
  latitude?: number;
  longitude?: number;
  installedAt?: string;
  gatewayId?: string;
  installedSensors?: InstalledSensorType[];
  backhaulType?: DeviceBackhaulType;
  powerSource?: DevicePowerSource;
  samplingIntervalMinutes?: number;
  communicationProfile?: string;
  calibrationStatus?: SensorCalibrationStatus;
  calibrationDate?: string;
  calibrationNotes?: string;
  coverageNotes?: string;
  notes?: string;
}

export type DeviceMetadataPatch = Partial<Pick<DeviceRegistrationInput,
  'name' | 'locationLabel' | 'state' | 'district' | 'locality' |
  'calibrationStatus' | 'calibrationNotes' | 'coverageNotes'
>> & {
  plotId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  installedAt?: string | null;
  calibrationDate?: string | null;
  notes?: string | null;
};

export interface RainfallLog {
  id: string;
  farmId: string;
  date: string;
  amountMm: number;
  sourceType: 'Farmer Recorded' | 'External Weather Station (Demo)' | 'Forecast Estimate';
  notes: string;
}

export interface DiseaseCandidateCause {
  name: string;
  type:
    | 'Fungal Concern'
    | 'Nutrient Deficiency'
    | 'Pest / Insect Damage'
    | 'Water / Environmental Stress'
    | 'Bacterial / Viral Possibility';
  matchingSymptoms: string[];
  distinguishingChecks: string[];
  managementGuidance: string[];
}

export interface DiseaseReport {
  id: string;
  farmId: string;
  farmName: string;
  plotName: string;
  cropName: string;
  variety: string;
  growthStage: CropGrowthStage;
  symptomCategories: string[];
  affectedParts: string[];
  onsetDate: string;
  affectedAreaPct: number;
  weatherIrrigationNotes: string;
  farmerDescription: string;
  photoDataUrl?: string;
  photoFileName?: string;
  status: 'Possible issue' | 'Needs inspection' | 'Expert confirmed';
  analysisMode: 'Demo symptom guidance' | 'Configured AI Vision Service';
  possibleCauses: DiseaseCandidateCause[];
  alternativeExplanations: string[];
  immediateInspectionSteps: string[];
  preventiveGuidance: string[];
  whenToConsultExpert: string[];
  expertNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type DictionaryCategory =
  | 'Soil Science'
  | 'Irrigation'
  | 'Seeds & Germination'
  | 'Crop Growth Stages'
  | 'Fertilizers'
  | 'Plant Nutrients'
  | 'Pest Management'
  | 'Plant Diseases'
  | 'Weather & Rainfall'
  | 'Farm Machinery'
  | 'Sustainable Farming'
  | 'Soil Moisture & pH'
  | 'Digital Farming & Sensors';

export interface DictionaryEntry {
  id: string;
  term: string;
  hindiTerm?: string;
  pronunciation?: string;
  category: DictionaryCategory;
  simpleDefinition: string;
  hindiDefinition?: string;
  farmerFriendlyExplanation: string;
  hindiExplanation?: string;
  practicalExample: string;
  whyItMatters: string;
  relatedTerms: string[];
  relevantCrops: string[];
}

export type ProductCategory =
  | 'Seeds and planting material'
  | 'Fertilizers and soil nutrients'
  | 'Crop protection products'
  | 'Organic farming inputs'
  | 'Soil testing and farm-monitoring kits'
  | 'Irrigation equipment'
  | 'Sprayers and farm tools'
  | 'Hand tools and accessories'
  | 'Farm safety equipment'
  | 'Harvesting and storage supplies';

export interface StoreProductReview {
  id: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  verifiedPurchase: boolean;
}

export interface StoreProductFaq {
  question: string;
  answer: string;
}

export interface StoreProductSpecification {
  label: string;
  value: string;
}

export interface StoreProductOffer {
  code: string;
  title: string;
  discountText: string;
  minOrderPaise?: number;
}

export interface StoreProduct {
  id: string;
  slug?: string;
  sku?: string;
  name: string;
  category: ProductCategory;
  brand: string;
  isSampleBrand: boolean;
  packSize: string;
  pricePaise: number;
  mrpPaise: number;
  stockCount: number;
  availability: 'In Stock' | 'Low Stock' | 'Out of Stock';
  sellerName: string;
  isDemoSeller: boolean;
  compatibleCrops: string[];
  seasonTag: 'Kharif' | 'Rabi' | 'All Season' | 'Zaid';
  isFeatured: boolean;
  isPopular: boolean;
  isNewArrival: boolean;
  demoOfferLabel?: string;
  shortDescription: string;
  detailedDescription: string;
  usageInstructions: string;
  storageInstructions: string;
  safetyOrLegalNote?: string;
  shippingEstimateDays: string;
  imageSvgType: string;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  gallery?: string[];
  highlights?: string[];
  specifications?: StoreProductSpecification[];
  manufacturer?: {
    name: string;
    originCountry: string;
    address?: string;
    supportContact?: string;
  };
  seller?: {
    name: string;
    businessType: string;
    returnPolicy: string;
    sellerRating: number;
  };
  warranty?: {
    durationMonths: number;
    warrantyType: string;
    coverage: string;
    claimProcedure: string;
  };
  reviews?: StoreProductReview[];
  faqs?: StoreProductFaq[];
  relatedProductIds?: string[];
  offers?: StoreProductOffer[];
}

export interface CartItem {
  productId: string;
  quantity: number;
  addedAt: string;
}

export interface CheckoutAddressDraft {
  customerName: string;
  mobileNumber: string;
  deliveryAddress: string;
  village: string;
  district: string;
  state: string;
  pinCode: string;
  deliveryInstructions: string;
  promoCode: string;
}

export type OrderStatus = 'Placed' | 'Processing' | 'Dispatched' | 'Delivered' | 'Cancelled';

export interface OrderLineItem {
  productId: string;
  productName: string;
  packSize: string;
  category: ProductCategory;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
}

export interface DemoOrder {
  id: string;
  createdAt: string;
  items: OrderLineItem[];
  subtotalPaise: number;
  shippingPaise: number;
  discountPaise: number;
  promoCodeApplied?: string;
  totalPayablePaise: number;
  paymentMode: 'Cash on Delivery (Demo)' | 'UPI (Demo Workflow)';
  demoPaymentStatus: 'Demo Pending on Delivery' | 'Simulated UPI Authorized (No Real Charge)';
  orderStatus: OrderStatus;
  isDemoOrder: true;
  deliveryDetails: {
    customerName: string;
    mobileNumber: string;
    deliveryAddress: string;
    village: string;
    district: string;
    state: string;
    pinCode: string;
    deliveryInstructions?: string;
  };
}

export type NewsCategory =
  | 'Agriculture policy'
  | 'Crop advisories'
  | 'Weather and seasonal alerts'
  | 'Agricultural markets and prices'
  | 'Farming technology'
  | 'Research and innovation'
  | 'Soil and water conservation'
  | 'Government announcements'
  | 'Livestock and allied agriculture';

export interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  fullContent: string[];
  publisher: string;
  publishedDate: string;
  category: NewsCategory;
  isDemoArticle: boolean;
  sourceUrl?: string;
  sourceAttribution: string;
  relevantStates: string[];
  tags: string[];
  visualTheme: string;
}

export type SchemeCategory =
  | 'Farmer income support'
  | 'Crop insurance'
  | 'Agricultural credit'
  | 'Irrigation support'
  | 'Farm mechanization'
  | 'Soil testing'
  | 'Horticulture assistance'
  | 'Organic and sustainable agriculture'
  | 'Farmer-producer organizations'
  | 'State-specific agricultural assistance';

export interface GovernmentScheme {
  id: string;
  name: string;
  shortCode: string;
  department: string;
  category: SchemeCategory;
  shortExplanation: string;
  applicability: 'National (All India)' | 'State-Specific';
  applicableStates: string[];
  beneficiaryGroups: (
    | 'Small & Marginal Farmers'
    | 'All Landholding Farmers'
    | 'Tenant / Sharecroppers'
    | 'Women Farmers'
    | 'FPOs & Cooperatives'
  )[];
  eligibilitySummary: string[];
  benefitsSummary: string[];
  requiredDocuments: string[];
  applicationProcess: string[];
  officialPortalUrl: string;
  applicationStatusLabel:
    | 'Open — Check Official Portal for Cycle Dates'
    | 'Ongoing Enrollment'
    | 'Seasonal Window — Verify on Portal';
  lastVerifiedLabel: string;
  isDemoRecord: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  contextBadge?: string;
  sourceCitations?: string[];
  suggestedLinks?: {
    label: string;
    route: string;
  }[];
  modeLabel?: 'Service unavailable' | 'Knowledge Retrieval & Demo Guidance' | 'Demo Rule-Based Guidance' | 'Connected AI Service' | 'Device Registry · Rule-Based Guidance';
}

// ============================================================================
// NEW ENTITIES FOR CROP ENCYCLOPEDIA, DISEASE/PEST LIBRARY, SOIL/FERTILIZER,
// MARKET PRICES, COMMUNITY, AND ADMIN CONTENT MANAGEMENT
// ============================================================================

export interface AgriculturalSource {
  id: string;
  organization: string;
  title: string;
  url: string;
  publicationDate: string;
  reviewDate: string;
  sourceType: 'ICAR Research Institute' | 'University Extension Guide' | 'International Agronomy Reference' | 'Government Portal';
  applicableRegion: string;
}

export interface CropGrowthJourneyStage {
  stepNumber: number;
  stageTitle: string;
  durationRange: string;
  waterNeedSummary: string;
  nutrientFocus: string;
  description: string;
  monitoringPriorities: string[];
}

export interface CropNutrientDeficiency {
  nutrient: string;
  visibleSymptoms: string;
  affectedPlantPart: string;
  similarConditions: string;
  confirmationAndCorrection: string;
}

export interface CropGuide {
  id: string;
  slug: string;
  name: string;
  hindiName: string;
  scientificName: string;
  category: 'Cereals' | 'Vegetables' | 'Fiber Crops' | 'Oilseeds' | 'Sugar Crops' | 'Pulses';
  formFactor: 'Cereal Grain' | 'Fresh Vegetable' | 'Industrial Fiber' | 'Oilseed & Meal' | 'Sugar & Bio-Energy';
  shortDescription: string;
  overviewParagraphs: string[];
  primaryGrowingRequirements: string;
  typicalGrowthCycle: string;
  reviewStatus: 'Reviewed Agronomy Reference Guide' | 'Draft Educational Guide';
  reviewedBy: string;
  lastUpdated: string;
  publicationStatus: 'Published' | 'Draft';
  quickFacts: {
    cropCategory: string;
    growingSeason: string;
    growthDuration: string;
    temperatureRange: string;
    soilCharacteristics: string;
    waterRequirements: string;
    cultivationMethods: string;
  };
  climateAndGrowing: {
    temperature: string;
    rainfallAndHumidity: string;
    sunlightAndPhotoperiod: string;
    seasonalSuitability: string;
    regionalConsiderations: string;
  };
  soilRequirements: {
    textureAndDrainage: string;
    phRange: string;
    organicMatterAndFertility: string;
    salinityAndAlkalinity: string;
    soilTestingGuidance: string;
  };
  sowingAndPlanting: {
    seedSelectionAndPreparation: string;
    sowingTime: string;
    spacingAndDepth: string;
    seedRateIllustrative: string;
    establishmentMethods: string[];
  };
  irrigationManagement: {
    criticalWaterStages: string[];
    irrigationApproaches: string;
    waterStressSigns: string;
    drainageConsiderations: string;
    waterSavingPractices: string;
  };
  fertilizerManagement: {
    macronutrientRole: string;
    micronutrientFocus: string;
    illustrativeSplitSchedule: string[];
    soilTestDisclaimer: string;
  };
  growthJourney: CropGrowthJourneyStage[];
  linkedDiseaseSlugs: string[];
  nutrientDeficiencies: CropNutrientDeficiency[];
  weedManagement: {
    criticalWeedFreePeriod: string;
    majorWeedSpecies: string[];
    culturalAndMechanicalControls: string[];
    safeHerbicideGuidance: string;
  };
  harvestAndPostHarvest: {
    maturityIndicators: string[];
    harvestTimingAndMethod: string;
    threshingAndDrying: string;
    qualityConsiderations: string;
  };
  storageAndHandling: {
    safeMoisturePct: string;
    storageConditions: string;
    storagePestsAndRisks: string;
  };
  regionalAdvisory: {
    applicableRegions: string[];
    seasonLabel: string;
    advisoryDate: string;
    advisorySummary: string;
    sourceAuthority: string;
  };
  faqs: {
    question: string;
    answer: string;
  }[];
  sources: AgriculturalSource[];
}

export interface DiseaseOrPestEntry {
  id: string;
  slug: string;
  commonName: string;
  hindiName: string;
  scientificName: string;
  recordType: 'Disease' | 'Insect Pest';
  pathogenOrPestGroup: 'Fungal' | 'Bacterial' | 'Viral' | 'Lepidopteran Borer' | 'Sap-Sucking Insect';
  riskSeverity: 'High' | 'Moderate' | 'Watch';
  associatedCrops: string[];
  associatedCropSlugs: string[];
  shortSummary: string;
  affectedParts: string[];
  symptoms: string[];
  favorableConditions: string[];
  similarLookingProblems: string[];
  inspectionSteps: string[];
  preventionAndCulturalManagement: string[];
  ipmAndBiologicalOptions: string[];
  safetyAndLabelNotice: string;
  regionalRelevance: string;
  reviewStatus: 'Expert Reviewed Reference';
  lastUpdated: string;
  sources: AgriculturalSource[];
}

export interface SoilFertilizerArticle {
  id: string;
  slug: string;
  title: string;
  category: 'Macronutrients' | 'Micronutrients' | 'Organic Amendments' | 'Soil Chemistry & Testing' | 'Safe Handling';
  summary: string;
  keyTakeaways: string[];
  agriculturalContext: string;
  diagnosticOrSamplingSteps: string[];
  limitationsAndPrecautions: string;
  citation: string;
}

export interface FertilizerComparisonItem {
  id: string;
  name: string;
  nPct: number;
  pPct: number;
  kPct: number;
  sPct: number;
  znPct: number;
  releaseProfile: 'Rapid Water-Soluble' | 'Moderate Basal' | 'Slow Organic Release';
  primaryUseStage: string;
  soilPhSuitability: string;
  notes: string;
}

export interface MarketPriceRecord {
  id: string;
  commodity: string;
  cropSlug: string;
  variety: string;
  marketName: string;
  district: string;
  state: string;
  season: 'Kharif' | 'Rabi' | 'All Year';
  unit: '₹ / Quintal (100 kg)';
  minPriceINR: number;
  maxPriceINR: number;
  modalPriceINR: number;
  mspReferenceINR?: number;
  updatedDate: string;
  dataStatus: 'Demo Data (Sample Reference)' | 'Historical Reference';
  sourceAttribution: string;
  monthlyHistory: {
    month: string;
    modalINR: number;
  }[];
}

export interface CommunityReply {
  id: string;
  authorName: string;
  authorRole: UserRole;
  isVerifiedExpertReply: boolean;
  text: string;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  title: string;
  cropTag: string;
  topicCategory: 'Crop Disease Help' | 'Soil & Fertilizer' | 'Irrigation & Water' | 'Cultivation Practices' | 'Market & Storage';
  authorName: string;
  authorRole: UserRole;
  region: string;
  body: string;
  createdAt: string;
  upvotes: number;
  isReported?: boolean;
  expertReviewNote?: string;
  replies: CommunityReply[];
}
