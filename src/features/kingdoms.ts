import type { PizzaLog, Spot } from '../db/types';

/**
 * Pizza Quest territories.
 *
 * Phase 1 uses half-open bounding boxes instead of H3 cells or PostGIS
 * polygons. The same `lat >= min && lat < max` test runs in this module and
 * in `supabase/migrations/0003_kingdoms.sql`, so a log can be placed with no
 * network and the server can confirm it without an extension. A kingdom may
 * own several boxes (a union). When boxes overlap, the smallest one wins, and
 * an equal area falls through to slug order so the two runtimes cannot pick
 * different kingdoms.
 *
 * The Seattle seed is the offline catalog. After a sync, cached server rows
 * override the seed by id and any new kingdom is appended, so a later city
 * ships without an app release and a partial cache cannot drop the seed.
 * Keep the seed numbers in lockstep with the migration; kingdoms.test.ts
 * checks that.
 */

export const KINGDOM_WINDOW_DAYS = 30;
export const KINGDOM_NEAR_RADIUS_KM = 12;

export type Bounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export type Kingdom = {
  id: string;
  slug: string;
  name: string;
  /** Parent city. Null when a kingdom is not filed under one. */
  city: string | null;
  bounds: Bounds[];
};

export type KingdomNear = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  centerLat: number;
  centerLng: number;
  distanceKm: number;
  containsPoint: boolean;
};

export type KingdomScore = {
  kingdomId: string;
  kingdomName: string;
  city: string | null;
  /** Points from logs inside the rolling window. This is what the crown uses. */
  points: number;
  logs: number;
  allTimePoints: number;
  allTimeLogs: number;
};

export type CrownStatus = 'held' | 'contested' | 'vacant';

export type Standing = {
  userId: string;
  points: number;
  logs: number;
};

