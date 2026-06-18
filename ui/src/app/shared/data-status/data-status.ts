import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ProjectData } from '../../core/services/project-data';

/**
 * Lightweight, accessible status banner for the data-driven pages. Shows a
 * loading hint while the initial API request is in flight, the load error (with
 * a note that mock data is shown as a fallback), or an empty-state message when
 * no projects are available. Renders nothing once data is present.
 */
@Component({
  selector: 'app-data-status',
  imports: [],
  template: `
    @if (loading()) {
      <p class="data-status data-status--loading" role="status" aria-live="polite">
        <span class="data-status__spinner" aria-hidden="true"></span>
        Projektdaten werden geladen …
      </p>
    } @else if (error()) {
      <p class="data-status data-status--error" role="alert">{{ error() }}</p>
    } @else if (empty()) {
      <p class="data-status data-status--empty" role="status">
        Keine Projektdaten vorhanden.
      </p>
    }
  `,
  styleUrl: './data-status.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataStatus {
  private readonly data = inject(ProjectData);

  protected readonly loading = this.data.loading;
  protected readonly error = this.data.error;
  protected readonly empty = computed(
    () => !this.data.loading() && this.data.projectCount() === 0,
  );
}
