import { Component, input } from '@angular/core';

@Component({
  selector: 'app-feature-card',
  imports: [],
  templateUrl: './feature-card.html',
  styleUrl: './feature-card.css',
})
export class FeatureCard {
  /** Decorative icon (emoji or glyph). */
  readonly icon = input<string>('');
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
