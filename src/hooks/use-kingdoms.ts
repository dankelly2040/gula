import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { loadKingdomCatalog } from '../db/local-store';
import {
  fetchKingdomCrown,
  fetchKingdomLeaderboard,
  fetchKingdomsNear,
  fetchMyKingdomScores,
  type KingdomCrown,
  type LeaderboardEntry,
} from '../db/remote-store';
import {
  KINGDOM_NEAR_RADIUS_KM,
  KINGDOM_WINDOW_DAYS,
  SEATTLE_KINGDOMS,
  kingdomScores,
  kingdomsNear,
  type KingdomScore,
} from '../features/kingdoms';
import { usePizzaLogs } from './use-pizza-logs';

export type { KingdomCrown, KingdomScore };

/**
 * This player's kingdom totals, derived from on-device logs, so a save updates
 * them before sync finishes. `useServerKingdomScores` reads the same shape
 * from Postgres, which includes logs synced from another device.
 */
export function useMyKingdomScores(windowDays = KINGDOM_WINDOW_DAYS) {
  const logsQuery = usePizzaLogs();
  const catalogQuery = useQuery({
    queryKey: ['kingdom-catalog'],
    queryFn: loadKingdomCatalog,
    staleTime: 5 * 60 * 1000,
  });
  const data = useMemo(
    () =>
      logsQuery.data
        ? kingdomScores(logsQuery.data, catalogQuery.data ?? SEATTLE_KINGDOMS, new Date(), windowDays)
        : undefined,
    [logsQuery.data, catalogQuery.data, windowDays]
  );
  return { ...logsQuery, data };
}

export function useServerKingdomScores(windowDays = KINGDOM_WINDOW_DAYS) {
  return useQuery<KingdomScore[]>({
    queryKey: ['my-kingdom-scores', windowDays],
    queryFn: () => fetchMyKingdomScores(windowDays),
    staleTime: 60 * 1000,
    retry: 1,
  });
}

/**
 * Kingdoms around a coordinate. The RPC is authoritative when the network is
 * up; the on-device catalog answers the same question offline.
 */
export function useKingdomsNear(
  lat: number | null,
  lng: number | null,
  radiusKm = KINGDOM_NEAR_RADIUS_KM
) {
  return useQuery({
    queryKey: ['kingdoms-near', lat, lng, radiusKm],
    enabled: lat != null && lng != null,
    staleTime: 60 * 1000,
    queryFn: async () => {
      try {
        return await fetchKingdomsNear(lat as number, lng as number, radiusKm);
      } catch {
        return kingdomsNear(lat as number, lng as number, radiusKm, await loadKingdomCatalog());
      }
    },
  });
}

/** Public, opt-in ranking for one kingdom. Cloud-only, same as the global board. */
export function useKingdomLeaderboard(kingdomId: string | null, windowDays = KINGDOM_WINDOW_DAYS) {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ['kingdom-leaderboard', kingdomId, windowDays],
    enabled: kingdomId != null,
    staleTime: 60 * 1000,
    retry: 1,
    queryFn: () => fetchKingdomLeaderboard(kingdomId as string, windowDays),
  });
}

/** Who holds the crown, or whether it is contested or vacant. Cloud-only. */
export function useKingdomCrown(kingdomId: string | null, windowDays = KINGDOM_WINDOW_DAYS) {
  return useQuery<KingdomCrown>({
    queryKey: ['kingdom-crown', kingdomId, windowDays],
    enabled: kingdomId != null,
    staleTime: 60 * 1000,
    retry: 1,
    queryFn: () => fetchKingdomCrown(kingdomId as string, windowDays),
  });
}
