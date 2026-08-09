import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Appearance, AppState, StyleSheet } from 'react-native';
import { Observe, ObserveRoot, useObserve } from 'expo-observe';
import { AnimatedSplash } from '../components/animated-splash';
import { colors } from '../constants/theme';

// Hold the native splash (plain butter yellow) until the animated splash
// overlay, which shares the same background, is ready to take over.
void SplashScreen.preventAutoHideAsync().catch(() => {});

// EAS Observe: startup metrics plus per-route navigation metrics.
// Must be configured at module scope, before any screen mounts.
Observe.configure({
  integrations: { 'expo-router': true },
});
import { bootstrapSession } from '../lib/auth';
import { syncWithCloud } from '../db/sync';
import { useSessionStore } from '../state/session';

const queryClient = new QueryClient();

// The 2L Daylight theme is light-only; force light so native surfaces
// (@expo/ui forms, alerts, sheets, liquid glass tabs) match.
Appearance.setColorScheme('light');

function RootLayout() {
  const hasCompletedOnboarding = useSessionStore((s) => s.hasCompletedOnboarding);
  const [hydrated, setHydrated] = useState(useSessionStore.persist.hasHydrated());
  const [splashDone, setSplashDone] = useState(false);
  const { markInteractive } = useObserve();

  useEffect(() => {
    if (hydrated) void SplashScreen.hideAsync().catch(() => {});
  }, [hydrated]);

  useEffect(() => {
    const unsub = useSessionStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    // Silent anonymous session + background sync (brief §5, §8).
    void bootstrapSession().then(() => {
      void syncWithCloud();
      queryClient.invalidateQueries();
    });
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncWithCloud();
    });
    return () => sub.remove();
  }, [hydrated]);

  if (!hydrated) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Protected guard={hasCompletedOnboarding}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="log"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen name="pizza/[id]" />
            <Stack.Screen name="spot/[id]" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="leaderboard" />
            <Stack.Screen
              name="reward"
              options={{
                presentation: 'transparentModal',
                animation: 'fade',
              }}
            />
          </Stack.Protected>
          <Stack.Protected guard={!hasCompletedOnboarding}>
            <Stack.Screen name="(onboarding)" />
          </Stack.Protected>
          <Stack.Screen
            name="sign-in"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
        </Stack>
        {!splashDone && (
          <AnimatedSplash
            onFinish={() => {
              setSplashDone(true);
              // TTI: the app is genuinely interactive once the splash hands off.
              markInteractive();
            }}
          />
        )}
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});

export default ObserveRoot.wrap(RootLayout);
