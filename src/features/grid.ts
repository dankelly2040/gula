// The world as one grid of six-sided cells. A cell is found from a coordinate
// by arithmetic alone, so the grid needs no data for any city and gives the
// same cell for the same place on every phone and on the server.
//
// The grid is laid out on the Web Mercator plane with pointy-top hexagons in
// axial coordinates (q, r). On that plane every cell is the same size. On the
// ground a cell's size follows the cosine of its latitude: about 1.35 km from
// middle to corner in Seattle, 1.5 km in New York, 2 km on the equator and
// 1 km in Oslo. A cell that crosses the 180th meridian is cut in two there.

export type LatLng = [lat: number, lng: number];

export type Cell = {
  /** Stable id, "q,r". */
  id: string;
  q: number;
  r: number;
  center: LatLng;
};

export type Bounds = { minLat: number; maxLat: number; minLng: number; maxLng: number };

/** Middle to corner, in Web Mercator meters. Changing it changes every cell id. */
export const CELL_SIZE = 2000;

const EARTH_RADIUS = 6378137;
const MAX_LAT = 85;
const SQRT3 = Math.sqrt(3);
const RAD = Math.PI / 180;

function toPlane(lat: number, lng: number): { x: number; y: number } {
  const clamped = Math.max(-MAX_LAT, Math.min(MAX_LAT, lat));
  return {
    x: EARTH_RADIUS * lng * RAD,
    y: EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + (clamped * RAD) / 2)),
  };
}

function fromPlane(x: number, y: number): LatLng {
  return [(2 * Math.atan(Math.exp(y / EARTH_RADIUS)) - Math.PI / 2) / RAD, x / EARTH_RADIUS / RAD];
}

function planeCenter(q: number, r: number): { x: number; y: number } {
  return { x: CELL_SIZE * SQRT3 * (q + r / 2), y: CELL_SIZE * 1.5 * r };
}

export function cellAt(q: number, r: number): Cell {
  const { x, y } = planeCenter(q, r);
  return { id: `${q},${r}`, q, r, center: fromPlane(x, y) };
}

export function cellById(id: string): Cell | null {
  const [q, r] = id.split(',').map(Number);
  if (!Number.isInteger(q) || !Number.isInteger(r)) return null;
  return cellAt(q, r);
}

/** The cell that contains a coordinate. Every coordinate is in exactly one. */
export function cellForPoint(lat: number, lng: number): Cell {
  const { x, y } = toPlane(lat, lng);
  const fq = ((SQRT3 / 3) * x - y / 3) / CELL_SIZE;
  const fr = ((2 / 3) * y) / CELL_SIZE;
  // Round in cube coordinates, then repair the axis that moved the most.
  const fs = -fq - fr;
  let q = Math.round(fq);
  let r = Math.round(fr);
  const s = Math.round(fs);
  const dq = Math.abs(q - fq);
  const dr = Math.abs(r - fr);
  const ds = Math.abs(s - fs);
  if (dq > dr && dq > ds) q = -r - s;
  else if (dr > ds) r = -q - s;
  // "+ 0" turns a negative zero into zero, so ids never read "-0".
  return cellAt(q + 0, r + 0);
}

/** The six corners of a cell, in order around it. */
export function cellCorners(cell: Pick<Cell, 'q' | 'r'>): LatLng[] {
  const { x, y } = planeCenter(cell.q, cell.r);
  const corners: LatLng[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (60 * i - 30) * RAD;
    corners.push(fromPlane(x + CELL_SIZE * Math.cos(angle), y + CELL_SIZE * Math.sin(angle)));
  }
  return corners;
}

/** A box made bigger on every side by a share of its own size. */
export function growBounds(bounds: Bounds, share: number): Bounds {
  const lat = (bounds.maxLat - bounds.minLat) * share;
  const lng = (bounds.maxLng - bounds.minLng) * share;
  return {
    minLat: bounds.minLat - lat,
    maxLat: bounds.maxLat + lat,
    minLng: bounds.minLng - lng,
    maxLng: bounds.maxLng + lng,
  };
}

/** Every cell that touches a box of coordinates, row by row. */
export function cellsInBounds(bounds: Bounds): Cell[] {
  const low = toPlane(bounds.minLat, bounds.minLng);
  const high = toPlane(bounds.maxLat, bounds.maxLng);
  const cells: Cell[] = [];
  const rMin = Math.floor(low.y / (CELL_SIZE * 1.5)) - 1;
  const rMax = Math.ceil(high.y / (CELL_SIZE * 1.5)) + 1;
  for (let r = rMin; r <= rMax; r++) {
    const qMin = Math.floor(low.x / (CELL_SIZE * SQRT3) - r / 2) - 1;
    const qMax = Math.ceil(high.x / (CELL_SIZE * SQRT3) - r / 2) + 1;
    for (let q = qMin; q <= qMax; q++) cells.push(cellAt(q, r));
  }
  return cells;
}

/** Middle to corner on the ground, in meters, for a cell at this latitude. */
export function cellGroundRadius(lat: number): number {
  return CELL_SIZE * Math.cos(lat * RAD);
}
