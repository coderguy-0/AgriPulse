# AGRIPULSE — Intelligent Farm Digital Twin & Early Crop-Stress Detection

**Tagline:** *See more. Predict earlier. Grow smarter.*

AGRIPULSE is a full-stack smart-agriculture platform: a public product website, an authenticated
farmer workspace, and a seller workspace, all built on one design system. The farmer portal
combines farm and plot records, IoT sensor monitoring, a data-driven digital farm twin, transparent
rule-based crop-stress screening, irrigation guidance, soil and crop health, weather advisories,
alerts, reports, a device registry with secure pairing, a crop-disease reference library, a
bilingual dictionary and a demonstration marketplace.

> **Honest status:** the application code, the local Express API and the SQLite development database
> in this repository are real and tested. Physical device firmware, a production IoT trust service,
> a live weather provider, a hosted AI/vision model, production payments, and managed
> database/infrastructure are **not** included. The interface labels measured, farmer-recorded,
> forecast, rule-based and sample values separately, and shows "no data" instead of inventing a
> number. Read [`docs/WEBSITE_MAP.md`](docs/WEBSITE_MAP.md),
> [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) and
> [`docs/DEVICE_API_CONTRACTS.md`](docs/DEVICE_API_CONTRACTS.md) for detail.

## October 2026 transformation update

See [the implementation, verification and outstanding-work report](docs/TRANSFORMATION_REPORT.md)
for the exact status, file changes and startup commands. The current implementation remains
**SQLite-backed, not PostgreSQL**, and commerce remains a labeled demonstration. Recent changes
include the redesigned agricultural home, approved four-sensor registration, calibration-aware
and retry-safe telemetry, standalone gateway heartbeat, server-side weather integration,
production AI unavailable states, privacy/terms notices and responsive Chromium checks.
Weather requires server-only `WEATHER_PROVIDER=weatherapi` and `WEATHER_API_KEY`; do not put
provider secrets in browser `VITE_*` variables. New converted soil-moisture/NPK payloads now
require documented calibration. See the revised [device contract](docs/DEVICE_API_CONTRACTS.md).

## What the platform does

**Public website** — Home, Platform, AI capabilities, Digital twin, How it works, Technology,
Innovation & impact, Roadmap, About, FAQ, Contact. Each capability page states what is implemented,
what is a demonstration and what is planned.

**Farmer portal**

- **Dashboard** — farm hero with farm switcher, quick actions, measured metrics, a field-intelligence
  strip (zone condition, open alerts, screening highlights, reading trend), condition overview and
  task list.
- **Farms & field zones** — farm, plot, crop, observation, activity and rainfall records with a plot
  schematic and record editing.
- **Digital farm twin** — zone schematic with device markers, selected-zone measurements, devices,
  alerts and latest observation; accessible as a list, explicitly not satellite imagery.
- **Live monitoring** — per-node API status, latest value per configured sensor with unit, source and
  freshness, Live / 24 h / 7 d / 30 d windows, and per-zone measurement coverage.
- **AI insights** — rule-based early crop-stress screening with the evidence, assumptions, method and
  confidence of every finding.
- **Irrigation guidance** — per-zone action (irrigate now / soon, hold, drain, monitor, record a
  reading) with a rainfall log and forecast outlook.
- **Soil health** — moisture, temperature and pH where sensors exist, filterable table with CSV
  export, and an explicit list of parameters that need a laboratory test.
- **Crop health** — derived per-crop condition, open symptom reports, observation log, and search
  across the disease reference library.
- **Weather**, **Alerts**, **Reports & analytics**, **Devices & sensors**, **AI assistant**,
  **Crop disease library**, **Dictionary**, **Marketplace** (demonstration), **Farm & account
  settings**.

**Seller portal** — a seller-focused workspace inside the same Farmer Portal shell and navigation
system, with seller-only API authorization. Dashboard Overview, Catalog & Inventory, Demo / Workspace
Orders, Financials & Payouts, and Store Profile & GSTIN retain their existing state-based behavior,
data, and seller actions while sharing the forest sidebar, contextual Seller Central header, accessible
mobile drawer, and five-item mobile navigation.

