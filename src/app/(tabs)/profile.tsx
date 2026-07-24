import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePizzaLogs } from '../../hooks/use-pizza-logs';
import { colors, spacing, fontSize, radii } from '../../constants/theme';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: logs } = usePizzaLogs();

  const totalLogs = logs?.length ?? 0;
  const totalPoints = logs?.reduce((sum, l) => sum + l.pointsEarned, 0) ?? 0;
  const topScore = logs?.length
    ? Math.max(...logs.map((l) => l.moneyShot))
    : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Profile</Text>
        <Pressable onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={24} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.avatar}>
        <Text style={styles.avatarEmoji}>🍕</Text>
      </View>
      <Text style={styles.name}>Pizza enthusiast</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalLogs}</Text>
          <Text style={styles.statLabel}>Slices logged</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.gold }]}>{totalPoints}</Text>
          <Text style={styles.statLabel}>Total points</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.green }]}>{topScore}</Text>
          <Text style={styles.statLabel}>Top score</Text>
        </View>
      </View>

      <View style={styles.badges}>
        <Text style={styles.sectionTitle}>Badges</Text>
        {totalLogs > 0 ? (
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeEmoji}>🎉</Text>
              <Text style={styles.badgeLabel}>First slice</Text>
            </View>
            {totalLogs >= 5 && (
              <View style={styles.badge}>
                <Text style={styles.badgeEmoji}>🔥</Text>
                <Text style={styles.badgeLabel}>5 slices</Text>
              </View>
            )}
            {totalLogs >= 10 && (
              <View style={styles.badge}>
                <Text style={styles.badgeEmoji}>⭐</Text>
                <Text style={styles.badgeLabel}>10 slices</Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.noBadges}>Log your first slice to earn badges</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  avatarEmoji: {
    fontSize: 36,
  },
  name: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  badges: {},
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  badge: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gold + '30',
    width: 90,
  },
  badgeEmoji: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  badgeLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  noBadges: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
});
