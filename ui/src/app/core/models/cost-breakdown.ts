/** A surcharge line (Zuschlag): a percentage rate and its resulting euro amount. */
export interface Surcharge {
  /** Prozentsatz (%) */
  prozent: number;
  /** Betrag in euros */
  betrag: number;
}

/** Cost estimate broken down by category (Kostenschätzung), in euros. */
export interface CostBreakdown {
  /** 1. Materialkosten (netto) */
  materialkosten: number;
  /** 2. Fremdleistungen */
  fremdleistungen: number;
  /** 3. Eigenleistungen */
  eigenleistungen: number;
  /** 4. Ingenieurleistungen Dritte */
  ingenieurleistungDritte: number;
  /** A. Zwischensumme Kosten ohne Zuschläge (1 + 2 + 3 + 4) */
  zwischensummeKosten: number;
  /** 5. Materialkostenzuschlag (typ. 17 % auf Materialkosten) */
  materialkostenzuschlag: Surcharge;
  /** 6. Investitionszuschlag (typ. 23 % auf Zwischensumme + Materialkostenzuschlag) */
  investitionszuschlag: Surcharge;
  /** B. Zwischensumme Zuschläge (5 + 6) */
  zwischensummeZuschlaege: number;
  /** C. Beantragte Gesamtkosten (A + B) */
  gesamtkosten: number;
}
