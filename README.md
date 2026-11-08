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
parameters, so application behaviour is unchanged. **The fallback is a local-development
convenience only.** Deploy with `better-sqlite3` on a persistent, backed-up, single-instance disk;
use a managed client/server database before scaling to multiple API instances.

## Local development

**Requirements:** Node.js 20.12 or newer (22+ recommended) and npm.

```bash
npm ci
npm run db:setup   # optional locally: startup also runs additive migrations + demo seeding
npm run dev
```

`npm run dev` starts the unified server (Vite + API) on `0.0.0.0:3000`; the API is embedded and
serves `/api` on the same port. Browser code uses relative `/api` URLs, never a production
localhost address. See `.env.example` for all supported environment settings.

With demo access enabled, the intentional public demo credentials are:

| Portal | Email | Password |
|---|---|---|
| Farmer | `farmer.demo@agripulse.in` | `AgriPulseDemo!2026` |
| Seller | `seller.demo@agripulse.in` | `AgriPulseDemo!2026` |

These are not secret production credentials. Each account has one role, no administrative access,
and a separate workspace. The login-page launchers submit these credentials through the ordinary
`/api/auth/login` endpoint; they do not bypass authentication. `npm run db:setup` is idempotent and
refuses to overwrite an unrelated account that already owns a reserved demo email.

### Verification

```bash
npm run lint          # TypeScript type check + server syntax checks
npm test              # API, authorization, listing validation, migration and demo-seed tests
npm run test:web      # field-intelligence unit tests (provenance, bands, alerts, screening)
npm run test:render   # renders every public page and portal module to catch render-time breakage
npm run test:all      # API + field-intelligence + render suites
npm run build         # production bundle
```

For browser verification, first start the production server, then run
`TEST_BASE_URL=http://127.0.0.1:3000 npm run test:browser` and
`TEST_BASE_URL=http://127.0.0.1:3000 npm run test:auth-browser` in another terminal. The second
suite checks visible demo login, role isolation, Seller/Farmer persistence, save retry, expired
sessions and logout; use a disposable test database because it creates unique records. The test URL
is a local test setting, not a browser-facing API configuration. `npm run preview` is only a static Vite
preview with a development proxy; use `NODE_ENV=production npm start` for full-stack verification.
`.data/`, `dist/` and `.smoke/` are excluded from Git.

## Configuration hooks

| Variable | Effect |
|---|---|
| `PORT`, `HOST` | Unified HTTP listener; defaults to `3000` and `0.0.0.0` |
| `AGRIPULSE_DB_PATH` | SQLite file; defaults to `.data/agripulse.sqlite`. Use an absolute persistent-disk path in deployment |
| `TRUST_PROXY` | Set `true` only behind a trusted one-hop proxy such as Render; otherwise leave `false` |
| `WEB_ORIGINS` | Optional comma-separated **additional** browser origins. The app's own origin is accepted automatically; wildcard origins and production localhost values are not needed |
| `WEATHER_PROVIDER`, `WEATHER_API_KEY` | Server-only WeatherAPI configuration (`WEATHER_PROVIDER=weatherapi`). Without both, the API reports weather unavailable; only a demo user can explicitly choose the labelled demonstration forecast |
| `DEVICE_ONLINE_WINDOW_SECONDS` | Trusted-heartbeat freshness window, default `300` |
| `VITE_DEMO_MODE` | Build-time flag (`VITE_DEMO_MODE=true npm run build`): renders the labelled demo launchers in a production build. Always on in development |
| `ALLOW_DEMO_SESSIONS` | Runtime demo credential gate: on by default in development, off by default under `NODE_ENV=production`; set `true` only for an intentional public demo/staging deployment |

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
- The two public demo identities use separate role-specific workspaces in one database. They are
  not private production accounts; never enter real personal, financial or device credentials.

## Deploying

