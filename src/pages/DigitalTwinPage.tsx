import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Droplets,
  Info,
  Layers,
  Map as MapIcon,
  Ruler,
  Sprout,
  Thermometer,
  RadioTower,
  ShieldAlert,
} from 'lucide-react';
import {
  PageHeader,
  SectionCard,
  KpiTile,
  Notice,
  EmptyState,
  ProvenanceTag,
  StatusBadge,
  KeyValueList,
  Meter,
  InfoTip,
} from '../components/ui/primitives';
import { useFarmScope, sortZonesByAttention } from '../hooks/useFarmScope';
import { useAgriPulse } from '../context/AgriPulseContext';
import { SENSOR_LABELS } from '../services/fieldIntelligence';
import { formatMeasurement, formatTimestamp, describeFreshness } from '../services/provenance';
import { DEVICE_STATUS_META } from '../services/deviceService';

export const DigitalTwinPage: React.FC = () => {
  const { farms, setActiveFarmId, activeFarm } = useAgriPulse();
  const scope = useFarmScope();
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const orderedZones = useMemo(() => sortZonesByAttention(scope.zones), [scope.zones]);
  const selectedZone = useMemo(
    () => orderedZones.find((zone) => zone.plot.id === selectedZoneId) || orderedZones[0],
    [orderedZones, selectedZoneId],
  );

  const activeFarms = farms.filter((farm) => !farm.isArchived);

  const legend = [
    { state: 'ok', label: 'Within reference band / no open issue', className: 'ap-dot--ok' },
    { state: 'watch', label: 'Watch — reading outside band or observation flagged', className: 'ap-dot--warn' },
    { state: 'attention', label: 'Attention — action recommended', className: 'ap-dot--danger' },
    { state: 'unknown', label: 'No reading yet — not enough data', className: 'ap-dot--neutral' },
  ];

  const zoneAlerts = scope.alerts.filter((alert) => alert.plotName === selectedZone?.plot.name);

  return (
    <div className="ap-page">
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-2"><MapIcon size={12} /> Digital farm twin</span>}
        title="Digital farm twin"
        subtitle={
          <>
            A working schematic of <strong>{scope.farmName}</strong> built from your own plot records, device registry,
            stored sensor readings, observations and advisories. This is a data view of a real digital twin — not a live
            satellite or drone image, and not a satellite-grade map.
          </>
        }
        breadcrumbs={[{ label: 'Portal', to: '/home' }, { label: 'Farm' }, { label: 'Digital farm twin' }]}
        actions={
          <>
            {activeFarms.length > 1 && (
              <label className="ap-field" style={{ minWidth: 210 }}>
                <span className="ap-label" style={{ fontSize: 10 }}>Farm</span>
                <select
                  className="ap-select"
                  style={{ minHeight: 36 }}
                  value={activeFarm?.id || scope.farmId}
                  onChange={(event) => setActiveFarmId(event.target.value)}
                >
                  {activeFarms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Link className="ap-btn ap-btn--secondary" to="/farm">
              <Ruler size={14} /> Edit plots & records
            </Link>
          </>
        }
      />

      {scope.needsFarmSetup ? (
        <EmptyState
          icon={<MapIcon size={19} />}
          title="No farm to model yet"
          description="Create a farm record and add its plots. The twin draws itself from those records — no separate setup is needed."
          action={<Link className="ap-btn ap-btn--primary" to="/farm">Create a farm</Link>}
        />
      ) : (
        <>
          <div className="ap-grid ap-grid--metrics">
            <KpiTile label="Field zones" value={scope.overview.plots} icon={<Layers size={15} />} footer={<span>{scope.overview.totalArea} acre total recorded area</span>} />
            <KpiTile
              label="Zones with data"
              value={`${scope.overview.zonesWithData}/${scope.overview.zonesTotal}`}
              icon={<Droplets size={15} />}
              tone="water"
              footer={<span>{scope.overview.dataAvailabilityPct}% of zones have a moisture value</span>}
            />
            <KpiTile
              label="Active devices"
              value={scope.overview.activeDevices}
              icon={<RadioTower size={15} />}
              footer={<span>{scope.overview.onlineDevices} online · {scope.overview.pendingDevices} awaiting commissioning</span>}
            />
            <KpiTile
              label="Open alerts"
              value={scope.alerts.length}
              icon={<ShieldAlert size={15} />}
              tone={scope.alerts.some((alert) => alert.severity === 'critical') ? 'danger' : 'amber'}
              footer={<span>{scope.alerts.filter((alert) => alert.severity === 'critical').length} critical severity</span>}
            />
          </div>

          <SectionCard
            title="Zone schematic"
            description="Every tile is a recorded plot. Select a zone to inspect its measurements, devices and open alerts."
            icon={<MapIcon size={15} />}
            actions={
              <div className="ap-row" style={{ gap: 12 }}>
                {legend.map((item) => (
                  <span key={item.state} className="ap-row" style={{ gap: 6, fontSize: 10.5, color: 'var(--ap-text-muted)', fontWeight: 700 }}>
                    <span className={`ap-dot ${item.className}`} aria-hidden="true" />
                    {item.label}
                  </span>
                ))}
              </div>
            }
          >
            {orderedZones.length === 0 ? (
              <EmptyState
                icon={<Layers size={19} />}
                title="No plots recorded for this farm"
                description="Add plots in Farm & records so the twin can represent each zone separately."
                action={<Link className="ap-btn ap-btn--primary" to="/farm">Add a plot</Link>}
              />
            ) : (
              <div className="ap-twin-canvas">
                {/* A group of toggle buttons, not a list role: each tile must stay operable as a button
                    for keyboard and screen-reader users while exposing its pressed state. */}
                <div className="ap-twin-grid" role="group" aria-label="Field zones">
                  {orderedZones.map((zone) => {
                    const moisture = zone.latestMoisture.value !== null ? zone.latestMoisture : null;
                    const isSelected = selectedZone?.plot.id === zone.plot.id;
                    const openAlerts = scope.alerts.filter(
                      (alert) => alert.plotName === zone.plot.name && (alert.severity === 'critical' || alert.severity === 'warning'),
                    ).length;
                    return (
                      <button
                        key={zone.plot.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedZoneId(zone.plot.id)}
                        className="ap-twin-zone"
                      >
                        <span className="ap-row ap-row--between" style={{ gap: 8 }}>
                          <span className="ap-twin-zone-name">{zone.plot.name}</span>
                          <span
                            className={`ap-dot ${
                              zone.level === 'ok' ? 'ap-dot--ok' : zone.level === 'watch' ? 'ap-dot--warn' : zone.level === 'attention' ? 'ap-dot--danger' : 'ap-dot--neutral'
                            }`}
                            aria-hidden="true"
                          />
                        </span>
                        <span className="ap-twin-zone-crop">
                          {zone.crop ? `${zone.crop.cropName} · ${zone.crop.variety}` : 'No crop record'}
                        </span>
                        <span className="ap-row ap-row--between" style={{ gap: 6 }}>
                          <span className="ap-numeric" style={{ fontSize: 18, fontWeight: 800 }}>
                            {moisture ? `${moisture.value}%` : '—'}
                          </span>
                          <span className="ap-help">{zone.plot.area} {zone.plot.areaUnit}</span>
                        </span>
                        <span className="ap-twin-nodes">
                          {zone.devices.length === 0 && <span className="ap-twin-node">No device assigned</span>}
                          {zone.devices.map((device) => (
                            <span
                              key={device.id}
                              className={`ap-twin-node ${
                                device.status === 'online'
                                  ? 'is-online'
                                  : device.status === 'offline'
                                  ? 'is-offline'
                                  : device.status === 'attention_required'
                                  ? 'is-attention'
                                  : ''
                              }`}
                              title={`${device.name} · ${DEVICE_STATUS_META[device.status].label}`}
                            >
                              <RadioTower size={10} aria-hidden="true" />
                              {device.name}
                            </span>
                          ))}
                        </span>
                        {openAlerts > 0 && (
                          <span className="ap-badge ap-badge--warn" style={{ alignSelf: 'flex-start' }}>
                            {openAlerts} open alert{openAlerts === 1 ? '' : 's'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Zone data table"
            description="The same zone information as text, for screen readers, printing or review without the schematic."
            icon={<Layers size={15} />}
          >
            {orderedZones.length === 0 ? (
              <EmptyState icon={<Layers size={19} />} title="No zones recorded" description="Add plots to this farm to populate this table." />
            ) : (
              <div className="ap-table-wrap">
                <table className="ap-table">
                  <caption>Values shown as “—” mean no reading exists; they are not zero.</caption>
                  <thead>
                    <tr>
                      <th scope="col">Zone</th>
                      <th scope="col">Crop & stage</th>
                      <th scope="col">Area</th>
                      <th scope="col" className="is-numeric">Moisture</th>
                      <th scope="col">Source</th>
                      <th scope="col">Devices</th>
                      <th scope="col">Assessment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderedZones.map((zone) => (
                      <tr key={zone.plot.id}>
                        <td>
                          <button
                            type="button"
                            className="ap-btn ap-btn--ghost ap-btn--sm"
                            onClick={() => setSelectedZoneId(zone.plot.id)}
                          >
                            {zone.plot.name}
                          </button>
                        </td>
                        <td className="is-muted">{zone.crop ? `${zone.crop.cropName} · ${zone.crop.growthStage}` : 'No crop record'}</td>
                        <td className="is-muted">{zone.plot.area} {zone.plot.areaUnit}</td>
                        <td className="is-numeric">{zone.latestMoisture.value === null ? '—' : `${zone.latestMoisture.value}%`}</td>
                        <td>
                          <ProvenanceTag kind={zone.latestMoisture.provenance} />
                        </td>
                        <td className="is-muted">
                          {zone.devices.length === 0 ? 'None assigned' : zone.devices.map((device) => device.name).join(', ')}
                        </td>
                        <td>
                          <StatusBadge
                            tone={zone.level === 'ok' ? 'ok' : zone.level === 'watch' ? 'warn' : zone.level === 'attention' ? 'danger' : 'muted'}
                          >
                            {zone.level === 'ok' ? 'No action' : zone.level === 'watch' ? 'Watch' : zone.level === 'attention' ? 'Action' : 'No data'}
                          </StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {selectedZone && (
            <div className="ap-split">
              <SectionCard
                title={`${selectedZone.plot.name} detail`}
                description={selectedZone.levelReason}
                icon={<Sprout size={15} />}
                actions={
                  <>
                    <StatusBadge
                      tone={selectedZone.level === 'ok' ? 'ok' : selectedZone.level === 'watch' ? 'warn' : selectedZone.level === 'attention' ? 'danger' : 'muted'}
                    >
                      {selectedZone.level === 'ok' ? 'No action needed' : selectedZone.level === 'watch' ? 'Watch' : selectedZone.level === 'attention' ? 'Action recommended' : 'Waiting for data'}
                    </StatusBadge>
                    <Link className="ap-btn ap-btn--secondary ap-btn--sm" to="/irrigation">
                      Irrigation guidance <ArrowRight size={12} />
                    </Link>
                  </>
                }
              >
                <div className="ap-stack">
                  <KeyValueList
                    items={[
                      { label: 'Area', value: `${selectedZone.plot.area} ${selectedZone.plot.areaUnit}` },
                      { label: 'Soil type (recorded)', value: selectedZone.plot.soilType || 'Not recorded' },
                      { label: 'Irrigation method', value: selectedZone.plot.irrigationMethod || 'Not recorded' },
                      {
                        label: 'Crop',
                        value: selectedZone.crop ? `${selectedZone.crop.cropName} · ${selectedZone.crop.variety}` : 'No crop record',
                      },
                      { label: 'Growth stage', value: selectedZone.crop?.growthStage || 'Not recorded' },
                      {
                        label: 'Sowing → expected harvest',
                        value: selectedZone.crop ? `${formatTimestamp(selectedZone.crop.sowingDate, '—')} → ${formatTimestamp(selectedZone.crop.expectedHarvestDate, '—')}` : 'Not recorded',
                      },
                    ]}
                  />

                  <div className="ap-grid ap-grid--two">
                    <div className="ap-card ap-card--quiet">
                      <h3 className="ap-card-title" style={{ marginBottom: 10 }}>
                        <Droplets size={15} /> Soil moisture
                      </h3>
                      <Meter
                        value={selectedZone.irrigation.band === 'unknown' ? null : (selectedZone.latestMoisture.value ?? null)}
                        valueLabel={`${selectedZone.latestMoisture.value ?? '—'}%`}
                        state={
                          selectedZone.irrigation.band === 'adequate'
                            ? 'ok'
                            : selectedZone.irrigation.band === 'unknown'
                            ? 'neutral'
                            : selectedZone.irrigation.band === 'very_dry' || selectedZone.irrigation.band === 'saturated'
                            ? 'danger'
                            : 'warn'
                        }
                        label="Sensor / recorded value"
                        caption={
                          selectedZone.latestMoisture.value !== null
                            ? `${selectedZone.latestMoisture.sourceLabel} · ${describeFreshness(selectedZone.latestMoisture.capturedAt).label}`
                            : selectedZone.latestMoisture.note
                        }
                      />
                      {selectedZone.irrigation.referenceRange && (
                        <p className="ap-help" style={{ marginTop: 8 }}>
                          Stage reference band {selectedZone.irrigation.referenceRange.min}–{selectedZone.irrigation.referenceRange.max}% ·{' '}
                          <InfoTip label="Reference band">
                            Published agronomic guidance for mineral soils at this growth stage. It is not calibrated to this
                            field&apos;s texture or your sensor depth, so treat it as guidance rather than a measured threshold.
                          </InfoTip>
                        </p>
                      )}
                    </div>

                    <div className="ap-card ap-card--quiet">
                      <h3 className="ap-card-title" style={{ marginBottom: 10 }}>
                        <Thermometer size={15} /> Soil temperature
                      </h3>
                      <Meter
                        value={selectedZone.latestSoilTemperature.value}
                        min={0}
                        max={50}
                        valueLabel={selectedZone.latestSoilTemperature.value === null ? 'No reading' : `${selectedZone.latestSoilTemperature.value} °C`}
                        state={
                          selectedZone.latestSoilTemperature.value === null
                            ? 'neutral'
                            : selectedZone.latestSoilTemperature.value >= 32 || selectedZone.latestSoilTemperature.value <= 12
                            ? 'warn'
                            : 'ok'
                        }
                        label="Sensor value"
                        caption={
                          selectedZone.latestSoilTemperature.value !== null
                            ? `${selectedZone.latestSoilTemperature.sourceLabel} · ${describeFreshness(selectedZone.latestSoilTemperature.capturedAt).label}`
                            : 'No soil-temperature node is reporting for this zone'
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="ap-card-title" style={{ marginBottom: 10 }}>
                      <RadioTower size={15} /> Devices in this zone
                    </h3>
                    {selectedZone.devices.length === 0 ? (
                      <Notice tone="neutral" title="No device assigned.">
                        This zone has no sensor node record. AGRIPULSE can still use manual observations here.{' '}
                        <Link to="/devices" style={{ fontWeight: 700 }}>Open the device registry</Link> to assign one.
                      </Notice>
                    ) : (
                      <div className="ap-stack ap-stack--tight">
                        {selectedZone.devices.map((device) => (
                          <div key={device.id} className="ap-list-item">
                            <span className={`ap-list-marker${device.status === 'online' ? '' : device.status === 'offline' ? ' ap-list-marker--muted' : ' ap-list-marker--warn'}`} aria-hidden="true">
                              <RadioTower size={14} />
                            </span>
                            <div className="ap-list-body">
                              <p className="ap-list-title">
                                <Link to={`/devices/${device.id}`}>{device.name}</Link>
                                <StatusBadge
                                  tone={device.status === 'online' ? 'ok' : device.status === 'offline' ? 'muted' : 'info'}
                                  title={DEVICE_STATUS_META[device.status].description}
                                >
                                  {DEVICE_STATUS_META[device.status].label}
                                </StatusBadge>
                              </p>
                              <div className="ap-list-meta">
                                <span>{device.locationLabel}</span>
                                <span aria-hidden="true">·</span>
                                <span>Last heartbeat {device.lastSeenAt ? formatTimestamp(device.lastSeenAt) : 'never received'}</span>
                              </div>
                              <div className="ap-chip-row" style={{ marginTop: 6 }}>
                                {(device.installedSensors || []).map((sensor) => (
                                  <span key={sensor} className="ap-chip">{SENSOR_LABELS[sensor]?.label || sensor}</span>
                                ))}
                                {(device.installedSensors || []).length === 0 && <span className="ap-chip">No sensor types configured</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </SectionCard>

              <div className="ap-stack">
                <SectionCard title="Open alerts for this zone" icon={<ShieldAlert size={15} />} actions={<Link className="ap-btn ap-btn--ghost ap-btn--sm" to="/alerts">All alerts</Link>}>
                  {zoneAlerts.length === 0 ? (
                    <Notice tone="ok" title="Nothing needs attention here.">
                      No alert is open for {selectedZone.plot.name}. Alerts appear when readings, advisories or pending work need a decision.
                    </Notice>
                  ) : (
                    <ul className="ap-list">
                      {zoneAlerts.slice(0, 5).map((alert) => (
                        <li key={alert.id} className="ap-list-item">
                          <span className={`ap-list-marker${alert.severity === 'critical' ? ' ap-list-marker--danger' : alert.severity === 'warning' ? ' ap-list-marker--warn' : ' ap-list-marker--info'}`} aria-hidden="true">
                            <Info size={14} />
                          </span>
                          <div className="ap-list-body">
                            <p className="ap-list-title">
                              {alert.title}
                              <ProvenanceTag kind={alert.provenance} />
                            </p>
                            <div className="ap-list-meta">
                              <span>{formatTimestamp(alert.occurredAt)}</span>
                            </div>
                            <p>{alert.nextStep}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </SectionCard>

                <SectionCard title="Latest field observation" icon={<Sprout size={15} />}>
                  {selectedZone.latestObservation ? (
                    <div className="ap-stack ap-stack--tight">
                      <div className="ap-row ap-row--between">
                        <strong style={{ fontSize: 12.5 }}>{selectedZone.latestObservation.category}</strong>
                        <span className="ap-row" style={{ gap: 6 }}>
                          <ProvenanceTag kind={selectedZone.latestObservation.sourceLabel === 'Demo Sample Record' ? 'demo' : 'recorded'} />
                          <StatusBadge tone={selectedZone.latestObservation.severity === 'Action Needed' ? 'danger' : selectedZone.latestObservation.severity === 'Watch' ? 'warn' : 'ok'}>
                            {selectedZone.latestObservation.severity}
                          </StatusBadge>
                        </span>
                      </div>
                      <p className="ap-help">{formatTimestamp(selectedZone.latestObservation.recordedAt)}</p>
                      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.65 }}>
                        {selectedZone.latestObservation.symptoms || selectedZone.latestObservation.notes}
                      </p>
                      <div className="ap-row" style={{ gap: 14 }}>
                        <span className="ap-help">
                          Soil moisture (recorded):{' '}
                          <strong>{selectedZone.latestObservation.soilMoisturePct ?? '—'}{selectedZone.latestObservation.soilMoisturePct !== undefined ? '%' : ''}</strong>
                        </span>
                        <span className="ap-help">
                          Soil temp (recorded):{' '}
                          <strong>{formatMeasurement(selectedZone.latestObservation.soilTempC, selectedZone.latestObservation.soilTempC === undefined ? 0 : 1)}{selectedZone.latestObservation.soilTempC !== undefined ? ' °C' : ''}</strong>
                        </span>
                      </div>
                      <Link className="ap-btn ap-btn--secondary ap-btn--sm" to="/farm">Open full observation log</Link>
                    </div>
                  ) : (
                    <Notice tone="neutral" title="No observation recorded for this zone.">
                      Manual observations are the fastest way to add field context before hardware is installed.
                    </Notice>
                  )}
                </SectionCard>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
