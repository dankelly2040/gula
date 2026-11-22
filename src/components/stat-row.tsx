import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type TextStyle } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, spacing } from '../constants/theme';

// A row of core stats set straight on the page: a big figure with a small
// capital label under it, no card, no icon. The figures rise in one after
// another on every visit to the screen, each counting up from zero.

const STAGGER_MS = 110;
const COUNT_MS = 750;

export type Stat = {
  value: number;
  /** Defaults to ink. Gold is reserved for points. */
  valueColor?: string;
  label: string;
};

/**
 * Counts from zero to `value`. Reanimated drives the ramp on the UI thread;
 * a reaction pushes it back to React only when the rounded integer changes,
 * which caps the re-renders at one per frame rather than one per tick.
 *
 * The AnimatedTextInput `text` prop trick does not apply on the New
 * Architecture, so the number is a plain Text.
 */
export function CountUp({
  value,
  style,
  delay = 0,
  runId,
}: {
  value: number;
  style?: TextStyle | TextStyle[];
  delay?: number;
  runId: number;
}) {
  const shown = useSharedValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    shown.value = 0;
    setDisplay(0);
    shown.value = withDelay(
      delay + 130,
      withTiming(value, { duration: COUNT_MS, easing: Easing.out(Easing.cubic) })
    );
  }, [value, delay, runId, shown]);

  useAnimatedReaction(
    () => Math.round(shown.value),
    (current, previous) => {
      if (current !== previous) runOnJS(setDisplay)(current);
    },
    [value, runId]
  );

  return <Text style={style}>{display}</Text>;
}

function StatFigure({ stat, index, runId }: { stat: Stat; index: number; runId: number }) {
  const enter = useSharedValue(0);
  const delay = index * STAGGER_MS;

  useEffect(() => {
    enter.value = 0;
    enter.value = withDelay(
      delay,
      withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) })
    );
  }, [delay, runId, enter]);

  const style = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 10 }],
  }));

  return (
    <Animated.View
      style={[styles.figure, style]}
      accessible
      accessibilityLabel={`${stat.value} ${stat.label}`}
    >
      <CountUp
        value={stat.value}
        style={[styles.value, { color: stat.valueColor ?? colors.textPrimary }]}
        delay={delay}
        runId={runId}
      />
      <Text style={styles.label}>{stat.label}</Text>
    </Animated.View>
  );
}

export function StatRow({ stats, runId }: { stats: Stat[]; runId: number }) {
  return (
    <View style={styles.row}>
      {stats.map((stat, i) => (
        <StatFigure key={stat.label} stat={stat} index={i} runId={runId} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  // Equal columns, with each figure centered over its label. Equal widths
  // also mean a figure counting up never pushes its neighbors around.
  figure: {
    flex: 1,
    flexBasis: 0,
    alignItems: 'center',
  },
  value: {
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 42,
    textAlign: 'center',
  },
  label: {
    fontFamily: fonts.label,
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
