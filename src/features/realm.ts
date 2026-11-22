import kingdomsJson from '@/data/kingdoms.json';
import placesJson from '@/data/places.json';
import { colors, KINGDOM_FILLS } from '@/constants/theme';

/** A kingdom is one of Seattle's 20 districts (City of Seattle Neighborhood Map Atlas). */
export type Kingdom = {
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
  kingdomId: string | null;
};

export const KINGDOMS: Kingdom[] = kingdomsJson as Kingdom[];
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
 * Kingdom name labels render at a fixed point size, so at city zoom the
 * names in the dense middle of the map pile on top of each other. These
 * six wait for a closer zoom; every other name shows from LABEL_MIN_ZOOM.
 */
export const LABEL_DEFAULT_MIN_ZOOM = 11.9;

/**
 * Below this zoom the map shows no kingdom names at all. At city zoom the
 * names crowd the map, so they wait until the user moves in.
 */
export const LABEL_MIN_ZOOM = 11;
export const LATE_LABEL_KINGDOMS = new Set([
  'northgate',
  'north-central',
  'interbay',
  'cascade',
  'central-area',
  'beacon-hill',
]);

export function visibleLabelKingdoms(zoom: number): Kingdom[] {
  if (zoom < LABEL_MIN_ZOOM) return [];
  if (zoom >= LABEL_DEFAULT_MIN_ZOOM) return KINGDOMS;
  return KINGDOMS.filter((k) => !LATE_LABEL_KINGDOMS.has(k.id));
}

/** Stable tint for a kingdom: rotates the four fills in list order. */
export function kingdomFill(kingdom: Kingdom): string {
  const index = KINGDOMS.findIndex((k) => k.id === kingdom.id);
  return KINGDOM_FILLS[(index < 0 ? 0 : index) % KINGDOM_FILLS.length];
}

export function kingdomById(id: string | null | undefined): Kingdom | null {
  if (!id) return null;
  return KINGDOMS.find((k) => k.id === id) ?? null;
}

export function placesInKingdom(kingdomId: string): Place[] {
  return PLACES.filter((p) => p.kingdomId === kingdomId);
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
 * Which kingdom contains a coordinate, or null outside the city. Used for
 * user-added spots at log time, so it runs on the simplified rings the app
 * ships with; a point within a few metres of a border can land either side.
 */
export function kingdomForPoint(lat: number, lng: number): Kingdom | null {
  for (const k of KINGDOMS) {
    if (k.rings.some((ring) => pointInRing(lat, lng, ring))) return k;
  }
  return null;
}

// --- Territory: who has eaten how much, where --------------------------------

/** One logged pizza, as the map needs it: where it was eaten and what it earned. */
export type Eaten = { lat: number; lng: number; points: number };

/** Total points per kingdom id. Pizzas eaten outside every kingdom are left out. */
export function pointsByKingdom(eaten: Eaten[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const e of eaten) {
    const kingdom = kingdomForPoint(e.lat, e.lng);
    if (!kingdom) continue;
    totals[kingdom.id] = (totals[kingdom.id] ?? 0) + e.points;
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
  for (const k of KINGDOMS) {
    const leader = kingdomLeader(k.id, you, rival);
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
