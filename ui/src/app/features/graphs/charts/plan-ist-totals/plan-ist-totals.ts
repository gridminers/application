import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';

import { Echart } from '../../../../shared/echart/echart';
import {
  formatEuro,
  formatAxisEuro,
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
/** Diff-bar fill when the plan was higher (under-run). */
const PLAN_DIFF_COLOR = 'rgba(0, 230, 57, 0.4)';
/** Diff-bar fill when the actuals were higher (over-run). */
const IST_DIFF_COLOR = 'rgba(232, 167, 0, 0.4)';

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
        data: ['Geplant', 'Ist', 'Differenz'],
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
            {
              value: diff,
              itemStyle: {
                color: istHigher ? IST_DIFF_COLOR : PLAN_DIFF_COLOR,
              },
            },
          ],
        },
      ],
    };
  });
}
