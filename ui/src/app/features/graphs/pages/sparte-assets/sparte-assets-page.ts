import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import {
  aggregateBudgetBySparte,
  aggregateCostComposition,
  aggregatePricePerMeter,
  ProjectData,
} from '../../../../core/services/project-data';
import { ChartCard } from '../../../../shared/chart-card/chart-card';
import { sparteLabel } from '../../../../shared/chart-theme';
import { BudgetByDivision } from '../../charts/budget-by-division/budget-by-division';
import { CostComposition } from '../../charts/cost-composition/cost-composition';
import { PricePerMeter } from '../../charts/price-per-meter/price-per-meter';
import { GraphFilterBar } from '../../filter-bar/graph-filter-bar';
import { createGraphFilterModel } from '../../filter-bar/graph-filter-model';

/** Sparte / Assets overview: budget per division, cost types and price/metre. */
@Component({
  selector: 'app-sparte-assets-page',
  imports: [
    GraphFilterBar,
    ChartCard,
    BudgetByDivision,
    CostComposition,
    PricePerMeter,
  ],
  templateUrl: './sparte-assets-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SparteAssetsPage {
  private readonly data = inject(ProjectData);
  protected readonly filter = createGraphFilterModel(this.data.projects);

  protected readonly budgetBySparte = computed(() =>
    aggregateBudgetBySparte(this.filter.filtered()),
  );
  protected readonly composition = computed(() =>
    aggregateCostComposition(this.filter.filtered()),
  );
  protected readonly pricePerMeter = computed(() =>
    aggregatePricePerMeter(this.filter.filtered()),
  );

  protected readonly scope = computed(() => {
    const sparten = [...this.filter.selectedSparten()];
    const assets = [...this.filter.selectedAssets()];
    const parts: string[] = [];
    parts.push(
      sparten.length ? sparten.map((s) => sparteLabel(s)).join(', ') : 'alle Sparten',
    );
    if (assets.length) {
      parts.push(assets.join(', '));
    }
    return parts.join(' — ');
  });
}
