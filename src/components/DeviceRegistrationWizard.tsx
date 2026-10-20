import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Cpu,
  Info,
  MapPin,
  RadioTower,
  ShieldCheck,
  X,
} from 'lucide-react';
import { DeviceRegistrationInput, DeviceType, Farm, FarmPlot, IoTDevice, InstalledSensorType } from '../types';
import { AgriPulseLoader } from './AgriPulseLoader';
import { DEVICE_TYPE_META, SENSOR_OPTIONS, validateDeviceRegistration } from '../services/deviceService';

interface DeviceRegistrationWizardProps {
  farms: Farm[];
  plots: FarmPlot[];
  devices: IoTDevice[];
  isDemo: boolean;
  onClose: () => void;
  onRegister: (input: DeviceRegistrationInput) => Promise<IoTDevice>;
}

type Draft = {
  type?: DeviceType;
  name: string;
  farmId: string;
  plotId: string;
  locationLabel: string;
  state: string;
  district: string;
  locality: string;
  latitude: string;
  longitude: string;
  installedAt: string;
  serialNumber: string;
  notes: string;
  gatewayId: string;
  installedSensors: InstalledSensorType[];
  nodePowerSource: 'solar_battery' | 'battery' | 'other';
  gatewayPowerSource: 'solar_battery' | 'mains' | 'other';
  backhaulType: 'wifi' | 'ethernet' | 'cellular' | 'other';
  calibrationStatus: 'not_calibrated' | 'calibration_recorded' | 'needs_review';
  calibrationDate: string;
  calibrationNotes: string;
  coverageNotes: string;
};

const DRAFT_KEY = 'AgriPulse:v1:deviceRegistrationDraft';
const today = new Date().toISOString().slice(0, 10);

const createEmptyDraft = (): Draft => ({
  name: '',
  farmId: '',
  plotId: '',
  locationLabel: '',
  state: '',
  district: '',
  locality: '',
  latitude: '',
  longitude: '',
  installedAt: today,
  serialNumber: '',
  notes: '',
  gatewayId: '',
  installedSensors: [],
  nodePowerSource: 'solar_battery',
  gatewayPowerSource: 'mains',
  backhaulType: 'ethernet',
  calibrationStatus: 'not_calibrated',
  calibrationDate: '',
  calibrationNotes: '',
  coverageNotes: '',
});

const readDraft = (): Draft => {
  if (!import.meta.env.DEV) return createEmptyDraft();
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return createEmptyDraft();
    const parsed = JSON.parse(raw) as Partial<Draft>;
    return { ...createEmptyDraft(), ...parsed };
  } catch {
    return createEmptyDraft();
  }
};

const controlClass = 'device-input';

