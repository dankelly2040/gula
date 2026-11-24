import districtsJson from '@/data/kingdoms.json';
import placesJson from '@/data/places.json';
import { colors, KINGDOM_FILLS } from '@/constants/theme';
import { cellForPoint, type Bounds, type Cell } from './grid';

/**
 * A kingdom is one cell of the world grid (features/grid). The grid covers
 * every coordinate, so a pizza eaten in any city is inside a kingdom.
 */
export type Kingdom = Cell;

/**
 * A district is one of Seattle's 20 named areas (City of Seattle Neighborhood
 * Map Atlas). Districts were the kingdoms before the grid. Now they only give
 * Seattle its outline, its names on the map, and a name for the kingdoms that
 * lie on them. The generated files keep their old names: kingdoms.json holds
 * the districts, and a place's kingdomId is its district id.
 */
export type District = {
  id: string;
  name: string;
  /** Label and camera anchor, [lat, lng]. */
  center: [number, number];
  /** Outer rings, each a list of [lat, lng]. */
  rings: [number, number][][];
};

export type Tier = 1 | 2 | 3 | 4;

export type Place = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  brand: string | null;
  tier: Tier;
  /** The Seattle district the place is in. Not a kingdom: see District. */
  kingdomId: string | null;
};

export const DISTRICTS: District[] = districtsJson as District[];
export const PLACES: Place[] = placesJson as Place[];

/**
 * The four tiers. Points are what a single log at that place earns inside
 * its kingdom. Tiers 1 and 2 are seeded by rule (chain or not); 3 and 4 are
 * editorial and come from data/seed/tier-overrides.csv.
 */
export const TIERS: Record<Tier, { label: string; points: number; symbol: string; color: string }> = {
  1: { label: 'Chain', points: 1, symbol: 'storefront', color: colors.textMuted },
  2: { label: 'Slice shop', points: 3, symbol: 'fork.knife', color: colors.textSecondary },
  3: { label: 'Destination', points: 6, symbol: 'flame.fill', color: colors.brand },
  4: { label: 'Elite', points: 10, symbol: 'crown.fill', color: colors.gold },
};

export const TIER_ORDER: Tier[] = [4, 3, 2, 1];

/**
 * Zoom level at which a tier's markers appear. At city zoom only the
 * destination and elite places show, so the map reads as kingdoms first;
 * slice shops arrive at neighbourhood zoom and chains only up close.
 */
export const TIER_MIN_ZOOM: Record<Tier, number> = { 4: 0, 3: 0, 2: 12, 1: 13.5 };

export function visibleTiers(zoom: number): Tier[] {
  return TIER_ORDER.filter((tier) => zoom >= TIER_MIN_ZOOM[tier]);
}

/**
 * District name labels render at a fixed point size, so at city zoom the
 * names in the dense middle of the map pile on top of each other. These
 * six wait for a closer zoom; every other name shows from LABEL_MIN_ZOOM.
 */
export const LABEL_DEFAULT_MIN_ZOOM = 11.9;

/**
 * Below this zoom the map shows no district names at all. At city zoom the
 * names crowd the map, so they wait until the user moves in.
 */
export const LABEL_MIN_ZOOM = 11;
export const LATE_LABEL_DISTRICTS = new Set([
  'northgate',
  'north-central',
  'interbay',
  'cascade',
  'central-area',
  'beacon-hill',
]);

export function visibleLabelDistricts(zoom: number): District[] {
  if (zoom < LABEL_MIN_ZOOM) return [];
  if (zoom >= LABEL_DEFAULT_MIN_ZOOM) return DISTRICTS;
  return DISTRICTS.filter((d) => !LATE_LABEL_DISTRICTS.has(d.id));
}

/** Stable tint for a district: rotates the four fills in list order. */
export function districtFill(district: District): string {
  const index = DISTRICTS.findIndex((d) => d.id === district.id);
  return KINGDOM_FILLS[(index < 0 ? 0 : index) % KINGDOM_FILLS.length];
}

export function districtById(id: string | null | undefined): District | null {
  if (!id) return null;
  return DISTRICTS.find((d) => d.id === id) ?? null;
}

export function countByTier(places: Place[]): Record<Tier, number> {
  const counts: Record<Tier, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const p of places) counts[p.tier] += 1;
  return counts;
}

function pointInRing(lat: number, lng: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [latI, lngI] = ring[i];
    const [latJ, lngJ] = ring[j];
    const crosses = latI > lat !== latJ > lat;
    if (crosses && lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI) inside = !inside;
  }
  return inside;
}

/**
 * Which Seattle district contains a coordinate, or null outside the city. It
 * runs on the simplified rings the app ships with, so a point within a few
 * metres of a border can land either side.
 */
export function districtForPoint(lat: number, lng: number): District | null {
  for (const d of DISTRICTS) {
    if (d.rings.some((ring) => pointInRing(lat, lng, ring))) return d;
  }
  return null;
}

/** The kingdom that contains a coordinate. Every coordinate is in one. */
export function kingdomForPoint(lat: number, lng: number): Kingdom {
  return cellForPoint(lat, lng);
}

let placesByKingdom: Map<string, Place[]> | null = null;

/** The shipped pizza places inside a kingdom. Only Seattle has a shipped list. */
export function placesInKingdom(kingdomId: string): Place[] {
  if (!placesByKingdom) {
    placesByKingdom = new Map();
    for (const place of PLACES) {
      const id = kingdomForPoint(place.lat, place.lng).id;
      const list = placesByKingdom.get(id);
      if (list) list.push(place);
      else placesByKingdom.set(id, [place]);
    }
  }
  return placesByKingdom.get(kingdomId) ?? [];
}

