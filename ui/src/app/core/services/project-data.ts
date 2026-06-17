import { computed, Service, signal } from '@angular/core';

import { Project } from '../models/project';
import { Sparte, SPARTEN } from '../models/sparte';
import { MOCK_PROJECTS } from './mock-projects';
import { actualPaymentForYear, projectGewerk, projectStreet } from './project-derivations';

/** Total budget per division. */
export interface BudgetBySparte {
  sparte: Sparte;
  gesamtkosten: number;
}

/** Aggregated cost-composition totals across all projects. */
export interface CostComposition {
  materialkosten: number;
  fremdleistungen: number;
  eigenleistungen: number;
  ingenieurleistungDritte: number;
  /** Sum of all surcharges (Zwischensumme Zuschläge) across projects. */
  zuschlaege: number;
}

/** Cost composition aggregated for a single asset class. */
export interface CostCompositionByAsset {
  /** Asset class (e.g. "20 kV-Netz", "0,4 kV-Netz"). */
  asset: string;
  composition: CostComposition;
}

/** Cost composition aggregated for a single division, with its asset classes. */
export interface CostCompositionBySparte {
  sparte: Sparte;
  /** Total composition across all assets of this division. */
  composition: CostComposition;
  /** Per-asset breakdown within this division (ordered by asset name). */
  assets: CostCompositionByAsset[];
}

/** Cost composition of a single project (maps the breakdown to chart slices). */
function projectComposition(p: Project): CostComposition {
  return {
    materialkosten: p.kosten.materialkosten,
    fremdleistungen: p.kosten.fremdleistungen,
    eigenleistungen: p.kosten.eigenleistungen,
    ingenieurleistungDritte: p.kosten.ingenieurleistungDritte,
    zuschlaege: p.kosten.zwischensummeZuschlaege,
  };
}

/** Sum a list of cost compositions into a single total. */
export function sumCostCompositions(
  items: readonly CostComposition[],
): CostComposition {
  return items.reduce<CostComposition>(
    (acc, c) => ({
      materialkosten: acc.materialkosten + c.materialkosten,
      fremdleistungen: acc.fremdleistungen + c.fremdleistungen,
      eigenleistungen: acc.eigenleistungen + c.eigenleistungen,
      ingenieurleistungDritte: acc.ingenieurleistungDritte + c.ingenieurleistungDritte,
      zuschlaege: acc.zuschlaege + c.zuschlaege,
    }),
    {
      materialkosten: 0,
      fremdleistungen: 0,
      eigenleistungen: 0,
      ingenieurleistungDritte: 0,
      zuschlaege: 0,
    },
  );
}

/** Total scheduled payment for a given year. */
export interface PaymentByYear {
  year: number;
  amount: number;
}

/** Planned vs. actual costs for a given year (Ist `null` while not yet closed). */
export interface PlanIstByYear {
  year: number;
  /** Geplant — scheduled payment for the year. */
  geplant: number;
  /** Ist — realised cost for the year, or `null` if the year hasn't closed. */
  ist: number | null;
}

/** Cost aggregate for a single trade (Gewerk). */
export interface GewerkeAggregate {
  gewerk: string;
  gesamtkosten: number;
  anzahl: number;
  composition: CostComposition;
}

/** In-house vs. external service costs for a given year. */
export interface EigenFremdByYear {
  year: number;
  /** Eigenleistungen — in-house service costs. */
  eigenleistungen: number;
  /** Fremdleistungen — external service costs. */
  fremdleistungen: number;
}

/** Price per metre for a single project (for comparison charts). */
export interface PricePerMeter {
  id: string;
  projekttitel: string;
  sparte: Sparte;
  preisProMeter: number;
}

/** Average price per metre per division across the fiscal years. */
export interface PricePerMeterByYear {
  /** Fiscal years in ascending order. */
  years: number[];
  /** One series per division; `null` where the division has no project that year. */
  bySparte: { sparte: Sparte; values: (number | null)[] }[];
}

/* ------------------------------------------------------------------ *
 * Pure aggregate functions. Each takes a project list so the graph
 * pages can filter first and then aggregate the subset.
 * ------------------------------------------------------------------ */

