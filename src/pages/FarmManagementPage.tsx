import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Tractor,
  MapPin,
  Sprout,
  Eye,
  Plus,
  Edit3,
  Trash2,
  Archive,
  Download,
  Calculator,
  CheckCircle2,
  Camera,
  Filter,
  AlertTriangle,
} from 'lucide-react';
import { useAgriPulse } from '../context/AgriPulseContext';
import {
  AreaUnit,
  CropGrowthStage,
  CropRecord,
  Farm,
  FieldObservation,
  ObservationCategory,
} from '../types';
import {
  convertArea,
  formatDate,
  formatDateTime,
  REGIONAL_BIGHA_FACTORS,
} from '../utils/formatters';

const COMMON_INDIAN_CROPS = [
  'Wheat',
  'Rice (Paddy)',
  'Maize',
  'Cotton',
  'Sugarcane',
  'Soybean',
  'Mustard (Sarson)',
  'Chickpea (Chana)',
  'Pigeonpea (Arhar)',
  'Green Gram (Moong)',
  'Tomato',
  'Potato',
  'Onion',
  'Mango (Orchard)',
  'Custom Crop Name...',
];

const GROWTH_STAGES: CropGrowthStage[] = [
  'Land Preparation',
  'Sowing / Transplanting',
  'Germination & Emergence',
  'Vegetative Growth',
  'Flowering / Booting',
  'Grain Filling / Fruiting',
  'Maturation',
  'Ready for Harvest',
  'Harvested',
];

const OBSERVATION_CATEGORIES: ObservationCategory[] = [
  'Soil Moisture',
  'Visible Plant Symptoms',
  'Pest Sighting',
  'Leaf Color Change',
  'Standing Water',
  'Irrigation Observation',
  'Weather Damage',
  'General Inspection',
];

