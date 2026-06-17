# Data Model

The UI visualizes **project orders** (*Projektaufträge*) of a grid infrastructure
company operating the utility grid for the city of **Braunschweig**. Each order is
extracted from a PDF in an upstream processing step. For the first draft we work
with **mock data** that mirrors the real document fields.

## Field glossary (DE → EN)

| German field            | Meaning (EN)                         | Type        | Notes |
| ----------------------- | ------------------------------------ | ----------- | ----- |
| Projekttitel            | Project title                        | string      | Human readable name |
| Auftragsgründe          | Reasons for the order                | string      | Free text justification |
| IT-System Änderungen    | IT system changes                    | string      | Free text, may be empty |
| Sparte                  | Utility division                     | enum        | One of the divisions below |
| Sparten-Details         | Division details                     | string      | What exactly is built/changed |
| Kostenstelle            | Cost center                          | string      | Accounting code |
| Materialkosten          | Material costs                       | number (€)  | Part of cost estimate |
| Fremdleistungen         | External services                    | number (€)  | Part of cost estimate |
| Eigenleistungen         | Internal / own services              | number (€)  | Part of cost estimate |
| Ingenieurleistung Dritte| Third-party engineering services     | number (€)  | Part of cost estimate |
| Zuschläge               | Surcharges                           | number (€)  | Part of cost estimate |
| Gesamtkosten            | Total costs                          | number (€)  | Sum of the above |
| Zahlungsplan nach Jahr  | Payment plan by year                 | array       | `{ year, amount }` entries |
| Leitungslänge           | Line / cable length                  | number (m)  | Length of grid line |
| Preis pro Meter         | Price per meter                      | number (€/m)| Derived/contextual metric |

## Divisions (Sparten)

`Strom` (electricity), `Gas`, `Wasser` (water), `Infotechnik` (info technology),
`Fernwärme` (district heating).

A project belongs to **exactly one** division and carries division-specific detail
text.

## TypeScript shape (target)

```ts
export type Sparte = 'Strom' | 'Gas' | 'Wasser' | 'Infotechnik' | 'Fernwaerme';

export interface CostBreakdown {
  materialkosten: number;
  fremdleistungen: number;
  eigenleistungen: number;
  ingenieurleistungDritte: number;
  zuschlaege: number;
  gesamtkosten: number;
}

export interface PaymentPlanEntry {
  year: number;
  amount: number;
}

export interface Project {
  id: string;
  projekttitel: string;
  auftragsgruende: string;
  itSystemAenderungen: string;
  sparte: Sparte;
  sparteDetails: string;
  kostenstelle: string;
  kosten: CostBreakdown;
  zahlungsplan: PaymentPlanEntry[];
  leitungslaengeMeter: number;
  preisProMeter: number;
}
```

Field names stay in (transliterated) German to keep a 1:1 mapping with the source
documents; ä/ö/ü/ß are written out (ae/oe/ue/ss) for safe identifiers.
