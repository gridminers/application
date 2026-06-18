import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';

import { PlanIstByYear } from '../../../../core/services/project-data';
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
  chartText,
  chartTextMuted,
} from '../../../../shared/chart-theme';

/** Compact euro label for axis ticks, scaling Tsd./Mio. to the magnitude. */
function thousands(v: number): string {
  return formatAxisEuro(v);
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
    const planColor = chartAccent();
    const istColor = chartSecondary();
    const planBar = chartAccentBar();
    const istBar = chartSecondaryBar();
    return {
      textStyle: chartTextStyle(),
      grid: { left: 8, right: 8, top: 48, bottom: 8, containLabel: true },
      legend: {
        top: 8,
        textStyle: { color: chartText() },
        data: ['Geplant', 'Ist', 'Differenz'],
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        valueFormatter: (v: unknown) =>
          v === null || v === undefined ? '—' : formatEuro(Number(v)),
        ...chartTooltip(),
      },
      xAxis: {
        type: 'category',
        data: rows.map((r) => String(r.year)),
        ...chartAxis(),
        splitLine: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Kosten',
          nameTextStyle: { color: chartTextMuted() },
          ...chartAxis(),
          axisLabel: { formatter: thousands, color: chartTextMuted() },
        },
        {
          type: 'value',
          name: 'Differenz',
          position: 'right',
          nameTextStyle: { color: chartTextMuted() },
          ...chartAxis(),
          splitLine: { show: false },
          axisLabel: { formatter: thousands, color: chartTextMuted() },
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
              itemStyle: { color: istHigher ? istBar : planBar },
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
          lineStyle: { width: 3, color: planColor },
          itemStyle: { color: planColor },
        },
        {
          name: 'Ist',
          type: 'line',
          yAxisIndex: 0,
          z: 3,
          symbolSize: 8,
          connectNulls: false,
          data: rows.map((r) => r.ist),
          lineStyle: { width: 3, color: istColor, type: 'dashed' },
          itemStyle: { color: istColor },
        },
      ],
    };
  });
}
