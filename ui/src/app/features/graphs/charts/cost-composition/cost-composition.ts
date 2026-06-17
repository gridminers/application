import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';

import {
  CostComposition as CostCompositionData,
  CostCompositionByAsset,
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
} from '../../../../shared/chart-theme';

interface Slice {
  name: string;
  value: number;
}

/**
 * Pie chart: cost composition (Kostenarten) aggregated across projects, with an
 * optional asset-class filter. With no asset class selected (the default) it
 * shows the total across all assets; selecting one or more narrows it down.
 */
@Component({
  selector: 'app-cost-composition',
  imports: [Echart],
  templateUrl: './cost-composition.html',
  styleUrl: './cost-composition.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CostComposition {
  /** Cost composition per asset class. */
  readonly data = input.required<readonly CostCompositionByAsset[]>();

  /** Asset classes the user has selected; empty means "all" (the default). */
  private readonly selected = signal<ReadonlySet<string>>(new Set<string>());

  /** Asset classes available to filter by. */
  readonly assets = computed(() => this.data().map((d) => d.asset));

  /** Whether at least one asset class is selected. */
  readonly hasSelection = computed(() => this.selected().size > 0);

  isSelected(asset: string): boolean {
    return this.selected().has(asset);
  }

  toggle(asset: string): void {
    this.selected.update((current) => {
      const next = new Set(current);
      if (next.has(asset)) {
        next.delete(asset);
      } else {
        next.add(asset);
      }
      return next;
    });
  }

  /** Reset to the default view (total across all asset classes). */
  reset(): void {
    this.selected.set(new Set<string>());
  }

  /** Cost composition of the selected asset classes, or the total when none are selected. */
  private readonly total = computed<CostCompositionData>(() => {
    const selected = this.selected();
    const rows = this.data().filter(
      (d) => selected.size === 0 || selected.has(d.asset),
    );
    return sumCostCompositions(rows.map((d) => d.composition));
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
    const selected = this.selected();
    if (selected.size === 0) {
      return 'alle Assetklassen';
    }
    return this.assets()
      .filter((a) => selected.has(a))
      .join(', ');
  });

  readonly ariaLabel = computed(
    () =>
      `Kreisdiagramm: Kostenarten gesamt, ${this.scope()}. ` +
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
