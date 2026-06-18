import { ApplicationDto } from './dto/application.dto';
import { divisionToSparte, num, numOrNull, toProject } from './application.mapper';

/** A complete application DTO, overridable per test. */
function dto(overrides: Partial<ApplicationDto> = {}): ApplicationDto {
  return {
    id: 1,
    division: { id: 2, name: 'Strom', abbreviation: 'S' },
    asset: { id: 5, name: '20 kV-Netz', description: '' },
    trade: { pk: 5, asset: 5 },
    street: { id: 9, name: 'Elbestraße' },
    project_title: 'Erneuerung Mittelspannungsnetz Weststadt',
    fiscal_year: 2024,
    psp_element: '2H.01.2410.101.001',
    reason: 'Altersbedingter Austausch',
    execution_start: '2024-03-04',
    execution_end: '2025-09-30',
    pipe_length_m: '4200.00',
    cost_per_meter: null,
    material_surcharge_rate: '0.1700',
    investment_surcharge_rate: '0.2300',
    planned_material_costs: '420000.00',
    planned_external_services: '310000.00',
    planned_internal_services: '180000.00',
    planned_engineering_services: '95000.00',
    planned_subtotal: '1005000.00',
    planned_material_surcharge: '71400.00',
    planned_investment_surcharge: '247572.00',
    planned_total_surcharges: '318972.00',
    planned_total_costs: '1323972.00',
    real_material_costs: null,
    real_external_services: null,
    real_internal_services: null,
    real_engineering_services: null,
    real_material_surcharge: null,
    real_investment_surcharge: null,
    real_total_costs: null,
    payment_schedule: [
      { year: 2024, share: 0.26, amount: '350000.00' },
      { year: 2025, share: 0.53, amount: '700000.00' },
      { year: 2026, share: 0.21, amount: '273972.00' },
    ],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('num / numOrNull', () => {
  it('coerces decimal strings to numbers', () => {
    expect(num('420000.00')).toBe(420000);
    expect(num('0.1700')).toBeCloseTo(0.17);
  });

  it('maps null through, otherwise coerces', () => {
    expect(numOrNull(null)).toBeNull();
    expect(numOrNull('51688.91')).toBeCloseTo(51688.91);
  });
});

describe('divisionToSparte', () => {
  it('maps each known division name', () => {
    expect(divisionToSparte('Strom')).toBe('Strom');
    expect(divisionToSparte('Gas')).toBe('Gas');
    expect(divisionToSparte('Wasser')).toBe('Wasser');
    expect(divisionToSparte('Infotechnik')).toBe('Infotechnik');
  });

  it('folds umlauts so "Fernwärme" maps to Fernwaerme', () => {
    expect(divisionToSparte('Fernwärme')).toBe('Fernwaerme');
  });

  it('is tolerant of whitespace and casing', () => {
    expect(divisionToSparte('  strom ')).toBe('Strom');
  });

  it('maps unknown/garbled names to Sonstige', () => {
    expect(divisionToSparte('Telekommunikation')).toBe('Sonstige');
    expect(divisionToSparte('')).toBe('Sonstige');
  });
});

describe('toProject', () => {
  it('stringifies the integer id', () => {
    expect(toProject(dto({ id: 42 })).id).toBe('42');
  });

  it('coerces planned decimal-string costs to numbers', () => {
    const p = toProject(dto());
    expect(p.kosten.materialkosten).toBe(420000);
    expect(p.kosten.zwischensummeKosten).toBe(1005000);
    expect(p.kosten.zwischensummeZuschlaege).toBe(318972);
    expect(p.kosten.gesamtkosten).toBe(1323972);
  });

  it('turns surcharge rate "0.1700" into prozent 17', () => {
    const p = toProject(dto());
    expect(p.kosten.materialkostenzuschlag.prozent).toBeCloseTo(17);
    expect(p.kosten.materialkostenzuschlag.betrag).toBe(71400);
    expect(p.kosten.investitionszuschlag.prozent).toBeCloseTo(23);
  });

  it('maps a null street to an empty string', () => {
    expect(toProject(dto({ street: null })).strasse).toBe('');
  });

  it('uses cost_per_meter when present', () => {
    expect(toProject(dto({ cost_per_meter: '250.00' })).preisProMeter).toBe(250);
  });

  it('derives price per metre from total / length when cost_per_meter is null', () => {
    const p = toProject(dto({ cost_per_meter: null }));
    expect(p.preisProMeter).toBeCloseTo(1323972 / 4200);
  });

  it('falls back to 0 price per metre when length is zero', () => {
    const p = toProject(dto({ cost_per_meter: null, pipe_length_m: '0.00' }));
    expect(p.preisProMeter).toBe(0);
  });

  it('leaves realKosten null when no actuals are reported', () => {
    expect(toProject(dto()).realKosten).toBeNull();
  });

  it('assembles realKosten from the real_* fields, computing subtotals', () => {
    const p = toProject(
      dto({
        real_material_costs: '400000.00',
        real_external_services: '300000.00',
        real_internal_services: '170000.00',
        real_engineering_services: '90000.00',
        real_material_surcharge: '68000.00',
        real_investment_surcharge: '240000.00',
        real_total_costs: '1268000.00',
      }),
    );
    expect(p.realKosten).not.toBeNull();
    expect(p.realKosten?.materialkosten).toBe(400000);
    // zwischensummeKosten = sum of the four real cost items
    expect(p.realKosten?.zwischensummeKosten).toBe(960000);
    // zwischensummeZuschlaege = sum of the two real surcharges
    expect(p.realKosten?.zwischensummeZuschlaege).toBe(308000);
    expect(p.realKosten?.gesamtkosten).toBe(1268000);
    // Surcharge prozent reuses the planned rates.
    expect(p.realKosten?.materialkostenzuschlag.prozent).toBeCloseTo(17);
  });

  it('maps payment_schedule entries and drops share', () => {
    const p = toProject(dto());
    expect(p.zahlungsplan).toEqual([
      { year: 2024, amount: 350000 },
      { year: 2025, amount: 700000 },
      { year: 2026, amount: 273972 },
    ]);
  });

  it('passes through the simple scalar fields', () => {
    const p = toProject(dto());
    expect(p.projekttitel).toBe('Erneuerung Mittelspannungsnetz Weststadt');
    expect(p.geschaeftsjahr).toBe(2024);
    expect(p.antragsgrund).toBe('Altersbedingter Austausch');
    expect(p.pspElement).toBe('2H.01.2410.101.001');
    expect(p.asset).toBe('20 kV-Netz');
    expect(p.ausfuehrungszeit).toEqual({ von: '2024-03-04', bis: '2025-09-30' });
    expect(p.leitungslaengeMeter).toBe(4200);
  });

  it('routes a garbled division to the Sonstige bucket', () => {
    const p = toProject(dto({ division: { id: 9, name: 'Quatsch', abbreviation: 'Q' } }));
    expect(p.sparte).toBe('Sonstige');
  });
});