/** Total budget grouped by division (Sparte), in canonical order. */
export function aggregateBudgetBySparte(
  projects: readonly Project[],
): BudgetBySparte[] {
  const totals = new Map<Sparte, number>(SPARTEN.map((s) => [s, 0]));
  for (const p of projects) {
    totals.set(p.sparte, (totals.get(p.sparte) ?? 0) + p.kosten.gesamtkosten);
  }
  return SPARTEN.map((sparte) => ({ sparte, gesamtkosten: totals.get(sparte) ?? 0 }));
}

/** Cost composition summed across the given projects. */
export function aggregateCostComposition(
  projects: readonly Project[],
): CostComposition {
  return sumCostCompositions(projects.map(projectComposition));
}

/** Distinct asset classes present in the data, in display order. */
export function aggregateAssets(projects: readonly Project[]): string[] {
  return [...new Set(projects.map((p) => p.asset))].sort((a, b) =>
    a.localeCompare(b, 'de'),
  );
}

/** Distinct fiscal years present in the data, ascending. */
export function aggregateYears(projects: readonly Project[]): number[] {
  return [...new Set(projects.map((p) => p.geschaeftsjahr))].sort((a, b) => a - b);
}

/** Cost composition grouped by division and, within each, by asset class. */
export function aggregateCostCompositionBySparte(
  projects: readonly Project[],
): CostCompositionBySparte[] {
  return SPARTEN.filter((sparte) => projects.some((p) => p.sparte === sparte)).map(
    (sparte) => {
      const inSparte = projects.filter((p) => p.sparte === sparte);
      const assetGroups = new Map<string, CostComposition[]>();
      for (const p of inSparte) {
        const list = assetGroups.get(p.asset) ?? [];
        list.push(projectComposition(p));
        assetGroups.set(p.asset, list);
      }
      const assets = [...assetGroups.keys()]
        .sort((a, b) => a.localeCompare(b, 'de'))
        .map((asset) => ({
          asset,
          composition: sumCostCompositions(assetGroups.get(asset) ?? []),
        }));
      return {
        sparte,
        composition: sumCostCompositions(inSparte.map(projectComposition)),
        assets,
      };
    },
  );
}

/** Scheduled payments summed per year (sorted ascending). */
export function aggregatePaymentsByYear(
  projects: readonly Project[],
): PaymentByYear[] {
  const totals = new Map<number, number>();
  for (const p of projects) {
    for (const entry of p.zahlungsplan) {
      totals.set(entry.year, (totals.get(entry.year) ?? 0) + entry.amount);
    }
  }
  return [...totals.entries()]
    .map(([year, amount]) => ({ year, amount }))
    .sort((a, b) => a.year - b.year);
}

/** Planned (Zahlungsplan) vs. synthesised actual costs per year. */
export function aggregatePlanIstByYear(
  projects: readonly Project[],
): PlanIstByYear[] {
  const totals = new Map<number, { geplant: number; ist: number; hasIst: boolean }>();
  for (const p of projects) {
    for (const entry of p.zahlungsplan) {
      const cur = totals.get(entry.year) ?? { geplant: 0, ist: 0, hasIst: false };
      cur.geplant += entry.amount;
      const ist = actualPaymentForYear(p, entry.year, entry.amount);
      if (ist !== null) {
        cur.ist += ist;
        cur.hasIst = true;
      }
      totals.set(entry.year, cur);
    }
  }
  return [...totals.entries()]
    .map(([year, v]) => ({ year, geplant: v.geplant, ist: v.hasIst ? v.ist : null }))
    .sort((a, b) => a.year - b.year);
}

/** Cost aggregates grouped by trade (Gewerk), largest first. Non-Gewerk
 * projects (assets that are not a network "-netz") are excluded. */
export function aggregateGewerke(projects: readonly Project[]): GewerkeAggregate[] {
  const groups = new Map<string, Project[]>();
  for (const p of projects) {
    const gewerk = projectGewerk(p);
    if (gewerk === null) {
      continue;
    }
    const list = groups.get(gewerk) ?? [];
    list.push(p);
    groups.set(gewerk, list);
  }
  return [...groups.entries()]
    .map(([gewerk, ps]) => ({
      gewerk,
      gesamtkosten: ps.reduce((s, p) => s + p.kosten.gesamtkosten, 0),
      anzahl: ps.length,
      composition: sumCostCompositions(ps.map(projectComposition)),
    }))
    .sort((a, b) => b.gesamtkosten - a.gesamtkosten);
}

