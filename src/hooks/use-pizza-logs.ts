import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getLogs,
  saveLog,
  updateLog,
  deleteLog,
  getProfile,
  saveProfile,
  getSpots,
  getAchievements,
  saveAchievements,
  enqueueSyncOp,
  loadKingdomCatalog,
} from '../db/local-store';
import { syncWithCloud } from '../db/sync';
import type { PizzaLog, UserProfile } from '../db/types';
import { computeLogRewards, computeWeeklyStreak, type LogRewards } from '../features/gamification';
import { assignLogKingdom } from '../features/kingdoms';
import { useSessionStore } from '../state/session';

export function usePizzaLogs() {
  return useQuery({
    queryKey: ['pizza-logs'],
    queryFn: getLogs,
  });
}

export function useRankedLogs(sortBy: 'moneyShot' | 'pizzaScore' | 'date' = 'moneyShot') {
  const { data: logs, ...rest } = usePizzaLogs();

  const sorted = logs
    ? [...logs].sort((a, b) => {
        if (sortBy === 'date') {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        }
        if (sortBy === 'pizzaScore') {
          return (b.pizzaScore ?? -1) - (a.pizzaScore ?? -1);
        }
        return b.moneyShot - a.moneyShot;
      })
    : [];

  return { data: sorted, ...rest };
}

/**
 * Saves a log, awards points and achievements, updates profile aggregates,
 * and mirrors everything to Supabase in the background. Returns the rewards
 * so the Saved / reward screens can show real numbers.
 */
export function useSaveLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (log: PizzaLog): Promise<LogRewards> => {
      const session = useSessionStore.getState();
      const userId = session.userId ?? log.userId;

      const [existingLogs, existingAchievements, spots, catalog] = await Promise.all([
        getLogs(),
        getAchievements(),
        getSpots(),
        loadKingdomCatalog(),
      ]);
      // Place the log before scoring so the kingdom bonuses see the kingdom
      // they are about to credit. Sync later confirms the id with the server.
      const placed = assignLogKingdom({ ...log, userId }, spots, catalog);
      const rewards = computeLogRewards(existingLogs, placed, existingAchievements, userId, catalog);
      const finalLog: PizzaLog = { ...placed, pointsEarned: rewards.points };

      await saveLog(finalLog);
      await enqueueSyncOp({ kind: 'upsert-log', id: finalLog.id });

      if (rewards.newAchievements.length > 0) {
        await saveAchievements([...existingAchievements, ...rewards.newAchievements]);
        for (const a of rewards.newAchievements) {
          await enqueueSyncOp({ kind: 'upsert-achievement', id: a.id });
        }
      }

      const allLogs = [finalLog, ...existingLogs];
      const profile = (await getProfile()) ?? emptyProfile(userId);
      const updatedProfile: UserProfile = {
        ...profile,
        id: userId,
        totalPoints: profile.totalPoints + rewards.points,
        totalLogs: allLogs.length,
        currentStreak: computeWeeklyStreak(allLogs),
      };
      await saveProfile(updatedProfile);
      await enqueueSyncOp({ kind: 'upsert-profile' });

      if (rewards.isFirstLog) session.markFirstSlice();
      void syncWithCloud();
      return rewards;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pizza-logs'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['achievements'] });
      invalidateKingdomQueries(qc);
    },
  });
}

export function useUpdateLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (log: PizzaLog) => {
      const [spots, catalog] = await Promise.all([getSpots(), loadKingdomCatalog()]);
      // Points stay as awarded at create time. Moving a log reassigns which
      // kingdom receives that existing total; it does not pay the bonus again.
      const updated = assignLogKingdom({ ...log, updatedAt: new Date().toISOString() }, spots, catalog);
      await updateLog(updated);
      await enqueueSyncOp({ kind: 'upsert-log', id: updated.id });
      void syncWithCloud();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pizza-logs'] });
      invalidateKingdomQueries(qc);
    },
  });
}

export function useDeleteLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteLog(id);
      await enqueueSyncOp({ kind: 'delete-log', id });
      void syncWithCloud();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pizza-logs'] });
      invalidateKingdomQueries(qc);
    },
  });
}

function invalidateKingdomQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['kingdoms-near'] });
  qc.invalidateQueries({ queryKey: ['kingdom-leaderboard'] });
  qc.invalidateQueries({ queryKey: ['kingdom-crown'] });
  qc.invalidateQueries({ queryKey: ['my-kingdom-scores'] });
}

function emptyProfile(userId: string): UserProfile {
  return {
    id: userId,
    displayName: null,
    avatarUrl: null,
    favoriteStyle: null,
    homeCity: null,
    totalPoints: 0,
    totalLogs: 0,
    currentStreak: 0,
    shareWithCommunity: false,
  };
}
