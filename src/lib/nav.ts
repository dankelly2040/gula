import { router } from 'expo-router';

/**
 * Back that never throws: screens reached by deep link or replace have no
 * history, and expo-router's back() errors there ("GO_BACK not handled").
 * Fall back to the tabs root instead.
 */
export function goBack(): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/(tabs)');
  }
}
