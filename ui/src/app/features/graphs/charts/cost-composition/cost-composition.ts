import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';

import { Sparte } from '../../../../core/models/sparte';
import {
  CostComposition as CostCompositionData,
  CostCompositionBySparte,
  sumCostCompositions,
} from '../../../../core/services/project-data';
import { Echart } from '../../../../shared/echart/echart';
import {
  CATEGORY_PALETTE,
  formatEuro,
  chartTextStyle,
  darkTooltip,
  CHART_SURFACE,
  CHART_TEXT,
  sparteLabel,
} from '../../../../shared/chart-theme';

interface Slice {
  name: string;
  value: number;
}

/**
 * Pie chart: cost composition (Kostenarten). It can be scoped with a two-level
 * filter — first a division (Sparte), then optionally one or more asset classes
 * within that division. With nothing selected (the default) it shows the total
 * across everything.
 */
@Component({
  selector: 'app-cost-composition',
  imports: [Echart],
  templateUrl: './cost-composition.html',
  styleUrl: './cost-composition.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CostComposition {
  /** Cost composition grouped by division and asset class. */
  readonly data = input.required<readonly CostCompositionBySparte[]>();

  /** Selected division; null means "all divisions" (the default). */
  private readonly selectedSparte = signal<Sparte | null>(null);

  /** Selected asset classes within the division; empty means "all of them". */
  private readonly selectedAssets = signal<ReadonlySet<string>>(new Set<string>());

  /** Divisions available to filter by. */
  readonly sparten = computed(() => this.data().map((d) => d.sparte));

  /** Whether a specific division is selected. */
  readonly hasSparte = computed(() => this.selectedSparte() !== null);

  /** Whether at least one asset class is selected. */
  readonly hasAssets = computed(() => this.selectedAssets().size > 0);

  /** The data entry for the selected division, if any. */
  private readonly sparteEntry = computed(() => {
    const sparte = this.selectedSparte();
    return sparte === null ? null : (this.data().find((d) => d.sparte === sparte) ?? null);
  });

  /** Asset classes available once a division is selected. */
  readonly assets = computed(() => this.sparteEntry()?.assets.map((a) => a.asset) ?? []);

  label(sparte: Sparte): string {
    return sparteLabel(sparte);
  }

  isSparteSelected(sparte: Sparte): boolean {
    return this.selectedSparte() === sparte;
  }

  isAssetSelected(asset: string): boolean {
    return this.selectedAssets().has(asset);
  }

  /** Select a division (or null for "all"); resets the asset selection. */
  selectSparte(sparte: Sparte | null): void {
    this.selectedSparte.set(sparte);
    this.selectedAssets.set(new Set<string>());
  }

  toggleAsset(asset: string): void {
    this.selectedAssets.update((current) => {
      const next = new Set(current);
      if (next.has(asset)) {
        next.delete(asset);
      } else {
        next.add(asset);
      }
      return next;
    });
  }

  /** Clear the asset selection (back to all assets of the division). */
  resetAssets(): void {
    this.selectedAssets.set(new Set<string>());
  }

  /** Cost composition for the active scope. */
  private readonly total = computed<CostCompositionData>(() => {
    const entry = this.sparteEntry();
    if (entry === null) {
      return sumCostCompositions(this.data().map((d) => d.composition));
    }
    const selected = this.selectedAssets();
    const rows = entry.assets.filter(
      (a) => selected.size === 0 || selected.has(a.asset),
    );
    return sumCostCompositions(rows.map((a) => a.composition));
  });

  private readonly slices = computed<Slice[]>(() => {
    const d = this.total();
    return [
      { name: 'Materialkosten', value: d.materialkosten },
      { name: 'Fremdleistungen', value: d.fremdleistungen },
      { name: 'Eigenleistungen', value: d.eigenleistungen },
      { name: 'Ingenieurleistung Dritte', value: d.ingenieurleistungDritte },
      { name: 'Zuschläge', value: d.zuschlaege },
    ];
  });

  /** Short description of the active filter scope, used in labels. */
  readonly scope = computed(() => {
    const sparte = this.selectedSparte();
    if (sparte === null) {
      return 'alle Sparten';
    }
    const selected = this.selectedAssets();
    if (selected.size === 0) {
      return `${sparteLabel(sparte)}, alle Assetklassen`;
    }
    const assets = this.assets()
      .filter((a) => selected.has(a))
      .join(', ');
    return `${sparteLabel(sparte)}: ${assets}`;
  });

  readonly ariaLabel = computed(
    () =>
      `Kreisdiagramm: Kostenarten, ${this.scope()}. ` +
      this.slices()
        .map((s) => `${s.name} ${formatEuro(s.value)}`)
        .join(', '),
  );

  readonly options = computed<EChartsCoreOption>(() => ({
    color: [...CATEGORY_PALETTE],
    textStyle: chartTextStyle,
    tooltip: {
      trigger: 'item',
      valueFormatter: (v: unknown) => formatEuro(Number(v)),
      ...darkTooltip(),
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: 0,
      top: 'middle',
      textStyle: { color: CHART_TEXT },
    },
    series: [
      {
        type: 'pie',
        radius: ['50%', '78%'],
        center: ['32%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: CHART_SURFACE, borderWidth: 2 },
        label: { show: false },
        data: this.slices(),
      },
    ],
  }));
}
