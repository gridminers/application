import { Service } from '@angular/core';

/**
 * Provides the real-world geometry of managed streets so they can be drawn on
 * the map. Geometry is **precomputed offline** (see
 * `scripts/build-street-geometry.mjs`) into the static asset
 * `street-geometry.json` and merely looked up here — the app makes no live
 * geocoding requests, which previously hammered the public Overpass/Nominatim
 * endpoints and tripped HTTP 429.
 *
 * To refresh the data (e.g. after the street register changes) re-run the
 * script: `npm run build:streets`.
 */

/** Location of the precomputed asset (served from `public/` at the app root). */
const GEOMETRY_URL = 'street-geometry.json';

/** Shape of the asset: normalized street name -> GeoJSON geometry. */
type GeometryByKey = Record<string, GeoJSON.Geometry>;

/**
 * Normalize a street name to a stable lookup key. Folds umlauts/ß and strips
 * everything but letters and digits, so dataset names like "Heinrich Büssing
 * Ring" match OSM's "Heinrich-Büssing-Ring".
 *
 * MUST match `normalizeStreetName` in `scripts/build-street-geometry.mjs`,
 * otherwise lookups won't find the precomputed keys.
 */
export function normalizeStreetName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
}

@Service()
export class StreetGeometryStore {
  private geometryByKey: GeometryByKey = {};
  /** In-flight/settled load, so the asset is fetched at most once. */
  private loadPromise?: Promise<void>;

  /**
   * Load the precomputed geometry asset. Resolves once the data is available
   * (or immediately on subsequent calls). On failure the store stays empty and
   * every lookup returns `null` — the map simply draws no streets.
   */
  load(): Promise<void> {
    if (!this.loadPromise) {
      this.loadPromise = this.fetchGeometry();
    }
    return this.loadPromise;
  }

  /**
   * The geometry for a street, or `null` when it has no precomputed match.
   * Call {@link load} first.
   */
  geometry(name: string): GeoJSON.Geometry | null {
    return this.geometryByKey[normalizeStreetName(name)] ?? null;
  }

  private async fetchGeometry(): Promise<void> {
    try {
      const res = await fetch(GEOMETRY_URL);
      if (!res.ok) {
        console.error(`Failed to load ${GEOMETRY_URL}: ${res.status} ${res.statusText}`);
        return;
      }
      this.geometryByKey = (await res.json()) as GeometryByKey;
    } catch (err) {
      console.error(`Failed to load ${GEOMETRY_URL}:`, err);
    }
  }
}
