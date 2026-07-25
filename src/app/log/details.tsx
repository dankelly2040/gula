import { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { goBack } from '../../lib/nav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Host, Picker, Text as NativeText } from '@expo/ui/swift-ui';
import { frame, pickerStyle, tag, tint } from '@expo/ui/swift-ui/modifiers';
import { useDraftLogStore } from '../../state/draft-log';
import { useSaveLog, useUpdateLog, usePizzaLogs } from '../../hooks/use-pizza-logs';
import { useProfile } from '../../hooks/use-profile';
import { computePizzaScore, computeExperienceScore } from '../../db/types';
import type { PizzaLog } from '../../db/types';
import { generateId } from '../../lib/id';
import { getCurrentCoords } from '../../lib/location';
import { SpotPicker } from '../../components/spot-picker';
import {
  PIZZA_STYLES,
  PIZZA_FORMATS,
  CONTEXT_OPTIONS,
  PRICE_TIERS,
  COMMON_TOPPINGS,
} from '../../constants/enums';
import { PillButton, StickerChip } from '../../components/sticker';
import { colors, spacing, fontSize, radii, sticker } from '../../constants/theme';

// Sentinel tag for the "no selection" row in menu pickers. Native `tag`
// values must be string | number, so null is represented explicitly.
const UNSET_TAG = '__unset__';

/**
 * Native SwiftUI picker for a single-select optional tag. Segmented for
 * short option sets, menu (with an explicit "Not set" row so the field can
 * be cleared) when labels don't fit as segments. Fields start unset; the
 * first choice selects a value.
 */
function NativeTagPicker<T extends string>({
  label,
  options,
  selection,
  onSelect,
  variant,
}: {
  label: string;
  options: readonly T[];
  selection: T | null;
  onSelect: (value: T | null) => void;
  variant: 'segmented' | 'menu';
}) {
  const isMenu = variant === 'menu';
  return (
    // Segmented controls hug their frame tighter than the menu picker, which
    // makes the label look glued to them; the extra top margin restores the
    // same label-to-control gap as every other section.
    <Host matchContents={{ vertical: true }} style={isMenu ? undefined : { marginTop: spacing.xs }}>
      <Picker<string | null>
        label={label}
        selection={selection ?? (isMenu ? UNSET_TAG : null)}
        onSelectionChange={(value) => {
          onSelect(value === UNSET_TAG || value === null ? null : (value as T));
        }}
        modifiers={
          isMenu
            ? [pickerStyle('menu'), tint(colors.brand), frame({ maxWidth: Infinity, alignment: 'leading' })]
            : [pickerStyle('segmented'), tint(colors.brand)]
        }
      >
        {isMenu ? <NativeText modifiers={[tag(UNSET_TAG)]}>Not set</NativeText> : null}
        {options.map((option) => (
          <NativeText key={option} modifiers={[tag(option)]}>
            {option}
          </NativeText>
        ))}
      </Picker>
    </Host>
  );
}

export default function Details() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const draft = useDraftLogStore();
  const saveLog = useSaveLog();
  const updateLog = useUpdateLog();
  const { data: logs } = usePizzaLogs();
  const { data: profile } = useProfile();

  // Capture location automatically so spots and the map need no extra step.
  useEffect(() => {
    if (useDraftLogStore.getState().lat !== null) return;
    void getCurrentCoords().then((c) => {
      if (c) useDraftLogStore.getState().setCoords(c.lat, c.lng);
    });
  }, []);

  const isSaving = saveLog.isPending || updateLog.isPending;

  const handleSave = async () => {
    if (isSaving) return;

    if (editId) {
      const original = logs?.find((l) => l.id === editId);
      if (!original) return;
      // Keep identity, timestamp, points, and remote photo; take edits from the draft.
      const updated: PizzaLog = {
        ...original,
        spotId: draft.spotId,
        spotName: draft.spotName,
        photoUri: draft.photoUri,
        moneyShot: draft.moneyShot,
        pizzaScore: computePizzaScore(draft.subScores),
        experienceScore: computeExperienceScore(draft.subScores),
        sendFriend: draft.sendFriend,
        subScores: { ...draft.subScores },
        tags: { ...draft.tags },
        notes: draft.notes,
        lat: draft.lat,
        lng: draft.lng,
      };
      try {
        await updateLog.mutateAsync(updated);
      } catch {
        return;
      }
      draft.reset();
      if (router.canDismiss()) {
        router.dismiss();
      } else {
        goBack();
      }
      return;
    }

    const log: PizzaLog = {
      id: generateId(),
      userId: 'local',
      spotId: draft.spotId,
      spotName: draft.spotName,
      timestamp: new Date().toISOString(),
      photoUri: draft.photoUri,
      photoUrl: null,
      moneyShot: draft.moneyShot,
      pizzaScore: computePizzaScore(draft.subScores),
      experienceScore: computeExperienceScore(draft.subScores),
      sendFriend: draft.sendFriend,
      subScores: { ...draft.subScores },
      tags: { ...draft.tags },
      notes: draft.notes,
      pointsEarned: 0, // computed by useSaveLog
      lat: draft.lat,
      lng: draft.lng,
      isPublic: profile?.shareWithCommunity ?? false,
      updatedAt: new Date().toISOString(),
    };

    let rewards;
    try {
      rewards = await saveLog.mutateAsync(log);
    } catch {
      return;
    }
    draft.reset();
    router.replace(
      `/reward?points=${rewards.points}&first=${rewards.isFirstLog ? 1 : 0}&achievements=${rewards.newAchievements.map((a) => a.type).join(',')}`
    );
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
        <Pressable onPress={() => goBack()}>
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
        {/* Spot */}
        <Text style={styles.sectionLabel}>Where was this?</Text>
        <SpotPicker />

        {/* Style */}
        <Text style={styles.sectionLabel}>Style</Text>
        <NativeTagPicker
          label="Style"
          options={PIZZA_STYLES}
          selection={draft.tags.style}
          onSelect={(value) => draft.setTag('style', value)}
          variant="menu"
        />

        {/* Format */}
        <Text style={styles.sectionLabel}>Format</Text>
        <NativeTagPicker
          label="Format"
          options={PIZZA_FORMATS}
          selection={draft.tags.format}
          onSelect={(value) => draft.setTag('format', value)}
          variant="segmented"
        />

        {/* Toppings */}
        <Text style={styles.sectionLabel}>Toppings</Text>
        <View style={styles.chipRow}>
          {COMMON_TOPPINGS.map((t) => (
            <StickerChip
              key={t}
              label={t}
              selected={draft.tags.toppings.includes(t)}
              onPress={() => toggleTopping(t)}
            />
          ))}
        </View>

        {/* Price tier */}
        <Text style={styles.sectionLabel}>Price</Text>
        <NativeTagPicker
          label="Price"
          options={PRICE_TIERS}
          selection={draft.tags.priceTier}
          onSelect={(value) => draft.setTag('priceTier', value)}
          variant="segmented"
        />

        {/* Context */}
        <Text style={styles.sectionLabel}>Context</Text>
        <NativeTagPicker
          label="Context"
          options={CONTEXT_OPTIONS}
          selection={draft.tags.context}
          onSelect={(value) => draft.setTag('context', value)}
          variant="segmented"
        />

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
        <PillButton
          label={editId ? 'Save changes' : 'Save it'}
          icon="checkmark"
          onPress={() => void handleSave()}
          disabled={isSaving}
        />
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
    ...sticker.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm + spacing.xs,
  },
  bottom: {
    paddingHorizontal: spacing.lg,
  },
});
