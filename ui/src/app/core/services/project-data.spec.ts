import { TestBed } from '@angular/core/testing';

import { ProjectData } from './project-data';
import { MOCK_PROJECTS } from './mock-projects';

describe('ProjectData', () => {
  let service: ProjectData;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProjectData);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('exposes the mock projects', () => {
    expect(service.projectCount()).toBe(MOCK_PROJECTS.length);
  });

  it('sums the total budget across all projects', () => {
    const expected = MOCK_PROJECTS.reduce((s, p) => s + p.kosten.gesamtkosten, 0);
    expect(service.totalBudget()).toBe(expected);
  });

  it('groups budget by every division in fixed order', () => {
    const result = service.budgetBySparte();
    expect(result.map((r) => r.sparte)).toEqual([
      'Strom',
      'Gas',
      'Wasser',
      'Infotechnik',
      'Fernwaerme',
    ]);
    const sum = result.reduce((s, r) => s + r.gesamtkosten, 0);
    expect(sum).toBe(service.totalBudget());
  });

  it('aggregates payments by year sorted ascending', () => {
    const years = service.paymentsByYear().map((p) => p.year);
    expect(years).toEqual([...years].sort((a, b) => a - b));
  });

  it('excludes projects without a price per metre and sorts descending', () => {
    const ppm = service.pricePerMeter();
    expect(ppm.every((p) => p.preisProMeter > 0)).toBe(true);
    const values = ppm.map((p) => p.preisProMeter);
    expect(values).toEqual([...values].sort((a, b) => b - a));
  });
});
