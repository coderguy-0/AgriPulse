import { z } from 'zod';

const text = (max = 160) => z.string().trim().max(max);
const optionalText = (max = 160) => text(max).optional().or(z.literal(''));

const commonRegistration = {
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128),
  mobile: optionalText(32),
  state: optionalText(80),
  district: optionalText(100),
  rememberMe: z.boolean().optional().default(true),
};

export const registerSchema = z.discriminatedUnion('portalType', [
  z.object({
    portalType: z.literal('farmer'),
    ...commonRegistration,
    name: text(100).min(2),
    village: optionalText(100),
    primaryCrop: optionalText(80),
    landArea: z.coerce.number().finite().min(0).max(100000).optional(),
  }).strict(),
  z.object({
    portalType: z.literal('seller'),
    ...commonRegistration,
    businessName: text(140).min(2),
    tradeName: optionalText(140),
    contactPerson: text(100).min(2),
    category: text(100).min(2),
    gstin: optionalText(24),
    licenseNumber: optionalText(80),
    city: optionalText(100),
    address: optionalText(240),
    pincode: optionalText(12),
  }).strict(),
]);

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
  portalType: z.enum(['farmer', 'seller']).optional(),
  rememberMe: z.boolean().optional().default(true),
}).strict();

export const demoSessionSchema = z.object({ portalType: z.enum(['farmer', 'seller']) }).strict();
export const portalSwitchSchema = z.object({ portalType: z.enum(['farmer', 'seller']) }).strict();

const installedSensor = z.enum(['soil_moisture', 'soil_temperature', 'air_humidity', 'soil_npk']);
const powerSource = z.enum(['solar_battery', 'battery', 'mains', 'other']);
const backhaulType = z.enum(['wifi', 'ethernet', 'cellular', 'other']);
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();

export const deviceRegistrationSchema = z.object({
  farmId: z.string().trim().min(1).max(100),
  plotId: z.string().trim().min(1).max(100).optional(),
  type: z.enum(['sensor_node', 'lora_gateway']),
  name: text(100).min(3),
  serialNumber: text(100).optional(),
  locationLabel: text(180).min(3),
  state: optionalText(80),
  district: optionalText(100),
  locality: optionalText(100),
  latitude: z.number().finite().min(-90).max(90).optional(),
  longitude: z.number().finite().min(-180).max(180).optional(),
  installedAt: dateOnly,
  gatewayId: z.string().trim().min(1).max(100).optional(),
  installedSensors: z.array(installedSensor).max(4).refine((items) => new Set(items).size === items.length, 'Select each sensor only once.').optional(),
  backhaulType: backhaulType.optional(),
  powerSource: powerSource.optional(),
  samplingIntervalMinutes: z.number().int().min(1).max(1440).optional(),
  communicationProfile: text(120).optional(),
  calibrationStatus: z.enum(['not_calibrated', 'calibration_recorded', 'needs_review']).optional(),
  calibrationDate: dateOnly,
  calibrationNotes: text(500).optional(),
  coverageNotes: text(500).optional(),
  notes: text(500).optional(),
}).strict().refine((value) => (value.latitude === undefined) === (value.longitude === undefined), {
  message: 'Enter both latitude and longitude, or leave both blank.',
  path: ['latitude'],
});

export const deviceMetadataPatchSchema = z.object({
  plotId: z.string().trim().min(1).max(100).nullable().optional(),
  name: text(100).min(3).optional(),
  locationLabel: text(180).min(3).optional(),
  state: optionalText(80),
  district: optionalText(100),
  locality: optionalText(100),
  latitude: z.number().finite().min(-90).max(90).nullable().optional(),
  longitude: z.number().finite().min(-180).max(180).nullable().optional(),
  installedAt: z.union([dateOnly, z.null()]).optional(),
  calibrationStatus: z.enum(['not_calibrated', 'calibration_recorded', 'needs_review']).optional(),
  calibrationDate: z.union([dateOnly, z.null()]).optional(),
  calibrationNotes: text(500).nullable().optional(),
  coverageNotes: text(500).nullable().optional(),
  notes: text(500).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Provide at least one editable metadata field.');

export const gatewayAssignmentSchema = z.object({
  gatewayId: z.string().trim().min(1).max(100).nullable(),
}).strict();

export const pairingCompleteSchema = z.object({ pairingToken: z.string().min(20).max(256) }).strict();

export const telemetryIngestSchema = z.object({
  readings: z.array(z.object({
    sensorType: installedSensor,
    component: z.enum(['nitrogen', 'phosphorus', 'potassium']).optional(),
    measurementKind: z.enum(['raw', 'calibrated']).optional().default('raw'),
    calibrationMethod: text(500).min(3).optional(),
    value: z.number().finite(),
    unit: z.string().trim().min(1).max(20),
    measuredAt: z.string().datetime({ offset: true }),
  }).strict()).min(1).max(40),
}).strict();

export const heartbeatSchema = z.object({}).strict();