export type CrownDecision = {
  status: CrownStatus;
  userId: string | null;
  points: number;
  logs: number | null;
  holderCount: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Stable ids so a local assignment upserts into the seeded Postgres rows.
const ballard = '4b1a11a0-0000-4000-8000-000000000001';
const fremont = '4b1a11a0-0000-4000-8000-000000000002';
const wallingford = '4b1a11a0-0000-4000-8000-000000000003';
const greenLake = '4b1a11a0-0000-4000-8000-000000000004';
const universityDistrict = '4b1a11a0-0000-4000-8000-000000000005';
const queenAnne = '4b1a11a0-0000-4000-8000-000000000006';
const southLakeUnion = '4b1a11a0-0000-4000-8000-000000000007';
const capitolHill = '4b1a11a0-0000-4000-8000-000000000008';
const downtown = '4b1a11a0-0000-4000-8000-000000000009';
const internationalDistrict = '4b1a11a0-0000-4000-8000-00000000000a';
const beaconHill = '4b1a11a0-0000-4000-8000-00000000000b';
const georgetown = '4b1a11a0-0000-4000-8000-00000000000c';
const columbiaCity = '4b1a11a0-0000-4000-8000-00000000000d';
const westSeattle = '4b1a11a0-0000-4000-8000-00000000000e';
const magnolia = '4b1a11a0-0000-4000-8000-00000000000f';

function box(minLat: number, maxLat: number, minLng: number, maxLng: number): Bounds {
  return { minLat, maxLat, minLng, maxLng };
}

export const SEATTLE_KINGDOMS: Kingdom[] = [
  { id: ballard, slug: 'ballard', name: 'Ballard', city: 'Seattle', bounds: [box(47.662, 47.695, -122.415, -122.35)] },
  { id: fremont, slug: 'fremont', name: 'Fremont', city: 'Seattle', bounds: [box(47.643, 47.662, -122.37, -122.335)] },
  { id: wallingford, slug: 'wallingford', name: 'Wallingford', city: 'Seattle', bounds: [box(47.648, 47.668, -122.335, -122.315)] },
  { id: greenLake, slug: 'green-lake', name: 'Green Lake', city: 'Seattle', bounds: [box(47.668, 47.695, -122.35, -122.315)] },
  { id: universityDistrict, slug: 'university-district', name: 'University District', city: 'Seattle', bounds: [box(47.648, 47.672, -122.315, -122.29)] },
  { id: queenAnne, slug: 'queen-anne', name: 'Queen Anne', city: 'Seattle', bounds: [box(47.622, 47.643, -122.375, -122.348)] },
  { id: southLakeUnion, slug: 'south-lake-union', name: 'South Lake Union', city: 'Seattle', bounds: [box(47.622, 47.643, -122.348, -122.328)] },
  { id: capitolHill, slug: 'capitol-hill', name: 'Capitol Hill', city: 'Seattle', bounds: [box(47.605, 47.643, -122.328, -122.296)] },
  { id: downtown, slug: 'downtown', name: 'Downtown', city: 'Seattle', bounds: [box(47.598, 47.622, -122.36, -122.332)] },
  { id: internationalDistrict, slug: 'international-district', name: 'International District', city: 'Seattle', bounds: [box(47.59, 47.605, -122.332, -122.312)] },
  { id: beaconHill, slug: 'beacon-hill', name: 'Beacon Hill', city: 'Seattle', bounds: [box(47.555, 47.59, -122.32, -122.292)] },
  { id: georgetown, slug: 'georgetown', name: 'Georgetown', city: 'Seattle', bounds: [box(47.53, 47.555, -122.335, -122.3)] },
  { id: columbiaCity, slug: 'columbia-city', name: 'Columbia City', city: 'Seattle', bounds: [box(47.548, 47.575, -122.292, -122.27)] },
  { id: westSeattle, slug: 'west-seattle', name: 'West Seattle', city: 'Seattle', bounds: [box(47.54, 47.59, -122.42, -122.355)] },
  { id: magnolia, slug: 'magnolia', name: 'Magnolia', city: 'Seattle', bounds: [box(47.63, 47.662, -122.412, -122.38)] },
];

export function activeKingdomCatalog(cached: readonly Kingdom[] | null | undefined): readonly Kingdom[] {
  if (!cached || cached.length === 0) return SEATTLE_KINGDOMS;
  const byId = new Map<string, Kingdom>();
  for (const kingdom of SEATTLE_KINGDOMS) byId.set(kingdom.id, kingdom);
  for (const kingdom of cached) byId.set(kingdom.id, kingdom);
  return [...byId.values()];
}

function isBounds(value: unknown): value is Bounds {
  if (!value || typeof value !== 'object') return false;
  const box = value as Partial<Bounds>;
  return (
    typeof box.minLat === 'number' && Number.isFinite(box.minLat) &&
    typeof box.maxLat === 'number' && Number.isFinite(box.maxLat) &&
    typeof box.minLng === 'number' && Number.isFinite(box.minLng) &&
    typeof box.maxLng === 'number' && Number.isFinite(box.maxLng) &&
    box.minLat < box.maxLat &&
    box.minLng < box.maxLng
  );
}

/** Drop malformed cached rows so a bad payload cannot blank the seed catalog. */
export function parseKingdomCatalog(raw: unknown): Kingdom[] {
  if (!Array.isArray(raw)) return [];
  const parsed: Kingdom[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const kingdom = item as Partial<Kingdom>;
    if (typeof kingdom.id !== 'string' || typeof kingdom.slug !== 'string' || typeof kingdom.name !== 'string') {
      continue;
    }
    if (!Array.isArray(kingdom.bounds)) continue;
    const bounds = kingdom.bounds.filter(isBounds);
    if (bounds.length === 0) continue;
    parsed.push({
      id: kingdom.id,
      slug: kingdom.slug,
      name: kingdom.name,
      city: typeof kingdom.city === 'string' ? kingdom.city : null,
      bounds,
    });
  }
  return parsed;
}

export function kingdomById(id: string, catalog: readonly Kingdom[] = SEATTLE_KINGDOMS): Kingdom | null {
  return catalog.find((kingdom) => kingdom.id === id) ?? null;
}

function boundsContain(bounds: Bounds, lat: number, lng: number): boolean {
  return lat >= bounds.minLat && lat < bounds.maxLat && lng >= bounds.minLng && lng < bounds.maxLng;
}

function boundsArea(bounds: Bounds): number {
  return (bounds.maxLat - bounds.minLat) * (bounds.maxLng - bounds.minLng);
}

/**
 * Kingdom that owns a coordinate, or null when it falls in a gap (water, or a
 * neighborhood we have not seeded). Half-open on the max edges.
 */
export function kingdomAt(
  lat: number,
  lng: number,
  catalog: readonly Kingdom[] = SEATTLE_KINGDOMS
): Kingdom | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  let best: { kingdom: Kingdom; area: number } | null = null;
  for (const kingdom of catalog) {
    for (const bounds of kingdom.bounds) {
      if (!boundsContain(bounds, lat, lng)) continue;
      const area = boundsArea(bounds);
      if (
        !best ||
        area < best.area ||
        (area === best.area && kingdom.slug < best.kingdom.slug)
      ) {
        best = { kingdom, area };
      }
    }
  }
  return best?.kingdom ?? null;
}

