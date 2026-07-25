import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRankedLogs } from '../../hooks/use-pizza-logs';
import { useProfile } from '../../hooks/use-profile';
import { PizzaCard } from '../../components/pizza-card';
import { PillButton, StickerChip } from '../../components/sticker';
import { colors, spacing, fontSize, radii, sticker } from '../../constants/theme';
import { useObserve } from 'expo-observe';

type SortKey = 'moneyShot' | 'pizzaScore' | 'date';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'moneyShot', label: 'Pizza ratings' },
  { key: 'date', label: 'Recents' },
];

export default function Activity() {
  const { markInteractive } = useObserve();
  useEffect(() => {
    markInteractive();
  }, [markInteractive]);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [sortBy, setSortBy] = useState<SortKey>('moneyShot');
  const { data: logs, isLoading } = useRankedLogs(sortBy);
  const { data: profile } = useProfile();

  const totalPoints = logs.reduce((sum, l) => sum + l.pointsEarned, 0);
  const streak = profile?.currentStreak ?? 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <Text style={styles.title}>Pizza stats</Text>

      {logs.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{logs.length}</Text>
            <Text style={styles.statLabel}>
              {logs.length === 1 ? 'pizza' : 'pizzas'}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.gold }]}>
              {totalPoints}
            </Text>
            <Text style={styles.statLabel}>Pizza Points</Text>
          </View>
        </View>
      )}

      {streak >= 1 && (
        <View style={styles.streakBanner}>
          <SymbolView name="flame.fill" size={16} tintColor={colors.brand} />
          <Text style={styles.streakText}>
            {streak} week streak, keep it alive
          </Text>
        </View>
      )}

      {logs.length > 0 && (
        <View style={styles.sortRow}>
          {SORT_OPTIONS.map((opt) => (
            <StickerChip
              key={opt.key}
              label={opt.label}
              selected={sortBy === opt.key}
              onPress={() => setSortBy(opt.key)}
            />
          ))}
        </View>
      )}

      {logs.length === 0 && !isLoading ? (
        <View style={styles.empty}>
          <SymbolView
            name="fork.knife.circle"
            size={56}
            tintColor={colors.textMuted}
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyTitle}>No pizzas yet</Text>
          <Text style={styles.emptyText}>
            Log your first pizza and start building your stats.
          </Text>
          <PillButton
            onPress={() => router.push('/log/capture')}
            label="Log your first slice"
          />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <PizzaCard
              log={item}
              rank={sortBy !== 'date' ? index + 1 : undefined}
            />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: spacing.md,
  },
  stat: {
    alignItems: 'flex-start',
    gap: 2,
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: '600',
  },
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    ...sticker.border,
    ...sticker.shadowSm,
  },
  streakText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  sortRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
  separator: {
    height: spacing.sm,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  emptyIcon: {
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
});
