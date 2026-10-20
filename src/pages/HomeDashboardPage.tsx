import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import {
  Tractor,
  Sprout,
  CloudSun,
  BookOpen,
  Stethoscope,
  CalendarCheck,
  MapPin,
  Droplets,
  Thermometer,
  AlertTriangle,
  Plus,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  ArrowRight,
  ShoppingBag,
  Landmark,
  Bot,
  Eye,
  RadioTower,
} from 'lucide-react';
import { useAgriPulse } from '../context/AgriPulseContext';
import { FieldIntelligencePanel } from '../components/FieldIntelligencePanel';
import {
  convertArea,
  formatDate,
  getTimeOfDayGreeting,
} from '../utils/formatters';
import { ActivityCategory, FarmActivity } from '../types';

const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  'Irrigation',
  'Sowing',
  'Fertilizer Application',
  'Pest / Disease Inspection',
  'Harvest Planning',
  'General Fieldwork',
];

/** Local calendar date (yyyy-mm-dd) for defaulting new records to today. */
const todayLocal = (): string => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

export const HomeDashboardPage: React.FC = () => {
  const {
    profile,
    farms,
    activeFarm,
    setActiveFarmId,
    plots,
    crops,
    observations,
    activities,
    addActivity,
    updateActivity,
    toggleActivityComplete,
    deleteActivity,
    weather,
    diseaseReports,
    orders,
    cart,
    devices,
    openChatWithPrompt,
  } = useAgriPulse();

  const navigate = useNavigate();

  // Activity form modal/panel state
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<FarmActivity | null>(null);
  const [actTitle, setActTitle] = useState('');
  const [actCategory, setActCategory] = useState<ActivityCategory>('Irrigation');
  const [actDate, setActDate] = useState(todayLocal);
  const [actPriority, setActPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [actPlotName, setActPlotName] = useState('');
  const [actCropName, setActCropName] = useState('');
  const [actNotes, setActNotes] = useState('');
  const [activityFilter, setActivityFilter] = useState<'All' | 'Pending' | 'Completed'>('All');

  const activeFarmsList = useMemo(() => farms.filter((f) => !f.isArchived), [farms]);
  const activeFarmDevices = useMemo(
    () => (activeFarm ? devices.filter((device) => device.farmId === activeFarm.id && device.status !== 'retired') : []),
    [devices, activeFarm]
  );
  const preferredUnit = profile.preferences.preferredAreaUnit;
  const bighaFactor = profile.preferences.bighaToAcreFactor;

  // Keep every dashboard metric scoped to the selected farm.
  const totalRegisteredArea = useMemo(() => {
    if (!activeFarm) return 0;
    return Number(convertArea(
      activeFarm.totalArea,
      activeFarm.areaUnit,
      preferredUnit,
      activeFarm.bighaToAcreFactor || bighaFactor
    ).toFixed(2));
  }, [activeFarm, preferredUnit, bighaFactor]);

  // Active farm filtered records
  const currentFarmPlots = useMemo(
    () => (activeFarm ? plots.filter((p) => p.farmId === activeFarm.id) : []),
    [plots, activeFarm]
  );

  const currentFarmCrops = useMemo(
    () => (activeFarm ? crops.filter((c) => c.farmId === activeFarm.id) : []),
    [crops, activeFarm]
  );

  const currentFarmObs = useMemo(
    () =>
      (activeFarm
        ? observations.filter((o) => o.farmId === activeFarm.id)
        : []
      ).sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()),
    [observations, activeFarm]
  );

  // Latest moisture & soil temp observation
  const latestMoistureObs = useMemo(
    () => currentFarmObs.find((o) => typeof o.soilMoisturePct === 'number'),
    [currentFarmObs]
  );

  const latestSoilTempObs = useMemo(
    () => currentFarmObs.find((o) => typeof o.soilTempC === 'number'),
    [currentFarmObs]
  );

  const latestInspectionObs = currentFarmObs[0];

  const latestDiseaseReport = useMemo(() => {
    const sorted = [...diseaseReports].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return sorted.find((report) => !activeFarm || report.farmId === activeFarm.id);
  }, [diseaseReports, activeFarm]);

  const pendingActivities = useMemo(
    () => activities.filter((a) => a.status === 'Pending' && (!activeFarm || a.farmId === activeFarm.id)),
    [activities, activeFarm]
  );

  const completedActivities = useMemo(
    () => activities.filter((a) => a.status === 'Completed' && (!activeFarm || a.farmId === activeFarm.id)),
    [activities, activeFarm]
  );

  // Priority-based alerts derived from actual records
  const priorityAlerts = useMemo(() => {
    const list: {
      id: string;
      priority: 'High' | 'Medium' | 'Info';
      title: string;
      explanation: string;
      dateLabel: string;
      actionLabel: string;
      route: string;
    }[] = [];

    // 1. Heavy rainfall / shower forecast alert
    const heavyRainDay = weather.daily.find((d) => d.rainProbPct >= 60 || d.expectedRainMm >= 10);
    if (heavyRainDay) {
      list.push({
        id: 'alert-weather-rain',
        priority: 'High',
        title: `Shower Forecast on ${heavyRainDay.dayLabel} (${heavyRainDay.rainProbPct}% prob, ~${heavyRainDay.expectedRainMm} mm)`,
        explanation: `${weather.sourceType}: Passing shower and ${heavyRainDay.windKmh} km/h winds expected. Check plot drainage bunds and avoid non-essential irrigation in the forecast window.`,
        dateLabel: heavyRainDay.date,
        actionLabel: 'Open Weather Intelligence',
        route: '/weather',
      });
    }

    // 2. Irrigation needed from recorded field observation
    const dryObs = currentFarmObs.find(
      (o) =>
        o.irrigationStatus === 'Irrigation Due' ||
        (typeof o.soilMoisturePct === 'number' && o.soilMoisturePct < 42)
    );
    if (dryObs) {
      list.push({
        id: `alert-irr-${dryObs.id}`,
        priority: 'High',
        title: `Irrigation Needed: ${dryObs.plotName || 'Plot'} (${dryObs.cropName || 'Crop'})`,
        explanation: `Based on saved field observation (${dryObs.sourceLabel}) showing ${dryObs.soilMoisturePct ?? 'low'}% soil moisture: "${dryObs.notes}"`,
        dateLabel: formatDate(dryObs.recordedAt),
        actionLabel: 'Inspect Plot Records',
        route: '/farm',
      });
    }

    // 3. Potential disease symptoms recorded
    const openReport = diseaseReports.find((r) => r.status === 'Needs inspection' && (!activeFarm || r.farmId === activeFarm.id));
    if (openReport) {
      list.push({
        id: `alert-dis-${openReport.id}`,
        priority: 'High',
        title: `Crop Inspection Due: ${openReport.cropName} in ${openReport.plotName}`,
        explanation: `Field note for ${openReport.cropName} marked "${openReport.status}".`,
        dateLabel: formatDate(openReport.createdAt),
        actionLabel: 'Browse Disease Index',
        route: '/disease',
      });
    }

    // 4. Upcoming high-priority farm activity
    const nextUrgentTask = pendingActivities.find((a) => a.priority === 'High');
    if (nextUrgentTask) {
      list.push({
        id: `alert-act-${nextUrgentTask.id}`,
        priority: 'Medium',
        title: `Scheduled Activity: ${nextUrgentTask.title}`,
        explanation: `${nextUrgentTask.category} for ${nextUrgentTask.cropName || 'Farm'} (${nextUrgentTask.plotName || 'Active Farm'}).`,
        dateLabel: nextUrgentTask.scheduledDate,
        actionLabel: 'View Farm Calendar',
        route: '/farm',
      });
    }

    // 5. Demo order status update
    if (orders.length > 0) {
      const latestOrder = orders[0];
      list.push({
        id: `alert-ord-${latestOrder.id}`,
        priority: 'Info',
        title: `Demo Order ${latestOrder.id}: Status "${latestOrder.orderStatus}"`,
        explanation: `Demonstration store order for ${latestOrder.items.length} item(s) (${latestOrder.paymentMode}).`,
        dateLabel: formatDate(latestOrder.createdAt),
        actionLabel: 'View Demo Orders',
        route: '/orders',
      });
    }

    return list;
  }, [weather, currentFarmObs, diseaseReports, pendingActivities, orders, activeFarm]);

  // Chart 1: Soil Moisture History from saved observations
  const moistureChartData = useMemo(() => {
    const withMoisture = [...currentFarmObs]
      .filter((o) => typeof o.soilMoisturePct === 'number')
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

    return withMoisture.map((o) => ({
      date: formatDate(o.recordedAt),
      plot: o.plotName ? o.plotName.split('—')[0].trim() : 'Plot',
      moisturePct: o.soilMoisturePct,
      soilTempC: o.soilTempC ?? 24,
    }));
  }, [currentFarmObs]);

  // Chart 2: Weekly Weather & Rainfall Forecast
  const weatherChartData = useMemo(() => {
    return weather.daily.map((d) => ({
      day: d.dayLabel.split(' ')[0],
      maxTemp: d.tempMaxC,
      minTemp: d.tempMinC,
      rainMm: d.expectedRainMm,
      rainProb: d.rainProbPct,
    }));
  }, [weather]);

  // Chart 3: Activities Completed vs Pending + Crop Health breakdown
  const statusBreakdownData = useMemo(() => {
    const healthyCount = currentFarmCrops.filter((c) => c.healthStatus === 'Healthy').length;
    const watchCount = currentFarmCrops.filter((c) => c.healthStatus === 'Watch / Mild Stress').length;
    const inspectCount = currentFarmCrops.filter((c) => c.healthStatus === 'Needs Inspection').length;

    return [
      { name: 'Tasks Pending', count: pendingActivities.length, color: '#c78a2f' },
      { name: 'Tasks Done', count: completedActivities.length, color: '#387333' },
      { name: 'Healthy Crops', count: healthyCount, color: '#65a650' },
      { name: 'Watch / Stress', count: watchCount + inspectCount, color: '#c84e48' },
    ];
  }, [pendingActivities, completedActivities, currentFarmCrops]);

  const openNewActivityModal = () => {
    setEditingActivity(null);
    setActTitle('');
    setActCategory('Irrigation');
    setActDate('2026-10-15');
    setActPriority('Medium');
    setActDate(todayLocal());
    setActPlotName(currentFarmPlots[0]?.name || '');
    setActCropName(currentFarmCrops[0]?.cropName || '');
    setActNotes('');
    setShowActivityForm(true);
  };

  const openEditActivityModal = (act: FarmActivity) => {
    setEditingActivity(act);
    setActTitle(act.title);
    setActCategory(act.category);
    setActDate(act.scheduledDate);
    setActPriority(act.priority);
    setActPlotName(act.plotName || '');
    setActCropName(act.cropName || '');
    setActNotes(act.notes);
    setShowActivityForm(true);
  };

  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actTitle.trim()) return;

    if (editingActivity) {
      updateActivity({
        ...editingActivity,
        title: actTitle.trim(),
        category: actCategory,
        scheduledDate: actDate,
        priority: actPriority,
        plotName: actPlotName.trim() || undefined,
        cropName: actCropName.trim() || undefined,
        notes: actNotes.trim(),
      });
    } else {
      addActivity({
        farmId: activeFarm?.id || farms[0]?.id || 'farm-001',
        title: actTitle.trim(),
        category: actCategory,
        scheduledDate: actDate,
        priority: actPriority,
        status: 'Pending',
        plotName: actPlotName.trim() || undefined,
        cropName: actCropName.trim() || undefined,
        notes: actNotes.trim(),
        isDemoRecord: false,
      });
    }
    setShowActivityForm(false);
    setEditingActivity(null);
  };

  const filteredActivities = useMemo(() => {
    return activities
      .filter((a) => {
        if (activeFarm && a.farmId !== activeFarm.id) return false;
        if (activityFilter === 'Pending') return a.status === 'Pending';
        if (activityFilter === 'Completed') return a.status === 'Completed';
        return true;
      })
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  }, [activities, activityFilter, activeFarm]);

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const activeDemoOrders = orders.filter((order) => ['Placed', 'Processing', 'Dispatched'].includes(order.orderStatus)).length;

  return (
    <div className="dashboard-page space-y-6">
      {/* 1. Welcome Banner & Active Farm Switcher */}
      <section className="dashboard-hero bg-forest-900 text-white rounded-2xl p-5 sm:p-6 shadow-sm border border-forest-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="dashboard-hero-copy">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-forest-800 border border-forest-700 text-leaf-300 text-[11px] font-semibold mb-2">
            <MapPin className="w-3.5 h-3.5" />
            <span>
              {activeFarm
                ? `${activeFarm.village}, ${activeFarm.district}, ${activeFarm.state}`
                : `${profile.village}, ${profile.district}, ${profile.state}`}
            </span>
            <span className="text-forest-400">•</span>
            <span>{profile.isDemoAccount ? 'Demo workspace' : 'Farmer workspace'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            {getTimeOfDayGreeting()}, {profile.name}
          </h2>
          <p className="text-xs sm:text-sm text-forest-100 mt-1">
            Here is your farm overview for today. All metrics reflect your saved farm records and labelled demo forecasts.
          </p>
        </div>

        {/* Active Farm Selector */}
        <div className="dashboard-farm-switcher flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-forest-950/70 border border-forest-800 p-3 rounded-xl">
          <div>
            <label
              htmlFor="dashboard-active-farm-select"
              className="block text-[10px] font-bold uppercase tracking-wider text-forest-300"
            >
              Active Farm Digital Twin
            </label>
            <select
              id="dashboard-active-farm-select"
              value={activeFarm?.id || ''}
              onChange={(e) => setActiveFarmId(e.target.value)}
              className="mt-1 bg-forest-900 text-white text-xs font-semibold rounded-lg px-3 py-2 border border-forest-700 focus:outline-none focus:ring-2 focus:ring-leaf-400"
            >
              {activeFarmsList.length === 0 ? (
                <option value="">No active farms registered</option>
              ) : (
                activeFarmsList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.totalArea} {f.areaUnit} — {f.district})
                  </option>
                ))
              )}
            </select>
          </div>
          <button
            type="button"
            onClick={() => navigate('/farm')}
            className="px-3.5 py-2 rounded-xl bg-leaf-500 hover:bg-leaf-400 text-forest-950 text-xs font-bold transition-colors shrink-0"
          >
            Manage Farms
          </button>
        </div>
      </section>

      {/* 2. Quick Actions Bar */}
      <section className="dashboard-quick-actions" aria-label="Quick Farm Actions">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Quick Actions
          </h3>
        </div>
        <div className="dashboard-quick-grid grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => navigate('/farm?tab=farms&action=new')}
            className="dashboard-quick-action flex items-center gap-2.5 p-3.5 rounded-xl bg-white hover:bg-forest-50 border border-slate-200 hover:border-forest-300 text-left transition-all shadow-sm"
          >
            <div className="p-2 rounded-lg bg-forest-100 text-forest-800">
              <Tractor className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800 leading-tight">Add a Farm</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/farm?tab=observations&action=new')}
            className="dashboard-quick-action flex items-center gap-2.5 p-3.5 rounded-xl bg-white hover:bg-forest-50 border border-slate-200 hover:border-forest-300 text-left transition-all shadow-sm"
          >
            <div className="p-2 rounded-lg bg-leaf-100 text-leaf-800">
              <Eye className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800 leading-tight">
              Record Observation
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/weather')}
            className="dashboard-quick-action flex items-center gap-2.5 p-3.5 rounded-xl bg-white hover:bg-forest-50 border border-slate-200 hover:border-forest-300 text-left transition-all shadow-sm"
          >
            <div className="p-2 rounded-lg bg-sky-100 text-sky-800">
              <CloudSun className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800 leading-tight">Check Weather</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/disease')}
            className="dashboard-quick-action flex items-center gap-2.5 p-3.5 rounded-xl bg-white hover:bg-forest-50 border border-slate-200 hover:border-forest-300 text-left transition-all shadow-sm"
          >
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800 leading-tight">
              100 Diseases
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/store')}
            className="dashboard-quick-action flex items-center gap-2.5 p-3.5 rounded-xl bg-white hover:bg-forest-50 border border-slate-200 hover:border-forest-300 text-left transition-all shadow-sm"
          >
            <div className="p-2 rounded-lg bg-harvest-100 text-harvest-800">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800 leading-tight">Browse Store</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/schemes')}
            className="dashboard-quick-action flex items-center gap-2.5 p-3.5 rounded-xl bg-white hover:bg-forest-50 border border-slate-200 hover:border-forest-300 text-left transition-all shadow-sm"
          >
            <div className="p-2 rounded-lg bg-earth-100 text-earth-800">
              <Landmark className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800 leading-tight">
              Find Schemes
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/devices')}
            className="dashboard-quick-action flex items-center gap-2.5 p-3.5 rounded-xl bg-white hover:bg-forest-50 border border-slate-200 hover:border-forest-300 text-left transition-all shadow-sm"
          >
            <div className="p-2 rounded-lg bg-forest-100 text-forest-800"><RadioTower className="w-4 h-4" /></div>
            <span className="text-xs font-bold text-slate-800 leading-tight">Devices & IoT</span>
          </button>

          <button
            type="button"
            onClick={() => openChatWithPrompt('What should I check on my farm today?')}
            className="dashboard-quick-action flex items-center gap-2.5 p-3.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-left transition-all shadow-sm"
          >
            <div className="p-2 rounded-lg bg-leaf-500/20 text-leaf-300">
              <Bot className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold leading-tight">Ask AGRIPULSE AI</span>
          </button>
        </div>
      </section>

      {/* 3. Six saved-record farm summary cards */}
      <section aria-label="Key Farm Summary Metrics" className="dashboard-metrics-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        <article className="metric-card">
          <div className="metric-card-heading"><span className="metric-icon"><Tractor size={17} /></span><span>Farm area</span></div>
          <div className="metric-value-row"><strong>{totalRegisteredArea}</strong><span>{preferredUnit}{totalRegisteredArea === 1 ? '' : 's'}</span></div>
          <p>{activeFarm?.name || 'No active farm selected'}</p>
        </article>

        <article className="metric-card">
          <div className="metric-card-heading"><span className="metric-icon metric-icon--leaf"><Sprout size={17} /></span><span>Crops in focus</span></div>
          <div className="metric-value-row"><strong>{currentFarmCrops.length}</strong><span>active crop records</span></div>
          <p>{currentFarmCrops.length ? Array.from(new Set(currentFarmCrops.map((crop) => crop.growthStage.split(' ')[0]))).slice(0, 2).join(' · ') : 'Add crops in Farm Management'}</p>
        </article>

        <article className="metric-card">
          <div className="metric-card-heading"><span className="metric-icon metric-icon--water"><Droplets size={17} /></span><span>Soil moisture</span></div>
          <div className="metric-value-row"><strong>{latestMoistureObs?.soilMoisturePct !== undefined ? `${latestMoistureObs.soilMoisturePct}%` : '—'}</strong><span>{latestMoistureObs ? 'last recorded' : 'no record yet'}</span></div>
          <p>{latestMoistureObs ? `Farmer recorded · ${latestMoistureObs.plotName || 'active farm'}` : 'No manual moisture observation'}{activeFarmDevices.length ? ` · ${activeFarmDevices.length} device record${activeFarmDevices.length === 1 ? '' : 's'} in Devices` : ''}</p>
        </article>

        <article className="metric-card">
          <div className="metric-card-heading"><span className="metric-icon metric-icon--amber"><CalendarCheck size={17} /></span><span>Field activities</span></div>
          <div className="metric-value-row"><strong>{pendingActivities.length}</strong><span>pending tasks</span></div>
          <p>{pendingActivities.filter((task) => task.priority === 'High').length} high priority · {completedActivities.length} completed</p>
        </article>

        <article className="metric-card">
          <div className="metric-card-heading"><span className="metric-icon metric-icon--sun"><CloudSun size={17} /></span><span>Local weather</span></div>
          <div className="metric-value-row"><strong>{weather.tempC}°</strong><span>{weather.condition}</span></div>
          <p>{weather.rainProbabilityPct}% rain probability · {weather.sourceType}</p>
        </article>

        <article className="metric-card">
          <div className="metric-card-heading"><span className="metric-icon metric-icon--store"><ShoppingBag size={17} /></span><span>Store activity</span></div>
          <div className="metric-value-row"><strong>{cartItemCount}</strong><span>items in cart</span></div>
          <p>{activeDemoOrders} active demo {activeDemoOrders === 1 ? 'order' : 'orders'}</p>
        </article>
      </section>

      {/* 3b. Derived field intelligence: readings, alerts, screening and trends */}
      <FieldIntelligencePanel compact />

      {/* 4. Farm Condition Overview & Weather Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Farm Condition Overview (7 cols) */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Farm Condition Overview — {activeFarm?.name || 'All Farms'}
                </h3>
                <p className="text-xs text-slate-500">
                  This panel uses farmer-entered observations and crop records; device telemetry is shown separately in Devices & IoT.
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {activeFarmDevices.length} device record{activeFarmDevices.length === 1 ? '' : 's'} · telemetry shown separately
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {/* Indicator 1: Soil Moisture */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Droplets className="w-4 h-4 text-sky-600" />
                    Soil Moisture
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                    {latestMoistureObs ? (latestMoistureObs.sourceLabel || 'Last Recorded') : 'No observation'}
                  </span>
                </div>
                <p className="text-xl font-extrabold text-slate-900 mt-2">
                  {latestMoistureObs?.soilMoisturePct !== undefined
                    ? `${latestMoistureObs.soilMoisturePct}%`
                    : 'Not recorded'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {latestMoistureObs
                    ? `${latestMoistureObs.plotName} (${formatDate(latestMoistureObs.recordedAt)})`
                    : 'Log a manual probe reading in Farm'}
                </p>
              </div>

              {/* Indicator 2: Soil Temperature */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Thermometer className="w-4 h-4 text-harvest-600" />
                    Soil Temperature
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                    {latestSoilTempObs ? 'Last Recorded' : 'Demo Est.'}
                  </span>
                </div>
                <p className="text-xl font-extrabold text-slate-900 mt-2">
                  {latestSoilTempObs?.soilTempC !== undefined
                    ? `${latestSoilTempObs.soilTempC}°C`
                    : (weather.soilTempEstimateC === null ? 'Not available' : `${weather.soilTempEstimateC}°C`)}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {latestSoilTempObs
                    ? `Recorded ${formatDate(latestSoilTempObs.recordedAt)}`
                    : 'Estimated from demo agro-met data'}
                </p>
              </div>

              {/* Indicator 3: Crop Growth Stage Record */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Sprout className="w-4 h-4 text-leaf-600" />
                    Crop Stage Record
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-forest-100 text-forest-800 font-bold">
                    Saved Record
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900 mt-2 truncate">
                  {currentFarmCrops[0]
                    ? `${currentFarmCrops[0].cropName}: ${currentFarmCrops[0].growthStage}`
                    : 'No active crop'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1 truncate">
                  {currentFarmCrops.length > 1
                    ? `+ ${currentFarmCrops.length - 1} more crop plot(s) tracked`
                    : 'Manage crop stages in Farm tab'}
                </p>
              </div>

              {/* Indicator 4: Last Field Inspection */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Last Field Inspection</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
                    {latestInspectionObs?.sourceLabel || (latestInspectionObs ? 'Saved record' : 'Not recorded')}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900 mt-2">
                  {latestInspectionObs
                    ? formatDate(latestInspectionObs.recordedAt)
                    : 'No inspection logged'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1 truncate">
                  {latestInspectionObs
                    ? `${latestInspectionObs.category} — ${latestInspectionObs.plotName || 'Farm'}`
                    : 'Record field walk notes'}
                </p>
              </div>

              {/* Indicator 5: Latest Health Assessment */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Health Assessment</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      latestDiseaseReport?.status === 'Needs inspection'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {latestDiseaseReport ? latestDiseaseReport.status : 'None'}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900 mt-2 truncate">
                  {latestDiseaseReport
                    ? `${latestDiseaseReport.cropName} (${latestDiseaseReport.affectedAreaPct}% area)`
                    : 'All plots nominal'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1 truncate">
                  {latestDiseaseReport
                    ? latestDiseaseReport.analysisMode
                    : '100 crop diseases indexed'}
                </p>
              </div>

              {/* Indicator 6: Irrigation Status */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Irrigation Status</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-bold">
                    Recorded
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900 mt-2 truncate">
                  {latestInspectionObs?.irrigationStatus || 'Check Basin & Drip'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1 truncate">
                  {activeFarm?.waterSource || 'Borewell + Canal'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-500">
              Want to log a new soil moisture reading or field symptom note?
            </span>
            <button
              type="button"
              onClick={() => navigate('/farm?tab=observations&action=new')}
              className="inline-flex items-center gap-1 font-bold text-forest-800 hover:underline"
            >
              <span>Log Field Observation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* Weather Preview Card (5 cols) */}
        <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Weather Preview</h3>
                <p className="text-xs text-slate-500 truncate">{weather.locationLabel}</p>
              </div>
              <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                {weather.sourceType}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between bg-forest-50/70 border border-forest-100 rounded-xl p-4">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-forest-950">
                    {weather.tempC}°C
                  </span>
                  <span className="text-xs font-semibold text-forest-800">
                    {weather.condition}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  High: <strong>{weather.tempMaxC}°C</strong> • Low:{' '}
                  <strong>{weather.tempMinC}°C</strong> • Feels like {weather.feelsLikeC}°C
                </p>
              </div>
              <div className="text-right text-xs space-y-1 text-slate-700">
                <div>
                  Rain Prob: <strong>{weather.rainProbabilityPct}%</strong>
                </div>
                <div>
                  Humidity: <strong>{weather.humidityPct}%</strong>
                </div>
                <div>
                  Wind: <strong>{weather.windSpeedKmh} km/h</strong>
                </div>
              </div>
            </div>

            {/* Next 4 Days Preview */}
            <div className="mt-4 grid grid-cols-4 gap-2">
              {weather.daily.slice(0, 4).map((d) => (
                <div
                  key={d.date}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center"
                >
                  <span className="text-[11px] font-bold text-slate-800 block truncate">
                    {d.dayLabel.split(' ')[0]}
                  </span>
                  <span className="text-xs font-extrabold text-forest-900 mt-1 block">
                    {d.tempMaxC}° / {d.tempMinC}°
                  </span>
                  <span
                    className={`text-[10px] font-semibold mt-1 inline-block px-1.5 py-0.5 rounded ${
                      d.rainProbPct >= 50
                        ? 'bg-sky-100 text-sky-800'
                        : 'bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    {d.rainProbPct}% Rain
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Includes 7-day outlook & rainfall log
            </span>
            <button
              type="button"
              onClick={() => navigate('/weather')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold transition-colors"
            >
              <span>Open Full Weather</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      </div>

      {/* 5. Important Priority Alerts & Interactive Farm Activity Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Important Alerts Panel (5 cols) */}
        <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Priority Farm Alerts & Attention Items
              </h3>
              <p className="text-xs text-slate-500">
                Generated from your saved observations, tasks, demo orders, and forecast
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
              {priorityAlerts.length}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {priorityAlerts.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                No priority alerts right now. All recorded activities and observations are up to date.
              </div>
            ) : (
              priorityAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3.5 rounded-xl border ${
                    alert.priority === 'High'
                      ? 'bg-amber-50/70 border-amber-200'
                      : alert.priority === 'Medium'
                      ? 'bg-forest-50/60 border-forest-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle
                        className={`w-4 h-4 shrink-0 ${
                          alert.priority === 'High' ? 'text-amber-700' : 'text-forest-700'
                        }`}
                      />
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          alert.priority === 'High'
                            ? 'bg-amber-200/80 text-amber-950'
                            : 'bg-forest-200/70 text-forest-900'
                        }`}
                      >
                        {alert.priority} Priority
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-500">
                      {alert.dateLabel}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1.5">{alert.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {alert.explanation}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(alert.route)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-forest-800 hover:underline"
                  >
                    <span>{alert.actionLabel}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Interactive Weekly Activity Calendar (7 cols) */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Interactive Farm Activity Calendar
              </h3>
              <p className="text-xs text-slate-500">
                Create, edit, complete, and manage irrigation, sowing, fertilizer, and scouting tasks
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs">
                {(['All', 'Pending', 'Completed'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActivityFilter(tab)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                      activityFilter === tab
                        ? 'bg-white text-forest-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={openNewActivityModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </div>
          </div>

          {/* Add / Edit Activity Inline Form */}
          {showActivityForm && (
            <form
              onSubmit={handleSaveActivity}
              className="mt-4 p-4 rounded-xl bg-forest-50/70 border border-forest-200 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-forest-950">
                  {editingActivity ? 'Edit Farm Activity' : 'Schedule New Farm Activity'}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowActivityForm(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Activity Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={actTitle}
                    onChange={(e) => setActTitle(e.target.value)}
                    placeholder="e.g., First CRI irrigation in Wheat Plot A2"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={actCategory}
                    onChange={(e) => setActCategory(e.target.value as ActivityCategory)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    {ACTIVITY_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Scheduled Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={actDate}
                    onChange={(e) => setActDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Plot Name
                  </label>
                  <input
                    type="text"
                    value={actPlotName}
                    onChange={(e) => setActPlotName(e.target.value)}
                    placeholder="e.g., Plot A2"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={actPriority}
                    onChange={(e) =>
                      setActPriority(e.target.value as 'Low' | 'Medium' | 'High')
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={actNotes}
                    onChange={(e) => setActNotes(e.target.value)}
                    placeholder="Optional field instructions..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowActivityForm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-forest-800 hover:bg-forest-900 text-white"
                >
                  {editingActivity ? 'Save Changes' : 'Save Activity'}
                </button>
              </div>
            </form>
          )}

          {/* Activities List */}
          <div className="mt-4 space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {filteredActivities.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                No farm activities match this filter. Click &ldquo;Add Task&rdquo; to schedule fieldwork.
              </div>
            ) : (
              filteredActivities.map((act) => (
                <div
                  key={act.id}
                  className={`p-3 rounded-xl border transition-colors flex items-start justify-between gap-3 ${
                    act.status === 'Completed'
                      ? 'bg-slate-50/80 border-slate-200 opacity-80'
                      : 'bg-white border-slate-200 hover:border-forest-300'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleActivityComplete(act.id)}
                      aria-label={
                        act.status === 'Completed'
                          ? `Mark "${act.title}" as pending`
                          : `Mark "${act.title}" as completed`
                      }
                      className={`mt-0.5 p-1 rounded-lg border transition-colors ${
                        act.status === 'Completed'
                          ? 'bg-leaf-600 border-leaf-600 text-white'
                          : 'bg-white border-slate-300 text-transparent hover:border-forest-600'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-forest-50 text-forest-800 border border-forest-200">
                          {act.category}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            act.priority === 'High'
                              ? 'bg-red-50 text-red-800 border border-red-200'
                              : act.priority === 'Medium'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {act.priority}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {act.scheduledDate}
                        </span>
                      </div>
                      <h4
                        className={`text-xs font-bold mt-1 ${
                          act.status === 'Completed'
                            ? 'line-through text-slate-500'
                            : 'text-slate-900'
                        }`}
                      >
                        {act.title}
                      </h4>
                      {(act.plotName || act.cropName) && (
                        <p className="text-[11px] text-forest-800 font-medium mt-0.5">
                          {[act.plotName, act.cropName].filter(Boolean).join(' • ')}
                        </p>
                      )}
                      {act.notes && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{act.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditActivityModal(act)}
                      aria-label={`Edit ${act.title}`}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-forest-800 hover:bg-slate-100"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteActivity(act.id)}
                      aria-label={`Delete ${act.title}`}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* 6. Dashboard Charts */}
      <section aria-label="Farm Analytics & Visualizations" className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart 1: Recorded Soil Moisture History */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-slate-900">
              Recorded Soil Moisture History (%)
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              Saved Logs
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mb-4">
            Manual probe & demo observation entries ({moistureChartData.length} readings)
          </p>

          {moistureChartData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-xs text-slate-500 bg-slate-50 rounded-xl">
              No soil moisture readings saved yet.
            </div>
          ) : (
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={moistureChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="moisturePct"
                    name="Soil Moisture (%)"
                    stroke="#2b674c"
                    fill="#dcece3"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 2: 7-Day Demo Weather & Expected Rainfall */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-slate-900">
              Weekly Temp (°C) & Rain Forecast (mm)
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
              Demo Forecast
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mb-4">
            7-day outlook for {weather.district}, {weather.state}
          </p>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weatherChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="maxTemp" name="Max Temp (°C)" fill="#d69d37" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rainMm" name="Expected Rain (mm)" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Activities & Crop Health Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-slate-900">
              Activities & Crop Health Summary
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-forest-50 text-forest-800">
              {profile.isDemoAccount ? 'Development Demo Records' : 'Account Records'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mb-4">
            Completed vs. pending tasks & saved crop health statuses
          </p>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusBreakdownData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]}>
                  {statusBreakdownData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
};
