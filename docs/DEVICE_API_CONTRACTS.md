# AGRIPULSE Devices & IoT API

## October 2026 contract update

The authoritative new sensor specification is exactly **capacitive soil moisture, soil NPK,
soil temperature and air humidity** (`soil_moisture`, `soil_npk`, `soil_temperature`,
`air_humidity`). Legacy types remain readable but cannot be newly registered or ingested.
NPK requires a `component` (`nitrogen`, `phosphorus`, `potassium`) per reading from one sensor.
Converted moisture/NPK requires `measurementKind: "calibrated"`, `calibrationMethod` and a
registered device whose calibration status is `calibration_recorded`. Raw data uses unit `raw`.
Existing history defaults to `measurementKind: "legacy"` without a retrospective calibration claim.
See [the report](TRANSFORMATION_REPORT.md#6-actual-iot-contract-and-verification) for payloads,
accepted units and limitations. These deliberate validation changes require matching firmware updates.

Exact repeated readings are ignored transactionally and reported in `duplicates`. Historical
rows are not deleted. New `POST /api/device-ingest/heartbeat` accepts bearer authentication and
JSON `{}`; it updates last-seen without inventing sensor readings and supports LoRa gateways.
No hardware has been physically contacted or verified.

## Implementation status

These endpoints are implemented in the repository's local Express API and use SQLite as a development persistence layer. They are **not a production hardware service**: no physical device firmware, gateway broker, field installation, managed database, production monitoring, or external device vendor is connected. A successful API request does not by itself prove that hardware is installed.

The UI calls these routes through relative `/api` URLs. Vite proxies them to the local API during development. Farmer routes require an authenticated farmer session; seller accounts cannot access the device registry.

## Routes

| Method and path | Access | Behavior |
|---|---|---|
| `GET /api/devices?farmId=...` | Farmer session | Lists account-owned devices; optional farm filter is ownership-checked. |
| `POST /api/devices` | Farmer session | Validates and registers non-secret gateway or sensor-node metadata. The server derives owner from the session. New devices are pending. |
| `GET /api/devices/:deviceId` | Farmer session | Returns authorized metadata and up to eight recent readings. |
| `PATCH /api/devices/:deviceId` | Farmer session | Updates allowlisted descriptive metadata only; pairing state and telemetry cannot be set by the browser. |
| `POST /api/devices/:deviceId/gateway` | Farmer session | Assigns or removes a gateway after same-owner, same-farm, type, and retirement checks. |
| `POST /api/devices/:deviceId/pairing-sessions` | Farmer session | Invalidates prior unused codes and creates a one-time pairing code that expires after ten minutes. The raw code is returned only in this response. |
| `POST /api/devices/:deviceId/retire` | Farmer session | Retires the device and revokes its active device credential while retaining history. |
| `GET /api/devices/:deviceId/telemetry?from=...&to=...&limit=...` | Farmer session | Returns stored physical-sensor readings; the API does not fill missing values with zero. |
| `GET /api/devices/:deviceId/events` | Farmer session | Returns an account-scoped audit/event history. |
| `POST /api/device-ingest/pairing/complete` | Short-lived pairing code | Redeems the one-time code and returns a device bearer secret once. The secret is stored as a hash. |
| `POST /api/device-ingest/telemetry` | Device bearer secret | Accepts validated sensor batches (maximum 40 readings), stores them as `physical_sensor`, and updates the heartbeat. |

All routes are implemented in `server/app.mjs`; validation is in `server/schemas.mjs`; device ownership, state transitions, telemetry checks, and event creation are in `server/device-service.mjs`.

## State and data-integrity rules

- `ownerUserId` is derived from the authenticated session; browser-supplied ownership fields are rejected.
- Farms and plots must belong to the signed-in user. A node's gateway must be an active LoRa gateway owned by that user on the same farm.
- Serial identifiers are unique case-insensitively within this SQLite database.
- The server derives status; registration cannot declare a device online. Current derived statuses are `pending_gateway_assignment`, `pending_pairing`, `online`, `offline`, and `retired`.
- `DEVICE_ONLINE_WINDOW_SECONDS` controls the online window (default 300 seconds, clamped to 60–86,400 seconds). A newly completed pairing remains pending until a valid heartbeat arrives.
- Pairing codes and device secrets are opaque random values. Only their hashes are stored. Codes expire after ten minutes and can be redeemed once; active credentials are revoked on re-pair, gateway reassignment, or retirement.
- Telemetry is accepted only for sensor types listed on that device, with known units and bounded values/timestamps. Records include measured and received times, quality, and `physical_sensor` provenance.
- No rainfall sensor is supported in this version. Weather-provider precipitation, farmer observations, demo data, and physical telemetry remain separate streams; the API never converts an unavailable value to zero.
- Workspace snapshots reject credential-like fields, enforce a 1.2 MB limit, and use revision checks to prevent stale overwrites. Device records, events, and telemetry are separate server tables, not localStorage workspace fields.

## Important development and production limitations

This implementation is for local development and verification only:

- The pairing-code and telemetry endpoints are not connected to physical hardware. The pairing completion route is a bearer-code prototype, not device attestation, mTLS, signed firmware, or a production provisioning service.
- Deploy only behind TLS and add an audited physical-device trust mechanism, broker or vendor integration, secrets rotation, durable managed database/backups, monitoring, incident response, and additional abuse controls before real field use.
- The default database is `.data/agripulse.sqlite`; use `AGRIPULSE_DB_PATH` to override it. SQLite files are intentionally ignored by Git.
- The development demo uses the same API/database but is explicitly labelled. Demo events and records are not evidence of a physical installation. Demo-session creation is disabled when `NODE_ENV=production` or `ALLOW_DEMO_SESSIONS=false`.
- Automated connectivity diagnostics, field firmware configuration, cloud MQTT, long-term retention controls, and an `attention_required` status workflow are not implemented.

Run `npm test` for API tests covering account registration, role/ownership checks, workspace revision and sensitive-field rules, pending device state, one-time pairing, telemetry validation, heartbeat-derived status, and development-only demo access.
