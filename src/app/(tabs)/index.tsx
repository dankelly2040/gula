import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRankedLogs } from '../../hooks/use-pizza-logs';
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

  const totalPoints = logs.reduce((sum, l) => sum + l.pointsEarned, 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <Text style={styles.title}>Your hall of fame</Text>

      {logs.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{logs.length}</Text>
            <Text style={styles.statLabel}>
              {logs.length === 1 ? 'slice' : 'slices'}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.gold }]}>
              {totalPoints}
            </Text>
            <Text style={styles.statLabel}>points</Text>
          </View>
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
          <Text style={styles.emptyIcon}>🍕</Text>
          <Text style={styles.emptyTitle}>No slices yet</Text>
          <Text style={styles.emptyText}>
            Log your first slice and start building your pizza hall of fame.
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
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
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
    backgroundColor: colors.brand + '20',
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
    fontSize: 64,
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
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
