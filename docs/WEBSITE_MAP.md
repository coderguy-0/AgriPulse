# AGRIPULSE website and portal map

This document lists every page in the running application, what it does, and the state it shows
when data is missing. Routes marked **public** are visible without an account; the rest require a
signed-in session with the matching role.

## Public website (`SiteLayout`)

Shared chrome: sticky header with primary navigation plus About / FAQ / Contact, session-aware
call-to-action, mobile menu, and a footer with product, company and registration links.

| Route | Page | Purpose | Honest-state behaviour |
|---|---|---|---|
| `/` | **Home** | Positioning, module overview, five-step flow, transparency rules | Signed-in visitors are forwarded to their workspace |
| `/platform` | **Platform** | Module catalogue with per-module status and detail lists | Each module states "what it still needs" |
| `/ai-capabilities` | **AI capabilities** | Ten capabilities with how-it-works and limitation text | Planned features are labelled `Planned — not implemented` |
| `/digital-twin` | **Digital twin** | Explains the twin, plus explicit "does show / does not show" lists | States it is not satellite imagery |
| `/how-it-works` | **How it works pipeline** | Five steps with quality rules, worked example with labelled values | Example values are declared illustrative |
| `/technology` | **Technology** | Stack, data flow, security, data-integrity rules (tabs) | Lists production prerequisites |
| `/impact` | **Innovation & impact** | Impact areas with today's measurable metric vs. future validation | No outcome claims before control-plot work |
| `/roadmap` | **Roadmap** | Shipped / field validation / hardening / intelligence stages | Unshipped items are flagged, not simulated |
| `/about` | **About** | Why the platform exists, principles, build status | Certification status stated as "none claimed" |
| `/faq` | **FAQ basics** | Searchable, grouped Q&A covering data, AI, devices, weather | Answers describe current behaviour only |
| `/contact` | **Contact** | Enquiry form with validation | No mail service is configured; the form validates and lets you copy the summary |
| `*` | **Not found** | Recovery page with popular destinations | Renders inside the public chrome |

## Authentication

| Route | Page | Notes |
|---|---|---|
| `/farmer/login` | Farmer sign in | Development demo launcher, seller sign-in cross-link, website-home link |
| `/farmer/signup` | Farmer registration | Role is fixed to farmer |
| `/login`, `/seller/login` | Seller sign in | Seller workspace entry |
| `/signup`, `/seller/signup` | Seller registration | Seller role only |

## Farmer portal (`AppShell`)

Sidebar groups: **Farm overview**, **Field intelligence**, **Hardware & assistance**,
**Knowledge & market**; mobile keeps a drawer plus a four-destination bottom bar. The header shows
breadcrumb context, quick search, a data-freshness indicator, weather, cart, alerts and profile menu.

| Route | Page | Purpose | Missing-data behaviour |
|---|---|---|---|
| `/home` | **Dashboard** | Farm hero, quick actions, metrics, field-intelligence strip (zones, alerts, screening, trend), condition overview, tasks | Metric values render `—` with a reason; trend card explains that readings arrive only from paired nodes |
| `/farm` | **Farms, plots & records** | Farm/plot/crop/observation/activity records and the plot schematic | Ongoing farm-record workflow, unchanged |
| `/twin` | **Digital farm twin** | Zone schematic, selected-zone detail, device markers, alerts, latest observation | Zones without sensors show "no device assigned" |
| `/monitoring` | **Live monitoring** | Per-node status, latest value per sensor with freshness, trend windows, zone coverage | "Waiting for readings" per node; chart empty states per window |
| `/insights` | **AI insights** | Rule-based screening findings with evidence, assumptions and confidence | Findings marked "Not enough data" instead of "low risk" |
| `/irrigation` | **Irrigation guidance** | Per-zone action with evidence list, rainfall log form, forecast outlook | Action becomes "Record a reading" when no moisture value exists |
| `/soil` | **Soil health** | Measurement table with filters and CSV export, per-zone condition, lab-test list | pH and nutrients show "No pH sensor paired" / "Lab test required" |
| `/crop-health` | **Crop health** | Per-crop derived condition, open reports, observation log, library search | Crops without data show "No sensor reading or observation yet" |
| `/weather` | **Weather** | Existing agro-met intelligence page inside the unified shell | Provider name and source type are always shown |
| `/alerts` | **Alerts** | Severity and category filters, evidence and next step per item, CSV export, preference switches | States that delivery channels are not configured |
| `/reports` | **Reports** | Trend chart, zone report table, device performance, latest value per sensor, CSV/print | "No stored readings for this selection" |
| `/assistant` | **AI assistant** | In-page conversation with the rule engine, suggested prompts, source list, limitation disclosures | Explains it runs locally with no hosted model |
| `/devices`, `/devices/:id` | **Devices & sensors** | Registry, commissioning wizard, telemetry, events | Existing behaviour preserved (API-derived status only) |
| `/dictionary`, `/disease`, `/disease/:id` | **Knowledge** | Dictionary and 100-disease encyclopedia | Reference material, not diagnosis |
| `/store`, `/store/product/:id`, `/cart`, `/checkout`, `/orders`, `/offers`, `/wishlist` | **Marketplace** | Demonstration commerce flow | Demonstrated as such throughout |
| `/news`, `/schemes` | **News & schemes** | Sample advisories and scheme discovery | Labelled sample/official-source notes |
| `/account` | **Farm & account settings** | Profile, preferences, area units, notification topics, workspace reset | States demo-account scope |

## Seller portal

| Route | Page | Notes |
|---|---|---|
| `/seller`, `/seller/dashboard` | Seller workspace | Farmer-style forest sidebar/header and responsive drawer for Dashboard Overview, Catalog & Inventory, Demo / Workspace Orders, Financials & Payouts, and Store Profile & GSTIN; preserves seller role guard, account actions, and existing state-based section switching |

## Cross-cutting UI states

- **Loading** — skeletons for panel content, the agriculture-themed `AgriPulseLoader` (including button use), and `role="status"` announcements.
- **Empty** — every list and table has a written empty state with the next useful action.
- **Error** — API failures surface the server message with a retry action (`Refresh readings`).
- **Offline / stale** — readings older than the heartbeat window are labelled with their age.
- **Permission denied** — protected routes redirect to the correct sign-in screen and preserve the
  intended destination; role mismatch redirects to the user's own portal.
- **Print** — navigation, actions and dialogs are hidden (`.ap-no-print`), content prints in full.
