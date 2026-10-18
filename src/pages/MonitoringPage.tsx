import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BatteryCharging,
  Droplets,
  Gauge,
  HelpCircle,
  RadioTower,
  RefreshCw,
  Sprout,
  Thermometer,
  Waves,
} from 'lucide-react';
import { PageHeader, SectionCard, KpiTile, Notice, EmptyState, ProvenanceTag, StatusBadge, Meter, SegmentedControl } from '../components/ui/primitives';
import { AgriPulseLoader } from '../components/AgriPulseLoader';
import { TrendChart, CHART_COLOURS } from '../components/ui/charts';
import { useFarmScope } from '../hooks/useFarmScope';
import { useAgriPulse } from '../context/AgriPulseContext';
import {
  CHARTABLE_SENSORS,
  SENSOR_LABELS,
  buildSensorSeries,
  latestReading,
  unitForSensor,
} from '../services/fieldIntelligence';
import { describeFreshness, formatMeasurement, formatTimestamp } from '../services/provenance';
import { DEVICE_STATUS_META, SENSOR_OPTIONS } from '../services/deviceService';
import { InstalledSensorType } from '../types';

type WindowOption = 'live' | '24h' | '7d' | '30d';

const WINDOW_HOURS: Record<WindowOption, number | undefined> = {
  live: 6,
  '24h': 24,
  '7d': 24 * 7,
  '30d': 24 * 30,
};

const WINDOW_LABELS: Record<WindowOption, string> = {
  live: 'Last 6 hours',
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
};

const sensorIcon = (sensor: InstalledSensorType) => {
  switch (sensor) {
    case 'soil_moisture':
      return <Droplets size={17} />;
    case 'soil_temperature':
      return <Thermometer size={17} />;
    case 'air_temperature_humidity':
      return <Waves size={17} />;
    case 'battery_voltage':
      return <BatteryCharging size={17} />;
    case 'soil_ph':
      return <Gauge size={17} />;
    default:
      return <Activity size={17} />;
  }
};

