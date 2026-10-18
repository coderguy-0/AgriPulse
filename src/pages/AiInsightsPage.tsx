import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Gauge,
  HelpCircle,
  Sparkles,
  TestTube2,
  TrendingUp,
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
  InfoTip,
  KeyValueList,
} from '../components/ui/primitives';
import { useFarmScope } from '../hooks/useFarmScope';
import { formatTimestamp } from '../services/provenance';
import { StressIndicator } from '../services/fieldIntelligence';

const RISK_TONE: Record<StressIndicator['risk'], { badge: 'default' | 'ok' | 'warn' | 'danger' | 'muted'; label: string }> = {
  elevated: { badge: 'danger', label: 'Elevated risk' },
  developing: { badge: 'warn', label: 'Developing risk' },
  low: { badge: 'ok', label: 'Low risk' },
  insufficient_data: { badge: 'muted', label: 'Not enough data' },
};

export const AiInsightsPage: React.FC = () => {
  const scope = useFarmScope();
  const [filter, setFilter] = useState<'all' | StressIndicator['risk']>('all');

  const indicators = useMemo(
    () => (filter === 'all' ? scope.stress : scope.stress.filter((indicator) => indicator.risk === filter)),
    [scope.stress, filter],
  );

  const counts = useMemo(
    () => ({
      elevated: scope.stress.filter((item) => item.risk === 'elevated').length,
      developing: scope.stress.filter((item) => item.risk === 'developing').length,
      low: scope.stress.filter((item) => item.risk === 'low').length,
      insufficient: scope.stress.filter((item) => item.risk === 'insufficient_data').length,
    }),
    [scope.stress],
  );

  const openReports = scope.cropHealth.reduce((total, entry) => total + entry.openReports.length, 0);

  return (
    <div className="ap-page">
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-2"><Sparkles size={12} /> AI insights</span>}
        title="AI insights & early crop-stress screening"
        subtitle={
          <>
            Rule-based screening of your own readings against published agronomic reference bands, plus the crop-health
            questions AGRIPULSE cannot answer without more measurements. Nothing here is a trained disease model, and no
            result is a diagnosis or a yield guarantee.
          </>
        }
        breadcrumbs={[{ label: 'Portal', to: '/home' }, { label: 'Field intelligence' }, { label: 'AI insights' }]}
        actions={
          <>
            <Link className="ap-btn ap-btn--secondary" to="/crop-health">
              <TestTube2 size={14} /> Crop health records
            </Link>
            <Link className="ap-btn ap-btn--primary" to="/assistant">
              <Bot size={14} /> Ask the assistant
            </Link>
          </>
        }
      />

      <Notice tone="info" title="What this module actually does.">
        AGRIPULSE compares stored sensor readings and farmer records against transparent, documented thresholds — a{' '}
        <strong>rule-based screening</strong>, not a machine-learning prediction. Every card states the data it used, the
        assumption it makes and its confidence. No AGRIPULSE model currently predicts disease outbreaks, pest pressure or
        final yield, and no hosted vision or language model is connected in this build.
      </Notice>

      <div className="ap-grid ap-grid--metrics">
        <KpiTile
          label="Elevated-risk findings"
          value={counts.elevated}
          icon={<AlertTriangle size={15} />}
          tone={counts.elevated > 0 ? 'danger' : 'default'}
          footer={<span>Zone-level conditions well outside the reference band</span>}
        />
        <KpiTile
          label="Developing risk"
          value={counts.developing}
          icon={<TrendingUp size={15} />}
          tone="amber"
          footer={<span>Conditions trending outside the band — worth a field check</span>}
        />
        <KpiTile
          label="Low-risk findings"
          value={counts.low}
          icon={<CheckCircle2 size={15} />}
          footer={<span>Values inside the reference band for the recorded stage</span>}
        />
        <KpiTile
          label="Cannot be screened"
          value={counts.insufficient}
          icon={<HelpCircle size={15} />}
          tone="neutral"
          footer={<span>Zones with no moisture value — add a reading to enable screening</span>}
        />
      </div>

      <SectionCard
        title="Crop-stress screening"
        description="One card per finding. Screening compares a single recorded moisture (or temperature) value with a stage-based general reference band."
        icon={<Sparkles size={15} />}
        actions={
          <SegmentedControl<'all' | StressIndicator['risk']>
            ariaLabel="Filter findings by risk"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: `All (${scope.stress.length})` },
              { value: 'elevated', label: `Elevated (${counts.elevated})` },
              { value: 'developing', label: `Developing (${counts.developing})` },
              { value: 'low', label: `Low (${counts.low})` },
              { value: 'insufficient_data', label: `Not screened (${counts.insufficient})` },
            ]}
          />
        }
      >
        {indicators.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={19} />}
            title={scope.zones.length === 0 ? 'No field zones to screen' : 'No findings for this filter'}
            description={
              scope.zones.length === 0
                ? 'Add plots and at least one moisture reading so screening has something to work with.'
                : 'Try another risk filter to see the remaining findings.'
            }
            action={scope.zones.length === 0 ? <Link className="ap-btn ap-btn--primary" to="/farm">Add plots</Link> : undefined}
          />
        ) : (
          <div className="ap-grid ap-grid--two">
            {indicators.map((indicator) => {
              const tone = RISK_TONE[indicator.risk];
              return (
                <article key={indicator.id} className="ap-card">
                  <div className="ap-card-head" style={{ marginBottom: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <h3 className="ap-card-title">
                        <Gauge size={15} />
                        <span>{indicator.name}</span>
                      </h3>
                      <p className="ap-card-desc">{indicator.zoneName}</p>
                    </div>
                    <StatusBadge tone={tone.badge}>{tone.label}</StatusBadge>
                  </div>

                  <div className="ap-stack ap-stack--tight">
                    <div>
                      <p className="ap-kpi-label" style={{ marginBottom: 4 }}>Observed</p>
                      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.65 }}>{indicator.observed}</p>
                    </div>
                    <div>
                      <p className="ap-kpi-label" style={{ marginBottom: 4 }}>Why it matters</p>
                      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.65 }}>{indicator.whyItMatters}</p>
                    </div>
                    <div>
                      <p className="ap-kpi-label" style={{ marginBottom: 4 }}>Suggested next step</p>
                      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.65, fontWeight: 600 }}>{indicator.suggestedAction}</p>
                    </div>
                  </div>

                  <div className="ap-card-foot" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                    <div className="ap-chip-row">
                      {indicator.dataUsed.map((datum) => (
                        <span key={datum.label} className="ap-chip">
                          {datum.label}: <strong>{datum.value}</strong>
                          <ProvenanceTag kind={datum.provenance} />
                        </span>
                      ))}
                    </div>
                    <details style={{ width: '100%' }}>
                      <summary style={{ cursor: 'pointer', fontSize: 11, fontWeight: 700, color: 'var(--ap-text-muted)' }}>
                        Assumptions, method and confidence
                      </summary>
                      <div className="ap-stack ap-stack--tight" style={{ marginTop: 8 }}>
                        <ul className="ap-list">
                          {indicator.assumptions.map((assumption) => (
                            <li key={assumption} className="ap-list-item" style={{ padding: '7px 0', borderBottom: '0' }}>
                              <span className="ap-help">{assumption}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="ap-row" style={{ gap: 10 }}>
                          <StatusBadge tone="outline">Method: {indicator.method}</StatusBadge>
                          <StatusBadge tone={indicator.confidence === 'higher' ? 'ok' : indicator.confidence === 'moderate' ? 'info' : 'muted'}>
                            Confidence: {indicator.confidence}
                          </StatusBadge>
                          <span className="ap-help">Generated {formatTimestamp(indicator.generatedAt)}</span>
                        </div>
                      </div>
                    </details>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>

      <div className="ap-split">
        <SectionCard
          title="Risk summary by zone"
          description="Derived zone status combining moisture band, observation severity and crop-record flags."
          icon={<TrendingUp size={15} />}
        >
          {scope.zones.length === 0 ? (
            <EmptyState icon={<Gauge size={19} />} title="No zones to summarise" description="Add plots to this farm first." />
          ) : (
            <div className="ap-table-wrap">
              <table className="ap-table">
                <caption>Values marked “—” mean no reading exists; they are not zero.</caption>
                <thead>
                  <tr>
                    <th scope="col">Zone</th>
                    <th scope="col">Crop & stage</th>
                    <th scope="col" className="is-numeric">Moisture</th>
                    <th scope="col">Assessment</th>
                    <th scope="col">Why</th>
                  </tr>
                </thead>
                <tbody>
                  {scope.zones.map((zone) => (
                    <tr key={zone.plot.id}>
                      <td>
                        <strong>{zone.plot.name}</strong>
                      </td>
                      <td className="is-muted">{zone.crop ? `${zone.crop.cropName} · ${zone.crop.growthStage}` : 'No crop record'}</td>
                      <td className="is-numeric">
                        {zone.latestMoisture.value === null ? '—' : `${zone.latestMoisture.value}%`}
                        <div>
                          <ProvenanceTag kind={zone.latestMoisture.provenance} />
                        </div>
                      </td>
                      <td>
                        <StatusBadge tone={zone.level === 'ok' ? 'ok' : zone.level === 'watch' ? 'warn' : zone.level === 'attention' ? 'danger' : 'muted'}>
                          {zone.level === 'ok' ? 'No action' : zone.level === 'watch' ? 'Watch' : zone.level === 'attention' ? 'Action' : 'No data'}
                        </StatusBadge>
                      </td>
                      <td className="is-muted">{zone.levelReason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <div className="ap-stack">
          <SectionCard title="What AGRIPULSE cannot tell you yet" icon={<HelpCircle size={15} />}>
            <ul className="ap-list">
              {[
                'No trained model currently predicts disease outbreaks, pest pressure or crop loss on this build.',
                'No disease is diagnosed from a photograph: the crop-health library is reference material, and any symptom analysis uses labelled demo logic unless a vision service is configured.',
                'Yield figures are never produced here — AGRIPULSE has no calibrated yield model or harvest data feed.',
                'No rainfall sensor exists. Precipitation comes from the weather provider (clearly labelled as forecast) or from your own rainfall logs.',
                'Guidance is not a substitute for a field visit, a soil lab test, or your local extension officer’s advice.',
              ].map((item) => (
                <li key={item} className="ap-list-item" style={{ padding: '9px 0' }}>
                  <span className="ap-list-marker ap-list-marker--muted" aria-hidden="true">
                    <HelpCircle size={13} />
                  </span>
                  <span style={{ fontSize: 11.5, lineHeight: 1.6 }}>{item}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Screening inputs available on this farm" icon={<Sparkles size={15} />}>
            <KeyValueList
              items={[
                { label: 'Stored sensor readings', value: `${scope.readings.length}` },
                { label: 'Field observations', value: `${scope.zones.reduce((total, zone) => total + zone.observationCount, 0)}` },
                { label: 'Open crop-health reports', value: `${openReports}` },
                { label: 'Open alerts', value: `${scope.alerts.length}` },
              ]}
            />
            <Notice tone="neutral">
              Weather advisories are labelled <ProvenanceTag kind="forecast" /> in every module. If no provider endpoint is
              configured, AGRIPULSE shows a clearly labelled sample forecast instead of pretending it is live weather.
              <InfoTip label="Weather provider status">
                Set <code>VITE_WEATHER_API_URL</code> to a server-side weather endpoint to replace the labelled sample forecast.
              </InfoTip>
            </Notice>
            <div className="ap-row" style={{ marginTop: 10 }}>
              <Link className="ap-btn ap-btn--secondary ap-btn--sm" to="/monitoring">
                Review raw readings <ArrowRight size={12} />
              </Link>
              <Link className="ap-btn ap-btn--ghost ap-btn--sm" to="/reports">
                Open reporting <ArrowRight size={12} />
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};
