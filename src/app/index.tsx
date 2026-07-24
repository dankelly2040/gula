import { Redirect } from 'expo-router';
import { useSessionStore } from '../state/session';

export default function Index() {
  const hasCompletedOnboarding = useSessionStore((s) => s.hasCompletedOnboarding);

  if (!hasCompletedOnboarding) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  return <Redirect href="/(tabs)" />;
}
