import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import {
  activeDayKeys,
  activeDaysInMonth,
  computeDayStreak,
  computeWeeklyStreak,
  dayKey,
} from '../features/gamification';
import type { PizzaLog } from '../db/types';
import { colors, spacing, fontSize, radii, sticker } from '../constants/theme';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

type Cell = {
  date: Date;
  key: string;
  inMonth: boolean;
  active: boolean;
  isToday: boolean;
};

/**
 * Peloton-style activity calendar: a month grid where every day the user
 * logged a pizza is filled in, consecutive days join into a single run, and
 * the streak counters sit underneath.
 */
export function ActiveDaysCalendar({ logs }: { logs: PizzaLog[] }) {
  const today = useMemo(() => new Date(), []);
  const [offset, setOffset] = useState(0); // months back from the current one

  const viewed = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() - offset, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  }, [today, offset]);

  const active = useMemo(() => activeDayKeys(logs), [logs]);

  const weeks = useMemo(
    () => buildWeeks(viewed.year, viewed.month, active, today),
    [viewed, active, today]
  );

  const monthActive = activeDaysInMonth(logs, viewed.year, viewed.month);
  const prev = new Date(viewed.year, viewed.month - 1, 1);
  const prevActive = activeDaysInMonth(logs, prev.getFullYear(), prev.getMonth());
  const delta = monthActive - prevActive;

  const dayStreak = useMemo(() => computeDayStreak(logs), [logs]);
  const weekStreak = useMemo(() => computeWeeklyStreak(logs), [logs]);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Active days</Text>

      <View style={styles.monthRow}>
        <Pressable onPress={() => setOffset((o) => o + 1)} hitSlop={10}>
          <SymbolView name="chevron.left" size={16} tintColor={colors.textSecondary} />
        </Pressable>
        <Text style={styles.monthLabel}>
          {MONTHS[viewed.month]} {viewed.year}
        </Text>
        <Pressable
          onPress={() => setOffset((o) => Math.max(0, o - 1))}
          hitSlop={10}
          disabled={offset === 0}
        >
          <SymbolView
            name="chevron.right"
            size={16}
            tintColor={offset === 0 ? colors.border : colors.textSecondary}
          />
        </Pressable>
      </View>

      <View style={styles.headerRow}>
        <View style={styles.daysWrap}>
          <View style={styles.daysRow}>
            {WEEKDAYS.map((d) => (
              <View key={d} style={styles.cell}>
                <Text style={styles.weekdayLabel}>{d}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.checkColumn} />
      </View>

      {weeks.map((week, i) => (
        <WeekRow key={i} cells={week} />
      ))}

      <View style={styles.statsRow}>
        <Stat value={monthActive} label="Active days" />
        <Stat value={dayStreak} label="Day streak" />
        <Stat value={weekStreak} label="Week streak" />
      </View>

      <View style={styles.deltaRow}>
        <SymbolView
          name={delta > 0 ? 'arrow.up' : delta < 0 ? 'arrow.down' : 'equal'}
          size={12}
          tintColor={colors.textSecondary}
        />
        <Text style={styles.deltaText}>{describeDelta(delta)}</Text>
      </View>
    </View>
  );
}

function WeekRow({ cells }: { cells: Cell[] }) {
  // Consecutive active days read as one continuous run, so a good week looks
  // like a bar rather than a scatter of dots.
  const runs = useMemo(() => findRuns(cells), [cells]);
  const weekComplete = cells.some((c) => c.active);

  return (
    <View style={styles.weekRow}>
      <View style={styles.daysWrap}>
        {runs.map((run) => (
          <View
            key={run.start}
            style={[
              styles.runBar,
              {
                left: `${(run.start / 7) * 100}%`,
                width: `${((run.end - run.start + 1) / 7) * 100}%`,
              },
            ]}
          />
        ))}
        <View style={styles.daysRow}>
          {cells.map((cell) => (
            <View key={cell.key} style={styles.cell}>
              <View
                style={[
                  styles.dayCircle,
                  cell.active && styles.dayCircleActive,
                  cell.isToday && !cell.active && styles.dayCircleToday,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    !cell.inMonth && styles.dayTextOutside,
                    cell.active && styles.dayTextActive,
                  ]}
                >
                  {cell.date.getDate()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.checkColumn}>
        {/* An empty week gets the well, not a muted tick: a greyed checkmark
            still reads as "done" at a glance. */}
        <View
          style={[styles.weekCheck, weekComplete && styles.weekCheckDone]}
          accessible
          accessibilityLabel={weekComplete ? 'Active week' : 'No pizza this week'}
        >
          {weekComplete ? (
            <SymbolView name="checkmark" size={13} tintColor={colors.surface} />
          ) : null}
        </View>
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────

function buildWeeks(
  year: number,
  month: number,
  active: Set<string>,
  today: Date
): Cell[][] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const todayKey = dayKey(today);

  const cells: Cell[] = [];
  for (let i = 0; i < totalCells; i += 1) {
    const date = new Date(year, month, 1 - startOffset + i);
    const key = dayKey(date);
    const inMonth = date.getMonth() === month;
    cells.push({
      date,
      key,
      inMonth,
      // Leading and trailing days belong to the neighbouring month, so they
      // never count as active here. Marking them at the source keeps the day
      // fills, the run bars and the week ticks agreeing with the "Active
      // days" total, which is already scoped to this month.
      active: inMonth && active.has(key),
      isToday: key === todayKey,
    });
  }

  const weeks: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function findRuns(cells: Cell[]): { start: number; end: number }[] {
  const runs: { start: number; end: number }[] = [];
  let start: number | null = null;

  cells.forEach((cell, i) => {
    if (cell.active && start === null) start = i;
    if (!cell.active && start !== null) {
      // Single days get their own circle; only real runs need a joining bar.
      if (i - 1 > start) runs.push({ start, end: i - 1 });
      start = null;
    }
  });
  if (start !== null && cells.length - 1 > start) {
    runs.push({ start, end: cells.length - 1 });
  }
  return runs;
}

function describeDelta(delta: number): string {
  if (delta === 0) return 'Same as last month';
  const n = Math.abs(delta);
  const days = n === 1 ? 'day' : 'days';
  return delta > 0
    ? `${n} more active ${days} than last month`
    : `${n} fewer active ${days} than last month`;
}

const CELL_HEIGHT = 40;
const CIRCLE = 32;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    ...sticker.border,
    ...sticker.shadowSm,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  monthLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  daysWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  daysRow: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    height: CELL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textMuted,
  },
  // Sits behind the day circles to join a run of consecutive active days.
  runBar: {
    position: 'absolute',
    height: CIRCLE,
    backgroundColor: colors.brand,
    borderRadius: CIRCLE / 2,
  },
  dayCircle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: {
    backgroundColor: colors.brand,
  },
  dayCircleToday: {
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  dayText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  dayTextOutside: {
    color: colors.textMuted,
    opacity: 0.5,
  },
  dayTextActive: {
    color: colors.surface,
    fontWeight: '800',
  },
  checkColumn: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
  },
  weekCheckDone: {
    backgroundColor: colors.brand,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.brand,
  },
  statLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  deltaText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
