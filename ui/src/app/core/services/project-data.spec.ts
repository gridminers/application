import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { CostBreakdown } from '../models/cost-breakdown';
import { Project } from '../models/project';
import { aggregatePlanIstByYear, ProjectData } from './project-data';
import { MOCK_PROJECTS } from './mock-projects';
import { environment } from '../../../environments/environment';

/** Minimal cost breakdown carrying just the total used by the plan/ist test. */
function costs(gesamtkosten: number): CostBreakdown {
  return {
    materialkosten: 0,
    fremdleistungen: 0,
    eigenleistungen: 0,
    ingenieurleistungDritte: 0,
    zwischensummeKosten: 0,
    materialkostenzuschlag: { prozent: 0, betrag: 0 },
    investitionszuschlag: { prozent: 0, betrag: 0 },
    zwischensummeZuschlaege: 0,
    gesamtkosten,
  };
}

/** Build a bare project carrying just the fields the aggregate reads. */
function project(
  geschaeftsjahr: number,
  geplant: number,
  ist: number | null,
): Project {
  return {
    id: `P-${geschaeftsjahr}-${geplant}`,
    projekttitel: 'Test',
    strasse: 'Teststraße',
    geschaeftsjahr,
    ausfuehrungszeit: { von: '2024-01-01', bis: '2024-12-31' },
    antragsgrund: '',
    sparte: 'Strom',
    asset: '20 kV-Netz',
    pspElement: '',
    kosten: costs(geplant),
    realKosten: ist === null ? null : costs(ist),
    zahlungsplan: [],
    leitungslaengeMeter: 0,
    preisProMeter: 0,
  };
}

describe('ProjectData', () => {
  let service: ProjectData;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProjectData);
    httpMock = TestBed.inject(HttpTestingController);
    // The constructor fires the initial load; flush it with an empty list so
    // tests can drive the `projects` signal explicitly below.
    httpMock
      .expectOne(`${environment.apiBaseUrl}/applications/`)
      .flush([]);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('starts empty and stops loading after the response', () => {
    expect(service.projectCount()).toBe(0);
    expect(service.loading()).toBe(false);
  });

  it('exposes the mock projects when seeded', () => {
    service.projects.set(MOCK_PROJECTS);
    expect(service.projectCount()).toBe(MOCK_PROJECTS.length);
  });

  it('sums the total budget across all projects', () => {
    service.projects.set(MOCK_PROJECTS);
    const expected = MOCK_PROJECTS.reduce((s, p) => s + p.kosten.gesamtkosten, 0);
    expect(service.totalBudget()).toBe(expected);
  });

  it('groups budget by every division in fixed order', () => {
    service.projects.set(MOCK_PROJECTS);
    const result = service.budgetBySparte();
    expect(result.map((r) => r.sparte)).toEqual([
      'Strom',
      'Gas',
      'Wasser',
      'Infotechnik',
      'Fernwaerme',
      'Sonstige',
    ]);
    const sum = result.reduce((s, r) => s + r.gesamtkosten, 0);
    expect(sum).toBe(service.totalBudget());
  });

  it('aggregates payments by year sorted ascending', () => {
    service.projects.set(MOCK_PROJECTS);
    const years = service.paymentsByYear().map((p) => p.year);
    expect(years).toEqual([...years].sort((a, b) => a - b));
  });

  it('excludes projects without a price per metre and sorts descending', () => {
    service.projects.set(MOCK_PROJECTS);
    const ppm = service.pricePerMeter();
    expect(ppm.every((p) => p.preisProMeter > 0)).toBe(true);
    const values = ppm.map((p) => p.preisProMeter);
    expect(values).toEqual([...values].sort((a, b) => b - a));
  });
});

describe('aggregatePlanIstByYear', () => {
  it('groups planned and real totals by fiscal year, ascending', () => {
    const result = aggregatePlanIstByYear([
      project(2025, 200, 180),
      project(2024, 100, 90),
      project(2024, 50, 40),
    ]);
    expect(result).toEqual([
      { year: 2024, geplant: 150, ist: 130 },
      { year: 2025, geplant: 200, ist: 180 },
    ]);
  });

  it('emits ist: null for a year where no project has realKosten', () => {
    const result = aggregatePlanIstByYear([
      project(2026, 300, null),
      project(2026, 100, null),
    ]);
    expect(result).toEqual([{ year: 2026, geplant: 400, ist: null }]);
  });

  it('sums only the projects that report actuals within a mixed year', () => {
    const result = aggregatePlanIstByYear([
      project(2025, 200, 150),
      project(2025, 100, null),
    ]);
    expect(result).toEqual([{ year: 2025, geplant: 300, ist: 150 }]);
  });
});
