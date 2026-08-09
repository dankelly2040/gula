import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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

// Three core stats, Opal-style: icon, big number, small uppercase label.
// The cards land one after another on every visit to the tab, each with its
// own tap, so opening My Pizza feels like three stickers being pressed down.

const STAGGER_MS = 110;
const COUNT_MS = 750;

function tap() {
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
function Counter({
  value,
  color,
  delay,
  runId,
}: {
  value: number;
  color: string;
  delay: number;
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

  return (
    <Text style={[styles.value, { color }]}>{display}</Text>
  );
}

function StatCard({
  icon,
  iconColor,
  value,
  valueColor,
  label,
  index,
  runId,
}: {
  icon: string;
  iconColor: string;
  value: number;
  valueColor: string;
  label: string;
  index: number;
  runId: number;
}) {
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
      accessibilityLabel={`${value} ${label}`}
    >
      <View style={styles.iconWell}>
        <SymbolView name={icon as never} size={20} tintColor={iconColor} />
      </View>
      <Counter value={value} color={valueColor} delay={delay} runId={runId} />
      <Text style={styles.label}>{label}</Text>
    </Animated.View>
  );
}

export function StatTrio({
  pizzas,
  points,
  streak,
  runId,
}: {
  pizzas: number;
  points: number;
  streak: number;
  runId: number;
}) {
  return (
    <View style={styles.row}>
      <StatCard
        icon="fork.knife"
        iconColor={colors.ink}
        value={pizzas}
        valueColor={colors.textPrimary}
        label={pizzas === 1 ? 'Pizza' : 'Pizzas'}
        index={0}
        runId={runId}
      />
      <StatCard
        icon="star.fill"
        iconColor={colors.gold}
        value={points}
        valueColor={colors.gold}
        label="Points"
        index={1}
        runId={runId}
      />
      <StatCard
        icon="flame.fill"
        // Ink, not ember: ember means "tap me", and a stat is not interactive.
        // That leaves gold as the row's only accent, reserved for points.
        iconColor={colors.ink}
        value={streak}
        valueColor={colors.textPrimary}
        label="Week streak"
        index={2}
        runId={runId}
      />
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
