import { Component, inject } from '@angular/core';

import { ProjectData } from '../../../core/services/project-data';
import { ChartCard } from '../../../shared/chart-card/chart-card';
import { BudgetByDivision } from '../charts/budget-by-division/budget-by-division';
import { CostComposition } from '../charts/cost-composition/cost-composition';
import { PaymentPlan } from '../charts/payment-plan/payment-plan';
import { PricePerMeter } from '../charts/price-per-meter/price-per-meter';

@Component({
  selector: 'app-graphs',
  imports: [
    ChartCard,
    BudgetByDivision,
    CostComposition,
    PaymentPlan,
    PricePerMeter,
  ],
  templateUrl: './graphs.html',
  styleUrl: './graphs.css',
})
export class Graphs {
  private readonly data = inject(ProjectData);

  readonly budgetBySparte = this.data.budgetBySparte;
  readonly costComposition = this.data.costComposition;
  readonly paymentsByYear = this.data.paymentsByYear;
  readonly pricePerMeter = this.data.pricePerMeter;
}
