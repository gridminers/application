import { CostBreakdown } from './cost-breakdown';
import { PaymentPlanEntry } from './payment-plan-entry';
import { Sparte } from './sparte';

/** A grid-infrastructure project order (Projektauftrag). */
export interface Project {
  id: string;
  /** Projekttitel */
  projekttitel: string;
  /** Auftragsgründe */
  auftragsgruende: string;
  /** IT-System Änderungen */
  itSystemAenderungen: string;
  /** Sparte (utility division) */
  sparte: Sparte;
  /** Sparten-Details — what exactly is built/changed */
  sparteDetails: string;
  /** Kostenstelle (cost center) */
  kostenstelle: string;
  /** Kostenschätzung (cost estimate) */
  kosten: CostBreakdown;
  /** Zahlungsplan nach Jahr (payment plan by year) */
  zahlungsplan: PaymentPlanEntry[];
  /** Leitungslänge in metres */
  leitungslaengeMeter: number;
  /** Preis pro Meter (€/m) */
  preisProMeter: number;
}
