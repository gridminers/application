import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { aggregatePlanIstByYear, ProjectData } from '../../../../core/services/project-data';
import { ChartCard } from '../../../../shared/chart-card/chart-card';
import { DataStatus } from '../../../../shared/data-status/data-status';
import { GraphScroll } from '../../../../shared/graph-scroll/graph-scroll';
import { PlanIstComparison } from '../../charts/plan-ist-comparison/plan-ist-comparison';
import {
  PlanIstTotals,
  PlanIstTotalsData,
} from '../../charts/plan-ist-totals/plan-ist-totals';
import { GraphFilterBar } from '../../filter-bar/graph-filter-bar';
import { createGraphFilterModel } from '../../filter-bar/graph-filter-model';

/** Plan vs. actual cost comparison over the years. */
@Component({
  selector: 'app-cost-comparison-page',
  imports: [GraphFilterBar, GraphScroll, ChartCard, DataStatus, PlanIstComparison, PlanIstTotals],
  templateUrl: './cost-comparison-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CostComparisonPage {
  private readonly data = inject(ProjectData);
  protected readonly filter = createGraphFilterModel(this.data.projects);

  protected readonly planIst = computed(() =>
    aggregatePlanIstByYear(this.filter.filtered()),
  );

  /** Totals over the closed years only, so plan and Ist are comparable. */
  protected readonly totals = computed<PlanIstTotalsData>(() =>
    this.planIst().reduce<PlanIstTotalsData>(
      (acc, row) =>
        row.ist === null
          ? acc
          : { geplant: acc.geplant + row.geplant, ist: acc.ist + row.ist },
      { geplant: 0, ist: 0 },
    ),
  );
}
