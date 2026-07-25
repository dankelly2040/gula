import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSpots, saveSpot, enqueueSyncOp } from '../db/local-store';
import { findOrCreateRemoteSpot, searchRemoteSpots } from '../db/remote-store';
import { syncWithCloud } from '../db/sync';
import type { Spot } from '../db/types';
import { generateId } from '../lib/id';
import { useSessionStore } from '../state/session';

/** Search spots: cloud when available, merged with locally created spots. */
export function useSpotSearch(query: string) {
  return useQuery({
    queryKey: ['spot-search', query.trim().toLowerCase()],
    queryFn: async (): Promise<Spot[]> => {
      const q = query.trim().toLowerCase();
      const local = (await getSpots()).filter((s) => s.name.toLowerCase().includes(q));
      if (!q) return local.slice(0, 15);
      let remote: Spot[] = [];
      try {
        remote = await searchRemoteSpots(q);
      } catch {
        // Cloud unavailable — local results only.
      }
      const seen = new Set(remote.map((s) => s.name.trim().toLowerCase()));
      return [...remote, ...local.filter((s) => !seen.has(s.name.trim().toLowerCase()))].slice(0, 15);
    },
    enabled: query.trim().length > 0,
  });
}

/**
 * Create (or dedupe onto) a spot. Cloud-first so community aggregation works;
 * falls back to a local record that syncs later.
 */
export function useCreateSpot() {
  const qc = useQueryClient();
  const userId = useSessionStore((s) => s.userId);
  return useMutation({
    mutationFn: async (input: Omit<Spot, 'id'>): Promise<Spot> => {
      try {
        if (userId) {
          const spot = await findOrCreateRemoteSpot(input, userId);
          await saveSpot(spot);
          return spot;
        }
      } catch {
        // fall through to local creation
      }
      const spot: Spot = { id: generateId(), ...input };
      await saveSpot(spot);
      await enqueueSyncOp({ kind: 'upsert-spot', id: spot.id });
      void syncWithCloud();
      return spot;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spot-search'] }),
  });
}
