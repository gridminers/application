// @ts-check
/**
 * One-time / re-runnable precompute of Braunschweig street geometry.
 *
 * Instead of geocoding street-by-street at runtime (which hammered the public
 * Overpass/Nominatim endpoints and tripped HTTP 429), we fetch *every* named
 * highway in the Braunschweig bounding box with a single Overpass query, merge
 * the segments per street, keep only the streets listed in `straßen.txt`, and
 * write the result as a static asset the app loads once.
 *
 * Usage (from the `ui/` directory):
 *
 *     node scripts/build-street-geometry.mjs
 *     # or: npm run build:streets
 *
 * Output: `ui/public/street-geometry.json` — `Record<normalizedKey, Geometry>`.
 *
 * NOTE: the `normalizeStreetName` rule below MUST stay in sync with the one in
 * `src/app/core/services/street-geometry-store.ts`, otherwise runtime lookups
 * won't match the keys written here.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const STREET_LIST = resolve(__dirname, '../../straßen.txt');
const OUTPUT = resolve(__dirname, '../public/street-geometry.json');

/**
 * Overpass interpreter endpoints, tried in order. Override the whole list with
 * a single endpoint via the OVERPASS_ENDPOINT env var. Mirrors are interchangeable;
 * we fall through to the next one on connection failure or repeated rate limiting.
 */
const OVERPASS_ENDPOINTS = process.env.OVERPASS_ENDPOINT
  ? [process.env.OVERPASS_ENDPOINT]
  : [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.private.coffee/api/interpreter',
      'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    ];

/** Bounding box of Braunschweig as Overpass expects it: south,west,north,east. */
const BRAUNSCHWEIG_BBOX = '52.20,10.40,52.34,10.65';

/** Coordinate decimals to keep (~0.1 m precision) to shrink the output file. */
const COORD_DECIMALS = 6;

/** Identify ourselves per the OSM/Overpass usage policy. */
const USER_AGENT =
  'gridminers-app street-geometry precompute (https://github.com/anomalyco/opencode)';

/**
 * Normalize a street name to a stable lookup key. Folds umlauts/ß and strips
 * everything but letters and digits, so dataset names like "Heinrich Büssing
 * Ring" match OSM's "Heinrich-Büssing-Ring".
 *
 * MUST match `normalizeStreetName` in street-geometry-store.ts.
 * @param {string} name
 * @returns {string}
 */
function normalizeStreetName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
}

/** @param {number} n */
function roundCoord(n) {
  const f = 10 ** COORD_DECIMALS;
  return Math.round(n * f) / f;
}

/**
 * Combine a street's way segments into a single Line/MultiLineString geometry,
 * resolving each way's node references against the shared node coordinate map.
 * @param {Array<{ nodes?: number[] }>} ways
 * @param {Map<number, [number, number]>} nodeCoords node id -> [lon, lat]
 * @returns {object | null}
 */
function mergeWays(ways, nodeCoords) {
  /** @type {number[][][]} */
  const lines = [];
  for (const way of ways) {
    if (!way.nodes) {
      continue;
    }
    /** @type {number[][]} */
    const coords = [];
    for (const id of way.nodes) {
      const c = nodeCoords.get(id);
      if (c) {
        coords.push(c);
      }
    }
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
 * POST the Overpass query, trying each mirror in turn and honouring
 * Retry-After / exponential backoff on 429 and 504. This is the only network
 * call the script makes.
 * @param {string} query
 * @returns {Promise<{ elements?: Array<{ type: string; id?: number; lat?: number; lon?: number; tags?: Record<string, string>; nodes?: number[] }> }>}
 */
async function queryOverpass(query) {
  let lastError;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      return await queryOverpassEndpoint(endpoint, query);
    } catch (err) {
      lastError = err;
      console.warn(`Endpoint ${endpoint} failed: ${err.message}. Trying next…`);
    }
  }
  throw lastError ?? new Error('No Overpass endpoint succeeded');
}

