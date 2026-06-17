import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { aggregatePlanIstByYear, ProjectData } from '../../../../core/services/project-data';
import { ChartCard } from '../../../../shared/chart-card/chart-card';
import { PlanIstComparison } from '../../charts/plan-ist-comparison/plan-ist-comparison';
import { GraphFilterBar } from '../../filter-bar/graph-filter-bar';
import { createGraphFilterModel } from '../../filter-bar/graph-filter-model';

/** Plan vs. actual cost comparison over the years. */
@Component({
  selector: 'app-cost-comparison-page',
  imports: [GraphFilterBar, ChartCard, PlanIstComparison],
  templateUrl: './cost-comparison-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CostComparisonPage {
  private readonly data = inject(ProjectData);
  protected readonly filter = createGraphFilterModel(this.data.projects);

  protected readonly planIst = computed(() =>
    aggregatePlanIstByYear(this.filter.filtered()),
  );
}
