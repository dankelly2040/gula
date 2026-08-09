import { useQuery } from '@tanstack/react-query';
import {
  fetchAllTimeLeaderboard,
  fetchRangeLeaderboard,
  type LeaderboardEntry,
} from '../db/remote-store';

export type LeaderboardPeriod = 'month' | 'allTime';

/** Local month boundaries, matching the calendar's local-date keying. */
export function currentMonthRange(now = new Date()): { start: Date; end: Date } {
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

/**
 * Cloud-only ranking. Unlike the rest of the app there is no local fallback:
 * a leaderboard is meaningless without other people's data, so an offline
 * device shows the empty state rather than a board of one.
 */
export function useLeaderboard(period: LeaderboardPeriod) {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', period],
    queryFn: () => {
      if (period === 'allTime') return fetchAllTimeLeaderboard();
      const { start, end } = currentMonthRange();
      return fetchRangeLeaderboard(start, end);
    },
    staleTime: 60 * 1000,
    retry: 1,
  });
}