**This is a full-stack app, not a static site.** The frontend is a React SPA, but login, the
farmer/seller portals, devices and weather all talk to the Express API (`/api/*`) served from the
same origin, backed by a SQLite file. You must deploy it to a host that runs the Node server
continuously — static-only hosts cannot run the API, so portals will not work there.

### Render (persistent demo deployment)

The repository ships a [Render Blueprint](render.yaml) for a single Node service with a 1 GB
persistent disk. **A persistent disk requires a paid web-service plan; a free/ephemeral instance
cannot provide durable login or workspace persistence.**

1. Push this branch to the repository you will deploy, then choose **New + → Blueprint → select the
   repository** in Render and apply `render.yaml`.
2. Review the paid plan and disk before creating the service. The blueprint mounts the disk at
   `/var/data` and sets `AGRIPULSE_DB_PATH=/var/data/agripulse.sqlite`.
3. Render runs `npm ci && npm run build`. `VITE_DEMO_MODE=true` is supplied at build time, so the
   labelled Farmer and Seller launchers are visible.
4. Each start runs `npm run db:setup && node server.mjs`. Setup applies additive migrations and
   idempotently ensures the two role-specific demo workspaces; it does not reset workspace data.
   `ALLOW_DEMO_SESSIONS=true` enables the public demo credentials at runtime.
5. After deployment, open `https://<your-service>.onrender.com/api/health` and require a JSON
   success response, then open `/farmer/login` and `/login`. Test both demo launchers, reload each
   workspace, sign out, and sign in again. A blueprint/configuration check is not a substitute for
   this hosted verification.

`TRUST_PROXY=true` is set because Render terminates TLS in front of Node. Same-origin `/api`
requests need no `WEB_ORIGINS` entry. Keep the service at one instance while using SQLite; attach
backups/snapshots and do not horizontally scale or use a second process against the same file.
Before converting an existing ephemeral deployment, export and securely back up its SQLite file.
Attaching a new empty disk does not migrate the old file automatically; restore it only through a
reviewed backup/restore procedure, never by overwriting a live database.

### Any Node platform (Railway, Fly.io, a VPS, …)

```bash
npm ci
VITE_DEMO_MODE=true npm run build       # omit/set false to hide demo launchers
export NODE_ENV=production
export AGRIPULSE_DB_PATH=/absolute/persistent-path/agripulse.sqlite
export ALLOW_DEMO_SESSIONS=true         # intentional public demo only; false otherwise
npm run db:setup                        # additive migrations + idempotent demo initialization
npm start                               # serves dist/ and /api on 0.0.0.0:${PORT:-3000}
```

- Use Node.js 20.12+ (22+ recommended), TLS, and a persistent backed-up filesystem. The platform
  may inject `PORT`; `HOST` defaults to `0.0.0.0`.
- Set `TRUST_PROXY=true` only for one trusted proxy hop. Leave it false for direct exposure.
- Set `WEB_ORIGINS` only for additional explicitly trusted browser origins; same-origin requests
  work without it. Never use a wildcard with credentialed sessions.
- Demo access requires **both** `VITE_DEMO_MODE=true` at build time and
  `ALLOW_DEMO_SESSIONS=true` at runtime. Disable both and rebuild for a non-demo deployment.
- Optional real weather: server-only `WEATHER_PROVIDER=weatherapi` plus `WEATHER_API_KEY`.
- Run `npm run lint && npm run test:all && npm run build` before deployment, then repeat login,
  authorization, reload persistence and logout checks against the actual hosted URL.

### What will NOT work: static-only hosts

- **Vercel / Netlify / GitHub Pages (static):** these configurations can serve the built public
  SPA, but they do not deploy the Express API or provide durable SQLite storage. The SPA rewrites
  deliberately exclude/preserve `/api/*`; those requests therefore return the host's API 404/error
  rather than being disguised as a successful frontend response. Login, portals, devices and live
  monitoring do not function without the Node API. Making the full app serverless requires a new
  API deployment and a managed database; that has not been done.
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
