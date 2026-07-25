import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRankedLogs } from '../../hooks/use-pizza-logs';
import { useProfile } from '../../hooks/use-profile';
import { PizzaCard } from '../../components/pizza-card';
import { colors, spacing, fontSize, radii } from '../../constants/theme';

type SortKey = 'moneyShot' | 'pizzaScore' | 'date';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'moneyShot', label: 'Money Shot' },
  { key: 'pizzaScore', label: 'Pizza Score' },
  { key: 'date', label: 'Recent' },
];

export default function Activity() {
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
            <Pressable
              key={opt.key}
              style={[styles.sortChip, sortBy === opt.key && styles.sortChipActive]}
              onPress={() => setSortBy(opt.key)}
            >
              <Text
                style={[
                  styles.sortChipText,
                  sortBy === opt.key && styles.sortChipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
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
          <Pressable
            style={styles.emptyButton}
            onPress={() => router.push('/log/capture')}
          >
            <Text style={styles.emptyButtonText}>Log your first slice</Text>
          </Pressable>
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
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
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
  sortChip: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortChipActive: {
    borderColor: colors.brand,
  },
  sortChipText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: '600',
  },
  sortChipTextActive: {
    color: colors.brand,
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
  emptyButton: {
    backgroundColor: colors.brand,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyButtonText: {
    // White is allowed here: it sits on the brand fill.
    color: '#FFFDF8',
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
