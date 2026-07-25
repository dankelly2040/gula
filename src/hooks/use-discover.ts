import { useQuery } from '@tanstack/react-query';
import { fetchNearbyPublicLogs, fetchNearbySpots } from '../db/remote-store';
import { getCurrentCoords, type Coords } from '../lib/location';
import { searchPizzaPlacesNearby, type PizzaPlace } from '../lib/pizza-places';
import type { PizzaLog, Spot } from '../db/types';

export function useCurrentLocation() {
  return useQuery({
    queryKey: ['current-location'],
    queryFn: getCurrentCoords,
    staleTime: 5 * 60 * 1000,
  });
}

export type DiscoverData = {
  logs: PizzaLog[];
  spots: Spot[];
};

/** Nearby public logs and spots to try (brief §5 Discover). Cloud-only data. */
export function useDiscover(coords: Coords | null | undefined) {
  return useQuery({
    queryKey: ['discover', coords?.lat, coords?.lng],
    queryFn: async (): Promise<DiscoverData> => {
      if (!coords) return { logs: [], spots: [] };
      const [logs, spots] = await Promise.all([
        fetchNearbyPublicLogs(coords.lat, coords.lng),
        fetchNearbySpots(coords.lat, coords.lng),
      ]);
      return { logs, spots };
    },
    enabled: coords != null,
  });
}

/**
 * Nearby pizza places from MapKit local search (display-only; never stored).
 * Fills Discover's cold start until the community spots graph grows.
 */
export function usePizzaPlaces(coords: Coords | null | undefined) {
  return useQuery({
    queryKey: ['pizza-places', coords?.lat, coords?.lng],
    queryFn: async (): Promise<PizzaPlace[]> => {
      if (!coords) return [];
      return searchPizzaPlacesNearby(coords.lat, coords.lng);
    },
    enabled: coords != null,
    staleTime: 5 * 60 * 1000,
  });
}
