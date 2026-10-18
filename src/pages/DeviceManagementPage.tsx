import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Cpu,
  Filter,
  MapPin,
  Plus,
  RadioTower,
  Search,
  ShieldCheck,
  Signal,
  WifiOff,
} from 'lucide-react';
import { DeviceRegistrationWizard } from '../components/DeviceRegistrationWizard';
import { AgriPulseLoader } from '../components/AgriPulseLoader';
import { DeviceStatusBadge } from '../components/DeviceStatusBadge';
import { useAgriPulse } from '../context/AgriPulseContext';
import { DeviceStatus, IoTDevice } from '../types';
import { DEVICE_STATUS_META, DEVICE_TYPE_META, maskDeviceIdentifier } from '../services/deviceService';

const formatLastSeen = (value?: string) => {
  if (!value) return 'Never paired';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Timestamp unavailable';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

export const DeviceManagementPage: React.FC = () => {
  const { session, farms, activeFarm, plots, devices, devicesLoading, deviceApiError, registerDevice, assignDeviceGateway } = useAgriPulse();
  const navigate = useNavigate();
  const [showWizard, setShowWizard] = useState(false);
  const [farmFilter, setFarmFilter] = useState(activeFarm?.id || 'all');
  const [plotFilter, setPlotFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'sensor_node' | 'lora_gateway'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | DeviceStatus>('all');
  const [lastSeenFilter, setLastSeenFilter] = useState<'all' | 'never' | 'recent'>('all');
  const [search, setSearch] = useState('');

  const activeFarms = useMemo(() => farms.filter((farm) => !farm.isArchived), [farms]);
  const farmScopedDevices = useMemo(
    () => devices.filter((device) => farmFilter === 'all' || device.farmId === farmFilter),
    [devices, farmFilter]
  );
  const farmScopedPlots = useMemo(
    () => plots.filter((plot) => farmFilter === 'all' || plot.farmId === farmFilter),
    [plots, farmFilter]
  );

  const counts = useMemo(() => ({
    total: farmScopedDevices.filter((device) => device.status !== 'retired').length,
    gateways: farmScopedDevices.filter((device) => device.type === 'lora_gateway' && device.status !== 'retired').length,
    online: farmScopedDevices.filter((device) => device.status === 'online').length,
    pending: farmScopedDevices.filter((device) => device.status === 'pending_pairing' || device.status === 'pending_gateway_assignment').length,
    attention: farmScopedDevices.filter((device) => device.status === 'offline' || device.status === 'attention_required').length,
  }), [farmScopedDevices]);

  const filteredDevices = useMemo(() => {
    const query = search.trim().toLowerCase();
    return farmScopedDevices.filter((device) => {
      const farm = farms.find((item) => item.id === device.farmId);
      const plot = plots.find((item) => item.id === device.plotId);
      const gateway = devices.find((item) => item.id === device.gatewayId);
      const matchesQuery = !query || [device.name, device.serialNumber, device.locationLabel, farm?.name, plot?.name, gateway?.name]
        .filter(Boolean).join(' ').toLowerCase().includes(query);
      const matchesPlot = plotFilter === 'all' || device.plotId === plotFilter;
      const matchesType = typeFilter === 'all' || device.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || device.status === statusFilter;
      const matchesLastSeen = lastSeenFilter === 'all'
        || (lastSeenFilter === 'never' && !device.lastSeenAt)
        || (lastSeenFilter === 'recent' && Boolean(device.lastSeenAt) && Date.now() - new Date(device.lastSeenAt!).getTime() < 7 * 24 * 60 * 60 * 1000);
      return matchesQuery && matchesPlot && matchesType && matchesStatus && matchesLastSeen;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [farmScopedDevices, search, plotFilter, typeFilter, statusFilter, lastSeenFilter, farms, plots, devices]);

  const getFarmName = (device: IoTDevice) => farms.find((farm) => farm.id === device.farmId)?.name || 'Farm unavailable';
  const getPlotName = (device: IoTDevice) => plots.find((plot) => plot.id === device.plotId)?.name || '';
  const getGatewayName = (device: IoTDevice) => devices.find((item) => item.id === device.gatewayId)?.name;

  const handleFarmFilterChange = (value: string) => {
    setFarmFilter(value);
    setPlotFilter('all');
  };

  return (
    <div className="devices-page">
      <section className="devices-hero">
        <div className="devices-hero-copy">
          <div className="device-eyebrow device-eyebrow--light"><Signal size={14} /> Connected field workspace</div>
          <h2>Devices & IoT</h2>
          <p>Organize your sensor nodes and gateways. A device record is a starting point—not proof that hardware is connected.</p>
          <div className="devices-hero-tags">
            <span><ShieldCheck size={14} /> Private to your farm workspace</span>
            <span><WifiOff size={14} /> {session?.isDemo ? 'Demo records are not live telemetry' : 'No physical telemetry received yet'}</span>
          </div>
        </div>
        <div className="devices-hero-visual" aria-hidden="true">
          <div className="device-orbit device-orbit--outer" />
          <div className="device-orbit device-orbit--inner" />
          <span className="device-orbit-center"><RadioTower size={35} /></span>
          <span className="device-orbit-node node-one"><Cpu size={16} /></span>
          <span className="device-orbit-node node-two"><Signal size={16} /></span>
          <span className="device-orbit-node node-three"><MapPin size={16} /></span>
        </div>
        <button type="button" onClick={() => setShowWizard(true)} className="device-primary-button devices-hero-cta">
          <Plus size={17} /> Register device
        </button>
      </section>

      <div className="devices-demo-notice" role="note">
        <span className="devices-notice-icon"><AlertTriangle size={18} /></span>
        <div>
          <strong>{session?.isDemo ? 'Development demo records · authenticated API' : 'Authenticated server device registry'}</strong>
          <p>Device metadata is saved to the server database. Status is server-derived: new equipment stays pending until it is securely paired and sends a verified heartbeat. No sensor readings are fabricated. Forecast precipitation remains separate from physical sensor telemetry.</p>
          {deviceApiError && <p role="alert" className="mt-2 font-semibold">API issue: {deviceApiError}</p>}
        </div>
      </div>

      <section className="device-stat-grid" aria-label="Device summary">
        <div className="device-stat-card"><span className="device-stat-icon"><Cpu size={18} /></span><span className="device-stat-label">Total devices</span><strong>{counts.total}</strong><small>Registered records</small></div>
        <div className="device-stat-card"><span className="device-stat-icon device-stat-icon--sage"><RadioTower size={18} /></span><span className="device-stat-label">Gateways</span><strong>{counts.gateways}</strong><small>LoRa gateways</small></div>
        <div className="device-stat-card"><span className="device-stat-icon device-stat-icon--mint"><Signal size={18} /></span><span className="device-stat-label">Online</span><strong>{counts.online}</strong><small>Verified heartbeat</small></div>
        <div className="device-stat-card"><span className="device-stat-icon device-stat-icon--amber"><ArrowRight size={18} /></span><span className="device-stat-label">Pending</span><strong>{counts.pending}</strong><small>Pairing or assignment</small></div>
        <div className="device-stat-card"><span className="device-stat-icon device-stat-icon--rose"><AlertTriangle size={18} /></span><span className="device-stat-label">Needs attention</span><strong>{counts.attention}</strong><small>Offline or fault reported</small></div>
      </section>

      <section className="devices-list-panel">
        <div className="devices-list-header">
          <div>
            <p className="device-eyebrow">Farm equipment</p>
            <h3>Your device registry</h3>
            <p className="devices-section-subtitle">{filteredDevices.length} {filteredDevices.length === 1 ? 'device' : 'devices'} shown · Select any record for configuration, events, and commissioning guidance.</p>
          </div>
          <button type="button" onClick={() => setShowWizard(true)} className="device-secondary-button devices-header-button"><Plus size={16} /> Add device</button>
        </div>

        <div className="devices-filter-grid" aria-label="Filter devices">
          <label className="devices-filter-field"><span>Farm</span><select value={farmFilter} onChange={(event) => handleFarmFilterChange(event.target.value)}><option value="all">All farms</option>{activeFarms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select></label>
          <label className="devices-filter-field"><span>Plot / zone</span><select value={plotFilter} onChange={(event) => setPlotFilter(event.target.value)}><option value="all">All plots</option>{farmScopedPlots.map((plot) => <option key={plot.id} value={plot.id}>{plot.name}</option>)}</select></label>
          <label className="devices-filter-field"><span>Device type</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}><option value="all">All device types</option><option value="sensor_node">Sensor node</option><option value="lora_gateway">LoRa gateway</option></select></label>
          <label className="devices-filter-field"><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}><option value="all">All statuses</option>{Object.entries(DEVICE_STATUS_META).map(([status, meta]) => <option key={status} value={status}>{meta.label}</option>)}</select></label>
          <label className="devices-filter-field"><span>Last seen</span><select value={lastSeenFilter} onChange={(event) => setLastSeenFilter(event.target.value as typeof lastSeenFilter)}><option value="all">Any time</option><option value="recent">Within 7 days</option><option value="never">Never paired</option></select></label>
          <label className="devices-filter-field devices-search-field"><span>Search</span><div className="devices-search-wrap"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, location, identifier…" /></div></label>
        </div>

        {devicesLoading ? <div className="devices-empty-state"><AgriPulseLoader label="Loading secure device registry…" /></div> : filteredDevices.length ? (
          <div className="device-card-grid">
            {filteredDevices.map((device) => {
              const Icon = device.type === 'sensor_node' ? Cpu : RadioTower;
              const farmGateways = devices.filter((item) => item.type === 'lora_gateway' && item.farmId === device.farmId && item.status !== 'retired');
              return (
                <article key={device.id} className="device-record-card">
                  <div className="device-record-heading">
                    <span className={`device-record-icon ${device.type === 'lora_gateway' ? 'is-gateway' : ''}`}><Icon size={21} /></span>
                    <div className="device-record-title"><span>{DEVICE_TYPE_META[device.type].label}</span><h4>{device.name}</h4></div>
                    <DeviceStatusBadge status={device.status} compact />
                  </div>
                  <div className="device-record-tags"><span className="device-demo-pill">{device.isDemoRecord ? 'Demo record' : 'Account record'}</span><span className="device-id-chip">ID {maskDeviceIdentifier(device.serialNumber)}</span></div>
                  <div className="device-record-details">
                    <div><MapPin size={15} /><span><strong>{getFarmName(device)}</strong><small>{getPlotName(device) || 'No plot assigned'}</small></span></div>
                    <div><Signal size={15} /><span><strong>{device.locationLabel}</strong><small>{device.locality ? `${device.locality}${device.district ? `, ${device.district}` : ''}${device.state ? `, ${device.state}` : ''}` : 'Installation location'}</small></span></div>
                    <div><RadioTower size={15} /><span><strong>{device.type === 'sensor_node' ? getGatewayName(device) || 'No gateway assigned' : `${devices.filter((item) => item.gatewayId === device.id && item.status !== 'retired').length} linked sensor node(s)`}</strong><small>{device.type === 'sensor_node' ? 'Assigned gateway' : 'Gateway connections'}</small></span></div>
                  </div>
                  <div className="device-telemetry-empty"><span className="device-telemetry-dot" /><div><strong>No telemetry received yet</strong><small>Last seen · {formatLastSeen(device.lastSeenAt)}</small></div></div>
                  {device.type === 'sensor_node' && device.status !== 'retired' && (
                    <label className="device-assign-inline"><span>Assign gateway</span><select value={device.gatewayId || ''} onChange={(event) => assignDeviceGateway(device.id, event.target.value || undefined)}><option value="">No gateway — unassigned</option>{farmGateways.map((gateway) => <option key={gateway.id} value={gateway.id}>{gateway.name}</option>)}</select></label>
                  )}
                  <div className="device-record-footer">
                    <span>{device.installedSensors?.length ? `${device.installedSensors.length} installed sensor types` : device.type === 'lora_gateway' ? device.backhaulType ? `Backhaul · ${device.backhaulType}` : 'Gateway configuration' : 'Sensors not specified'}</span>
                    <Link to={`/devices/${device.id}`} aria-label={`View details for ${device.name}`}>View details <ArrowRight size={15} /></Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="devices-empty-state">
            <div className="devices-empty-icon"><Filter size={24} /></div>
            <h4>{devices.length ? 'No devices match these filters' : 'Your device registry is ready'}</h4>
            <p>{devices.length ? 'Try another farm, type, status, or search term.' : 'Register a gateway or sensor node to organize installation details. New hardware stays pending until real secure pairing is completed.'}</p>
            {devices.length ? <button type="button" className="device-link-button" onClick={() => { setFarmFilter('all'); setPlotFilter('all'); setTypeFilter('all'); setStatusFilter('all'); setLastSeenFilter('all'); setSearch(''); }}>Clear all filters <ArrowRight size={14} /></button> : <button type="button" className="device-primary-button" onClick={() => setShowWizard(true)}><Plus size={16} /> Register first device</button>}
          </div>
        )}
      </section>

      <div className="devices-footer-note"><ShieldCheck size={16} /><span>Physical device identity, pairing state, heartbeats, and telemetry belong in a secure authenticated backend—not in browser storage.</span></div>

      {showWizard && <DeviceRegistrationWizard farms={farms} plots={plots} devices={devices} isDemo={Boolean(session?.isDemo)} onClose={() => setShowWizard(false)} onRegister={registerDevice} />}
    </div>
  );
};
