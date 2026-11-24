import { describe, expect, test } from 'bun:test';
import { joinCity, shoreRuns, thin, tilesFor, type City } from './city';

describe('tilesFor', () => {
  test('finds the tile of a known place', () => {
    // North Beach, San Francisco, is in tile 12/655/1582.
    const at = { minLat: 37.8, maxLat: 37.8, minLng: -122.41, maxLng: -122.41 };
    expect(tilesFor(at, 12)).toEqual([{ z: 12, x: 655, y: 1582 }]);
  });

  test('a city-sized box is a handful of tiles', () => {
    const seattle = { minLat: 47.49, maxLat: 47.74, minLng: -122.44, maxLng: -122.22 };
    const tiles = tilesFor(seattle);
    expect(tiles.length).toBeGreaterThanOrEqual(4);
    expect(tiles.length).toBeLessThanOrEqual(16);
    expect(new Set(tiles.map((t) => `${t.x}/${t.y}`)).size).toBe(tiles.length);
  });

  test('wraps across the 180th meridian', () => {
    const fiji = { minLat: -17, maxLat: -16.9, minLng: 179.95, maxLng: 180.05 };
    const columns = tilesFor(fiji, 11).map((t) => t.x);
    expect(columns).toContain(2047);
    expect(columns).toContain(0);
  });
});

describe('shoreRuns', () => {
  const E = 4096;

  test('keeps a shore and drops the sides a tile cut along its own edge', () => {
    // Water in the left part of a tile: the shore runs down the middle, and
    // the other three sides lie on the tile's edge or past it.
    const ring = [
      { x: -64, y: -64 },
      { x: 2000, y: -64 },
      { x: 2100, y: 2000 },
      { x: 1900, y: 4160 },
      { x: -64, y: 4160 },
      { x: -64, y: -64 },
    ];
    const runs = shoreRuns(ring, E);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toEqual([
      { x: 2000, y: -64 },
      { x: 2100, y: 2000 },
      { x: 1900, y: 4160 },
    ]);
  });

  test('keeps a whole lake that touches no edge', () => {
    const lake = [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
      { x: 300, y: 300 },
      { x: 100, y: 100 },
    ];
    expect(shoreRuns(lake, E)).toEqual([lake]);
  });

  test('gives nothing for a tile that is all water', () => {
    const sea = [
      { x: -64, y: -64 },
      { x: 4160, y: -64 },
      { x: 4160, y: 4160 },
      { x: -64, y: 4160 },
      { x: -64, y: -64 },
    ];
    expect(shoreRuns(sea, E)).toEqual([]);
  });
});

describe('thin', () => {
  test('drops crowded points and keeps both ends', () => {
    const line = [0, 1, 2, 3, 10, 11, 30].map((x) => ({ x, y: 0 }));
    expect(thin(line, 6).map((p) => p.x)).toEqual([0, 10, 30]);
  });
});

describe('joinCity', () => {
  const part = (name: string): City => ({
    water: [[1, 2, 3, 4]],
    coast: [],
    majorRoads: [],
    minorRoads: [],
    places: [{ name, kind: 'suburb', rank: 11, lat: 37.8, lng: -122.41 }],
  });

  test('keeps a place once when two tiles carry it', () => {
    const city = joinCity([part('North Beach'), part('North Beach'), part('Chinatown')]);
    expect(city.places.map((p) => p.name)).toEqual(['North Beach', 'Chinatown']);
    expect(city.water).toHaveLength(3);
  });
});
