import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import {
  aggregateBudgetByAsset,
  aggregateBudgetBySparte,
  aggregateCostComposition,
  aggregateEigenFremdByYear,
  aggregateExpendituresByYear,
  aggregatePricePerMeterByYear,
  ProjectData,
} from '../../../../core/services/project-data';
import { ChartCard } from '../../../../shared/chart-card/chart-card';
import { sparteLabel } from '../../../../shared/chart-theme';
import { BudgetByAsset } from '../../charts/budget-by-asset/budget-by-asset';
import { BudgetByDivision } from '../../charts/budget-by-division/budget-by-division';
import { CostComposition } from '../../charts/cost-composition/cost-composition';
import { EigenFremdComparison } from '../../charts/eigen-fremd-comparison/eigen-fremd-comparison';
import { ExpendituresByYear } from '../../charts/expenditures-by-year/expenditures-by-year';
import { PricePerMeter } from '../../charts/price-per-meter/price-per-meter';
import { GraphFilterBar } from '../../filter-bar/graph-filter-bar';
import { createGraphFilterModel } from '../../filter-bar/graph-filter-model';

/** Sparte / Assets overview: budget per division, cost types and price/metre. */
@Component({
  selector: 'app-sparte-assets-page',
  imports: [
    GraphFilterBar,
    ChartCard,
    ExpendituresByYear,
    BudgetByDivision,
    BudgetByAsset,
    CostComposition,
    EigenFremdComparison,
    PricePerMeter,
  ],
  templateUrl: './sparte-assets-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SparteAssetsPage {
  private readonly data = inject(ProjectData);
  protected readonly filter = createGraphFilterModel(this.data.projects);

  private readonly body = viewChild<ElementRef<HTMLElement>>('body');
  /** True while the chart grid can still be scrolled further down. */
  protected readonly canScrollDown = signal(false);

  constructor() {
    afterNextRender(() => {
      const el = this.body()?.nativeElement;
      if (!el) {
        return;
      }
      this.updateScrollState();
      const observer = new ResizeObserver(() => this.updateScrollState());
      observer.observe(el);
    });
  }

  protected onScroll(): void {
    this.updateScrollState();
  }

  protected scrollDown(): void {
    const el = this.body()?.nativeElement;
    el?.scrollBy({ top: el.clientHeight * 0.8, behavior: 'smooth' });
  }

  private updateScrollState(): void {
    const el = this.body()?.nativeElement;
    if (!el) {
      return;
    }
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.canScrollDown.set(remaining > 8);
  }

  protected readonly expendituresByYear = computed(() =>
    aggregateExpendituresByYear(this.filter.filtered()),
  );
  protected readonly budgetBySparte = computed(() =>
    aggregateBudgetBySparte(this.filter.filtered()),
  );
  protected readonly budgetByAsset = computed(() =>
    aggregateBudgetByAsset(this.filter.filtered()),
  );
  protected readonly composition = computed(() =>
    aggregateCostComposition(this.filter.filtered()),
  );
  protected readonly pricePerMeter = computed(() =>
    aggregatePricePerMeterByYear(this.filter.filtered()),
  );
  protected readonly eigenFremd = computed(() =>
    aggregateEigenFremdByYear(this.filter.filtered()),
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
