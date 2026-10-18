/**
 * AGRIPULSE field intelligence layer.
 *
 * This module converts the platform's stored records into the derived views used by the
 * dashboard, monitoring, digital twin, irrigation, soil-health, crop-health, alerts and
 * reports modules.
 *
 * Rules that this file must always obey:
 *  1. Never invent a measurement. When no telemetry or observation exists, return `null` and
 *     `provenance: 'unavailable'` — never 0.
 *  2. Keep provenance attached to every value so the UI can label it (measured / recorded /
 *     forecast / rule-based / sample data).
 *  3. Guidance is deterministic and explainable: every recommendation carries the inputs it
 *     used, the assumption it makes, and a confidence note. Nothing here is a trained model,
 *     a diagnosis, or a guarantee.
 */
import {
  CropRecord,
  DiseaseReport,
  Farm,
  FarmActivity,
  FarmPlot,
  FieldObservation,
  IoTDevice,
  RainfallLog,
  TelemetryReading,
  WeatherSnapshot,
  InstalledSensorType,
} from '../types';
import { DataPoint, ProvenanceKind, describeFreshness } from './provenance';

/* ---------------------------------------------------------------------------
   Shared vocabulary
   ------------------------------------------------------------------------- */

export type ZoneLevel = 'ok' | 'watch' | 'attention' | 'unknown';
export type AlertSeverity = 'critical' | 'warning' | 'advisory' | 'info';

export interface ZoneSnapshot {
  plot: FarmPlot;
  crop?: CropRecord;
  devices: IoTDevice[];
  /** Sensor types with a paired, online node reporting to this zone. */
  instrumentedSensors: InstalledSensorType[];
  latestMoisture: DataPoint<number>;
  latestSoilTemperature: DataPoint<number>;
  latestAirTemperature: DataPoint<number>;
  latestHumidity: DataPoint<number>;
  latestObservation?: FieldObservation;
  observationCount: number;
  level: ZoneLevel;
  levelReason: string;
  irrigation: IrrigationAssessment;
}

export interface IrrigationAssessment {
  /** Interpretation band, based on the moisture reading and crop stage reference range. */
  band: 'very_dry' | 'dry' | 'adequate' | 'high' | 'saturated' | 'unknown';
  bandLabel: string;
  referenceRange: { min: number; max: number } | null;
  action: 'irrigate_now' | 'irrigate_soon' | 'hold' | 'drain' | 'monitor' | 'collect_data';
  actionLabel: string;
  rationale: string;
  assumptions: string[];
  confidence: 'higher' | 'moderate' | 'low';
  inputs: { label: string; value: string; provenance: ProvenanceKind }[];
}

export interface AlertItem {
  id: string;
  severity: AlertSeverity;
  category: 'Soil moisture' | 'Crop stress' | 'Weather' | 'Device' | 'Field activity' | 'Crop inspection';
  title: string;
  detail: string;
  plotName?: string;
  deviceName?: string;
  occurredAt: string;
  provenance: ProvenanceKind;
  actionLabel: string;
  actionRoute: string;
  /** Short, practical next step the farmer can take. */
  nextStep: string;
}

export interface StressIndicator {
  id: string;
  name: string;
  zoneName: string;
  risk: 'elevated' | 'developing' | 'low' | 'insufficient_data';
  riskScore: number | null;
  observed: string;
  whyItMatters: string;
  suggestedAction: string;
  dataUsed: { label: string; value: string; provenance: ProvenanceKind }[];
  assumptions: string[];
  confidence: 'higher' | 'moderate' | 'low';
  generatedAt: string;
  method: 'Rule-based screening';
}

export interface SoilProfileRow {
  label: string;
  zoneName: string;
  value: number | null;
  unit: string;
  status: 'ok' | 'watch' | 'attention' | 'unknown';
  statusLabel: string;
  provenance: ProvenanceKind;
  capturedAt?: string;
  note?: string;
}

export interface CropHealthEntry {
  cropId: string;
  cropName: string;
  variety: string;
  plotName: string;
  growthStage: string;
  recordedHealth: CropRecord['healthStatus'];
  derivedLevel: ZoneLevel;
  derivedReason: string;
  latestObservation?: FieldObservation;
  openReports: DiseaseReport[];
  lastInspectionAt?: string;
  nextCheckSuggestion: string;
}

export interface FieldIntelligenceInput {
  farm?: Farm;
  plots: FarmPlot[];
  crops: CropRecord[];
  observations: FieldObservation[];
  devices: IoTDevice[];
  /** Physical-sensor readings keyed by device id (only what the API returned). */
  readingsByDevice: Record<string, TelemetryReading[]>;
  weather: WeatherSnapshot;
  rainfallLogs: RainfallLog[];
  diseaseReports: DiseaseReport[];
  activities: FarmActivity[];
  /** True while telemetry is still loading, so the UI can show loading instead of "no data". */
  telemetryLoading?: boolean;
}

/* ---------------------------------------------------------------------------
   Reference data
   ------------------------------------------------------------------------- */

/**
 * General agronomic reference bands for plant-available soil moisture by growth stage.
 * These are published guidance ranges for mineral soils — they are NOT calibrated to the
 * farmer's own soil, sensor depth or texture, so the UI always labels guidance as rule-based.
 */
