import { supabase } from './supabase';
import { useSessionStore } from '../state/session';

/**
 * Silent anonymous session on first launch (brief §5 onboarding).
 * If the backend is unreachable or anonymous sign-ins are disabled, the app
 * keeps working local-only; we retry on the next launch.
 */
export async function bootstrapSession(): Promise<void> {
  const store = useSessionStore.getState();
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const user = data.session.user;
      store.setSession(user.id, user.is_anonymous ?? false, user.email ?? null);
      return;
    }
    const { data: anon, error } = await supabase.auth.signInAnonymously();
    if (error || !anon.user) {
      store.setCloudUnavailable(error?.message ?? 'no user');
      return;
    }
    store.setSession(anon.user.id, true, null);
  } catch (e) {
    store.setCloudUnavailable(e instanceof Error ? e.message : 'network error');
  }
}

/**
 * Upgrade the anonymous user to a permanent email account (brief §5 step 5).
 * Supabase sends a confirmation email; the session stays valid meanwhile.
 */
export async function upgradeToEmail(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.updateUser({ email });
  return { error: error?.message ?? null };
}

/** Returning-user sign in with a one-time email code. */
export async function requestEmailCode(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithOtp({ email });
  return { error: error?.message ?? null };
}

export async function verifyEmailCode(
  email: string,
  code: string,
  type: 'email' | 'email_change' = 'email'
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type });
  if (error) return { error: error.message };
  const user = data.user;
  if (user) {
    useSessionStore.getState().setSession(user.id, user.is_anonymous ?? false, user.email ?? null);
  }
  return { error: null };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  useSessionStore.getState().clearSession();
}
