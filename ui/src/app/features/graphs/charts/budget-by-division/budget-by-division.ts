import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';

import { BudgetBySparte } from '../../../../core/services/project-data';
import { Echart } from '../../../../shared/echart/echart';
import { formatEuro, sparteLabel, SPARTE_COLORS, chartTextStyle, darkAxis, darkTooltip } from '../../../../shared/chart-theme';

/** Bar chart: total budget (Gesamtkosten) per division. */
@Component({
  selector: 'app-budget-by-division',
  imports: [Echart],
  template: `<app-echart [options]="options()" [ariaLabel]="ariaLabel()" />`,
  styles: `:host { display: block; height: 100%; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetByDivision {
  readonly data = input.required<BudgetBySparte[]>();

  readonly ariaLabel = computed(() =>
    'Balkendiagramm: Gesamtkosten je Sparte. ' +
    this.data()
      .map((d) => `${sparteLabel(d.sparte)} ${formatEuro(d.gesamtkosten)}`)
      .join(', '),
  );

  readonly options = computed<EChartsCoreOption>(() => {
    const rows = this.data();
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
        data: rows.map((r) => sparteLabel(r.sparte)),
        ...darkAxis(),
        axisLabel: { interval: 0, color: '#b9ccb2' },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        ...darkAxis(),
        axisLabel: { formatter: (v: number) => `${(v / 1000).toLocaleString('de-DE')} Tsd.`, color: '#b9ccb2' },
      },
      series: [
        {
          type: 'bar',
          data: rows.map((r) => ({
            value: r.gesamtkosten,
            itemStyle: { color: SPARTE_COLORS[r.sparte] },
          })),
          barMaxWidth: 56,
          itemStyle: { borderRadius: [6, 6, 0, 0] },
        },
      ],
    };
  });
}
