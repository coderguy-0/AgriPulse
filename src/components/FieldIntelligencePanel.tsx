import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Droplets,
  Info,
  RefreshCw,
  Sparkles,
  Sprout,
} from 'lucide-react';
import { AgriPulseLoader } from './AgriPulseLoader';
import { useFarmScope } from '../hooks/useFarmScope';
import {
  EmptyState,
  Meter,
  Notice,
  ProvenanceTag,
  SectionCard,
  SegmentedControl,
  StatusBadge,
} from './ui/primitives';
import { TrendChart } from './ui/charts';
import { buildSensorSeries } from '../services/fieldIntelligence';
import { describeFreshness, formatTimestamp } from '../services/provenance';
import { InstalledSensorType } from '../types';

const WINDOWS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: 'all', label: 'All stored' },
] as const;

type WindowValue = (typeof WINDOWS)[number]['value'];

const LEVEL_TONE: Record<string, 'ok' | 'warn' | 'danger' | 'muted'> = {
  ok: 'ok',
  watch: 'warn',
  attention: 'danger',
  unknown: 'muted',
};

/**
 * Field-intelligence strip for the dashboard.
 *
 * Uses the same derived data as the monitoring, twin, irrigation, soil and alerts modules, so the
 * dashboard can never show a different number from the module it links to. Readings come only from
 * the API; when none exist the panel says so instead of printing a placeholder value.
 */
