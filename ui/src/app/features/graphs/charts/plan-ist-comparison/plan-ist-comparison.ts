import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';

import { PlanIstByYear } from '../../../../core/services/project-data';
import { Echart } from '../../../../shared/echart/echart';
import {
  formatEuro,
  chartTextStyle,
  darkAxis,
  darkTooltip,
  CHART_ACCENT,
  CHART_TEXT,
} from '../../../../shared/chart-theme';

/** Colour for planned amounts (Geplant). */
const PLAN_COLOR = CHART_ACCENT;
/** Colour for actual amounts (Ist). */
const IST_COLOR = '#e8a700';

/** Format euros as thousands ("123 Tsd.") for axis labels. */
function thousands(v: number): string {
  return `${(v / 1000).toLocaleString('de-DE')} Tsd.`;
}

/**
 * Grouped bar chart comparing the planned payment schedule (Zahlungsplan) with
 * the realised costs (Ist) per year. Years that have not closed yet carry no
 * Ist bar.
 */
@Component({
  selector: 'app-plan-ist-comparison',
  imports: [Echart],
  template: `<app-echart [options]="options()" [ariaLabel]="ariaLabel()" />`,
  styles: `:host { display: block; height: 100%; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanIstComparison {
  readonly data = input.required<PlanIstByYear[]>();

  readonly ariaLabel = computed(
    () =>
      'Balkendiagramm: geplante gegenüber tatsächlichen Kosten je Jahr. ' +
      this.data()
        .map(
          (d) =>
            `${d.year}: Geplant ${formatEuro(d.geplant)}` +
            (d.ist === null ? ', Ist noch offen' : `, Ist ${formatEuro(d.ist)}`),
        )
        .join('. '),
  );

  readonly options = computed<EChartsCoreOption>(() => {
    const rows = this.data();
    return {
      textStyle: chartTextStyle,
      grid: { left: 8, right: 16, top: 48, bottom: 8, containLabel: true },
      legend: {
        top: 8,
        textStyle: { color: CHART_TEXT },
        data: ['Geplant', 'Ist'],
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v: unknown) =>
          v === null || v === undefined ? '—' : formatEuro(Number(v)),
        ...darkTooltip(),
      },
      xAxis: {
        type: 'category',
        data: rows.map((r) => String(r.year)),
        ...darkAxis(),
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        ...darkAxis(),
        axisLabel: { formatter: thousands, color: '#b8b8b8' },
      },
      series: [
        {
          name: 'Geplant',
          type: 'bar',
          data: rows.map((r) => r.geplant),
          barMaxWidth: 36,
          itemStyle: { color: PLAN_COLOR, borderRadius: [4, 4, 0, 0] },
        },
        {
          name: 'Ist',
          type: 'bar',
          data: rows.map((r) => r.ist),
          barMaxWidth: 36,
          itemStyle: { color: IST_COLOR, borderRadius: [4, 4, 0, 0] },
        },
      ],
    };
  });
}
