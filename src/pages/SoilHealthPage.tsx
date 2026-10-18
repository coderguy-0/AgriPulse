import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Beaker,
  Droplets,
  FlaskConical,
  Info,
  Layers,
  Leaf,
  NotebookPen,
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
  Meter,
  KeyValueList,
  InfoTip,
} from '../components/ui/primitives';
import { DataTable, DataTableColumn } from '../components/ui/DataTable';
import { useFarmScope } from '../hooks/useFarmScope';
import { useAgriPulse } from '../context/AgriPulseContext';
import { SoilProfileRow } from '../services/fieldIntelligence';
import { describeFreshness, formatTimestamp } from '../services/provenance';
import { downloadCsv, timestampedFilename } from '../utils/exportData';

const NUTRIENT_REFERENCE = [
  {
    nutrient: 'Nitrogen (N)',
    instrumented: false,
    guidance: 'Split application by growth stage; leaf colour and tillering are practical field indicators. A lab soil test is the only reliable measure of available N.',
  },
  {
    nutrient: 'Phosphorus (P)',
    instrumented: false,
    guidance: 'Base application at sowing based on a soil test. AGRIPULSE has no phosphorus sensor and cannot measure it.',
  },
  {
    nutrient: 'Potassium (K)',
    instrumented: false,
    guidance: 'Needed for grain filling, strength and stress tolerance. Requires a soil test — no sensor reading is available here.',
  },
  {
    nutrient: 'Organic carbon',
    instrumented: false,
    guidance: 'Lab test only. Rising organic carbon improves water-holding capacity and reduces irrigation frequency.',
  },
  {
    nutrient: 'Soil pH',
    instrumented: true,
    guidance: 'Measurable with a calibrated soil-pH probe. Values between roughly 6.0 and 7.5 suit most field crops; extremes limit nutrient availability.',
  },
  {
    nutrient: 'Electrical conductivity (salinity)',
    instrumented: false,
    guidance: 'Lab or handheld EC meter required. Not measured by the sensor types supported in this build.',
  },
];

