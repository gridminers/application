/** Cost estimate broken down by category (Kostenschätzung), in euros. */
export interface CostBreakdown {
  /** Materialkosten */
  materialkosten: number;
  /** Fremdleistungen */
  fremdleistungen: number;
  /** Eigenleistungen */
  eigenleistungen: number;
  /** Ingenieurleistung Dritte */
  ingenieurleistungDritte: number;
  /** Zuschläge */
  zuschlaege: number;
  /** Gesamtkosten (sum of the above) */
  gesamtkosten: number;
}
