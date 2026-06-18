import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { ApplicationsApi } from './applications-api';
import { ApplicationDto } from './dto/application.dto';
import { environment } from '../../../environments/environment';

function sampleDto(): ApplicationDto {
  return {
    id: 1,
    division: { id: 2, name: 'Fernwärme', abbreviation: 'FW' },
    asset: { id: 5, name: 'Leitungsnetz', description: '' },
    trade: { pk: 5, asset: 5 },
    street: { id: 9, name: 'Elbestraße' },
    project_title: 'Fernwärme-Ausbau',
    fiscal_year: 2025,
    psp_element: '2H.09.2553.530.003',
    reason: 'Dekarbonisierung',
    execution_start: '2025-03-17',
    execution_end: '2027-06-30',
    pipe_length_m: '2800.00',
    cost_per_meter: null,
    material_surcharge_rate: '0.1700',
    investment_surcharge_rate: '0.2300',
    planned_material_costs: '640000.00',
    planned_external_services: '520000.00',
    planned_internal_services: '240000.00',
    planned_engineering_services: '110000.00',
    planned_subtotal: '1510000.00',
    planned_material_surcharge: '108800.00',
    planned_investment_surcharge: '372324.00',
    planned_total_surcharges: '481124.00',
    planned_total_costs: '1991124.00',
    real_material_costs: null,
    real_external_services: null,
    real_internal_services: null,
    real_engineering_services: null,
    real_material_surcharge: null,
    real_investment_surcharge: null,
    real_total_costs: null,
    payment_schedule: [{ year: 2025, share: 1, amount: '1991124.00' }],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };
}

describe('ApplicationsApi', () => {
  let api: ApplicationsApi;
  let httpMock: HttpTestingController;
  const url = `${environment.apiBaseUrl}/applications/`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ApplicationsApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('maps the response array to Projects', () => {
    let result: { id: string; sparte: string }[] | undefined;
    api.loadProjects().subscribe((projects) => {
      result = projects.map((p) => ({ id: p.id, sparte: p.sparte }));
    });

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('GET');
    req.flush([sampleDto()]);

    expect(result).toEqual([{ id: '1', sparte: 'Fernwaerme' }]);
  });

  it('returns an empty array for an empty response', () => {
    let result: unknown[] | undefined;
    api.loadProjects().subscribe((projects) => (result = projects));
    httpMock.expectOne(url).flush([]);
    expect(result).toEqual([]);
  });

  it('propagates HTTP errors to the subscriber', () => {
    let errored = false;
    let nexted = false;
    api.loadProjects().subscribe({
      next: () => (nexted = true),
      error: () => (errored = true),
    });
    httpMock
      .expectOne(url)
      .flush('boom', { status: 500, statusText: 'Server Error' });
    expect(nexted).toBe(false);
    expect(errored).toBe(true);
  });
});
