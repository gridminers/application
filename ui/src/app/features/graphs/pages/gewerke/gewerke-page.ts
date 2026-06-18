import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import {
  aggregateEigenFremdByYear,
  aggregateExpendituresByYear,
  aggregateGewerke,
  ProjectData,
} from '../../../../core/services/project-data';
import { isGewerk } from '../../../../core/services/project-derivations';
import { ChartCard } from '../../../../shared/chart-card/chart-card';
import { DataStatus } from '../../../../shared/data-status/data-status';
import { GraphScroll } from '../../../../shared/graph-scroll/graph-scroll';
import { EigenFremdComparison } from '../../charts/eigen-fremd-comparison/eigen-fremd-comparison';
import { ExpendituresByYear } from '../../charts/expenditures-by-year/expenditures-by-year';
import { GewerkeBreakdown } from '../../charts/gewerke-breakdown/gewerke-breakdown';
import { GraphFilterBar } from '../../filter-bar/graph-filter-bar';
import { createGraphFilterModel } from '../../filter-bar/graph-filter-model';

/** Gewerke (trades) breakdown — a deeper cut of the Sparte / Assets view. */
@Component({
  selector: 'app-gewerke-page',
  imports: [
    GraphFilterBar,
    GraphScroll,
    ChartCard,
    DataStatus,
    ExpendituresByYear,
    GewerkeBreakdown,
    EigenFremdComparison,
  ],
  templateUrl: './gewerke-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GewerkePage {
  private readonly data = inject(ProjectData);

  /** Only projects whose asset is a network "-netz" count as a Gewerk. */
  private readonly gewerkProjects = computed(() =>
    this.data.projects().filter((p) => isGewerk(p.asset)),
  );

  protected readonly filter = createGraphFilterModel(this.gewerkProjects);

  protected readonly expendituresByYear = computed(() =>
    aggregateExpendituresByYear(this.filter.filtered()),
  );
  protected readonly gewerke = computed(() =>
    aggregateGewerke(this.filter.filtered()),
  );
  protected readonly eigenFremd = computed(() =>
    aggregateEigenFremdByYear(this.filter.filtered()),
  );
}
