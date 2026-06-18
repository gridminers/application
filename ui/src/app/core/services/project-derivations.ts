import { Project } from '../models/project';
import { Sparte } from '../models/sparte';

/**
 * Derivations that synthesise concepts not yet present as plain fields
 * (trade/Gewerk, street fallback). Everything here is computed from the existing
 * {@link Project} fields and is fully deterministic, so charts stay stable
 * between renders. When the backend later supplies real values these helpers
 * can be dropped in favour of plain field reads.
 */

/* ------------------------------------------------------------------ *
 * Street (Straße)
 * ------------------------------------------------------------------ */

/**
 * The street a project is located on. Reads the `strasse` field supplied by the
 * backend (the PDF-processing step extracts it from the source document).
 */
export function projectStreet(p: Project): string {
  return p.strasse.trim() || 'Unbekannt';
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
