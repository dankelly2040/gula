import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import type { Bounds } from './grid';

// The real city under the Realm: water, streets and place names, read from
// OpenStreetMap vector tiles (OpenMapTiles schema) and handed to the map as
// plain coordinates. The map draws them in the app's own look; no map service
// draws anything. This file only does arithmetic and decoding. The download
// is in lib/city-tiles.

/** A line as [lat, lng, lat, lng, ...]. */
export type Line = number[];

export type PlaceKind = 'city' | 'town' | 'suburb';

export type CityPlace = { name: string; kind: PlaceKind; rank: number; lat: number; lng: number };

export type City = {
  /** Water as closed rings, for a fill. Islands are rings wound the other way. */
  water: Line[];
  /** The edge between land and water. */
  coast: Line[];
  /** Motorways, trunk roads and primary roads. */
  majorRoads: Line[];
  /** Secondary and tertiary roads. */
  minorRoads: Line[];
  places: CityPlace[];
};

export type TileId = { z: number; x: number; y: number };

/**
 * Zoom 11 has every road down to tertiary and the suburb names, and a city
 * the size of the map's region is about a dozen tiles.
 */
export const CITY_ZOOM = 11;

const RAD = Math.PI / 180;

function tileColumn(lng: number, z: number): number {
  return ((lng + 180) / 360) * 2 ** z;
}

function tileRow(lat: number, z: number): number {
  const clamped = Math.max(-85, Math.min(85, lat)) * RAD;
  return ((1 - Math.log(Math.tan(clamped) + 1 / Math.cos(clamped)) / Math.PI) / 2) * 2 ** z;
}

/** Every tile that touches a box of coordinates. Columns wrap at the 180th meridian. */
export function tilesFor(bounds: Bounds, z = CITY_ZOOM): TileId[] {
  const n = 2 ** z;
  const x0 = Math.floor(tileColumn(bounds.minLng, z));
  const x1 = Math.floor(tileColumn(bounds.maxLng, z));
  const y0 = Math.max(0, Math.floor(tileRow(bounds.maxLat, z)));
  const y1 = Math.min(n - 1, Math.floor(tileRow(bounds.minLat, z)));
  const tiles: TileId[] = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) tiles.push({ z, x: ((x % n) + n) % n, y });
  }
  return tiles;
}

type Point = { x: number; y: number };

/**
 * The parts of a water ring that are a real shore. A tile cuts its water off
 * at its own edge, which leaves straight sides along that edge; a side with
 * both ends on or past the same edge is one of those and is left out.
 */
export function shoreRuns(ring: Point[], extent: number): Point[][] {
  const cut = (a: Point, b: Point) =>
    (a.x <= 0 && b.x <= 0) ||
    (a.x >= extent && b.x >= extent) ||
    (a.y <= 0 && b.y <= 0) ||
    (a.y >= extent && b.y >= extent);
  const runs: Point[][] = [];
  let run: Point[] = [];
  for (let i = 1; i < ring.length; i++) {
    if (cut(ring[i - 1], ring[i])) {
      if (run.length > 1) runs.push(run);
      run = [];
    } else {
      if (run.length === 0) run.push(ring[i - 1]);
      run.push(ring[i]);
    }
  }
  if (run.length > 1) runs.push(run);
  return runs;
}

/** Drops points nearer than `reach` to the last one kept. The two ends always stay. */
export function thin(points: Point[], reach: number): Point[] {
  if (points.length <= 2) return points;
  const kept = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const last = kept[kept.length - 1];
    if (Math.abs(points[i].x - last.x) + Math.abs(points[i].y - last.y) >= reach) kept.push(points[i]);
  }
  kept.push(points[points.length - 1]);
  return kept;
}

// Tile units between kept points. A tile is 4096 units across and about 170
// screen points wide before the user zooms, so this is a quarter of a point.
const THIN_REACH = 6;

const MAJOR = new Set(['motorway', 'trunk', 'primary']);
const MINOR = new Set(['secondary', 'tertiary']);
const SMALL_WATER = new Set(['pond', 'swimming_pool', 'fountain', 'basin', 'reservoir']);
const PLACE_KINDS: Record<string, PlaceKind> = {
  city: 'city',
  town: 'town',
  suburb: 'suburb',
  quarter: 'suburb',
  neighbourhood: 'suburb',
};

/** Reads one tile. Everything comes back as coordinates, so tiles can be joined. */
export function readTile(bytes: Uint8Array, id: TileId): City {
  const tile = new VectorTile(new PbfReader(bytes));
  const n = 2 ** id.z;
  const toLine = (points: Point[], extent: number): Line => {
    const line: Line = [];
    for (const p of points) {
      const y = (id.y + p.y / extent) / n;
      line.push(
        Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) / RAD,
        ((id.x + p.x / extent) / n) * 360 - 180
      );
    }
    return line;
  };

  const city: City = { water: [], coast: [], majorRoads: [], minorRoads: [], places: [] };

  const water = tile.layers.water;
  for (let i = 0; water && i < water.length; i++) {
    const feature = water.feature(i);
    if (feature.type !== 3 || SMALL_WATER.has(String(feature.properties.class))) continue;
    for (const ring of feature.loadGeometry()) {
      city.water.push(toLine(thin(ring, THIN_REACH), water.extent));
      for (const run of shoreRuns(ring, water.extent)) {
        city.coast.push(toLine(thin(run, THIN_REACH), water.extent));
      }
    }
  }

  const roads = tile.layers.transportation;
  for (let i = 0; roads && i < roads.length; i++) {
    const feature = roads.feature(i);
    if (feature.type !== 2) continue;
    const kind = String(feature.properties.class);
    const into = MAJOR.has(kind) ? city.majorRoads : MINOR.has(kind) ? city.minorRoads : null;
    if (!into) continue;
    for (const line of feature.loadGeometry()) into.push(toLine(thin(line, THIN_REACH), roads.extent));
  }

  const places = tile.layers.place;
  for (let i = 0; places && i < places.length; i++) {
    const feature = places.feature(i);
    const kind = PLACE_KINDS[String(feature.properties.class)];
    // A name in Latin letters where the tile has one: the map's typeface has
    // no other script.
    const name = feature.properties['name:latin'] ?? feature.properties.name;
    if (!kind || typeof name !== 'string' || !name) continue;
    const [lat, lng] = toLine(feature.loadGeometry()[0].slice(0, 1), places.extent);
    const rank = Number(feature.properties.rank);
    city.places.push({ name, kind, rank: Number.isFinite(rank) ? rank : 99, lat, lng });
  }
  return city;
}

/** Joins tiles into one city. A place that several tiles carry is kept once. */
export function joinCity(parts: City[]): City {
  const city: City = { water: [], coast: [], majorRoads: [], minorRoads: [], places: [] };
  const seen = new Set<string>();
  for (const part of parts) {
    city.water.push(...part.water);
    city.coast.push(...part.coast);
    city.majorRoads.push(...part.majorRoads);
    city.minorRoads.push(...part.minorRoads);
    for (const place of part.places) {
      const key = `${place.name}|${place.lat.toFixed(3)}|${place.lng.toFixed(3)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      city.places.push(place);
    }
  }
  return city;
}
