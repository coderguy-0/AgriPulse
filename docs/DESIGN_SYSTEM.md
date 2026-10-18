# AGRIPULSE design system

The Farmer Portal is the single source of design truth for the whole product. The public website,
the seller workspace, the authentication screens and every farmer module reuse the same tokens and
components so that no page looks like it came from a different template.

## Design tokens

Tokens live in two places and must not be duplicated elsewhere:

| Layer | Location | Purpose |
|---|---|---|
| Tailwind theme | `tailwind.config.js` | `agripulse.*`, `forest.*`, `leaf.*`, `earth.*`, `harvest.*` scales, `fontFamily.sans`, `boxShadow.soft/leaf` |
| CSS custom properties | `src/index.css` → `@layer base { :root { … } }` | `--ap-green`, `--ap-page`, `--ap-border`, `--ap-text-muted`, radii, shadows, `--ap-gap`, `--ap-content-max` |
| Component classes | `src/index.css` → `.ap-*` | Buttons, cards, chips, badges, tables, meters, timelines, dialogs, twin canvas, site chrome |

### Colour semantics

| Role | Token | Used for |
|---|---|---|
| Primary action | `--ap-green` `#4c8b3c` | Primary buttons, active nav, in-band readings |
| Strong / deep green | `--ap-green-strong` `#285b32`, `--ap-green-deep` `#173e27` | Headings on tinted surfaces, sidebar, site footer |
| Soft green | `--ap-green-soft` `#eef6e9` / `--ap-green-tint` `#f6faf3` | Low-emphasis surfaces, icon chips, hover fills |
| Surface / page | `--ap-surface` `#ffffff`, `--ap-page` `#f4f7f0` | Cards, page background |
| Text | `--ap-text` `#1b2b20`, `--ap-text-muted` `#6b7a6d`, `--ap-text-soft` `#8b988c` | Headings, body, metadata |
| Water / information | `--ap-water` `#2f6f9f` | Moisture, forecast, informational notices |
| Warning | `--ap-amber` `#b4761a` | Developing risk, values below/above band by a small margin |
| Critical | `--ap-red` `#b4413c` | Well-below-band readings, waterlogging, critical alerts |
| Neutral / unknown | `--ap-neutral` `#6f7a72` | Offline devices, unavailable values, muted badges |

Rules:

- Colour never carries meaning alone: every coloured state is paired with text (`In band`, `Watch`,
  `Action`, `No data`) or an icon with an accessible label.
- Green means "inside the reference band at the recorded stage" — it does **not** mean the crop is
  guaranteed healthy or that a system is verified.
- Gradients are used only where the original Farmer Portal already used them (sidebar, dashboard
  hero, primary button, site hero).

### Typography

One family stack (`Inter, Manrope, system-ui, …`). Scale:

| Element | Class | Size |
|---|---|---|
| Page title | `.ap-page-title` | `clamp(21px, 2.1vw, 27px)` / 800 |
| Section title (site) | `.ap-site-section-title` | `clamp(19px, 2vw, 24px)` / 800 |
| Card title | `.ap-card-title` | 14.5px / 800 |
| Body | default | 12.5–13px, line-height 1.6–1.75 |
| Metric value | `.ap-kpi-value` | 27px / 800, tabular numerals |
| Label / eyebrow | `.ap-kpi-label` `.ap-eyebrow` | 10–10.5px / 800, uppercase, letter-spaced |
| Helper / metadata | `.ap-help` `.ap-list-meta` | 10.5px |

Numeric measurements always use tabular figures (`.ap-numeric`, `.ap-table .is-numeric`) so digits
line up between rows and cards. Units are rendered next to the value, never inside it.

### Spacing, radii, elevation

- Section gap: `--ap-gap` (18px) via `.ap-stack`, `.ap-grid`, `.ap-split`.
- Card padding: 18px (`.ap-card`); KPI padding 15–16px.
- Radii: `--ap-radius-sm` 10px (chips, small buttons), `--ap-radius` 14px (inputs, KPI tiles),
  `--ap-radius-lg` 20px (cards), `--ap-radius-xl` 26px (dialogs, heroes).
- Elevation: `--ap-shadow-sm` for cards, `--ap-shadow` on hover, `--ap-shadow-lg` for dialogs.
  No more than one elevation step changes on hover.

## Component inventory

Most primitives are in `src/components/ui/`; the shared agriculture loader is in `src/components/AgriPulseLoader.tsx` with its co-located CSS.

