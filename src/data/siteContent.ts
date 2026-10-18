/**
 * Content for the public website.
 *
 * Everything here describes what the platform actually does in this build. Capability entries carry
 * an explicit `status` so the site never claims a shipped feature where the repository only has a
 * prototype or a documented plan.
 */

export type CapabilityStatus = 'available' | 'demonstration' | 'planned' | 'not_configured';

export interface PlatformModule {
  id: string;
  name: string;
  summary: string;
  details: string[];
  status: CapabilityStatus;
  statusNote: string;
}

export interface Capability {
  id: string;
  name: string;
  summary: string;
  how: string;
  limitation: string;
  status: CapabilityStatus;
}

export const PLATFORM_MODULES: PlatformModule[] = [
  {
    id: 'dashboard',
    name: 'Farm dashboard',
    summary: 'One screen for the selected farm: zones, readings, alerts, tasks and advisories.',
    details: [
      'Every metric is scoped to the farm selected in the workspace.',
      'Missing values display as “—”, never as zero.',
      'Each value carries a source tag: sensor measured, farmer recorded, forecast or sample data.',
    ],
    status: 'available',
    statusNote: 'Working module. Metrics appear only when records exist.',
  },
  {
    id: 'monitoring',
    name: 'Live sensor monitoring',
    summary: 'Stored readings from paired nodes with per-node status, freshness and trend charts.',
    details: [
      'Charts plot real ingested readings over Live, 24-hour, 7-day and 30-day windows.',
      'Node status is derived from backend heartbeats — the interface cannot mark a device online.',
      'Zones without hardware show “waiting for readings” instead of placeholder numbers.',
    ],
    status: 'available',
    statusNote: 'Telemetry plumbing is implemented; readings appear only when hardware posts them.',
  },
  {
    id: 'twin',
    name: 'Digital farm twin',
    summary: 'A working schematic of your plots, sensor nodes, gateways and current zone condition.',
    details: [
      'Select a zone to inspect its measurements, devices, observations and open alerts.',
      'State is rendered from plot records and API device state, so it updates as records change.',
      'This is a data visualisation of field records — not a satellite or drone image.',
    ],
    status: 'available',
    statusNote: 'Data-driven schematic. Satellite imagery is not part of this build.',
  },
  {
    id: 'irrigation',
    name: 'Irrigation guidance',
    summary: 'Rule-based per-zone irrigation decisions with the evidence and assumptions shown.',
    details: [
      'Compares stored moisture with a published stage reference band.',
      'Includes forecast rainfall, your logged rainfall and the recorded irrigation method.',
      'Holds a recommendation when no reading exists rather than guessing.',
    ],
    status: 'available',
    statusNote: 'Advisory only. AGRIPULSE does not control pumps or valves.',
  },
  {
    id: 'soil',
    name: 'Soil health',
    summary: 'Calibrated soil moisture, temperature and NPK readings where available, plus an explicit lab-test list.',
    details: [
      'Nutrient values are never invented: NPK, organic carbon and salinity require a lab test.',
      'Reference bands are labelled as generic guidance, not field calibration.',
      'Table views export to CSV for a farm file or an extension officer visit.',
    ],
    status: 'available',
    statusNote: 'Needs a paired approved sensor node for continuous measurements. Legacy pH records remain readable.',
  },
  {
    id: 'crop-health',
    name: 'Crop health',
    summary: 'Per-crop status, field observations, symptom reports and the disease reference library.',
    details: [
      'Combines recorded crop status, observation severity and open reports.',
      'Links each crop to documented library entries with symptom and management sections.',
      'No photo diagnosis is performed unless a vision service is configured server-side.',
    ],
    status: 'available',
    statusNote: 'No automated diagnosis; library comparison only.',
  },
  {
    id: 'weather',
    name: 'Weather intelligence',
    summary: 'Current conditions, hourly and daily outlook, and crop advisories for the farm location.',
    details: [
      'Provider name, source type and update time are shown with every reading.',
      'Rainfall is forecast data — this build has no physical rain gauge.',
      'Advisories are generated from transparent thresholds, not a trained forecasting model.',
    ],
    status: 'not_configured',
    statusNote: 'Connect a weather endpoint (server-side) to replace the labelled sample forecast.',
  },
  {
    id: 'assistant',
    name: 'AI farming assistant',
    summary: 'Ask questions in plain language and get answers grounded in your own records.',
    details: [
      'Runs in the browser using deterministic rules and the disease library.',
      'Quotes the value, source tag and timestamp when it references a measurement.',
      'Says “no reading recorded” instead of inventing data.',
    ],
    status: 'demonstration',
    statusNote: 'Rule-based assistant. No hosted language model is connected in this build.',
  },
  {
    id: 'devices',
    name: 'Devices & sensors',
    summary: 'Register gateways and nodes, commission them with one-time pairing codes, and audit events.',
    details: [
      'Ownership is derived from the authenticated session; serials are unique per database.',
      'Pairing codes are single-use, expire in ten minutes and are stored hashed.',
      'Telemetry is accepted only for the sensor types a device declares, with bounded values.',
    ],
    status: 'available',
    statusNote: 'Local API prototype. Production needs mTLS-grade provisioning and a managed broker.',
  },
  {
    id: 'alerts',
    name: 'Alerts & notifications',
    summary: 'Every open item with severity, evidence, affected zone or device, and a next step.',
    details: [
      'Alerts are recalculated from records on each load — nothing stays “active” artificially.',
      'Device alerts come from API-derived state only.',
      'Preference switches control highlight topics; SMS and push delivery are not configured.',
    ],
    status: 'available',
    statusNote: 'In-portal alerts only. No SMS, email or push integration.',
  },
  {
    id: 'reports',
    name: 'Reports & analytics',
    summary: 'Zone reports, measurement trends, device performance and CSV or print export.',
    details: [
      'One derived source of truth shared with the dashboard, twin and irrigation modules.',
      'Exports carry the same values shown on screen, including “No data” entries.',
      'Trend charts leave gaps where readings are absent.',
    ],
    status: 'available',
    statusNote: 'Exports run locally in the browser.',
  },
];

