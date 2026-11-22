import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { ACHIEVEMENT_DEFS, type AchievementType } from '../db/types';
import { useSessionStore } from '../state/session';
import { FadeUp } from '../components/fade-up';
import { PizzaConfetti } from '../components/pizza-confetti';
import { CountUp } from '../components/stat-row';
import { PillButton } from '../components/sticker';
import { colors, spacing, fontSize, radii, sticker } from '../constants/theme';

export default function Reward() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    points?: string;
    first?: string;
    achievements?: string;
    breakdown?: string;
  }>();
  const isAnonymous = useSessionStore((s) => s.isAnonymous);
  const markAccountPromptSeen = useSessionStore((s) => s.markAccountPromptSeen);

  const points = Number(params.points) || 0;
  const isFirst = params.first === '1';
  const unlocked = (params.achievements ?? '')
    .split(',')
    .filter((t): t is AchievementType => t in ACHIEVEMENT_DEFS);

  // Itemized so a bigger-than-usual award explains itself.
  const breakdown = (params.breakdown ?? '')
    .split('|')
    .filter(Boolean)
    .map((entry) => {
      const idx = entry.lastIndexOf(':');
      return { label: entry.slice(0, idx), points: Number(entry.slice(idx + 1)) };
    })
    .filter((line) => line.label && Number.isFinite(line.points));

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  // Let the confetti blast own the screen first, then snap the card in:
  // ease-out entrance from scale 0.95 + slight rise, under 300ms.
  const reducedMotion = useReducedMotion();
  const cardIn = useSharedValue(reducedMotion ? 1 : 0);
  useEffect(() => {
    if (reducedMotion) return;
    cardIn.value = withDelay(
      1600,
      withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardIn.value,
    transform: [
      { translateY: 16 * (1 - cardIn.value) },
      { scale: 0.95 + 0.05 * cardIn.value },
    ],
  }));

  // The card lands after the confetti; the total then counts up and the
  // itemized lines follow one by one, so the points read as being earned.
  const cardDelay = reducedMotion ? 0 : 1860;

  const dismiss = () => router.replace('/(tabs)');

  // First log, no account yet: the next step asks for one, now that there
  // are points worth keeping.
  const promptForAccount = isFirst && isAnonymous;
  const handleContinue = () => {
    markAccountPromptSeen();
    router.replace({ pathname: '/sign-in', params: { intent: 'first-log', points: String(points) } });
  };

  return (
    <Pressable accessible={false} style={styles.overlay} onPress={isFirst ? undefined : dismiss}>
      <Animated.View
        style={[
          styles.card,
          isFirst && styles.cardFirstLog,
          { marginBottom: insets.bottom + spacing.lg },
          cardStyle,
        ]}
      >
        <SymbolView
          name={isFirst ? 'trophy.fill' : 'checkmark.seal.fill'}
          size={64}
          tintColor={isFirst ? colors.gold : colors.brand}
          style={styles.heroSymbol}
        />
        <Text style={styles.title}>
          {isFirst ? 'Your first pizza is in the books' : 'Pizza logged!'}
        </Text>
        <Text style={styles.points} accessibilityLabel={`Plus ${points} Pizza Points`}>
          +<CountUp value={points} delay={cardDelay} runId={0} style={styles.points} /> Pizza Points
        </Text>

        {breakdown.length > 1 && (
          <View style={styles.breakdown}>
            {breakdown.map((line, index) => (
              <FadeUp
                key={line.label}
                runId={0}
                delay={cardDelay + 240 + index * 140}
                style={styles.breakdownRow}
              >
                <Text style={styles.breakdownLabel}>{line.label}</Text>
                <Text style={styles.breakdownPoints}>+{line.points}</Text>
              </FadeUp>
            ))}
          </View>
        )}

        {unlocked.length > 0 && (
          <View style={styles.achievements}>
            {unlocked.map((type) => (
              <View key={type} style={styles.achievementRow}>
                <SymbolView
                  name={ACHIEVEMENT_DEFS[type].symbol}
                  size={28}
                  tintColor={type === 'nirvana' ? colors.gold : colors.brand}
                />
                <View style={styles.achievementText}>
                  <Text style={styles.achievementTitle}>
                    {ACHIEVEMENT_DEFS[type].title}
                  </Text>
                  <Text style={styles.achievementDescription}>
                    {ACHIEVEMENT_DEFS[type].description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {isFirst ? (
          <>
            <Text style={styles.message}>
              First slice in the books. Every pizza from here adds to your total.
            </Text>
            <View style={styles.buttonStack}>
              {promptForAccount ? (
                <PillButton label="Continue" onPress={handleContinue} />
              ) : (
                <PillButton label="See my pizzas" onPress={dismiss} />
              )}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.message}>
              Your pizza list is growing. Keep logging to climb the ranks.
            </Text>
            <View style={styles.buttonStack}>
              <PillButton label="See my pizzas" onPress={dismiss} />
            </View>
          </>
        )}
      </Animated.View>
      <PizzaConfetti seed={points + unlocked.length * 31} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    ...sticker.border,
    ...sticker.shadowLg,
  },
  // Gold is reserved for points and Nirvana; the first log is the one other
  // moment that earns the gold treatment.
  cardFirstLog: {
    borderColor: colors.gold + '40',
  },
  heroSymbol: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  points: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.gold,
  },
  breakdown: {
    width: '100%',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  breakdownLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  breakdownPoints: {
    fontSize: fontSize.sm,
    color: colors.gold,
    fontWeight: '700',
  },
  achievements: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  achievementText: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  achievementDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  message: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  buttonStack: {
    width: '100%',
    gap: spacing.sm,
  },
});
