import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { usePathname } from 'expo-router';
import * as Updates from 'expo-updates';
import { isBusyPath, shouldCheck, shouldRestart } from '../features/auto-update';

/**
 * Loads a downloaded update without waiting for a second cold start, and
 * looks for one when the app comes back into view (an app left in memory is
 * never cold started, so it would never look). The rules are in
 * `features/auto-update.ts`. Does nothing in development, where updates are
 * off.
 */
export function useAutoUpdate(splashDone: boolean): void {
  const { isUpdatePending } = Updates.useUpdates();
  const busy = isBusyPath(usePathname());

  // The app state listener outlives renders, so it reads the latest values
  // from here.
  const latest = useRef({ pending: isUpdatePending, splashDone, busy });
  useEffect(() => {
    latest.current = { pending: isUpdatePending, splashDone, busy };
  }, [isUpdatePending, splashDone, busy]);

  // Still on the launch splash when the download lands: restart now.
  useEffect(() => {
    if (!Updates.isEnabled) return;
    if (shouldRestart({ pending: isUpdatePending, splashDone, inBackground: false, busy })) {
      void Updates.reloadAsync().catch(() => {});
    }
  }, [isUpdatePending, splashDone, busy]);

  useEffect(() => {
    if (!Updates.isEnabled) return;
    // The launch itself has just checked.
    let lastCheck = Date.now();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        if (shouldRestart({ ...latest.current, inBackground: true })) {
          void Updates.reloadAsync().catch(() => {});
        }
        return;
      }
      if (state === 'active' && shouldCheck(Date.now(), lastCheck)) {
        lastCheck = Date.now();
        void Updates.checkForUpdateAsync()
          .then((result) => (result.isAvailable ? Updates.fetchUpdateAsync() : null))
          .catch(() => {
            // Offline or the server said no: the next return to the app tries again.
          });
      }
    });
    return () => sub.remove();
  }, []);
}