const MOISTURE_REFERENCE: Record<string, { min: number; max: number; note: string }> = {
  'Land Preparation': { min: 45, max: 75, note: 'Seedbed moisture for tillage and levelling' },
  'Sowing / Transplanting': { min: 50, max: 80, note: 'Establishment moisture for germinating seed' },
  'Germination & Emergence': { min: 45, max: 75, note: 'Root-zone moisture for uniform emergence' },
  'Vegetative Growth': { min: 40, max: 70, note: 'Active canopy growth and nutrient uptake' },
  'Flowering / Booting': { min: 45, max: 75, note: 'Most moisture-sensitive stage; avoid deficit' },
  'Grain Filling / Fruiting': { min: 40, max: 70, note: 'Grain/fruit fill; avoid waterlogging' },
  Maturation: { min: 30, max: 65, note: 'Approaching maturity; excess water delays harvest' },
  'Ready for Harvest': { min: 25, max: 60, note: 'Drying-down window before harvest' },
  Harvested: { min: 20, max: 60, note: 'Post-harvest field condition' },
};

const SOIL_WATER_SENSORS: InstalledSensorType[] = ['soil_moisture', 'soil_temperature'];

export const SENSOR_LABELS: Record<InstalledSensorType, { label: string; unit: string; decimals: number }> = {
  soil_moisture: { label: 'Soil moisture', unit: '%', decimals: 0 },
  soil_temperature: { label: 'Soil temperature', unit: '°C', decimals: 1 },
  air_temperature_humidity: { label: 'Air temperature & humidity', unit: '°C / %', decimals: 1 },
  light: { label: 'Light intensity', unit: 'lx', decimals: 0 },
  soil_ph: { label: 'Soil pH', unit: 'pH', decimals: 2 },
  soil_npk: { label: 'Soil NPK (interface)', unit: 'index', decimals: 0 },
  battery_voltage: { label: 'Battery voltage', unit: 'V', decimals: 2 },
  standing_water: { label: 'Standing-water detection', unit: 'state', decimals: 0 },
};

/** Sensors whose value the API reports as a simple numeric reading for charting. */
export const CHARTABLE_SENSORS: InstalledSensorType[] = [
  'soil_moisture',
  'soil_temperature',
  'soil_ph',
  'light',
  'battery_voltage',
];

const TELEMETRY_UNITS: Partial<Record<InstalledSensorType, string>> = {
  soil_moisture: '%',
  soil_temperature: '°C',
  soil_ph: 'pH',
  light: 'lx',
  battery_voltage: 'V',
};

export const unitForSensor = (sensor: InstalledSensorType): string => TELEMETRY_UNITS[sensor] || SENSOR_LABELS[sensor].unit;

/* ---------------------------------------------------------------------------
   Reading helpers
   ------------------------------------------------------------------------- */

const validReadings = (readings: TelemetryReading[] = []): TelemetryReading[] =>
  readings
    .filter((reading) => reading.quality !== 'invalid' && Number.isFinite(reading.value))
    .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());

export function latestReading(
  readings: TelemetryReading[],
  sensorType: InstalledSensorType,
): TelemetryReading | undefined {
  return validReadings(readings).find((reading) => reading.sensorType === sensorType);
}

export interface SensorSeriesPoint {
  timestamp: number;
  label: string;
  value: number;
}

