import {
  DeviceRegistrationInput,
  DeviceStatus,
  DeviceType,
  Farm,
  FarmPlot,
  IoTDevice,
} from '../types';

export type DeviceRegistrationErrors = Partial<
  Record<'type' | 'name' | 'farmId' | 'plotId' | 'locationLabel' | 'coordinates' | 'serialNumber' | 'gatewayId', string>
>;

export const DEVICE_STATUS_META: Record<DeviceStatus, { label: string; description: string; tone: string }> = {
  draft: { label: 'Draft', description: 'Not yet registered in AGRIPULSE.', tone: 'neutral' },
  pending_pairing: { label: 'Pending pairing', description: 'Registered; physical hardware has not completed secure pairing.', tone: 'pending' },
  pending_gateway_assignment: { label: 'Pending gateway assignment', description: 'This sensor node needs a compatible gateway on the same farm.', tone: 'pending' },
  online: { label: 'Online', description: 'A recent authenticated heartbeat was received by the backend.', tone: 'online' },
  offline: { label: 'Offline', description: 'A previously paired device missed its backend heartbeat window.', tone: 'offline' },
  attention_required: { label: 'Attention required', description: 'A device fault, low battery, or provisioning issue needs review.', tone: 'attention' },
  retired: { label: 'Retired', description: 'Intentionally removed from use; history is retained.', tone: 'retired' },
};

export const DEVICE_TYPE_META: Record<DeviceType, { label: string; description: string }> = {
  sensor_node: { label: 'Sensor node', description: 'A field node that reports supported crop and soil sensor readings.' },
  lora_gateway: { label: 'LoRa gateway', description: 'A secure field gateway that relays node messages to the service.' },
};

/** The current approved hardware set. Legacy readings remain readable, not selectable. */
export const SENSOR_OPTIONS = [
  { value: 'soil_moisture', label: 'Capacitive soil moisture' },
  { value: 'soil_npk', label: 'Soil NPK · nitrogen, phosphorus & potassium' },
  { value: 'soil_temperature', label: 'Soil temperature' },
  { value: 'air_humidity', label: 'Air humidity' },
] as const;

export function validateDeviceRegistration(
  input: DeviceRegistrationInput,
  devices: IoTDevice[],
  farms: Farm[],
  plots: FarmPlot[]
): DeviceRegistrationErrors {
  const errors: DeviceRegistrationErrors = {};
  const name = input.name.trim();
  const location = input.locationLabel.trim();
  const farm = farms.find((item) => item.id === input.farmId && !item.isArchived);

  if (!input.type) errors.type = 'Choose a device type to continue.';
  if (!name) errors.name = 'Enter a name for this device.';
  else if (name.length < 3) errors.name = 'Use at least 3 characters for the device name.';
  if (!input.farmId || !farm) errors.farmId = 'Choose an active farm registered to your account.';
  if (!location) errors.locationLabel = 'Add a clear installation location.';

  if (input.plotId) {
    const plot = plots.find((item) => item.id === input.plotId);
    if (!plot || plot.farmId !== input.farmId) {
      errors.plotId = 'Choose a plot that belongs to the selected farm.';
    }
  }

  const hasLat = input.latitude !== undefined;
  const hasLon = input.longitude !== undefined;
  if (hasLat !== hasLon) {
    errors.coordinates = 'Enter both latitude and longitude, or leave both blank.';
  } else if (
    hasLat &&
    hasLon &&
    (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude) ||
      input.latitude! < -90 || input.latitude! > 90 || input.longitude! < -180 || input.longitude! > 180)
  ) {
    errors.coordinates = 'Check the coordinates. Latitude must be −90 to 90 and longitude −180 to 180.';
  }

  const serial = input.serialNumber?.trim().toLowerCase();
  if (serial && devices.some((device) => device.serialNumber?.trim().toLowerCase() === serial)) {
    errors.serialNumber = 'This device identifier is already registered. Check the label or leave it blank until commissioning.';
  }

  if (input.type === 'sensor_node' && input.gatewayId) {
    const gateway = devices.find((device) => device.id === input.gatewayId);
    if (!gateway || gateway.type !== 'lora_gateway' || gateway.farmId !== input.farmId || gateway.status === 'retired') {
      errors.gatewayId = 'Choose an active LoRa gateway registered to the same farm.';
    }
  }

  return errors;
}

export function getDeviceDisplayName(type: DeviceType): string {
  return DEVICE_TYPE_META[type].label;
}

export function maskDeviceIdentifier(identifier?: string): string {
  if (!identifier) return 'Not added yet';
  if (identifier.length <= 4) return `••••${identifier}`;
  return `•••• ${identifier.slice(-4)}`;
}
