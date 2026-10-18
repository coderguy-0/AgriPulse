-- Additive: retains all existing telemetry and explicitly labels its unspecified conversion.
ALTER TABLE telemetry_readings ADD COLUMN component TEXT;
ALTER TABLE telemetry_readings ADD COLUMN measurement_kind TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE telemetry_readings ADD COLUMN calibration_method TEXT;
-- Exact retries are ignored by the ingestion transaction; existing duplicate history is preserved.
CREATE INDEX IF NOT EXISTS telemetry_retry_idx
  ON telemetry_readings(device_id, sensor_type, measured_at, unit, value);
