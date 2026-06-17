import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsCoreOption } from 'echarts/core';

/**
 * Thin reusable wrapper around the ngx-echarts directive.
 * Handles sizing, auto-resize and an accessible name for the canvas region.
 */
@Component({
  selector: 'app-echart',
  imports: [NgxEchartsDirective],
  templateUrl: './echart.html',
  styleUrl: './echart.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Echart {
  /** ECharts option object describing the chart. */
  readonly options = input.required<EChartsCoreOption>();
  /** Accessible label describing what the chart shows. */
  readonly ariaLabel = input.required<string>();
}
