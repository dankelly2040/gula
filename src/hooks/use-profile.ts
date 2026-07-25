import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProfile, saveProfile, getAchievements, enqueueSyncOp } from '../db/local-store';
import { syncWithCloud } from '../db/sync';
import type { UserProfile } from '../db/types';
import { useSessionStore } from '../state/session';

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  });
}

export function useAchievements() {
  return useQuery({
    queryKey: ['achievements'],
    queryFn: getAchievements,
  });
}

export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      await saveProfile(profile);
      await enqueueSyncOp({ kind: 'upsert-profile' });
      void syncWithCloud();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });
}

export function useEnsureProfile() {
  const { data: profile } = useProfile();
  const { mutate: save } = useSaveProfile();
  const userId = useSessionStore((s) => s.userId);

  const ensureProfile = (): UserProfile => {
    if (profile) return profile;
    const newProfile: UserProfile = {
      id: userId ?? 'local',
      displayName: null,
      avatarUrl: null,
      favoriteStyle: null,
      homeCity: null,
      totalPoints: 0,
      totalLogs: 0,
      currentStreak: 0,
      shareWithCommunity: false,
    };
    save(newProfile);
    return newProfile;
  };

  return { profile, ensureProfile };
}
