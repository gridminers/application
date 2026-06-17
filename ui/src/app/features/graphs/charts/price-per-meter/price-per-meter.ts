import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';

import { PricePerMeter as PricePerMeterData } from '../../../../core/services/project-data';
import { Echart } from '../../../../shared/echart/echart';
import { sparteLabel, SPARTE_COLORS, chartTextStyle, darkAxis, darkTooltip } from '../../../../shared/chart-theme';

/** Horizontal bar chart: price per metre (Preis pro Meter) per project. */
@Component({
  selector: 'app-price-per-meter',
  imports: [Echart],
  template: `<app-echart [options]="options()" [ariaLabel]="ariaLabel()" />`,
  styles: `:host { display: block; height: 100%; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricePerMeter {
  readonly data = input.required<PricePerMeterData[]>();

  readonly ariaLabel = computed(() =>
    'Balkendiagramm: Preis pro Meter je Projekt. ' +
    this.data()
      .map((d) => `${d.projekttitel} ${d.preisProMeter} Euro pro Meter`)
      .join(', '),
  );

  readonly options = computed<EChartsCoreOption>(() => {
    // Ascending so the largest bar sits at the top of a horizontal axis.
    const rows = [...this.data()].sort((a, b) => a.preisProMeter - b.preisProMeter);
    return {
      textStyle: chartTextStyle,
      grid: { left: 8, right: 32, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v: unknown) => `${v} €/m`,
        ...darkTooltip(),
      },
      xAxis: {
        type: 'value',
        ...darkAxis(),
        axisLabel: { formatter: '{value} €/m', color: '#b9ccb2' },
      },
      yAxis: {
        type: 'category',
        data: rows.map((r) => sparteLabel(r.sparte)),
        ...darkAxis(),
        splitLine: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: rows.map((r) => ({
            value: r.preisProMeter,
            name: r.projekttitel,
            itemStyle: { color: SPARTE_COLORS[r.sparte] },
          })),
          barMaxWidth: 28,
          itemStyle: { borderRadius: [0, 6, 6, 0] },
        },
      ],
    };
  });
}
