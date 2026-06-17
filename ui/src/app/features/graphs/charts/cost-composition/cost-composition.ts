import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';

import { CostComposition as CostCompositionData } from '../../../../core/services/project-data';
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
 * Donut chart of the cost composition (Kostenarten). Presentational: it renders
 * whatever {@link CostCompositionData} total it is given — scoping is handled
 * by the page-level filter bar.
 */
@Component({
  selector: 'app-cost-composition',
  imports: [Echart],
  template: `<app-echart [options]="options()" [ariaLabel]="ariaLabel()" />`,
  styles: `:host { display: block; height: 100%; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CostComposition {
  /** Aggregated cost composition to display. */
  readonly data = input.required<CostCompositionData>();

  /** Short description of the active scope, woven into the accessible label. */
  readonly scope = input<string>('alle Sparten');

  private readonly slices = computed<Slice[]>(() => {
    const d = this.data();
    return [
      { name: 'Materialkosten', value: d.materialkosten },
      { name: 'Fremdleistungen', value: d.fremdleistungen },
      { name: 'Eigenleistungen', value: d.eigenleistungen },
      { name: 'Ingenieurleistung Dritte', value: d.ingenieurleistungDritte },
      { name: 'Zuschläge', value: d.zuschlaege },
    ];
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
