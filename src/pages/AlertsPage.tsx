import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  CloudRain,
  Filter,
  Info,
  RadioTower,
  ShieldAlert,
  Sprout,
  Wrench,
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
  Accordion,
} from '../components/ui/primitives';
import { useFarmScope } from '../hooks/useFarmScope';
import { AlertItem, AlertSeverity } from '../services/fieldIntelligence';
import { formatTimestamp, describeFreshness } from '../services/provenance';
import { downloadCsv, timestampedFilename } from '../utils/exportData';
import { useAgriPulse } from '../context/AgriPulseContext';

const SEVERITY_META: Record<AlertSeverity, { label: string; tone: 'danger' | 'warn' | 'info' | 'ok'; icon: React.ReactNode }> = {
  critical: { label: 'Critical', tone: 'danger', icon: <ShieldAlert size={14} /> },
  warning: { label: 'Warning', tone: 'warn', icon: <AlertTriangle size={14} /> },
  advisory: { label: 'Advisory', tone: 'info', icon: <Info size={14} /> },
  info: { label: 'For information', tone: 'ok', icon: <CheckCircle2 size={14} /> },
};

const CATEGORY_ICON: Record<AlertItem['category'], React.ReactNode> = {
  'Soil moisture': <Sprout size={14} />,
  'Crop stress': <Sprout size={14} />,
  Weather: <CloudRain size={14} />,
  Device: <RadioTower size={14} />,
  'Field activity': <Wrench size={14} />,
  'Crop inspection': <ShieldAlert size={14} />,
};

