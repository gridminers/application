import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { SPARTEN } from '../../../../core/models/sparte';
import { aggregateStreets, ProjectData } from '../../../../core/services/project-data';
import { projectStreet } from '../../../../core/services/project-derivations';
import { ChartCard } from '../../../../shared/chart-card/chart-card';
import {
  StreetProjects,
  StreetProjectsData,
} from '../../charts/street-projects/street-projects';
import { GraphFilterBar } from '../../filter-bar/graph-filter-bar';
import { createGraphFilterModel } from '../../filter-bar/graph-filter-model';

/** Straßendetails: number of projects per street, filterable and drill-down. */
@Component({
  selector: 'app-street-details-page',
  imports: [GraphFilterBar, ChartCard, StreetProjects],
  templateUrl: './street-details-page.html',
  styleUrl: './street-details-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StreetDetailsPage {
  private readonly data = inject(ProjectData);
  protected readonly filter = createGraphFilterModel(this.data.projects);

  /** Currently focused street; empty string means "all streets". */
  protected readonly selectedStreet = signal<string>('');

  /** Streets available given the active facet filters. */
  protected readonly availableStreets = computed(() =>
    aggregateStreets(this.filter.filtered()),
  );

  /** The street to actually chart (ignored if filtered out of scope). */
  private readonly effectiveStreet = computed(() => {
    const street = this.selectedStreet();
    return street && this.availableStreets().includes(street) ? street : '';
  });

  protected readonly chartData = computed<StreetProjectsData>(() => {
    const projects = this.filter.filtered();
    const street = this.effectiveStreet();

    if (street) {
      const inStreet = projects.filter((p) => projectStreet(p) === street);
      const years = [...new Set(inStreet.map((p) => p.geschaeftsjahr))].sort(
        (a, b) => a - b,
      );
      const sparten = SPARTEN.filter((s) => inStreet.some((p) => p.sparte === s));
      return {
        categories: years.map(String),
        bySparte: sparten.map((sparte) => ({
          sparte,
          counts: years.map(
            (y) =>
              inStreet.filter((p) => p.geschaeftsjahr === y && p.sparte === sparte)
                .length,
          ),
        })),
        categoryKind: 'Jahr',
      };
    }

    const streets = this.availableStreets();
    const sparten = SPARTEN.filter((s) => projects.some((p) => p.sparte === s));
    return {
      categories: streets,
      bySparte: sparten.map((sparte) => ({
        sparte,
        counts: streets.map(
          (st) =>
            projects.filter((p) => projectStreet(p) === st && p.sparte === sparte)
              .length,
        ),
      })),
      categoryKind: 'Straße',
    };
  });

  protected onStreetChange(value: string): void {
    this.selectedStreet.set(value);
  }
}