/** Builds a chart-ready series for one sensor from physical-sensor readings only. */
export function buildSensorSeries(readings: TelemetryReading[], sensorType: InstalledSensorType): SensorSeriesPoint[] {
  return validReadings(readings)
    .filter((reading) => reading.sensorType === sensorType)
    .map((reading) => {
      const timestamp = new Date(reading.measuredAt).getTime();
      return {
        timestamp,
        label: new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(timestamp),
        value: reading.value,
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function filterReadingsByWindow<T extends { measuredAt: string }>(readings: T[], hours?: number): T[] {
  if (!hours) return readings;
  const cutoff = Date.now() - hours * 3600 * 1000;
  return readings.filter((reading) => new Date(reading.measuredAt).getTime() >= cutoff);
}

/* ---------------------------------------------------------------------------
   Zone snapshots
   ------------------------------------------------------------------------- */

function moisturePoint(
  deviceReadings: { device: IoTDevice; readings: TelemetryReading[] }[],
  sensorType: InstalledSensorType,
  telemetryLoading: boolean | undefined,
): DataPoint<number> {
  const candidates = deviceReadings
    .map(({ device, readings }) => ({ device, reading: latestReading(readings, sensorType) }))
    .filter((entry): entry is { device: IoTDevice; reading: TelemetryReading } => Boolean(entry.reading));

  if (candidates.length > 0) {
    const best = candidates.sort(
      (a, b) => new Date(b.reading.measuredAt).getTime() - new Date(a.reading.measuredAt).getTime(),
    )[0];
    const freshness = describeFreshness(best.reading.measuredAt);
    return {
      value: best.reading.value,
      provenance: 'measured',
      capturedAt: best.reading.measuredAt,
      unit: best.reading.unit,
      sourceLabel: `Sensor node · ${best.device.name}`,
      note:
        freshness.state === 'live'
          ? freshness.label
          : `${freshness.label} · check gateway and power for live readings`,
    };
  }

  return {
    value: null,
    provenance: 'unavailable',
    note: telemetryLoading
      ? 'Loading sensor readings from the field service…'
      : 'No physical-sensor reading has been received for this zone yet.',
  };
}

function observationPoint(
  observation: FieldObservation | undefined,
  key: 'soilMoisturePct' | 'soilTempC',
): DataPoint<number> {
  const value = observation?.[key];
  if (observation === undefined || value === undefined || value === null || !Number.isFinite(value)) {
    return { value: null, provenance: 'unavailable', note: 'No manual observation recorded' };
  }
  return {
    value,
    provenance: observation.sourceLabel === 'Demo Sample Record' ? 'demo' : 'recorded',
    capturedAt: observation.recordedAt,
    unit: key === 'soilMoisturePct' ? '%' : '°C',
    sourceLabel: `${observation.sourceLabel === 'Demo Sample Record' ? 'Sample observation' : 'Farmer observation'} · ${observation.category}`,
  };
}

/** Chooses the most trustworthy available value: live sensor first, farmer record second. */
export function resolveMoisture(snapshot: ZoneSnapshot): DataPoint<number> {
  return snapshot.latestMoisture.value !== null ? snapshot.latestMoisture : observationPoint(snapshot.latestObservation, 'soilMoisturePct');
}

export function resolveSoilTemperature(snapshot: ZoneSnapshot): DataPoint<number> {
  return snapshot.latestSoilTemperature.value !== null
    ? snapshot.latestSoilTemperature
    : observationPoint(snapshot.latestObservation, 'soilTempC');
}

function assessIrrigation(
  moisture: DataPoint<number>,
  crop: CropRecord | undefined,
  weather: WeatherSnapshot,
  rainfallLogs: RainfallLog[],
): IrrigationAssessment {
  const band = MOISTURE_REFERENCE[crop?.growthStage || 'Vegetative Growth'] || MOISTURE_REFERENCE['Vegetative Growth'];
  const recentRain = rainfallLogs
    .filter((log) => Date.now() - new Date(log.date).getTime() <= 1000 * 60 * 60 * 72)
    .reduce((total, log) => total + (Number.isFinite(log.amountMm) ? log.amountMm : 0), 0);
  const rainNext24h = weather.daily?.[0]?.expectedRainMm ?? null;

  const inputs: IrrigationAssessment['inputs'] = [
    {
      label: moisture.provenance === 'measured' ? 'Soil moisture (sensor)' : 'Soil moisture (farmer record)',
      value: moisture.value === null ? 'No reading' : `${moisture.value} ${moisture.unit || '%'}`,
      provenance: moisture.provenance,
    },
    { label: 'Crop stage', value: crop ? `${crop.cropName} · ${crop.growthStage}` : 'No crop record', provenance: crop ? (crop.isDemoRecord ? 'demo' : 'recorded') : 'unavailable' },
    { label: 'Rain expected next 24 h', value: rainNext24h === null ? 'Forecast unavailable' : `${rainNext24h} mm`, provenance: 'forecast' },
    { label: 'Rain recorded last 72 h', value: `${Number(recentRain.toFixed(1))} mm (farmer logs)`, provenance: 'recorded' },
    {
      label: 'Irrigation method',
      value: crop?.irrigationMethod || 'Not recorded',
      provenance: crop ? 'recorded' : 'unavailable',
    },
  ];

  const assumptions = [
    `Reference band for ${crop?.growthStage || 'vegetative growth'}: ${band.min}–${band.max}% plant-available moisture (${band.note}).`,
    'Bands are general agronomic guidance for mineral soils and are not calibrated to this field\'s texture, organic matter or sensor depth.',
    crop ? `Irrigation method assumed: ${crop.irrigationMethod}.` : 'No irrigation method recorded for this zone.',
  ];

  if (moisture.value === null) {
    return {
      band: 'unknown',
      bandLabel: 'No moisture data',
      referenceRange: { min: band.min, max: band.max },
      action: 'collect_data',
      actionLabel: 'Record or connect a reading',
      rationale:
        'AGRIPULSE will not recommend an irrigation action without a moisture reading. Add a manual observation or pair a soil-moisture node for this zone.',
      assumptions,
      confidence: 'low',
      inputs,
    };
  }

  const value = moisture.value;
  const weatherCovered = rainNext24h !== null && rainNext24h >= 8;

  if (value < band.min - 12) {
    return {
      band: 'very_dry',
      bandLabel: 'Well below reference band',
      referenceRange: { min: band.min, max: band.max },
      action: weatherCovered ? 'irrigate_soon' : 'irrigate_now',
      actionLabel: weatherCovered ? 'Prepare to irrigate — heavy rain forecast' : 'Irrigate now',
      rationale: weatherCovered
        ? `Moisture is ${value}%, which is ${(band.min - value).toFixed(0)} points below the reference minimum, but the forecast expects ${rainNext24h} mm within 24 hours. Verify the forecast and the field before starting a full irrigation cycle.`
        : `Moisture is ${value}%, which is ${(band.min - value).toFixed(0)} points below the reference minimum of ${band.min}% for ${crop?.growthStage || 'vegetative growth'}. Delaying irrigation at this stage can reduce yield potential.`,
      assumptions,
      confidence: moisture.provenance === 'measured' ? 'higher' : 'moderate',
      inputs,
    };
  }

  if (value < band.min) {
    return {
      band: 'dry',
      bandLabel: 'Below reference band',
      referenceRange: { min: band.min, max: band.max },
      action: weatherCovered ? 'hold' : 'irrigate_soon',
      actionLabel: weatherCovered ? 'Hold — rain expected' : 'Irrigate within 24–48 hours',
      rationale: weatherCovered
        ? `Moisture is ${value}%, slightly below the ${band.min}% reference minimum, and ${rainNext24h} mm of rain is forecast in the next 24 hours. Holding irrigation avoids over-watering; re-check after the forecast window.`
        : `Moisture is ${value}%, just below the ${band.min}% reference minimum for ${crop?.growthStage || 'this stage'}. A planned irrigation within the next day or two keeps the root zone inside the band.`,
      assumptions,
      confidence: moisture.provenance === 'measured' ? 'higher' : 'moderate',
      inputs,
    };
  }

  if (value <= band.max) {
    return {
      band: 'adequate',
      bandLabel: 'Within reference band',
      referenceRange: { min: band.min, max: band.max },
      action: 'hold',
      actionLabel: 'No irrigation needed',
      rationale: `Moisture is ${value}%, inside the ${band.min}–${band.max}% reference band for ${crop?.growthStage || 'this stage'}. Continue normal scheduling and re-check before the next planned irrigation.`,
      assumptions,
      confidence: 'higher',
      inputs,
    };
  }

  if (value <= band.max + 12) {
    return {
      band: 'high',
      bandLabel: 'Above reference band',
      referenceRange: { min: band.min, max: band.max },
      action: 'monitor',
      actionLabel: 'Pause irrigation and monitor',
      rationale: `Moisture is ${value}%, above the ${band.max}% reference maximum. Pause irrigation, confirm the sensor is not sitting in a depression, and watch for slow drainage or root-zone aeration problems.`,
      assumptions,
      confidence: 'moderate',
      inputs,
    };
  }

  return {
    band: 'saturated',
    bandLabel: 'Saturated / waterlogged',
    referenceRange: { min: band.min, max: band.max },
    action: 'drain',
    actionLabel: 'Drain the zone and inspect',
    rationale: `Moisture is ${value}%, far above the ${band.max}% reference maximum. Check drainage, remove standing water where possible, and pause all irrigation until readings return to the band.`,
    assumptions,
    confidence: 'moderate',
    inputs,
  };
}

export function buildZoneSnapshots(input: FieldIntelligenceInput): ZoneSnapshot[] {
  const { plots, crops, observations, devices, readingsByDevice, weather, rainfallLogs, telemetryLoading } = input;

  return plots
    .map((plot) => {
      const crop = crops.find((record) => record.plotId === plot.id);
      const zoneDevices = devices.filter((device) => device.plotId === plot.id && device.status !== 'retired');
      const deviceReadings = zoneDevices.map((device) => ({
        device,
        readings: readingsByDevice[device.id] || [],
      }));

      const instrumentedSensors = Array.from(
        new Set(
          zoneDevices
            .filter((device) => device.type === 'sensor_node')
            .flatMap((device) => device.installedSensors || []),
        ),
      );

      const zoneObservations = observations
        .filter((observation) => observation.plotId === plot.id)
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
      const latestObservation = zoneObservations[0];

      const latestMoisture = moisturePoint(deviceReadings, 'soil_moisture', telemetryLoading);
      const latestSoilTemperature = moisturePoint(deviceReadings, 'soil_temperature', telemetryLoading);
      const latestAir = moisturePoint(deviceReadings, 'air_temperature_humidity', telemetryLoading);

      const resolvedMoisture = latestMoisture.value !== null ? latestMoisture : observationPoint(latestObservation, 'soilMoisturePct');
      const irrigation = assessIrrigation(resolvedMoisture, crop, weather, rainfallLogs.filter((log) => log.farmId === plot.farmId));

      let level: ZoneLevel = 'unknown';
      let levelReason = 'No sensor reading or field observation recorded for this zone yet.';
      if (irrigation.band === 'very_dry' || irrigation.band === 'saturated') {
        level = 'attention';
        levelReason = `${irrigation.bandLabel} · ${resolvedMoisture.value}${resolvedMoisture.unit || '%'} recorded`;
      } else if (irrigation.band === 'dry' || irrigation.band === 'high') {
        level = 'watch';
        levelReason = `${irrigation.bandLabel} · ${resolvedMoisture.value}${resolvedMoisture.unit || '%'} recorded`;
      } else if (irrigation.band === 'adequate') {
        level = 'ok';
        levelReason = `Moisture inside the reference band (${resolvedMoisture.value}%)`;
      }
      if (latestObservation?.severity === 'Action Needed') {
        level = 'attention';
        levelReason = `Latest field observation flagged action needed (${latestObservation.category})`;
      } else if (latestObservation?.severity === 'Watch' && level !== 'attention') {
        level = 'watch';
        levelReason = `Latest field observation flagged for watch (${latestObservation.category})`;
      }

      return {
        plot,
        crop,
        devices: zoneDevices,
        instrumentedSensors,
        latestMoisture,
        latestSoilTemperature,
        latestAirTemperature: latestAir,
        latestHumidity: latestAir,
        latestObservation,
        observationCount: zoneObservations.length,
        level,
        levelReason,
        irrigation,
      };
    })
    .sort((a, b) => a.plot.name.localeCompare(b.plot.name));
}

/* ---------------------------------------------------------------------------
   Alerts
   ------------------------------------------------------------------------- */

export function buildAlerts(input: FieldIntelligenceInput, zones: ZoneSnapshot[]): AlertItem[] {
  const { devices, weather, activities, diseaseReports, rainfallLogs, observations } = input;
  const alerts: AlertItem[] = [];

  for (const zone of zones) {
    const moisture = resolveMoisture(zone);
    if (zone.irrigation.action === 'irrigate_now' || zone.irrigation.action === 'irrigate_soon') {
      alerts.push({
        id: `alert-irrigation-${zone.plot.id}`,
        severity: zone.irrigation.band === 'very_dry' ? 'critical' : 'warning',
        category: 'Soil moisture',
        title: `${moisture.provenance === 'measured' ? 'Low soil moisture' : 'Low recorded soil moisture'} in ${zone.plot.name}`,
        detail: `${moisture.value}${moisture.unit || '%'} against a ${zone.irrigation.referenceRange?.min}–${zone.irrigation.referenceRange?.max}% reference band for ${zone.crop?.cropName || 'the current crop'}. Source: ${moisture.sourceLabel || 'no source recorded'}.`,
        plotName: zone.plot.name,
        occurredAt: moisture.capturedAt || new Date().toISOString(),
        provenance: moisture.provenance,
        actionLabel: 'Open irrigation guidance',
        actionRoute: '/irrigation',
        nextStep: zone.irrigation.actionLabel,
      });
    }
    if (zone.irrigation.band === 'saturated') {
      alerts.push({
        id: `alert-waterlogging-${zone.plot.id}`,
        severity: 'critical',
        category: 'Soil moisture',
        title: `Possible waterlogging in ${zone.plot.name}`,
        detail: `Moisture of ${moisture.value}% is well above the ${zone.irrigation.referenceRange?.max}% reference maximum. Verify field conditions before the next irrigation cycle.`,
        plotName: zone.plot.name,
        occurredAt: moisture.capturedAt || new Date().toISOString(),
        provenance: moisture.provenance,
        actionLabel: 'Review zone detail',
        actionRoute: '/twin',
        nextStep: 'Walk the zone, check the lowest corner and gate drainage if water is ponding.',
      });
    }
    if (zone.latestObservation?.severity === 'Action Needed') {
      alerts.push({
        id: `alert-observation-${zone.latestObservation.id}`,
        severity: 'warning',
        category: 'Crop stress',
        title: `Observation needs action in ${zone.plot.name}`,
        detail: zone.latestObservation.symptoms || zone.latestObservation.notes || 'A field observation was flagged "Action Needed".',
        plotName: zone.plot.name,
        occurredAt: zone.latestObservation.recordedAt,
        provenance: zone.latestObservation.sourceLabel === 'Demo Sample Record' ? 'demo' : 'recorded',
        actionLabel: 'Open crop health',
        actionRoute: '/crop-health',
        nextStep: 'Inspect the affected plants and record what you find against the recommended checks.',
      });
    }
    if (zone.instrumentedSensors.length === 0) {
      alerts.push({
        id: `alert-coverage-${zone.plot.id}`,
        severity: 'info',
        category: 'Device',
        title: `No sensor coverage recorded for ${zone.plot.name}`,
        detail: 'This zone has no sensor node assigned, so AGRIPULSE can only use manual observations here.',
        plotName: zone.plot.name,
        occurredAt: zone.crop?.createdAt || new Date().toISOString(),
        provenance: 'unavailable',
        actionLabel: 'Review device registry',
        actionRoute: '/devices',
        nextStep: 'Pair a node or keep recording manual observations for this zone.',
      });
    }
  }

  for (const device of devices.filter((item) => item.status !== 'retired')) {
    if (device.status === 'offline') {
      alerts.push({
        id: `alert-device-${device.id}`,
        severity: 'warning',
        category: 'Device',
        title: `${device.name} missed its heartbeat window`,
        detail: 'The backend stopped receiving authenticated heartbeats. Readings from this device are not current.',
        deviceName: device.name,
        occurredAt: device.lastSeenAt || device.updatedAt,
        provenance: 'measured',
        actionLabel: 'Open device record',
        actionRoute: `/devices/${device.id}`,
        nextStep: 'Check power, gateway coverage and antenna placement, then re-check the heartbeat.',
      });
    } else if (device.status === 'pending_pairing' || device.status === 'pending_gateway_assignment') {
      alerts.push({
        id: `alert-device-${device.id}-pending`,
        severity: 'info',
        category: 'Device',
        title: `${device.name} is not commissioned yet`,
        detail:
          device.status === 'pending_pairing'
            ? 'The record exists, but no physical hardware has completed secure pairing, so no readings can arrive.'
            : 'This sensor node has no gateway assigned on the same farm yet.',
        deviceName: device.name,
        occurredAt: device.updatedAt,
        provenance: 'demo',
        actionLabel: 'Continue commissioning',
        actionRoute: `/devices/${device.id}`,
        nextStep: 'Complete pairing from the device page when the hardware is installed in the field.',
      });
    }
  }

  for (const warning of weather.warnings || []) {
    alerts.push({
      id: `alert-weather-${warning.id}`,
      severity: warning.severity === 'Warning' ? 'critical' : warning.severity === 'Watch' ? 'warning' : 'advisory',
      category: 'Weather',
      title: warning.title,
      detail: `${warning.description} Trigger: ${warning.triggerCondition}. Source: ${weather.sourceProvider} (${weather.sourceType}).`,
      occurredAt: weather.updatedAt,
      provenance: 'forecast',
      actionLabel: 'Open weather intelligence',
      actionRoute: '/weather',
      nextStep: 'Plan field operations around the advisory window.',
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  for (const activity of activities) {
    if (activity.status !== 'Pending') continue;
    if (activity.scheduledDate > today) continue;
    alerts.push({
      id: `alert-activity-${activity.id}`,
      severity: activity.priority === 'High' ? 'warning' : 'advisory',
      category: 'Field activity',
      title: `${activity.priority} priority task due: ${activity.title}`,
      detail: `${activity.category}${activity.plotName ? ` · ${activity.plotName}` : ''} — scheduled ${activity.scheduledDate}.`,
      plotName: activity.plotName,
      occurredAt: `${activity.scheduledDate}T06:00:00.000Z`,
      provenance: activity.isDemoRecord ? 'demo' : 'recorded',
      actionLabel: 'Open dashboard tasks',
      actionRoute: '/home',
      nextStep: 'Complete or reschedule the task after the field visit.',
    });
  }

  for (const report of diseaseReports) {
    if (report.status === 'Expert confirmed') continue;
    alerts.push({
      id: `alert-report-${report.id}`,
      severity: report.status === 'Needs inspection' ? 'warning' : 'advisory',
      category: 'Crop inspection',
      title: `${report.cropName} report ${report.status.toLowerCase()} — ${report.plotName}`,
      detail: `${report.farmerDescription.slice(0, 180)}${report.farmerDescription.length > 180 ? '…' : ''} (${report.analysisMode}).`,
      plotName: report.plotName,
      occurredAt: report.updatedAt,
      provenance: 'rule',
      actionLabel: 'Review report',
      actionRoute: '/crop-health',
      nextStep: report.immediateInspectionSteps?.[0] || 'Complete the recommended field checks and update the report status.',
    });
  }

  for (const log of rainfallLogs.slice(0, 3)) {
    alerts.push({
      id: `alert-rainfall-${log.id}`,
      severity: 'advisory',
      category: 'Weather',
      title: `${log.amountMm} mm recorded rainfall on ${log.date}`,
      detail: `${log.sourceType}. ${log.notes}`,
      occurredAt: `${log.date}T06:30:00.000Z`,
      provenance: 'recorded',
      actionLabel: 'Open weather intelligence',
      actionRoute: '/weather',
      nextStep: 'Adjust the irrigation plan if this rain already met crop demand.',
    });
  }

  const staleObservations = observations
    .filter((observation) => Date.now() - new Date(observation.recordedAt).getTime() > 1000 * 60 * 60 * 24 * 10)
    .slice(0, 2);
  for (const observation of staleObservations) {
    alerts.push({
      id: `alert-followup-${observation.id}`,
      severity: 'advisory',
      category: 'Crop stress',
      title: `Re-check needed: ${observation.plotName || 'field'} observation is over 10 days old`,
      detail: `Last recorded ${observation.category.toLowerCase()} entry: ${observation.notes.slice(0, 150)}${observation.notes.length > 150 ? '…' : ''}`,
      plotName: observation.plotName,
      occurredAt: observation.recordedAt,
      provenance: observation.sourceLabel === 'Demo Sample Record' ? 'demo' : 'recorded',
      actionLabel: 'Record a new observation',
      actionRoute: '/farm',
      nextStep: 'Add a fresh observation so recommendations use current field conditions.',
    });
  }

  const severityRank: Record<AlertSeverity, number> = { critical: 0, warning: 1, advisory: 2, info: 3 };
  return alerts.sort((a, b) => {
    if (severityRank[a.severity] !== severityRank[b.severity]) return severityRank[a.severity] - severityRank[b.severity];
    return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
  });
}

/* ---------------------------------------------------------------------------
   Crop-stress screening (rule based, explicitly not a trained model)
   ------------------------------------------------------------------------- */

export function buildStressIndicators(input: FieldIntelligenceInput, zones: ZoneSnapshot[]): StressIndicator[] {
  const generatedAt = new Date().toISOString();
  const indicators: StressIndicator[] = [];

  for (const zone of zones) {
    const moisture = resolveMoisture(zone);
    const soilTemp = resolveSoilTemperature(zone);
    const reference = zone.irrigation.referenceRange;

    if (moisture.value === null || !reference) {
      indicators.push({
        id: `stress-moisture-${zone.plot.id}`,
        name: 'Soil-moisture stress screening',
        zoneName: zone.plot.name,
        risk: 'insufficient_data',
        riskScore: null,
        observed: 'No soil-moisture reading is stored for this zone.',
        whyItMatters: 'Without a moisture reading, water stress cannot be screened at all — and a missing reading is not the same as a dry field.',
        suggestedAction: 'Record a manual observation or commission a soil-moisture node for this zone.',
        dataUsed: [{ label: 'Soil moisture', value: 'No reading', provenance: 'unavailable' }],
        assumptions: ['Screening needs at least one moisture value and a crop stage reference band.'],
        confidence: 'low',
        generatedAt,
        method: 'Rule-based screening',
      });
      continue;
    }

    const deficit = reference.min - moisture.value;
    const surplus = moisture.value - reference.max;
    const isDeficit = deficit > 0;

    const score = isDeficit
      ? Math.min(100, Math.round((deficit / reference.min) * 160))
      : Math.max(0, Math.round((surplus / 40) * 100));

    const risk: StressIndicator['risk'] =
      (isDeficit && deficit >= 12) || score >= 55 ? 'elevated' : score >= 20 ? 'developing' : 'low';

    indicators.push({
      id: `stress-moisture-${zone.plot.id}`,
      name: 'Soil-moisture stress screening',
      zoneName: zone.plot.name,
      risk,
      riskScore: score,
      observed: `${moisture.value}${moisture.unit || '%'} soil moisture against a ${reference.min}–${reference.max}% band for ${zone.crop?.growthStage || 'the recorded stage'}.`,
      whyItMatters: isDeficit
        ? 'Moisture below the band during active growth reduces nutrient uptake and can lower yield potential if it persists.'
        : surplus > 0
        ? 'Moisture above the band can reduce root-zone oxygen, slow growth and increase disease pressure.'
        : 'Moisture is inside the reference band for the recorded stage.',
      suggestedAction: zone.irrigation.actionLabel,
      dataUsed: [
        { label: zone.irrigation.inputs[0].label, value: zone.irrigation.inputs[0].value, provenance: zone.irrigation.inputs[0].provenance },
        { label: 'Crop stage', value: zone.crop ? `${zone.crop.cropName} · ${zone.crop.growthStage}` : 'Not recorded', provenance: zone.crop ? 'recorded' : 'unavailable' },
      ],
      assumptions: [
        'Rule-based screening of a single moisture value against a published stage band — not a trained crop-stress model.',
        'The reference band is generic for mineral soils and is not calibrated for this field.',
      ],
      confidence: moisture.provenance === 'measured' ? 'moderate' : 'low',
      generatedAt,
      method: 'Rule-based screening',
    });

    if (soilTemp.value !== null && zone.crop) {
      const hot = soilTemp.value >= 32;
      const cold = soilTemp.value <= 12;
      indicators.push({
        id: `stress-temperature-${zone.plot.id}`,
        name: 'Soil-temperature check',
        zoneName: zone.plot.name,
        risk: hot || cold ? 'developing' : 'low',
        riskScore: null,
        observed: `Soil temperature ${soilTemp.value} °C at the recorded depth.`,
        whyItMatters: hot
          ? 'Warm root-zone temperatures increase evaporation and can slow root development in young crops.'
          : cold
          ? 'Cool root-zone temperatures slow germination and early nutrient uptake.'
          : 'Root-zone temperature is inside the range where most field crops grow actively.',
        suggestedAction: hot
          ? 'Check mulch or residue cover and irrigate in the early morning if a moisture deficit also exists.'
          : cold
          ? 'Delay nitrogen top-dressing until the root zone warms and monitor emergence.'
          : 'No action needed; keep the normal observation schedule.',
        dataUsed: [{ label: 'Soil temperature', value: `${soilTemp.value} °C`, provenance: soilTemp.provenance }],
        assumptions: ['Thresholds are general guidance for field crops and not crop-specific calibration.'],
        confidence: soilTemp.provenance === 'measured' ? 'moderate' : 'low',
        generatedAt,
        method: 'Rule-based screening',
      });
    }
  }

  const humidity = input.weather.humidityPct;
  const rainProbability = input.weather.rainProbabilityPct;
  if (Number.isFinite(humidity)) {
    const diseaseFavourable = humidity >= 80 && rainProbability >= 40;
    indicators.push({
      id: 'stress-humidity-forecast',
      name: 'Disease-favourable humidity window',
      zoneName: input.farm ? `${input.farm.name} (all zones)` : 'Selected farm',
      risk: diseaseFavourable ? 'developing' : 'low',
      riskScore: null,
      observed: `Forecast/current humidity ${humidity}% with a ${rainProbability}% rain probability.`,
      whyItMatters: diseaseFavourable
        ? 'Extended leaf wetness and high humidity favour many fungal leaf diseases; early canopy checks help catch symptoms sooner.'
        : 'Current humidity is below the level that typically favours rapid fungal development.',
      suggestedAction: diseaseFavourable
        ? 'Plan a canopy inspection in the next 2–3 days and keep the crop-health library open for symptom comparison.'
        : 'Continue the normal scouting schedule.',
      dataUsed: [
        { label: 'Humidity', value: `${humidity}%`, provenance: 'forecast' },
        { label: 'Rain probability', value: `${rainProbability}%`, provenance: 'forecast' },
      ],
      assumptions: [
        'Uses weather-provider values for the selected location. It does not measure leaf wetness in the field.',
        'No disease is predicted or diagnosed by this indicator.',
      ],
      confidence: input.weather.sourceType === 'Live API' ? 'moderate' : 'low',
      generatedAt,
      method: 'Rule-based screening',
    });
  }

  return indicators;
}

/* ---------------------------------------------------------------------------
   Soil health
   ------------------------------------------------------------------------- */

export function buildSoilRows(input: FieldIntelligenceInput, zones: ZoneSnapshot[]): SoilProfileRow[] {
  const rows: SoilProfileRow[] = [];

  for (const zone of zones) {
    const moisture = resolveMoisture(zone);
    const soilTemp = resolveSoilTemperature(zone);
    const phReading = latestReading(
      (zone.devices.flatMap((device) => input.readingsByDevice[device.id] || [])),
      'soil_ph',
    );

    rows.push({
      label: 'Soil moisture',
      zoneName: zone.plot.name,
      value: moisture.value,
      unit: moisture.unit || '%',
      provenance: moisture.provenance,
      capturedAt: moisture.capturedAt,
      status:
        zone.irrigation.band === 'adequate'
          ? 'ok'
          : zone.irrigation.band === 'unknown'
          ? 'unknown'
          : zone.irrigation.band === 'dry' || zone.irrigation.band === 'high'
          ? 'watch'
          : 'attention',
      statusLabel:
        zone.irrigation.band === 'adequate'
          ? 'In band'
          : zone.irrigation.band === 'unknown'
          ? 'No data'
          : `${zone.irrigation.bandLabel}`,
      note: zone.irrigation.referenceRange ? `Stage band ${zone.irrigation.referenceRange.min}–${zone.irrigation.referenceRange.max}%` : undefined,
    });

    rows.push({
      label: 'Soil temperature',
      zoneName: zone.plot.name,
      value: soilTemp.value,
      unit: '°C',
      provenance: soilTemp.provenance,
      capturedAt: soilTemp.capturedAt,
      status: soilTemp.value === null ? 'unknown' : soilTemp.value >= 32 || soilTemp.value <= 12 ? 'watch' : 'ok',
      statusLabel: soilTemp.value === null ? 'No data' : soilTemp.value >= 32 ? 'Warm root zone' : soilTemp.value <= 12 ? 'Cool root zone' : 'Normal range',
    });

    rows.push({
      label: 'Soil pH',
      zoneName: zone.plot.name,
      value: phReading ? phReading.value : null,
      unit: 'pH',
      provenance: phReading ? 'measured' : 'unavailable',
      capturedAt: phReading?.measuredAt,
      status: phReading ? (phReading.value >= 6 && phReading.value <= 7.5 ? 'ok' : 'watch') : 'unknown',
      statusLabel: phReading ? (phReading.value >= 6 && phReading.value <= 7.5 ? 'Within common range' : 'Outside 6.0–7.5') : 'No pH sensor paired',
      note: phReading ? 'Sensor reading; calibrate the probe as scheduled' : 'No soil-pH sensor is reporting for this zone.',
    });

    rows.push({
      label: 'Soil type (recorded)',
      zoneName: zone.plot.name,
      value: null,
      unit: '',
      provenance: 'recorded',
      status: 'ok',
      statusLabel: zone.plot.soilType || 'Not recorded',
      note: zone.plot.soilType
        ? 'Recorded when the plot was created. A lab test is needed for texture, organic carbon and available nutrients.'
        : 'Add the soil type in Farm & plots so guidance can reference it.',
    });
  }

  return rows;
}

/* ---------------------------------------------------------------------------
   Crop health
   ------------------------------------------------------------------------- */

export function buildCropHealth(input: FieldIntelligenceInput, zones: ZoneSnapshot[]): CropHealthEntry[] {
  return zones
    .filter((zone): zone is ZoneSnapshot & { crop: CropRecord } => Boolean(zone.crop))
    .map((zone) => {
      const crop = zone.crop;
      const reportIds = new Set(
        input.diseaseReports
          .filter((report) => report.plotName === zone.plot.name && report.status !== 'Expert confirmed')
          .map((report) => report.id),
      );
      const openReports = input.diseaseReports.filter((report) => reportIds.has(report.id));

      const lastInspectionAt = zone.latestObservation?.recordedAt;
      const daysSince = lastInspectionAt
        ? Math.floor((Date.now() - new Date(lastInspectionAt).getTime()) / 86400000)
        : null;

      let derivedLevel: ZoneLevel = zone.level;
      let derivedReason = zone.levelReason;
      if (crop.healthStatus === 'Needs Inspection' && derivedLevel !== 'attention') {
        derivedLevel = 'attention';
        derivedReason = 'Crop record is marked "Needs inspection"';
      } else if (crop.healthStatus === 'Watch / Mild Stress' && derivedLevel === 'ok') {
        derivedLevel = 'watch';
        derivedReason = 'Crop record is marked "Watch / mild stress"';
      }
      if (openReports.length > 0) {
        derivedLevel = 'attention';
        derivedReason = `${openReports.length} open crop-health report${openReports.length === 1 ? '' : 's'} awaiting resolution`;
      }

      const stage = crop.growthStage;
      const nextCheckSuggestion =
        daysSince === null
          ? 'No field observation recorded yet — add a first scouting entry.'
          : daysSince >= 10
          ? `Last observation was ${daysSince} days ago; plan a fresh scouting round.`
          : stage === 'Flowering / Booting' || stage === 'Grain Filling / Fruiting'
          ? 'Flowering/fruiting stage: scout for pests and leaf symptoms twice a week.'
          : 'Scouting cadence is current; keep checking after rain or irrigation.';

      return {
        cropId: crop.id,
        cropName: crop.cropName,
        variety: crop.variety,
        plotName: zone.plot.name,
        growthStage: crop.growthStage,
        recordedHealth: crop.healthStatus,
        derivedLevel,
        derivedReason,
        latestObservation: zone.latestObservation,
        openReports,
        lastInspectionAt,
        nextCheckSuggestion,
      };
    });
}

/* ---------------------------------------------------------------------------
   Farm overview + coverage
   ------------------------------------------------------------------------- */

export interface FarmOverview {
  plots: number;
  totalArea: number;
  areaUnit: FarmPlot['areaUnit'];
  crops: number;
  activeDevices: number;
  onlineDevices: number;
  pendingDevices: number;
  instrumentedZones: number;
  zonesWithData: number;
  zonesTotal: number;
  lastMeasurementAt?: string;
  dataAvailabilityPct: number;
}

export function buildFarmOverview(input: FieldIntelligenceInput, zones: ZoneSnapshot[]): FarmOverview {
  const { devices, plots } = input;
  const activeDevices = devices.filter((device) => device.status !== 'retired');
  const zonesWithData = zones.filter((zone) => resolveMoisture(zone).value !== null).length;

  const measurementTimes = zones
    .map((zone) => resolveMoisture(zone).capturedAt)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const totalArea = plots.reduce(
    (total, plot) => total + (plot.areaUnit === 'acre' ? plot.area : plot.areaUnit === 'hectare' ? plot.area / 0.404686 : plot.area * 0.25),
    0,
  );

  return {
    plots: plots.length,
    totalArea: Number(totalArea.toFixed(2)),
    areaUnit: 'acre',
    crops: input.crops.length,
    activeDevices: activeDevices.length,
    onlineDevices: activeDevices.filter((device) => device.status === 'online').length,
    pendingDevices: activeDevices.filter((device) => device.status.startsWith('pending')).length,
    instrumentedZones: zones.filter((zone) => zone.instrumentedSensors.includes('soil_moisture')).length,
    zonesWithData,
    zonesTotal: zones.length,
    lastMeasurementAt: measurementTimes[0],
    dataAvailabilityPct: zones.length === 0 ? 0 : Math.round((zonesWithData / zones.length) * 100),
  };
}

export const soillessWaterSensors = SOIL_WATER_SENSORS;
