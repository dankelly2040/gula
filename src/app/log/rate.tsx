import { View, Text, StyleSheet, Pressable, ScrollView, type HostInstance } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { goBack } from '../../lib/nav';
import { useCallback, useRef, useState } from 'react';
import { Image } from 'expo-image';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { SliceLift, type Rect } from '../../components/slice-lift';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MoneyShotSlider } from '../../components/money-shot-slider';
import { ScorePips } from '../../components/score-pips';
import { useDraftLogStore } from '../../state/draft-log';
import { SEND_FRIEND_OPTIONS } from '../../constants/enums';
import { PillButton, StickerChip } from '../../components/sticker';
import { colors, fonts, spacing, fontSize } from '../../constants/theme';

export default function Rate() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { editId, lift } = useLocalSearchParams<{ editId?: string; lift?: string }>();
  const photoUri = useDraftLogStore((s) => s.photoUri);
  const liftState = useDraftLogStore((s) => s.lift);
  const moneyShot = useDraftLogStore((s) => s.moneyShot);
  const setMoneyShot = useDraftLogStore((s) => s.setMoneyShot);
  const subScores = useDraftLogStore((s) => s.subScores);
  const setSubScore = useDraftLogStore((s) => s.setSubScore);
  const sendFriend = useDraftLogStore((s) => s.sendFriend);
  const setSendFriend = useDraftLogStore((s) => s.setSendFriend);

  const [showPizza, setShowPizza] = useState(false);
  const [showExperience, setShowExperience] = useState(false);

  // Slice lift: arriving straight from the shutter, the SliceLift overlay
  // owns the screen until the cutout has landed in the hero slot. The rest
  // of the form fades in as the glide starts.
  const [lifting, setLifting] = useState(lift === '1' && photoUri !== null);
  const [landing, setLanding] = useState(false);
  const [heroRect, setHeroRect] = useState<Rect | null>(null);
  const heroRef = useRef<HostInstance>(null);
  // Hidden while the overlay plays, fading in once the cutout starts its glide.
  const formStyle = useAnimatedStyle(() => ({
    opacity: !lifting || landing ? withTiming(1, { duration: 360 }) : 0,
  }));
  const measureHero = useCallback(() => {
    heroRef.current?.measureInWindow((x, y, width, height) =>
      setHeroRect({ x, y, width, height })
    );
  }, []);
  const handleLanding = useCallback(() => setLanding(true), []);
  const handleLiftDone = useCallback(() => setLifting(false), []);

  const liftResult = liftState.status === 'done' ? liftState.result : null;
  const heroUri = liftResult?.cutoutUri ?? liftResult?.photoUri ?? photoUri;
  const heroIsCutout = liftResult?.cutoutUri != null;

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <Animated.View style={[styles.header, formStyle]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => goBack()}>
          <Ionicons name="arrow-back" size={28} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Rate it</Text>
        <View style={{ width: 28 }} />
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {photoUri && (
          <View style={styles.hero}>
            <View ref={heroRef} style={styles.heroImageBox} onLayout={measureHero}>
              {!lifting && heroUri && heroIsCutout && (
                <Image
                  source={{ uri: heroUri }}
                  style={[StyleSheet.absoluteFill, styles.heroCutoutShadow]}
                  contentFit="contain"
                  tintColor={colors.ink}
                />
              )}
              {!lifting && heroUri && (
                <Image
                  source={{ uri: heroUri }}
                  style={StyleSheet.absoluteFill}
                  contentFit={heroIsCutout ? 'contain' : 'cover'}
                />
              )}
            </View>
            <Animated.View style={[styles.heroBadge, formStyle]}>
              <Text style={styles.heroBadgeText}>Your slice</Text>
            </Animated.View>
          </View>
        )}

        <Animated.View style={formStyle}>
        <MoneyShotSlider value={moneyShot} onChange={setMoneyShot} />

        {/* Pizza breakdown */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showPizza }}
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
          accessibilityRole="button"
          accessibilityState={{ expanded: showExperience }}
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
        </Animated.View>
      </ScrollView>

      <Animated.View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }, formStyle]}>
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
      </Animated.View>

      {lifting && photoUri && (
        <SliceLift
          photoUri={photoUri}
          lift={liftState}
          target={heroRect}
          onLanding={handleLanding}
          onDone={handleLiftDone}
        />
      )}
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
  // The landing pad for the lifted slice. The image box is transparent and
  // only measured; the caption above it fades in with the form.
  hero: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  heroImageBox: {
    width: 168,
    height: 150,
    marginVertical: spacing.md,
  },
  // A soft shadow in the slice's own shape: the cutout again, inked and faint.
  heroCutoutShadow: {
    opacity: 0.16,
    transform: [{ translateX: 3 }, { translateY: 8 }],
  },
  // A caption over the slice, in the sign capitals. No pill behind it.
  heroBadge: {
    position: 'absolute',
    top: -6,
  },
  heroBadgeText: {
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    // Room for the hero badge, which sits above the hero card's top edge.
    paddingTop: spacing.md,
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