export const SoilHealthPage: React.FC = () => {
  const { observations, activeFarm } = useAgriPulse();
  const scope = useFarmScope();
  const [zoneFilter, setZoneFilter] = useState('all');

  const farmObservations = useMemo(
    () =>
      observations
        .filter((observation) => observation.farmId === scope.farmId)
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()),
    [observations, scope.farmId],
  );

  const filteredRows = useMemo(
    () => (zoneFilter === 'all' ? scope.soilRows : scope.soilRows.filter((row) => row.zoneName === zoneFilter)),
    [scope.soilRows, zoneFilter],
  );

  const phRows = scope.soilRows.filter((row) => row.label === 'Soil pH');
  const phAvailable = phRows.filter((row) => row.value !== null);
  const observedMoisture = farmObservations.filter((observation) => observation.soilMoisturePct !== undefined);
  const observedSoilTemp = farmObservations.filter((observation) => observation.soilTempC !== undefined);

  const columns: DataTableColumn<SoilProfileRow>[] = [
    { id: 'zone', header: 'Field zone', compactHeader: 'Zone', render: (row) => <strong>{row.zoneName}</strong>, sortValue: (row) => row.zoneName },
    { id: 'metric', header: 'Measurement', render: (row) => row.label, sortValue: (row) => row.label },
    {
      id: 'value',
      header: 'Value',
      numeric: true,
      render: (row) =>
        row.value === null ? <span className="is-muted">—</span> : `${row.value}${row.unit ? ` ${row.unit}` : ''}`,
      sortValue: (row) => row.value,
    },
    {
      id: 'status',
      header: 'Interpretation',
      render: (row) => (
        <StatusBadge tone={row.status === 'ok' ? 'ok' : row.status === 'watch' ? 'warn' : row.status === 'attention' ? 'danger' : 'muted'}>
          {row.statusLabel}
        </StatusBadge>
      ),
      sortValue: (row) => row.statusLabel,
    },
    {
      id: 'source',
      header: 'Source',
      render: (row) => (
        <div className="ap-row" style={{ gap: 6 }}>
          <ProvenanceTag kind={row.provenance} />
          {row.capturedAt && <span className="ap-help">{describeFreshness(row.capturedAt).label}</span>}
        </div>
      ),
      sortValue: (row) => row.provenance,
    },
    { id: 'note', header: 'Notes', render: (row) => <span className="is-muted">{row.note || '—'}</span>, sortValue: (row) => row.note || '' },
  ];

  return (
    <div className="ap-page">
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-2"><Layers size={12} /> Soil health</span>}
        title="Soil health"
        subtitle={
          <>
            Soil measurements AGRIPULSE can actually see for <strong>{scope.farmName}</strong>, and an explicit list of what
            still needs a lab test or a handheld kit.
          </>
        }
        breadcrumbs={[{ label: 'Portal', to: '/home' }, { label: 'Field intelligence' }, { label: 'Soil health' }]}
        actions={
          <>
            <button
              type="button"
              className="ap-btn ap-btn--secondary"
              onClick={() =>
                downloadCsv(
                  timestampedFilename(`agripulse-soil-${scope.farmName.replace(/\s+/g, '-').toLowerCase()}`),
                  [
                    { header: 'Field zone', value: (row: SoilProfileRow) => row.zoneName },
                    { header: 'Measurement', value: (row) => row.label },
                    { header: 'Value', value: (row) => (row.value === null ? 'no data' : row.value) },
                    { header: 'Unit', value: (row) => row.unit },
                    { header: 'Interpretation', value: (row) => row.statusLabel },
                    { header: 'Source', value: (row) => row.provenance },
                    { header: 'Captured at', value: (row) => row.capturedAt || '' },
                  ],
                  filteredRows,
                )
              }
            >
              <NotebookPen size={14} /> Export soil table
            </button>
            <Link className="ap-btn ap-btn--primary" to="/farm">
              <Beaker size={14} /> Add a soil observation
            </Link>
          </>
        }
      />

      <div className="ap-grid ap-grid--metrics">
        <KpiTile
          label="Zones with moisture data"
          value={`${scope.overview.zonesWithData}/${scope.overview.zonesTotal}`}
          icon={<Droplets size={15} />}
          tone="water"
          footer={<span>Sensor reading or farmer-recorded observation</span>}
        />
        <KpiTile
          label="Soil pH sensors reporting"
          value={phAvailable.length}
          icon={<FlaskConical size={15} />}
          tone={phAvailable.length ? 'default' : 'neutral'}
          footer={<span>{phAvailable.length ? 'Calibrated probes required for accuracy' : 'No pH probe is paired on this farm'}</span>}
        />
        <KpiTile
          label="Recorded moisture entries"
          value={observedMoisture.length}
          icon={<NotebookPen size={15} />}
          footer={<span>Manual observations with a moisture percentage</span>}
        />
        <KpiTile
          label="Recorded soil temperature"
          value={observedSoilTemp.length}
          icon={<Thermometer size={15} />}
          footer={<span>Manual observations with a soil-temperature value</span>}
        />
      </div>

      <SectionCard
        title="Soil measurement table"
        description="Filter by zone and export exactly what is shown. “—” means no measurement exists — it never means zero."
        icon={<Layers size={15} />}
        actions={
          <label className="ap-field" style={{ minWidth: 200 }}>
            <span className="ap-label" style={{ fontSize: 10 }}>Field zone</span>
            <select className="ap-select" style={{ minHeight: 34 }} value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)}>
              <option value="all">All zones</option>
              {scope.zones.map((zone) => (
                <option key={zone.plot.id} value={zone.plot.name}>
                  {zone.plot.name}
                </option>
              ))}
            </select>
          </label>
        }
      >
        <DataTable
          columns={columns}
          rows={filteredRows}
          getRowId={(row) => `${row.label}-${row.zoneName}`}
          emptyTitle="No soil records for this farm yet"
          emptyDescription="Pair a soil-moisture or pH node, or record a manual soil observation, and it will appear in this table."
          emptyAction={<Link className="ap-btn ap-btn--primary" to="/monitoring">Open monitoring</Link>}
          initialSort={{ columnId: 'zone', direction: 'asc' }}
        />
      </SectionCard>

      <div className="ap-split">
        <SectionCard
          title="Per-zone soil condition"
          description="Recorded soil type, latest moisture interpretation, and the crop stage the band is based on."
          icon={<Layers size={15} />}
        >
          {scope.zones.length === 0 ? (
            <EmptyState
              icon={<Layers size={19} />}
              title="No field zones recorded"
              description="Add plots so soil measurements can be grouped by zone."
              action={<Link className="ap-btn ap-btn--primary" to="/farm">Add plots</Link>}
            />
          ) : (
            <div className="ap-stack">
              {scope.zones.map((zone) => (
                <div key={zone.plot.id} className="ap-card ap-card--quiet">
                  <div className="ap-card-head" style={{ marginBottom: 10 }}>
                    <div>
                      <h3 className="ap-card-title">
                        <Leaf size={15} />
                        {zone.plot.name}
                      </h3>
                      <p className="ap-card-desc">
                        {zone.plot.soilType || 'Soil type not recorded'} · {zone.plot.area} {zone.plot.areaUnit}
                      </p>
                    </div>
                    <StatusBadge
                      tone={zone.irrigation.band === 'adequate' ? 'ok' : zone.irrigation.band === 'unknown' ? 'muted' : zone.irrigation.band === 'dry' || zone.irrigation.band === 'high' ? 'warn' : 'danger'}
                    >
                      {zone.irrigation.bandLabel}
                    </StatusBadge>
                  </div>
                  <Meter
                    label={zone.crop ? `Moisture · ${zone.crop.cropName} at ${zone.crop.growthStage}` : 'Moisture'}
                    value={zone.latestMoisture.value}
                    valueLabel={zone.latestMoisture.value === null ? undefined : `${zone.latestMoisture.value}%`}
                    state={zone.irrigation.band === 'adequate' ? 'ok' : zone.irrigation.band === 'unknown' ? 'neutral' : zone.irrigation.band === 'very_dry' || zone.irrigation.band === 'saturated' ? 'danger' : 'warn'}
                    caption={
                      zone.latestMoisture.value === null
                        ? zone.latestMoisture.note
                        : `${zone.latestMoisture.sourceLabel} · ${describeFreshness(zone.latestMoisture.capturedAt).label}`
                    }
                  />
                  <div className="ap-row" style={{ marginTop: 12, gap: 10 }}>
                    <span className="ap-chip">
                      Soil temperature:{' '}
                      <strong>{zone.latestSoilTemperature.value === null ? 'no reading' : `${zone.latestSoilTemperature.value} °C`}</strong>
                      <ProvenanceTag kind={zone.latestSoilTemperature.provenance} />
                    </span>
                    <span className="ap-chip">
                      Observations: <strong>{zone.observationCount}</strong>
                      <ProvenanceTag kind="recorded" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="ap-stack">
          <SectionCard
            title="Nutrients: what needs a lab test"
            description="AGRIPULSE supports an NPK interface in the device registry, but no NPK sensor is paired on this farm, so no nutrient value is shown."
            icon={<FlaskConical size={15} />}
          >
            <ul className="ap-list">
              {NUTRIENT_REFERENCE.map((item) => (
                <li key={item.nutrient} className="ap-list-item">
                  <span className={`ap-list-marker${item.instrumented ? '' : ' ap-list-marker--muted'}`} aria-hidden="true">
                    {item.instrumented ? <FlaskConical size={14} /> : <Beaker size={14} />}
                  </span>
                  <div className="ap-list-body">
                    <p className="ap-list-title">
                      {item.nutrient}
                      <StatusBadge tone={item.instrumented ? 'ok' : 'muted'}>
                        {item.instrumented ? 'Sensor-supported' : 'Lab test required'}
                      </StatusBadge>
                    </p>
                    <p>{item.guidance}</p>
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Farm soil record" icon={<Info size={15} />}>
            <KeyValueList
              items={[
                { label: 'Farm', value: activeFarm?.name || scope.farmName },
                { label: 'Recorded soil type', value: activeFarm?.soilType || 'Not recorded' },
                { label: 'Water source', value: activeFarm?.waterSource || 'Not recorded' },
                { label: 'Total recorded area', value: `${scope.overview.totalArea} acre` },
                { label: 'Ownership', value: activeFarm?.ownershipType || 'Not recorded' },
              ]}
            />
            <Notice tone="neutral" style={{ marginTop: 12 }}>
              Soil type is text you recorded when creating the plot. It is not a soil test. Add a lab report as an observation
              note if you have one, and reference it when interpreting the reference bands.{' '}
              <InfoTip label="Why bands can be wrong for your field">
                Available-water capacity depends on texture, organic carbon, compaction and rooting depth. A sandy loam can drop
                below a generic band while a heavy clay still holds usable water, which is why AGRIPULSE labels bands as
                guidance and asks you to confirm field conditions.
              </InfoTip>
            </Notice>
            <div className="ap-row" style={{ marginTop: 10 }}>
              <Link className="ap-btn ap-btn--secondary ap-btn--sm" to="/farm">
                Update farm & plot records <ArrowRight size={12} />
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard
        title="Latest soil observations"
        description="Manual entries recorded by hand. These are farmer observations, not sensor readings."
        icon={<NotebookPen size={15} />}
      >
        {farmObservations.length === 0 ? (
          <EmptyState
            icon={<NotebookPen size={19} />}
            title="No soil observations recorded"
            description="A quick manual note — moisture feel, soil temperature, standing water — keeps guidance useful before hardware is installed."
            action={<Link className="ap-btn ap-btn--primary" to="/farm">Record an observation</Link>}
          />
        ) : (
          <ul className="ap-list">
            {farmObservations.slice(0, 8).map((observation) => (
              <li key={observation.id} className="ap-list-item">
                <span className="ap-list-marker ap-list-marker--info" aria-hidden="true">
                  <NotebookPen size={14} />
                </span>
                <div className="ap-list-body">
                  <p className="ap-list-title">
                    {observation.category} · {observation.plotName || 'Farm level'}
                    <ProvenanceTag kind={observation.sourceLabel === 'Demo Sample Record' ? 'demo' : 'recorded'} />
                    <StatusBadge tone={observation.severity === 'Action Needed' ? 'danger' : observation.severity === 'Watch' ? 'warn' : 'ok'}>
                      {observation.severity}
                    </StatusBadge>
                  </p>
                  <div className="ap-list-meta">
                    <span>{formatTimestamp(observation.recordedAt)}</span>
                    <span aria-hidden="true">·</span>
                    <span>Moisture: {observation.soilMoisturePct !== undefined ? `${observation.soilMoisturePct}%` : 'not recorded'}</span>
                    <span aria-hidden="true">·</span>
                    <span>Soil temp: {observation.soilTempC !== undefined ? `${observation.soilTempC} °C` : 'not recorded'}</span>
                  </div>
                  <p>{observation.notes}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {farmObservations.length > 8 && (
          <div className="ap-card-foot">
            <span className="ap-help">{farmObservations.length - 8} older observations are in the farm records log.</span>
            <Link className="ap-btn ap-btn--ghost ap-btn--sm" to="/farm">
              Open full log <ArrowRight size={12} />
            </Link>
          </div>
        )}
      </SectionCard>
    </div>
  );
};
