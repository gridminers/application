import { Service } from '@angular/core';

/**
 * Resolves a managed street/location name to its real-world geometry so it can
 * be drawn on the map. Lookups are constrained to Braunschweig, Germany and
 * return `null` when nothing matches — callers should simply skip those.
 *
 * Backed by the public OpenStreetMap Nominatim service. Results are cached per
 * name (including the misses) so a name is only ever requested once.
 */

const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';

/** Bounding box of Braunschweig (lon/lat) used to bias and bound the search. */
const BRAUNSCHWEIG_VIEWBOX = '10.40,52.34,10.65,52.20';

@Service()
export class StreetGeocoder {
  private readonly cache = new Map<string, Promise<GeoJSON.Geometry | null>>();

  /**
   * Look up the geometry of a street/location within Braunschweig. Resolves to
   * `null` when there is no confident match.
   */
  geocode(name: string): Promise<GeoJSON.Geometry | null> {
    const key = name.trim().toLowerCase();
    let pending = this.cache.get(key);
    if (!pending) {
      pending = this.fetchGeometry(name);
      this.cache.set(key, pending);
    }
    return pending;
  }

  private async fetchGeometry(name: string): Promise<GeoJSON.Geometry | null> {
    const params = new URLSearchParams({
      q: `${name}, Braunschweig, Deutschland`,
      format: 'jsonv2',
      polygon_geojson: '1',
      addressdetails: '0',
      limit: '1',
      countrycodes: 'de',
      viewbox: BRAUNSCHWEIG_VIEWBOX,
      bounded: '1',
    });

    try {
      const res = await fetch(`${NOMINATIM_SEARCH}?${params.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        return null;
      }
      const results = (await res.json()) as Array<{ geojson?: GeoJSON.Geometry }>;
      return results[0]?.geojson ?? null;
    } catch {
      return null;
    }
  }
}
