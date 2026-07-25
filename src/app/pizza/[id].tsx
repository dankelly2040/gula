import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBack } from '../../lib/nav';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePizzaLogs, useDeleteLog } from '../../hooks/use-pizza-logs';
import { useDraftLogStore } from '../../state/draft-log';
import { getZoneForScore } from '../../constants/enums';
import type { SubScores, PizzaTags } from '../../db/types';
import { CircleButton } from '../../components/sticker';
import { colors, spacing, fontSize, radii, sticker } from '../../constants/theme';

export default function PizzaDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: logs } = usePizzaLogs();
  const { mutate: deleteLog } = useDeleteLog();

  const log = logs?.find((l) => l.id === id);
  if (!log) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.notFound}>Log not found</Text>
        <Pressable onPress={() => goBack()}>
          <Text style={styles.backLink}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const zone = getZoneForScore(log.moneyShot);
  const date = new Date(log.timestamp).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const handleEdit = () => {
    const draft = useDraftLogStore.getState();
    draft.reset();
    draft.setPhoto(log.photoUri ?? log.photoUrl);
    draft.setMoneyShot(log.moneyShot);
    (Object.keys(log.subScores) as (keyof SubScores)[]).forEach((key) => {
      draft.setSubScore(key, log.subScores[key]);
    });
    draft.setSendFriend(log.sendFriend);
    (Object.keys(log.tags) as (keyof PizzaTags)[]).forEach((key) => {
      draft.setTag(key, log.tags[key]);
    });
    draft.setSpot(log.spotId, log.spotName);
    draft.setNotes(log.notes);
    draft.setCoords(log.lat, log.lng);
    router.push(`/log/rate?editId=${log.id}`);
  };

  const handleShare = async () => {
    const spot = log.spotName ?? 'a mystery spot';
    const message = `I gave ${spot} a ${log.moneyShot}/100 on the money shot. Verdict: ${zone.label}. 🍕 Logged with Gula`;
    try {
      await Share.share({ message });
    } catch {
      // User dismissed the share sheet, nothing to do.
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete this log?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteLog(log.id, { onSuccess: () => goBack() });
        },
      },
    ]);
  };

  const subScoreEntries = [
    { label: 'Crust', value: log.subScores.crust },
    { label: 'Char & bake', value: log.subScores.charBake },
    { label: 'Sauce & cheese', value: log.subScores.sauceCheese },
    { label: 'Toppings', value: log.subScores.toppings },
    { label: 'Vibes', value: log.subScores.vibes },
    { label: 'Service', value: log.subScores.service },
    { label: 'Value', value: log.subScores.value },
  ].filter((e) => e.value !== null);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <Pressable onPress={() => goBack()}>
          <Ionicons name="arrow-back" size={28} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerActions}>
          <CircleButton onPress={() => void handleShare()} size={40}>
            <Ionicons name="share-outline" size={20} color={colors.ink} />
          </CircleButton>
          <CircleButton onPress={handleEdit} size={40}>
            <Ionicons name="pencil-outline" size={20} color={colors.ink} />
          </CircleButton>
          <CircleButton onPress={handleDelete} size={40}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </CircleButton>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {log.photoUri && (
          <Image
            source={{ uri: log.photoUri }}
            style={styles.photo}
            contentFit="cover"
          />
        )}

        <View style={styles.body}>
          <Text style={styles.spotName}>{log.spotName ?? 'Unknown spot'}</Text>
          <Text style={styles.date}>{date}</Text>

          <View style={styles.moneyShot}>
            <Text style={styles.moneyShotLabel}>Rating</Text>
            <View style={styles.moneyShotRow}>
              <Text style={[styles.moneyShotValue, { color: zone.color }]}>
                {log.moneyShot}
              </Text>
              <Text style={[styles.moneyShotZone, { color: zone.color }]}>
                {zone.label}
              </Text>
            </View>
          </View>

          {log.pizzaScore !== null && (
            <View style={styles.compositeRow}>
              <Text style={styles.compositeLabel}>Pizza score</Text>
              <Text style={styles.compositeValue}>{log.pizzaScore}</Text>
            </View>
          )}
          {log.experienceScore !== null && (
            <View style={styles.compositeRow}>
              <Text style={styles.compositeLabel}>Experience score</Text>
              <Text style={styles.compositeValue}>{log.experienceScore}</Text>
            </View>
          )}

          {subScoreEntries.length > 0 && (
            <View style={styles.subScoresSection}>
              <Text style={styles.sectionTitle}>Breakdown</Text>
              {subScoreEntries.map((e) => (
                <View key={e.label} style={styles.subScoreRow}>
                  <Text style={styles.subScoreLabel}>{e.label}</Text>
                  <View style={styles.subScorePips}>
                    {[1, 2, 3, 4, 5].map((pip) => (
                      <View
                        key={pip}
                        style={[
                          styles.pip,
                          pip <= e.value! && styles.pipFilled,
                        ]}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

          {log.sendFriend && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Send a friend?</Text>
              <Text style={styles.infoValue}>{log.sendFriend}</Text>
            </View>
          )}

          {log.tags.style && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Style</Text>
              <Text style={styles.infoValue}>{log.tags.style}</Text>
            </View>
          )}
          {log.tags.format && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Format</Text>
              <Text style={styles.infoValue}>{log.tags.format}</Text>
            </View>
          )}
          {log.tags.toppings.length > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Toppings</Text>
              <Text style={styles.infoValue}>{log.tags.toppings.join(', ')}</Text>
            </View>
          )}
          {log.tags.priceTier && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Price</Text>
              <Text style={styles.infoValue}>{log.tags.priceTier}</Text>
            </View>
          )}
          {log.tags.context && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Context</Text>
              <Text style={styles.infoValue}>{log.tags.context}</Text>
            </View>
          )}

          {log.notes ? (
            <View style={styles.notesSection}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text style={styles.notesText}>{log.notes}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  spotName: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  date: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  // Mustard sticker frame, echoing the capture card.
  moneyShot: {
    backgroundColor: colors.frame,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...sticker.border,
    ...sticker.shadow,
  },
  moneyShotLabel: {
    fontSize: fontSize.sm,
    // Ink holds contrast on the mustard frame.
    color: colors.ink,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  moneyShotRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  moneyShotValue: {
    fontSize: fontSize.hero,
    fontWeight: '800',
  },
  moneyShotZone: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  compositeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  compositeLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  compositeValue: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subScoresSection: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  subScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  subScoreLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  subScorePips: {
    flexDirection: 'row',
    gap: 4,
  },
  pip: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pipFilled: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  notesSection: {
    marginTop: spacing.lg,
  },
  notesText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  notFound: {
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  backLink: {
    fontSize: fontSize.md,
    color: colors.brand,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
