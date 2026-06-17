/** A single entry of the payment plan (Zahlungsplan nach Jahr). */
export interface PaymentPlanEntry {
  /** Calendar year. */
  year: number;
  /** Amount scheduled for that year, in euros. */
  amount: number;
}
