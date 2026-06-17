import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';

import { EigenFremdByYear } from '../../../../core/services/project-data';
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

/** Line colour for Eigenleistungen (in-house). */
const EIGEN_COLOR = CHART_ACCENT;
/** Line colour for Fremdleistungen (external). */
const FREMD_COLOR = '#e8a700';
/** Diff-bar fill when Eigenleistungen are higher (translucent so lines stay readable). */
const EIGEN_BAR = 'rgba(0, 230, 57, 0.4)';
/** Diff-bar fill when Fremdleistungen are higher. */
const FREMD_BAR = 'rgba(232, 167, 0, 0.4)';

/** Format euros as thousands ("123 Tsd.") for axis labels. */
function thousands(v: number): string {
  return `${(v / 1000).toLocaleString('de-DE')} Tsd.`;
}

/**
 * Combined chart: lines for Eigen- and Fremdleistungen per year, plus a bar
 * (on a secondary right-hand axis) showing the absolute difference per year.
 * The bar is tinted to match whichever side is higher.
 */
@Component({
  selector: 'app-eigen-fremd-comparison',
  imports: [Echart],
  template: `<app-echart [options]="options()" [ariaLabel]="ariaLabel()" />`,
  styles: `:host { display: block; height: 100%; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EigenFremdComparison {
  readonly data = input.required<EigenFremdByYear[]>();

  readonly ariaLabel = computed(() =>
    'Liniendiagramm mit Differenz-Balken: Eigen- gegenüber Fremdleistungen je Jahr. ' +
    this.data()
      .map((d) => {
        const diff = Math.abs(d.eigenleistungen - d.fremdleistungen);
        const higher = d.eigenleistungen >= d.fremdleistungen ? 'Eigenleistungen' : 'Fremdleistungen';
        return (
          `${d.year}: Eigenleistungen ${formatEuro(d.eigenleistungen)}, ` +
          `Fremdleistungen ${formatEuro(d.fremdleistungen)}, ` +
          `Differenz ${formatEuro(diff)} (${higher} höher)`
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
        data: ['Eigenleistungen', 'Fremdleistungen', 'Differenz'],
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        valueFormatter: (v: unknown) => formatEuro(Number(v)),
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
          name: 'Leistungen',
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
            const eigenHigher = r.eigenleistungen >= r.fremdleistungen;
            return {
              value: Math.abs(r.eigenleistungen - r.fremdleistungen),
              itemStyle: { color: eigenHigher ? EIGEN_BAR : FREMD_BAR },
            };
          }),
        },
        {
          name: 'Eigenleistungen',
          type: 'line',
          yAxisIndex: 0,
          z: 3,
          symbolSize: 8,
          data: rows.map((r) => r.eigenleistungen),
          lineStyle: { width: 3, color: EIGEN_COLOR },
          itemStyle: { color: EIGEN_COLOR },
        },
        {
          name: 'Fremdleistungen',
          type: 'line',
          yAxisIndex: 0,
          z: 3,
          symbolSize: 8,
          data: rows.map((r) => r.fremdleistungen),
          lineStyle: { width: 3, color: FREMD_COLOR, type: 'dashed' },
          itemStyle: { color: FREMD_COLOR },
        },
      ],
    };
  });
}