/** In-house vs. external service costs summed per year (sorted ascending). */
export function aggregateEigenFremdByYear(
  projects: readonly Project[],
): EigenFremdByYear[] {
  const totals = new Map<number, { eigen: number; fremd: number }>();
  for (const p of projects) {
    const cur = totals.get(p.geschaeftsjahr) ?? { eigen: 0, fremd: 0 };
    cur.eigen += p.kosten.eigenleistungen;
    cur.fremd += p.kosten.fremdleistungen;
    totals.set(p.geschaeftsjahr, cur);
  }
  return [...totals.entries()]
    .map(([year, v]) => ({ year, eigenleistungen: v.eigen, fremdleistungen: v.fremd }))
    .sort((a, b) => a.year - b.year);
}

/** Price per metre per project (excludes projects without line length), desc. */
export function aggregatePricePerMeter(
  projects: readonly Project[],
): PricePerMeter[] {
  return projects
    .filter((p) => p.preisProMeter > 0)
    .map((p) => ({
      id: p.id,
      projekttitel: p.projekttitel,
      sparte: p.sparte,
      preisProMeter: p.preisProMeter,
    }))
    .sort((a, b) => b.preisProMeter - a.preisProMeter);
}

/** Average price per metre per division and fiscal year (for the trend line). */
export function aggregatePricePerMeterByYear(
  projects: readonly Project[],
): PricePerMeterByYear {
  const withPrice = projects.filter((p) => p.preisProMeter > 0);
  const years = [...new Set(withPrice.map((p) => p.geschaeftsjahr))].sort(
    (a, b) => a - b,
  );
  const sparten = SPARTEN.filter((s) => withPrice.some((p) => p.sparte === s));
  const bySparte = sparten.map((sparte) => ({
    sparte,
    values: years.map((year) => {
      const ps = withPrice.filter(
        (p) => p.sparte === sparte && p.geschaeftsjahr === year,
      );
      if (!ps.length) {
        return null;
      }
      return Math.round(ps.reduce((s, p) => s + p.preisProMeter, 0) / ps.length);
    }),
  }));
  return { years, bySparte };
}

/** Distinct streets / locations present in the data, in display order. */
export function aggregateStreets(projects: readonly Project[]): string[] {
  return [...new Set(projects.map(projectStreet))].sort((a, b) =>
    a.localeCompare(b, 'de'),
  );
}

/**
 * Provides project data and the aggregates the graph views need.
 *
 * Currently backed by mock data; swap `projects` for an HTTP-driven source
 * later without touching the computed aggregates or consumers.
 */
@Service()
export class ProjectData {
  /** All project orders. */
  readonly projects = signal<readonly Project[]>(MOCK_PROJECTS);

  /** Number of projects. */
  readonly projectCount = computed(() => this.projects().length);

  /** Combined total budget across all projects. */
  readonly totalBudget = computed(() =>
    this.projects().reduce((sum, p) => sum + p.kosten.gesamtkosten, 0),
  );

  /** Total budget grouped by division (Sparte). */
  readonly budgetBySparte = computed(() => aggregateBudgetBySparte(this.projects()));

  /** Cost composition summed across all projects. */
  readonly costComposition = computed(() => aggregateCostComposition(this.projects()));

  /** Distinct asset classes present in the data, in display order. */
  readonly assets = computed(() => aggregateAssets(this.projects()));

  /** Distinct fiscal years present in the data, ascending. */
  readonly years = computed(() => aggregateYears(this.projects()));

  /** Distinct streets / locations present in the data. */
  readonly streets = computed(() => aggregateStreets(this.projects()));

  /** Cost composition grouped by division and asset class. */
  readonly costCompositionBySparte = computed(() =>
    aggregateCostCompositionBySparte(this.projects()),
  );

  /** Scheduled payments summed per year (sorted ascending). */
  readonly paymentsByYear = computed(() => aggregatePaymentsByYear(this.projects()));

  /** In-house vs. external service costs summed per year (sorted ascending). */
  readonly eigenFremdByYear = computed(() => aggregateEigenFremdByYear(this.projects()));

  /** Price per metre per project, excluding projects without line length. */
  readonly pricePerMeter = computed(() => aggregatePricePerMeter(this.projects()));
}