export const CAPABILITIES: Capability[] = [
  {
    id: 'stress-screening',
    name: 'Early crop-stress screening',
    summary: 'Flags zones where moisture or root-zone temperature sits outside the band for the recorded growth stage.',
    how: 'Compares stored sensor readings and farmer observations with published agronomic reference bands, and explains the comparison in plain language.',
    limitation: 'Threshold logic, not a trained model. It cannot identify a specific disease or predict yield.',
    status: 'available',
  },
  {
    id: 'anomaly',
    name: 'Reading anomaly checks',
    summary: 'Rejects invalid telemetry and highlights missing or stale readings instead of hiding them.',
    how: 'Values are bounded and quality-checked on ingestion; the interface compares the newest timestamp with the device heartbeat window.',
    limitation: 'Detects missing or out-of-range data, not agronomic causality.',
    status: 'available',
  },
  {
    id: 'irrigation',
    name: 'Irrigation decision support',
    summary: 'Turns a moisture reading and a crop stage into a clear action: irrigate, hold, drain or record more data.',
    how: 'Rule engine combining the recorded stage band, forecast rainfall, logged rainfall and irrigation method.',
    limitation: 'Does not account for canal turns, power availability, labour or soil compaction variability.',
    status: 'available',
  },
  {
    id: 'soil',
    name: 'Soil intelligence',
    summary: 'Separates measurable soil parameters from those that require laboratory analysis.',
    how: 'Displays approved soil measurements and lists parameters that need a laboratory test. Legacy records remain readable.',
    limitation: 'No nutrient, salinity or organic-carbon measurement is available without a lab or handheld kit.',
    status: 'available',
  },
  {
    id: 'library',
    name: 'Crop-health reference library',
    summary: 'A searchable encyclopedia of crop diseases and pests with symptoms, spread and management sections.',
    how: 'Documented reference entries linked to each crop record and to saved symptom reports.',
    limitation: 'Reference material. It is not a diagnosis for a specific plant in your field.',
    status: 'available',
  },
  {
    id: 'vision',
    name: 'Photo-based disease identification',
    summary: 'Would identify likely diseases from farmer photographs.',
    how: 'Requires a trained, validated vision model plus representative local training data.',
    limitation: 'Not implemented. Symptom analysis currently uses clearly labelled demo logic.',
    status: 'planned',
  },
  {
    id: 'yield',
    name: 'Yield estimation',
    summary: 'Would estimate expected harvest from stage, weather and management data.',
    how: 'Requires multi-season yield records tied to calibrated measurements.',
    limitation: 'Not implemented. AGRIPULSE produces no yield figure today.',
    status: 'planned',
  },
  {
    id: 'forecast-model',
    name: 'Learned stress forecasting',
    summary: 'Would forecast stress hours or days ahead from weather and soil trends.',
    how: 'Requires labelled historical outcomes and validation across soils and crops.',
    limitation: 'Not implemented. Current screening is threshold-based and reflects present readings.',
    status: 'planned',
  },
  {
    id: 'voice',
    name: 'Regional-language voice assistance',
    summary: 'Would let farmers ask questions by voice in regional languages.',
    how: 'Requires speech recognition and text-to-speech services reviewed for agricultural vocabulary.',
    limitation: 'Not implemented in this build.',
    status: 'planned',
  },
  {
    id: 'vision-connected',
    name: 'Connected AI provider',
    summary: 'Optional hosted model for richer explanations and photo checks.',
    how: 'Configured by the operator with server-side credentials so no key reaches the browser.',
    limitation: 'Not configured in this environment; the assistant runs locally instead.',
    status: 'not_configured',
  },
];