## Data provenance (a product requirement, not a disclaimer)

| Tag | Meaning |
|---|---|
| **Sensor measured** | Physical-sensor reading accepted by the ingestion API |
| **Farmer recorded** | Value a farmer entered or confirmed by hand |
| **Forecast** | Weather-provider or forecast estimate for the farm location |
| **Rule-based** | Deterministic AGRIPULSE guidance derived from documented thresholds |
| **Sample data** | Demonstration content shipped with the development build |
| **Not available** | No data exists — rendered as `—`, never as `0` |

Additional rules enforced in code:

- Stored readings are the only source for "measured" values; the client never synthesises telemetry.
- Readings flagged `invalid`, or with non-finite values, are ignored rather than charted.
- Charts leave gaps for missing readings and never bridge them.
- Device status is derived from backend heartbeats; the UI cannot mark a device online.
- Screening compares a single reading against a published stage band and says so, including the
  assumption that the band is not calibrated to the field.
- No rainfall sensor exists: precipitation is either provider forecast or a farmer log.

## Architecture

| Layer | Location | Notes |
|---|---|---|
| Public site + portals | `src/pages`, `src/components` | React 18 + TypeScript, React Router 6 |
| Design system | `src/index.css` (`.ap-*`), `tailwind.config.js`, `src/components/ui` | Tokens and shared primitives, documented in `docs/DESIGN_SYSTEM.md` |
| Derived intelligence | `src/services/fieldIntelligence.ts`, `src/hooks/useFarmScope.ts` | One derived view of the selected farm for every module |
| Telemetry loading | `src/hooks/useFarmTelemetry.ts` | Shared store: one request per device, no polling |
| API | `server/*.mjs` | Express 5, Zod schemas, session cookies, rate limits, SQLite |
| Tests | `server/test`, `scripts/*.test.ts`, `scripts/ssrSmoke.tsx` | API, domain-unit and render smoke tests |

### Database driver

The API prefers `better-sqlite3`. Where native modules cannot be compiled (some sandboxes and CI
images without downloadable Node headers), `server/db.mjs` falls back to Node's built-in
`node:sqlite` through a small compatibility shim that implements `pragma`, `exec`, `prepare().run()`
/ `get()` / `all()`, `transaction()` and `close()`. Both drivers speak identical SQL and positional
parameters, so application behaviour is unchanged. **This fallback is a local-development
convenience only** — production must use a managed database, not a file-backed shim.

## Local development

**Requirements:** Node.js 20.12 or newer (22+ recommended) and npm.

```bash
npm install
npm run dev
```

`npm run dev` starts the unified server (Vite + API) on `0.0.0.0:3000`; the API is embedded and
serves `/api` on the same port. Environment settings: `AGRIPULSE_DB_PATH`,
`DEVICE_ONLINE_WINDOW_SECONDS`, `ALLOW_DEMO_SESSIONS`, `AGRIPULSE_API_PROXY`.

### Verification

```bash
npm run lint          # TypeScript type check + server syntax checks
npm test              # API tests (accounts, roles, ownership, pairing, telemetry, demo access)
npm run test:web      # field-intelligence unit tests (provenance, bands, alerts, screening)
npm run test:render   # renders every public page and portal module to catch render-time breakage
npm run test:all      # all three suites
npm run build         # production bundle
```

`npm run preview` serves the static frontend only; run the API separately when testing authenticated
features. `.data/`, `dist/` and `.smoke/` are excluded from Git.

## Configuration hooks

| Variable | Effect |
|---|---|
| `VITE_WEATHER_API_URL` | Frontend endpoint for a weather service; with no value the app shows a **clearly labelled sample forecast** |
| `VITE_AI_BACKEND_ENDPOINT` | Optional endpoint for richer assistant answers; unused values keep the local rule engine |
| `ALLOW_DEMO_SESSIONS` | Controls the labelled development demo workspace: on by default in development, off by default under `NODE_ENV=production`; set `true` to enable it on a production deployment (demo/staging sites) or `false` to disable it anywhere |

