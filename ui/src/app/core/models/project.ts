import { CostBreakdown } from './cost-breakdown';
import { PaymentPlanEntry } from './payment-plan-entry';
import { Sparte } from './sparte';

/** Execution period of the measure (Ausführungszeit von – bis). */
export interface Ausfuehrungszeit {
  /** Start date (ISO 8601, yyyy-mm-dd). */
  von: string;
  /** End date (ISO 8601, yyyy-mm-dd). */
  bis: string;
}

/** A grid-infrastructure project order (Projektauftrag). */
export interface Project {
  id: string;
  /** Projekttitel */
  projekttitel: string;
  /** Straße — street the measure is located on, as extracted by the backend */
  strasse: string;
  /** Geschäftsjahr — fiscal year; also the value used for the yearly evaluation */
  geschaeftsjahr: number;
  /** Ausführungszeit (von – bis) */
  ausfuehrungszeit: Ausfuehrungszeit;
  /** Antragsgrund — reason / justification for the request (free text) */
  antragsgrund: string;
  /** Sparte (utility division) */
  sparte: Sparte;
  /** Asset — specific network asset within the division (e.g. "20 kV-Netz") */
  asset: string;
  /** PSP-Element — project structure plan element / accounting code */
  pspElement: string;
  /** Kostenschätzung (cost estimate) */
  kosten: CostBreakdown;
  /** Realized cost breakdown (Ist), or null when no actuals reported yet. */
  realKosten: CostBreakdown | null;
  /** Zahlungsplan nach Jahr (payment plan by year) */
  zahlungsplan: PaymentPlanEntry[];
  /** Leitungsmeter — line / trench length in metres */
  leitungslaengeMeter: number;
  /** Euro pro Meter Trassenlänge (€/m) */
  preisProMeter: number;
}
