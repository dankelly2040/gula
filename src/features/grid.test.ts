import { describe, expect, test } from 'bun:test';
import {
  cellAt,
  cellById,
  cellCorners,
  cellForPoint,
  cellGroundRadius,
  cellsInBounds,
} from './grid';

const CITIES: Record<string, [number, number]> = {
  seattle: [47.6062, -122.3321],
  brooklyn: [40.6782, -73.9442],
  naples: [40.8518, 14.2681],
  tokyo: [35.6762, 139.6503],
  sydney: [-33.8688, 151.2093],
  saoPaulo: [-23.5505, -46.6333],
  reykjavik: [64.1466, -21.9426],
  quito: [-0.1807, -78.4678],
};

describe('cellForPoint', () => {
  test('gives every city a cell, and different cities different cells', () => {
    const ids = Object.values(CITIES).map(([lat, lng]) => cellForPoint(lat, lng).id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('the same coordinate always gives the same cell', () => {
    const [lat, lng] = CITIES.naples;
    expect(cellForPoint(lat, lng)).toEqual(cellForPoint(lat, lng));
  });

  test("a cell's center is inside that cell", () => {
    for (const [lat, lng] of Object.values(CITIES)) {
      const cell = cellForPoint(lat, lng);
      expect(cellForPoint(cell.center[0], cell.center[1]).id).toBe(cell.id);
    }
  });

  test('a coordinate is nearer to its own center than to any neighbor', () => {
    const squared = (a: [number, number], lat: number, lng: number) => {
      // Compare on the plane the grid is laid out on, not in raw degrees.
      const y = (v: number) => Math.log(Math.tan(Math.PI / 4 + (v * Math.PI) / 360));
      const dx = ((a[1] - lng) * Math.PI) / 180;
      return dx * dx + (y(a[0]) - y(lat)) ** 2;
    };
    for (const [lat0, lng0] of Object.values(CITIES)) {
      for (let i = 0; i < 40; i++) {
        const lat = lat0 + Math.sin(i * 12.9898) * 0.08;
        const lng = lng0 + Math.cos(i * 78.233) * 0.08;
        const cell = cellForPoint(lat, lng);
        const own = squared(cell.center, lat, lng);
        for (const [dq, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]]) {
          const neighbor = cellAt(cell.q + dq, cell.r + dr);
          expect(own).toBeLessThanOrEqual(squared(neighbor.center, lat, lng) + 1e-15);
        }
      }
    }
  });

  test('does not fail at the poles or on the 180th meridian', () => {
    for (const [lat, lng] of [[90, 0], [-90, 0], [0, 180], [0, -180], [0, 0]]) {
      const cell = cellForPoint(lat, lng);
      expect(cell.id).not.toContain('NaN');
      expect(cell.id).not.toContain('-0');
    }
  });
});

describe('cell ids', () => {
  test('cellById reads back what cellForPoint wrote', () => {
    const cell = cellForPoint(...CITIES.tokyo);
    expect(cellById(cell.id)).toEqual(cell);
  });

  test('cellById refuses text that is not an id', () => {
    expect(cellById('ballard')).toBeNull();
    expect(cellById('1.5,2')).toBeNull();
  });
});

describe('cellCorners', () => {
  test('six corners, each shared with two neighbors', () => {
    const cell = cellForPoint(...CITIES.seattle);
    const corners = cellCorners(cell);
    expect(corners).toHaveLength(6);
    const key = ([lat, lng]: [number, number]) => `${lat.toFixed(6)},${lng.toFixed(6)}`;
    const around = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]].flatMap(([dq, dr]) =>
      cellCorners(cellAt(cell.q + dq, cell.r + dr)).map(key)
    );
    for (const corner of corners) {
      expect(around.filter((k) => k === key(corner))).toHaveLength(2);
    }
  });
});

describe('cellsInBounds', () => {
  const seattle = { minLat: 47.49, maxLat: 47.74, minLng: -122.44, maxLng: -122.22 };

  test('holds the cell of every coordinate in the box, once', () => {
    const cells = cellsInBounds(seattle);
    const ids = new Set(cells.map((c) => c.id));
    expect(ids.size).toBe(cells.length);
    for (let i = 0; i <= 10; i++) {
      for (let j = 0; j <= 10; j++) {
        const lat = seattle.minLat + ((seattle.maxLat - seattle.minLat) * i) / 10;
        const lng = seattle.minLng + ((seattle.maxLng - seattle.minLng) * j) / 10;
        expect(ids.has(cellForPoint(lat, lng).id)).toBe(true);
      }
    }
  });

  test('a city is a few hundred cells at most', () => {
    expect(cellsInBounds(seattle).length).toBeLessThan(300);
  });
});

describe('cellGroundRadius', () => {
  test('cells are about 1.35 km in Seattle and 2 km on the equator', () => {
    expect(cellGroundRadius(47.6)).toBeGreaterThan(1300);
    expect(cellGroundRadius(47.6)).toBeLessThan(1400);
    expect(cellGroundRadius(0)).toBe(2000);
  });
});