/**
 * @param {string} endpoint
 * @param {string} query
 * @returns {Promise<{ elements?: Array<{ type: string; id?: number; lat?: number; lon?: number; tags?: Record<string, string>; nodes?: number[] }> }>}
 */
async function queryOverpassEndpoint(endpoint, query) {
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Send the query form-encoded as `data=…`; this is accepted by every
    // Overpass instance, whereas a raw text body is misparsed by some mirrors.
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
      },
      body: 'data=' + encodeURIComponent(query),
    });

    if (res.ok) {
      return res.json();
    }

    if ((res.status === 429 || res.status === 504) && attempt < maxAttempts) {
      const retryAfter = Number(res.headers.get('retry-after'));
      const waitMs =
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 1000;
      console.warn(
        `Overpass ${res.status}; retrying in ${Math.round(waitMs / 1000)}s ` +
          `(attempt ${attempt}/${maxAttempts - 1})…`,
      );
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    throw new Error(`Overpass request failed: ${res.status} ${res.statusText}`);
  }
  throw new Error('Overpass request failed after retries');
}

async function main() {
  // 1. Load the authoritative street register and index it by normalized key.
  const raw = await readFile(STREET_LIST, 'utf8');
  /** @type {Map<string, string>} normalizedKey -> first canonical name seen */
  const wanted = new Map();
  for (const line of raw.split(/\r?\n/)) {
    const name = line.trim();
    if (!name) continue;
    const key = normalizeStreetName(name);
    if (key && !wanted.has(key)) {
      wanted.set(key, name);
    }
  }
  console.log(`Loaded ${wanted.size} street names from straßen.txt.`);

  // 2. Fetch every named highway in the bbox plus the nodes they reference, in
  //    one query. We use `out body; >; out skel qt;` (ways + recursed-down
  //    nodes) rather than `out geometry;` because some Overpass mirrors run an
  //    older version that doesn't support inline geometry.
  const query =
    `[out:json][timeout:180];` +
    `way["highway"]["name"](${BRAUNSCHWEIG_BBOX});` +
    `out body;` +
    `>;` +
    `out skel qt;`;
  console.log('Querying Overpass for all named highways in Braunschweig…');
  const data = await queryOverpass(query);
  const elements = data.elements ?? [];

  // 3. Index node coordinates, then collect the highway ways.
  /** @type {Map<number, [number, number]>} node id -> [lon, lat] */
  const nodeCoords = new Map();
  /** @type {Array<{ tags?: Record<string, string>; nodes?: number[] }>} */
  const ways = [];
  for (const el of elements) {
    if (el.type === 'node' && el.id !== undefined && el.lat !== undefined && el.lon !== undefined) {
      nodeCoords.set(el.id, [roundCoord(el.lon), roundCoord(el.lat)]);
    } else if (el.type === 'way') {
      ways.push(el);
    }
  }
  console.log(`Overpass returned ${ways.length} way segments and ${nodeCoords.size} nodes.`);

  // 4. Group way segments by normalized name, but only for streets we want.
  /** @type {Map<string, Array<{ nodes?: number[] }>>} */
  const segmentsByKey = new Map();
  for (const way of ways) {
    const name = way.tags?.name;
    if (!name) continue;
    const key = normalizeStreetName(name);
    if (!wanted.has(key)) continue;
    const list = segmentsByKey.get(key) ?? [];
    list.push(way);
    segmentsByKey.set(key, list);
  }

  // 5. Merge each street's segments into one geometry.
  /** @type {Record<string, object>} */
  const out = {};
  for (const [key, segments] of segmentsByKey) {
    const geometry = mergeWays(segments, nodeCoords);
    if (geometry) {
      out[key] = geometry;
    }
  }

  const matched = Object.keys(out).length;
  console.log(
    `Matched geometry for ${matched}/${wanted.size} register streets ` +
      `(${wanted.size - matched} had no named highway in OSM).`,
  );

  // 6. Write the static asset.
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, JSON.stringify(out));
  console.log(`Wrote ${OUTPUT}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
