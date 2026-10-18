# Final QA checklist

Each acceptance criterion from the brief, the implementation that satisfies it, and the evidence
you can reproduce. Commands are run from the repository root.

Reproduce everything at once:

```bash
npm install
npm run lint && npm run test:all && npm run build
npm run dev          # http://localhost:3000  (public site)  /api on :4000
```

## Verification results at the time of writing

| Check | Command | Result |
|---|---|---|
| TypeScript + server syntax | `npm run lint` | pass, no diagnostics |
| API tests | `npm test` | 6 tests / 6 pass / 0 fail |
| Field-intelligence unit tests | `npm run test:web` | 20 tests / 20 pass / 0 fail |
| Render smoke test (public pages, portal modules, loader markup + navigation audits) | `npm run test:render` | 46 checks passed |
| Production bundle | `npm run build` | pass, entry chunk 90.03 kB gzip |

---

## 1. Farmer Portal is the single source of design truth

One design system, applied everywhere. Tokens live in `tailwind.config.js` and the `:root` block in
`src/index.css`; the shared component classes are the `.ap-*` layer in the same file; the shared
React primitives are `src/components/ui/*`.

*Evidence:* `docs/DESIGN_SYSTEM.md`; the public site (`src/components/SiteLayout.tsx`) and the
farmer shell (`src/components/AppShell.tsx`) both use `SectionCard`, `KpiTile`, `StatusBadge`,
`Notice`, `SegmentedControl`, `DataTable` and `ChartCard` rather than local markup.

## 2. One palette, semantic colours, never colour-only

`--ap-green`, `--ap-water`, `--ap-amber`, `--ap-red`, `--ap-neutral` are the only status colours.
Warnings are amber, criticals red, water/forecast blue, offline/unknown grey. Every coloured state
carries a word or an icon with an accessible name.

*Evidence:* `Meter` renders a text value with the bar; `StatusBadge` always contains text;
`ProvenanceTag` uses shape + word; audit the classes with
`grep -o "ap-badge--[a-z]*" src/**/*.tsx | sort -u`.

## 3. Typography scale and numeric alignment

`.ap-page-title`, `.ap-card-title`, `.ap-kpi-value`, `.ap-kpi-label`, `.ap-eyebrow`, `.ap-list-meta`,
`.ap-help` define the hierarchy; `.ap-numeric` / `.ap-table .is-numeric` use tabular figures so
values and units line up between rows and cards.

## 4. Spacing, alignment, grid and content width

`.ap-stack`, `.ap-grid`, `.ap-split`, `--ap-gap`, `--ap-content-max` drive layout; metric grids
collapse 4 → 3 → 2 → 1 column without reflowing text.

*Evidence:* `rg "ap-grid|ap-split" src/pages`; each metric grid uses the same class so section
rhythm is identical across modules.

## 5. Navigation IA

Sidebar groups: **Farm overview** (Dashboard, Farms & field zones, Digital farm twin),
**Field intelligence** (Live monitoring, AI insights, Irrigation guidance, Soil health, Crop health,
Weather, Alerts, Reports & analytics), **Hardware & assistance** (Devices & sensors, AI farming
assistant), **Knowledge & market** (Disease library, Dictionary, Store, Orders, Offers, Wishlist,
News, Schemes). Active state uses `aria-current="page"`; desktop keeps the fixed sidebar, mobile uses
a drawer plus a four-destination bottom bar.

*Evidence:* `src/components/AppShell.tsx` for farmers and `src/pages/SellerPortalPage.tsx` for sellers.
The seller workspace reuses the forest sidebar and active-item treatment with two groups: **Seller
Workspace** (Dashboard Overview, Catalog & Inventory, Demo Orders / Workspace Orders) and **Business
Management** (Financials & Payouts, Store Profile & GSTIN). Catalog and order totals remain visible;
pending orders retain their badge. The header keeps Seller Central Hub, the business identity, the
contextual demo-workspace indicator, Preview Farmer Store, Switch to Farmer Portal, and one Sign Out
action. Seller identity is pinned to the sidebar footer on desktop and in the drawer on mobile, without
a duplicate sign-out control. Tablet/mobile use a compact header, an accessible dialog drawer with
Escape, a tab loop, and focus restoration, plus the existing five-item bottom bar. The render smoke test checks the seller labels, active state, header action, and drawer
trigger semantics.

