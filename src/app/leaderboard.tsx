import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import { Image } from 'expo-image';
import { useObserve } from 'expo-observe';
import { useLeaderboard, type LeaderboardPeriod } from '../hooks/use-leaderboard';
import { useSessionStore } from '../state/session';
import { PillButton } from '../components/sticker';
import type { LeaderboardEntry } from '../db/remote-store';
import { colors, spacing, fontSize, radii, sticker } from '../constants/theme';

const PERIODS: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'month', label: 'This month' },
  { key: 'allTime', label: 'All time' },
];

export default function Leaderboard() {
  const { markInteractive } = useObserve();
  useEffect(() => {
    markInteractive();
  }, [markInteractive]);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const userId = useSessionStore((s) => s.userId);
  const [period, setPeriod] = useState<LeaderboardPeriod>('month');

  const { data, isLoading, isError, refetch, isRefetching } = useLeaderboard(period);
  const entries = data ?? [];
  const me = entries.find((e) => e.userId === userId);

  const renderBody = () => {
    if (isLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brand} size="large" />
          <Text style={styles.loadingText}>Counting slices</Text>
        </View>
      );
    }

    if (isError) {
      return (
        <View style={styles.centered}>
          <SymbolView name="wifi.slash" size={56} tintColor={colors.textMuted} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>Could not load the board</Text>
          <Text style={styles.emptyText}>
            The leaderboard needs a connection. Your pizzas are safe on this device either way.
          </Text>
          <PillButton onPress={() => void refetch()} label="Try again" />
        </View>
      );
    }

    if (entries.length === 0) {
      return (
        <View style={styles.centered}>
          <SymbolView name="trophy" size={56} tintColor={colors.textMuted} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>
            {period === 'month' ? 'Nobody has logged this month' : 'No rankings yet'}
          </Text>
          <Text style={styles.emptyText}>Log a pizza and take the top spot.</Text>
          <PillButton onPress={() => router.push('/log/capture')} label="Log a slice" />
        </View>
      );
    }

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={colors.brand}
          />
        }
      >
        {entries.map((entry) => (
          <Row key={entry.userId} entry={entry} isMe={entry.userId === userId} />
        ))}

        {/* Everyone should be able to find themselves without scrolling. */}
        {!me && (
          <View style={styles.notRanked}>
            <Text style={styles.notRankedText}>
              {period === 'month'
                ? 'You have not logged a pizza this month yet.'
                : 'Log your first pizza to join the board.'}
            </Text>
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Leaderboard</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.segmentRow}>
        {PERIODS.map((p) => (
          <Pressable
            key={p.key}
            style={[styles.segment, period === p.key && styles.segmentActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.segmentText, period === p.key && styles.segmentTextActive]}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {renderBody()}
    </View>
  );
}

function Row({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  const medal = entry.rank <= 3;
  return (
    <View style={[styles.row, isMe && styles.rowMe]}>
      <View style={[styles.rankBadge, medal && styles.rankBadgeMedal]}>
        <Text style={[styles.rankText, medal && styles.rankTextMedal]}>{entry.rank}</Text>
      </View>

      <View style={styles.avatar}>
        {entry.avatarUrl ? (
          <Image source={{ uri: entry.avatarUrl }} style={styles.avatarImage} contentFit="cover" />
        ) : (
          <SymbolView name="person.crop.circle.fill" size={26} tintColor={colors.textMuted} />
        )}
      </View>

      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>
          {entry.displayName?.trim() || 'Pizza enthusiast'}
          {isMe ? ' (you)' : ''}
        </Text>
        <Text style={styles.rowMeta}>
          {entry.logs} {entry.logs === 1 ? 'pizza' : 'pizzas'}
        </Text>
      </View>

      <Text style={styles.rowPoints}>{entry.points}</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 26,
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    padding: 3,
    marginBottom: spacing.md,
    ...sticker.border,
    ...sticker.shadowSm,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  segmentActive: {
    backgroundColor: colors.brand,
  },
  segmentText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.surface,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  emptyIcon: {
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
    ...sticker.border,
    ...sticker.shadowSm,
  },
  // The signed-in user's row is the one thing worth picking out of the list.
  rowMe: {
    borderColor: colors.brand,
    borderWidth: 2.5,
  },
  rankBadge: {
    width: 30,
    alignItems: 'center',
  },
  rankBadgeMedal: {},
  rankText: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.textMuted,
  },
  rankTextMedal: {
    color: colors.gold,
    fontSize: fontSize.lg,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 36,
    height: 36,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rowMeta: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  rowPoints: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.gold,
  },
  notRanked: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  notRankedText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
});
