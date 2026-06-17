# Data Model

The UI visualizes **project orders** (*Projektaufträge*) of a grid infrastructure
company operating the utility grid for the city of **Braunschweig**. Each order is
extracted from a PDF in an upstream processing step. For the first draft we work
with **mock data** that mirrors the real document fields.

## Field glossary (DE → EN)

The 19 key data points extracted per document (`Antrag auf Mittelfreigabe`):

| #  | German field                       | Meaning (EN)                          | Type        | Notes |
| -- | ---------------------------------- | ------------------------------------- | ----------- | ----- |
| 1  | Projekttitel                       | Project title                         | string      | Human readable name |
| 2  | Geschäftsjahr                      | Fiscal year                           | number      | Also the value used for the yearly evaluation |
| 3  | Ausführungszeit (von – bis)        | Execution period                      | object      | `{ von, bis }` ISO dates |
| 4  | Antragsgrund                       | Reason for the request                | string      | Free text justification |
| 5  | Sparte                             | Utility division                      | enum        | One of the divisions below |
| 6  | Asset                              | Network asset within the division     | string      | e.g. `20 kV-Netz`, `GDR`, `LWL-Netz` |
| 7  | PSP-Element                        | Project structure plan element        | string      | Accounting code, e.g. `2H.02.1226.104.002` |
| 8  | Leitungsmeter                      | Line / trench length                  | number (m)  | Length of grid line |
| 9  | Euro pro Meter Trassenlänge        | Price per meter                       | number (€/m)| Contextual metric |
| 10 | Materialkosten (netto)             | Material costs (net)                  | number (€)  | Cost estimate item 1 |
| 11 | Fremdleistungen                    | External services                     | number (€)  | Cost estimate item 2 |
| 12 | Eigenleistungen                    | Internal / own services               | number (€)  | Cost estimate item 3 |
| 13 | Ingenieurleistungen Dritte         | Third-party engineering services      | number (€)  | Cost estimate item 4 |
| 14 | Zwischensumme Kosten (10+11+12+13) | Subtotal costs (excl. surcharges)     | number (€)  | `A. Zwischensumme Kosten (1.–4.)` |
| 15 | Materialkostenzuschlag (17 %)      | Material cost surcharge               | object      | `{ prozent, betrag }`; 17 % of (10) |
| 16 | Investitionszuschlag (23 %)        | Investment surcharge                  | object      | `{ prozent, betrag }`; 23 % of (14 + 15) |
| 17 | Zwischensumme Zuschläge            | Subtotal surcharges                   | number (€)  | (15) + (16) |
| 18 | Gesamtkosten                       | Total costs                           | number (€)  | (14) + (17) |
| 19 | Zahlungsplan (3 Jahre)             | Payment plan (3 years)                | array       | `{ year, amount }` entries |

## Divisions (Sparten)

`Strom` (electricity), `Gas`, `Wasser` (water), `Infotechnik` (info technology),
`Fernwärme` (district heating).

A project belongs to **exactly one** division and carries division-specific detail
text.

## TypeScript shape (target)

```ts
export type Sparte = 'Strom' | 'Gas' | 'Wasser' | 'Infotechnik' | 'Fernwaerme';

export interface Surcharge {
  prozent: number;
  betrag: number;
}

export interface CostBreakdown {
  materialkosten: number;
  fremdleistungen: number;
  eigenleistungen: number;
  ingenieurleistungDritte: number;
  zwischensummeKosten: number;        // 10 + 11 + 12 + 13
  materialkostenzuschlag: Surcharge;  // 17 %
  investitionszuschlag: Surcharge;    // 23 %
  zwischensummeZuschlaege: number;    // 15 + 16
  gesamtkosten: number;               // 14 + 17
}

export interface PaymentPlanEntry {
  year: number;
  amount: number;
}

export interface Ausfuehrungszeit {
  von: string; // ISO date
  bis: string; // ISO date
}

export interface Project {
  id: string;
  projekttitel: string;
  geschaeftsjahr: number;
  ausfuehrungszeit: Ausfuehrungszeit;
  antragsgrund: string;
  sparte: Sparte;
  asset: string;
  pspElement: string;
  kosten: CostBreakdown;
  zahlungsplan: PaymentPlanEntry[];
  leitungslaengeMeter: number;
  preisProMeter: number;
}
```

Field names stay in (transliterated) German to keep a 1:1 mapping with the source
documents; ä/ö/ü/ß are written out (ae/oe/ue/ss) for safe identifiers.
