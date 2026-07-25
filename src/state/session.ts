import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SessionState = {
  isAuthenticated: boolean;
  userId: string | null;
  isAnonymous: boolean;
  email: string | null;
  hasCompletedOnboarding: boolean;
  hasLoggedFirstSlice: boolean;
  hasSeenAccountPrompt: boolean;
  cloudUnavailableReason: string | null;
  setSession: (userId: string, isAnonymous: boolean, email: string | null) => void;
  setCloudUnavailable: (reason: string) => void;
  completeOnboarding: () => void;
  markFirstSlice: () => void;
  markAccountPromptSeen: () => void;
  clearSession: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      userId: null,
      isAnonymous: true,
      email: null,
      hasCompletedOnboarding: false,
      hasLoggedFirstSlice: false,
      hasSeenAccountPrompt: false,
      cloudUnavailableReason: null,
      setSession: (userId, isAnonymous, email) =>
        set({ isAuthenticated: true, userId, isAnonymous, email, cloudUnavailableReason: null }),
      setCloudUnavailable: (reason) => set({ cloudUnavailableReason: reason }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      markFirstSlice: () => set({ hasLoggedFirstSlice: true }),
      markAccountPromptSeen: () => set({ hasSeenAccountPrompt: true }),
      clearSession: () =>
        set({
          isAuthenticated: false,
          userId: null,
          isAnonymous: true,
          email: null,
          hasCompletedOnboarding: false,
          hasLoggedFirstSlice: false,
          hasSeenAccountPrompt: false,
        }),
    }),
    {
      name: '@gula/session',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
