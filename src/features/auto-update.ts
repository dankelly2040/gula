// When to load a downloaded update, as plain decisions with no device access,
// so they can be tested. The device side is `hooks/use-auto-update.ts`.
//
// expo-updates downloads a new update while the app runs its old code and
// only runs it at the next cold start. In November 2026 that left a fix
// sitting unused on a phone through two launches. These rules load it sooner
// without taking a screen away from someone who is using it.

export type UpdateMoment = {
  /** An update is downloaded and ready. */
  pending: boolean;
  /** The launch splash has handed off to the app. */
  splashDone: boolean;
  /** The app is out of sight. */
  inBackground: boolean;
  /** The user is part way through something a restart would lose. */
  busy: boolean;
};

/**
 * Restart into the update when nobody loses anything: while the launch splash
 * is still up, or when the app has gone out of sight outside the logging flow.
 */
export function shouldRestart(moment: UpdateMoment): boolean {
  if (!moment.pending) return false;
  if (!moment.splashDone) return true;
  return moment.inBackground && !moment.busy;
}

/** Screens that hold work in memory only: a restart there loses the draft. */
const BUSY_ROUTES = ['/log', '/reward', '/name', '/sign-in'];

export function isBusyPath(pathname: string): boolean {
  return BUSY_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/** At most one check a minute when the app comes back into view. */
export const CHECK_GAP_MS = 60_000;

export function shouldCheck(now: number, lastCheck: number, gap: number = CHECK_GAP_MS): boolean {
  return now - lastCheck >= gap;
}
