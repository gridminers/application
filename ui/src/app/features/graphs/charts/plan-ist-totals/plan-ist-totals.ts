import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';

import { Echart } from '../../../../shared/echart/echart';
import {
  formatEuro,
  formatAxisEuro,
  chartTextStyle,
  chartAxis,
  chartTooltip,
  chartAccent,
  chartAccentBar,
  chartSecondary,
  chartSecondaryBar,
  chartTextMuted,
} from '../../../../shared/chart-theme';

/** Planned vs. actual totals (summed over the closed years). */
export interface PlanIstTotalsData {
  geplant: number;
  ist: number;
}

/** Compact euro label for axis ticks, scaling Tsd./Mio. to the magnitude. */
function thousands(v: number): string {
  return formatAxisEuro(v);
}

/** Bar chart: total planned vs. total actual costs side by side. */
@Component({
  selector: 'app-plan-ist-totals',
  imports: [Echart],
  template: `<app-echart [options]="options()" [ariaLabel]="ariaLabel()" />`,
  styles: `:host { display: block; height: 100%; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanIstTotals {
  readonly data = input.required<PlanIstTotalsData>();

  readonly ariaLabel = computed(() => {
    const d = this.data();
    const diff = d.ist - d.geplant;
    const verb = diff === 0 ? 'identisch' : diff > 0 ? 'höher' : 'niedriger';
    return (
      `Balkendiagramm: Gesamtkosten geplant gegenüber Ist (abgeschlossene Jahre). ` +
      `Geplant ${formatEuro(d.geplant)}, Ist ${formatEuro(d.ist)}. ` +
      `Ist ist ${formatEuro(Math.abs(diff))} ${verb}.`
    );
  });

  readonly options = computed<EChartsCoreOption>(() => {
    const d = this.data();
    const diff = Math.abs(d.ist - d.geplant);
    const istHigher = d.ist > d.geplant;
    const planColor = chartAccent();
    const istColor = chartSecondary();
    return {
      textStyle: chartTextStyle(),
      grid: { left: 8, right: 24, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v: unknown) => formatEuro(Number(v)),
        ...chartTooltip(),
      },
      xAxis: {
        type: 'category',
        data: ['Geplant', 'Ist', 'Differenz'],
        ...chartAxis(),
        axisLabel: { interval: 0, color: chartTextMuted() },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        ...chartAxis(),
        axisLabel: { formatter: thousands, color: chartTextMuted() },
      },
      series: [
        {
          type: 'bar',
          barMaxWidth: 96,
          itemStyle: { borderRadius: [6, 6, 0, 0] },
          data: [
            { value: d.geplant, itemStyle: { color: planColor } },
            { value: d.ist, itemStyle: { color: istColor } },
            {
              value: diff,
              itemStyle: {
                color: istHigher ? chartSecondaryBar() : chartAccentBar(),
              },
            },
          ],
        },
      ],
    };
  });
}
