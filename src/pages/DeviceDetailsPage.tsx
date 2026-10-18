import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BatteryCharging,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Cpu,
  Edit3,
  ExternalLink,
  Info,
  MapPin,
  RadioTower,
  ShieldCheck,
  Signal,
  Trash2,
  Wifi,
  X,
} from 'lucide-react';
import { DeviceStatusBadge } from '../components/DeviceStatusBadge';
import { AgriPulseLoader } from '../components/AgriPulseLoader';
import { useAgriPulse } from '../context/AgriPulseContext';
import { DeviceEvent, DeviceMetadataPatch, InstalledSensorType, IoTDevice, TelemetryReading } from '../types';
import { DEVICE_STATUS_META, SENSOR_OPTIONS, maskDeviceIdentifier } from '../services/deviceService';
import { PairingSessionResponse, deviceApi } from '../services/apiClient';

const sensorName = (sensor: InstalledSensorType) => SENSOR_OPTIONS.find((item) => item.value === sensor)?.label || sensor;
const formatDate = (value?: string) => {
  if (!value) return 'Not specified';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date);
};
const formatTimestamp = (value?: string) => {
  if (!value) return 'No authenticated heartbeat received';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Timestamp unavailable' : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};
const humanize = (value?: string) => value ? value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Not specified';

export const DeviceDetailsPage: React.FC = () => {
  const { deviceId = '' } = useParams();
  const navigate = useNavigate();
  const { session, farms, plots, devices, deviceApiError, updateDeviceMetadata, assignDeviceGateway, retireDevice, refreshDevices } = useAgriPulse();
  const device = devices.find((item) => item.id === deviceId);
  const farm = farms.find((item) => item.id === device?.farmId);
  const plot = plots.find((item) => item.id === device?.plotId);
  const gateway = devices.find((item) => item.id === device?.gatewayId);
  const linkedNodes = devices.filter((item) => item.gatewayId === device?.id && item.status !== 'retired');
  const [isEditing, setIsEditing] = useState(false);
  const [showCommissioning, setShowCommissioning] = useState(false);
  const [apiEvents, setApiEvents] = useState<DeviceEvent[]>([]);
  const [apiReadings, setApiReadings] = useState<TelemetryReading[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailApiError, setDetailApiError] = useState<string | null>(null);
  const [pairingSession, setPairingSession] = useState<PairingSessionResponse['pairingSession'] | null>(null);
  const [pairingBusy, setPairingBusy] = useState(false);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [pairingCopied, setPairingCopied] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editDraft, setEditDraft] = useState({ name: '', locationLabel: '', latitude: '', longitude: '', installedAt: '', notes: '' });

  useEffect(() => {
    if (!device) return;
    setEditDraft({
      name: device.name,
      locationLabel: device.locationLabel,
      latitude: device.latitude === undefined ? '' : String(device.latitude),
      longitude: device.longitude === undefined ? '' : String(device.longitude),
      installedAt: device.installedAt || '',
      notes: device.notes || '',
    });
  }, [device?.id, device?.name, device?.locationLabel, device?.latitude, device?.longitude, device?.installedAt, device?.notes]);

  useEffect(() => {
    if (!session || !deviceId) return;
    let active = true;
    setDetailsLoading(true);
    Promise.all([deviceApi.events(deviceId), deviceApi.telemetry(deviceId, 100)])
      .then(([eventResponse, telemetryResponse]) => {
        if (!active) return;
        setApiEvents(eventResponse.events);
        setApiReadings(telemetryResponse.readings);
        setDetailApiError(null);
      })
      .catch((error) => {
        if (active) setDetailApiError(error instanceof Error ? error.message : 'Could not load device history.');
      })
      .finally(() => { if (active) setDetailsLoading(false); });
    return () => { active = false; };
  }, [session?.userId, session?.portalType, deviceId]);

  const readings = useMemo(() => apiReadings
    .filter((reading) => reading.deviceId === deviceId)
    .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime()), [apiReadings, deviceId]);
  const events = useMemo(() => apiEvents
    .filter((event) => event.deviceId === deviceId)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()), [apiEvents, deviceId]);

  if (!device) {
    return (
      <div className="device-not-found">
        <span className="devices-empty-icon"><RadioTower size={25} /></span>
        <h2>Device record not found</h2>
        <p>This device may have been removed or may not belong to your authenticated workspace.</p>
        <Link to="/devices" className="device-primary-button"><ArrowLeft size={16} /> Return to device registry</Link>
      </div>
    );
  }

  const saveMetadata = async () => {
    const errors: Record<string, string> = {};
    if (editDraft.name.trim().length < 3) errors.name = 'Device name must be at least 3 characters.';
    if (!editDraft.locationLabel.trim()) errors.locationLabel = 'Add a clear installation location.';
    const hasLat = Boolean(editDraft.latitude.trim());
    const hasLon = Boolean(editDraft.longitude.trim());
    const latitude = hasLat ? Number(editDraft.latitude) : undefined;
    const longitude = hasLon ? Number(editDraft.longitude) : undefined;
    if (hasLat !== hasLon) errors.coordinates = 'Enter both coordinates or leave both blank.';
    else if (hasLat && hasLon && (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude! < -90 || latitude! > 90 || longitude! < -180 || longitude! > 180)) {
      errors.coordinates = 'Latitude must be −90 to 90 and longitude −180 to 180.';
    }
    setEditErrors(errors);
    if (Object.keys(errors).length) return;
    const patch: DeviceMetadataPatch = {
      name: editDraft.name.trim(),
      locationLabel: editDraft.locationLabel.trim(),
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      installedAt: editDraft.installedAt || null,
      notes: editDraft.notes.trim() || null,
    };
    try {
      await updateDeviceMetadata(device.id, patch);
      setDetailApiError(null);
      setIsEditing(false);
    } catch (error) {
      setDetailApiError(error instanceof Error ? error.message : 'Device details could not be saved.');
    }
  };

  const handleRetire = async () => {
    if (!window.confirm(`Retire “${device.name}”? Its history will be retained and the device cannot be commissioned again without a new record.`)) return;
    try {
      await retireDevice(device.id);
      navigate('/devices');
    } catch (error) {
      setDetailApiError(error instanceof Error ? error.message : 'This device could not be retired.');
    }
  };

  const startCommissioning = async () => {
    setShowCommissioning(true);
    setPairingSession(null);
    setPairingError(null);
    setPairingCopied(false);
    setPairingBusy(true);
    try {
      const response = await deviceApi.createPairingSession(device.id);
      setPairingSession(response.pairingSession);
      await refreshDevices();
      const eventResponse = await deviceApi.events(device.id);
      setApiEvents(eventResponse.events);
    } catch (error) {
      setPairingError(error instanceof Error ? error.message : 'A pairing session could not be created.');
    } finally {
      setPairingBusy(false);
    }
  };

  const copyPairingCode = async () => {
    if (!pairingSession?.pairingToken || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(pairingSession.pairingToken);
      setPairingCopied(true);
    } catch {
      setPairingError('Clipboard access was denied. You can select and copy the code manually.');
    }
  };

  const closeCommissioning = () => {
    setShowCommissioning(false);
    setPairingSession(null);
    setPairingError(null);
    setPairingCopied(false);
  };

  const isGateway = device.type === 'lora_gateway';
  const deviceIcon = isGateway ? RadioTower : Cpu;
  const DeviceIcon = deviceIcon;
  const statusDescription = DEVICE_STATUS_META[device.status].description;
  const gatewayOptions = devices.filter((item) => item.type === 'lora_gateway' && item.farmId === device.farmId && item.status !== 'retired');

  return (
    <div className="device-details-page">
      <Link to="/devices" className="device-back-link"><ArrowLeft size={15} /> Devices & IoT <span>/</span> Device details</Link>

      <section className="device-detail-hero">
        <div className="device-detail-heading">
          <span className={`device-record-icon device-record-icon--large ${isGateway ? 'is-gateway' : ''}`}><DeviceIcon size={25} /></span>
          <div className="device-detail-title-wrap">
            <div className="device-detail-overline"><span>{isGateway ? 'LoRa gateway' : 'Sensor node'}</span><span className="device-demo-pill">{device.isDemoRecord ? 'Demo record' : 'Account record'}</span></div>
            <h2>{device.name}</h2>
            <p>{farm?.name || 'Farm unavailable'}{plot ? ` · ${plot.name}` : ''}</p>
          </div>
        </div>
        <div className="device-detail-actions">
          <DeviceStatusBadge status={device.status} />
          {device.status !== 'retired' && <button type="button" className="device-secondary-button" onClick={() => setIsEditing((value) => !value)}><Edit3 size={15} /> {isEditing ? 'Cancel edit' : 'Edit details'}</button>}
          {device.status !== 'retired' && <button type="button" className="device-danger-button" onClick={handleRetire}><Trash2 size={15} /> Retire</button>}
        </div>
      </section>

      <div className="devices-demo-notice" role="note">
        <span className="devices-notice-icon"><Info size={18} /></span>
        <div><strong>{device.isDemoRecord ? 'Development demo record · API-backed metadata' : 'Authenticated server device record'}</strong><p>{statusDescription} This record is not proof that physical hardware is connected. The server derives online status from trusted pairing and heartbeat events; forecasts and manual observations are not physical telemetry.</p>{(detailApiError || deviceApiError) && <p role="alert" className="mt-2 font-semibold">{detailApiError || deviceApiError}</p>}</div>
      </div>

      {isEditing && (
        <section className="device-edit-panel">
          <div className="device-panel-heading"><div><span className="device-eyebrow">Descriptive metadata</span><h3>Edit device details</h3></div><button type="button" className="device-icon-button" onClick={() => setIsEditing(false)} aria-label="Close edit panel"><X size={18} /></button></div>
          <div className="device-edit-grid">
            <label className="device-form-field"><span>Device name <b>*</b></span><input className="device-input" value={editDraft.name} onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })} />{editErrors.name && <small className="device-field-error-text">{editErrors.name}</small>}</label>
            <label className="device-form-field"><span>Installation location <b>*</b></span><input className="device-input" value={editDraft.locationLabel} onChange={(event) => setEditDraft({ ...editDraft, locationLabel: event.target.value })} />{editErrors.locationLabel && <small className="device-field-error-text">{editErrors.locationLabel}</small>}</label>
            <label className="device-form-field"><span>Latitude</span><input className="device-input" inputMode="decimal" value={editDraft.latitude} onChange={(event) => setEditDraft({ ...editDraft, latitude: event.target.value })} placeholder="−90 to 90" /></label>
            <label className="device-form-field"><span>Longitude</span><input className="device-input" inputMode="decimal" value={editDraft.longitude} onChange={(event) => setEditDraft({ ...editDraft, longitude: event.target.value })} placeholder="−180 to 180" /></label>
            {editErrors.coordinates && <p className="device-field-error-text device-edit-error">{editErrors.coordinates}</p>}
            <label className="device-form-field"><span>Installation date</span><input className="device-input" type="date" value={editDraft.installedAt} onChange={(event) => setEditDraft({ ...editDraft, installedAt: event.target.value })} /></label>
            <label className="device-form-field device-edit-notes"><span>Installation notes <small>Do not store passwords or secrets</small></span><textarea className="device-input device-textarea" rows={2} value={editDraft.notes} onChange={(event) => setEditDraft({ ...editDraft, notes: event.target.value })} /></label>
          </div>
          <div className="device-edit-footer"><button type="button" className="device-secondary-button" onClick={() => setIsEditing(false)}>Cancel</button><button type="button" className="device-primary-button" onClick={saveMetadata}>Save changes <CheckCircle2 size={15} /></button></div>
        </section>
      )}

      <div className="device-detail-grid">
        <div className="device-detail-main-column">
          <section className="device-detail-panel">
            <div className="device-panel-heading"><div><span className="device-eyebrow">Device configuration</span><h3>Identity & installation</h3></div><span className="device-panel-icon"><MapPin size={18} /></span></div>
            <div className="device-config-grid">
              <div className="device-config-item"><span>AGRIPULSE record ID</span><strong className="device-id-raw">{device.id}</strong></div>
              <div className="device-config-item"><span>Device identifier</span><strong>{maskDeviceIdentifier(device.serialNumber)}</strong></div>
              <div className="device-config-item"><span>Farm</span><strong>{farm?.name || 'Farm unavailable'}</strong></div>
              <div className="device-config-item"><span>Plot / zone</span><strong>{plot?.name || 'No plot assigned'}</strong></div>
              <div className="device-config-item"><span>Installation location</span><strong>{device.locationLabel}</strong></div>
              <div className="device-config-item"><span>Area details</span><strong>{[device.locality, device.district, device.state].filter(Boolean).join(', ') || 'Not provided'}</strong></div>
              <div className="device-config-item"><span>Coordinates</span><strong>{device.latitude !== undefined && device.longitude !== undefined ? `${device.latitude.toFixed(5)}, ${device.longitude.toFixed(5)}` : 'Not provided'}</strong></div>
              <div className="device-config-item"><span>Installed date</span><strong>{formatDate(device.installedAt)}</strong></div>
              <div className="device-config-item"><span>Created</span><strong>{formatDate(device.createdAt)}</strong></div>
              <div className="device-config-item"><span>Updated</span><strong>{formatDate(device.updatedAt)}</strong></div>
              {device.notes && <div className="device-config-item device-span-2"><span>Installation notes</span><strong>{device.notes}</strong></div>}
            </div>
          </section>

          <section className="device-detail-panel">
            <div className="device-panel-heading"><div><span className="device-eyebrow">Data provenance</span><h3>Telemetry & heartbeat</h3></div><span className="device-panel-icon"><Signal size={18} /></span></div>
            {detailsLoading ? (
              <p role="status" className="device-empty-events"><AgriPulseLoader size="sm" /> Loading authenticated device history…</p>
            ) : readings.length ? (
              <div className="device-reading-list">
                {readings.slice(0, 8).map((reading) => <div key={reading.id} className="device-reading-row"><div><strong>{sensorName(reading.sensorType)}</strong><small>{formatTimestamp(reading.measuredAt)} · {reading.source === 'demo' ? 'Demo reading' : 'Physical sensor'}</small></div><span>{reading.value} {reading.unit}</span></div>)}
              </div>
            ) : (
              <div className="device-no-telemetry"><span className="device-telemetry-empty-icon"><Signal size={21} /></span><div><strong>No telemetry received yet</strong><p>No heartbeat or sensor reading has been received for this device. Values are not shown as zero because nothing has been measured.</p></div></div>
            )}
            <div className="device-heartbeat-row"><span><Clock3 size={15} /> Last authenticated heartbeat</span><strong>{formatTimestamp(device.lastSeenAt)}</strong></div>
            <div className="device-source-note"><Info size={15} /> Weather-provider estimates and farmer-entered observations are separate from physical sensor telemetry.</div>
          </section>

          <section className="device-detail-panel">
            <div className="device-panel-heading"><div><span className="device-eyebrow">Audit trail</span><h3>Device events</h3></div><span className="device-event-count">{events.length}</span></div>
            {detailsLoading ? <p role="status" className="device-empty-events"><AgriPulseLoader size="sm" /> Loading device audit events…</p> : events.length ? (
              <ol className="device-event-list">
                {events.map((event) => <li key={event.id} className="device-event-item"><span className="device-event-marker" /><div><div className="device-event-heading"><strong>{event.title}</strong><span className={`device-event-source ${event.source === 'demo' ? 'is-demo' : ''}`}>{event.source === 'demo' ? 'Demo' : 'Backend'}</span></div><p>{event.description}</p><time dateTime={event.occurredAt}>{formatTimestamp(event.occurredAt)}</time></div></li>)}
              </ol>
            ) : <p className="device-empty-events">No device events are available yet.</p>}
          </section>
        </div>

        <aside className="device-detail-side-column">
          <section className="device-status-panel">
            <div className="device-panel-heading"><div><span className="device-eyebrow">Current status</span><h3>Connection state</h3></div></div>
            <DeviceStatusBadge status={device.status} />
            <p>{statusDescription}</p>
            <div className="device-status-last-seen"><Clock3 size={15} /><span>Last seen<strong>{formatTimestamp(device.lastSeenAt)}</strong></span></div>
            <button type="button" className="device-primary-button device-full-button" onClick={startCommissioning} disabled={device.status === 'retired' || device.status === 'pending_gateway_assignment' || pairingBusy}>Pairing & commissioning <ArrowRight size={16} /></button>
            <button type="button" className="device-secondary-button device-full-button" disabled title="Automated connection diagnostics are not implemented yet."><Signal size={15} /> Run connection check <small>Planned</small></button>
          </section>

          {device.type === 'sensor_node' ? (
            <section className="device-detail-panel">
              <div className="device-panel-heading"><div><span className="device-eyebrow">Sensor node</span><h3>Installed hardware</h3></div><span className="device-panel-icon"><Cpu size={18} /></span></div>
              <div className="device-config-stacked">
                <div><span>Sensors</span><strong>{device.installedSensors?.length ? device.installedSensors.map(sensorName).join(', ') : 'Not specified'}</strong></div>
                <div><span>Power source</span><strong><BatteryCharging size={14} /> {humanize(device.powerSource)}</strong></div>
                <div><span>Gateway</span>{device.status !== 'retired' ? <select className="device-input" value={device.gatewayId || ''} onChange={async (event) => { const assigned = await assignDeviceGateway(device.id, event.target.value || undefined); setDetailApiError(assigned ? null : 'Gateway assignment was rejected. Check that the gateway belongs to this farm.'); }}><option value="">Unassigned</option>{gatewayOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select> : <strong>{gateway?.name || 'No gateway'}</strong>}</div>
                <div><span>Communication profile</span><strong>{device.communicationProfile || 'Set during commissioning'}</strong></div>
                <div><span>Sampling interval</span><strong>{device.samplingIntervalMinutes ? `Planned · ${device.samplingIntervalMinutes} minutes` : 'Set during commissioning'}</strong></div>
                <div><span>Calibration</span><strong>{humanize(device.calibrationStatus)}</strong></div>
                {device.calibrationDate && <div><span>Calibration date</span><strong>{formatDate(device.calibrationDate)}</strong></div>}
                {device.calibrationNotes && <div><span>Calibration notes</span><strong>{device.calibrationNotes}</strong></div>}
              </div>
              {device.status === 'pending_gateway_assignment' && <div className="device-inline-warning"><AlertTriangle size={15} /> Assign a same-farm gateway before commissioning this node.</div>}
            </section>
          ) : (
            <section className="device-detail-panel">
              <div className="device-panel-heading"><div><span className="device-eyebrow">LoRa gateway</span><h3>Gateway configuration</h3></div><span className="device-panel-icon"><RadioTower size={18} /></span></div>
              <div className="device-config-stacked">
                <div><span>Backhaul</span><strong><Wifi size={14} /> {humanize(device.backhaulType)}</strong></div>
                <div><span>Power source</span><strong><BatteryCharging size={14} /> {humanize(device.powerSource)}</strong></div>
                <div><span>Radio profile</span><strong>{device.communicationProfile || 'Read from gateway at commissioning'}</strong></div>
                <div><span>Linked sensor nodes</span><strong>{linkedNodes.length} registered</strong></div>
                {device.coverageNotes && <div><span>Coverage / mounting notes</span><strong>{device.coverageNotes}</strong></div>}
              </div>
              <div className="device-linked-nodes">
                {linkedNodes.length ? linkedNodes.map((node) => <Link key={node.id} to={`/devices/${node.id}`}><Cpu size={15} /><span>{node.name}<small>{DEVICE_STATUS_META[node.status].label}</small></span><ArrowRight size={14} /></Link>) : <p>No sensor nodes assigned yet.</p>}
              </div>
            </section>
          )}

          <section className="device-security-card"><span><ShieldCheck size={17} /></span><div><strong>Credential safety</strong><p>This interface never collects Wi-Fi passwords, SIM PINs, or private keys. A short-lived pairing code is shown only for commissioning; it does not mark the device online.</p><a href="https://github.com/coderguy-0/AgriPulse" target="_blank" rel="noreferrer">Project repository <ExternalLink size={12} /></a></div></section>
        </aside>
      </div>

      {showCommissioning && (
        <div className="device-wizard-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeCommissioning()}>
          <section className="commissioning-modal" role="dialog" aria-modal="true" aria-labelledby="commissioning-title">
            <div className="device-panel-heading"><div><span className="device-eyebrow">Authenticated hardware onboarding</span><h3 id="commissioning-title">Pairing & commissioning</h3></div><button type="button" className="device-icon-button" onClick={closeCommissioning} aria-label="Close commissioning guidance"><X size={18} /></button></div>
            {pairingBusy && <div className="commissioning-alert" role="status"><AgriPulseLoader size="sm" /><p><strong>Requesting a secure pairing code…</strong> The server validates the device and creates a short-lived commissioning session.</p></div>}
            {pairingError && <div className="commissioning-alert" role="alert"><AlertTriangle size={17} /><p><strong>Pairing code not issued.</strong> {pairingError} Device status remains server-derived.</p></div>}
            {pairingSession && (
              <div className="commissioning-token-panel">
                <p><strong>One-time pairing code</strong><small>Provide this only to the authorized commissioning operator. It is held in this page’s memory and disappears when this dialog closes.</small></p>
                <code>{pairingSession.pairingToken}</code>
                <button type="button" className="device-secondary-button" onClick={copyPairingCode}>{pairingCopied ? 'Copied' : 'Copy code'}</button>
                <p><small>Expires {formatTimestamp(pairingSession.expiresAt)} · A code alone never marks hardware online. The API still requires a valid pairing and trusted heartbeat.</small></p>
              </div>
            )}
            <ol className="commissioning-steps">
              <li><span>1</span><div><strong>Confirm the installation</strong><p>Check the device name, location, mounting, power source, and the serial number printed on the hardware.</p></div></li>
              <li><span>2</span><div><strong>Verify the gateway relationship</strong><p>Sensor nodes can only use a gateway registered to the same farm. Configure the compliant radio profile on commissioned hardware.</p></div></li>
              <li><span>3</span><div><strong>Use the authorized provisioning flow</strong><p>Never enter Wi-Fi passwords, SIM PINs, private keys, or unrelated credentials on this page. Treat the pairing code as a secret and do not share it in chat or screenshots.</p></div></li>
              <li><span>4</span><div><strong>Wait for a trusted heartbeat</strong><p>The backend—not a user-selected switch—will update Online status only after device identity is verified and a heartbeat is received.</p></div></li>
            </ol>
            <div className="commissioning-footer"><span><CalendarDays size={15} /> Current status: {DEVICE_STATUS_META[device.status].label}</span><button type="button" className="device-primary-button" onClick={closeCommissioning}>Close</button></div>
          </section>
        </div>
      )}
    </div>
  );
};
