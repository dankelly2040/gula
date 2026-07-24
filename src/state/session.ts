import { create } from 'zustand';
import type { UserProfile } from '../db/types';

type SessionState = {
  isAuthenticated: boolean;
  userId: string | null;
  isAnonymous: boolean;
  hasCompletedOnboarding: boolean;
  profile: UserProfile | null;
  setSession: (userId: string, isAnonymous: boolean) => void;
  setProfile: (profile: UserProfile) => void;
  completeOnboarding: () => void;
  clearSession: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  isAuthenticated: false,
  userId: null,
  isAnonymous: true,
  hasCompletedOnboarding: false,
  profile: null,
  setSession: (userId, isAnonymous) =>
    set({ isAuthenticated: true, userId, isAnonymous }),
  setProfile: (profile) => set({ profile }),
  completeOnboarding: () => set({ hasCompletedOnboarding: true }),
  clearSession: () =>
    set({
      isAuthenticated: false,
      userId: null,
      isAnonymous: true,
      hasCompletedOnboarding: false,
      profile: null,
    }),
}));
