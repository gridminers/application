# Gridminers UI — First Draft Plan

Frontend for visualizing grid-infrastructure project budgets for the city of
**Braunschweig**. Built with **Angular 22** (standalone, signals, zoneless-ready).

## Goals (this draft)

1. A clean **landing page** summarizing the key features.
2. A **graph view** that visualizes project/budget data as charts.
3. Everything fed from a **mock data service** (no backend yet), so swapping in a
   real API later is trivial.

Guiding principle: **component-based, small, focused.** Don't over-build.

## Tech choices

- **Charts:** ECharts via `ngx-echarts`. Best fit for financial/aggregate data and
  scales to many data points.
- **State:** Angular signals + `computed()`. Mock data exposed as signals from a
  `providedIn: 'root'` service.
- **Styling:** plain CSS with shared design tokens (CSS custom properties) in
  `styles.css`. No UI framework for now.
- **Routing:** lazy-loaded standalone routes.

## Architecture

```
src/app/
├── core/
│   ├── models/            # Project, CostBreakdown, PaymentPlanEntry, Sparte
│   └── services/
│       └── project-data.service.ts   # mock data as signals + computed aggregates
├── shared/
│   ├── chart-card/        # titled card wrapper around a chart
│   └── echart/            # thin reusable ECharts wrapper component
├── features/
│   ├── landing/           # landing page + hero / feature-card subcomponents
│   └── graphs/            # graphs page composing individual chart components
│       └── charts/        # one component per chart, fed via input()
└── layout/                # app shell: header / nav / router-outlet
```

### Routing

| Path      | Component        | Loading |
| --------- | ---------------- | ------- |
| `''`      | `LandingPage`    | lazy    |
| `graphs`  | `GraphsPage`     | lazy    |

## Chart catalog (graph view)

Derived from the document fields (see `DATA_MODEL.md`):

1. **Budget by division** — bar/pie of `gesamtkosten` aggregated per `Sparte`.
2. **Cost composition** — stacked bar of Material / Fremd / Eigen / Ingenieur /
   Zuschläge (aggregated, and/or per project).
3. **Payment plan over time** — line/area of `zahlungsplan` summed by year.
4. **Price per meter** — bar comparing `preisProMeter` across projects/divisions.
5. *(stretch)* **Length vs. cost** — scatter of `leitungslaengeMeter` vs
   `gesamtkosten`.

Each chart is its own component taking already-shaped data via `input()`. The
graphs page (or the data service via `computed()`) does the aggregation so charts
stay dumb and reusable.

## Accessibility

- Charts get an accessible name + a visually-hidden data summary / table fallback.
- Color palette must meet WCAG AA contrast.
- Full keyboard navigation for header/nav and any interactive controls.

## Task chain (roadmap)

Executed in order; each step is independently shippable. **First draft: done.**

1. ✅ **Foundations** — installed `echarts` + `ngx-echarts`, registered the
   provider (`provideEchartsCore`, lazy-loaded), design tokens + reset in
   `styles.css`.
2. ✅ **Domain model** — `core/models` (`Project`, `CostBreakdown`,
   `PaymentPlanEntry`, `Sparte`).
3. ✅ **Mock data service** — `ProjectData` (`@Service`) with `projects` signal +
   `computed()` aggregates (`budgetBySparte`, `costComposition`, `paymentsByYear`,
   `pricePerMeter`). Backed by `mock-projects.ts`.
4. ✅ **App shell + routing** — `layout/header` with skip-link + nav, lazy routes
   for `''` and `graphs`.
5. ✅ **Landing page** — hero with live stats + `feature-card` grid, CTA to graphs.
6. ✅ **Reusable chart wrapper** — `shared/echart` (role="img" + aria-label) and
   `shared/chart-card`; shared palette/format helpers in `shared/chart-theme.ts`.
7. ✅ **Chart components** — `budget-by-division`, `cost-composition`,
   `payment-plan`, `price-per-meter`; each takes shaped data via `input()`.
8. ✅ **Graphs page** — responsive grid composing the four charts.
9. ✅ **Polish** — accessibility basics (skip-link, aria labels, AA contrast),
   responsive grids, green test suite (`ProjectData` aggregates + app smoke).

## Follow-ups (next iterations)

- **Component tests** — the CLI placeholder specs for chart/page components were
  removed; add focused tests with a router + echarts harness (and data inputs).
- **Slim the echarts bundle** — currently `import('echarts')` pulls the full lib
  (~1.1 MB, lazy). Switch to modular `echarts/core` + only the used charts/components.
- **Chart data-table fallbacks** — add visually-hidden `<table>` alternatives for
  each chart beyond the current aria-label summaries.

## Out of scope (later)

- Real API / backend integration (service is designed to swap in cleanly).
- Filtering/drill-down dashboard, map view of Braunschweig districts.
- Auth, i18n, persistence.
