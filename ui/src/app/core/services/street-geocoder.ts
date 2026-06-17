import { Service } from '@angular/core';

/**
 * Resolves a managed street/location name to its real-world geometry so it can
 * be drawn on the map. Lookups are constrained to Braunschweig, Germany and
 * return `null` when nothing matches — callers should simply skip those.
 *
 * Primary source is the OpenStreetMap Overpass API, which lets us fetch *every*
 * way segment that makes up a street and merge them into one geometry. This is
 * important because OSM splits a single named street into many separate ways
 * (one per intersection, attribute change, etc.), so a plain Nominatim search
 * (`limit=1`) only ever returns one short segment — making streets appear far
 * shorter than they really are. When Overpass finds nothing (e.g. the dataset
 * name differs slightly from the OSM name) we fall back to a Nominatim search.
 *
 * Results are cached per name (including the misses) so a name is only ever
 * requested once.
 */

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';

/** Bounding box of Braunschweig (lon/lat) used to bias and bound the search. */
const BRAUNSCHWEIG_VIEWBOX = '10.40,52.20,10.65,52.34';

/** Same bounding box as Overpass expects it: `south,west,north,east`. */
const BRAUNSCHWEIG_BBOX = '52.20,10.40,52.34,10.65';

interface OverpassWay {
  type: string;
  geometry?: Array<{ lat: number; lon: number }>;
}

interface OverpassResponse {
  elements?: OverpassWay[];
}

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
    return (await this.fetchFromOverpass(name)) ?? (await this.fetchFromNominatim(name));
  }

  /**
   * Fetch and merge every street segment sharing this name within Braunschweig.
   * Returns the combined geometry, or `null` when nothing matches.
   */
  private async fetchFromOverpass(name: string): Promise<GeoJSON.Geometry | null> {
    // Escape characters that would break out of the Overpass string literal.
    const escaped = name.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const query =
      `[out:json][timeout:25];` +
      `way["highway"]["name"="${escaped}"](${BRAUNSCHWEIG_BBOX});` +
      `out geometry;`;

    try {
      const res = await fetch(OVERPASS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: query,
      });
      if (!res.ok) {
        return null;
      }
      const data = (await res.json()) as OverpassResponse;
      return this.mergeWays(data.elements ?? []);
    } catch {
      return null;
    }
  }

  /** Combine the way segments into a single Line/MultiLineString geometry. */
  private mergeWays(elements: OverpassWay[]): GeoJSON.Geometry | null {
    const lines: GeoJSON.Position[][] = [];
    for (const el of elements) {
      if (el.type !== 'way' || !el.geometry) {
        continue;
      }
      const coords = el.geometry.map(
        (point): GeoJSON.Position => [point.lon, point.lat],
      );
      if (coords.length >= 2) {
        lines.push(coords);
      }
    }

    if (lines.length === 0) {
      return null;
    }
    if (lines.length === 1) {
      return { type: 'LineString', coordinates: lines[0] };
    }
    return { type: 'MultiLineString', coordinates: lines };
  }

  /**
   * Fallback: a single Nominatim result. Only one OSM element is returned, so
   * the geometry may be partial — but it is better than nothing for names that
   * don't match an OSM way exactly.
   */
  private async fetchFromNominatim(name: string): Promise<GeoJSON.Geometry | null> {
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
