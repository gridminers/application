import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { SPARTEN } from '../../../../core/models/sparte';
import { ProjectData } from '../../../../core/services/project-data';
import { projectStreet } from '../../../../core/services/project-derivations';
import { ChartCard } from '../../../../shared/chart-card/chart-card';
import { sparteLabel } from '../../../../shared/chart-theme';
import { GraphScroll } from '../../../../shared/graph-scroll/graph-scroll';
import {
  StreetProjects,
  StreetProjectsData,
} from '../../charts/street-projects/street-projects';
import { GraphFilterBar } from '../../filter-bar/graph-filter-bar';
import { createGraphFilterModel } from '../../filter-bar/graph-filter-model';

/** Straßendetails: number of projects for a single selected street. */
@Component({
  selector: 'app-street-details-page',
  imports: [GraphFilterBar, GraphScroll, ChartCard, StreetProjects],
  templateUrl: './street-details-page.html',
  styleUrl: './street-details-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StreetDetailsPage {
  private readonly data = inject(ProjectData);
  protected readonly filter = createGraphFilterModel(this.data.projects);

  /** All streets to choose from. Empty string means none selected yet. */
  protected readonly streets = this.data.streets;
  /** Initialised from the `strasse` query param (e.g. when opened from the map). */
  protected readonly selectedStreet = signal<string>(
    inject(ActivatedRoute).snapshot.queryParamMap.get('strasse') ?? '',
  );

  protected readonly chartData = computed<StreetProjectsData>(() => {
    const street = this.selectedStreet();
    const inStreet = this.filter
      .filtered()
      .filter((p) => projectStreet(p) === street);

    const sparten = SPARTEN.filter((s) => inStreet.some((p) => p.sparte === s));
    const years = [...new Set(inStreet.map((p) => p.geschaeftsjahr))].sort(
      (a, b) => a - b,
    );

    return {
      categories: sparten.map((s) => sparteLabel(s)),
      series: years.map((year) => ({
        name: String(year),
        data: sparten.map(
          (sparte) =>
            inStreet.filter((p) => p.sparte === sparte && p.geschaeftsjahr === year)
              .length,
        ),
      })),
    };
  });

  protected onStreetChange(value: string): void {
    this.selectedStreet.set(value);
  }
}
