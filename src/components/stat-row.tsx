import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type TextStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, fontSize, radii, spacing, sticker } from '../constants/theme';

// A row of core stats, Opal-style: icon well, big number, small uppercase
// label. The cards land one after another on every visit to the screen, each
// counting up with its own tap, so arriving feels like stickers being pressed
// down rather than a static readout.

const STAGGER_MS = 110;
const COUNT_MS = 750;

export type Stat = {
  icon: string;
  /** Defaults to ink. Ember is reserved for things you can tap. */
  iconColor?: string;
  value: number;
  valueColor?: string;
  label: string;
};

function tap() {
  // Simulators have no Taptic Engine, so this is only felt on a device.
  if (process.env.EXPO_OS === 'ios') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

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

function StatCard({ stat, index, runId }: { stat: Stat; index: number; runId: number }) {
  const enter = useSharedValue(0);
  const delay = index * STAGGER_MS;

  useEffect(() => {
    enter.value = 0;
    enter.value = withDelay(
      delay,
      withSpring(1, { damping: 13, stiffness: 180, mass: 0.7 }, (finished) => {
        if (finished) runOnJS(tap)();
      })
    );
  }, [delay, runId, enter]);

  const style = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { translateY: (1 - enter.value) * 18 },
      { scale: 0.9 + enter.value * 0.1 },
    ],
  }));

  return (
    <Animated.View
      style={[styles.card, style]}
      accessible
      accessibilityLabel={`${stat.value} ${stat.label}`}
    >
      <View style={styles.iconWell}>
        <SymbolView
          name={stat.icon as never}
          size={20}
          tintColor={stat.iconColor ?? colors.ink}
        />
      </View>
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
        <StatCard key={stat.label} stat={stat} index={i} runId={runId} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    paddingVertical: spacing.md,
    // Narrow sides on purpose: at spacing.md a third-width card leaves too
    // little room for a label like "Slices logged", which then breaks
    // mid-word.
    paddingHorizontal: spacing.xs,
    ...sticker.border,
    ...sticker.shadow,
  },
  iconWell: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.frame,
    ...sticker.border,
  },
  value: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textMuted,
    textAlign: 'center',
  },
});
