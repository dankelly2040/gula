import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useProfile, useSaveProfile, useEnsureProfile, useAchievements } from '../../hooks/use-profile';
import { usePizzaLogs } from '../../hooks/use-pizza-logs';
import { ACHIEVEMENT_DEFS, type AchievementType } from '../../db/types';
import { PIZZA_STYLES, type PizzaStyle } from '../../constants/enums';
import { PillButton, StickerChip } from '../../components/sticker';
import { ActiveDaysCalendar } from '../../components/active-days-calendar';
import { colors, spacing, fontSize, radii, sticker } from '../../constants/theme';
import { useObserve } from 'expo-observe';

export default function Profile() {
  const { markInteractive } = useObserve();
  useEffect(() => {
    markInteractive();
  }, [markInteractive]);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: achievements } = useAchievements();
  const { data: logs } = usePizzaLogs();
  const { ensureProfile } = useEnsureProfile();
  const { mutate: saveProfile } = useSaveProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [cityDraft, setCityDraft] = useState('');
  const [styleDraft, setStyleDraft] = useState<PizzaStyle | null>(null);
  const [avatarDraft, setAvatarDraft] = useState<string | null>(null);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarDraft(result.assets[0].uri);
    }
  };

  const displayName = profile?.displayName || 'Pizza enthusiast';
  const allLogs = logs ?? [];
  // Streaks live in the calendar below, so the top row stays lifetime totals.
  const spotsVisited = new Set(
    allLogs
      .map((l) => l.spotId ?? l.spotName?.trim().toLowerCase())
      .filter((s): s is string => Boolean(s))
  ).size;
  const earnedTypes = new Set(achievements?.map((a) => a.type) ?? []);
  const allBadges = Object.entries(ACHIEVEMENT_DEFS) as [
    AchievementType,
    (typeof ACHIEVEMENT_DEFS)[AchievementType],
  ][];

  const startEditing = () => {
    setNameDraft(profile?.displayName ?? '');
    setCityDraft(profile?.homeCity ?? '');
    setStyleDraft(profile?.favoriteStyle ?? null);
    setAvatarDraft(profile?.avatarUrl ?? null);
    setIsEditing(true);
  };

  const saveEdits = () => {
    const current = profile ?? ensureProfile();
    saveProfile({
      ...current,
      displayName: nameDraft.trim() || null,
      homeCity: cityDraft.trim() || null,
      favoriteStyle: styleDraft,
      avatarUrl: avatarDraft,
    });
    setIsEditing(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { paddingTop: insets.top + spacing.lg }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Profile</Text>
          <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
            <Ionicons name="settings-outline" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <Pressable
          style={styles.avatar}
          onPress={isEditing ? pickAvatar : undefined}
          disabled={!isEditing}
        >
          {(isEditing ? avatarDraft : profile?.avatarUrl) ? (
            <Image
              source={{ uri: (isEditing ? avatarDraft : profile?.avatarUrl)! }}
              style={styles.avatarImage}
              contentFit="cover"
            />
          ) : (
            <SymbolView
              name="person.crop.circle.fill"
              size={44}
              tintColor={colors.textMuted}
            />
          )}
          {isEditing && (
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" size={14} color="#FFFEF4" />
            </View>
          )}
        </Pressable>

        {isEditing ? (
          <View style={styles.editCard}>
            <Text style={styles.editLabel}>Display name</Text>
            <TextInput
              style={styles.input}
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="Pizza enthusiast"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />
            <Text style={styles.editLabel}>Home city</Text>
            <TextInput
              style={styles.input}
              value={cityDraft}
              onChangeText={setCityDraft}
              placeholder="New York"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />
            <Text style={styles.editLabel}>Favorite style</Text>
            <View style={styles.styleRow}>
              {PIZZA_STYLES.map((style) => (
                <StickerChip
                  key={style}
                  label={style}
                  selected={styleDraft === style}
                  onPress={() => setStyleDraft(styleDraft === style ? null : style)}
                />
              ))}
            </View>
            <View style={styles.editActions}>
              <PillButton
                onPress={() => setIsEditing(false)}
                label="Cancel"
                variant="quiet"
                style={styles.editActionButton}
              />
              <PillButton onPress={saveEdits} label="Save" style={styles.editActionButton} />
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.name}>{displayName}</Text>
            {profile?.homeCity ? (
              <Text style={styles.homeCity}>{profile.homeCity}</Text>
            ) : null}
            <View style={styles.metaRow}>
              {profile?.favoriteStyle ? (
                <View style={styles.favoriteChip}>
                  <Text style={styles.favoriteChipText}>{profile.favoriteStyle}</Text>
                </View>
              ) : null}
              <Pressable style={styles.editButton} onPress={startEditing} hitSlop={4}>
                <Ionicons name="pencil-outline" size={14} color={colors.ink} />
                <Text style={styles.editButtonText}>Edit profile</Text>
              </Pressable>
            </View>
          </>
        )}

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile?.totalLogs ?? 0}</Text>
            <Text style={styles.statLabel}>Slices logged</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.gold }]}>
              {profile?.totalPoints ?? 0}
            </Text>
            <Text style={styles.statLabel}>Total points</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.brand }]}>{spotsVisited}</Text>
            <Text style={styles.statLabel}>Spots visited</Text>
          </View>
        </View>

        <ActiveDaysCalendar logs={allLogs} />

        <Pressable style={styles.leaderboardRow} onPress={() => router.push('/leaderboard')}>
          <SymbolView name="trophy.fill" size={22} tintColor={colors.gold} />
          <View style={styles.leaderboardText}>
            <Text style={styles.leaderboardTitle}>Leaderboard</Text>
            <Text style={styles.leaderboardSubtitle}>See how you rank this month</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        <View style={styles.badges}>
          <Text style={styles.sectionTitle}>Badges</Text>
          <View style={styles.badgeGrid}>
            {allBadges.map(([type, def]) => {
              const earned = earnedTypes.has(type);
              const tint = !earned
                ? colors.textMuted
                : type === 'nirvana'
                  ? colors.gold
                  : colors.brand;
              return (
                <View key={type} style={[styles.badge, !earned && styles.badgeLocked]}>
                  <SymbolView
                    name={def.symbol}
                    size={28}
                    tintColor={tint}
                    style={[styles.badgeSymbol, !earned && styles.badgeSymbolLocked]}
                  />
                  <Text style={[styles.badgeLabel, !earned && styles.badgeLabelLocked]}>
                    {def.title}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bgCard,
  },
  name: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  homeCity: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  // Passive display of the favorite style, not tappable, so it stays neutral.
  favoriteChip: {
    backgroundColor: colors.bgElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  favoriteChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  // Light StickerChip-like affordance; ink text keeps it quiet.
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    ...sticker.border,
    ...sticker.shadowSm,
  },
  editButtonText: {
    fontSize: fontSize.sm,
    color: colors.ink,
    fontWeight: '700',
  },
  editCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    ...sticker.border,
    ...sticker.shadowSm,
  },
  editLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.bgInput,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    ...sticker.border,
  },
  styleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  // Compact pills so the pair sits comfortably inside the edit card.
  editActionButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    ...sticker.border,
    ...sticker.shadowSm,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: '600',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
    ...sticker.border,
    ...sticker.shadowSm,
  },
  leaderboardText: {
    flex: 1,
    gap: 2,
  },
  leaderboardTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  leaderboardSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  badges: {},
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badge: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    width: 100,
    ...sticker.border,
    ...sticker.shadowSm,
  },
  // Locked badges read recessed: soft border, no ink, no hard shadow.
  badgeLocked: {
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
    borderWidth: 1,
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.45,
  },
  badgeSymbol: {
    marginBottom: spacing.xs,
  },
  badgeSymbolLocked: {
    opacity: 0.6,
  },
  badgeLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  badgeLabelLocked: {
    color: colors.textMuted,
  },
});
