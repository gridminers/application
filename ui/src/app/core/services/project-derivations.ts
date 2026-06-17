import { Project } from '../models/project';
import { Sparte } from '../models/sparte';

/**
 * Derivations that synthesise concepts not yet present in the source data
 * (street, trade/Gewerk, actual costs). Everything here is computed from the
 * existing {@link Project} fields and is fully deterministic, so charts stay
 * stable between renders. When the backend later supplies real values these
 * helpers can be dropped in favour of plain field reads.
 */

/* ------------------------------------------------------------------ *
 * Street / location (Straße)
 * ------------------------------------------------------------------ */

/**
 * Known Braunschweig locations to look for in a project title, mapped to a
 * canonical display name. Order matters — the first match wins, so longer or
 * more specific keywords should come first.
 */
const STREET_KEYWORDS: readonly { keyword: string; label: string }[] = [
  { keyword: 'bienrode', label: 'Bienrode' },
  { keyword: 'weststadt', label: 'Weststadt' },
  { keyword: 'schunteraue', label: 'Schunteraue' },
  { keyword: 'innenstadt', label: 'Innenstadt' },
  { keyword: 'technologiepark', label: 'Technologiepark' },
  { keyword: 'heidberg', label: 'Heidberg' },
  { keyword: 'ringgebiet', label: 'Ringgebiet' },
];

/**
 * Derive a street / location label for a project from its title.
 * Falls back to the last word of the title if no known location is found.
 */
export function projectStreet(p: Project): string {
  const title = p.projekttitel.toLowerCase();
  for (const { keyword, label } of STREET_KEYWORDS) {
    if (title.includes(keyword)) {
      return label;
    }
  }
  const words = p.projekttitel.trim().split(/\s+/);
  return words[words.length - 1] ?? 'Unbekannt';
}

/* ------------------------------------------------------------------ *
 * Gewerk (trade)
 * ------------------------------------------------------------------ */

/**
 * Whether an asset class counts as a Gewerk (trade). Gewerke are the network
 * assets — everything whose name ends in "-netz" (e.g. "20 kV-Netz",
 * "Wassernetz"). Stations and procurement assets (GDR, Beschaffung) are not.
 */
export function isGewerk(asset: string): boolean {
  return asset.trim().toLowerCase().endsWith('netz');
}

/**
 * Derive the trade (Gewerk) a project belongs to: its asset class when that is
 * a network asset, otherwise `null` (the project has no Gewerk).
 */
export function projectGewerk(p: Project): string | null {
  return isGewerk(p.asset) ? p.asset : null;
}

/* ------------------------------------------------------------------ *
 * Ist-Kosten (actual costs)
 * ------------------------------------------------------------------ */

/**
 * Last fiscal year that is considered "closed" and therefore has actual costs.
 * Mirrors the application's reference year; payment-plan entries beyond this
 * have no Ist value yet.
 */
export const LATEST_ACTUALS_YEAR = 2026;

/** Tiny deterministic string hash → float in [0, 1). */
function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Map the unsigned 32-bit value into [0, 1).
  return ((h >>> 0) % 100000) / 100000;
}

/**
 * Synthesise the actual amount realised for a planned payment-plan entry.
 * Deterministically varies the plan by roughly -10 % … +18 %. Returns `null`
 * for years that have not closed yet (no actuals available).
 */
export function actualPaymentForYear(
  p: Project,
  year: number,
  plannedAmount: number,
): number | null {
  if (year > LATEST_ACTUALS_YEAR) {
    return null;
  }
  const factor = 0.9 + hash01(`${p.id}:${year}`) * 0.28;
  return Math.round(plannedAmount * factor);
}

/* ------------------------------------------------------------------ *
 * Filtering
 * ------------------------------------------------------------------ */

/** Selection state shared by the graph pages. Empty set = "all". */
export interface ProjectFilter {
  sparten: ReadonlySet<Sparte>;
  assets: ReadonlySet<string>;
  years: ReadonlySet<number>;
}

/** An empty filter selecting everything. */
export function emptyFilter(): ProjectFilter {
  return { sparten: new Set(), assets: new Set(), years: new Set() };
}

/** Filter projects by division, asset and fiscal year. Empty facet = all. */
export function filterProjects(
  projects: readonly Project[],
  filter: ProjectFilter,
): Project[] {
  return projects.filter(
    (p) =>
      (filter.sparten.size === 0 || filter.sparten.has(p.sparte)) &&
      (filter.assets.size === 0 || filter.assets.has(p.asset)) &&
      (filter.years.size === 0 || filter.years.has(p.geschaeftsjahr)),
  );
}
