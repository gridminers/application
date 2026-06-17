import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';

import { Sparte } from '../../../../core/models/sparte';
import { Echart } from '../../../../shared/echart/echart';
import {
  sparteLabel,
  SPARTE_COLORS,
  chartTextStyle,
  darkAxis,
  darkTooltip,
  CHART_TEXT,
} from '../../../../shared/chart-theme';

/** One division's project counts, aligned to the chart categories. */
export interface StreetSeries {
  sparte: Sparte;
  counts: number[];
}

/** Data for the street-projects chart. */
export interface StreetProjectsData {
  /** Category labels along the x-axis (streets or years). */
  categories: string[];
  /** Project counts per division, stacked. */
  bySparte: StreetSeries[];
  /** What a category represents, used in the accessible label. */
  categoryKind: string;
}

/**
 * Stacked bar chart showing the number of projects per category (street or, for
 * a focused street, year), broken down by division. Driven entirely by the page
 * filter bar and street selector.
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
      const sum = d.bySparte.reduce((s, series) => s + series.counts[i], 0);
      return `${cat}: ${sum} ${sum === 1 ? 'Projekt' : 'Projekte'}`;
    });
    return (
      `Gestapeltes Balkendiagramm: Anzahl Projekte je ${d.categoryKind}, ` +
      `aufgeschlüsselt nach Sparte. ${totals.join(', ')}.`
    );
  });

  readonly options = computed<EChartsCoreOption>(() => {
    const d = this.data();
    return {
      textStyle: chartTextStyle,
      grid: { left: 8, right: 16, top: 48, bottom: 8, containLabel: true },
      legend: { top: 8, textStyle: { color: CHART_TEXT } },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...darkTooltip(),
      },
      xAxis: {
        type: 'category',
        data: d.categories,
        ...darkAxis(),
        axisLabel: { interval: 0, color: '#b8b8b8' },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        ...darkAxis(),
        axisLabel: { color: '#b8b8b8' },
      },
      series: d.bySparte.map((s) => ({
        name: sparteLabel(s.sparte),
        type: 'bar',
        stack: 'projekte',
        emphasis: { focus: 'series' },
        itemStyle: { color: SPARTE_COLORS[s.sparte] },
        data: s.counts,
        barMaxWidth: 56,
      })),
    };
  });
}
