import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { tilesFor } from '../features/city';
import type { Bounds } from '../features/grid';
import { loadCity } from '../lib/city-tiles';

/**
 * The real city inside a box: water, streets and place names. Loaded once
 * per set of tiles and kept for the session. It is undefined until the first
 * city has loaded and when it cannot be loaded, and the map then draws
 * without it.
 */
export function useCity(bounds: Bounds) {
  const tiles = tilesFor(bounds)
    .map((t) => `${t.x}/${t.y}`)
    .join(' ');
  return useQuery({
    queryKey: ['city', tiles],
    queryFn: () => loadCity(bounds),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    // While the user drags to the next part of the world, the part already
    // drawn stays on screen until the new tiles arrive.
    placeholderData: keepPreviousData,
  });
}
