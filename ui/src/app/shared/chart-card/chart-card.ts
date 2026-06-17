import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Presentational card that frames a chart with a title and optional
 * description. Chart content is projected via <ng-content>.
 */
@Component({
  selector: 'app-chart-card',
  imports: [],
  templateUrl: './chart-card.html',
  styleUrl: './chart-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartCard {
  readonly title = input.required<string>();
  readonly description = input<string>('');
}