/** Midpoint of the union of a kingdom's boxes. Matches `kingdoms_near`. */
export function kingdomCenter(kingdom: Kingdom): { lat: number; lng: number } | null {
  if (kingdom.bounds.length === 0) return null;
  const minLat = Math.min(...kingdom.bounds.map((bounds) => bounds.minLat));
  const maxLat = Math.max(...kingdom.bounds.map((bounds) => bounds.maxLat));
  const minLng = Math.min(...kingdom.bounds.map((bounds) => bounds.minLng));
  const maxLng = Math.max(...kingdom.bounds.map((bounds) => bounds.maxLng));
  return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
}

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Kingdoms whose box contains the point, plus kingdoms whose center lies
 * inside the radius. Containing kingdoms sort first. Radius is clamped to
 * 0–100 km, same as the RPC.
 */
export function kingdomsNear(
  lat: number,
  lng: number,
  radiusKm = KINGDOM_NEAR_RADIUS_KM,
  catalog: readonly Kingdom[] = SEATTLE_KINGDOMS
): KingdomNear[] {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  const radius = Math.min(100, Math.max(radiusKm, 0));
  const hits: KingdomNear[] = [];
  for (const kingdom of catalog) {
    const center = kingdomCenter(kingdom);
    if (!center) continue;
    const containsPoint = kingdom.bounds.some((bounds) => boundsContain(bounds, lat, lng));
    const distance = distanceKm(lat, lng, center.lat, center.lng);
    if (!containsPoint && distance > radius) continue;
    hits.push({
      id: kingdom.id,
      slug: kingdom.slug,
      name: kingdom.name,
      city: kingdom.city,
      centerLat: center.lat,
      centerLng: center.lng,
      distanceKm: distance,
      containsPoint,
    });
  }
  hits.sort((a, b) => {
    if (a.containsPoint !== b.containsPoint) return a.containsPoint ? -1 : 1;
    if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
    return a.slug.localeCompare(b.slug);
  });
  return hits;
}

/**
 * Coordinates used to place a log. The device fix wins when it exists; a
 * spot pin is only the fallback so a log still counts when GPS was denied.
 */
export function resolveLogCoords(
  log: { lat: number | null; lng: number | null; spotId: string | null },
  spots: readonly Spot[]
): { lat: number; lng: number } | null {
  if (log.lat != null && log.lng != null && Number.isFinite(log.lat) && Number.isFinite(log.lng)) {
    return { lat: log.lat, lng: log.lng };
  }
  if (!log.spotId) return null;
  const spot = spots.find((candidate) => candidate.id === log.spotId);
  if (!spot || spot.lat == null || spot.lng == null) return null;
  if (!Number.isFinite(spot.lat) || !Number.isFinite(spot.lng)) return null;
  return { lat: spot.lat, lng: spot.lng };
}

