/// <reference types="bun" />
import { describe, expect, mock, test } from 'bun:test';

// The hook pulls in the Supabase client transitively; the month-range maths
// under test needs none of it.
mock.module('../db/remote-store', () => ({
  fetchAllTimeLeaderboard: async () => [],
  fetchRangeLeaderboard: async () => [],
}));

const { currentMonthRange } = await import('./use-leaderboard');

describe('currentMonthRange', () => {
  test('spans the first of this month to the first of next', () => {
    const { start, end } = currentMonthRange(new Date(2026, 7, 15, 13, 30));
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(7);
    expect(start.getDate()).toBe(1);
    expect(end.getMonth()).toBe(8);
    expect(end.getDate()).toBe(1);
  });

  test('rolls over the year in December', () => {
    const { start, end } = currentMonthRange(new Date(2026, 11, 31, 23, 59));
    expect(start.getMonth()).toBe(11);
    expect(end.getFullYear()).toBe(2027);
    expect(end.getMonth()).toBe(0);
  });

  test('starts at local midnight so it lines up with the calendar', () => {
    const { start } = currentMonthRange(new Date(2026, 7, 15, 13, 30));
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
  });

  test('a log on the last day of the month falls inside the range', () => {
    const { start, end } = currentMonthRange(new Date(2026, 7, 15));
    const lastMoment = new Date(2026, 7, 31, 23, 59, 59);
    expect(lastMoment >= start && lastMoment < end).toBe(true);
  });
});