export const FieldIntelligencePanel: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const scope = useFarmScope();
  const [window, setWindow] = useState<WindowValue>('7');

  const readingsWithData = useMemo(
    () =>
      (['soil_moisture', 'soil_temperature', 'soil_ph', 'light'] as InstalledSensorType[])
        .map((sensor) => ({ sensor, points: buildSensorSeries(scope.readings, sensor) }))
        .filter((entry) => entry.points.length >= 2)
        .sort((a, b) => b.points.length - a.points.length),
    [scope.readings],
  );

  const [sensorChoice, setSensorChoice] = useState<InstalledSensorType | null>(null);
  const activeSeries = useMemo(() => {
    if (readingsWithData.length === 0) return null;
    const chosen = readingsWithData.find((entry) => entry.sensor === sensorChoice) || readingsWithData[0];
    const hours = window === 'all' ? undefined : Number(window) * 24;
    const cutoff = hours ? Date.now() - hours * 3600 * 1000 : null;
    const points = cutoff ? chosen.points.filter((point) => point.timestamp >= cutoff) : chosen.points;
    return { sensor: chosen.sensor, points };
  }, [readingsWithData, sensorChoice, window]);

  const zonesNeedingWater = scope.zones.filter(
    (zone) => zone.irrigation.action === 'irrigate_now' || zone.irrigation.action === 'irrigate_soon',
  );
  const criticalAlerts = scope.alerts.filter((alert) => alert.severity === 'critical' || alert.severity === 'warning');
  const topFindings = scope.stress.filter((finding) => finding.risk === 'elevated' || finding.risk === 'developing').slice(0, 2);

  return (
    <section className="ap-stack" aria-label="Field intelligence summary">
      <div className="ap-page-head" style={{ alignItems: 'center' }}>
        <div>
          <h2 className="ap-card-title" style={{ fontSize: 16 }}>
            <Sparkles size={16} /> Field intelligence
          </h2>
          <p className="ap-card-desc">
            Derived from your stored readings and field records for {scope.farmName}. Every value below carries its source.
          </p>
        </div>
        <div className="ap-page-actions">
          <button
            type="button"
            className="ap-btn ap-btn--secondary ap-btn--sm"
            onClick={() => void scope.refreshTelemetry()}
            disabled={scope.telemetryLoading}
          >
            {scope.telemetryLoading ? <AgriPulseLoader size="sm" /> : <RefreshCw size={13} />}
            {scope.telemetryLoading ? 'Checking…' : 'Refresh readings'}
          </button>
          <Link className="ap-btn ap-btn--primary ap-btn--sm" to="/monitoring">
            Live monitoring <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {scope.telemetryError && (
        <Notice tone="danger" title="Reading service unavailable.">
          {scope.telemetryError} The values below are the last ones returned by the API.
        </Notice>
      )}

      <div className="ap-grid ap-grid--two">
        <SectionCard
          title="Zone condition"
          description="Moisture evidence against the reference band for each zone's recorded crop stage."
          icon={<Droplets size={15} />}
          actions={<Link className="ap-btn ap-btn--ghost ap-btn--sm" to="/irrigation">Guidance</Link>}
        >
          {scope.zones.length === 0 ? (
            <EmptyState
              icon={<Sprout size={18} />}
              title="No field zones recorded yet"
              description="Add plots to this farm so readings and guidance can be organised by zone."
              action={<Link className="ap-btn ap-btn--primary ap-btn--sm" to="/farm">Add plots</Link>}
            />
          ) : (
            <div className="ap-stack ap-stack--tight">
              {scope.zones.slice(0, compact ? 3 : 5).map((zone) => {
                const moisture = zone.latestMoisture;
                return (
                  <div key={zone.plot.id} className="ap-list-item" style={{ padding: '10px 0' }}>
                    <span className={`ap-list-marker${zone.level === 'attention' ? ' ap-list-marker--danger' : zone.level === 'watch' ? ' ap-list-marker--warn' : zone.level === 'unknown' ? ' ap-list-marker--muted' : ''}`} aria-hidden="true">
                      <Droplets size={14} />
                    </span>
                    <div className="ap-list-body">
                      <p className="ap-list-title" style={{ fontSize: 12.5 }}>
                        {zone.plot.name}
                        <StatusBadge tone={LEVEL_TONE[zone.level]}>
                          {zone.level === 'ok' ? 'In band' : zone.level === 'watch' ? 'Watch' : zone.level === 'attention' ? 'Action' : 'No data'}
                        </StatusBadge>
                        <ProvenanceTag kind={moisture.provenance} />
                      </p>
                      <div style={{ marginTop: 7, maxWidth: 340 }}>
                        <Meter
                          value={moisture.value}
                          valueLabel={moisture.value === null ? undefined : `${moisture.value}%`}
                          state={
                            zone.irrigation.band === 'adequate'
                              ? 'ok'
                              : zone.irrigation.band === 'unknown'
                              ? 'neutral'
                              : zone.irrigation.band === 'very_dry' || zone.irrigation.band === 'saturated'
                              ? 'danger'
                              : 'warn'
                          }
                          label={zone.crop ? `${zone.crop.cropName} · ${zone.crop.growthStage}` : 'No crop record'}
                          caption={
                            moisture.value === null
                              ? moisture.note
                              : `${moisture.sourceLabel} · ${describeFreshness(moisture.capturedAt).label}`
                          }
                        />
                      </div>
                      <p className="ap-help" style={{ marginTop: 6 }}>{zone.irrigation.actionLabel}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <div className="ap-stack">
          <SectionCard
            title="Needs attention"
            description="Highest-severity items across readings, advisories, devices and pending work."
            icon={<AlertTriangle size={15} />}
            actions={<Link className="ap-btn ap-btn--ghost ap-btn--sm" to="/alerts">All alerts</Link>}
          >
            {criticalAlerts.length === 0 ? (
              <Notice tone="ok" title="Nothing critical right now.">
                No critical or warning-severity alert is open. AGRIPULSE raises one only when a record actually needs a decision.
              </Notice>
            ) : (
              <ul className="ap-list">
                {criticalAlerts.slice(0, compact ? 2 : 3).map((alert) => (
                  <li key={alert.id} className="ap-list-item" style={{ padding: '9px 0' }}>
                    <span className={`ap-list-marker${alert.severity === 'critical' ? ' ap-list-marker--danger' : ' ap-list-marker--warn'}`} aria-hidden="true">
                      <AlertTriangle size={13} />
                    </span>
                    <div className="ap-list-body">
                      <p className="ap-list-title" style={{ fontSize: 12 }}>
                        {alert.title}
                        <ProvenanceTag kind={alert.provenance} />
                      </p>
                      <p style={{ marginTop: 4 }}>{alert.nextStep}</p>
                      <div className="ap-list-meta">
                        <span>{formatTimestamp(alert.occurredAt)}</span>
                        <Link to={alert.actionRoute} style={{ fontWeight: 700 }}>{alert.actionLabel}</Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title="Screening highlights"
            description="Rule-based findings from the AI insights module."
            icon={<Sparkles size={15} />}
            actions={<Link className="ap-btn ap-btn--ghost ap-btn--sm" to="/insights">Open insights</Link>}
          >
            {topFindings.length === 0 ? (
              <Notice tone="neutral" title="No elevated or developing findings.">
                {scope.stress.some((finding) => finding.risk === 'insufficient_data')
                  ? 'Some zones cannot be screened yet because no moisture value exists for them.'
                  : 'Current readings are inside their reference bands.'}
              </Notice>
            ) : (
              <ul className="ap-list">
                {topFindings.map((finding) => (
                  <li key={finding.id} className="ap-list-item" style={{ padding: '9px 0' }}>
                    <span className={`ap-list-marker${finding.risk === 'elevated' ? ' ap-list-marker--danger' : ' ap-list-marker--warn'}`} aria-hidden="true">
                      <Info size={13} />
                    </span>
                    <div className="ap-list-body">
                      <p className="ap-list-title" style={{ fontSize: 12 }}>
                        {finding.name} · {finding.zoneName}
                        <StatusBadge tone={finding.risk === 'elevated' ? 'danger' : 'warn'}>
                          {finding.risk === 'elevated' ? 'Elevated risk' : 'Developing risk'}
                        </StatusBadge>
                      </p>
                      <p style={{ marginTop: 4 }}>{finding.suggestedAction}</p>
                      <div className="ap-list-meta">
                        <span>Confidence: {finding.confidence}</span>
                        <span aria-hidden="true">·</span>
                        <span>{finding.method}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      <SectionCard
        title="Reading trend"
        description="Plotted from stored sensor readings only. Gaps mean no reading arrived in that period."
        icon={<Activity size={15} />}
        actions={
          readingsWithData.length === 0 ? undefined : (
            <div className="ap-row">
              <SegmentedControl<WindowValue> ariaLabel="Trend window" value={window} onChange={setWindow} options={WINDOWS.map((item) => ({ value: item.value, label: item.label }))} />
              {readingsWithData.length > 1 && (
                <label className="ap-field">
                  <span className="sr-only">Sensor</span>
                  <select
                    className="ap-select"
                    style={{ minHeight: 34 }}
                    value={activeSeries?.sensor}
                    onChange={(event) => setSensorChoice(event.target.value as InstalledSensorType)}
                  >
                    {readingsWithData.map((entry) => (
                      <option key={entry.sensor} value={entry.sensor}>
                        {entry.sensor.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )
        }
      >
        {!activeSeries || activeSeries.points.length === 0 ? (
          <EmptyState
            icon={<Activity size={18} />}
            title="No stored readings to chart yet"
            description={
              zonesNeedingWater.length > 0
                ? 'Guidance below is based on the readings and observations on record. Pair a soil-moisture node to see live trends here.'
                : 'Once a paired node posts readings, its trend appears here automatically. Manual observations stay in the farm record.'
            }
            action={<Link className="ap-btn ap-btn--secondary ap-btn--sm" to="/devices">Review devices</Link>}
          />
        ) : (
          <>
            <TrendChart
              data={activeSeries.points.map((point) => ({ timestamp: point.timestamp, label: point.label, value: point.value }))}
              variant="area"
              height={230}
              yUnit={activeSeries.sensor === 'soil_moisture' ? '%' : activeSeries.sensor === 'soil_temperature' ? '°C' : undefined}
              series={[{ key: 'value', name: activeSeries.sensor.replace(/_/g, ' '), colour: activeSeries.sensor === 'soil_moisture' ? '#2f6f9f' : '#4c8b3c' }]}
            />
            <div className="ap-card-foot">
              <span className="ap-help">{activeSeries.points.length} stored readings in this window</span>
              <span className="ap-row" style={{ gap: 6 }}>
                <ProvenanceTag kind="measured" />
                <span className="ap-help">
                  Newest {formatTimestamp(activeSeries.points[activeSeries.points.length - 1]?.label ? new Date(activeSeries.points[activeSeries.points.length - 1].timestamp).toISOString() : undefined)}
                </span>
              </span>
            </div>
          </>
        )}
      </SectionCard>
    </section>
  );
};