/** Stamp `kingdomId` (and fill missing coordinates from the spot) onto a log. */
export function assignLogKingdom<T extends PizzaLog>(
  log: T,
  spots: readonly Spot[],
  catalog: readonly Kingdom[] = SEATTLE_KINGDOMS
): T {
  const coords = resolveLogCoords(log, spots);
  const kingdom = coords ? kingdomAt(coords.lat, coords.lng, catalog) : null;
  return {
    ...log,
    lat: coords?.lat ?? log.lat,
    lng: coords?.lng ?? log.lng,
    kingdomId: kingdom?.id ?? null,
  };
}

export function kingdomWindowStart(now: Date, windowDays = KINGDOM_WINDOW_DAYS): number {
  const requested = Number.isFinite(windowDays) ? Math.trunc(windowDays) : KINGDOM_WINDOW_DAYS;
  const days = Math.min(365, Math.max(1, requested));
  return now.getTime() - days * DAY_MS;
}

/**
 * Per-kingdom totals for one player's logs. Windowed points are the crown
 * currency; all-time is the running materialization. Logs with no kingdom
 * contribute to neither.
 */
export function kingdomScores(
  logs: readonly PizzaLog[],
  catalog: readonly Kingdom[] = SEATTLE_KINGDOMS,
  now = new Date(),
  windowDays = KINGDOM_WINDOW_DAYS
): KingdomScore[] {
  const start = kingdomWindowStart(now, windowDays);
  const byId = new Map<string, KingdomScore>();
  for (const log of logs) {
    if (!log.kingdomId) continue;
    let row = byId.get(log.kingdomId);
    if (!row) {
      const kingdom = kingdomById(log.kingdomId, catalog);
      row = {
        kingdomId: log.kingdomId,
        kingdomName: kingdom?.name ?? 'Unknown kingdom',
        city: kingdom?.city ?? null,
        points: 0,
        logs: 0,
        allTimePoints: 0,
        allTimeLogs: 0,
      };
      byId.set(log.kingdomId, row);
    }
    row.allTimePoints += log.pointsEarned;
    row.allTimeLogs += 1;
    const loggedAt = new Date(log.timestamp).getTime();
    if (Number.isFinite(loggedAt) && loggedAt >= start) {
      row.points += log.pointsEarned;
      row.logs += 1;
    }
  }
  return [...byId.values()].sort(
    (a, b) => b.points - a.points || b.allTimePoints - a.allTimePoints || a.kingdomName.localeCompare(b.kingdomName)
  );
}

/**
 * Public crown rule. `kingdom_crown` in migration 0003 implements this.
 *
 * Rank is `dense_rank` on points over the rolling window. The crown is held
 * only when exactly one player is alone in first. A tie for first is
 * contested: log count is not a tiebreak, and nobody wears it. Zero or
 * negative totals do not contend, so an empty kingdom stays vacant.
 */
export function decideCrown(standings: readonly Standing[]): CrownDecision {
  const contenders = standings.filter((standing) => standing.points > 0);
  if (contenders.length === 0) {
    return { status: 'vacant', userId: null, points: 0, logs: null, holderCount: 0 };
  }
  const topPoints = Math.max(...contenders.map((standing) => standing.points));
  const top = contenders.filter((standing) => standing.points === topPoints);
  if (top.length === 1) {
    return {
      status: 'held',
      userId: top[0].userId,
      points: top[0].points,
      logs: top[0].logs,
      holderCount: 1,
    };
  }
  return { status: 'contested', userId: null, points: topPoints, logs: null, holderCount: top.length };
}

/** `dense_rank` on points. Display order uses logs, then user id, as a stable sort only. */
export function rankKingdomStandings(standings: readonly Standing[]): (Standing & { rank: number })[] {
  const sorted = [...standings]
    .filter((standing) => standing.points > 0)
    .sort((a, b) => b.points - a.points || b.logs - a.logs || a.userId.localeCompare(b.userId));
  let dense = 0;
  let lastPoints: number | null = null;
  return sorted.map((standing) => {
    if (lastPoints !== standing.points) {
      dense += 1;
      lastPoints = standing.points;
    }
    return { ...standing, rank: dense };
  });
}
