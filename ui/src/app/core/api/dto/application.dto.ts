/**
 * DTOs mirroring the Django REST `ApplicationSerializer` (branch
 * `origin/feature/backend`). All money/length/rate fields are serialized as
 * decimal **strings** by DRF; nullable fields follow the model. The serializer's
 * `fields` list is authoritative — adjust here if a live response differs.
 */

/** Sparte / division. */
export interface DivisionDto {
  id: number;
  name: string;
  abbreviation: string;
}

/** Asset class (e.g. "20 kV-Netz"). */
export interface AssetDto {
  id: number;
  name: string;
  description: string;
}

/** Trade (Gewerk). `pk` equals the asset id; it has no own name. */
export interface TradeDto {
  pk: number;
  asset: number;
}

/** Street / location. */
export interface StreetDto {
  id: number;
  name: string;
}

/** A single per-year entry of the payment schedule (Zahlungsplan). */
export interface PaymentScheduleEntryDto {
  year: number;
  share: number;
  amount: string;
}

/** A grid-infrastructure application order (Antrag) as returned by the API. */
export interface ApplicationDto {
  id: number;
  division: DivisionDto;
  asset: AssetDto;
  trade: TradeDto | null;
  street: StreetDto | null;
  project_title: string;
  fiscal_year: number;
  psp_element: string;
  reason: string;
  /** ISO date (yyyy-mm-dd). */
  execution_start: string;
  /** ISO date (yyyy-mm-dd). */
  execution_end: string;
  pipe_length_m: string;
  cost_per_meter: string | null;
  /** Surcharge rate as a fraction, e.g. "0.1700" == 17 %. */
  material_surcharge_rate: string;
  /** Surcharge rate as a fraction, e.g. "0.2300" == 23 %. */
  investment_surcharge_rate: string;
  planned_material_costs: string;
  planned_external_services: string;
  planned_internal_services: string;
  planned_engineering_services: string;
  planned_subtotal: string;
  planned_material_surcharge: string;
  planned_investment_surcharge: string;
  planned_total_surcharges: string;
  planned_total_costs: string;
  real_material_costs: string | null;
  real_external_services: string | null;
  real_internal_services: string | null;
  real_engineering_services: string | null;
  real_material_surcharge: string | null;
  real_investment_surcharge: string | null;
  real_total_costs: string | null;
  payment_schedule: PaymentScheduleEntryDto[];
  created_at: string;
  updated_at: string;
}