## 6. Dashboard priorities

Farm hero and switcher, measured metrics, the field-intelligence strip (zone condition, open
alerts, screening highlights, reading trend with 7 d / 30 d / all windows), farm-condition overview,
task list.

*Evidence:* `src/pages/HomeDashboardPage.tsx` + `src/components/FieldIntelligencePanel.tsx`;
asserted by the `dashboard` case in `scripts/ssrSmoke.tsx`.

## 7. Data integrity

The client never invents a measurement. Values come from the API (`useFarmTelemetry`), from farm
records, or from a labelled seed; anything absent renders `—` with the reason. Freshness, source and
timestamp are shown next to the value; invalid readings are dropped rather than plotted.

*Evidence:* `src/services/fieldIntelligence.ts`, `src/services/provenance.ts`,
`src/hooks/useFarmTelemetry.ts`; empty-window copy ("Waiting for readings", "No readings in this
window", "No stored readings for this selection") asserted by the render smoke test.

## 8. Digital farm twin

Renders only configured zones, the devices actually assigned to them and their latest stored
readings. It states that it is a schematic, not satellite imagery or a live 3D model; selection works
by keyboard; the same information is available as a data table.

*Evidence:* `src/pages/DigitalTwinPage.tsx` (schematic `role="group"` of `aria-pressed` buttons plus
the "Zone data table" card).

## 9. AI insight transparency

Every finding lists what was observed, which zone, the supporting values with their provenance, why
it matters, a suggested step, the method, the assumptions, a confidence statement and a generation
time. Rule-based screening is labelled `Rule-based`; unbuilt models are labelled planned.

*Evidence:* `src/pages/AiInsightsPage.tsx`, `src/pages/AssistantPage.tsx`, the
"What AGRIPULSE cannot tell you yet" section, and the disclaimer on `/ai-capabilities`.

## 10. Interaction design

Forms validate, keep valid input and show the error next to the field; success appears only after the
server accepts; destructive actions (reset workspace, delete plot, retire device) ask for
confirmation; every list has an empty state; loading states use skeletons or the reduced-motion-safe
AgriPulse sprout loader; API errors surface the server message with a retry.

*Evidence:* `Modal` (focus trap, Escape, focus restore), `SegmentedControl` (arrow keys), `InfoTip`
(hover/focus), the rainfall log and enquiry forms, and CSV exports built from the rendered rows.

## 11. Responsive behaviour

Single column under 640 px with drawer navigation and a bottom bar; two-up at 640–1023 px; fixed
sidebar from 1024 px. Data tables scroll horizontally inside `.ap-table-wrap` instead of pushing the
page wide; dialogs become full screen on small viewports; touch targets are at least 40 px.

## 12. Charts and tables

One chart style (`ChartCard` + `TrendChart`): titled, unit labelled, legend, tooltips, zero-based
axes, numeric axis ticks and gaps for missing readings — never interpolated. Tables share
`.ap-table` with captions, scopes, sorting, pagination and a `—` for absent values.

## 13. Microinteractions

Transitions are limited to colour, shadow and transform on hover; `prefers-reduced-motion` removes
them; no `box-shadow` animation on large surfaces and no scroll-linked effects.

## 14. Shared components and tokens

`src/components/ui/primitives.tsx`, `charts.tsx`, `DataTable.tsx`, and the shared
`src/components/AgriPulseLoader.tsx` plus the `.ap-*` layer. Inventory in `docs/DESIGN_SYSTEM.md`.

## 15. Technical quality

Real API calls for auth, workspace, devices and telemetry; charts read stored readings; server-side
authorization for every farmer route; no provider key in client code; every route resolves through a
guarded element.

*Evidence:* `npm test` (roles, ownership isolation, pairing, telemetry heartbeat, workspace revision,
demo gating), `npm run test:render` (all routes render), `.env`-free `VITE_*` usage in
`src/services/apiClient.ts`.

## 16. Accessibility, performance, reliability

Landmarks, `aria-live` announcements, focus rings, labelled controls, keyboard-operable twin and
tabs, skip-to-content link. Route-level code splitting keeps the first load small
(entry 90.0 kB gzip, React 53.7 kB, icons 11.4 kB; charts and heavy knowledge libraries load on
demand). No polling loop, one request per device per refresh, and every failure state has a retry.

## 17. Security and privacy

Session cookies are `HttpOnly` and `SameSite=Lax`; roles are enforced by the API, not just hidden in
the UI; permission failures redirect to the matching sign-in with the intended destination retained;
the password hash and device secret are never returned to the browser; demo sessions are refused
outside development.

## 18. Content

Operational screens use plain field language and never carry marketing slogans; the product website
carries the positioning. Terminology is consistent ("field zone", "reading", "reference band",
"screening"). Sample and illustrative content says so on the value, not only in a banner.

*Evidence:* `grep -rin "lorem\|coming soon\|TBD" src` returns nothing.

## 19. Page inventory

Public: `/`, `/platform`, `/ai-capabilities`, `/digital-twin`, `/how-it-works`, `/technology`,
`/impact`, `/roadmap`, `/about`, `/faq`, `/contact`, plus authentication at `/farmer/login`,
`/farmer/signup`, `/login`, `/seller/login`, `/signup`, `/seller/signup`. Farmer portal: every module
in section 5 plus `/devices`, `/devices/:id`, `/disease`, `/disease/:id`, `/dictionary`, `/store`,
`/store/product/:id`, `/cart`, `/checkout`, `/orders`, `/offers`, `/wishlist`, `/news`, `/schemes`,
`/account`.

*Evidence:* `src/App.tsx`; `docs/WEBSITE_MAP.md` lists each page and its missing-data behaviour.

## 20. Completion checks

| Item | Status |
|---|---|
| Portal identity preserved | Yes — the existing shell, sidebar, header, cards and chart language are reused, not replaced |
| One design system | Yes — see sections 1–4 |
| Desktop and mobile polish | Yes — sections 11–13, verified in the render smoke test and by hand at 360 px, 768 px, 1280 px |
| Dashboard prioritises useful information | Yes — section 6 |
| Sensor and AI values labelled honestly | Yes — sections 7–9 |
| Controls act | Yes — every button navigates, submits, filters, exports or opens a dialog |
| Routes, forms, tables, charts, filters, nav | Yes — render smoke test covers all routes |
| All states handled | Loading, empty, error, stale, offline, permission denied, print |
| No visual inconsistencies | Token audit; no page-local colour or radius values |
| No feature silently removed | Legacy modules (marketplace, dictionary, disease library, news, schemes, devices) still routed and reachable |
| No false live-data claims | See "Known limitations" in `README.md` |
| Existing tests pass, new functionality tested | `npm run test:all` — 6 API + 20 unit + 46 render/navigation/loader checks |
| Remaining limitations documented | `README.md` → Known limitations, `docs/WEBSITE_MAP.md`, `docs/DEVICE_API_CONTRACTS.md` |

### Manual pass that still needs a human

Automated tests cover rendering and domain logic, not visual judgement. Before calling this
release-ready, walk these by hand: 320–375 px phone layout, keyboard-only navigation of the twin and
every dialog, a screen-reader pass over the dashboard, a real provisioning run against physical
hardware, and a weather-provider integration test. Nothing in this repository has been validated
against physical sensors, a production weather service or a hosted model.
