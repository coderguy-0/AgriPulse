import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Leaf,
  Microscope,
  Sprout,
  Stethoscope,
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
import { useFarmScope } from '../hooks/useFarmScope';
import { useAgriPulse } from '../context/AgriPulseContext';
import { formatTimestamp, describeFreshness } from '../services/provenance';
import { SEED_100_CROP_DISEASES } from '../data/seed100CropDiseases';

type Filter = 'all' | 'attention' | 'watch' | 'ok';

const LEVEL_COPY: Record<string, { label: string; tone: 'ok' | 'warn' | 'danger' | 'muted' }> = {
  ok: { label: 'No action needed', tone: 'ok' },
  watch: { label: 'Watch', tone: 'warn' },
  attention: { label: 'Action recommended', tone: 'danger' },
  unknown: { label: 'Waiting for data', tone: 'muted' },
};

export const CropHealthPage: React.FC = () => {
  const { diseaseReports, weather } = useAgriPulse();
  const scope = useFarmScope();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const entries = useMemo(() => {
    const base = scope.cropHealth;
    if (filter === 'all') return base;
    return base.filter((entry) => entry.derivedLevel === filter);
  }, [scope.cropHealth, filter]);

  const matchingLibrary = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 3) return [];
    return SEED_100_CROP_DISEASES.filter(
      (disease) =>
        disease.disease.toLowerCase().includes(needle) ||
        disease.crop.toLowerCase().includes(needle) ||
        disease.scientificName.toLowerCase().includes(needle),
    ).slice(0, 6);
  }, [query]);

  const openReports = useMemo(() => diseaseReports.filter((report) => report.farmId === scope.farmId), [diseaseReports, scope.farmId]);

  const counts = useMemo(
    () => ({
      attention: scope.cropHealth.filter((entry) => entry.derivedLevel === 'attention').length,
      watch: scope.cropHealth.filter((entry) => entry.derivedLevel === 'watch').length,
      ok: scope.cropHealth.filter((entry) => entry.derivedLevel === 'ok').length,
      unknown: scope.cropHealth.filter((entry) => entry.derivedLevel === 'unknown').length,
    }),
    [scope.cropHealth],
  );

  return (
    <div className="ap-page">
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-2"><Stethoscope size={12} /> Crop health</span>}
        title="Crop health"
        subtitle={
          <>
            Per-crop condition for <strong>{scope.farmName}</strong>: recorded crop status, field observations, open
            symptom reports and the reference library you can compare against.
          </>
        }
        breadcrumbs={[{ label: 'Portal', to: '/home' }, { label: 'Field intelligence' }, { label: 'Crop health' }]}
        actions={
          <>
            <Link className="ap-btn ap-btn--secondary" to="/disease">
              <BookOpen size={14} /> Disease library ({SEED_100_CROP_DISEASES.length} entries)
            </Link>
            <Link className="ap-btn ap-btn--primary" to="/disease">
              <Microscope size={14} /> Record symptoms
            </Link>
          </>
        }
      />

      <Notice tone="warn" title="No photo diagnosis is running in this build.">
        AGRIPULSE does not analyse photographs to identify or confirm a disease unless a vision service has been configured on
        the server. The library is documented reference material, and any symptom-vs-library comparison is clearly labelled as
        demo logic. Confirm findings with an extension officer or plant-health lab before treating a crop.
      </Notice>

      <div className="ap-grid ap-grid--metrics">
        <KpiTile label="Crops needing attention" value={counts.attention} icon={<Stethoscope size={15} />} tone={counts.attention ? 'danger' : 'default'} footer={<span>Recorded status, observations or open reports</span>} />
        <KpiTile label="Crops on watch" value={counts.watch} icon={<Leaf size={15} />} tone="amber" footer={<span>Mild stress recorded or conditions trending unfavourable</span>} />
        <KpiTile label="Crops with no data" value={counts.unknown} icon={<Sprout size={15} />} tone="neutral" footer={<span>No sensor reading or observation yet</span>} />
        <KpiTile label="Open symptom reports" value={openReports.filter((report) => report.status !== 'Expert confirmed').length} icon={<ClipboardList size={15} />} footer={<span>{openReports.length} total reports saved for this farm</span>} />
      </div>

      <SectionCard
        title="Crop condition by zone"
        description="Derived from the recorded crop record, the latest field observation and any open symptom report."
        icon={<Sprout size={15} />}
        actions={
          <SegmentedControl<Filter>
            ariaLabel="Filter crops by condition"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: `All (${scope.cropHealth.length})` },
              { value: 'attention', label: `Attention (${counts.attention})` },
              { value: 'watch', label: `Watch (${counts.watch})` },
              { value: 'ok', label: `Healthy (${counts.ok})` },
            ]}
          />
        }
      >
        {scope.cropHealth.length === 0 ? (
          <EmptyState
            icon={<Sprout size={19} />}
            title="No crop records for this farm"
            description="Add a crop record to a plot so AGRIPULSE can track stage, irrigation method and health notes."
            action={<Link className="ap-btn ap-btn--primary" to="/farm">Add a crop record</Link>}
          />
        ) : entries.length === 0 ? (
          <EmptyState icon={<Leaf size={19} />} title="No crops in this filter" description="Switch to “All” to see every crop record for this farm." />
        ) : (
          <div className="ap-grid ap-grid--two">
            {entries.map((entry) => {
              const copy = LEVEL_COPY[entry.derivedLevel];
              return (
                <article key={entry.cropId} className="ap-card">
                  <div className="ap-card-head">
                    <div style={{ minWidth: 0 }}>
                      <h3 className="ap-card-title">
                        <Leaf size={15} />
                        {entry.cropName}
                      </h3>
                      <p className="ap-card-desc">
                        {entry.variety} · {entry.plotName}
                      </p>
                    </div>
                    <StatusBadge tone={copy.tone}>{copy.label}</StatusBadge>
                  </div>

                  <div className="ap-chip-row" style={{ marginBottom: 10 }}>
                    <span className="ap-chip">
                      <Sprout size={12} aria-hidden="true" /> {entry.growthStage}
                    </span>
                    <span className="ap-chip">
                      <CalendarDays size={12} aria-hidden="true" />
                      Last check:{' '}
                      {entry.lastInspectionAt ? formatTimestamp(entry.lastInspectionAt) : 'never recorded'}
                    </span>
                    <span className="ap-chip">
                      Recorded status: <strong>{entry.recordedHealth}</strong>
                      <ProvenanceTag kind="recorded" />
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: 12, lineHeight: 1.65 }}>{entry.derivedReason}</p>
                  <p className="ap-help" style={{ marginTop: 8 }}>{entry.nextCheckSuggestion}</p>

                  {entry.openReports.length > 0 && (
                    <div className="ap-stack ap-stack--tight" style={{ marginTop: 12 }}>
                      <h4 className="ap-kpi-label">Open reports</h4>
                      {entry.openReports.map((report) => (
                        <div key={report.id} className="ap-notice ap-notice--warn">
                          <div>
                            <strong>{report.status}</strong> · {formatTimestamp(report.updatedAt)}
                            <p style={{ margin: '4px 0 0' }}>{report.farmerDescription.slice(0, 160)}{report.farmerDescription.length > 160 ? '…' : ''}</p>
                            <p style={{ margin: '4px 0 0' }}>
                              Next: {report.immediateInspectionSteps?.[0] || 'Complete the recommended field checks.'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="ap-card-foot">
                    <span className="ap-help">
                      {entry.latestObservation
                        ? `Latest observation: ${entry.latestObservation.category} · ${describeFreshness(entry.latestObservation.recordedAt).label}`
                        : 'No field observation recorded for this crop'}
                    </span>
                    <Link className="ap-btn ap-btn--secondary ap-btn--sm" to="/disease">
                      Compare symptoms <ArrowRight size={12} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>

      <div className="ap-split">
        <SectionCard
          title="Field observations for this farm"
          description="What you recorded in the field, newest first."
          icon={<ClipboardList size={15} />}
          actions={<Link className="ap-btn ap-btn--ghost ap-btn--sm" to="/farm">Record a new observation</Link>}
        >
          {scope.zones.every((zone) => !zone.latestObservation) ? (
            <EmptyState
              icon={<ClipboardList size={19} />}
              title="No field observations recorded"
              description="Observations are the fastest way to build crop-health history before sensors are installed."
              action={<Link className="ap-btn ap-btn--primary" to="/farm">Record an observation</Link>}
            />
          ) : (
            <ul className="ap-list">
              {scope.zones
                .filter((zone) => zone.latestObservation)
                .sort((a, b) => new Date(b.latestObservation!.recordedAt).getTime() - new Date(a.latestObservation!.recordedAt).getTime())
                .map((zone) => {
                  const observation = zone.latestObservation!;
                  return (
                    <li key={observation.id} className="ap-list-item">
                      <span className={`ap-list-marker${observation.severity === 'Action Needed' ? ' ap-list-marker--danger' : observation.severity === 'Watch' ? ' ap-list-marker--warn' : ''}`} aria-hidden="true">
                        <Stethoscope size={14} />
                      </span>
                      <div className="ap-list-body">
                        <p className="ap-list-title">
                          {observation.category} · {observation.plotName || zone.plot.name}
                          <ProvenanceTag kind={observation.sourceLabel === 'Demo Sample Record' ? 'demo' : 'recorded'} />
                          <StatusBadge tone={observation.severity === 'Action Needed' ? 'danger' : observation.severity === 'Watch' ? 'warn' : 'ok'}>
                            {observation.severity}
                          </StatusBadge>
                        </p>
                        <div className="ap-list-meta">
                          <span>{formatTimestamp(observation.recordedAt)}</span>
                          {observation.cropName && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{observation.cropName}</span>
                            </>
                          )}
                        </div>
                        <p>{observation.symptoms || observation.leafColorNotes || observation.notes}</p>
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </SectionCard>

        <div className="ap-stack">
          <SectionCard title="Search the disease library" icon={<BookOpen size={15} />}>
            <label className="ap-field">
              <span className="ap-label">Search by crop, disease or scientific name</span>
              <input
                type="search"
                className="ap-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="e.g. tomato, blight, Xanthomonas"
              />
            </label>
            {query.trim().length >= 3 && (
              <div className="ap-stack ap-stack--tight" style={{ marginTop: 12 }}>
                {matchingLibrary.length === 0 ? (
                  <Notice tone="neutral">No library entry matches “{query}”. Try the disease name or the host crop.</Notice>
                ) : (
                  matchingLibrary.map((disease) => (
                    <Link key={disease.id} className="ap-list-item" to={`/disease/${disease.id}`} style={{ textDecoration: 'none' }}>
                      <span className="ap-list-marker" aria-hidden="true">
                        <Microscope size={14} />
                      </span>
                      <span className="ap-list-body">
                        <span className="ap-list-title">
                          {disease.disease}
                          <span className="ap-badge ap-badge--muted">{disease.crop}</span>
                        </span>
                        <span className="ap-list-meta">
                          <span>{disease.scientificName}</span>
                        </span>
                      </span>
                    </Link>
                  ))
                )}
              </div>
            )}
            <Notice tone="neutral" style={{ marginTop: 12 }}>
              Library entries are documented reference material with symptom, prevention and management sections. They are not a
              diagnosis for your field.
            </Notice>
          </SectionCard>

          <SectionCard
            title="Environment that favours disease"
            description="Weather values that influence leaf wetness and fungal development for this location."
            icon={<Thermometer size={15} />}
            actions={<StatusBadge tone="info">{weather.sourceType}</StatusBadge>}
          >
            <KeyValueList
              items={[
                { label: 'Humidity', value: `${weather.humidityPct}%` },
                { label: 'Rain probability', value: `${weather.rainProbabilityPct}%` },
                { label: 'Temperature', value: `${weather.tempC} °C (min ${weather.tempMinC} °C / max ${weather.tempMaxC} °C)` },
                { label: 'Wind', value: `${weather.windSpeedKmh} km/h ${weather.windDirection}` },
                { label: 'Source', value: `${weather.sourceProvider} · updated ${formatTimestamp(weather.updatedAt)}` },
              ]}
            />
            <Notice tone="neutral" style={{ marginTop: 12 }}>
              All of these values are <ProvenanceTag kind="forecast" /> data for {weather.locationLabel}, not measurements taken
              inside your canopy. Humidity above roughly 80% with rain expected is worth a scouting round, but it does not
              confirm any disease is present.
            </Notice>
            <div className="ap-row" style={{ marginTop: 10 }}>
              <Link className="ap-btn ap-btn--secondary ap-btn--sm" to="/weather">
                Open weather intelligence <ArrowRight size={12} />
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};
