import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';

import { ExpenditureByYear } from '../../../../core/services/project-data';
import { Echart } from '../../../../shared/echart/echart';
import {
  formatEuro,
  formatAxisEuro,
  chartTextStyle,
  darkAxis,
  darkTooltip,
  CHART_ACCENT,
} from '../../../../shared/chart-theme';

/** Compact euro label for axis ticks, scaling Tsd./Mio. to the magnitude. */
function thousands(v: number): string {
  return formatAxisEuro(v);
}

/** Line chart: total expenditure (Gesamtkosten) summed per fiscal year. */
@Component({
  selector: 'app-expenditures-by-year',
  imports: [Echart],
  template: `<app-echart [options]="options()" [ariaLabel]="ariaLabel()" />`,
  styles: `:host { display: block; height: 100%; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpendituresByYear {
  readonly data = input.required<ExpenditureByYear[]>();

  readonly ariaLabel = computed(
    () =>
      'Liniendiagramm: Gesamtausgaben je Geschäftsjahr. ' +
      this.data()
        .map((d) => `${d.year} ${formatEuro(d.gesamtkosten)}`)
        .join(', '),
  );

  readonly options = computed<EChartsCoreOption>(() => {
    const rows = this.data();
    return {
      textStyle: chartTextStyle,
      grid: { left: 8, right: 24, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
        valueFormatter: (v: unknown) => formatEuro(Number(v)),
        ...darkTooltip(),
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: rows.map((r) => String(r.year)),
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
          type: 'line',
          name: 'Gesamtausgaben',
          data: rows.map((r) => r.gesamtkosten),
          smooth: true,
          symbolSize: 8,
          lineStyle: { width: 3, color: CHART_ACCENT },
          itemStyle: { color: CHART_ACCENT },
          areaStyle: { color: 'rgba(0, 230, 57, 0.12)' },
        },
      ],
    };
  });
}
