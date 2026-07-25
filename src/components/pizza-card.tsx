import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { colors, spacing, fontSize, radii } from '../constants/theme';
import { getZoneForScore } from '../constants/enums';
import type { PizzaLog } from '../db/types';

type Props = {
  log: PizzaLog;
  rank?: number;
};

export function PizzaCard({ log, rank }: Props) {
  const router = useRouter();
  const zone = getZoneForScore(log.moneyShot);
  const date = new Date(log.timestamp);
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/pizza/${log.id}`)}
    >
      {rank != null && (
        <View style={[styles.rankBadge, rank === 1 && styles.rankBadgeFirst]}>
          <Text style={[styles.rankText, rank === 1 && styles.rankTextFirst]}>
            #{rank}
          </Text>
        </View>
      )}

      {log.photoUri ? (
        <Image source={{ uri: log.photoUri }} style={styles.photo} contentFit="cover" />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder]}>
          <SymbolView name="fork.knife" size={32} tintColor={colors.textMuted} />
        </View>
      )}

      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={styles.spotName} numberOfLines={1}>
            {log.spotName ?? 'Unknown spot'}
          </Text>
          <Text style={styles.date}>{dateStr}</Text>
        </View>

        <View style={styles.scores}>
          <View style={[styles.scoreBadge, { backgroundColor: zone.color + '20' }]}>
            <Text style={[styles.scoreValue, { color: zone.color }]}>
              {log.moneyShot}
            </Text>
            <Text style={[styles.scoreLabel, { color: zone.color }]}>
              {zone.label}
            </Text>
          </View>

          {log.tags.style && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{log.tags.style}</Text>
            </View>
          )}
        </View>

        {log.notes ? (
          <Text style={styles.notes} numberOfLines={1}>
            {log.notes}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Neutral by default; gold is reserved for the top slice only.
  rankBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    zIndex: 1,
  },
  rankBadgeFirst: {
    backgroundColor: colors.gold + '20',
  },
  rankText: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  rankTextFirst: {
    color: colors.gold,
  },
  photo: {
    width: 100,
    height: 100,
  },
  photoPlaceholder: {
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spotName: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  date: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  scores: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  scoreValue: {
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  tag: {
    backgroundColor: colors.bgElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  tagText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  notes: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