export const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Record your farm',
    body: 'Add the farm, its plots (field zones), soil type, water source and the crop on each plot with its sowing date and growth stage.',
    outcome: 'A structured farm record becomes the reference for every calculation.',
  },
  {
    step: '02',
    title: 'Register your hardware',
    body: 'Create gateway and sensor-node records, then commission each device with a one-time pairing code from the device page.',
    outcome: 'Only paired devices that send valid heartbeats are ever shown as online.',
  },
  {
    step: '03',
    title: 'Collect readings and observations',
    body: 'Nodes post validated readings to the API. Between readings, record manual observations — moisture feel, leaf symptoms, standing water.',
    outcome: 'Both data streams stay separate and clearly labelled in every screen.',
  },
  {
    step: '04',
    title: 'Follow the twin and the alerts',
    body: 'The dashboard, twin, soil and crop-health modules update from those records and raise alerts with the evidence attached.',
    outcome: 'You see the current condition of each zone without reading raw tables.',
  },
  {
    step: '05',
    title: 'Act, then verify',
    body: 'Use irrigation guidance and advisories to plan field work, then confirm with your own eyes and record what you find.',
    outcome: 'The record gets better each cycle, so guidance gets more relevant to your field.',
  },
];

export const TECHNOLOGY_STACK = [
  {
    title: 'Frontend',
    items: ['React 18 + TypeScript', 'Vite build pipeline', 'Tailwind CSS design tokens', 'Recharts visualisations', 'Responsive 320 px → desktop layouts'],
  },
  {
    title: 'Application API',
    items: ['Node.js + Express 5', 'Session cookies (HttpOnly, SameSite)', 'Zod-validated request schemas', 'Rate limiting and security headers', 'SQLite development persistence'],
  },
  {
    title: 'Device integration',
    items: ['Gateway and node registry', 'One-time pairing codes (hashed at rest)', 'Bearer-secret ingestion prototype', 'Bounded, unit-checked telemetry', 'Event history and audit trail'],
  },
  {
    title: 'Data integrity',
    items: ['Provenance tags on every value', 'No zero-filling of missing data', 'Explicit staleness indicators', 'Separate physical, recorded, forecast and sample streams'],
  },
];

