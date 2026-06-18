import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';

import { PricePerMeterByYear } from '../../../../core/services/project-data';
import { Echart } from '../../../../shared/echart/echart';
import {
  sparteLabel,
  SPARTE_COLORS,
  chartTextStyle,
  chartAxis,
  chartTooltip,
  chartText,
  chartTextMuted,
} from '../../../../shared/chart-theme';

/** Line chart: average price per metre (€/m) per division over the years. */
@Component({
  selector: 'app-price-per-meter',
  imports: [Echart],
  template: `<app-echart [options]="options()" [ariaLabel]="ariaLabel()" />`,
  styles: `:host { display: block; height: 100%; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricePerMeter {
  readonly data = input.required<PricePerMeterByYear>();

  readonly ariaLabel = computed(() => {
    const d = this.data();
    if (!d.years.length) {
      return 'Liniendiagramm: keine Preis-pro-Meter-Daten für die aktuelle Auswahl.';
    }
    const lines = d.bySparte.map((s) => {
      const points = s.values
        .map((v, i) => (v === null ? null : `${d.years[i]}: ${v} €/m`))
        .filter((p): p is string => p !== null)
        .join(', ');
      return `${sparteLabel(s.sparte)} — ${points}`;
    });
    return `Liniendiagramm: durchschnittlicher Preis pro Meter je Sparte über die Jahre. ${lines.join('. ')}.`;
  });

  readonly options = computed<EChartsCoreOption>(() => {
    const d = this.data();
    return {
      textStyle: chartTextStyle(),
      grid: { left: 8, right: 24, top: 48, bottom: 8, containLabel: true },
      legend: { top: 8, textStyle: { color: chartText() } },
      tooltip: {
        trigger: 'axis',
        valueFormatter: (v: unknown) =>
          v === null || v === undefined ? '—' : `${v} €/m`,
        ...chartTooltip(),
      },
      xAxis: {
        type: 'category',
        data: d.years.map(String),
        ...chartAxis(),
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        ...chartAxis(),
        axisLabel: { formatter: '{value} €/m', color: chartTextMuted() },
      },
      series: d.bySparte.map((s) => ({
        name: sparteLabel(s.sparte),
        type: 'line',
        smooth: true,
        connectNulls: true,
        symbolSize: 8,
        data: s.values,
        lineStyle: { width: 3, color: SPARTE_COLORS[s.sparte] },
        itemStyle: { color: SPARTE_COLORS[s.sparte] },
      })),
    };
  });
}
