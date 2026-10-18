import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  CalendarRange,
  Download,
  Droplets,
  FileBarChart2,
  Printer,
  RadioTower,
  Sprout,
  Thermometer,
} from 'lucide-react';
import {
  PageHeader,
  SectionCard,
  KpiTile,
  Notice,
  EmptyState,
  ProvenanceTag,
  StatusBadge,
  SegmentedControl,
  KeyValueList,
} from '../components/ui/primitives';
import { TrendChart, CHART_COLOURS } from '../components/ui/charts';
import { DataTable, DataTableColumn } from '../components/ui/DataTable';
import { useFarmScope } from '../hooks/useFarmScope';
import { useAgriPulse } from '../context/AgriPulseContext';
import { buildSensorSeries, latestReading } from '../services/fieldIntelligence';
import { describeFreshness, formatTimestamp } from '../services/provenance';
import { downloadCsv, timestampedFilename } from '../utils/exportData';
import { InstalledSensorType } from '../types';

type WindowOption = '7d' | '30d' | 'all';

const WINDOW_HOURS: Record<WindowOption, number | undefined> = {
  '7d': 24 * 7,
  '30d': 24 * 30,
  all: undefined,
};

interface ZoneReportRow {
  zone: string;
  crop: string;
  stage: string;
  area: string;
  moisture: string;
  moistureSource: string;
  soilTemp: string;
  assessment: string;
  irrigationAction: string;
  devices: number;
  observations: number;
  lastActivity?: string;
}