Never place provider credentials in a `VITE_*` variable: those values ship to the browser. Weather,
AI and commerce integrations belong on the server.

## Known limitations (unchanged or additional)

- No physical hardware is connected. Pairing codes and device secrets are a local prototype, not
  device attestation, mTLS or signed firmware.
- No production provisioning, broker, credential rotation, telemetry retention policy or
  hardware-in-the-loop test exists yet.
- Weather, AI/vision, payments, shipping and seller verification are not configured.
- Crop-stress screening, irrigation and advisories are **rule-based**; there is no trained model for
  disease, pest, yield or multi-day stress forecasting.
- Reference moisture bands are published general guidance for mineral soils, not field-calibrated
  thresholds, and the interface says so next to every recommendation.
- Alert preferences control in-portal highlights only; SMS, email and push delivery are not wired.
- The demo workspace shares one local database and is not a production account.

## Deploying

**This is a full-stack app, not a static site.** The frontend is a React SPA, but login, the
farmer/seller portals, devices and weather all talk to the Express API (`/api/*`) served from the
same origin, backed by a SQLite file. You must deploy it to a host that runs the Node server
continuously — static-only hosts cannot run the API, so portals will not work there.

### Render (one click)

The repository ships a [Render Blueprint](render.yaml): in the Render dashboard choose
**New + → Blueprint → select this repository**. It builds with `npm install && npm run build` and
starts with `node server.mjs`, health-checked on `/api/health`. The free plan sleeps after ~15
minutes of inactivity (first request after a sleep takes ~30–60s).

### Any Node platform (Railway, Fly.io, a VPS, …)

```bash
npm install
npm run build            # frontend bundle → dist/
NODE_ENV=production node server.mjs
```

- Node.js 20.12+ (22+ recommended); `PORT` is read from the environment automatically.
- Set `NODE_ENV=production` so the server serves the built frontend from `dist/`.
- The database lives at `AGRIPULSE_DB_PATH` (default `.data/agripulse.sqlite`). It is a local
  file: data survives restarts but resets when the disk/instance is recreated. Back it up or use a
  managed database for real deployments (see below).
- Optional server settings: `WEATHER_PROVIDER=weatherapi` + `WEATHER_API_KEY`, `ALLOW_DEMO_SESSIONS`,
  `DEVICE_ONLINE_WINDOW_SECONDS`, `WEB_ORIGINS`.
- **Demo accounts:** the one-click "Open Farmer Demo" / "Open Seller Demo" launchers on the login
  page are a labelled development workspace and are off by default when `NODE_ENV=production`. To
  show them on a deployed demo/staging site, set `ALLOW_DEMO_SESSIONS=true` (the shipped
  `render.yaml` blueprint already does this).

### What will NOT work: static-only hosts

- **Vercel / Netlify / GitHub Pages (static):** `vercel.json` rewrites every route to
  `index.html`, so only the *public marketing pages* render. Every `/api/*` call receives HTML
  instead of JSON — the farmer/seller portals, login, devices and live monitoring do not function.
  A file-backed SQLite database is also not durable on serverless runtimes. Making the full app
  run on such a host requires re-architecting the API as serverless functions with a managed
  database; that has not been done.
- If a static deploy shows a **blank white page**, the host is serving the wrong directory
  (the source `index.html` instead of `dist/`) or the wrong asset base path (GitHub Pages needs
  `base: '/<repo>/'` in `vite.config.ts`).

## Before any production deployment

Use a managed database with migrations, backups and point-in-time recovery; TLS everywhere; a
production session and cookie policy; account verification, recovery and MFA for administrators;
device attestation with credential rotation and an authenticated broker; monitoring, log retention
and telemetry retention policies; a reviewed authorization model; independent security testing; and
real-device acceptance tests. Do not describe this repository as production-ready agricultural,
commerce, weather, AI or hardware infrastructure.
