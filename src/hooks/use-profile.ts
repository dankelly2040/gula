import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProfile, saveProfile } from '../db/local-store';
import type { UserProfile } from '../db/types';

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  });
}

export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveProfile,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });
}

export function useEnsureProfile() {
  const { data: profile } = useProfile();
  const { mutate: save } = useSaveProfile();

  const ensureProfile = (): UserProfile => {
    if (profile) return profile;
    const newProfile: UserProfile = {
      id: generateId(),
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

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