export const MonitoringPage: React.FC = () => {
  const { devices } = useAgriPulse();
  const scope = useFarmScope();
  const [windowOption, setWindowOption] = useState<WindowOption>('24h');
  const [sensorFilter, setSensorFilter] = useState<'all' | InstalledSensorType>('all');

  const farmDevices = useMemo(() => devices.filter((device) => device.farmId === scope.farmId && device.status !== 'retired'), [devices, scope.farmId]);

  const sensorNodes = useMemo(() => farmDevices.filter((device) => device.type === 'sensor_node'), [farmDevices]);

  const reportedSensors = useMemo(() => {
    const found = new Set<InstalledSensorType>();
    for (const device of sensorNodes) {
      for (const reading of scope.readings) {
        if (reading.deviceId === device.id) found.add(reading.sensorType);
      }
    }
    return Array.from(found);
  }, [sensorNodes, scope.readings]);

  const hours = WINDOW_HOURS[windowOption];

  const seriesData = useMemo(() => {
    if (sensorFilter === 'all') return null;
    const scoped = scope.readings.filter((reading) => {
      if (reading.sensorType !== sensorFilter) return false;
      if (!hours) return true;
      return new Date(reading.measuredAt).getTime() >= Date.now() - hours * 3600 * 1000;
    });
    return buildSensorSeries(scoped, sensorFilter).map((point) => ({ timestamp: point.timestamp, label: point.label, value: point.value }));
  }, [scope.readings, sensorFilter, hours]);

  const freshestReading = useMemo(() => {
    const sorted = [...scope.readings].sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());
    return sorted[0];
  }, [scope.readings]);

  const freshness = describeFreshness(freshestReading?.measuredAt);

  const onlineNodes = sensorNodes.filter((device) => device.status === 'online').length;
  const moistureZones = scope.zones.filter((zone) => zone.instrumentedSensors.includes('soil_moisture')).length;

  const moistureForFarm = useMemo(() => {
    const points = scope.zones
      .map((zone) => (zone.latestMoisture.value !== null ? zone.latestMoisture : null))
      .filter((point): point is NonNullable<typeof point> => point !== null);
    if (points.length === 0) return null;
    const total = points.reduce((sum, point) => sum + (point.value || 0), 0);
    return { average: Number((total / points.length).toFixed(1)), count: points.length };
  }, [scope.zones]);

  return (
    <div className="ap-page">
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-2"><Activity size={12} /> Live monitoring</span>}
        title="Live sensor monitoring"
        subtitle={
          <>
            Physical-sensor readings received by the AGRIPULSE API from paired nodes on <strong>{scope.farmName}</strong>.
            Values are stored, not simulated: a zone with no paired node stays empty until hardware reports.
          </>
        }
        breadcrumbs={[{ label: 'Portal', to: '/home' }, { label: 'Field intelligence' }, { label: 'Live monitoring' }]}
        actions={
          <>
            <button
              type="button"
              className="ap-btn ap-btn--secondary"
              onClick={() => void scope.refreshTelemetry()}
              disabled={scope.telemetryLoading}
            >
              {scope.telemetryLoading ? <AgriPulseLoader size="sm" /> : <RefreshCw size={14} />}
              {scope.telemetryLoading ? 'Checking readings…' : 'Refresh readings'}
            </button>
            <Link className="ap-btn ap-btn--primary" to="/devices">
              <RadioTower size={14} /> Manage devices
            </Link>
          </>
        }
      />

      {scope.telemetryError && (
        <Notice tone="danger" title="Reading service unavailable.">
          {scope.telemetryError} Readings shown below are the last values returned by the API. Use “Refresh readings” to retry.
        </Notice>
      )}

      {scope.needsFarmSetup && (
        <EmptyState
          icon={<Sprout size={19} />}
          title="Add a farm before monitoring"
          description="Live monitoring uses the plots and devices of the farm you select. Create a farm record first, then pair a node."
          action={<Link className="ap-btn ap-btn--primary" to="/farm">Open farm records</Link>}
        />
      )}

      {!scope.needsFarmSetup && (
        <>
          <div className="ap-grid ap-grid--metrics">
            <KpiTile
              label="Reporting nodes"
              value={`${onlineNodes}/${sensorNodes.length}`}
              icon={<RadioTower size={15} />}
              footer={
                <span>
                  {onlineNodes} online of {sensorNodes.length} registered sensor node{sensorNodes.length === 1 ? '' : 's'}
                </span>
              }
            />
            <KpiTile
              label="Latest reading"
              value={freshestReading ? describeFreshness(freshestReading.measuredAt).label.replace('Received ', '') : '—'}
              icon={<Activity size={15} />}
              tone={freshness.state === 'live' ? 'default' : 'amber'}
              footer={
                <span>
                  {freshestReading
                    ? `${SENSOR_LABELS[freshestReading.sensorType]?.label || freshestReading.sensorType} · ${formatTimestamp(freshestReading.measuredAt)}`
                    : 'No reading has been received for this farm yet'}
                </span>
              }
            />
            <KpiTile
              label="Farm soil moisture"
              value={moistureForFarm ? moistureForFarm.average : '—'}
              unit={moistureForFarm ? '%' : undefined}
              icon={<Droplets size={15} />}
              tone="water"
              badge={<ProvenanceTag kind="measured" />}
              footer={
                <span>
                  {moistureForFarm
                    ? `Average of ${moistureForFarm.count} zone sensor reading${moistureForFarm.count === 1 ? '' : 's'}`
                    : 'No soil-moisture reading received'}
                </span>
              }
            />
            <KpiTile
              label="Sensor coverage"
              value={`${moistureZones}/${scope.zones.length}`}
              icon={<Sprout size={15} />}
              footer={<span>Field zones with a soil-moisture node assigned</span>}
            />
          </div>

          <SectionCard
            title="Readings by node"
            description="Each card is one registered node. Status comes from the API heartbeat, never from the interface."
            icon={<RadioTower size={15} />}
            actions={
              <Link className="ap-btn ap-btn--secondary ap-btn--sm" to="/devices">
                Device registry <ArrowRight size={13} />
              </Link>
            }
          >
            {sensorNodes.length === 0 ? (
              <EmptyState
                icon={<RadioTower size={19} />}
                title="No sensor node registered for this farm"
                description="Register a node in the device registry, then complete secure pairing. Until a node reports a heartbeat, no readings can be shown here."
                action={<Link className="ap-btn ap-btn--primary" to="/devices">Open device registry</Link>}
              />
            ) : (
              <div className="ap-grid ap-grid--two">
                {sensorNodes.map((device) => {
                  const deviceReadings = scope.readings.filter((reading) => reading.deviceId === device.id);
                  const sensors = device.installedSensors || [];
                  const statusMeta = DEVICE_STATUS_META[device.status];
                  const lastSeen = device.lastSeenAt;
                  const zone = scope.zones.find((item) => item.plot.id === device.plotId);

                  return (
                    <article key={device.id} className="ap-card">
                      <div className="ap-card-head" style={{ marginBottom: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <h3 className="ap-card-title">
                            <RadioTower size={15} />
                            <span className="ap-truncate">{device.name}</span>
                          </h3>
                          <p className="ap-card-desc">
                            {zone ? zone.plot.name : 'No field zone assigned'} · {device.locationLabel}
                          </p>
                        </div>
                        <StatusBadge
                          tone={
                            device.status === 'online'
                              ? 'ok'
                              : device.status === 'offline'
                              ? 'muted'
                              : device.status === 'attention_required'
                              ? 'warn'
                              : 'info'
                          }
                          title={statusMeta.description}
                        >
                          {statusMeta.label}
                        </StatusBadge>
                      </div>

                      {deviceReadings.length === 0 ? (
                        <Notice tone="neutral" title="Waiting for readings.">
                          No reading has been stored for this node. {device.status === 'online'
                            ? 'The node is online but has not sent a sensor batch yet.'
                            : 'Readings only arrive after secure pairing and a valid heartbeat.'}
                        </Notice>
                      ) : (
                        <div className="ap-stack ap-stack--tight">
                          {sensors
                            .map((sensor) => ({ sensor, reading: latestReading(deviceReadings, sensor) }))
                            .filter((entry) => entry.reading)
                            .map(({ sensor, reading }) => {
                              const meta = SENSOR_LABELS[sensor];
                              const age = describeFreshness(reading!.measuredAt);
                              return (
                                <div key={sensor} className="ap-row ap-row--between" style={{ gap: 10 }}>
                                  <span className="ap-row" style={{ gap: 8 }}>
                                    <span className={`ap-kpi-icon${sensor === 'soil_moisture' ? ' ap-kpi-icon--water' : ''}`} aria-hidden="true">
                                      {sensorIcon(sensor)}
                                    </span>
                                    <span style={{ fontSize: 12, fontWeight: 700 }}>
                                      {meta?.label || sensor}
                                    </span>
                                  </span>
                                  <span className="ap-row" style={{ gap: 8 }}>
                                    <span className="ap-numeric" style={{ fontSize: 13, fontWeight: 800 }}>
                                      {formatMeasurement(reading!.value, sensor === 'soil_moisture' ? 0 : 1)} {reading!.unit || unitForSensor(sensor)}
                                    </span>
                                    <span className={`ap-dot ${age.state === 'live' ? 'ap-dot--ok' : age.state === 'recent' ? 'ap-dot--warn' : 'ap-dot--danger'}`} aria-hidden="true" />
                                    <span className="ap-help">{age.label}</span>
                                  </span>
                                </div>
                              );
                            })}
                          {sensors.every((sensor) => !latestReading(deviceReadings, sensor)) && (
                            <Notice tone="neutral">Stored readings exist for this node but not for its configured sensors.</Notice>
                          )}
                        </div>
                      )}

                      <div className="ap-card-foot">
                        <span className="ap-help">
                          Last heartbeat: {lastSeen ? formatTimestamp(lastSeen) : 'none received'}
                        </span>
                        <Link className="ap-btn ap-btn--ghost ap-btn--sm" to={`/devices/${device.id}`}>
                          Device details <ArrowRight size={12} />
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Measurement trends"
            description="Charts use only stored readings. Gaps mean no reading was received in that period — missing data is never drawn as zero."
            icon={<Activity size={15} />}
            actions={
              <div className="ap-row">
                <label className="ap-field" style={{ gap: 4 }}>
                  <span className="ap-label" style={{ fontSize: 10 }}>Sensor</span>
                  <select
                    className="ap-select"
                    style={{ minHeight: 34 }}
                    value={sensorFilter}
                    onChange={(event) => setSensorFilter(event.target.value as 'all' | InstalledSensorType)}
                  >
                    <option value="all">Select a sensor…</option>
                    {(reportedSensors.length ? reportedSensors : CHARTABLE_SENSORS).map((sensor) => (
                      <option key={sensor} value={sensor}>
                        {SENSOR_OPTIONS.find((option) => option.value === sensor)?.label || SENSOR_LABELS[sensor]?.label || sensor}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            }
          >
            <div className="ap-stack">
              <div className="ap-row ap-row--between">
                <SegmentedControl<WindowOption>
                  ariaLabel="Select time window"
                  value={windowOption}
                  onChange={setWindowOption}
                  options={[
                    { value: 'live', label: 'Live', title: 'Last 6 hours' },
                    { value: '24h', label: '24 hours' },
                    { value: '7d', label: '7 days' },
                    { value: '30d', label: '30 days' },
                  ]}
                />
                <span className="ap-help">
                  {WINDOW_LABELS[windowOption]}
                  {scope.telemetryLastFetchedAt ? ` · data checked ${formatTimestamp(scope.telemetryLastFetchedAt)}` : ''}
                </span>
              </div>

              {sensorFilter === 'all' ? (
                <EmptyState
                  icon={<HelpCircle size={19} />}
                  title="Choose a sensor to chart"
                  description="Pick a sensor above to plot stored readings for this window. Only sensors with at least one stored reading can be charted."
                />
              ) : seriesData && seriesData.length > 0 ? (
                <>
                  <TrendChart
                    data={seriesData}
                    variant="area"
                    yUnit={SCALE_UNIT_HINT[sensorFilter]}
                    series={[
                      {
                        key: 'value',
                        name: SENSOR_LABELS[sensorFilter]?.label || sensorFilter,
                        colour: sensorFilter === 'soil_moisture' ? CHART_COLOURS.water : CHART_COLOURS.green,
                        unit: unitForSensor(sensorFilter),
                      },
                    ]}
                    height={280}
                  />
                  <div className="ap-row ap-row--between">
                    <span className="ap-help">
                      {seriesData.length} stored reading{seriesData.length === 1 ? '' : 's'} · {WINDOW_LABELS[windowOption]}
                    </span>
                    <span className="ap-row" style={{ gap: 6 }}>
                      <ProvenanceTag kind="measured" />
                      <span className="ap-help">Source: ingested device telemetry</span>
                    </span>
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={<Activity size={19} />}
                  title="No readings in this window"
                  description={`No stored ${SENSOR_LABELS[sensorFilter]?.label.toLowerCase() || sensorFilter} reading falls inside ${WINDOW_LABELS[windowOption].toLowerCase()}. Widen the window or check the node heartbeat.`}
                />
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Zone measurement coverage"
            description="What AGRIPULSE can and cannot measure per field zone right now."
            icon={<Sprout size={15} />}
            actions={<Link className="ap-btn ap-btn--secondary ap-btn--sm" to="/twin">Open digital twin <ArrowRight size={13} /></Link>}
          >
            {scope.zones.length === 0 ? (
              <EmptyState
                icon={<Sprout size={19} />}
                title="No field zones recorded"
                description="Add plots to this farm so monitoring can be organised per zone."
                action={<Link className="ap-btn ap-btn--primary" to="/farm">Add plots</Link>}
              />
            ) : (
              <div className="ap-stack ap-stack--tight">
                {scope.zones.map((zone) => {
                  const moisture = zone.latestMoisture;
                  return (
                    <div key={zone.plot.id} className="ap-list-item">
                      <span className={`ap-list-marker${zone.level === 'attention' ? ' ap-list-marker--danger' : zone.level === 'watch' ? ' ap-list-marker--warn' : zone.level === 'unknown' ? ' ap-list-marker--muted' : ''}`} aria-hidden="true">
                        <Droplets size={15} />
                      </span>
                      <div className="ap-list-body">
                        <p className="ap-list-title">
                          {zone.plot.name}
                          <ProvenanceTag kind={moisture.provenance} />
                        </p>
                        <div className="ap-list-meta">
                          <span>{zone.plot.soilType || 'Soil type not recorded'}</span>
                          <span aria-hidden="true">·</span>
                          <span>{zone.instrumentedSensors.length > 0 ? `${zone.instrumentedSensors.length} sensor type(s) configured` : 'No sensors assigned'}</span>
                        </div>
                        <div style={{ marginTop: 8, maxWidth: 320 }}>
                          <Meter
                            label="Soil moisture"
                            value={moisture.value}
                            valueLabel={moisture.value === null ? undefined : `${moisture.value}%`}
                            state={zone.irrigation.band === 'adequate' ? 'ok' : zone.irrigation.band === 'unknown' ? 'neutral' : zone.irrigation.band === 'very_dry' || zone.irrigation.band === 'saturated' ? 'danger' : 'warn'}
                            caption={moisture.value === null ? moisture.note : `${moisture.sourceLabel} · ${describeFreshness(moisture.capturedAt).label}`}
                          />
                        </div>
                      </div>
                      <Link className="ap-btn ap-btn--ghost ap-btn--sm ap-no-print" to="/irrigation">
                        Guidance <ArrowRight size={12} />
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <Notice tone="warn" title="How to read this page honestly.">
            A node marked <strong>Online</strong> has sent a recent authenticated heartbeat to the AGRIPULSE API. It does not prove that
            the sensor is calibrated or installed correctly at the correct depth. Readings marked <strong>Sensor measured</strong> come
            from ingested hardware; anything a farmer typed is labelled <strong>Farmer recorded</strong> and sample content is labelled
            <strong> Sample data</strong>.
          </Notice>
        </>
      )}
    </div>
  );
};

const SCALE_UNIT_HINT: Partial<Record<InstalledSensorType, string>> = {
  soil_moisture: '%',
  soil_temperature: '°C',
  soil_ph: '',
  light: 'lx',
  battery_voltage: 'V',
};
