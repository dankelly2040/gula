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
 *   kingdoms.json     simplified district rings plus a label point
 *   places.json       every place with its tier and kingdom
 *   realm-lines.json  the lines the map draws: the land outline and the
 *                     borders between kingdoms
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

// ── Lines ───────────────────────────────────────────────────────────────────
//
// The map is drawn by the app, not by a map service: a white page, the land
// as one outline, and a finer line along every border between kingdoms.
//
// The atlas is topologically clean. Where two districts meet, both carry the
// same run of vertices. So an edge used by two districts is a border between
// kingdoms, and an edge used by only one is the edge of the city: the coast
// and the city limits. Sorting the edges that way gives one true outline and
// one line per border, where drawing each kingdom's own ring would draw every
// border twice, a little apart, because the rings are simplified one by one.

// About 9 m. Finer than the kingdom rings, because these lines are what the
// user looks at when they zoom in.
const LINE_TOLERANCE_DEG = 0.00008;
// Outline loops smaller than this are docks and slivers, not land worth a line.
const MIN_OUTLINE_AREA_DEG2 = 1.5e-6;

const nodeKey = ([x, y]: LngLat) => `${x.toFixed(7)},${y.toFixed(7)}`;

type Edge = { a: LngLat; b: LngLat; uses: number };
const edges = new Map<string, Edge>();
for (const rings of rawRings.values()) {
  for (const ring of rings) {
    for (let i = 0; i + 1 < ring.length; i++) {
      const a = ring[i];
      const b = ring[i + 1];
      const ka = nodeKey(a);
      const kb = nodeKey(b);
      if (ka === kb) continue;
      const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      const edge = edges.get(key);
      if (edge) edge.uses += 1;
      else edges.set(key, { a, b, uses: 1 });
    }
  }
}

/**
 * Join loose edges into lines. A line runs from one junction (a node where
 * anything other than two edges meet) to the next. Edges left over after
 * that form closed loops with no junction on them.
 */
function chain(list: Edge[]): Ring[] {
  const at = new Map<string, { point: LngLat; edges: number[] }>();
  list.forEach((e, i) => {
    for (const point of [e.a, e.b]) {
      const k = nodeKey(point);
      const node = at.get(k);
      if (node) node.edges.push(i);
      else at.set(k, { point, edges: [i] });
    }
  });
  const used = new Array<boolean>(list.length).fill(false);
  const lines: Ring[] = [];

  const walk = (startKey: string, firstEdge: number): Ring => {
    const line: Ring = [at.get(startKey)!.point];
    let key = startKey;
    let edge = firstEdge;
    for (;;) {
      used[edge] = true;
      const e = list[edge];
      const next = nodeKey(e.a) === key ? e.b : e.a;
      line.push(next);
      key = nodeKey(next);
      const node = at.get(key)!;
      if (node.edges.length !== 2) break; // a junction or a loose end
      const onward = node.edges.find((i) => !used[i]);
      if (onward === undefined) break; // back at the start of a loop
      edge = onward;
    }
    return line;
  };

  for (const [key, node] of at) {
    if (node.edges.length === 2) continue;
    for (const edge of node.edges) if (!used[edge]) lines.push(walk(key, edge));
  }
  for (const [key, node] of at) {
    const edge = node.edges.find((i) => !used[i]);
    if (edge !== undefined) lines.push(walk(key, edge));
  }
  return lines;
}

const toLatLng = (line: Ring) =>
  simplify(line, LINE_TOLERANCE_DEG).map(([x, y]) => [round5(y), round5(x)] as [number, number]);

const allEdges = [...edges.values()];
const strayEdges = allEdges.filter((e) => e.uses > 2).length;
const outlineLoops = chain(allEdges.filter((e) => e.uses === 1));
const outline = outlineLoops
  .filter((loop) => ringArea(loop) >= MIN_OUTLINE_AREA_DEG2)
  .sort((a, b) => ringArea(b) - ringArea(a))
  .map(toLatLng);
const borders = chain(allEdges.filter((e) => e.uses === 2)).map(toLatLng);

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
writeFileSync(out('realm-lines.json'), JSON.stringify({ outline, borders }));

const vertexCount = kingdoms.reduce((n, k) => n + k.rings.reduce((m, r) => m + r.length, 0), 0);
const tierCounts = [1, 2, 3, 4].map((t) => places.filter((p) => p.tier === t).length);
console.log(`kingdoms: ${kingdoms.length}, rings: ${kingdoms.reduce((n, k) => n + k.rings.length, 0)}, vertices: ${vertexCount}`);
console.log(`places: ${places.length}, tiers 1..4: ${tierCounts.join(' / ')}, overrides: ${overrides.size}`);
const count = (lines: unknown[][]) => lines.reduce((n, l) => n + l.length, 0);
console.log(
  `lines: outline ${outline.length} of ${outlineLoops.length} loops (${count(outline)} vertices), ` +
    `borders ${borders.length} (${count(borders)} vertices), edges used by 3+ districts: ${strayEdges}`
);
console.log(`unassigned to a kingdom: ${places.filter((p) => p.kingdomId === null).length}`);