export const ReportsPage: React.FC = () => {
  const { activities, rainfallLogs } = useAgriPulse();
  const scope = useFarmScope();
  const [windowOption, setWindowOption] = useState<WindowOption>('30d');
  const [sensor, setSensor] = useState<InstalledSensorType>('soil_moisture');

  const hours = WINDOW_HOURS[windowOption];

  const scopedReadings = useMemo(() => {
    if (!hours) return scope.readings;
    const cutoff = Date.now() - hours * 3600 * 1000;
    return scope.readings.filter((reading) => new Date(reading.measuredAt).getTime() >= cutoff);
  }, [scope.readings, hours]);

  const series = useMemo(
    () => buildSensorSeries(scopedReadings, sensor).map((point) => ({ timestamp: point.timestamp, label: point.label, value: point.value })),
    [scopedReadings, sensor],
  );

  const availableSensors = useMemo(() => {
    const found = new Set<InstalledSensorType>();
    scope.readings.forEach((reading) => found.add(reading.sensorType));
    return Array.from(found);
  }, [scope.readings]);

  const zoneRows: ZoneReportRow[] = useMemo(
    () =>
      scope.zones.map((zone) => {
        const moisture = zone.latestMoisture;
        const soilTemp = zone.latestSoilTemperature;
        return {
          zone: zone.plot.name,
          crop: zone.crop ? `${zone.crop.cropName} (${zone.crop.variety})` : 'No crop record',
          stage: zone.crop?.growthStage || 'Not recorded',
          area: `${zone.plot.area} ${zone.plot.areaUnit}`,
          moisture: moisture.value === null ? 'No data' : `${moisture.value} ${moisture.unit || '%'}`,
          moistureSource: moisture.value === null ? '—' : moisture.provenance === 'measured' ? `Sensor · ${moisture.sourceLabel}` : 'Farmer recorded',
          soilTemp: soilTemp.value === null ? 'No data' : `${soilTemp.value} °C`,
          assessment: zone.level === 'ok' ? 'No action' : zone.level === 'watch' ? 'Watch' : zone.level === 'attention' ? 'Action' : 'No data',
          irrigationAction: zone.irrigation.actionLabel,
          devices: zone.devices.length,
          observations: zone.observationCount,
          lastActivity: zone.latestObservation?.recordedAt,
        };
      }),
    [scope.zones],
  );

  const completionStats = useMemo(() => {
    const farmActivities = activities.filter((activity) => activity.farmId === scope.farmId);
    const completed = farmActivities.filter((activity) => activity.status === 'Completed').length;
    return {
      total: farmActivities.length,
      completed,
      pending: farmActivities.length - completed,
      completionPct: farmActivities.length === 0 ? null : Math.round((completed / farmActivities.length) * 100),
    };
  }, [activities, scope.farmId]);

  const columns: DataTableColumn<ZoneReportRow>[] = [
    { id: 'zone', header: 'Field zone', compactHeader: 'Zone', render: (row) => <strong>{row.zone}</strong>, sortValue: (row) => row.zone },
    { id: 'crop', header: 'Crop', render: (row) => row.crop, sortValue: (row) => row.crop },
    { id: 'stage', header: 'Stage', render: (row) => <span className="is-muted">{row.stage}</span>, sortValue: (row) => row.stage },
    { id: 'area', header: 'Area', render: (row) => row.area, sortValue: (row) => row.area },
    { id: 'moisture', header: 'Moisture', numeric: true, render: (row) => row.moisture, sortValue: (row) => row.moisture },
    { id: 'source', header: 'Moisture source', render: (row) => <span className="is-muted">{row.moistureSource}</span>, sortValue: (row) => row.moistureSource },
    { id: 'soilTemp', header: 'Soil temp', numeric: true, render: (row) => row.soilTemp, sortValue: (row) => row.soilTemp },
    {
      id: 'assessment',
      header: 'Assessment',
      render: (row) => (
        <StatusBadge tone={row.assessment === 'Action' ? 'danger' : row.assessment === 'Watch' ? 'warn' : row.assessment === 'No data' ? 'muted' : 'ok'}>
          {row.assessment}
        </StatusBadge>
      ),
      sortValue: (row) => row.assessment,
    },
    { id: 'irrigation', header: 'Irrigation guidance', render: (row) => row.irrigationAction, sortValue: (row) => row.irrigationAction },
    { id: 'devices', header: 'Devices', numeric: true, render: (row) => row.devices, sortValue: (row) => row.devices },
    { id: 'observations', header: 'Observations', numeric: true, render: (row) => row.observations, sortValue: (row) => row.observations },
  ];

  const farmRainfall = rainfallLogs.filter((log) => log.farmId === scope.farmId);
  const totalRainfall = farmRainfall.reduce((total, log) => total + log.amountMm, 0);

  return (
    <div className="ap-page">
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-2"><FileBarChart2 size={12} /> Reports</span>}
        title="Reports & analytics"
        subtitle={
          <>
            A single view of recorded activity, measurements and coverage for <strong>{scope.farmName}</strong>. Everything can
            be exported as CSV or printed for a farm visit or an exhibition review.
          </>
        }
        breadcrumbs={[{ label: 'Portal', to: '/home' }, { label: 'Field intelligence' }, { label: 'Reports' }]}
        actions={
          <>
            <button type="button" className="ap-btn ap-btn--secondary" onClick={() => window.print()}>
              <Printer size={14} /> Print view
            </button>
            <button
              type="button"
              className="ap-btn ap-btn--primary"
              onClick={() =>
                downloadCsv(
                  timestampedFilename(`agripulse-zone-report-${scope.farmName.replace(/\s+/g, '-').toLowerCase()}`),
                  [
                    { header: 'Field zone', value: (row: ZoneReportRow) => row.zone },
                    { header: 'Crop', value: (row) => row.crop },
                    { header: 'Growth stage', value: (row) => row.stage },
                    { header: 'Area', value: (row) => row.area },
                    { header: 'Moisture', value: (row) => row.moisture },
                    { header: 'Moisture source', value: (row) => row.moistureSource },
                    { header: 'Soil temperature', value: (row) => row.soilTemp },
                    { header: 'Assessment', value: (row) => row.assessment },
                    { header: 'Irrigation guidance', value: (row) => row.irrigationAction },
                    { header: 'Devices in zone', value: (row) => row.devices },
                    { header: 'Observations', value: (row) => row.observations },
                    { header: 'Last observation', value: (row) => row.lastActivity || '' },
                  ],
                  zoneRows,
                )
              }
              disabled={zoneRows.length === 0}
            >
              <Download size={14} /> Export zone report
            </button>
          </>
        }
      />

      <div className="ap-grid ap-grid--metrics">
        <KpiTile label="Stored readings" value={scope.readings.length} icon={<Activity size={15} />} footer={<span>Physical-sensor readings received for this farm</span>} />
        <KpiTile
          label="Data coverage"
          value={`${scope.overview.dataAvailabilityPct}%`}
          icon={<Sprout size={15} />}
          footer={<span>{scope.overview.zonesWithData} of {scope.overview.zonesTotal} zones have a moisture value</span>}
        />
        <KpiTile
          label="Task completion"
          value={completionStats.completionPct === null ? '—' : `${completionStats.completionPct}%`}
          icon={<BarChart3 size={15} />}
          footer={<span>{completionStats.completed} completed · {completionStats.pending} pending</span>}
        />
        <KpiTile
          label="Logged rainfall"
          value={farmRainfall.length === 0 ? '—' : totalRainfall.toFixed(1)}
          unit={farmRainfall.length === 0 ? undefined : 'mm'}
          icon={<Droplets size={15} />}
          tone="water"
          badge={<ProvenanceTag kind="recorded" />}
          footer={<span>{farmRainfall.length} farmer-recorded entries</span>}
        />
      </div>

      <SectionCard
        title="Measurement trend"
        description="Aggregated series built from stored readings only. Gaps mean no reading arrived in that period."
        icon={<Activity size={15} />}
        actions={
          <div className="ap-row">
            <SegmentedControl<WindowOption>
              ariaLabel="Reporting window"
              value={windowOption}
              onChange={setWindowOption}
              options={[
                { value: '7d', label: '7 days' },
                { value: '30d', label: '30 days' },
                { value: 'all', label: 'All stored' },
              ]}
            />
            <label className="ap-field" style={{ minWidth: 170 }}>
              <span className="ap-label" style={{ fontSize: 10 }}>Sensor</span>
              <select className="ap-select" style={{ minHeight: 34 }} value={sensor} onChange={(event) => setSensor(event.target.value as InstalledSensorType)}>
                {(availableSensors.length ? availableSensors : (['soil_moisture', 'soil_temperature'] as InstalledSensorType[])).map((option) => (
                  <option key={option} value={option}>
                    {option.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </label>
          </div>
        }
      >
        {series.length === 0 ? (
          <EmptyState
            icon={<Activity size={19} />}
            title="No stored readings for this selection"
            description="Choose another sensor or widen the window. Reporting never fabricates readings to fill a chart."
          />
        ) : (
          <>
            <TrendChart
              data={series}
              variant="line"
              height={280}
              series={[
                {
                  key: 'value',
                  name: sensor.replace(/_/g, ' '),
                  colour: sensor === 'soil_moisture' ? CHART_COLOURS.water : sensor === 'soil_temperature' ? CHART_COLOURS.amber : CHART_COLOURS.green,
                },
              ]}
            />
            <div className="ap-card-foot">
              <span className="ap-help">
                {series.length} readings · {windowOption === 'all' ? 'entire stored history' : `last ${windowOption}`}
              </span>
              <span className="ap-row" style={{ gap: 6 }}>
                <ProvenanceTag kind="measured" />
                <span className="ap-help">
                  Newest reading {formatTimestamp(scope.readings.reduce<string | undefined>((latest, reading) => (!latest || reading.measuredAt > latest ? reading.measuredAt : latest), undefined))} ·{' '}
                  {describeFreshness(scope.readings.reduce<string | undefined>((latest, reading) => (!latest || reading.measuredAt > latest ? reading.measuredAt : latest), undefined)).label}
                </span>
              </span>
            </div>
          </>
        )}
      </SectionCard>

      <SectionCard
        title="Zone report"
        description="The same figures the dashboard, twin and irrigation modules use — one source of truth."
        icon={<Sprout size={15} />}
      >
        <DataTable
          columns={columns}
          rows={zoneRows}
          getRowId={(row) => row.zone}
          emptyTitle="No zones to report on"
          emptyDescription="Add plots and crop records so a report can be assembled."
          emptyAction={<Link className="ap-btn ap-btn--primary" to="/farm">Add plots</Link>}
          initialSort={{ columnId: 'zone', direction: 'asc' }}
        />
      </SectionCard>

      <div className="ap-split">
        <SectionCard title="Device performance summary" icon={<RadioTower size={15} />}>
          {scope.zones.every((zone) => zone.devices.length === 0) ? (
            <EmptyState
              icon={<RadioTower size={19} />}
              title="No devices registered for this farm"
              description="Device reporting appears here once a node or gateway is registered against this farm."
              action={<Link className="ap-btn ap-btn--primary" to="/devices">Open device registry</Link>}
            />
          ) : (
            <div className="ap-table-wrap">
              <table className="ap-table">
                <caption>Heartbeat and sensory configuration are reported from the API, not estimated by the interface.</caption>
                <thead>
                  <tr>
                    <th scope="col">Device</th>
                    <th scope="col">Type</th>
                    <th scope="col">Status</th>
                    <th scope="col">Sensors</th>
                    <th scope="col">Last heartbeat</th>
                  </tr>
                </thead>
                <tbody>
                  {scope.zones
                    .flatMap((zone) => zone.devices)
                    .map((device) => (
                      <tr key={device.id}>
                        <td>
                          <strong>{device.name}</strong>
                          <div className="ap-help">{device.locationLabel}</div>
                        </td>
                        <td className="is-muted">{device.type === 'lora_gateway' ? 'LoRa gateway' : 'Sensor node'}</td>
                        <td>
                          <StatusBadge tone={device.status === 'online' ? 'ok' : device.status === 'offline' ? 'muted' : 'info'}>
                            {device.status.replace(/_/g, ' ')}
                          </StatusBadge>
                        </td>
                        <td className="is-muted">{(device.installedSensors || []).length || '—'}</td>
                        <td className="is-muted">{device.lastSeenAt ? `${formatTimestamp(device.lastSeenAt)} (${describeFreshness(device.lastSeenAt).label})` : 'Never received'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <div className="ap-stack">
          <SectionCard title="Report provenance" icon={<CalendarRange size={15} />}>
            <KeyValueList
              items={[
                { label: 'Farm', value: scope.farmName },
                { label: 'Generated', value: formatTimestamp(new Date().toISOString()) },
                { label: 'Sensor readings', value: `${scope.readings.length} stored (physical sensor)` },
                { label: 'Observations', value: `${scope.zones.reduce((total, zone) => total + zone.observationCount, 0)} farmer-recorded` },
                { label: 'Weather source', value: 'See the Weather module for provider and timestamp' },
              ]}
            />
            <Notice tone="neutral" style={{ marginTop: 12 }}>
              Figures here come from stored records. Anything unavailable is reported as “No data” so that a report is never
              mistaken for a complete measurement set.
            </Notice>
          </SectionCard>

          <SectionCard title="Latest sensor value per type" icon={<Thermometer size={15} />}>
            {availableSensors.length === 0 ? (
              <Notice tone="neutral">No physical-sensor reading has been received for this farm yet.</Notice>
            ) : (
              <ul className="ap-list">
                {availableSensors.map((sensorType) => {
                  const reading = latestReading(scope.readings, sensorType);
                  if (!reading) return null;
                  return (
                    <li key={sensorType} className="ap-list-item">
                      <span className="ap-list-marker" aria-hidden="true">
                        <Thermometer size={14} />
                      </span>
                      <div className="ap-list-body">
                        <p className="ap-list-title">
                          {sensorType.replace(/_/g, ' ')}
                          <ProvenanceTag kind="measured" />
                        </p>
                        <div className="ap-list-meta">
                          <strong className="ap-numeric">{reading.value} {reading.unit}</strong>
                          <span aria-hidden="true">·</span>
                          <span>{formatTimestamp(reading.measuredAt)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{describeFreshness(reading.measuredAt).label}</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
};