| Component | File | Notes |
|---|---|---|
| `PageHeader` | `primitives.tsx` | Breadcrumbs, eyebrow, title, description, page actions |
| `SectionCard` | `primitives.tsx` | The single card surface (`default`, `quiet`, `tint`) |
| `KpiTile` | `primitives.tsx` | Metric tile with label, value, unit, icon tone, footer |
| `ProvenanceTag` | `primitives.tsx` | `measured` / `recorded` / `forecast` / `rule` / `demo` / `unavailable` |
| `StatusBadge` | `primitives.tsx` | Tones: default, ok, info, warn, danger, muted, outline |
| `Notice` | `primitives.tsx` | Info / success / warning / danger / neutral inline messages |
| `EmptyState`, `Skeleton`, `SkeletonBlock`, `Spinner` | `primitives.tsx` | Loading and empty states; `Spinner` uses the agriculture loader |
| `AgriPulseLoader` | `components/AgriPulseLoader.tsx` + `.css` | Sprout, rotating field ring and earth accents; inline, button and panel sizes; reduced-motion safe |
| `Meter` | `primitives.tsx` | Threshold meter with `role="meter"` and a numeric value |
| `SegmentedControl`, `Tabs` | `primitives.tsx` | Keyboard-navigable filters and tabs |
| `Modal` | `primitives.tsx` | Focus trap, Escape to close, focus restore, scroll lock |
| `InfoTip`, `Accordion`, `KeyValueList` | `primitives.tsx` | Tooltips, disclosures, spec lists |
| `DataTable` | `ui/DataTable.tsx` | Sorting, pagination, horizontal scroll, empty state |
| `ChartCard`, `TrendChart`, `ChartLegend` | `ui/charts.tsx` | One chart style: axis units, tooltips, gaps for missing data |
| `FieldIntelligencePanel` | `components/FieldIntelligencePanel.tsx` | Dashboard strip: zones, alerts, screening, trends |

Domain helpers:

- `src/services/provenance.ts` — provenance kinds, freshness classification, value formatting.
- `src/services/fieldIntelligence.ts` — zone snapshots, irrigation assessment, alerts, screening,
  soil rows, crop-health entries, farm overview.
- `src/hooks/useFarmScope.ts` — one derived view of the selected farm for every module.
- `src/hooks/useFarmTelemetry.ts` — single shared store for stored sensor readings.
- `src/utils/exportData.ts` — CSV export of exactly the rows on screen.

## Interaction states

Every interactive element defines hover, focus-visible, active, disabled and loading states:

- Focus: `:focus-visible { outline: 3px solid rgba(114,169,75,.7); outline-offset: 2px }` globally.
- Disabled: `opacity: .55` plus `cursor: not-allowed` and a disabled attribute.
- Loading: the shared agriculture-themed sprout loader replaces the plain circular throbber; button text stays explicit (`Checking readings…`). The animation stops under `prefers-reduced-motion`.
- Errors: `.ap-error-text` under the field, `aria-invalid="true"` on the control, and a `role="alert"`
  message near the action.

## Responsive rules

| Breakpoint | Behaviour |
|---|---|
| `< 640px` | Single column, accessible seller drawer with Escape/focus return, dialogs go full screen, tables scroll horizontally; farmer bottom bar has 4 destinations + All, seller bar exposes its 5 sections |
| `640–1023px` | Two-up grids, sidebar still hidden, compact header retains seller identity, demo context and sign out |
| `1024–1279px` | Fixed sidebar, three-up metric grids |
| `≥ 1280px` | Full sidebar, four to six metric tiles per row, side-by-side analysis panels |

`min-width: 320px` is supported; nothing relies on horizontal page scrolling. Long labels wrap;
`.ap-truncate` is used only for identifiers, never for values a farmer must read.

## Accessibility rules

- Semantic landmarks: `header`, `nav[aria-label]`, `main`, `aside`, `footer`, `section[aria-label]`.
- All form controls have a `<label>` or a `sr-only` label; errors are linked with `aria-invalid`.
- `role="meter"` for threshold meters, `aria-pressed` for toggles, `aria-selected` for tabs,
  `aria-current="page"` for breadcrumbs.
- The digital twin is a button list with `aria-pressed`, plus the same information as text.
- Colour is never the only signal; animations are disabled under `prefers-reduced-motion`.

## Data-honesty rules enforced by the interface

1. Nothing is displayed as a measurement unless it came from the API or a farmer record.
2. Missing values render `—` with an explanation; `0` is only shown when the reading really was zero.
3. Every value carries a provenance tag; every reading carries a timestamp and freshness label.
4. Charts leave gaps where readings are absent and never interpolate across gaps.
5. Devices are online only when the backend reports a heartbeat inside its window.
6. Recommendations state their inputs, assumptions, confidence and generation time.
7. Sample/demo content is labelled as sample data on the value itself, not only in a banner.
