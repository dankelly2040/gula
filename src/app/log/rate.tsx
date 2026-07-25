import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { goBack } from '../../lib/nav';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MoneyShotSlider } from '../../components/money-shot-slider';
import { ScorePips } from '../../components/score-pips';
import { useDraftLogStore } from '../../state/draft-log';
import { SEND_FRIEND_OPTIONS } from '../../constants/enums';
import { PillButton, StickerChip } from '../../components/sticker';
import { colors, spacing, fontSize } from '../../constants/theme';

export default function Rate() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const moneyShot = useDraftLogStore((s) => s.moneyShot);
  const setMoneyShot = useDraftLogStore((s) => s.setMoneyShot);
  const subScores = useDraftLogStore((s) => s.subScores);
  const setSubScore = useDraftLogStore((s) => s.setSubScore);
  const sendFriend = useDraftLogStore((s) => s.sendFriend);
  const setSendFriend = useDraftLogStore((s) => s.setSendFriend);

  const [showPizza, setShowPizza] = useState(false);
  const [showExperience, setShowExperience] = useState(false);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <Pressable onPress={() => goBack()}>
          <Ionicons name="arrow-back" size={28} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Rate it</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <MoneyShotSlider value={moneyShot} onChange={setMoneyShot} />

        {/* Pizza breakdown */}
        <Pressable
          style={styles.sectionToggle}
          onPress={() => setShowPizza(!showPizza)}
        >
          <Text style={styles.sectionTitle}>The pizza</Text>
          <View style={styles.sectionRight}>
            <Text style={styles.optionalLabel}>Optional</Text>
            <Ionicons
              name={showPizza ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textMuted}
            />
          </View>
        </Pressable>

        {showPizza && (
          <View style={styles.section}>
            <ScorePips
              label="Crust"
              value={subScores.crust}
              onChange={(v) => setSubScore('crust', v)}
            />
            <ScorePips
              label="Char & bake"
              value={subScores.charBake}
              onChange={(v) => setSubScore('charBake', v)}
            />
            <ScorePips
              label="Sauce & cheese"
              value={subScores.sauceCheese}
              onChange={(v) => setSubScore('sauceCheese', v)}
            />
            <ScorePips
              label="Toppings"
              value={subScores.toppings}
              onChange={(v) => setSubScore('toppings', v)}
            />
          </View>
        )}

        {/* Experience breakdown */}
        <Pressable
          style={styles.sectionToggle}
          onPress={() => setShowExperience(!showExperience)}
        >
          <Text style={styles.sectionTitle}>The experience</Text>
          <View style={styles.sectionRight}>
            <Text style={styles.optionalLabel}>Optional</Text>
            <Ionicons
              name={showExperience ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textMuted}
            />
          </View>
        </Pressable>

        {showExperience && (
          <View style={styles.section}>
            <ScorePips
              label="Vibes"
              value={subScores.vibes}
              onChange={(v) => setSubScore('vibes', v)}
            />
            <ScorePips
              label="Service"
              value={subScores.service}
              onChange={(v) => setSubScore('service', v)}
            />
            <ScorePips
              label="Value"
              value={subScores.value}
              onChange={(v) => setSubScore('value', v)}
            />
          </View>
        )}

        {/* Send a friend */}
        <View style={styles.sendFriendSection}>
          <Text style={styles.sectionTitle}>Would you send a friend?</Text>
          <View style={styles.sendFriendOptions}>
            {SEND_FRIEND_OPTIONS.map((opt) => (
              <StickerChip
                key={opt}
                label={opt}
                selected={sendFriend === opt}
                onPress={() => setSendFriend(sendFriend === opt ? null : opt)}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        <PillButton
          label="Details"
          onPress={() =>
            router.push(
              editId
                ? { pathname: '/log/details', params: { editId } }
                : '/log/details'
            )
          }
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
    paddingBottom: spacing.lg,
  },
  sectionToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
  },
  sectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  optionalLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  section: {
    gap: spacing.xs,
  },
  sendFriendSection: {
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  sendFriendOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  bottom: {
    paddingHorizontal: spacing.lg,
  },
});
