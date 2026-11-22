import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import Animated, {
  SensorType,
  useAnimatedScrollHandler,
  useAnimatedSensor,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRankedLogs } from '../../hooks/use-pizza-logs';
import { useProfile } from '../../hooks/use-profile';
import { FloatingPizza, FLOAT_ITEM_HEIGHT } from '../../components/floating-pizza';
import { StatRow } from '../../components/stat-row';
import { FadeUp } from '../../components/fade-up';
import { PillButton } from '../../components/sticker';
import { TextTabs } from '../../components/text-tabs';
import { colors, fonts, spacing, fontSize } from '../../constants/theme';
import { LOG_BUTTON_CLEARANCE } from '../../components/log-button';
import { useObserve } from 'expo-observe';

type SortKey = 'moneyShot' | 'pizzaScore' | 'date';

// The pizzas hang in a two-column grid. Rows have a fixed height so each
// item can work out where it sits in the viewport without measuring.
const COLUMNS = 2;
const COLUMN_GAP = spacing.md;
const ROW_GAP = spacing.lg;
const ROW_HEIGHT = FLOAT_ITEM_HEIGHT + ROW_GAP;
const LIST_TOP = spacing.sm;

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
  const { width: windowWidth } = useWindowDimensions();
  const itemWidth = (windowWidth - spacing.lg * 2 - COLUMN_GAP) / COLUMNS;

  // One scroll position, one viewport height and one gravity reading drive
  // the tilt of every floating pizza, all on the UI thread.
  const still = useReducedMotion();
  const scrollY = useSharedValue(0);
  const viewportHeight = useSharedValue(600);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  const gravity = useAnimatedSensor(SensorType.GRAVITY, { interval: 32 });
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

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <FadeUp runId={runId}>
        <Text style={styles.title}>Let&apos;s eat some pizza.</Text>
      </FadeUp>

      {logs.length > 0 && (
        <StatRow
          runId={runId}
          stats={[
            { value: logs.length, label: logs.length === 1 ? 'Pizza' : 'Pizzas' },
            { valueColor: colors.gold, value: totalPoints, label: 'Points' },
            { value: streak, label: 'Week streak' },
          ]}
        />
      )}

      {logs.length > 0 && (
        <FadeUp runId={runId} delay={380} style={styles.sortRow}>
          <TextTabs options={SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
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
        <FadeUp runId={runId} delay={420} style={styles.listWrap}>
          <Animated.FlatList
            data={logs}
            keyExtractor={(item) => item.id}
            numColumns={COLUMNS}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onLayout={(e) => viewportHeight.set(e.nativeEvent.layout.height)}
            getItemLayout={(_, row) => ({
              length: ROW_HEIGHT,
              offset: LIST_TOP + ROW_HEIGHT * row,
              index: row,
            })}
            renderItem={({ item, index }) => (
              <FloatingPizza
                log={item}
                rank={sortBy !== 'date' ? index + 1 : undefined}
                index={index}
                width={itemWidth}
                rowTop={LIST_TOP + Math.floor(index / COLUMNS) * ROW_HEIGHT}
                scrollY={scrollY}
                viewportHeight={viewportHeight}
                gravity={gravity.sensor}
                still={still}
              />
            )}
            columnWrapperStyle={styles.row}
            contentContainerStyle={{
              paddingTop: LIST_TOP,
              paddingBottom: insets.bottom + LOG_BUTTON_CLEARANCE,
            }}
            showsVerticalScrollIndicator={false}
          />
        </FadeUp>
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
    fontFamily: fonts.display,
    fontSize: 21,
    lineHeight: 28,
    textTransform: 'uppercase',
    color: colors.brand,
    marginBottom: spacing.md,
  },
  sortRow: {
    marginBottom: spacing.md,
  },
  listWrap: {
    flex: 1,
  },
  row: {
    gap: COLUMN_GAP,
    marginBottom: ROW_GAP,
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
