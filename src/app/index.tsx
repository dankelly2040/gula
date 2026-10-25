import { Redirect } from 'expo-router';
import { useSessionStore } from '../state/session';

// Entry redirect. The root URL has no screen of its own: both route groups
// are gated by Stack.Protected, so a bare "/" would otherwise fall through
// to +not-found on first launch. Send the user to whichever group the
// persisted session store says is open.
export default function Index() {
  const hasCompletedOnboarding = useSessionStore((s) => s.hasCompletedOnboarding);
  return <Redirect href={hasCompletedOnboarding ? '/(tabs)' : '/(onboarding)/welcome'} />;
}
