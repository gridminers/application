import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';

import { PlanIstByYear } from '../../../../core/services/project-data';
import { Echart } from '../../../../shared/echart/echart';
import {
  formatEuro,
  chartTextStyle,
  darkAxis,
  darkTooltip,
  CHART_ACCENT,
  CHART_TEXT,
  CHART_TEXT_MUTED,
} from '../../../../shared/chart-theme';

/** Line colour for planned amounts (Geplant). */
const PLAN_COLOR = CHART_ACCENT;
/** Line colour for actual amounts (Ist). */
const IST_COLOR = '#e8a700';
/** Diff-bar fill when the plan was higher (under-run). */
const PLAN_BAR = 'rgba(0, 230, 57, 0.4)';
/** Diff-bar fill when the actuals were higher (over-run). */
const IST_BAR = 'rgba(232, 167, 0, 0.4)';

/** Format euros as thousands ("123 Tsd.") for axis labels. */
function thousands(v: number): string {
  return `${(v / 1000).toLocaleString('de-DE')} Tsd.`;
}

/**
 * Combined chart: lines for planned (Zahlungsplan) vs. actual (Ist) costs per
 * year, plus a bar (secondary right-hand axis) showing the absolute difference.
 * The bar is tinted to match whichever side is higher. Years without actuals
 * carry no Ist point and no diff bar.
 */
@Component({
  selector: 'app-plan-ist-comparison',
  imports: [Echart],
  template: `<app-echart [options]="options()" [ariaLabel]="ariaLabel()" />`,
  styles: `:host { display: block; height: 100%; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanIstComparison {
  readonly data = input.required<PlanIstByYear[]>();

  readonly ariaLabel = computed(
    () =>
      'Liniendiagramm mit Differenz-Balken: geplante gegenüber tatsächlichen Kosten je Jahr. ' +
      this.data()
        .map((d) => {
          if (d.ist === null) {
            return `${d.year}: Geplant ${formatEuro(d.geplant)}, Ist noch offen`;
          }
          const diff = Math.abs(d.geplant - d.ist);
          const higher = d.ist > d.geplant ? 'Ist höher' : 'Plan höher';
          return (
            `${d.year}: Geplant ${formatEuro(d.geplant)}, ` +
            `Ist ${formatEuro(d.ist)}, Differenz ${formatEuro(diff)} (${higher})`
          );
        })
        .join('. '),
  );

  readonly options = computed<EChartsCoreOption>(() => {
    const rows = this.data();
    return {
      textStyle: chartTextStyle,
      grid: { left: 8, right: 8, top: 48, bottom: 8, containLabel: true },
      legend: {
        top: 8,
        textStyle: { color: CHART_TEXT },
        data: ['Geplant', 'Ist', 'Differenz'],
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        valueFormatter: (v: unknown) =>
          v === null || v === undefined ? '—' : formatEuro(Number(v)),
        ...darkTooltip(),
      },
      xAxis: {
        type: 'category',
        data: rows.map((r) => String(r.year)),
        ...darkAxis(),
        splitLine: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Kosten',
          nameTextStyle: { color: CHART_TEXT_MUTED },
          ...darkAxis(),
          axisLabel: { formatter: thousands, color: CHART_TEXT_MUTED },
        },
        {
          type: 'value',
          name: 'Differenz',
          position: 'right',
          nameTextStyle: { color: CHART_TEXT_MUTED },
          ...darkAxis(),
          splitLine: { show: false },
          axisLabel: { formatter: thousands, color: CHART_TEXT_MUTED },
        },
      ],
      series: [
        {
          name: 'Differenz',
          type: 'bar',
          yAxisIndex: 1,
          z: 1,
          barMaxWidth: 48,
          itemStyle: { borderRadius: [4, 4, 0, 0] },
          data: rows.map((r) => {
            if (r.ist === null) {
              return { value: null };
            }
            const istHigher = r.ist > r.geplant;
            return {
              value: Math.abs(r.geplant - r.ist),
              itemStyle: { color: istHigher ? IST_BAR : PLAN_BAR },
            };
          }),
        },
        {
          name: 'Geplant',
          type: 'line',
          yAxisIndex: 0,
          z: 3,
          symbolSize: 8,
          data: rows.map((r) => r.geplant),
          lineStyle: { width: 3, color: PLAN_COLOR },
          itemStyle: { color: PLAN_COLOR },
        },
        {
          name: 'Ist',
          type: 'line',
          yAxisIndex: 0,
          z: 3,
          symbolSize: 8,
          connectNulls: false,
          data: rows.map((r) => r.ist),
          lineStyle: { width: 3, color: IST_COLOR, type: 'dashed' },
          itemStyle: { color: IST_COLOR },
        },
      ],
    };
  });
}
