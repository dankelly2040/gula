import { CITY_ZOOM, joinCity, readTile, tilesFor, type City } from '../features/city';
import type { Bounds } from '../features/grid';

// Where the city comes from: OpenFreeMap's public tiles, which are
// OpenStreetMap data in the OpenMapTiles schema. The service is free, needs
// no key and has no request limit, and it requires the credit below wherever
// the data is shown. A request carries only a tile number (an area several
// kilometres across), never a position. Tiles are served with a long cache
// life, so the system's own HTTP cache keeps them between launches.

export const CITY_CREDIT = '© OpenStreetMap · OpenMapTiles · OpenFreeMap';

const TILE_INDEX = 'https://tiles.openfreemap.org/planet';

// The index names the current tile set, which changes about once a week.
let template: Promise<string> | null = null;

function tileTemplate(): Promise<string> {
  template ??= fetch(TILE_INDEX)
    .then((response) => response.json())
    .then((index: { tiles?: string[] }) => {
      const url = index.tiles?.[0];
      if (!url) throw new Error('The tile index has no tile address');
      return url;
    })
    .catch((error) => {
      template = null; // ask again next time
      throw error;
    });
  return template;
}

/**
 * The water, streets and place names of a box of coordinates. A tile that
 * fails to load leaves a hole in the city; the call only fails when the index
 * cannot be read or no tile at all arrives.
 */
export async function loadCity(bounds: Bounds): Promise<City> {
  const url = await tileTemplate();
  const parts = await Promise.all(
    tilesFor(bounds, CITY_ZOOM).map(async (id) => {
      try {
        const response = await fetch(
          url.replace('{z}', String(id.z)).replace('{x}', String(id.x)).replace('{y}', String(id.y))
        );
        if (!response.ok) return null;
        return readTile(new Uint8Array(await response.arrayBuffer()), id);
      } catch {
        return null;
      }
    })
  );
  const loaded = parts.filter((part) => part !== null);
  if (loaded.length === 0) throw new Error('No city tiles arrived');
  return joinCity(loaded);
}