export const ROADMAP_STAGES = [
  {
    stage: 'Shipped in this build',
    status: 'available' as CapabilityStatus,
    items: [
      'Farmer portal with farm, plot, crop, observation and activity records',
      'Device registry, commissioning flow, events and validated telemetry ingestion',
      'Live monitoring, digital twin, soil, crop-health, irrigation, alerts and reports modules',
      'Rule-based assistant, disease reference library and bilingual dictionary',
      'Demonstration marketplace, orders, schemes and news modules',
    ],
  },
  {
    stage: 'Field validation next',
    status: 'planned' as CapabilityStatus,
    items: [
      'Hardware-in-the-loop tests with real nodes and gateways in an instrumented plot',
      'Calibration procedure per sensor type and soil texture, with drift checks',
      'Validation of moisture bands against gravimetric sampling on the same soil',
      'Regional-language content review and farming-calendar refinement',
    ],
  },
  {
    stage: 'Platform hardening',
    status: 'planned' as CapabilityStatus,
    items: [
      'Managed database with migrations, backups and point-in-time recovery',
      'Device attestation, credential rotation and authenticated broker transport',
      'Monitoring, alerting and telemetry retention policies',
      'Reviewed authorization model and independent security testing',
    ],
  },
  {
    stage: 'Intelligence expansion',
    status: 'planned' as CapabilityStatus,
    items: [
      'Validated vision model for common local diseases, with lab-confirmed data',
      'Weather-provider integration for real forecasts at farm coordinates',
      'Multi-season yield and input records for evidence-based recommendations',
      'Advisory interoperability with extension services',
    ],
  },
];

export const IMPACT_AREAS = [
  {
    title: 'Water use',
    body: 'Zone-level moisture evidence helps avoid a full irrigation cycle when the root zone is still inside the band, and highlights zones that actually need water first.',
    measure: 'Measured today: moisture per zone, forecast rain, logged rain. Measured later: water volume per irrigation event vs. yield.',
  },
  {
    title: 'Input efficiency',
    body: 'Records of stage, observations and stress events make it easier to time operations and avoid a repeat pass the field did not need.',
    measure: 'Measured today: task completion and observation cadence. Measured later: input quantities against outcome.',
  },
  {
    title: 'Earlier attention',
    body: 'Alerts surface a below-band reading or a flagged observation on the day it is recorded, when an intervention is still cheap.',
    measure: 'Measured today: time between reading and farmer action. Measured later: outcome change versus control plots.',
  },
  {
    title: 'Record keeping',
    body: 'A structured farm record is useful on its own: it supports crop loans, insurance claims, scheme applications and group discussions.',
    measure: 'Measured today: coverage of zones with data, exportable reports, print-ready zone summaries.',
  },
];

export const HONESTY_POINTS = [
  {
    title: 'Measured and predicted are never merged',
    body: 'Sensor readings, farmer records, forecasts and sample data each carry a visible source tag on every screen and in every export.',
  },
  {
    title: 'Missing data stays missing',
    body: 'A gap is a gap. AGRIPULSE does not write zero into a chart or an average to make a dashboard look complete.',
  },
  {
    title: 'Rule-based means rule-based',
    body: 'Screening and irrigation guidance come from documented thresholds. They are labelled as rule-based, with the assumptions shown.',
  },
  {
    title: 'Unimplemented features are labelled',
    body: 'Photo diagnosis, yield estimation and learned forecasting are marked as planned or not configured rather than demonstrated with mock results.',
  },
  {
    title: 'Devices cannot be declared online by the interface',
    body: 'Status is derived from backend heartbeats. A registration or a pairing code alone never produces a green “online” badge.',
  },
  {
    title: 'No rainfall sensor exists',
    body: 'Precipitation is either provider forecast or a farmer log, and it is labelled as such wherever it appears.',
  },
];

export const CONTACT_REASONS = [
  {
    title: 'Pilot a farm or cluster',
    body: 'Share your location, crops and plot sizes. We will describe exactly what the current build can measure and what it cannot.',
  },
  {
    title: 'Hardware and gateway questions',
    body: 'Ask about supported sensor types, LoRa gateway placement, mounting and power options for field conditions.',
  },
  {
    title: 'Research and exhibition collaboration',
    body: 'Data-provenance design, farmer-facing UX and agronomic validation work are documented and open for review.',
  },
  {
    title: 'Dealer or institutional access',
    body: 'Seller and institutional workspaces share the same design language with role-specific permissions.',
  },
];
