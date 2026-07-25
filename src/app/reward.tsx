import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { ACHIEVEMENT_DEFS, type AchievementType } from '../db/types';
import { enableStreakReminders } from '../lib/notifications';
import { useSessionStore } from '../state/session';
import { colors, spacing, fontSize, radii } from '../constants/theme';

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
      <View
        style={[
          styles.card,
          isFirst && styles.cardFirstLog,
          { marginBottom: insets.bottom + spacing.lg },
        ]}
      >
        <SymbolView
          name={isFirst ? 'trophy.fill' : 'checkmark.seal.fill'}
          size={64}
          tintColor={isFirst ? colors.gold : colors.brand}
          style={styles.heroSymbol}
        />
        <Text style={styles.title}>
          {isFirst ? 'Your hall of fame has begun' : 'Slice logged!'}
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
            {isAnonymous && (
              <Pressable style={styles.primaryButton} onPress={handleSaveProgress}>
                <Text style={styles.primaryButtonText}>Save your progress</Text>
              </Pressable>
            )}
            <Pressable style={styles.secondaryButton} onPress={handleRemindWeekly}>
              <Text style={styles.secondaryButtonText}>Remind me weekly</Text>
            </Pressable>
            <Pressable style={styles.dismissButton} onPress={dismiss}>
              <Text style={styles.dismissButtonText}>Not now</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.message}>
              Your pizza hall of fame is growing. Keep logging to climb the ranks.
            </Text>
            <Pressable style={styles.primaryButton} onPress={dismiss}>
              <Text style={styles.primaryButtonText}>View your hall of fame</Text>
            </Pressable>
          </>
        )}
      </View>
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
    backgroundColor: colors.bgCard,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
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
  primaryButton: {
    backgroundColor: colors.brand,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '700',
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
