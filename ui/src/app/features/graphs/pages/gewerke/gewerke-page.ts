import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import {
  aggregateEigenFremdByYear,
  aggregateGewerke,
  ProjectData,
} from '../../../../core/services/project-data';
import { ChartCard } from '../../../../shared/chart-card/chart-card';
import { EigenFremdComparison } from '../../charts/eigen-fremd-comparison/eigen-fremd-comparison';
import { GewerkeBreakdown } from '../../charts/gewerke-breakdown/gewerke-breakdown';
import { GraphFilterBar } from '../../filter-bar/graph-filter-bar';
import { createGraphFilterModel } from '../../filter-bar/graph-filter-model';

/** Gewerke (trades) breakdown — a deeper cut of the Sparte / Assets view. */
@Component({
  selector: 'app-gewerke-page',
  imports: [GraphFilterBar, ChartCard, GewerkeBreakdown, EigenFremdComparison],
  templateUrl: './gewerke-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GewerkePage {
  private readonly data = inject(ProjectData);
  protected readonly filter = createGraphFilterModel(this.data.projects);

  protected readonly gewerke = computed(() =>
    aggregateGewerke(this.filter.filtered()),
  );
  protected readonly eigenFremd = computed(() =>
    aggregateEigenFremdByYear(this.filter.filtered()),
  );
}