export const AlertsPage: React.FC = () => {
  const { profile, updateProfile } = useAgriPulse();
  const scope = useFarmScope();
  const [severityFilter, setSeverityFilter] = useState<'all' | AlertSeverity>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | AlertItem['category']>('all');

  const categories = useMemo(
    () => Array.from(new Set(scope.alerts.map((alert) => alert.category))).sort(),
    [scope.alerts],
  );

  const filtered = useMemo(
    () =>
      scope.alerts.filter(
        (alert) => (severityFilter === 'all' || alert.severity === severityFilter) && (categoryFilter === 'all' || alert.category === categoryFilter),
      ),
    [scope.alerts, severityFilter, categoryFilter],
  );

  const counts = useMemo(
    () => ({
      critical: scope.alerts.filter((alert) => alert.severity === 'critical').length,
      warning: scope.alerts.filter((alert) => alert.severity === 'warning').length,
      advisory: scope.alerts.filter((alert) => alert.severity === 'advisory').length,
      info: scope.alerts.filter((alert) => alert.severity === 'info').length,
    }),
    [scope.alerts],
  );

  const preferences = profile.preferences.notifications;

  const togglePreference = (key: keyof typeof preferences) => {
    updateProfile({
      ...profile,
      preferences: {
        ...profile.preferences,
        notifications: { ...preferences, [key]: !preferences[key] },
      },
    });
  };

  return (
    <div className="ap-page">
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-2"><BellRing size={12} /> Alerts</span>}
        title="Alerts & notifications"
        subtitle={
          <>
            Everything AGRIPULSE currently flags for <strong>{scope.farmName}</strong>, with the evidence behind each item
            and a concrete next step.
          </>
        }
        breadcrumbs={[{ label: 'Portal', to: '/home' }, { label: 'Field intelligence' }, { label: 'Alerts' }]}
        actions={
          <>
            <button
              type="button"
              className="ap-btn ap-btn--secondary"
              onClick={() =>
                downloadCsv(
                  timestampedFilename('agripulse-alerts'),
                  [
                    { header: 'Severity', value: (alert: AlertItem) => alert.severity },
                    { header: 'Category', value: (alert) => alert.category },
                    { header: 'Title', value: (alert) => alert.title },
                    { header: 'Detail', value: (alert) => alert.detail },
                    { header: 'Field / device', value: (alert) => alert.plotName || alert.deviceName || '' },
                    { header: 'Occurred at', value: (alert) => alert.occurredAt },
                    { header: 'Data source', value: (alert) => alert.provenance },
                    { header: 'Suggested next step', value: (alert) => alert.nextStep },
                  ],
                  filtered,
                )
              }
              disabled={filtered.length === 0}
            >
              Export alert list
            </button>
            <Link className="ap-btn ap-btn--primary" to="/home">
              Back to dashboard
            </Link>
          </>
        }
      />

      <div className="ap-grid ap-grid--metrics">
        <KpiTile label="Critical" value={counts.critical} icon={<ShieldAlert size={15} />} tone={counts.critical ? 'danger' : 'default'} footer={<span>Conditions that can cost yield if ignored</span>} />
        <KpiTile label="Warnings" value={counts.warning} icon={<AlertTriangle size={15} />} tone="amber" footer={<span>Readings or tasks that need a decision soon</span>} />
        <KpiTile label="Advisories" value={counts.advisory} icon={<Info size={15} />} footer={<span>Context worth planning around</span>} />
        <KpiTile label="Information" value={counts.info} icon={<CheckCircle2 size={15} />} tone="neutral" footer={<span>Coverage gaps and commissioning reminders</span>} />
      </div>

      <SectionCard
        title="Open items"
        description="Alerts are recalculated from your stored records each time this page loads — nothing is kept artificially “active”."
        icon={<Filter size={15} />}
        actions={
          <div className="ap-row">
            <SegmentedControl<'all' | AlertSeverity>
              ariaLabel="Filter alerts by severity"
              value={severityFilter}
              onChange={setSeverityFilter}
              options={[
                { value: 'all', label: `All (${scope.alerts.length})` },
                { value: 'critical', label: 'Critical' },
                { value: 'warning', label: 'Warning' },
                { value: 'advisory', label: 'Advisory' },
                { value: 'info', label: 'Info' },
              ]}
            />
            <label className="ap-field" style={{ minWidth: 170 }}>
              <span className="ap-label" style={{ fontSize: 10 }}>Category</span>
              <select className="ap-select" style={{ minHeight: 34 }} value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as 'all' | AlertItem['category'])}>
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>
        }
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={19} />}
            title={scope.alerts.length === 0 ? 'No alerts right now' : 'No alerts match these filters'}
            description={
              scope.alerts.length === 0
                ? 'AGRIPULSE only raises an alert when an actual record — a reading, an advisory, a pending task or a commissioning gap — requires attention.'
                : 'Clear a filter to see the remaining items.'
            }
            action={
              scope.alerts.length === 0 ? (
                <Link className="ap-btn ap-btn--secondary" to="/monitoring">Review live readings</Link>
              ) : undefined
            }
          />
        ) : (
          <ul className="ap-list">
            {filtered.map((alert) => {
              const meta = SEVERITY_META[alert.severity];
              return (
                <li key={alert.id} className="ap-list-item">
                  <span
                    className={`ap-list-marker${
                      alert.severity === 'critical'
                        ? ' ap-list-marker--danger'
                        : alert.severity === 'warning'
                        ? ' ap-list-marker--warn'
                        : alert.severity === 'advisory'
                        ? ' ap-list-marker--info'
                        : ''
                    }`}
                    aria-hidden="true"
                  >
                    {CATEGORY_ICON[alert.category]}
                  </span>
                  <div className="ap-list-body">
                    <p className="ap-list-title">
                      {alert.title}
                      <StatusBadge tone={meta.tone} icon={meta.icon}>
                        {meta.label}
                      </StatusBadge>
                      <ProvenanceTag kind={alert.provenance} />
                    </p>
                    <div className="ap-list-meta">
                      <span>{alert.category}</span>
                      {alert.plotName && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{alert.plotName}</span>
                        </>
                      )}
                      {alert.deviceName && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{alert.deviceName}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>{formatTimestamp(alert.occurredAt)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{describeFreshness(alert.occurredAt).label}</span>
                    </div>
                    <p>{alert.detail}</p>
                    <p style={{ marginTop: 6 }}>
                      <strong style={{ color: 'var(--ap-text)' }}>Suggested next step: </strong>
                      {alert.nextStep}
                    </p>
                    <div className="ap-row ap-no-print" style={{ marginTop: 9, gap: 8 }}>
                      <Link className="ap-btn ap-btn--secondary ap-btn--sm" to={alert.actionRoute}>
                        {alert.actionLabel}
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <div className="ap-split">
        <SectionCard title="Notification preferences" icon={<BellRing size={15} />}>
          <p className="ap-card-desc" style={{ marginBottom: 12 }}>
            These switches control which advisory topics AGRIPULSE highlights for your account. Delivery by SMS, email or
            push notification is not configured in this build — items appear inside the portal only.
          </p>
          <div className="ap-stack ap-stack--tight">
            {(
              [
                { key: 'weatherAlerts', label: 'Weather alerts and advisories' },
                { key: 'irrigationReminders', label: 'Irrigation reminders from moisture guidance' },
                { key: 'cropInspectionAlerts', label: 'Crop inspection reminders' },
                { key: 'orderUpdates', label: 'Order and marketplace updates' },
                { key: 'schemeUpdates', label: 'Government scheme updates' },
              ] as const
            ).map((item) => (
              <label key={item.key} className="ap-row" style={{ gap: 10, padding: '9px 0', borderBottom: '1px solid var(--ap-border)' }}>
                <input
                  type="checkbox"
                  checked={preferences[item.key]}
                  onChange={() => togglePreference(item.key)}
                  style={{ width: 16, height: 16 }}
                />
                <span style={{ fontSize: 12, fontWeight: 600 }}>{item.label}</span>
                <span className="ap-badge ap-badge--muted" style={{ marginLeft: 'auto' }}>
                  {preferences[item.key] ? 'Enabled' : 'Muted'}
                </span>
              </label>
            ))}
          </div>
          <Notice tone="neutral" style={{ marginTop: 12 }}>
            Muting a topic hides it from your highlights but never hides a data-integrity issue such as an unhealthy device
            connection.
          </Notice>
        </SectionCard>

        <SectionCard title="How alerts are generated" icon={<Info size={15} />}>
          <div className="ap-stack ap-stack--tight">
            <Accordion question="Moisture and irrigation alerts" defaultOpen>
              Raised when a stored sensor reading or a recorded observation falls outside the reference band for the recorded
              crop stage. The alert shows the value, its source and the band it was compared against.
            </Accordion>
            <Accordion question="Device alerts">
              Raised from API-derived device state only: a missed heartbeat window marks a node offline, and unpaired records stay
              visible as commissioning reminders. The interface cannot mark a device online.
            </Accordion>
            <Accordion question="Weather advisories">
              Sourced from the configured weather provider and labelled as forecast. With no provider configured, live weather
              is unavailable; only demo users can explicitly choose a clearly labelled sample forecast.
            </Accordion>
            <Accordion question="Task and inspection reminders">
              Created from your own farm activities and saved symptom reports, including follow-ups when an observation has not
              been rechecked for a long period.
            </Accordion>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
