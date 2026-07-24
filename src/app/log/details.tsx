import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDraftLogStore } from '../../state/draft-log';
import { useSaveLog } from '../../hooks/use-pizza-logs';
import { computePizzaScore, computeExperienceScore } from '../../db/types';
import type { PizzaLog } from '../../db/types';
import {
  PIZZA_STYLES,
  PIZZA_FORMATS,
  CONTEXT_OPTIONS,
  PRICE_TIERS,
  COMMON_TOPPINGS,
} from '../../constants/enums';
import { colors, spacing, fontSize, radii } from '../../constants/theme';

export default function Details() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const draft = useDraftLogStore();
  const { mutate: saveLog } = useSaveLog();

  const handleSave = () => {
    const log: PizzaLog = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 9),
      userId: 'local',
      spotId: draft.spotId,
      spotName: draft.spotName,
      timestamp: new Date().toISOString(),
      photoUri: draft.photoUri,
      moneyShot: draft.moneyShot,
      pizzaScore: computePizzaScore(draft.subScores),
      experienceScore: computeExperienceScore(draft.subScores),
      sendFriend: draft.sendFriend,
      subScores: { ...draft.subScores },
      tags: { ...draft.tags },
      notes: draft.notes,
      pointsEarned: 10,
    };

    saveLog(log, {
      onSuccess: () => {
        draft.reset();
        router.dismissAll();
        router.push('/reward');
      },
    });
  };

  const toggleTopping = (topping: string) => {
    const current = draft.tags.toppings;
    if (current.includes(topping)) {
      draft.setTag(
        'toppings',
        current.filter((t) => t !== topping)
      );
    } else {
      draft.setTag('toppings', [...current, topping]);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Details</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Spot name */}
        <Text style={styles.sectionLabel}>Where was this?</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Pizza spot name"
          placeholderTextColor={colors.textMuted}
          value={draft.spotName ?? ''}
          onChangeText={(text) => draft.setSpot(null, text || null)}
        />

        {/* Style */}
        <Text style={styles.sectionLabel}>Style</Text>
        <View style={styles.chipRow}>
          {PIZZA_STYLES.map((s) => (
            <Pressable
              key={s}
              style={[styles.chip, draft.tags.style === s && styles.chipActive]}
              onPress={() => draft.setTag('style', draft.tags.style === s ? null : s)}
            >
              <Text
                style={[
                  styles.chipText,
                  draft.tags.style === s && styles.chipTextActive,
                ]}
              >
                {s}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Format */}
        <Text style={styles.sectionLabel}>Format</Text>
        <View style={styles.chipRow}>
          {PIZZA_FORMATS.map((f) => (
            <Pressable
              key={f}
              style={[styles.chip, draft.tags.format === f && styles.chipActive]}
              onPress={() => draft.setTag('format', draft.tags.format === f ? null : f)}
            >
              <Text
                style={[
                  styles.chipText,
                  draft.tags.format === f && styles.chipTextActive,
                ]}
              >
                {f}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Toppings */}
        <Text style={styles.sectionLabel}>Toppings</Text>
        <View style={styles.chipRow}>
          {COMMON_TOPPINGS.map((t) => (
            <Pressable
              key={t}
              style={[
                styles.chip,
                draft.tags.toppings.includes(t) && styles.chipActive,
              ]}
              onPress={() => toggleTopping(t)}
            >
              <Text
                style={[
                  styles.chipText,
                  draft.tags.toppings.includes(t) && styles.chipTextActive,
                ]}
              >
                {t}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Price tier */}
        <Text style={styles.sectionLabel}>Price</Text>
        <View style={styles.chipRow}>
          {PRICE_TIERS.map((p) => (
            <Pressable
              key={p}
              style={[styles.chip, draft.tags.priceTier === p && styles.chipActive]}
              onPress={() =>
                draft.setTag('priceTier', draft.tags.priceTier === p ? null : p)
              }
            >
              <Text
                style={[
                  styles.chipText,
                  draft.tags.priceTier === p && styles.chipTextActive,
                ]}
              >
                {p}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Context */}
        <Text style={styles.sectionLabel}>Context</Text>
        <View style={styles.chipRow}>
          {CONTEXT_OPTIONS.map((c) => (
            <Pressable
              key={c}
              style={[styles.chip, draft.tags.context === c && styles.chipActive]}
              onPress={() =>
                draft.setTag('context', draft.tags.context === c ? null : c)
              }
            >
              <Text
                style={[
                  styles.chipText,
                  draft.tags.context === c && styles.chipTextActive,
                ]}
              >
                {c}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Notes */}
        <Text style={styles.sectionLabel}>Notes</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder="Anything else worth noting..."
          placeholderTextColor={colors.textMuted}
          value={draft.notes}
          onChangeText={draft.setNotes}
          multiline
          numberOfLines={3}
        />
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Ionicons name="checkmark-circle" size={24} color={colors.textPrimary} />
          <Text style={styles.saveButtonText}>Save this slice</Text>
        </Pressable>
      </View>
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
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.bgInput,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brand + '20',
  },
  chipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.brand,
  },
  bottom: {
    paddingHorizontal: spacing.lg,
  },
  saveButton: {
    backgroundColor: colors.green,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  saveButtonText: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
