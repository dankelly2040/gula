import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRankedLogs } from '../../hooks/use-pizza-logs';
import { useProfile } from '../../hooks/use-profile';
import { PizzaCard } from '../../components/pizza-card';
import { StatTrio } from '../../components/stat-trio';
import { FadeUp } from '../../components/fade-up';
import { PillButton, StickerChip } from '../../components/sticker';
import { colors, spacing, fontSize, gradients } from '../../constants/theme';
import { LOG_BUTTON_CLEARANCE } from '../../components/log-button';
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

  // Bumped on every visit to the tab so the stats replay their landing.
  const [runId, setRunId] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setRunId((n) => n + 1);
    }, [])
  );

  const pickSort = (key: SortKey) => {
    if (key === sortBy) return;
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.selectionAsync();
    }
    setSortBy(key);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <FadeUp runId={runId}>
        <Text style={styles.title}>Let&apos;s eat some pizza.</Text>
      </FadeUp>

      {logs.length > 0 && (
        <StatTrio
          pizzas={logs.length}
          points={totalPoints}
          streak={streak}
          runId={runId}
        />
      )}

      {logs.length > 0 && (
        <FadeUp runId={runId} delay={380} style={styles.sortRow}>
          {SORT_OPTIONS.map((opt) => (
            <StickerChip
              key={opt.key}
              label={opt.label}
              selected={sortBy === opt.key}
              onPress={() => pickSort(opt.key)}
            />
          ))}
        </FadeUp>
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
            // Cap the stagger so a long list does not trickle in forever.
            <Animated.View
              entering={FadeInDown.delay(
                420 + Math.min(index, 6) * 60
              ).duration(340)}
            >
              <PizzaCard
                log={item}
                rank={sortBy !== 'date' ? index + 1 : undefined}
              />
            </Animated.View>
          )}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + LOG_BUTTON_CLEARANCE },
          ]}
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
    experimental_backgroundImage: gradients.screen,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  sortRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  list: {
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
