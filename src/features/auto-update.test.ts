import { describe, expect, test } from 'bun:test';
import { CHECK_GAP_MS, isBusyPath, shouldCheck, shouldRestart } from './auto-update';

const base = { pending: true, splashDone: true, inBackground: false, busy: false };

describe('shouldRestart', () => {
  test('never without a downloaded update', () => {
    expect(shouldRestart({ ...base, pending: false, splashDone: false })).toBe(false);
    expect(shouldRestart({ ...base, pending: false, inBackground: true })).toBe(false);
  });

  test('at once while the launch splash is still up', () => {
    expect(shouldRestart({ ...base, splashDone: false })).toBe(true);
    expect(shouldRestart({ ...base, splashDone: false, busy: true })).toBe(true);
  });

  test('not while the app is in use', () => {
    expect(shouldRestart(base)).toBe(false);
  });

  test('when the app goes out of sight', () => {
    expect(shouldRestart({ ...base, inBackground: true })).toBe(true);
  });

  test('not out of sight in the middle of a log', () => {
    expect(shouldRestart({ ...base, inBackground: true, busy: true })).toBe(false);
  });
});

describe('isBusyPath', () => {
  test('the logging flow, the reward, the name step and sign in are busy', () => {
    for (const path of ['/log/capture', '/log/rate', '/log/details', '/reward', '/name', '/sign-in']) {
      expect(isBusyPath(path)).toBe(true);
    }
  });

  test('tabs and pages are not', () => {
    for (const path of ['/', '/realm', '/leaderboard', '/profile', '/pizza/abc', '/settings', '/login']) {
      expect(isBusyPath(path)).toBe(false);
    }
  });
});

describe('shouldCheck', () => {
  test('waits for the gap', () => {
    expect(shouldCheck(1000 + CHECK_GAP_MS - 1, 1000)).toBe(false);
    expect(shouldCheck(1000 + CHECK_GAP_MS, 1000)).toBe(true);
  });
});
