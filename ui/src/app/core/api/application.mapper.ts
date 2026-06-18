import { isDevMode } from '@angular/core';

import { CostBreakdown } from '../models/cost-breakdown';
import { Project } from '../models/project';
import { Sparte } from '../models/sparte';
import { ApplicationDto } from './dto/application.dto';

/**
 * Maps the backend `ApplicationDto` (snake_case, decimal strings, nested
 * objects) onto the UI's `Project` domain model. The downstream aggregation
 * pipeline is unchanged — only the source shape differs.
 */

/** Parse a DRF decimal string into a number. */
export function num(s: string): number {
  return Number(s);
}

/** Parse a nullable DRF decimal string into a number, or `null`. */
export function numOrNull(s: string | null): number | null {
  return s === null ? null : Number(s);
}

/**
 * Normalize an incoming division name for lookup: trim, lowercase, fold umlauts
 * (ä→ae ö→oe ü→ue ß→ss) so `"Fernwärme"` → `fernwaerme`.
 */
function normalizeDivision(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
}

/** Maps a normalized division name to a canonical {@link Sparte}. */
const DIVISION_TO_SPARTE: Record<string, Sparte> = {
  strom: 'Strom',
  gas: 'Gas',
  wasser: 'Wasser',
  infotechnik: 'Infotechnik',
  fernwaerme: 'Fernwaerme',
};

/** Resolve a division name to a Sparte, falling back to `'Sonstige'`. */
export function divisionToSparte(name: string): Sparte {
  const sparte = DIVISION_TO_SPARTE[normalizeDivision(name)];
  if (sparte) {
    return sparte;
  }
  if (isDevMode()) {
    console.warn(`Unknown division "${name}" mapped to "Sonstige".`);
  }
  return 'Sonstige';
}

/** Assemble the planned cost breakdown from the pre-computed `planned_*` fields. */
function plannedCosts(dto: ApplicationDto): CostBreakdown {
  return {
    materialkosten: num(dto.planned_material_costs),
    fremdleistungen: num(dto.planned_external_services),
    eigenleistungen: num(dto.planned_internal_services),
    ingenieurleistungDritte: num(dto.planned_engineering_services),
    zwischensummeKosten: num(dto.planned_subtotal),
    materialkostenzuschlag: {
      prozent: num(dto.material_surcharge_rate) * 100,
      betrag: num(dto.planned_material_surcharge),
    },
    investitionszuschlag: {
      prozent: num(dto.investment_surcharge_rate) * 100,
      betrag: num(dto.planned_investment_surcharge),
    },
    zwischensummeZuschlaege: num(dto.planned_total_surcharges),
    gesamtkosten: num(dto.planned_total_costs),
  };
}

/**
 * Assemble the realized cost breakdown from the `real_*` fields, or `null` when
 * no actuals are reported. The backend has no `real_subtotal` /
 * `real_total_surcharges`, so those are computed here from their parts; the
 * surcharge `prozent` reuses the planned rates.
 */
function realCosts(dto: ApplicationDto): CostBreakdown | null {
  if (dto.real_total_costs === null) {
    return null;
  }
  const materialkosten = numOrNull(dto.real_material_costs) ?? 0;
  const fremdleistungen = numOrNull(dto.real_external_services) ?? 0;
  const eigenleistungen = numOrNull(dto.real_internal_services) ?? 0;
  const ingenieurleistungDritte = numOrNull(dto.real_engineering_services) ?? 0;
  const materialSurcharge = numOrNull(dto.real_material_surcharge) ?? 0;
  const investmentSurcharge = numOrNull(dto.real_investment_surcharge) ?? 0;
  return {
    materialkosten,
    fremdleistungen,
    eigenleistungen,
    ingenieurleistungDritte,
    zwischensummeKosten:
      materialkosten + fremdleistungen + eigenleistungen + ingenieurleistungDritte,
    materialkostenzuschlag: {
      prozent: num(dto.material_surcharge_rate) * 100,
      betrag: materialSurcharge,
    },
    investitionszuschlag: {
      prozent: num(dto.investment_surcharge_rate) * 100,
      betrag: investmentSurcharge,
    },
    zwischensummeZuschlaege: materialSurcharge + investmentSurcharge,
    gesamtkosten: num(dto.real_total_costs),
  };
}

/**
 * Price per metre. Uses `cost_per_meter` when supplied, else derives it from the
 * planned total over the line length (the backend rarely supplies it today).
 */
function pricePerMeter(dto: ApplicationDto): number {
  const explicit = numOrNull(dto.cost_per_meter);
  if (explicit !== null) {
    return explicit;
  }
  const length = num(dto.pipe_length_m);
  return length > 0 ? num(dto.planned_total_costs) / length : 0;
}

/** Map a single application DTO to a `Project`. */
export function toProject(dto: ApplicationDto): Project {
  return {
    id: String(dto.id),
    projekttitel: dto.project_title,
    strasse: dto.street?.name ?? '',
    geschaeftsjahr: dto.fiscal_year,
    ausfuehrungszeit: { von: dto.execution_start, bis: dto.execution_end },
    antragsgrund: dto.reason,
    sparte: divisionToSparte(dto.division.name),
    asset: dto.asset.name,
    pspElement: dto.psp_element,
    kosten: plannedCosts(dto),
    realKosten: realCosts(dto),
    zahlungsplan: dto.payment_schedule.map((e) => ({
      year: e.year,
      amount: num(e.amount),
    })),
    leitungslaengeMeter: num(dto.pipe_length_m),
    preisProMeter: pricePerMeter(dto),
  };
}
