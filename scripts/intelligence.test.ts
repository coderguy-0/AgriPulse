/**
 * Unit tests for the AGRIPULSE field-intelligence layer.
 *
 * The rules under test are the ones the product promises farmers: missing data never becomes a
 * number, provenance is always attached, invalid telemetry is ignored, and guidance holds instead
 * of guessing. Run with `npm run test:web`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildAlerts,
  buildCropHealth,
  buildFarmOverview,
  buildSoilRows,
  buildStressIndicators,
  buildZoneSnapshots,
  resolveMoisture,
  FieldIntelligenceInput,
} from '../src/services/fieldIntelligence';
import { describeFreshness, displayValue, formatMeasurement, unavailable } from '../src/services/provenance';
import type {
  CropRecord,
  Farm,
  FarmActivity,
  FarmPlot,
  IoTDevice,
  RainfallLog,
  TelemetryReading,
  WeatherSnapshot,
} from '../src/types';

const FARM: Farm = {
  id: 'farm-1',
  name: 'Test Farm',
  farmerName: 'Test Farmer',
  state: 'Haryana',
  district: 'Karnal',
  village: 'Taraori',
  coordinates: { lat: 29.78, lon: 76.93 },
  totalArea: 4,
  areaUnit: 'acre',
  bighaToAcreFactor: 0.25,
  ownershipType: 'Owned',
  soilType: 'Alluvial Loam',
  waterSource: 'Tube well',
  notes: '',
  isArchived: false,
  isDemoRecord: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const PLOTS: FarmPlot[] = [
  {
    id: 'plot-1',
    farmId: 'farm-1',
    name: 'Plot A1',
    area: 2,
    areaUnit: 'acre',
    soilType: 'Alluvial Loam',
    irrigationMethod: 'Check basin',
    notes: '',
  },
  {
    id: 'plot-2',
    farmId: 'farm-1',
    name: 'Plot A2',
    area: 2,
    areaUnit: 'acre',
    soilType: 'Sandy Loam',
    irrigationMethod: 'Furrow',
    notes: '',
  },
];

const CROPS: CropRecord[] = [
  {
    id: 'crop-1',
    farmId: 'farm-1',
    plotId: 'plot-1',
    plotName: 'Plot A1',
    cropName: 'Wheat',
    variety: 'HD-3226',
    cultivatedArea: 2,
    areaUnit: 'acre',
    sowingDate: '2026-10-08',
    expectedHarvestDate: '2027-04-05',
    growthStage: 'Germination & Emergence',
    irrigationMethod: 'Border strip irrigation',
    healthStatus: 'Healthy',
    notes: '',
    isDemoRecord: false,
    createdAt: '2026-10-08T00:00:00.000Z',
  },
];

const WEATHER: WeatherSnapshot = {
  locationLabel: 'Taraori',
  state: 'Haryana',
  district: 'Karnal',
  tempC: 28,
  feelsLikeC: 29,
  tempMinC: 18,
  tempMaxC: 33,
  condition: 'Clear',
  humidityPct: 55,
  windSpeedKmh: 8,
  windDirection: 'NW',
  rainProbabilityPct: 10,
  rainfallTodayMm: 0,
  cloudCoverPct: 15,
  visibilityKm: 8,
  soilTempEstimateC: 26,
  sourceType: 'Demo Fallback Forecast',
  sourceProvider: 'Labelled sample forecast',
  updatedAt: '2026-10-15T06:00:00.000Z',
  hourly: [],
  daily: [
    {
      date: '2026-10-15',
      dayLabel: 'Today',
      tempMinC: 18,
      tempMaxC: 33,
      condition: 'Clear',
      rainProbPct: 10,
      expectedRainMm: 0,
      humidityPct: 55,
      windKmh: 8,
    },
  ],
  warnings: [],
};

const PAIRED_NODE: IoTDevice = {
  id: 'node-1',
  ownerUserId: 'user-1',
  farmId: 'farm-1',
  plotId: 'plot-1',
  type: 'sensor_node',
  name: 'North node',
  locationLabel: 'North boundary',
  status: 'online',
  installedSensors: ['soil_moisture', 'soil_temperature'],
  isDemoRecord: false,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-15T05:00:00.000Z',
  lastSeenAt: '2026-10-15T05:00:00.000Z',
};

const PENDING_NODE: IoTDevice = {
  ...PAIRED_NODE,
  id: 'node-2',
  plotId: 'plot-2',
  name: 'Pending node',
  status: 'pending_pairing',
  lastSeenAt: undefined,
};

const reading = (overrides: Partial<TelemetryReading> = {}): TelemetryReading => ({
  id: 'reading-1',
  deviceId: 'node-1',
  farmId: 'farm-1',
  sensorType: 'soil_moisture',
  value: 55,
  unit: '%',
  measuredAt: new Date().toISOString(),
  receivedAt: new Date().toISOString(),
  source: 'physical_sensor',
  quality: 'valid',
  ...overrides,
});

const baseInput = (overrides: Partial<FieldIntelligenceInput> = {}): FieldIntelligenceInput => ({
  farm: FARM,
  plots: PLOTS,
  crops: CROPS,
  observations: [],
  devices: [PAIRED_NODE, PENDING_NODE],
  readingsByDevice: { 'node-1': [reading()] },
  weather: WEATHER,
  rainfallLogs: [],
  diseaseReports: [],
  activities: [],
  telemetryLoading: false,
  ...overrides,
});

describe('provenance helpers', () => {
  it('treats missing values as unavailable instead of zero', () => {
    const point = unavailable('No reading received');
    assert.equal(point.value, null);
    assert.equal(point.provenance, 'unavailable');
    assert.equal(displayValue(point), '—');
    assert.equal(formatMeasurement(null), '—');
    assert.equal(formatMeasurement(undefined), '—');
  });

  it('never formats NaN as a measurement', () => {
    assert.equal(formatMeasurement(Number.NaN), '—');
    assert.equal(formatMeasurement(Number.POSITIVE_INFINITY), '—');
  });

  it('classifies freshness against the device online window', () => {
    const now = Date.now();
    assert.equal(describeFreshness(new Date(now - 60_000).toISOString(), { now }).state, 'live');
    assert.equal(describeFreshness(new Date(now - 30 * 60_000).toISOString(), { now }).state, 'recent');
    // Older than the default 90-minute "recent" window is treated as stale, never as live.
    assert.equal(describeFreshness(new Date(now - 3 * 60 * 60_000).toISOString(), { now }).state, 'stale');
    assert.equal(describeFreshness(undefined, { now }).state, 'unknown');
    assert.equal(describeFreshness('not-a-date', { now }).state, 'unknown');
  });
});

describe('zone snapshots', () => {
  it('reports no data and holds guidance when nothing is recorded', () => {
    const zones = buildZoneSnapshots(baseInput({ readingsByDevice: {}, devices: [PENDING_NODE] }));
    const zone = zones.find((item) => item.plot.id === 'plot-2');
    assert.ok(zone);
    assert.equal(zone.latestMoisture.value, null);
    assert.equal(zone.latestMoisture.provenance, 'unavailable');
    assert.equal(zone.irrigation.action, 'collect_data');
    assert.equal(zone.irrigation.confidence, 'low');
    assert.equal(resolveMoisture(zone).value, null);
  });

  it('uses a paired sensor reading and labels it as measured', () => {
    const zones = buildZoneSnapshots(baseInput());
    const zone = zones.find((item) => item.plot.id === 'plot-1');
    assert.ok(zone);
    assert.equal(zone.latestMoisture.value, 55);
    assert.equal(zone.latestMoisture.provenance, 'measured');
    assert.match(zone.latestMoisture.sourceLabel || '', /North node/);
  });

  it('ignores readings flagged invalid and readings with non-finite values', () => {
    const zones = buildZoneSnapshots(
      baseInput({
        readingsByDevice: {
          'node-1': [
            reading({ id: 'bad-1', quality: 'invalid', value: 90 }),
            reading({ id: 'bad-2', value: Number.NaN }),
          ],
        },
      }),
    );
    const zone = zones.find((item) => item.plot.id === 'plot-1');
    assert.ok(zone);
    assert.equal(zone.latestMoisture.value, null);
  });

  it('compares moisture with the reference band for the recorded growth stage', () => {
    const adequate = buildZoneSnapshots(baseInput({ readingsByDevice: { 'node-1': [reading({ value: 60 })] } }))[0];
    assert.equal(adequate.irrigation.band, 'adequate');
    assert.equal(adequate.irrigation.action, 'hold');
    assert.deepEqual(adequate.irrigation.referenceRange, { min: 45, max: 75 });

    const dry = buildZoneSnapshots(baseInput({ readingsByDevice: { 'node-1': [reading({ value: 38 })] } }))[0];
    assert.equal(dry.irrigation.band, 'dry');
    assert.equal(dry.irrigation.action, 'irrigate_soon');

    const veryDry = buildZoneSnapshots(baseInput({ readingsByDevice: { 'node-1': [reading({ value: 20 })] } }))[0];
    assert.equal(veryDry.irrigation.band, 'very_dry');
    assert.equal(veryDry.irrigation.action, 'irrigate_now');

    const saturated = buildZoneSnapshots(baseInput({ readingsByDevice: { 'node-1': [reading({ value: 92 })] } }))[0];
    assert.equal(saturated.irrigation.band, 'saturated');
    assert.equal(saturated.irrigation.action, 'drain');
  });

  it('holds irrigation when heavy rain is forecast for a dry zone', () => {
    const rainy: WeatherSnapshot = {
      ...WEATHER,
      daily: [{ ...WEATHER.daily[0], expectedRainMm: 14 }],
    };
    const zone = buildZoneSnapshots(
      baseInput({ weather: rainy, readingsByDevice: { 'node-1': [reading({ value: 42 })] } }),
    )[0];
    assert.equal(zone.irrigation.action, 'hold');
    assert.match(zone.irrigation.rationale, /forecast/i);
  });

  it('falls back to a farmer observation when no sensor reading exists', () => {
    const zones = buildZoneSnapshots(
      baseInput({
        readingsByDevice: {},
        observations: [
          {
            id: 'obs-1',
            farmId: 'farm-1',
            plotId: 'plot-1',
            plotName: 'Plot A1',
            cropId: 'crop-1',
            cropName: 'Wheat',
            category: 'Soil Moisture',
            soilMoisturePct: 40,
            notes: 'Hand probe reading',
            severity: 'Watch',
            sourceLabel: 'Farmer Recorded',
            recordedAt: new Date().toISOString(),
          },
        ],
      }),
    );
    const zone = zones.find((item) => item.plot.id === 'plot-1');
    assert.ok(zone);
    assert.equal(zone.latestMoisture.value, null, 'sensor channel stays empty when no telemetry exists');
    const resolved = resolveMoisture(zone);
    assert.equal(resolved.value, 40);
    assert.equal(resolved.provenance, 'recorded');
    assert.equal(zone.level, 'watch');
  });
});

describe('alerts', () => {
  it('raises a critical moisture alert for a zone far below the band', () => {
    const input = baseInput({ readingsByDevice: { 'node-1': [reading({ value: 18 })] } });
    const zones = buildZoneSnapshots(input);
    const alerts = buildAlerts(input, zones);
    const moistureAlert = alerts.find((alert) => alert.category === 'Soil moisture' && alert.plotName === 'Plot A1');
    assert.ok(moistureAlert);
    assert.equal(moistureAlert.severity, 'critical');
    assert.equal(moistureAlert.provenance, 'measured');
    assert.match(moistureAlert.detail, /18/);
    assert.ok(moistureAlert.nextStep.length > 0);
  });

  it('does not raise a moisture alert when there is no reading', () => {
    const input = baseInput({ readingsByDevice: {}, devices: [PENDING_NODE] });
    const zones = buildZoneSnapshots(input);
    const alerts = buildAlerts(input, zones);
    assert.equal(alerts.filter((alert) => alert.category === 'Soil moisture').length, 0);
  });

  it('flags uncommissioned devices as information rather than a fault', () => {
    const input = baseInput({ readingsByDevice: {}, devices: [PENDING_NODE] });
    const zones = buildZoneSnapshots(input);
    const alerts = buildAlerts(input, zones);
    const deviceAlert = alerts.find((alert) => alert.deviceName === 'Pending node');
    assert.ok(deviceAlert);
    assert.equal(deviceAlert.severity, 'info');
    assert.match(deviceAlert.title, /not commissioned/);
  });

  it('orders alerts by severity', () => {
    const input = baseInput({
      readingsByDevice: { 'node-1': [reading({ value: 18 })] },
      weather: {
        ...WEATHER,
        warnings: [
          { id: 'w-1', severity: 'Advisory', title: 'High wind advisory', description: 'Wind above 30 km/h', triggerCondition: 'wind > 30' },
        ],
      },
    });
    const zones = buildZoneSnapshots(input);
    const alerts = buildAlerts(input, zones);
    assert.equal(alerts[0].severity, 'critical');
    const severities = alerts.map((alert) => alert.severity);
    const firstAdvisory = severities.indexOf('advisory');
    const lastCritical = severities.lastIndexOf('critical');
    assert.ok(lastCritical < firstAdvisory, 'critical items must precede advisories');
  });
});

describe('stress screening', () => {
  it('marks zones without readings as insufficient data rather than low risk', () => {
    const input = baseInput({ readingsByDevice: {}, devices: [PENDING_NODE] });
    const zones = buildZoneSnapshots(input);
    const findings = buildStressIndicators(input, zones);
    const finding = findings.find((item) => item.zoneName === 'Plot A2');
    assert.ok(finding);
    assert.equal(finding.risk, 'insufficient_data');
    assert.equal(finding.riskScore, null);
    assert.equal(finding.confidence, 'low');
  });

  it('reports elevated risk and keeps the screening method explicit', () => {
    const input = baseInput({ readingsByDevice: { 'node-1': [reading({ value: 22 })] } });
    const zones = buildZoneSnapshots(input);
    const findings = buildStressIndicators(input, zones);
    const finding = findings.find((item) => item.id === 'stress-moisture-plot-1');
    assert.ok(finding);
    assert.equal(finding.risk, 'elevated');
    assert.equal(finding.method, 'Rule-based screening');
    assert.ok(finding.assumptions.join(' ').length > 0);
    assert.ok(finding.dataUsed.length > 0);
  });
});

describe('soil, crop health and overview', () => {
  it('labels soil pH as unavailable when no pH sensor reported', () => {
    const input = baseInput();
    const zones = buildZoneSnapshots(input);
    const rows = buildSoilRows(input, zones);
    const phRow = rows.find((row) => row.label === 'Soil pH' && row.zoneName === 'Plot A1');
    assert.ok(phRow);
    assert.equal(phRow.value, null);
    assert.equal(phRow.provenance, 'unavailable');
    assert.equal(phRow.statusLabel, 'No pH sensor paired');
  });

  it('derives crop health from records and keeps the recorded status visible', () => {
    const input = baseInput();
    const zones = buildZoneSnapshots(input);
    const entries = buildCropHealth(input, zones);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].recordedHealth, 'Healthy');
    assert.equal(entries[0].cropName, 'Wheat');
    assert.ok(entries[0].nextCheckSuggestion.length > 0);
  });

  it('measures data coverage without inflating it', () => {
    const input = baseInput();
    const zones = buildZoneSnapshots(input);
    const overview = buildFarmOverview(input, zones);
    assert.equal(overview.plots, 2);
    assert.equal(overview.zonesWithData, 1);
    assert.equal(overview.zonesTotal, 2);
    assert.equal(overview.dataAvailabilityPct, 50);
    assert.equal(overview.onlineDevices, 1);
    assert.equal(overview.pendingDevices, 1);
  });

  it('counts recorded rainfall logs only when they contain a number', () => {
    const logs: RainfallLog[] = [
      { id: 'r-1', farmId: 'farm-1', date: '2026-10-14', amountMm: 12.5, sourceType: 'Farmer Recorded', notes: '' },
    ];
    const input = baseInput({ rainfallLogs: logs });
    const zones = buildZoneSnapshots(input);
    const alerts = buildAlerts(input, zones);
    const rainfallAlert = alerts.find((alert) => alert.id === 'alert-rainfall-r-1');
    assert.ok(rainfallAlert);
    assert.equal(rainfallAlert.provenance, 'recorded');
  });
});

describe('activity-driven alerts', () => {
  it('raises an alert only for pending activities that are due', () => {
    const past: FarmActivity = {
      id: 'act-1',
      farmId: 'farm-1',
      title: 'Irrigate Plot A1',
      category: 'Irrigation',
      scheduledDate: '2026-01-01',
      priority: 'High',
      status: 'Pending',
      notes: '',
      isDemoRecord: false,
    };
    const future: FarmActivity = {
      ...past,
      id: 'act-2',
      title: 'Fertiliser for Plot A2',
      scheduledDate: '2099-01-01',
      priority: 'Low',
    };
    const completed: FarmActivity = { ...past, id: 'act-3', title: 'Harvest done', status: 'Completed' };

    const input = baseInput({ activities: [past, future, completed] });
    const zones = buildZoneSnapshots(input);
    const alerts = buildAlerts(input, zones).filter((alert) => alert.category === 'Field activity');
    assert.equal(alerts.length, 1);
    assert.match(alerts[0].title, /Irrigate Plot A1/);
  });
});
