import type { Achievement, AchievementType, PizzaLog } from '../db/types';
import { generateId } from '../lib/id';

export const BASE_LOG_POINTS = 10;
export const FIRST_LOG_BONUS = 40;
export const MILESTONE_BONUS = 25;
export const MILESTONES = [5, 10, 25, 50, 100];
// Consistency and variety bonuses: small enough that they nudge behaviour
// without letting a single log dwarf the base award.
export const NEW_SPOT_BONUS = 5;
export const NEW_STYLE_BONUS = 5;
export const COMPLETE_RATING_BONUS = 5;
export const STREAK_BONUS = 5;

/** One itemized line on the reward screen, so points never feel arbitrary. */
export type PointsLine = { label: string; points: number };

export type LogRewards = {
  points: number;
  breakdown: PointsLine[];
  newAchievements: Achievement[];
  isFirstLog: boolean;
};

/**
 * Points and achievements for a log about to be saved (brief §12).
 * `existingLogs` is the state BEFORE this log; `newLog` is the one being saved.
 *
 * Beyond the base award, points favour consistency (keeping a day streak
 * alive) and variety (new spots, new styles, a fully filled-in rating) over
 * raw volume, so the leaderboard rewards habit rather than bulk logging.
 */
export function computeLogRewards(
  existingLogs: PizzaLog[],
  newLog: PizzaLog,
  existingAchievements: Achievement[],
  userId: string
): LogRewards {
  const count = existingLogs.length + 1;
  const isFirstLog = count === 1;
  const breakdown: PointsLine[] = [{ label: 'Pizza logged', points: BASE_LOG_POINTS }];

  if (isFirstLog) breakdown.push({ label: 'First slice', points: FIRST_LOG_BONUS });
  if (MILESTONES.includes(count)) {
    breakdown.push({ label: `${count} pizzas logged`, points: MILESTONE_BONUS });
  }
  if (isNewSpot(existingLogs, newLog)) {
    breakdown.push({ label: 'New spot', points: NEW_SPOT_BONUS });
  }
  if (isNewStyle(existingLogs, newLog)) {
    breakdown.push({ label: 'New style', points: NEW_STYLE_BONUS });
  }
  if (isCompleteRating(newLog)) {
    breakdown.push({ label: 'Full rating', points: COMPLETE_RATING_BONUS });
  }
  // Only the log that opens a new active day can extend the streak, so a
  // second pizza on the same day never double-counts.
  if (opensNewActiveDay(existingLogs, newLog) && computeDayStreak([...existingLogs, newLog]) >= 2) {
    breakdown.push({ label: 'Streak kept alive', points: STREAK_BONUS });
  }

  const points = breakdown.reduce((sum, line) => sum + line.points, 0);

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
    breakdown,
    isFirstLog,
    newAchievements: unlocked.map((type) => ({ id: generateId(), userId, type, earnedAt: now })),
  };
}

// ── Bonus predicates ────────────────────────────────────────────────────────

/** A spot counts as new when neither its id nor its name has been logged before. */
function isNewSpot(existingLogs: PizzaLog[], newLog: PizzaLog): boolean {
  const key = spotKey(newLog);
  if (key === null) return false;
  return !existingLogs.some((l) => spotKey(l) === key);
}

function spotKey(log: PizzaLog): string | null {
  if (log.spotId) return `id:${log.spotId}`;
  const name = log.spotName?.trim().toLowerCase();
  return name ? `name:${name}` : null;
}

function isNewStyle(existingLogs: PizzaLog[], newLog: PizzaLog): boolean {
  const style = newLog.tags.style;
  if (style === null) return false;
  return !existingLogs.some((l) => l.tags.style === style);
}

/** Every sub-score filled in, which is what makes a log useful to others. */
function isCompleteRating(log: PizzaLog): boolean {
  return Object.values(log.subScores).every((v) => v !== null);
}

function opensNewActiveDay(existingLogs: PizzaLog[], newLog: PizzaLog): boolean {
  const key = dayKey(new Date(newLog.timestamp));
  return !existingLogs.some((l) => dayKey(new Date(l.timestamp)) === key);
}

// ── Active days and streaks ─────────────────────────────────────────────────

/**
 * Local-time `YYYY-MM-DD` key. Deliberately local rather than UTC so a late
 * dinner shows up on the calendar day the user actually ate it.
 */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Set of local day keys on which at least one pizza was logged. */
export function activeDayKeys(logs: PizzaLog[]): Set<string> {
  return new Set(logs.map((l) => dayKey(new Date(l.timestamp))));
}

/**
 * Consecutive calendar days ending today, or yesterday. The one-day grace
 * mirrors `computeWeeklyStreak`: a streak is only broken once a full day has
 * passed without a log, so it doesn't collapse before today is over.
 */
export function computeDayStreak(logs: PizzaLog[]): number {
  if (logs.length === 0) return 0;
  const days = activeDayKeys(logs);

  let cursor = new Date();
  if (!days.has(dayKey(cursor))) cursor = addDays(cursor, -1);

  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Active-day count for a given month (`month` is 0-indexed, like `Date`). */
export function activeDaysInMonth(logs: PizzaLog[], year: number, month: number): number {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  let count = 0;
  for (const key of activeDayKeys(logs)) {
    if (key.startsWith(prefix)) count += 1;
  }
  return count;
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
