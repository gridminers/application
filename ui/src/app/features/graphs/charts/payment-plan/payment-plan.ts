import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';

import { PaymentByYear } from '../../../../core/services/project-data';
import { Echart } from '../../../../shared/echart/echart';
import { formatEuro, chartTextStyle, darkAxis, darkTooltip, CHART_ACCENT } from '../../../../shared/chart-theme';

/** Area chart: scheduled payments (Zahlungsplan) aggregated per year. */
@Component({
  selector: 'app-payment-plan',
  imports: [Echart],
  template: `<app-echart [options]="options()" [ariaLabel]="ariaLabel()" />`,
  styles: `:host { display: block; height: 100%; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentPlan {
  readonly data = input.required<PaymentByYear[]>();

  readonly ariaLabel = computed(() =>
    'Flächendiagramm: geplante Zahlungen je Jahr. ' +
    this.data()
      .map((d) => `${d.year}: ${formatEuro(d.amount)}`)
      .join(', '),
  );

  readonly options = computed<EChartsCoreOption>(() => {
    const rows = this.data();
    return {
      textStyle: chartTextStyle,
      grid: { left: 8, right: 24, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        valueFormatter: (v: unknown) => formatEuro(Number(v)),
        ...darkTooltip(),
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: rows.map((r) => String(r.year)),
        ...darkAxis(),
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        ...darkAxis(),
        axisLabel: { formatter: (v: number) => `${(v / 1000).toLocaleString('de-DE')} Tsd.`, color: '#b8b8b8' },
      },
      series: [
        {
          type: 'line',
          smooth: true,
          symbolSize: 8,
          data: rows.map((r) => r.amount),
          lineStyle: { width: 3, color: CHART_ACCENT },
          itemStyle: { color: CHART_ACCENT },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(0, 230, 57, 0.35)' },
                { offset: 1, color: 'rgba(0, 230, 57, 0.02)' },
              ],
            },
          },
        },
      ],
    };
  });
}
