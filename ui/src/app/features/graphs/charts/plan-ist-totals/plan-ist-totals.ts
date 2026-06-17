import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';

import { Echart } from '../../../../shared/echart/echart';
import {
  formatEuro,
  chartTextStyle,
  darkAxis,
  darkTooltip,
  CHART_ACCENT,
} from '../../../../shared/chart-theme';

/** Planned vs. actual totals (summed over the closed years). */
export interface PlanIstTotalsData {
  geplant: number;
  ist: number;
}

const PLAN_COLOR = CHART_ACCENT;
const IST_COLOR = '#e8a700';

/** Format euros as thousands ("123 Tsd.") for axis labels. */
function thousands(v: number): string {
  return `${(v / 1000).toLocaleString('de-DE')} Tsd.`;
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
    return {
      textStyle: chartTextStyle,
      grid: { left: 8, right: 24, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v: unknown) => formatEuro(Number(v)),
        ...darkTooltip(),
      },
      xAxis: {
        type: 'category',
        data: ['Geplant', 'Ist'],
        ...darkAxis(),
        axisLabel: { interval: 0, color: '#b8b8b8' },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        ...darkAxis(),
        axisLabel: { formatter: thousands, color: '#b8b8b8' },
      },
      series: [
        {
          type: 'bar',
          barMaxWidth: 96,
          itemStyle: { borderRadius: [6, 6, 0, 0] },
          data: [
            { value: d.geplant, itemStyle: { color: PLAN_COLOR } },
            { value: d.ist, itemStyle: { color: IST_COLOR } },
          ],
        },
      ],
    };
  });
}