export const DeviceRegistrationWizard: React.FC<DeviceRegistrationWizardProps> = ({
  farms,
  plots,
  devices,
  isDemo,
  onClose,
  onRegister,
}) => {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(readDraft);
  const [step, setStep] = useState<1 | 2 | 3>(draft.type ? 2 : 1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [geoMessage, setGeoMessage] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const activeFarms = useMemo(() => farms.filter((farm) => !farm.isArchived), [farms]);
  const selectedFarmPlots = useMemo(
    () => plots.filter((plot) => plot.farmId === draft.farmId),
    [plots, draft.farmId]
  );
  const eligibleGateways = useMemo(
    () => devices.filter((device) => device.type === 'lora_gateway' && device.farmId === draft.farmId && device.status !== 'retired'),
    [devices, draft.farmId]
  );

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Registration can still continue if local draft storage is unavailable.
    }
  }, [draft]);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  const asInput = (): DeviceRegistrationInput => {
    const latitude = draft.latitude.trim() ? Number(draft.latitude) : undefined;
    const longitude = draft.longitude.trim() ? Number(draft.longitude) : undefined;
    const common: DeviceRegistrationInput = {
      type: draft.type || 'sensor_node',
      name: draft.name.trim(),
      farmId: draft.farmId,
      plotId: draft.plotId || undefined,
      locationLabel: draft.locationLabel.trim(),
      state: draft.state.trim() || undefined,
      district: draft.district.trim() || undefined,
      locality: draft.locality.trim() || undefined,
      latitude,
      longitude,
      installedAt: draft.installedAt || undefined,
      serialNumber: draft.serialNumber.trim() || undefined,
      notes: draft.notes.trim() || undefined,
    };

    if (draft.type === 'sensor_node') {
      return {
        ...common,
        gatewayId: draft.gatewayId || undefined,
        installedSensors: [...draft.installedSensors],
        powerSource: draft.nodePowerSource,
        calibrationStatus: draft.calibrationStatus,
        calibrationDate: draft.calibrationDate || undefined,
        calibrationNotes: draft.calibrationNotes.trim() || undefined,
        communicationProfile: 'Inherited from gateway at commissioning',
      };
    }

    return {
      ...common,
      backhaulType: draft.backhaulType,
      powerSource: draft.gatewayPowerSource,
      communicationProfile: 'Read from commissioned gateway; not configured in this demo',
      coverageNotes: draft.coverageNotes.trim() || undefined,
    };
  };

  const validate = () => {
    const next = validateDeviceRegistration(asInput(), devices, farms, plots);
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goToReview = () => {
    if (!draft.type) {
      setErrors({ type: 'Choose Sensor node or LoRa gateway.' });
      return;
    }
    if (validate()) setStep(3);
  };

  const handleSubmit = async () => {
    if (!validate()) {
      setStep(2);
      return;
    }
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const registered = await onRegister(asInput());
      if (import.meta.env.DEV) {
        try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* Ignore unavailable local storage. */ }
      }
      onClose();
      navigate(`/devices/${registered.id}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Device registration could not be saved. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGeoMessage('Location is not available in this browser. You can enter coordinates manually.');
      return;
    }
    setIsGettingLocation(true);
    setGeoMessage('Waiting for your location permission…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        update('latitude', position.coords.latitude.toFixed(6));
        update('longitude', position.coords.longitude.toFixed(6));
        setGeoMessage('Coordinates added. They will be saved with this demo record.');
        setIsGettingLocation(false);
      },
      (error) => {
        setGeoMessage(error.code === error.PERMISSION_DENIED
          ? 'Location permission was declined. You can still enter coordinates manually.'
          : 'Could not get a location fix. You can still enter coordinates manually.');
        setIsGettingLocation(false);
      },
      { timeout: 10000, maximumAge: 30000 }
    );
  };

  const toggleSensor = (sensor: InstalledSensorType) => {
    const next = draft.installedSensors.includes(sensor)
      ? draft.installedSensors.filter((item) => item !== sensor)
      : [...draft.installedSensors, sensor];
    update('installedSensors', next);
  };

  const selectedFarm = farms.find((farm) => farm.id === draft.farmId);
  const selectedPlot = plots.find((plot) => plot.id === draft.plotId);
  const selectedGateway = devices.find((device) => device.id === draft.gatewayId);

  return (
    <div className="device-wizard-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="device-wizard" role="dialog" aria-modal="true" aria-labelledby="device-wizard-title">
        <header className="device-wizard-header">
          <div className="flex items-start gap-3 min-w-0">
            <div className="device-wizard-mark"><Cpu size={21} /></div>
            <div className="min-w-0">
              <p className="device-eyebrow">Devices & IoT · {isDemo ? 'Development demo' : 'Authenticated account'}</p>
              <h2 id="device-wizard-title">Register a device</h2>
              <p className="device-wizard-subtitle">Device metadata is saved by the AGRIPULSE API. Hardware stays pending until secure pairing and a trusted heartbeat.</p>
            </div>
          </div>
          <button type="button" className="device-icon-button" onClick={onClose} aria-label="Close registration">
            <X size={19} />
          </button>
        </header>

        <div className="device-stepper" aria-label="Registration progress">
          {[
            { number: 1, label: 'Device type' },
            { number: 2, label: 'Details' },
            { number: 3, label: 'Review' },
          ].map((item, index) => (
            <React.Fragment key={item.number}>
              <div className={`device-step ${step >= item.number ? 'is-active' : ''}`}>
                <span className="device-step-number">{step > item.number ? <Check size={14} /> : item.number}</span>
                <span>{item.label}</span>
              </div>
              {index < 2 && <span className={`device-step-line ${step > item.number ? 'is-active' : ''}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="device-wizard-body">
          {step === 1 && (
            <div className="device-wizard-step-content">
              <div className="device-section-intro">
                <span className="device-section-kicker">Step 1 of 3</span>
                <h3>What are you registering?</h3>
                <p>Choose a device type. You can add an identifier later if the hardware is not on hand yet.</p>
              </div>
              <div className="device-type-options">
                {(['sensor_node', 'lora_gateway'] as DeviceType[]).map((type) => {
                  const Icon = type === 'sensor_node' ? Cpu : RadioTower;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { update('type', type); setStep(2); }}
                      className={`device-type-option ${draft.type === type ? 'is-selected' : ''}`}
                    >
                      <span className="device-type-icon"><Icon size={24} /></span>
                      <span className="device-type-copy">
                        <strong>{DEVICE_TYPE_META[type].label}</strong>
                        <span>{DEVICE_TYPE_META[type].description}</span>
                      </span>
                      <ArrowRight size={18} className="device-type-arrow" />
                    </button>
                  );
                })}
              </div>
              {errors.type && <p className="device-field-error"><AlertCircle size={14} />{errors.type}</p>}
              <div className="device-info-strip">
                <Info size={16} />
                <span>A saved form registers metadata only. It does not prove a sensor is connected or change hardware configuration.</span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="device-wizard-step-content">
              <div className="device-section-intro">
                <span className="device-section-kicker">Step 2 of 3 · {draft.type ? DEVICE_TYPE_META[draft.type].label : 'Device'}</span>
                <h3>Installation details</h3>
                <p>Fields marked <strong>*</strong> are required. Network credentials and device secrets are never requested here.</p>
              </div>

              {!activeFarms.length ? (
                <div className="device-no-farm">
                  <span className="device-type-icon"><MapPin size={22} /></span>
                  <div>
                    <strong>Add a farm before registering devices</strong>
                    <p>Devices are attached to a farm so their information stays organized.</p>
                    <button type="button" className="device-link-button" onClick={() => { onClose(); navigate('/farm'); }}>Go to Farm Management <ArrowRight size={14} /></button>
                  </div>
                </div>
              ) : (
                <div className="device-form-grid">
                  <label className="device-form-field device-span-2">
                    <span>Device name <b>*</b></span>
                    <input className={controlClass} value={draft.name} onChange={(event) => update('name', event.target.value)} placeholder={draft.type === 'sensor_node' ? 'North Field Node 01' : 'Main Farm Gateway'} autoComplete="off" aria-invalid={Boolean(errors.name)} />
                    {errors.name && <small className="device-field-error-text">{errors.name}</small>}
                  </label>

                  <label className="device-form-field">
                    <span>Farm <b>*</b></span>
                    <select className={controlClass} value={draft.farmId} onChange={(event) => { update('farmId', event.target.value); update('plotId', ''); update('gatewayId', ''); }} aria-invalid={Boolean(errors.farmId)}>
                      <option value="">Select a farm</option>
                      {activeFarms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name} · {farm.district}</option>)}
                    </select>
                    {errors.farmId && <small className="device-field-error-text">{errors.farmId}</small>}
                  </label>

                  <label className="device-form-field">
                    <span>Plot / zone <small>{draft.type === 'sensor_node' ? 'Recommended' : 'Optional'}</small></span>
                    <select className={controlClass} value={draft.plotId} onChange={(event) => update('plotId', event.target.value)} disabled={!draft.farmId} aria-invalid={Boolean(errors.plotId)}>
                      <option value="">{draft.type === 'sensor_node' ? 'Select a plot (optional)' : 'No specific plot'}</option>
                      {selectedFarmPlots.map((plot) => <option key={plot.id} value={plot.id}>{plot.name}</option>)}
                    </select>
                    {errors.plotId && <small className="device-field-error-text">{errors.plotId}</small>}
                  </label>

                  <label className="device-form-field device-span-2">
                    <span>Installation location <b>*</b></span>
                    <input className={controlClass} value={draft.locationLabel} onChange={(event) => update('locationLabel', event.target.value)} placeholder="North boundary near the borewell" aria-invalid={Boolean(errors.locationLabel)} />
                    {errors.locationLabel && <small className="device-field-error-text">{errors.locationLabel}</small>}
                  </label>

                  <div className="device-form-field device-span-2">
                    <span>Area details <small>Optional</small></span>
                    <div className="device-form-grid device-form-grid--nested">
                      <input aria-label="State" className={controlClass} value={draft.state} onChange={(event) => update('state', event.target.value)} placeholder="State" />
                      <input aria-label="District" className={controlClass} value={draft.district} onChange={(event) => update('district', event.target.value)} placeholder="District" />
                      <input aria-label="Village or locality" className={controlClass} value={draft.locality} onChange={(event) => update('locality', event.target.value)} placeholder="Village / locality" />
                    </div>
                  </div>

                  <div className="device-form-field device-span-2">
                    <div className="device-field-label-row">
                      <span>GPS coordinates <small>Optional</small></span>
                      <button type="button" className="device-location-button" onClick={requestLocation} disabled={isGettingLocation}><MapPin size={14} />{isGettingLocation ? 'Getting location…' : 'Use my location'}</button>
                    </div>
                    <div className="device-form-grid device-form-grid--nested device-form-grid--coordinates">
                      <input aria-label="Latitude" className={controlClass} inputMode="decimal" value={draft.latitude} onChange={(event) => update('latitude', event.target.value)} placeholder="Latitude (−90 to 90)" />
                      <input aria-label="Longitude" className={controlClass} inputMode="decimal" value={draft.longitude} onChange={(event) => update('longitude', event.target.value)} placeholder="Longitude (−180 to 180)" />
                    </div>
                    {errors.coordinates && <small className="device-field-error-text">{errors.coordinates}</small>}
                    {geoMessage && <small className="device-field-help">{geoMessage}</small>}
                  </div>

                  <label className="device-form-field">
                    <span>Installation date <small>Optional</small></span>
                    <input className={controlClass} type="date" value={draft.installedAt} onChange={(event) => update('installedAt', event.target.value)} />
                  </label>

                  <label className="device-form-field">
                    <span>Serial / device ID <small>Optional before pairing</small></span>
                    <input className={controlClass} value={draft.serialNumber} onChange={(event) => update('serialNumber', event.target.value)} placeholder="Printed on your device" autoComplete="off" aria-invalid={Boolean(errors.serialNumber)} />
                    {errors.serialNumber && <small className="device-field-error-text">{errors.serialNumber}</small>}
                  </label>

                  {draft.type === 'sensor_node' && (
                    <>
                      <label className="device-form-field device-span-2">
                        <span>Assigned LoRa gateway <small>Optional</small></span>
                        <select className={controlClass} value={draft.gatewayId} onChange={(event) => update('gatewayId', event.target.value)} disabled={!draft.farmId} aria-invalid={Boolean(errors.gatewayId)}>
                          <option value="">Leave unassigned — pending gateway assignment</option>
                          {eligibleGateways.map((gateway) => <option key={gateway.id} value={gateway.id}>{gateway.name}{gateway.isDemoRecord ? ' · Demo' : ''}</option>)}
                        </select>
                        {errors.gatewayId && <small className="device-field-error-text">{errors.gatewayId}</small>}
                        {!eligibleGateways.length && draft.farmId && <small className="device-field-help">No gateway is registered on this farm yet. You can register the node first and add a gateway later.</small>}
                      </label>

                      <fieldset className="device-form-field device-span-2 device-sensor-fieldset">
                        <legend>Installed sensors <small>Choose supported hardware only</small></legend>
                        <div className="device-sensor-grid">
                          {SENSOR_OPTIONS.map((sensor) => (
                            <label key={sensor.value} className={`device-sensor-option ${draft.installedSensors.includes(sensor.value) ? 'is-selected' : ''}`}>
                              <input type="checkbox" checked={draft.installedSensors.includes(sensor.value)} onChange={() => toggleSensor(sensor.value)} />
                              <span className="device-checkbox-mark">{draft.installedSensors.includes(sensor.value) && <Check size={12} />}</span>
                              <span>{sensor.label}</span>
                            </label>
                          ))}
                        </div>
                        <small className="device-field-help">No physical rain gauge or rainfall-mm sensor is supported in this version.</small>
                      </fieldset>

                      <label className="device-form-field">
                        <span>Power source</span>
                        <select className={controlClass} value={draft.nodePowerSource} onChange={(event) => update('nodePowerSource', event.target.value as Draft['nodePowerSource'])}>
                          <option value="solar_battery">Solar + battery</option><option value="battery">Battery</option><option value="other">Other supported source</option>
                        </select>
                      </label>

                      <div className="device-form-field">
                        <span>Sampling interval</span>
                        <div className="device-readonly-setting">Planned: 30 minutes <small>Set during commissioning; remote configuration is not available in this demo.</small></div>
                      </div>

                      <label className="device-form-field">
                        <span>Calibration status</span>
                        <select className={controlClass} value={draft.calibrationStatus} onChange={(event) => update('calibrationStatus', event.target.value as Draft['calibrationStatus'])}>
                          <option value="not_calibrated">Not calibrated</option><option value="calibration_recorded">Calibration recorded</option><option value="needs_review">Needs review</option>
                        </select>
                      </label>

                      <label className="device-form-field">
                        <span>Calibration date <small>Optional</small></span>
                        <input className={controlClass} type="date" value={draft.calibrationDate} onChange={(event) => update('calibrationDate', event.target.value)} />
                      </label>

                      <label className="device-form-field device-span-2">
                        <span>Calibration notes <small>Optional</small></span>
                        <input className={controlClass} value={draft.calibrationNotes} onChange={(event) => update('calibrationNotes', event.target.value)} placeholder="Reference instrument, procedure, or next review" />
                      </label>
                    </>
                  )}

                  {draft.type === 'lora_gateway' && (
                    <>
                      <label className="device-form-field">
                        <span>Backhaul connection</span>
                        <select className={controlClass} value={draft.backhaulType} onChange={(event) => update('backhaulType', event.target.value as Draft['backhaulType'])}>
                          <option value="wifi">Wi-Fi</option><option value="ethernet">Ethernet</option><option value="cellular">4G / LTE</option><option value="other">Other supported method</option>
                        </select>
                      </label>

                      <label className="device-form-field">
                        <span>Power source</span>
                        <select className={controlClass} value={draft.gatewayPowerSource} onChange={(event) => update('gatewayPowerSource', event.target.value as Draft['gatewayPowerSource'])}>
                          <option value="mains">Mains</option><option value="solar_battery">Solar + battery</option><option value="other">Other supported source</option>
                        </select>
                      </label>

                      <div className="device-form-field device-span-2">
                        <span>Radio profile</span>
                        <div className="device-readonly-setting">Read from the commissioned gateway <small>Radio region and frequency are not free-text settings. A supported, locally compliant profile is provisioned during commissioning.</small></div>
                      </div>

                      <label className="device-form-field device-span-2">
                        <span>Coverage / mounting notes <small>Optional</small></span>
                        <textarea className={`${controlClass} device-textarea`} value={draft.coverageNotes} onChange={(event) => update('coverageNotes', event.target.value)} rows={2} placeholder="Antenna position, mounting height, or coverage notes" />
                      </label>
                    </>
                  )}

                  <label className="device-form-field device-span-2">
                    <span>Installation notes <small>Optional · never add network passwords or device secrets</small></span>
                    <textarea className={`${controlClass} device-textarea`} value={draft.notes} onChange={(event) => update('notes', event.target.value)} rows={2} placeholder="Mounting details or access instructions" />
                  </label>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="device-wizard-step-content">
              <div className="device-section-intro">
                <span className="device-section-kicker">Step 3 of 3 · Review</span>
                <h3>Check the device record</h3>
                <p>Saving creates an account-owned metadata record only. It does not connect hardware or create sensor readings; pairing is a separate, auditable step.</p>
              </div>
              <div className="device-review-card">
                <div className="device-review-heading">
                  <span className="device-type-icon">{draft.type === 'sensor_node' ? <Cpu size={22} /> : <RadioTower size={22} />}</span>
                  <div><span className="device-review-type">{draft.type ? DEVICE_TYPE_META[draft.type].label : 'Device'}</span><strong>{draft.name || 'Unnamed device'}</strong></div>
                  <span className="device-demo-pill">{isDemo ? 'Demo record' : 'Account record'}</span>
                </div>
                <div className="device-review-grid">
                  <div><span>Farm</span><strong>{selectedFarm?.name || 'Not selected'}</strong></div>
                  <div><span>Plot / zone</span><strong>{selectedPlot?.name || 'Not assigned'}</strong></div>
                  <div><span>Installation location</span><strong>{draft.locationLabel || 'Not provided'}</strong></div>
                  <div><span>Identifier</span><strong>{draft.serialNumber || 'Add before pairing'}</strong></div>
                  <div><span>Coordinates</span><strong>{draft.latitude && draft.longitude ? `${draft.latitude}, ${draft.longitude}` : 'Not provided'}</strong></div>
                  <div><span>Initial status</span><strong>{draft.type === 'sensor_node' && !draft.gatewayId ? 'Pending gateway assignment' : 'Pending pairing'}</strong></div>
                  {draft.type === 'sensor_node' && <div className="device-span-2"><span>Gateway</span><strong>{selectedGateway?.name || 'Unassigned'}</strong></div>}
                  {draft.type === 'sensor_node' && <div className="device-span-2"><span>Installed sensors</span><strong>{draft.installedSensors.length ? draft.installedSensors.map((value) => SENSOR_OPTIONS.find((option) => option.value === value)?.label).filter(Boolean).join(', ') : 'No sensors selected'}</strong></div>}
                </div>
              </div>
              <div className="device-info-strip device-info-strip--safe"><ShieldCheck size={17} /><span>Installation metadata is stored in the authenticated server database. Pairing tokens are one-time only; network passwords, keys, and SIM PINs are never collected by this form.</span></div>
              {submitError && <p role="alert" className="device-field-error"><AlertCircle size={14} />{submitError}</p>}
            </div>
          )}
        </div>

        <footer className="device-wizard-footer">
          {step === 1 ? (
            <>
              <button type="button" className="device-secondary-button" onClick={onClose}>Cancel</button>
              <span className="device-footer-spacer" />
              {draft.type && <button type="button" className="device-primary-button" onClick={() => setStep(2)}>Continue <ArrowRight size={16} /></button>}
            </>
          ) : step === 2 ? (
            <>
              <button type="button" className="device-secondary-button" onClick={() => setStep(1)}><ArrowLeft size={15} /> Change type</button>
              <span className="device-footer-spacer" />
              <button type="button" className="device-primary-button" onClick={goToReview} disabled={!activeFarms.length}>Review device <ArrowRight size={16} /></button>
            </>
          ) : (
            <>
              <button type="button" className="device-secondary-button" onClick={() => setStep(2)}><ArrowLeft size={15} /> Back to details</button>
              <span className="device-footer-spacer" />
              <button type="button" className="device-primary-button" onClick={handleSubmit} disabled={!activeFarms.length || isSubmitting}>
                {isSubmitting ? <AgriPulseLoader size="sm" className="agri-loader--button" /> : <Check size={16} />}
                {isSubmitting ? 'Saving…' : 'Register device'}
              </button>
            </>
          )}
        </footer>
      </section>
    </div>
  );
};
