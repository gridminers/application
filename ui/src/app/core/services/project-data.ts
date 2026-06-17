import { computed, Service, signal } from '@angular/core';

import { Project } from '../models/project';
import { Sparte, SPARTEN } from '../models/sparte';
import { MOCK_PROJECTS } from './mock-projects';

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

/**
 * Provides project data and the aggregates the graph view needs.
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
  readonly budgetBySparte = computed<BudgetBySparte[]>(() => {
    const totals = new Map<Sparte, number>(SPARTEN.map((s) => [s, 0]));
    for (const p of this.projects()) {
      totals.set(p.sparte, (totals.get(p.sparte) ?? 0) + p.kosten.gesamtkosten);
    }
    return SPARTEN.map((sparte) => ({ sparte, gesamtkosten: totals.get(sparte) ?? 0 }));
  });

  /** Cost composition summed across all projects. */
  readonly costComposition = computed<CostComposition>(() =>
    sumCostCompositions(this.projects().map(projectComposition)),
  );

  /** Distinct asset classes present in the data, in display order. */
  readonly assets = computed<string[]>(() =>
    [...new Set(this.projects().map((p) => p.asset))].sort((a, b) =>
      a.localeCompare(b, 'de'),
    ),
  );

  /** Cost composition aggregated per asset class (ordered like {@link assets}). */
  readonly costCompositionByAsset = computed<CostCompositionByAsset[]>(() => {
    const groups = new Map<string, CostComposition[]>();
    for (const p of this.projects()) {
      const list = groups.get(p.asset) ?? [];
      list.push(projectComposition(p));
      groups.set(p.asset, list);
    }
    return this.assets().map((asset) => ({
      asset,
      composition: sumCostCompositions(groups.get(asset) ?? []),
    }));
  });

  /** Scheduled payments summed per year (sorted ascending). */
  readonly paymentsByYear = computed<PaymentByYear[]>(() => {
    const totals = new Map<number, number>();
    for (const p of this.projects()) {
      for (const entry of p.zahlungsplan) {
        totals.set(entry.year, (totals.get(entry.year) ?? 0) + entry.amount);
      }
    }
    return [...totals.entries()]
      .map(([year, amount]) => ({ year, amount }))
      .sort((a, b) => a.year - b.year);
  });

  /** In-house vs. external service costs summed per year (sorted ascending). */
  readonly eigenFremdByYear = computed<EigenFremdByYear[]>(() => {
    const totals = new Map<number, { eigen: number; fremd: number }>();
    for (const p of this.projects()) {
      const cur = totals.get(p.geschaeftsjahr) ?? { eigen: 0, fremd: 0 };
      cur.eigen += p.kosten.eigenleistungen;
      cur.fremd += p.kosten.fremdleistungen;
      totals.set(p.geschaeftsjahr, cur);
    }
    return [...totals.entries()]
      .map(([year, v]) => ({ year, eigenleistungen: v.eigen, fremdleistungen: v.fremd }))
      .sort((a, b) => a.year - b.year);
  });

  /** Price per metre per project, excluding projects without line length. */
  readonly pricePerMeter = computed<PricePerMeter[]>(() =>
    this.projects()
      .filter((p) => p.preisProMeter > 0)
      .map((p) => ({
        id: p.id,
        projekttitel: p.projekttitel,
        sparte: p.sparte,
        preisProMeter: p.preisProMeter,
      }))
      .sort((a, b) => b.preisProMeter - a.preisProMeter),
  );
}
