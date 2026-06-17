import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';

import { BudgetByAsset as BudgetByAssetRow } from '../../../../core/services/project-data';
import { Echart } from '../../../../shared/echart/echart';
import {
  formatEuro,
  formatAxisEuro,
  sparteLabel,
  SPARTE_COLORS,
  chartTextStyle,
  darkAxis,
  darkTooltip,
} from '../../../../shared/chart-theme';

/** Horizontal bar chart: total budget (Gesamtkosten) per asset class. */
@Component({
  selector: 'app-budget-by-asset',
  imports: [Echart],
  template: `<app-echart [options]="options()" [ariaLabel]="ariaLabel()" />`,
  styles: `:host { display: block; height: 100%; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetByAsset {
  readonly data = input.required<BudgetByAssetRow[]>();

  readonly ariaLabel = computed(() => {
    const rows = this.data();
    if (!rows.length) {
      return 'Balkendiagramm: keine Gesamtkosten je Asset für die aktuelle Auswahl.';
    }
    return (
      'Balkendiagramm: Gesamtkosten je Asset. ' +
      rows.map((d) => `${d.asset} ${formatEuro(d.gesamtkosten)}`).join(', ')
    );
  });

  readonly options = computed<EChartsCoreOption>(() => {
    // Sorted largest-first; reverse so the biggest bar sits at the top.
    const rows = [...this.data()].reverse();
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
        type: 'value',
        ...darkAxis(),
        axisLabel: { formatter: (v: number) => formatAxisEuro(v), color: '#b8b8b8' },
      },
      yAxis: {
        type: 'category',
        data: rows.map((r) => r.asset),
        ...darkAxis(),
        axisLabel: { interval: 0, color: '#b8b8b8' },
        splitLine: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: rows.map((r) => ({
            value: r.gesamtkosten,
            itemStyle: { color: SPARTE_COLORS[r.sparte] },
            // Division name in the tooltip for context.
            name: sparteLabel(r.sparte),
          })),
          barMaxWidth: 32,
          itemStyle: { borderRadius: [0, 6, 6, 0] },
        },
      ],
    };
  });
}