export const FarmManagementPage: React.FC = () => {
  const {
    profile,
    farms,
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
    deleteCropRecord,
    observations,
    addObservation,
    deleteObservation,
  } = useAgriPulse();

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'farms' | 'crops' | 'observations' | 'converter'>(
    'farms'
  );

  // Sync tab from URL query params if navigated from Dashboard Quick Actions
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const actionParam = searchParams.get('action');
    if (tabParam === 'observations') {
      setActiveTab('observations');
      if (actionParam === 'new') setShowObsForm(true);
    } else if (tabParam === 'farms' && actionParam === 'new') {
      setActiveTab('farms');
      setShowFarmForm(true);
    }
  }, [searchParams]);

  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const showFeedback = (msg: string) => {
    setBannerMessage(msg);
    setTimeout(() => setBannerMessage(null), 4000);
  };

  // --- Farm Registration / Edit Form State ---
  const [showFarmForm, setShowFarmForm] = useState(false);
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);
  const [farmName, setFarmName] = useState('');
  const [farmerName, setFarmerName] = useState(profile.name);
  const [farmState, setFarmState] = useState(profile.state || 'Haryana');
  const [farmDistrict, setFarmDistrict] = useState(profile.district || 'Karnal');
  const [farmVillage, setFarmVillage] = useState(profile.village || '');
  const [farmLat, setFarmLat] = useState('');
  const [farmLon, setFarmLon] = useState('');
  const [farmArea, setFarmArea] = useState('5');
  const [farmAreaUnit, setFarmAreaUnit] = useState<AreaUnit>('acre');
  const [farmBighaFactor, setFarmBighaFactor] = useState<number>(
    profile.preferences.bighaToAcreFactor || 0.25
  );
  const [farmOwnership, setFarmOwnership] = useState<Farm['ownershipType']>('Owned');
  const [farmSoilType, setFarmSoilType] = useState('Alluvial Loam');
  const [farmWaterSource, setFarmWaterSource] = useState('Tube-well + Canal');
  const [farmNotes, setFarmNotes] = useState('');
  const [confirmDeleteFarmId, setConfirmDeleteFarmId] = useState<string | null>(null);

  // --- Plot Form State ---
  const [showPlotForm, setShowPlotForm] = useState(false);
  const [plotName, setPlotName] = useState('');
  const [plotArea, setPlotArea] = useState('2.0');
  const [plotAreaUnit, setPlotAreaUnit] = useState<AreaUnit>('acre');
  const [plotSoil, setPlotSoil] = useState('Alluvial Loam');
  const [plotIrrig, setPlotIrrig] = useState('Border Strip Irrigation');
  const [plotNotes, setPlotNotes] = useState('');

  // --- Crop Form State ---
  const [showCropForm, setShowCropForm] = useState(false);
  const [cropPreset, setCropPreset] = useState('Wheat');
  const [customCropName, setCustomCropName] = useState('');
  const [cropVariety, setCropVariety] = useState('');
  const [cropPlotId, setCropPlotId] = useState('');
  const [cropArea, setCropArea] = useState('2.0');
  const [cropAreaUnit, setCropAreaUnit] = useState<AreaUnit>('acre');
  const [cropSowingDate, setCropSowingDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  });
  const [cropHarvestDate, setCropHarvestDate] = useState(() => {
    const harvest = new Date();
    harvest.setMonth(harvest.getMonth() + 6);
    return new Date(harvest.getTime() - harvest.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  });
  const [cropStage, setCropStage] = useState<CropGrowthStage>('Sowing / Transplanting');
  const [cropIrrig, setCropIrrig] = useState('Border Strip Irrigation');
  const [cropHealth, setCropHealth] = useState<CropRecord['healthStatus']>('Healthy');
  const [cropNotes, setCropNotes] = useState('');
  const [cropPhotoUrl, setCropPhotoUrl] = useState<string | undefined>(undefined);

  // --- Observation Form State ---
  const [showObsForm, setShowObsForm] = useState(false);
  const [obsCategory, setObsCategory] = useState<ObservationCategory>('Soil Moisture');
  const [obsPlotName, setObsPlotName] = useState('');
  const [obsCropName, setObsCropName] = useState('');
  const [obsMoisture, setObsMoisture] = useState('54');
  const [obsSoilTemp, setObsSoilTemp] = useState('24.5');
  const [obsSymptoms, setObsSymptoms] = useState('');
  const [obsPest, setObsPest] = useState('');
  const [obsLeafColor, setObsLeafColor] = useState('');
  const [obsStandingWater, setObsStandingWater] =
    useState<FieldObservation['standingWaterStatus']>('None');
  const [obsIrrigStatus, setObsIrrigStatus] =
    useState<FieldObservation['irrigationStatus']>('Adequate');
  const [obsWeatherDamage, setObsWeatherDamage] = useState('');
  const [obsSeverity, setObsSeverity] = useState<FieldObservation['severity']>('Normal');
  const [obsNotes, setObsNotes] = useState('');
  const [obsPhotoUrl, setObsPhotoUrl] = useState<string | undefined>(undefined);

  // --- Historical Filter State ---
  const [filterCrop, setFilterCrop] = useState('All');
  const [filterPlot, setFilterPlot] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  // --- Area Converter State ---
  const [convInputVal, setConvInputVal] = useState('10');
  const [convFromUnit, setConvFromUnit] = useState<AreaUnit>('bigha');
  const [convBighaRegionId, setConvBighaRegionId] = useState(REGIONAL_BIGHA_FACTORS[2].id);

  const activeFarmPlots = useMemo(
    () => (activeFarm ? plots.filter((p) => p.farmId === activeFarm.id) : plots),
    [plots, activeFarm]
  );

  const activeFarmCrops = useMemo(
    () => (activeFarm ? crops.filter((c) => c.farmId === activeFarm.id) : crops),
    [crops, activeFarm]
  );

  const openCreateFarm = () => {
    setEditingFarm(null);
    setFarmName('');
    setFarmerName(profile.name);
    setFarmState(profile.state || 'Haryana');
    setFarmDistrict(profile.district || 'Karnal');
    setFarmVillage(profile.village || '');
    setFarmLat('');
    setFarmLon('');
    setFarmArea('5.0');
    setFarmAreaUnit('acre');
    setFarmOwnership('Owned');
    setFarmSoilType('Alluvial Loam');
    setFarmWaterSource('Solar Borewell + Canal');
    setFarmNotes('');
    setShowFarmForm(true);
  };

  const openEditFarm = (f: Farm) => {
    setEditingFarm(f);
    setFarmName(f.name);
    setFarmerName(f.farmerName);
    setFarmState(f.state);
    setFarmDistrict(f.district);
    setFarmVillage(f.village);
    setFarmLat(f.coordinates?.lat !== undefined ? String(f.coordinates.lat) : '');
    setFarmLon(f.coordinates?.lon !== undefined ? String(f.coordinates.lon) : '');
    setFarmArea(String(f.totalArea));
    setFarmAreaUnit(f.areaUnit);
    setFarmBighaFactor(f.bighaToAcreFactor || 0.25);
    setFarmOwnership(f.ownershipType);
    setFarmSoilType(f.soilType);
    setFarmWaterSource(f.waterSource);
    setFarmNotes(f.notes);
    setShowFarmForm(true);
  };

  const handleFarmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericArea = parseFloat(farmArea);
    if (!farmName.trim() || Number.isNaN(numericArea) || numericArea <= 0) return;

    const coords =
      farmLat.trim() &&
      farmLon.trim() &&
      !Number.isNaN(parseFloat(farmLat)) &&
      !Number.isNaN(parseFloat(farmLon))
        ? { lat: parseFloat(farmLat), lon: parseFloat(farmLon) }
        : undefined;

    if (editingFarm) {
      updateFarm({
        ...editingFarm,
        name: farmName.trim(),
        farmerName: farmerName.trim() || profile.name,
        state: farmState.trim(),
        district: farmDistrict.trim(),
        village: farmVillage.trim(),
        coordinates: coords,
        totalArea: numericArea,
        areaUnit: farmAreaUnit,
        bighaToAcreFactor: farmAreaUnit === 'bigha' ? farmBighaFactor : editingFarm.bighaToAcreFactor,
        ownershipType: farmOwnership,
        soilType: farmSoilType.trim(),
        waterSource: farmWaterSource.trim(),
        notes: farmNotes.trim(),
      });
      showFeedback(`Updated farm "${farmName.trim()}" successfully.`);
    } else {
      addFarm({
        name: farmName.trim(),
        farmerName: farmerName.trim() || profile.name,
        state: farmState.trim(),
        district: farmDistrict.trim(),
        village: farmVillage.trim(),
        coordinates: coords,
        totalArea: numericArea,
        areaUnit: farmAreaUnit,
        bighaToAcreFactor: farmBighaFactor,
        ownershipType: farmOwnership,
        soilType: farmSoilType.trim(),
        waterSource: farmWaterSource.trim(),
        notes: farmNotes.trim(),
        isArchived: false,
        isDemoRecord: false,
      });
      showFeedback(`Registered new farm "${farmName.trim()}" and set as active farm.`);
    }

    setShowFarmForm(false);
    setEditingFarm(null);
    setSearchParams({});
  };

  const handlePlotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFarm || !plotName.trim()) return;
    const numArea = parseFloat(plotArea) || 1;
    addPlot({
      farmId: activeFarm.id,
      name: plotName.trim(),
      area: numArea,
      areaUnit: plotAreaUnit,
      soilType: plotSoil.trim() || activeFarm.soilType,
      irrigationMethod: plotIrrig.trim(),
      notes: plotNotes.trim() || undefined,
    });
    setPlotName('');
    setPlotNotes('');
    setShowPlotForm(false);
    showFeedback(`Added plot "${plotName.trim()}" to ${activeFarm.name}.`);
  };

  const handleImageFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string | undefined) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 3 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setter(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCropSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetFarm = activeFarm || farms[0];
    if (!targetFarm) return;

    const finalCropName =
      cropPreset === 'Custom Crop Name...' ? customCropName.trim() : cropPreset;
    if (!finalCropName) return;

    const selectedPlot = activeFarmPlots.find((p) => p.id === cropPlotId);
    const plotLabel = selectedPlot ? selectedPlot.name : 'General Plot';

    addCropRecord({
      farmId: targetFarm.id,
      plotId: selectedPlot?.id || 'plot-custom',
      plotName: plotLabel,
      cropName: finalCropName,
      variety: cropVariety.trim() || 'Standard Variety',
      cultivatedArea: parseFloat(cropArea) || 1,
      areaUnit: cropAreaUnit,
      sowingDate: cropSowingDate,
      expectedHarvestDate: cropHarvestDate,
      growthStage: cropStage,
      irrigationMethod: cropIrrig.trim(),
      healthStatus: cropHealth,
      notes: cropNotes.trim(),
      photoDataUrl: cropPhotoUrl,
      isDemoRecord: false,
    });

    setShowCropForm(false);
    setCropVariety('');
    setCropNotes('');
    setCropPhotoUrl(undefined);
    showFeedback(`Saved crop record for ${finalCropName} on ${targetFarm.name}.`);
  };

  const handleObsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetFarm = activeFarm || farms[0];
    if (!targetFarm || !obsNotes.trim()) return;

    addObservation({
      farmId: targetFarm.id,
      plotName: obsPlotName.trim() || activeFarmPlots[0]?.name || 'Plot A1',
      cropName: obsCropName.trim() || activeFarmCrops[0]?.cropName || 'Wheat',
      category: obsCategory,
      soilMoisturePct: obsMoisture.trim() ? parseFloat(obsMoisture) : undefined,
      soilTempC: obsSoilTemp.trim() ? parseFloat(obsSoilTemp) : undefined,
      symptoms: obsSymptoms.trim() || undefined,
      pestDetails: obsPest.trim() || undefined,
      leafColorNotes: obsLeafColor.trim() || undefined,
      standingWaterStatus: obsStandingWater,
      irrigationStatus: obsIrrigStatus,
      weatherDamageNotes: obsWeatherDamage.trim() || undefined,
      notes: obsNotes.trim(),
      photoDataUrl: obsPhotoUrl,
      severity: obsSeverity,
      sourceLabel: 'Farmer Recorded',
      recordedAt: new Date().toISOString(),
    });

    setShowObsForm(false);
    setObsNotes('');
    setObsSymptoms('');
    setObsPest('');
    setObsLeafColor('');
    setObsPhotoUrl(undefined);
    setSearchParams({});
    showFeedback('Field observation saved and synced to your Dashboard.');
  };

  // Filtered observations for Historical Records
  const filteredObservations = useMemo(() => {
    return observations.filter((o) => {
      if (activeFarm && o.farmId !== activeFarm.id) return false;
      if (filterCrop !== 'All' && o.cropName !== filterCrop) return false;
      if (filterPlot !== 'All' && o.plotName !== filterPlot) return false;
      if (filterCategory !== 'All' && o.category !== filterCategory) return false;
      if (filterDateFrom && o.recordedAt.slice(0, 10) < filterDateFrom) return false;
      if (filterSearch.trim()) {
        const q = filterSearch.toLowerCase();
        const hay = `${o.notes} ${o.symptoms || ''} ${o.pestDetails || ''} ${o.cropName || ''} ${o.plotName || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    observations,
    activeFarm,
    filterCrop,
    filterPlot,
    filterCategory,
    filterDateFrom,
    filterSearch,
  ]);

  const handleExportObservationsCsv = () => {
    const headers = [
      'Date',
      'Farm ID',
      'Plot',
      'Crop',
      'Category',
      'Soil Moisture (%)',
      'Soil Temp (C)',
      'Irrigation Status',
      'Severity',
      'Source',
      'Notes',
    ];
    const rows = filteredObservations.map((o) => [
      o.recordedAt,
      o.farmId,
      `"${(o.plotName || '').replace(/"/g, '""')}"`,
      `"${(o.cropName || '').replace(/"/g, '""')}"`,
      o.category,
      o.soilMoisturePct ?? '',
      o.soilTempC ?? '',
      o.irrigationStatus ?? '',
      o.severity,
      o.sourceLabel,
      `"${o.notes.replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `agripulse-field-observations-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const selectedBighaRegion =
    REGIONAL_BIGHA_FACTORS.find((r) => r.id === convBighaRegionId) || REGIONAL_BIGHA_FACTORS[0];
  const numericConvInput = parseFloat(convInputVal) || 0;

  return (
    <div className="space-y-6">
      {/* Page Header & Active Farm Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
            Farm & Plot Digital Twin Workspace
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Register multiple farms and plots, track crop growth stages, record field observations, and convert regional land units.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <span className="text-xs font-semibold text-slate-600">Active Farm:</span>
            <select
              aria-label="Select Active Farm"
              value={activeFarm?.id || ''}
              onChange={(e) => setActiveFarmId(e.target.value)}
              className="text-xs font-bold text-forest-900 bg-transparent focus:outline-none"
            >
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} {f.isArchived ? '(Archived)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={openCreateFarm}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Register Farm</span>
          </button>
        </div>
      </div>

      {bannerMessage && (
        <div
          role="status"
          className="p-3.5 rounded-xl bg-leaf-50 border border-leaf-300 text-forest-900 text-xs font-semibold flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-leaf-600 shrink-0" />
          <span>{bannerMessage}</span>
        </div>
      )}

      {/* Workspace Sub-Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'farms', label: `Farms & Plots (${farms.length})`, icon: Tractor },
          { id: 'crops', label: `Crop Records (${activeFarmCrops.length})`, icon: Sprout },
          {
            id: 'observations',
            label: `Field Observations & History (${filteredObservations.length})`,
            icon: Eye,
          },
          { id: 'converter', label: 'Regional Land Unit Converter (Acre / Hectare / Bigha)', icon: Calculator },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as typeof activeTab)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-forest-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-forest-50 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Farm Registration / Edit Modal Form */}
      {showFarmForm && (
        <form
          onSubmit={handleFarmSubmit}
          className="bg-white rounded-2xl border-2 border-forest-600 p-5 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {editingFarm ? `Edit Farm: ${editingFarm.name}` : 'Register New Farm Holding'}
              </h3>
              <p className="text-xs text-slate-500">
                Optional fields are genuinely optional. Bigha conversions use your regional conversion factor.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowFarmForm(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Farm Name *</label>
              <input
                type="text"
                required
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                placeholder="e.g., Satpura Progressive Farm"
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Farmer Name *</label>
              <input
                type="text"
                required
                value={farmerName}
                onChange={(e) => setFarmerName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">State *</label>
              <input
                type="text"
                required
                value={farmState}
                onChange={(e) => setFarmState(e.target.value)}
                placeholder="e.g., Haryana"
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">District *</label>
              <input
                type="text"
                required
                value={farmDistrict}
                onChange={(e) => setFarmDistrict(e.target.value)}
                placeholder="e.g., Karnal"
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Village / Locality *
              </label>
              <input
                type="text"
                required
                value={farmVillage}
                onChange={(e) => setFarmVillage(e.target.value)}
                placeholder="e.g., Taraori"
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Ownership / Tenancy (Optional)
              </label>
              <select
                value={farmOwnership}
                onChange={(e) => setFarmOwnership(e.target.value as Farm['ownershipType'])}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
              >
                <option value="Owned">Owned Holding</option>
                <option value="Family Holding">Joint Family Holding</option>
                <option value="Leased">Leased / Tenant Cultivation</option>
                <option value="Shared / Co-operative">Shared / FPO Co-operative</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Total Cultivated Area *
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={farmArea}
                onChange={(e) => setFarmArea(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Area Unit *</label>
              <select
                value={farmAreaUnit}
                onChange={(e) => setFarmAreaUnit(e.target.value as AreaUnit)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
              >
                <option value="acre">Acre</option>
                <option value="hectare">Hectare</option>
                <option value="bigha">Bigha (Region-specific)</option>
              </select>
            </div>

            {farmAreaUnit === 'bigha' && (
              <div>
                <label className="block font-semibold text-amber-900 mb-1">
                  Regional Bigha Standard *
                </label>
                <select
                  value={farmBighaFactor}
                  onChange={(e) => setFarmBighaFactor(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-amber-400 bg-amber-50"
                >
                  {REGIONAL_BIGHA_FACTORS.map((r) => (
                    <option key={r.id} value={r.bighaToAcre}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Soil Type</label>
              <input
                type="text"
                value={farmSoilType}
                onChange={(e) => setFarmSoilType(e.target.value)}
                placeholder="e.g., Alluvial Loam (pH 7.1)"
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Water / Irrigation Source
              </label>
              <input
                type="text"
                value={farmWaterSource}
                onChange={(e) => setFarmWaterSource(e.target.value)}
                placeholder="e.g., Solar Borewell + Canal"
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Latitude (Optional)
                </label>
                <input
                  type="text"
                  value={farmLat}
                  onChange={(e) => setFarmLat(e.target.value)}
                  placeholder="e.g., 29.785"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Longitude (Optional)
                </label>
                <input
                  type="text"
                  value={farmLon}
                  onChange={(e) => setFarmLon(e.target.value)}
                  placeholder="e.g., 76.933"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block font-semibold text-slate-700 mb-1">
                Farm Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={farmNotes}
                onChange={(e) => setFarmNotes(e.target.value)}
                placeholder="Record leveling details, boundary landmarks, or Soil Health Card reference..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowFarmForm(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 bg-white text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-forest-800 hover:bg-forest-900 text-white"
            >
              {editingFarm ? 'Save Farm Changes' : 'Register Farm'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 1: FARMS, PLOTS & LOCATION PANEL */}
      {activeTab === 'farms' && (
        <div className="space-y-6">
          {/* Farm Cards Grid */}
          {farms.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <p className="text-sm font-bold text-slate-800">No farms registered yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Click &ldquo;Register Farm&rdquo; above to add your first farm holding.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {farms.map((f) => {
                const isSelected = activeFarm?.id === f.id;
                const farmPlotCount = plots.filter((p) => p.farmId === f.id).length;
                const farmCropCount = crops.filter((c) => c.farmId === f.id).length;
                const areaInAcres = convertArea(
                  f.totalArea,
                  f.areaUnit,
                  'acre',
                  f.bighaToAcreFactor || 0.25
                );
                const areaInHectares = convertArea(
                  f.totalArea,
                  f.areaUnit,
                  'hectare',
                  f.bighaToAcreFactor || 0.25
                );

                return (
                  <div
                    key={f.id}
                    className={`bg-white rounded-2xl p-5 border transition-all shadow-sm ${
                      isSelected
                        ? 'border-2 border-forest-700 ring-2 ring-forest-100'
                        : 'border-slate-200'
                    } ${f.isArchived ? 'opacity-70' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="text-base font-bold text-slate-900">{f.name}</h3>
                          {isSelected && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-forest-800 text-white">
                              Active Farm
                            </span>
                          )}
                          {f.isDemoRecord && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                              Demo Farm
                            </span>
                          )}
                          {f.isArchived && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                              Archived
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-forest-700" />
                          <span>
                            {f.village}, {f.district}, {f.state} • {f.ownershipType}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        {!isSelected && !f.isArchived && (
                          <button
                            type="button"
                            onClick={() => setActiveFarmId(f.id)}
                            className="px-2.5 py-1 rounded-lg bg-forest-50 hover:bg-forest-100 text-forest-800 text-xs font-bold border border-forest-200"
                          >
                            Select
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditFarm(f)}
                          aria-label={`Edit ${f.name}`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-forest-800 hover:bg-slate-100"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => archiveFarm(f.id, !f.isArchived)}
                          title={f.isArchived ? 'Restore Farm' : 'Archive Farm'}
                          aria-label={f.isArchived ? `Restore ${f.name}` : `Archive ${f.name}`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-800 hover:bg-amber-50"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteFarmId(f.id)}
                          aria-label={`Delete ${f.name}`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2.5 text-xs bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 block">
                          Cultivated Area
                        </span>
                        <span className="font-extrabold text-slate-900">
                          {f.totalArea} {f.areaUnit}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          ({areaInAcres} ac / {areaInHectares} ha)
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 block">
                          Soil Type
                        </span>
                        <span className="font-bold text-slate-800 block truncate">
                          {f.soilType}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 block">
                          Plots & Crops
                        </span>
                        <span className="font-bold text-forest-800">
                          {farmPlotCount} Plots • {farmCropCount} Crops
                        </span>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-slate-600">
                      <strong>Irrigation Source:</strong> {f.waterSource}
                    </p>
                    {f.notes && <p className="mt-1 text-xs text-slate-500">{f.notes}</p>}

                    {/* Delete Confirmation Dialog inline */}
                    {confirmDeleteFarmId === f.id && (
                      <div
                        role="alertdialog"
                        aria-label="Confirm farm deletion"
                        className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="text-red-900 font-semibold">
                          Delete &ldquo;{f.name}&rdquo; and its plots/crops?
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteFarmId(null)}
                            className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              deleteFarm(f.id);
                              setConfirmDeleteFarmId(null);
                              showFeedback(`Deleted farm "${f.name}".`);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-red-700 text-white font-bold"
                          >
                            Confirm Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Active Farm Plots & Location Panel */}
          {activeFarm && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Plots List (7 cols) */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Named Plots in {activeFarm.name} ({activeFarmPlots.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Divide your farm into manageable plots for crop and observation tracking
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPlotForm((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Plot</span>
                  </button>
                </div>

                {showPlotForm && (
                  <form
                    onSubmit={handlePlotSubmit}
                    className="mt-4 p-4 rounded-xl bg-forest-50/70 border border-forest-200 space-y-3 text-xs"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Plot Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={plotName}
                          onChange={(e) => setPlotName(e.target.value)}
                          placeholder="e.g., Plot A4 — South Orchard Block"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Area *
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            required
                            value={plotArea}
                            onChange={(e) => setPlotArea(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Unit
                          </label>
                          <select
                            value={plotAreaUnit}
                            onChange={(e) => setPlotAreaUnit(e.target.value as AreaUnit)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                          >
                            <option value="acre">Acre</option>
                            <option value="hectare">Hectare</option>
                            <option value="bigha">Bigha</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Soil Type
                        </label>
                        <input
                          type="text"
                          value={plotSoil}
                          onChange={(e) => setPlotSoil(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Irrigation Method
                        </label>
                        <input
                          type="text"
                          value={plotIrrig}
                          onChange={(e) => setPlotIrrig(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPlotForm(false)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-forest-800 text-white font-bold"
                      >
                        Save Plot
                      </button>
                    </div>
                  </form>
                )}

                <div className="mt-4 space-y-2.5">
                  {activeFarmPlots.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                      No named plots registered for this farm yet.
                    </div>
                  ) : (
                    activeFarmPlots.map((p) => {
                      const plotCrop = crops.find((c) => c.plotId === p.id);
                      return (
                        <div
                          key={p.id}
                          className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-slate-900">{p.name}</h4>
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-forest-800">
                                {p.area} {p.areaUnit}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1">
                              Soil: {p.soilType} • Irrigation: {p.irrigationMethod}
                            </p>
                            {plotCrop && (
                              <p className="text-[11px] font-semibold text-leaf-700 mt-0.5">
                                Current Crop: {plotCrop.cropName} ({plotCrop.variety}) —{' '}
                                {plotCrop.growthStage}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => deletePlot(p.id)}
                            aria-label={`Delete ${p.name}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Farm Location & Digital Twin Plot Schematic Panel (5 cols) */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Farm Location & Plot Layout
                      </h3>
                      <p className="text-xs text-slate-500">
                        Saved location record for {activeFarm.name}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      Map API: Not Configured
                    </span>
                  </div>

                  <div className="mt-4 p-4 rounded-xl bg-forest-950 text-white space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-leaf-300 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        {activeFarm.village}, {activeFarm.district}, {activeFarm.state}
                      </span>
                      <span className="text-[11px] text-forest-300">
                        {activeFarm.coordinates
                          ? `${activeFarm.coordinates.lat}° N, ${activeFarm.coordinates.lon}° E`
                          : 'No GPS coordinates entered'}
                      </span>
                    </div>

                    {/* Visual Plot Layout Schematic */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {activeFarmPlots.map((p) => (
                        <div
                          key={p.id}
                          className="p-2.5 rounded-lg bg-forest-900/90 border border-forest-700 text-xs"
                        >
                          <span className="font-bold text-white block truncate">{p.name}</span>
                          <span className="text-[11px] text-leaf-300">
                            {p.area} {p.areaUnit} • {p.soilType}
                          </span>
                        </div>
                      ))}
                    </div>

                    <p className="text-[11px] text-forest-200 pt-1 border-t border-forest-800">
                      Note: External interactive map tiles are not connected in offline/demo mode. Showing saved village/district metadata and plot schematic.
                    </p>
                  </div>
                </div>

                <div className="mt-4 text-xs text-slate-600 space-y-1">
                  <p>
                    <strong>Registered Farmer:</strong> {activeFarm.farmerName}
                  </p>
                  <p>
                    <strong>Water Source:</strong> {activeFarm.waterSource}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CROP RECORDS */}
      {activeTab === 'crops' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Crop Records & Growth Stage Tracker — {activeFarm?.name || 'All Farms'}
              </h3>
              <p className="text-xs text-slate-500">
                Supports common Indian crops (Rice, Wheat, Mustard, Chickpea, Maize, Cotton, Sugarcane, Vegetables) or any custom crop name.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setCropPlotId(activeFarmPlots[0]?.id || '');
                setShowCropForm((prev) => !prev);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>Add Crop Record</span>
            </button>
          </div>

          {showCropForm && (
            <form
              onSubmit={handleCropSubmit}
              className="bg-white rounded-2xl border-2 border-forest-600 p-5 shadow-md space-y-4 text-xs"
            >
              <h4 className="text-sm font-bold text-slate-900">
                Add New Crop Record to {activeFarm?.name}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Select Crop or Custom *
                  </label>
                  <select
                    value={cropPreset}
                    onChange={(e) => setCropPreset(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {COMMON_INDIAN_CROPS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {cropPreset === 'Custom Crop Name...' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Custom Crop Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={customCropName}
                      onChange={(e) => setCustomCropName(e.target.value)}
                      placeholder="e.g., Turmeric / Pearl Millet (Bajra)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Variety (If Known)
                  </label>
                  <input
                    type="text"
                    value={cropVariety}
                    onChange={(e) => setCropVariety(e.target.value)}
                    placeholder="e.g., HD-3226 / Pusa Bold"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Plot</label>
                  <select
                    value={cropPlotId}
                    onChange={(e) => setCropPlotId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {activeFarmPlots.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.area} {p.areaUnit})
                      </option>
                    ))}
                    <option value="">General Farm Block</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Cultivated Area *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      value={cropArea}
                      onChange={(e) => setCropArea(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                    <select
                      value={cropAreaUnit}
                      onChange={(e) => setCropAreaUnit(e.target.value as AreaUnit)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                    >
                      <option value="acre">Acre</option>
                      <option value="hectare">Hectare</option>
                      <option value="bigha">Bigha</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Growth Stage *
                  </label>
                  <select
                    value={cropStage}
                    onChange={(e) => setCropStage(e.target.value as CropGrowthStage)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {GROWTH_STAGES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Sowing / Transplanting Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={cropSowingDate}
                    onChange={(e) => setCropSowingDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Expected Harvest Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={cropHarvestDate}
                    onChange={(e) => setCropHarvestDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Irrigation Method
                  </label>
                  <input
                    type="text"
                    value={cropIrrig}
                    onChange={(e) => setCropIrrig(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Optional Crop Photograph
                  </label>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 w-full">
                    <Camera className="w-4 h-4 text-forest-700" />
                    <span className="truncate">
                      {cropPhotoUrl ? 'Photo Attached' : 'Upload Crop Photo (Optional)'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFile(e, setCropPhotoUrl)}
                      className="sr-only"
                    />
                  </label>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                  <input
                    type="text"
                    value={cropNotes}
                    onChange={(e) => setCropNotes(e.target.value)}
                    placeholder="Record seed treatment, basal fertilizer, or field observations..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCropForm(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-forest-800 text-white font-bold"
                >
                  Save Crop Record
                </button>
              </div>
            </form>
          )}

          {/* Crop Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeFarmCrops.map((crop) => (
              <div
                key={crop.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h4 className="text-base font-bold text-slate-900">{crop.cropName}</h4>
                        <span className="text-xs font-semibold text-forest-800 bg-forest-50 px-2 py-0.5 rounded border border-forest-200">
                          {crop.variety}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            crop.healthStatus === 'Healthy'
                              ? 'bg-leaf-100 text-leaf-900'
                              : crop.healthStatus === 'Watch / Mild Stress'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-red-100 text-red-900'
                          }`}
                        >
                          {crop.healthStatus}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {crop.plotName} • {crop.cultivatedArea} {crop.areaUnit}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteCropRecord(crop.id)}
                      aria-label={`Delete ${crop.cropName}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 block">
                        Growth Stage
                      </span>
                      <span className="font-bold text-forest-900">{crop.growthStage}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 block">
                        Sowing Date
                      </span>
                      <span className="font-semibold text-slate-800">
                        {formatDate(crop.sowingDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 block">
                        Expected Harvest
                      </span>
                      <span className="font-semibold text-slate-800">
                        {formatDate(crop.expectedHarvestDate)}
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-600">
                    <strong>Irrigation Method:</strong> {crop.irrigationMethod}
                  </p>
                  {crop.notes && <p className="mt-1 text-xs text-slate-500">{crop.notes}</p>}
                  {crop.photoDataUrl && (
                    <img
                      src={crop.photoDataUrl}
                      alt={`${crop.cropName} field snapshot`}
                      className="mt-3 h-28 w-full object-cover rounded-xl border border-slate-200"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: FIELD OBSERVATIONS & HISTORICAL RECORDS WITH CSV EXPORT */}
      {activeTab === 'observations' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Field Observations & Searchable Historical Log
              </h3>
              <p className="text-xs text-slate-500">
                Record manual soil moisture, plant symptoms, pest sightings, standing water, and irrigation status.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportObservationsCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold"
              >
                <Download className="w-4 h-4 text-forest-700" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={() => setShowObsForm((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold"
              >
                <Plus className="w-4 h-4" />
                <span>Record Observation</span>
              </button>
            </div>
          </div>

          {showObsForm && (
            <form
              onSubmit={handleObsSubmit}
              className="bg-white rounded-2xl border-2 border-forest-600 p-5 shadow-md space-y-4 text-xs"
            >
              <h4 className="text-sm font-bold text-slate-900">
                New Field Observation — {activeFarm?.name}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Observation Category *
                  </label>
                  <select
                    value={obsCategory}
                    onChange={(e) => setObsCategory(e.target.value as ObservationCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {OBSERVATION_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Plot</label>
                  <select
                    value={obsPlotName}
                    onChange={(e) => setObsPlotName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {activeFarmPlots.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Crop</label>
                  <select
                    value={obsCropName}
                    onChange={(e) => setObsCropName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {activeFarmCrops.map((c) => (
                      <option key={c.id} value={c.cropName}>
                        {c.cropName} ({c.variety})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Severity Status
                  </label>
                  <select
                    value={obsSeverity}
                    onChange={(e) =>
                      setObsSeverity(e.target.value as FieldObservation['severity'])
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Watch">Watch</option>
                    <option value="Action Needed">Action Needed</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Soil Moisture % (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={obsMoisture}
                    onChange={(e) => setObsMoisture(e.target.value)}
                    placeholder="e.g., 54"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Soil Temp °C (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={obsSoilTemp}
                    onChange={(e) => setObsSoilTemp(e.target.value)}
                    placeholder="e.g., 24.5"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Irrigation Status
                  </label>
                  <select
                    value={obsIrrigStatus}
                    onChange={(e) =>
                      setObsIrrigStatus(
                        e.target.value as FieldObservation['irrigationStatus']
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="Adequate">Adequate</option>
                    <option value="Recently Irrigated">Recently Irrigated</option>
                    <option value="Irrigation Due">Irrigation Due</option>
                    <option value="Dry Topsoil">Dry Topsoil</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Standing Water
                  </label>
                  <select
                    value={obsStandingWater}
                    onChange={(e) =>
                      setObsStandingWater(
                        e.target.value as FieldObservation['standingWaterStatus']
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="None">None</option>
                    <option value="Moderate Puddling">Moderate Puddling</option>
                    <option value="Waterlogged">Waterlogged</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Plant Symptoms / Leaf Color / Pest Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={obsSymptoms}
                    onChange={(e) => setObsSymptoms(e.target.value)}
                    placeholder="e.g., Mild yellowing on lower canopy or painted bug near bund"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Field Photograph (Optional)
                  </label>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 w-full">
                    <Camera className="w-4 h-4 text-forest-700" />
                    <span>
                      {obsPhotoUrl ? 'Observation Photo Attached' : 'Upload Field Photo'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFile(e, setObsPhotoUrl)}
                      className="sr-only"
                    />
                  </label>
                </div>

                <div className="sm:col-span-2 lg:col-span-4">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Detailed Observation Notes *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={obsNotes}
                    onChange={(e) => setObsNotes(e.target.value)}
                    placeholder="Describe what you observed in the plot today..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowObsForm(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-forest-800 text-white font-bold"
                >
                  Save Observation
                </button>
              </div>
            </form>
          )}

          {/* Filters Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Search Notes
              </label>
              <input
                type="search"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="Search keywords..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Filter by Category
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value="All">All Categories</option>
                {OBSERVATION_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Filter by Crop
              </label>
              <select
                value={filterCrop}
                onChange={(e) => setFilterCrop(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value="All">All Crops</option>
                {Array.from(new Set(observations.map((o) => o.cropName).filter(Boolean))).map(
                  (c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  )
                )}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Filter by Plot
              </label>
              <select
                value={filterPlot}
                onChange={(e) => setFilterPlot(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value="All">All Plots</option>
                {Array.from(new Set(observations.map((o) => o.plotName).filter(Boolean))).map(
                  (p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  )
                )}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          {/* Observations List */}
          <div className="space-y-3">
            {filteredObservations.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                No field observations match the selected filters.
              </div>
            ) : (
              filteredObservations.map((obs) => (
                <div
                  key={obs.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-forest-100 text-forest-900">
                        {obs.category}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          obs.severity === 'Action Needed'
                            ? 'bg-red-100 text-red-800'
                            : obs.severity === 'Watch'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-leaf-100 text-leaf-800'
                        }`}
                      >
                        {obs.severity}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {obs.sourceLabel}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatDateTime(obs.recordedAt)}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-900">
                      {obs.plotName || 'Plot'} • {obs.cropName || 'Crop'}
                    </p>
                    <p className="text-xs text-slate-700 leading-relaxed">{obs.notes}</p>

                    <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-slate-600">
                      {obs.soilMoisturePct !== undefined && (
                        <span>
                          <strong>Soil Moisture:</strong> {obs.soilMoisturePct}%
                        </span>
                      )}
                      {obs.soilTempC !== undefined && (
                        <span>
                          <strong>Soil Temp:</strong> {obs.soilTempC}°C
                        </span>
                      )}
                      {obs.irrigationStatus && (
                        <span>
                          <strong>Irrigation:</strong> {obs.irrigationStatus}
                        </span>
                      )}
                      {obs.standingWaterStatus && (
                        <span>
                          <strong>Standing Water:</strong> {obs.standingWaterStatus}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteObservation(obs.id)}
                    aria-label="Delete observation"
                    className="self-end sm:self-start p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: REGIONAL LAND UNIT CONVERTER */}
      {activeTab === 'converter' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Regional Agricultural Land Unit Converter (Acre • Hectare • Bigha)
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Because the size of a Bigha varies significantly across Indian states, select your regional revenue standard below for accurate conversion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Enter Land Area Value
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={convInputVal}
                onChange={(e) => setConvInputVal(e.target.value)}
                className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-slate-300 bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">From Unit</label>
              <select
                value={convFromUnit}
                onChange={(e) => setConvFromUnit(e.target.value as AreaUnit)}
                className="w-full px-3 py-2 text-sm font-semibold rounded-xl border border-slate-300 bg-white"
              >
                <option value="bigha">Bigha</option>
                <option value="acre">Acre</option>
                <option value="hectare">Hectare</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Regional Bigha Standard *
              </label>
              <select
                value={convBighaRegionId}
                onChange={(e) => setConvBighaRegionId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-forest-300 bg-forest-50 text-forest-950"
              >
                {REGIONAL_BIGHA_FACTORS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-forest-50 border border-forest-200">
              <span className="text-[11px] font-bold uppercase text-forest-800 block">
                Equivalent in Acres
              </span>
              <span className="text-2xl font-extrabold text-forest-950 mt-1 block">
                {convertArea(
                  numericConvInput,
                  convFromUnit,
                  'acre',
                  selectedBighaRegion.bighaToAcre
                )}{' '}
                Acres
              </span>
            </div>

            <div className="p-4 rounded-xl bg-leaf-50 border border-leaf-200">
              <span className="text-[11px] font-bold uppercase text-leaf-800 block">
                Equivalent in Hectares
              </span>
              <span className="text-2xl font-extrabold text-leaf-950 mt-1 block">
                {convertArea(
                  numericConvInput,
                  convFromUnit,
                  'hectare',
                  selectedBighaRegion.bighaToAcre
                )}{' '}
                Hectares
              </span>
            </div>

            <div className="p-4 rounded-xl bg-harvest-50 border border-harvest-200">
              <span className="text-[11px] font-bold uppercase text-harvest-800 block">
                Equivalent in Regional Bighas
              </span>
              <span className="text-2xl font-extrabold text-harvest-950 mt-1 block">
                {convertArea(
                  numericConvInput,
                  convFromUnit,
                  'bigha',
                  selectedBighaRegion.bighaToAcre
                )}{' '}
                Bighas
              </span>
              <span className="text-[11px] text-harvest-800 mt-0.5 block">
                {selectedBighaRegion.description}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
