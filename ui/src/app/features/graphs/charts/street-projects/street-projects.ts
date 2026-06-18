import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';

import { Echart } from '../../../../shared/echart/echart';
import {
  chartTextStyle,
  chartAxis,
  chartTooltip,
  chartSurface,
  chartTextMuted,
} from '../../../../shared/chart-theme';

/** Data for the street-projects chart: counts per division, stacked by year. */
export interface StreetProjectsData {
  /** Division labels along the x-axis. */
  categories: string[];
  /** Colour per division (matches the map's street lines), aligned to `categories`. */
  categoryColors: string[];
  /** One stacked series per fiscal year. */
  series: { name: string; data: number[] }[];
}

/**
 * Stacked bar chart showing the number of projects of a single street, broken
 * down by division class (x-axis) and fiscal year (stack).
 */
@Component({
  selector: 'app-street-projects',
  imports: [Echart],
  template: `<app-echart [options]="options()" [ariaLabel]="ariaLabel()" />`,
  styles: `:host { display: block; height: 100%; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StreetProjects {
  readonly data = input.required<StreetProjectsData>();

  readonly ariaLabel = computed(() => {
    const d = this.data();
    if (!d.categories.length) {
      return 'Balkendiagramm: keine Projekte für die aktuelle Auswahl.';
    }
    const totals = d.categories.map((cat, i) => {
      const sum = d.series.reduce((s, series) => s + series.data[i], 0);
      return `${cat}: ${sum} ${sum === 1 ? 'Projekt' : 'Projekte'}`;
    });
    return (
      'Gestapeltes Balkendiagramm: Anzahl Projekte je Sparte, ' +
      `aufgeschlüsselt nach Jahr. ${totals.join(', ')}.`
    );
  });

  readonly options = computed<EChartsCoreOption>(() => {
    const d = this.data();
    const colors = d.categoryColors;
    return {
      textStyle: chartTextStyle(),
      grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...chartTooltip(),
      },
      xAxis: {
        type: 'category',
        data: d.categories,
        ...chartAxis(),
        axisLabel: { interval: 0, color: chartTextMuted() },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        ...chartAxis(),
        axisLabel: { color: chartTextMuted() },
      },
      series: d.series.map((s) => ({
        name: s.name,
        type: 'bar',
        stack: 'projekte',
        emphasis: { focus: 'series' },
        data: s.data,
        barMaxWidth: 64,
        itemStyle: {
          // Colour each bar by its division (Sparte) to match the map's lines;
          // a thin surface-coloured border keeps the stacked year segments legible.
          color: (params: { dataIndex: number }) => colors[params.dataIndex],
          borderColor: chartSurface(),
          borderWidth: 1,
        },
      })),
    };
  });
}
