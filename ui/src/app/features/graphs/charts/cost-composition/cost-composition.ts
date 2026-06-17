import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';

import { CostComposition as CostCompositionData } from '../../../../core/services/project-data';
import { Echart } from '../../../../shared/echart/echart';
import { CATEGORY_PALETTE, formatEuro } from '../../../../shared/chart-theme';

interface Slice {
  name: string;
  value: number;
}

/** Pie chart: cost composition (Kostenarten) aggregated across all projects. */
@Component({
  selector: 'app-cost-composition',
  imports: [Echart],
  template: `<app-echart [options]="options()" [ariaLabel]="ariaLabel()" />`,
  styles: `:host { display: block; height: 100%; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CostComposition {
  readonly data = input.required<CostCompositionData>();

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

  readonly ariaLabel = computed(() =>
    'Kreisdiagramm: Kostenarten gesamt. ' +
    this.slices()
      .map((s) => `${s.name} ${formatEuro(s.value)}`)
      .join(', '),
  );

  readonly options = computed<EChartsCoreOption>(() => ({
    color: [...CATEGORY_PALETTE],
    tooltip: {
      trigger: 'item',
      valueFormatter: (v: unknown) => formatEuro(Number(v)),
    },
    legend: { bottom: 0, type: 'scroll' },
    series: [
      {
        type: 'pie',
        radius: ['42%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        label: { formatter: '{d}%' },
        data: this.slices(),
      },
    ],
  }));
}
