import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';

import { GewerkeAggregate } from '../../../../core/services/project-data';
import { Echart } from '../../../../shared/echart/echart';
import {
  formatEuro,
  formatAxisEuro,
  chartTextStyle,
  chartAxis,
  chartTooltip,
  categoryPalette,
  chartText,
  chartTextMuted,
} from '../../../../shared/chart-theme';

/** Cost-type series rendered as stacked segments per trade. */
const SERIES: readonly { name: string; pick: (g: GewerkeAggregate) => number }[] = [
  { name: 'Materialkosten', pick: (g) => g.composition.materialkosten },
  { name: 'Fremdleistungen', pick: (g) => g.composition.fremdleistungen },
  { name: 'Eigenleistungen', pick: (g) => g.composition.eigenleistungen },
  { name: 'Ingenieurleistung Dritte', pick: (g) => g.composition.ingenieurleistungDritte },
  { name: 'Zuschläge', pick: (g) => g.composition.zuschlaege },
];

/** Compact euro label for axis ticks, scaling Tsd./Mio. to the magnitude. */
function thousands(v: number): string {
  return formatAxisEuro(v);
}

/** Stacked bar chart: cost composition broken down per trade (Gewerk). */
@Component({
  selector: 'app-gewerke-breakdown',
  imports: [Echart],
  template: `<app-echart [options]="options()" [ariaLabel]="ariaLabel()" />`,
  styles: `:host { display: block; height: 100%; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GewerkeBreakdown {
  readonly data = input.required<GewerkeAggregate[]>();

  readonly ariaLabel = computed(
    () =>
      'Gestapeltes Balkendiagramm: Kostenarten je Gewerk. ' +
      this.data()
        .map(
          (g) =>
            `${g.gewerk}: ${formatEuro(g.gesamtkosten)} aus ${g.anzahl} ` +
            `${g.anzahl === 1 ? 'Projekt' : 'Projekten'}`,
        )
        .join('. '),
  );

  readonly options = computed<EChartsCoreOption>(() => {
    const rows = this.data();
    return {
      color: categoryPalette(),
      textStyle: chartTextStyle(),
      grid: { left: 8, right: 16, top: 48, bottom: 8, containLabel: true },
      legend: { top: 8, textStyle: { color: chartText() } },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v: unknown) => formatEuro(Number(v)),
        ...chartTooltip(),
      },
      xAxis: {
        type: 'category',
        data: rows.map((r) => r.gewerk),
        ...chartAxis(),
        axisLabel: { interval: 0, color: chartTextMuted() },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        ...chartAxis(),
        axisLabel: { formatter: thousands, color: chartTextMuted() },
      },
      series: SERIES.map((s) => ({
        name: s.name,
        type: 'bar',
        stack: 'kosten',
        emphasis: { focus: 'series' },
        data: rows.map((r) => s.pick(r)),
        barMaxWidth: 56,
      })),
    };
  });
}
