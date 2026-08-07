/// <reference types="bun" />
import { describe, expect, mock, test } from 'bun:test';
import type { PizzaLog } from '../db/types';

// generateId is the only non-pure dependency; stub it so the reward maths can
// run outside a native runtime.
mock.module('../lib/id', () => ({ generateId: () => 'test-id' }));

const {
  activeDayKeys,
  activeDaysInMonth,
  computeDayStreak,
  computeLogRewards,
  computeWeeklyStreak,
  dayKey,
} = await import('./gamification');

const emptySubScores = {
  crust: null, charBake: null, sauceCheese: null,
  toppings: null, vibes: null, service: null, value: null,
};

function makeLog(timestamp: string, extra: Partial<PizzaLog> = {}): PizzaLog {
  return {
    id: timestamp, userId: 'u', spotId: null, spotName: null, timestamp,
    photoUri: null, photoUrl: null, moneyShot: 50, pizzaScore: null,
    experienceScore: null, sendFriend: null,
    subScores: emptySubScores,
    tags: { style: null, format: null, toppings: [], priceTier: null, context: null },
    notes: '', pointsEarned: 0, lat: null, lng: null, isPublic: false,
    updatedAt: timestamp, ...extra,
  };
}

/** ISO timestamp `daysAgo` days before now, at a fixed local hour. */
function daysAgo(n: number, hour = 12): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

describe('computeDayStreak', () => {
  test('is zero with no logs', () => {
    expect(computeDayStreak([])).toBe(0);
  });

  test('counts consecutive days ending today', () => {
    expect(computeDayStreak([makeLog(daysAgo(0))])).toBe(1);
    expect(computeDayStreak([makeLog(daysAgo(0)), makeLog(daysAgo(1))])).toBe(2);
    expect(
      computeDayStreak([makeLog(daysAgo(0)), makeLog(daysAgo(1)), makeLog(daysAgo(2))])
    ).toBe(3);
  });

  test('stops at the first missed day', () => {
    expect(computeDayStreak([makeLog(daysAgo(0)), makeLog(daysAgo(2))])).toBe(1);
  });

  test('survives a day that is not over yet, but not two', () => {
    expect(computeDayStreak([makeLog(daysAgo(1))])).toBe(1);
    expect(computeDayStreak([makeLog(daysAgo(2))])).toBe(0);
  });

  test('counts a day once however many pizzas it holds', () => {
    expect(computeDayStreak([makeLog(daysAgo(0, 9)), makeLog(daysAgo(0, 20))])).toBe(1);
  });
});

describe('active days', () => {
  test('dedupes multiple logs on one day', () => {
    expect(activeDayKeys([makeLog(daysAgo(0, 9)), makeLog(daysAgo(0, 20))]).size).toBe(1);
  });

  test('counts only the requested month', () => {
    const now = new Date();
    const logs = [makeLog(daysAgo(0))];
    expect(activeDaysInMonth(logs, now.getFullYear(), now.getMonth())).toBe(1);
    expect(activeDaysInMonth(logs, now.getFullYear(), (now.getMonth() + 6) % 12)).toBe(0);
  });

  test('keys by local date so a late dinner stays on its own day', () => {
    const late = new Date();
    late.setHours(23, 30, 0, 0);
    const midday = new Date(late.getFullYear(), late.getMonth(), late.getDate());
    expect(dayKey(late)).toBe(dayKey(midday));
  });
});

describe('computeWeeklyStreak', () => {
  test('is zero with no logs', () => {
    expect(computeWeeklyStreak([])).toBe(0);
  });

  test('counts the current week', () => {
    expect(computeWeeklyStreak([makeLog(daysAgo(0))])).toBe(1);
  });
});

describe('computeLogRewards', () => {
  const previous = [makeLog(daysAgo(5))]; // far enough back to not extend a streak

  test('awards base points plus the first-slice bonus', () => {
    const rewards = computeLogRewards([], makeLog(daysAgo(0)), [], 'u');
    expect(rewards.points).toBe(50);
    expect(rewards.isFirstLog).toBe(true);
  });

  test('awards base points alone for an unremarkable log', () => {
    expect(computeLogRewards(previous, makeLog(daysAgo(0)), [], 'u').points).toBe(10);
  });

  test('rewards a spot the user has not logged before', () => {
    const rewards = computeLogRewards(previous, makeLog(daysAgo(0), { spotName: 'Joes' }), [], 'u');
    expect(rewards.points).toBe(15);
  });

  test('matches spots regardless of case and padding', () => {
    const seen = [makeLog(daysAgo(5), { spotName: 'Joes' })];
    const rewards = computeLogRewards(seen, makeLog(daysAgo(0), { spotName: ' joes ' }), [], 'u');
    expect(rewards.points).toBe(10);
  });

  test('rewards a new style and a fully filled-in rating', () => {
    const styled = makeLog(daysAgo(0), {
      tags: { style: 'Neapolitan', format: null, toppings: [], priceTier: null, context: null },
    });
    expect(computeLogRewards(previous, styled, [], 'u').points).toBe(15);

    const rated = makeLog(daysAgo(0), {
      subScores: { crust: 4, charBake: 4, sauceCheese: 4, toppings: 4, vibes: 4, service: 4, value: 4 },
    });
    expect(computeLogRewards(previous, rated, [], 'u').points).toBe(15);
  });

  test('rewards keeping a streak alive, once per day', () => {
    const yesterday = [makeLog(daysAgo(1))];
    expect(computeLogRewards(yesterday, makeLog(daysAgo(0)), [], 'u').points).toBe(15);

    // A second pizza the same day must not pay the streak bonus again.
    const alreadyLoggedToday = [makeLog(daysAgo(1)), makeLog(daysAgo(0, 9))];
    expect(computeLogRewards(alreadyLoggedToday, makeLog(daysAgo(0, 20)), [], 'u').points).toBe(10);
  });

  test('breakdown always sums to the awarded total', () => {
    const rewards = computeLogRewards(previous, makeLog(daysAgo(0), { spotName: 'Joes' }), [], 'u');
    const summed = rewards.breakdown.reduce((total, line) => total + line.points, 0);
    expect(summed).toBe(rewards.points);
  });
});
