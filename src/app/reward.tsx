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
import { enableStreakReminders } from '../lib/notifications';
import { useSessionStore } from '../state/session';
import { PizzaConfetti } from '../components/pizza-confetti';
import { PillButton } from '../components/sticker';
import { colors, spacing, fontSize, radii, sticker } from '../constants/theme';

export default function Reward() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    points?: string;
    first?: string;
    achievements?: string;
  }>();
  const isAnonymous = useSessionStore((s) => s.isAnonymous);
  const markAccountPromptSeen = useSessionStore((s) => s.markAccountPromptSeen);

  const points = Number(params.points) || 0;
  const isFirst = params.first === '1';
  const unlocked = (params.achievements ?? '')
    .split(',')
    .filter((t): t is AchievementType => t in ACHIEVEMENT_DEFS);

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

  const dismiss = () => router.replace('/(tabs)');

  const handleSaveProgress = () => {
    markAccountPromptSeen();
    router.replace('/sign-in');
  };

  const handleRemindWeekly = async () => {
    await enableStreakReminders();
    dismiss();
  };

  return (
    <Pressable style={styles.overlay} onPress={isFirst ? undefined : dismiss}>
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
        <Text style={styles.points}>+{points} points</Text>

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
              First slice in the books. Keep it going and never lose it.
            </Text>
            <View style={styles.buttonStack}>
              {isAnonymous && (
                <PillButton label="Save your progress" onPress={handleSaveProgress} />
              )}
              <PillButton
                variant="quiet"
                label="Remind me weekly"
                onPress={() => void handleRemindWeekly()}
              />
            </View>
            <Pressable style={styles.dismissButton} onPress={dismiss}>
              <Text style={styles.dismissButtonText}>Not now</Text>
            </Pressable>
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
  dismissButton: {
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  dismissButtonText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