/**
 * The Seattle name for a kingdom: the district under its middle, or else the
 * district most of its shipped places are in. Null for a kingdom that is not
 * on a district, which is every kingdom outside Seattle.
 */
export function districtNameFor(kingdom: Kingdom): string | null {
  const under = districtForPoint(kingdom.center[0], kingdom.center[1]);
  if (under) return under.name;
  const counts = new Map<string, number>();
  for (const place of placesInKingdom(kingdom.id)) {
    if (place.kingdomId) counts.set(place.kingdomId, (counts.get(place.kingdomId) ?? 0) + 1);
  }
  let best: string | null = null;
  for (const [id, count] of counts) {
    if (best === null || count > counts.get(best)!) best = id;
  }
  return districtById(best)?.name ?? null;
}

// --- Region: the part of the world the map shows ---------------------------------

const ALL_RING_POINTS = DISTRICTS.flatMap((d) => d.rings.flat());

/** The box around Seattle's districts. The map shows this when it has no better place. */
export const SEATTLE: Bounds = {
  minLat: Math.min(...ALL_RING_POINTS.map((p) => p[0])),
  maxLat: Math.max(...ALL_RING_POINTS.map((p) => p[0])),
  minLng: Math.min(...ALL_RING_POINTS.map((p) => p[1])),
  maxLng: Math.max(...ALL_RING_POINTS.map((p) => p[1])),
};

export function withinBounds(bounds: Bounds, lat: number, lng: number): boolean {
  return (
    lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng
  );
}

const RAD = Math.PI / 180;
const KM_PER_DEGREE = 111.32;
/** Pizzas this near the latest one are one city for the purpose of the map. */
const HOME_REACH_KM = 30;

/**
 * Where the map opens. It finds the pizzas near the player's latest one and
 * puts their middle, weighted by points, in the middle of the map. The box is
 * the same size on the ground as Seattle's, so a cell looks the same size in
 * every city. A player with no located pizza, or whose pizza is in Seattle,
 * gets Seattle itself, framed on its outline.
 */
export function homeRegion(eaten: Eaten[], latest: { lat: number; lng: number } | null): Bounds {
  if (!latest) return SEATTLE;
  const squash = Math.cos(latest.lat * RAD);
  let weight = 0;
  let lat = 0;
  let lng = 0;
  for (const e of eaten) {
    const km = Math.hypot(e.lat - latest.lat, (e.lng - latest.lng) * squash) * KM_PER_DEGREE;
    if (km > HOME_REACH_KM) continue;
    const w = Math.max(1, e.points);
    weight += w;
    lat += e.lat * w;
    lng += e.lng * w;
  }
  const middle = weight > 0 ? { lat: lat / weight, lng: lng / weight } : latest;
  if (withinBounds(SEATTLE, middle.lat, middle.lng)) return SEATTLE;
  return regionAround(middle.lat, middle.lng);
}

/** A box the size of Seattle's on the ground, with this coordinate in the middle. */
export function regionAround(lat: number, lng: number): Bounds {
  const halfLat = (SEATTLE.maxLat - SEATTLE.minLat) / 2;
  const seattleSquash = Math.cos(((SEATTLE.minLat + SEATTLE.maxLat) / 2) * RAD);
  const centerLat = Math.max(-80, Math.min(80, lat));
  const halfLng =
    (((SEATTLE.maxLng - SEATTLE.minLng) / 2) * seattleSquash) / Math.cos(centerLat * RAD);
  return {
    minLat: centerLat - halfLat,
    maxLat: centerLat + halfLat,
    minLng: lng - halfLng,
    maxLng: lng + halfLng,
  };
}

// --- Territory: who has eaten how much, where --------------------------------

/** One logged pizza, as the map needs it: where it was eaten and what it earned. */
export type Eaten = { lat: number; lng: number; points: number };

/** Total points per kingdom id. Every located pizza counts, in any city. */
export function pointsByKingdom(eaten: Eaten[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const e of eaten) {
    const id = kingdomForPoint(e.lat, e.lng).id;
    totals[id] = (totals[id] ?? 0) + e.points;
  }
  return totals;
}

export type Leader = 'you' | 'rival' | 'tie' | null;

/** Who is ahead in one kingdom. Null when neither has points there. */
export function kingdomLeader(
  kingdomId: string,
  you: Record<string, number>,
  rival: Record<string, number>
): Leader {
  const mine = you[kingdomId] ?? 0;
  const theirs = rival[kingdomId] ?? 0;
  if (mine === 0 && theirs === 0) return null;
  if (mine === theirs) return 'tie';
  return mine > theirs ? 'you' : 'rival';
}

/** How many kingdoms each side leads. Ties and empty kingdoms count for nobody. */
export function kingdomsLed(
  you: Record<string, number>,
  rival: Record<string, number>
): { you: number; rival: number } {
  let mine = 0;
  let theirs = 0;
  for (const id of new Set([...Object.keys(you), ...Object.keys(rival)])) {
    const leader = kingdomLeader(id, you, rival);
    if (leader === 'you') mine += 1;
    else if (leader === 'rival') theirs += 1;
  }
  return { you: mine, rival: theirs };
}

/**
 * Pizzas eaten at the same spot become one heat source carrying their
 * combined points, so a regular haunt burns hotter than a single visit.
 */
export function heatSources(eaten: Eaten[]): Eaten[] {
  const bySpot = new Map<string, Eaten>();
  for (const e of eaten) {
    const key = `${e.lat.toFixed(4)},${e.lng.toFixed(4)}`;
    const existing = bySpot.get(key);
    if (existing) existing.points += e.points;
    else bySpot.set(key, { ...e });
  }
  return [...bySpot.values()];
}
