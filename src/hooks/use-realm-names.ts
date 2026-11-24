import { useQuery } from '@tanstack/react-query';
import type { Bounds } from '../features/grid';
import { SEATTLE, districtNameFor, type Kingdom } from '../features/realm';
import { areaNameAt, cityNameAt, getCoordsIfAllowed } from '../lib/location';

// Names for the Realm. The grid has no names of its own, so they come from
// the Seattle districts where a kingdom lies on one, and from the phone's
// geocoder everywhere else. A name is looked up once per session, because
// the geocoder limits how often it can be asked.

const kingdomNameQuery = (kingdom: Kingdom) => ({
  queryKey: ['kingdom-name', kingdom.id],
  queryFn: async (): Promise<string | null> =>
    districtNameFor(kingdom) ?? (await areaNameAt(kingdom.center[0], kingdom.center[1])),
  staleTime: Infinity,
  gcTime: Infinity,
});

/** "47.61° N, 122.33° W": what a kingdom is called when nothing has a name for it. */
export function coordinateName([lat, lng]: [number, number]): string {
  const part = (value: number, positive: string, negative: string) =>
    `${Math.abs(value).toFixed(2)}° ${value >= 0 ? positive : negative}`;
  return `${part(lat, 'N', 'S')}, ${part(lng, 'E', 'W')}`;
}

/**
 * The name of one kingdom. Undefined while the geocoder is still answering,
 * null when nothing has a name for it.
 */
export function useKingdomName(kingdom: Kingdom): string | null | undefined {
  return useQuery(kingdomNameQuery(kingdom)).data;
}

/** The city the map is showing, from the middle of its region. */
export function useCityName(region: Bounds): string | null {
  const lat = (region.minLat + region.maxLat) / 2;
  const lng = (region.minLng + region.maxLng) / 2;
  const { data } = useQuery({
    queryKey: ['city-name', lat.toFixed(2), lng.toFixed(2)],
    queryFn: async () => (region === SEATTLE ? 'Seattle' : await cityNameAt(lat, lng)),
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return data ?? null;
}

export const MY_COORDS_KEY = ['my-coords'];

/**
 * Where the phone is, for the "you are here" mark. It only answers when the
 * user has already allowed location, and never asks.
 */
export function useMyCoords() {
  return useQuery({
    queryKey: MY_COORDS_KEY,
    queryFn: getCoordsIfAllowed,
    staleTime: 60 * 1000,
  });
}
