import { useMemo } from 'react';
import { useAgriPulse } from '../context/AgriPulseContext';
import { useFarmTelemetry } from './useFarmTelemetry';
import {
  AlertItem,
  CropHealthEntry,
  FarmOverview,
  FieldIntelligenceInput,
  IrrigationAssessment,
  SoilProfileRow,
  StressIndicator,
  ZoneSnapshot,
  buildAlerts,
  buildCropHealth,
  buildFarmOverview,
  buildSoilRows,
  buildStressIndicators,
  buildZoneSnapshots,
  resolveMoisture,
} from '../services/fieldIntelligence';
import { TelemetryReading } from '../types';

export interface FarmScope {
  farmName: string;
  farmId: string;
  hasFarm: boolean;
  zones: ZoneSnapshot[];
  overview: FarmOverview;
  alerts: AlertItem[];
  stress: StressIndicator[];
  cropHealth: CropHealthEntry[];
  soilRows: SoilProfileRow[];
  /** Every stored physical-sensor reading for the selected farm's devices. */
  readings: TelemetryReading[];
  telemetryLoading: boolean;
  telemetryError: string | null;
  telemetryLastFetchedAt: string | null;
  refreshTelemetry: () => Promise<void>;
  /** Set when the user has no farm record yet, so pages can show a first-step empty state. */
  needsFarmSetup: boolean;
  irrigationByZone: { zoneName: string; assessment: IrrigationAssessment }[];
  generatedAt: string;
}

/**
 * Single hook that builds every derived field-intelligence view for the farm currently selected in
 * the workspace. All modules read from here so numbers cannot drift between pages.
 */
export function useFarmScope(): FarmScope {
  const {
    activeFarm,
    farms,
    plots,
    crops,
    observations,
    devices,
    weather,
    rainfallLogs,
    diseaseReports,
    activities,
  } = useAgriPulse();

  const telemetry = useFarmTelemetry(devices, true);

  const scope = useMemo(() => {
    const activeFarms = farms.filter((farm) => !farm.isArchived);
    const farm = activeFarm || activeFarms[0];
    const farmId = farm?.id || '';
    const farmPlots = plots.filter((plot) => plot.farmId === farmId);
    const farmCrops = crops.filter((crop) => crop.farmId === farmId);
    const farmObservations = observations.filter((item) => item.farmId === farmId);
    const farmRainfall = rainfallLogs.filter((log) => log.farmId === farmId);
    const farmReports = diseaseReports.filter((report) => report.farmId === farmId);
    const farmActivities = activities.filter((item) => item.farmId === farmId);
    const farmDevices = devices.filter((device) => device.farmId === farmId);

    const input: FieldIntelligenceInput = {
      farm,
      plots: farmPlots,
      crops: farmCrops,
      observations: farmObservations,
      devices: farmDevices,
      readingsByDevice: telemetry.readingsByDevice,
      weather,
      rainfallLogs: farmRainfall,
      diseaseReports: farmReports,
      activities: farmActivities,
      telemetryLoading: telemetry.loading,
    };

    const zones = buildZoneSnapshots(input);
    const readings = farmDevices.flatMap((device) => telemetry.readingsByDevice[device.id] || []);

    return {
      farm,
      farmId,
      input,
      zones,
      readings,
      overview: buildFarmOverview(input, zones),
      alerts: buildAlerts(input, zones),
      stress: buildStressIndicators(input, zones),
      cropHealth: buildCropHealth(input, zones),
      soilRows: buildSoilRows(input, zones),
      irrigationByZone: zones.map((zone) => ({ zoneName: zone.plot.name, assessment: zone.irrigation })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeFarm,
    farms,
    plots,
    crops,
    observations,
    devices,
    weather,
    rainfallLogs,
    diseaseReports,
    activities,
    telemetry.readingsByDevice,
    telemetry.loading,
  ]);

  return {
    farmName: scope.farm?.name || 'No farm selected',
    farmId: scope.farmId,
    hasFarm: Boolean(scope.farm),
    zones: scope.zones,
    overview: scope.overview,
    alerts: scope.alerts,
    stress: scope.stress,
    cropHealth: scope.cropHealth,
    soilRows: scope.soilRows,
    readings: scope.readings,
    telemetryLoading: telemetry.loading,
    telemetryError: telemetry.error,
    telemetryLastFetchedAt: telemetry.lastFetchedAt,
    refreshTelemetry: telemetry.refresh,
    needsFarmSetup: !scope.farm,
    irrigationByZone: scope.irrigationByZone,
    generatedAt: new Date().toISOString(),
  };
}

/** Zones ordered by urgency, used by dashboards and the twin. */
export function sortZonesByAttention(zones: ZoneSnapshot[]): ZoneSnapshot[] {
  const rank: Record<ZoneSnapshot['level'], number> = { attention: 0, watch: 1, unknown: 2, ok: 3 };
  return [...zones].sort((a, b) => {
    if (rank[a.level] !== rank[b.level]) return rank[a.level] - rank[b.level];
    return a.plot.name.localeCompare(b.plot.name);
  });
}

export function zonesWithoutReadings(zones: ZoneSnapshot[]): ZoneSnapshot[] {
  return zones.filter((zone) => resolveMoisture(zone).value === null);
}
