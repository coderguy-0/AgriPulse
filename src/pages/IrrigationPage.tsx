import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CloudRain,
  Droplets,
  Gauge,
  Info,
  ListChecks,
  Sprout,
  Waves,
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
  SegmentedControl,
  InfoTip,
} from '../components/ui/primitives';
import { useFarmScope } from '../hooks/useFarmScope';
import { useAgriPulse } from '../context/AgriPulseContext';
import { formatTimestamp, describeFreshness, formatMeasurement } from '../services/provenance';
import { IrrigationAssessment } from '../services/fieldIntelligence';

type Filter = 'needs_action' | 'all' | 'monitor';

const ACTION_TONE: Record<IrrigationAssessment['action'], { badge: 'danger' | 'warn' | 'ok' | 'info' | 'muted'; label: string }> = {
  irrigate_now: { badge: 'danger', label: 'Irrigate now' },
  irrigate_soon: { badge: 'warn', label: 'Irrigate soon' },
  hold: { badge: 'ok', label: 'Hold irrigation' },
  drain: { badge: 'danger', label: 'Drain and inspect' },
  monitor: { badge: 'info', label: 'Monitor' },
  collect_data: { badge: 'muted', label: 'Record a reading' },
};

export const IrrigationPage: React.FC = () => {
  const { weather, rainfallLogs, addRainfallLog } = useAgriPulse();
  const scope = useFarmScope();
  const [filter, setFilter] = useState<Filter>('all');
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [logAmount, setLogAmount] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [logError, setLogError] = useState<string | null>(null);
  const [logSaved, setLogSaved] = useState(false);

  const zones = useMemo(() => {
    if (filter === 'needs_action') return scope.zones.filter((zone) => zone.irrigation.action === 'irrigate_now' || zone.irrigation.action === 'irrigate_soon');
    if (filter === 'monitor') return scope.zones.filter((zone) => zone.irrigation.action === 'monitor' || zone.irrigation.action === 'drain');
    return scope.zones;
  }, [scope.zones, filter]);

  const counts = useMemo(
    () => ({
      irrigate: scope.zones.filter((zone) => zone.irrigation.action === 'irrigate_now' || zone.irrigation.action === 'irrigate_soon').length,
      hold: scope.zones.filter((zone) => zone.irrigation.action === 'hold').length,
      noData: scope.zones.filter((zone) => zone.irrigation.action === 'collect_data').length,
      drain: scope.zones.filter((zone) => zone.irrigation.action === 'drain' || zone.irrigation.action === 'monitor').length,
    }),
    [scope.zones],
  );

  const forecastRain = weather.daily?.slice(0, 3) ?? [];
  const recentRainLogs = useMemo(
    () => rainfallLogs.filter((log) => log.farmId === scope.farmId).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [rainfallLogs, scope.farmId],
  );

  const submitRainfall = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(logAmount);
    if (!logDate) {
      setLogError('Choose the date the rain fell.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 500) {
      setLogError('Enter the measured rainfall in millimetres (greater than 0, up to 500).');
      return;
    }
    setLogError(null);
    addRainfallLog({
      farmId: scope.farmId,
      date: logDate,
      amountMm: Number(amount.toFixed(1)),
      sourceType: 'Farmer Recorded',
      notes: logNotes.trim() || 'Recorded from the irrigation guidance module.',
    });
    setLogAmount('');
    setLogNotes('');
    setLogSaved(true);
    window.setTimeout(() => setLogSaved(false), 4000);
  };

  return (
    <div className="ap-page">
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-2"><Droplets size={12} /> Irrigation guidance</span>}
        title="Irrigation guidance"
        subtitle={
          <>
            Per-zone irrigation decisions for <strong>{scope.farmName}</strong>, derived from your stored soil-moisture
            readings, the recorded crop stage, expected rainfall and the rainfall you log yourself.
          </>
        }
        breadcrumbs={[{ label: 'Portal', to: '/home' }, { label: 'Field intelligence' }, { label: 'Irrigation' }]}
        actions={
          <>
            <Link className="ap-btn ap-btn--secondary" to="/weather">
              <CloudRain size={14} /> Weather intelligence
            </Link>
            <Link className="ap-btn ap-btn--primary" to="/monitoring">
              <Gauge size={14} /> Check readings
            </Link>
          </>
        }
      />

      <Notice tone="warn" title="Rule-based guidance, not an automated valve control.">
        AGRIPULSE does not switch pumps or valves and does not control hardware. Recommendations come from documented
        thresholds — the reference band for the recorded crop stage, your moisture value, and the rainfall forecast. The band
        is general agronomic guidance for mineral soils and is <strong>not calibrated</strong> to this field, so confirm field
        conditions before a full irrigation cycle. Irrigation timing also depends on canal turns, labour and power availability,
        which AGRIPULSE cannot see.
      </Notice>

      <div className="ap-grid ap-grid--metrics">
        <KpiTile label="Irrigation recommended" value={counts.irrigate} icon={<Droplets size={15} />} tone={counts.irrigate ? 'danger' : 'default'} footer={<span>Zones below the stage reference band</span>} />
        <KpiTile label="Hold irrigation" value={counts.hold} icon={<Waves size={15} />} tone="water" footer={<span>Moisture inside the reference band</span>} />
        <KpiTile label="Monitor / drain" value={counts.drain} icon={<AlertTriangle size={15} />} tone="amber" footer={<span>Above the band — check drainage and aeration</span>} />
        <KpiTile label="No reading yet" value={counts.noData} icon={<Info size={15} />} tone="neutral" footer={<span>AGRIPULSE will not guess an irrigation action without data</span>} />
      </div>

      <SectionCard
        title="Zone-by-zone recommendation"
        description="Each recommendation shows the evidence it used, so you can judge whether it fits your field."
        icon={<ListChecks size={15} />}
        actions={
          <SegmentedControl<Filter>
            ariaLabel="Filter recommendations"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'needs_action', label: `Needs action (${counts.irrigate + counts.drain})` },
              { value: 'all', label: `All zones (${scope.zones.length})` },
              { value: 'monitor', label: `Holding (${counts.hold})` },
            ]}
          />
        }
      >
        {scope.zones.length === 0 ? (
          <EmptyState
            icon={<Sprout size={19} />}
            title="No zones to advise on"
            description="Irrigation guidance needs at least one plot with a crop record. Add plots in Farm & records."
            action={<Link className="ap-btn ap-btn--primary" to="/farm">Add plots</Link>}
          />
        ) : zones.length === 0 ? (
          <EmptyState
            icon={<Info size={19} />}
            title="No zones in this filter"
            description="Switch to “All zones” to see every recommendation for this farm."
          />
        ) : (
          <div className="ap-stack">
            {zones.map((zone) => {
              const assessment = zone.irrigation;
              const tone = ACTION_TONE[assessment.action];
              const moisture = zone.latestMoisture.value !== null ? zone.latestMoisture : null;
              const recorded = zone.latestObservation?.soilMoisturePct;

              return (
                <article key={zone.plot.id} className="ap-card">
                  <div className="ap-card-head">
                    <div style={{ minWidth: 0 }}>
                      <h3 className="ap-card-title">
                        <Droplets size={15} />
                        <span>{zone.plot.name}</span>
                      </h3>
                      <p className="ap-card-desc">
                        {zone.crop ? `${zone.crop.cropName} · ${zone.crop.variety} · ${zone.crop.growthStage}` : 'No crop record for this zone'}
                      </p>
                    </div>
                    <div className="ap-card-actions">
                      <StatusBadge tone={tone.badge}>{assessment.actionLabel}</StatusBadge>
                      <StatusBadge tone={assessment.confidence === 'higher' ? 'ok' : assessment.confidence === 'moderate' ? 'info' : 'muted'}>
                        Confidence: {assessment.confidence}
                      </StatusBadge>
                    </div>
                  </div>

                  <div className="ap-split ap-split--even">
                    <div className="ap-stack">
                      <Meter
                        label={moisture ? `Sensor moisture · ${formatTimestamp(moisture.capturedAt)}` : 'Recorded moisture'}
                        value={moisture?.value ?? recorded ?? null}
                        valueLabel={moisture?.value !== undefined && moisture?.value !== null ? `${moisture.value}%` : recorded !== undefined ? `${recorded}%` : undefined}
                        state={assessment.band === 'adequate' ? 'ok' : assessment.band === 'unknown' ? 'neutral' : assessment.band === 'very_dry' || assessment.band === 'saturated' ? 'danger' : 'warn'}
                        caption={
                          moisture
                            ? `${moisture.sourceLabel} · ${describeFreshness(moisture.capturedAt).label}`
                            : recorded !== undefined
                            ? `Farmer-recorded observation · ${formatTimestamp(zone.latestObservation?.recordedAt)}`
                            : 'No sensor reading and no recorded observation for this zone'
                        }
                      />
                      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.68 }}>{assessment.rationale}</p>
                      <div className="ap-chip-row">
                        <span className="ap-chip">
                          <CalendarClock size={12} aria-hidden="true" />
                          Next 24 h rain: <strong>{weather.daily?.[0]?.expectedRainMm ?? '—'} mm</strong>
                          <ProvenanceTag kind="forecast" />
                        </span>
                        <span className="ap-chip">
                          <Waves size={12} aria-hidden="true" />
                          3-day logged rain: <strong>{recentRainLogs.slice(0, 3).reduce((total, log) => total + log.amountMm, 0).toFixed(1)} mm</strong>
                          <ProvenanceTag kind="recorded" />
                        </span>
                      </div>
                    </div>

                    <div className="ap-stack ap-stack--tight">
                      <h4 className="ap-kpi-label">Evidence used</h4>
                      <ul className="ap-list">
                        {assessment.inputs.map((datum) => (
                          <li key={datum.label} className="ap-list-item" style={{ padding: '8px 0' }}>
                            <div className="ap-list-body">
                              <p className="ap-list-title" style={{ fontSize: 12 }}>
                                {datum.label}
                                <ProvenanceTag kind={datum.provenance} />
                              </p>
                              <div className="ap-list-meta">
                                <span>{datum.value}</span>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <details>
                        <summary style={{ cursor: 'pointer', fontSize: 11, fontWeight: 700, color: 'var(--ap-text-muted)' }}>
                          Assumptions behind this recommendation
                        </summary>
                        <ul className="ap-list" style={{ marginTop: 6 }}>
                          {assessment.assumptions.map((assumption) => (
                            <li key={assumption} className="ap-list-item" style={{ padding: '7px 0', borderBottom: '0' }}>
                              <span className="ap-help">{assumption}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>

      <div className="ap-split">
        <SectionCard
          title="Rainfall log"
          description="Precipitation is never measured by an AGRIPULSE rainfall sensor — this build has none. Log what your own gauge or the weather provider reports."
          icon={<CloudRain size={15} />}
        >
          <form className="ap-stack" onSubmit={submitRainfall} noValidate>
            <div className="ap-grid ap-grid--two">
              <label className="ap-field">
                <span className="ap-label">Date</span>
                <input type="date" className="ap-input" value={logDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setLogDate(event.target.value)} required />
              </label>
              <label className="ap-field">
                <span className="ap-label">Measured rainfall (mm)</span>
                <input
                  type="number"
                  min="0.1"
                  max="500"
                  step="0.1"
                  className="ap-input"
                  value={logAmount}
                  aria-invalid={Boolean(logError)}
                  onChange={(event) => setLogAmount(event.target.value)}
                  placeholder="e.g. 12.5"
                  required
                />
              </label>
            </div>
            <label className="ap-field">
              <span className="ap-label">Notes (optional)</span>
              <textarea
                className="ap-textarea"
                value={logNotes}
                onChange={(event) => setLogNotes(event.target.value)}
                placeholder="Gauge make, location, or what the shower did to the field"
                style={{ minHeight: 72 }}
              />
            </label>
            {logError && <p className="ap-error-text" role="alert"><AlertTriangle size={13} aria-hidden="true" /> {logError}</p>}
            {logSaved && <Notice tone="ok">Rainfall recorded to your workspace. Guidance will use it on the next refresh.</Notice>}
            <div className="ap-row">
              <button type="submit" className="ap-btn ap-btn--primary">
                <CloudRain size={14} /> Save rainfall record
              </button>
              <span className="ap-help">Saved to this farm’s workspace, visible on every device you sign in from.</span>
            </div>
          </form>

          <div style={{ marginTop: 16 }}>
            <h4 className="ap-kpi-label" style={{ marginBottom: 8 }}>Recent records</h4>
            {recentRainLogs.length === 0 ? (
              <Notice tone="neutral">No rainfall has been logged for this farm yet.</Notice>
            ) : (
              <ul className="ap-list">
                {recentRainLogs.map((log) => (
                  <li key={log.id} className="ap-list-item">
                    <span className="ap-list-marker ap-list-marker--info" aria-hidden="true">
                      <CloudRain size={14} />
                    </span>
                    <div className="ap-list-body">
                      <p className="ap-list-title">
                        {log.amountMm} mm on {formatTimestamp(`${log.date}T06:00:00.000Z`, log.date)}
                        <ProvenanceTag kind="recorded" />
                      </p>
                      <div className="ap-list-meta">
                        <span>{log.sourceType}</span>
                        {log.notes && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{log.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SectionCard>

        <div className="ap-stack">
          <SectionCard
            title="Forecast rainfall outlook"
            icon={<CloudRain size={15} />}
            actions={<StatusBadge tone="info">{weather.sourceType}</StatusBadge>}
          >
            <KeyValueList
              items={[
                { label: 'Location', value: `${weather.locationLabel}, ${weather.district}` },
                { label: 'Source', value: weather.sourceProvider },
                { label: 'Updated', value: formatTimestamp(weather.updatedAt) },
                { label: 'Today’s probability', value: `${weather.rainProbabilityPct}%` },
              ]}
            />
            {forecastRain.length === 0 ? (
              <Notice tone="neutral" style={{ marginTop: 12 }}>
                The configured weather source did not return a daily forecast. AGRIPULSE does not invent rainfall values.
              </Notice>
            ) : (
              <ul className="ap-list" style={{ marginTop: 12 }}>
                {forecastRain.map((day) => (
                  <li key={day.date} className="ap-list-item">
                    <span className="ap-list-marker ap-list-marker--info" aria-hidden="true">
                      <CloudRain size={14} />
                    </span>
                    <div className="ap-list-body">
                      <p className="ap-list-title">
                        {day.dayLabel} · expected {formatMeasurement(day.expectedRainMm, 1, 'mm')}
                        <ProvenanceTag kind="forecast" />
                      </p>
                      <div className="ap-list-meta">
                        <span>{day.condition}</span>
                        <span aria-hidden="true">·</span>
                        <span>{day.rainProbPct}% probability</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {day.tempMinC}–{day.tempMaxC} °C
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Notice tone="neutral" style={{ marginTop: 12 }}>
              Forecast rainfall is not measured farm rainfall. Do not treat it as a replacement for a field rain gauge.{' '}
              <InfoTip label="Why the distinction matters">
                Irrigation decisions based on forecast-only rainfall can under- or over-water a field, because convective
                showers are highly local. Log what actually fell when you can.
              </InfoTip>
            </Notice>
          </SectionCard>

          <SectionCard title="How to use this page" icon={<Info size={15} />}>
            <ol className="ap-list">
              {[
                'Check the moisture evidence: a sensor reading or your own observation — never zero or a blank.',
                'Read the recommendation, then look at the forecast rain chip before starting a full cycle.',
                'For dry-zone alerts, confirm the sensor is not buried in a hollow or sitting on a bund.',
                'After irrigating, log the event as a field activity so the timeline stays accurate.',
                'Treat every recommendation as advice to verify, not an instruction to follow blindly.',
              ].map((step) => (
                <li key={step} className="ap-list-item" style={{ padding: '9px 0' }}>
                  <span className="ap-list-marker" aria-hidden="true">
                    <Droplets size={13} />
                  </span>
                  <span style={{ fontSize: 11.5, lineHeight: 1.6 }}>{step}</span>
                </li>
              ))}
            </ol>
            <div className="ap-row" style={{ marginTop: 10 }}>
              <Link className="ap-btn ap-btn--secondary ap-btn--sm" to="/home">
                Log an irrigation activity <ArrowRight size={12} />
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};
