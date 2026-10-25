/**
 * Builds the Realm map data the app ships with.
 *
 *   bun scripts/build-realm-data.ts
 *
 * Inputs (data/seed/):
 *   seattle-districts.geojson   City of Seattle Neighborhood Map Atlas, 20 districts
 *   osm-seattle-pizza.json      OpenStreetMap pizza places inside city limits
 *   tier-overrides.csv          Optional editorial tiers: osm_id,tier[,note]
 *
 * Outputs (src/data/):
 *   kingdoms.json   simplified district rings plus a label point
 *   places.json     every place with its tier and kingdom
 *
 * Tier rule: an explicit override wins; otherwise a chain brand is tier 1 and
 * everything else is tier 2. Tiers 3 and 4 are editorial and only come from
 * the CSV.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '..');
const seed = (name: string) => join(root, 'data', 'seed', name);
const out = (name: string) => join(root, 'src', 'data', name);

type LngLat = [number, number];
type Ring = LngLat[];

type Feature = {
  properties: { L_HOOD: string };
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: Ring[][] | Ring[][][] };
};

type OsmElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export type Kingdom = {
  id: string;
  name: string;
  /** Label and camera anchor, [lat, lng]. */
  center: [number, number];
  /** Outer rings only, each a list of [lat, lng]. Holes are dropped. */
  rings: [number, number][][];
};

export type Place = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  brand: string | null;
  tier: 1 | 2 | 3 | 4;
  kingdomId: string | null;
};

// Names that read as chains even when OSM has no brand tag.
const CHAIN_NAMES = [
  "domino's",
  'mod pizza',
  'pagliacci',
  "papa john's",
  "papa murphy's",
  'pizza hut',
  'little caesars',
  'costco',
  'zeeks',
  'blaze pizza',
  "jet's pizza",
  'marco\'s pizza',
];

// Roughly 25 m at Seattle's latitude. Keeps borders smooth at city zoom
// while cutting the file from megabytes to tens of kilobytes.
const SIMPLIFY_TOLERANCE_DEG = 0.00025;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function perpendicularDistance(p: LngLat, a: LngLat, b: LngLat): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  const cx = a[0] + t * dx;
  const cy = a[1] + t * dy;
  return Math.hypot(p[0] - cx, p[1] - cy);
}

/** Douglas-Peucker. Keeps the ring closed. */
function simplify(ring: Ring, tolerance: number): Ring {
  if (ring.length <= 4) return ring;
  const keep = new Array<boolean>(ring.length).fill(false);
  keep[0] = true;
  keep[ring.length - 1] = true;
  const stack: [number, number][] = [[0, ring.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop()!;
    let maxDist = 0;
    let index = -1;
    for (let i = start + 1; i < end; i++) {
      const d = perpendicularDistance(ring[i], ring[start], ring[end]);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (maxDist > tolerance && index !== -1) {
      keep[index] = true;
      stack.push([start, index], [index, end]);
    }
  }
  return ring.filter((_, i) => keep[i]);
}

function ringArea(ring: Ring): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

function ringCentroid(ring: Ring): LngLat {
  let x = 0;
  let y = 0;
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    const cross = x1 * y2 - x2 * y1;
    x += (x1 + x2) * cross;
    y += (y1 + y2) * cross;
    a += cross;
  }
  a /= 2;
  return [x / (6 * a), y / (6 * a)];
}

function pointInRing([x, y]: LngLat, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function outerRings(geometry: Feature['geometry']): Ring[] {
  if (geometry.type === 'Polygon') return [(geometry.coordinates as unknown as Ring[])[0]];
  return (geometry.coordinates as unknown as Ring[][]).map((poly) => poly[0]);
}

const round5 = (n: number) => Math.round(n * 1e5) / 1e5;

// ── Kingdoms ────────────────────────────────────────────────────────────────

const districts = JSON.parse(readFileSync(seed('seattle-districts.geojson'), 'utf8')) as {
  features: Feature[];
};

const rawRings = new Map<string, Ring[]>();
const kingdoms: Kingdom[] = districts.features
  .map((f) => {
    const name = f.properties.L_HOOD;
    const id = slugify(name);
    const rings = outerRings(f.geometry);
    rawRings.set(id, rings);
    const largest = rings.reduce((a, b) => (ringArea(b) > ringArea(a) ? b : a));
    const [lng, lat] = ringCentroid(largest);
    return {
      id,
      name,
      center: [round5(lat), round5(lng)] as [number, number],
      rings: rings.map((r) =>
        simplify(r, SIMPLIFY_TOLERANCE_DEG).map(([x, y]) => [round5(y), round5(x)] as [number, number])
      ),
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

// ── Places ──────────────────────────────────────────────────────────────────

const overrides = new Map<string, Place['tier']>();
if (existsSync(seed('tier-overrides.csv'))) {
  const lines = readFileSync(seed('tier-overrides.csv'), 'utf8').split(/\r?\n/).slice(1);
  for (const line of lines) {
    const [osmId, tier] = line.split(',').map((s) => s.trim());
    if (!osmId || !tier) continue;
    const t = Number(tier);
    if (t < 1 || t > 4) throw new Error(`Bad tier "${tier}" for ${osmId}`);
    overrides.set(osmId, t as Place['tier']);
  }
}

const osm = JSON.parse(readFileSync(seed('osm-seattle-pizza.json'), 'utf8')) as {
  elements: OsmElement[];
};

function formatAddress(tags: Record<string, string>): string | null {
  const number = tags['addr:housenumber'];
  const street = tags['addr:street'];
  if (!street) return null;
  return number ? `${number} ${street}` : street;
}

function isChain(tags: Record<string, string>): boolean {
  if (tags.brand) return true;
  const name = (tags.name ?? '').toLowerCase();
  return CHAIN_NAMES.some((c) => name.includes(c));
}

function kingdomFor(lng: number, lat: number): string | null {
  for (const k of kingdoms) {
    const rings = rawRings.get(k.id)!;
    if (rings.some((r) => pointInRing([lng, lat], r))) return k.id;
  }
  return null;
}

const places: Place[] = osm.elements
  .filter((e) => e.tags?.name)
  .map((e) => {
    const tags = e.tags!;
    const lat = e.lat ?? e.center!.lat;
    const lng = e.lon ?? e.center!.lon;
    const id = `osm:${e.type}/${e.id}`;
    return {
      id,
      name: tags.name!,
      lat: round5(lat),
      lng: round5(lng),
      address: formatAddress(tags),
      brand: tags.brand ?? null,
      tier: overrides.get(id) ?? (isChain(tags) ? 1 : 2),
      kingdomId: kingdomFor(lng, lat),
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

// ── Write ───────────────────────────────────────────────────────────────────

writeFileSync(out('kingdoms.json'), JSON.stringify(kingdoms));
writeFileSync(out('places.json'), JSON.stringify(places));

const vertexCount = kingdoms.reduce((n, k) => n + k.rings.reduce((m, r) => m + r.length, 0), 0);
const tierCounts = [1, 2, 3, 4].map((t) => places.filter((p) => p.tier === t).length);
console.log(`kingdoms: ${kingdoms.length}, rings: ${kingdoms.reduce((n, k) => n + k.rings.length, 0)}, vertices: ${vertexCount}`);
console.log(`places: ${places.length}, tiers 1..4: ${tierCounts.join(' / ')}, overrides: ${overrides.size}`);
console.log(`unassigned to a kingdom: ${places.filter((p) => p.kingdomId === null).length}`);
