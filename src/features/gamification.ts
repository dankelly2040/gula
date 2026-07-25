import type { Achievement, AchievementType, PizzaLog } from '../db/types';
import { generateId } from '../lib/id';

export const BASE_LOG_POINTS = 10;
export const FIRST_LOG_BONUS = 40;
export const MILESTONE_BONUS = 25;
export const MILESTONES = [5, 10, 25, 50, 100];

export type LogRewards = {
  points: number;
  newAchievements: Achievement[];
  isFirstLog: boolean;
};

/**
 * Points and achievements for a log about to be saved (brief §12).
 * `existingLogs` is the state BEFORE this log; `newLog` is the one being saved.
 */
export function computeLogRewards(
  existingLogs: PizzaLog[],
  newLog: PizzaLog,
  existingAchievements: Achievement[],
  userId: string
): LogRewards {
  const count = existingLogs.length + 1;
  let points = BASE_LOG_POINTS;
  const isFirstLog = count === 1;
  if (isFirstLog) points += FIRST_LOG_BONUS;
  if (MILESTONES.includes(count)) points += MILESTONE_BONUS;

  const earned = new Set(existingAchievements.map((a) => a.type));
  const unlocked: AchievementType[] = [];
  const maybeUnlock = (type: AchievementType, condition: boolean) => {
    if (condition && !earned.has(type)) unlocked.push(type);
  };

  maybeUnlock('first_log', count >= 1);
  maybeUnlock('five_logs', count >= 5);
  maybeUnlock('ten_logs', count >= 10);
  maybeUnlock('twenty_five_logs', count >= 25);
  maybeUnlock('fifty_logs', count >= 50);
  maybeUnlock('nirvana', newLog.moneyShot >= 85);

  const styles = new Set(
    [...existingLogs, newLog].map((l) => l.tags.style).filter((s): s is NonNullable<typeof s> => s !== null)
  );
  maybeUnlock('style_explorer', styles.size >= 3);

  const streak = computeWeeklyStreak([...existingLogs, newLog]);
  maybeUnlock('streak_3', streak >= 3);

  const now = new Date().toISOString();
  return {
    points,
    isFirstLog,
    newAchievements: unlocked.map((type) => ({ id: generateId(), userId, type, earnedAt: now })),
  };
}

/**
 * Weekly-open streak (brief §12): consecutive calendar weeks, ending in the
 * current week or the one before it, with at least one logged pizza.
 */
export function computeWeeklyStreak(logs: PizzaLog[]): number {
  if (logs.length === 0) return 0;
  const weeks = new Set(logs.map((l) => weekKey(new Date(l.timestamp))));

  let cursor = new Date();
  let streak = 0;
  // A streak survives if the current week has no log yet but last week did.
  if (!weeks.has(weekKey(cursor))) cursor = addDays(cursor, -7);

  while (weeks.has(weekKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

function weekKey(date: Date): string {
  // ISO week: Thursday of the same week determines year/week number.
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-${week}`;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}
