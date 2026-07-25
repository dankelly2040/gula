import { useState } from 'react';
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
import { useProfile, useSaveProfile, useEnsureProfile, useAchievements } from '../../hooks/use-profile';
import { ACHIEVEMENT_DEFS, type AchievementType } from '../../db/types';
import { PIZZA_STYLES, type PizzaStyle } from '../../constants/enums';
import { colors, spacing, fontSize, radii } from '../../constants/theme';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: achievements } = useAchievements();
  const { ensureProfile } = useEnsureProfile();
  const { mutate: saveProfile } = useSaveProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [cityDraft, setCityDraft] = useState('');
  const [styleDraft, setStyleDraft] = useState<PizzaStyle | null>(null);

  const displayName = profile?.displayName || 'Pizza enthusiast';
  const earnedTypes = new Set(achievements?.map((a) => a.type) ?? []);
  const allBadges = Object.entries(ACHIEVEMENT_DEFS) as [
    AchievementType,
    (typeof ACHIEVEMENT_DEFS)[AchievementType],
  ][];

  const startEditing = () => {
    setNameDraft(profile?.displayName ?? '');
    setCityDraft(profile?.homeCity ?? '');
    setStyleDraft(profile?.favoriteStyle ?? null);
    setIsEditing(true);
  };

  const saveEdits = () => {
    const current = profile ?? ensureProfile();
    saveProfile({
      ...current,
      displayName: nameDraft.trim() || null,
      homeCity: cityDraft.trim() || null,
      favoriteStyle: styleDraft,
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

        <View style={styles.avatar}>
          <SymbolView
            name="person.crop.circle.fill"
            size={44}
            tintColor={colors.textMuted}
          />
        </View>

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
                <Pressable
                  key={style}
                  style={[styles.styleChip, styleDraft === style && styles.styleChipActive]}
                  onPress={() => setStyleDraft(styleDraft === style ? null : style)}
                >
                  <Text
                    style={[
                      styles.styleChipText,
                      styleDraft === style && styles.styleChipTextActive,
                    ]}
                  >
                    {style}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.editActions}>
              <Pressable style={styles.cancelButton} onPress={() => setIsEditing(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveButton} onPress={saveEdits}>
                <Text style={styles.saveButtonText}>Save</Text>
              </Pressable>
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
                <Ionicons name="pencil-outline" size={14} color={colors.brand} />
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
            <Text style={[styles.statValue, { color: colors.brand }]}>
              {profile?.currentStreak ?? 0}
            </Text>
            <Text style={styles.statLabel}>Week streak</Text>
          </View>
        </View>

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
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
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
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  editButtonText: {
    fontSize: fontSize.sm,
    color: colors.brand,
    fontWeight: '600',
  },
  editCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.xl,
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
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  styleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  styleChip: {
    backgroundColor: colors.bgInput,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  styleChipActive: {
    borderColor: colors.brand,
    backgroundColor: colors.bgCard,
  },
  styleChipText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: '600',
  },
  styleChipTextActive: {
    color: colors.brand,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  saveButtonText: {
    fontSize: fontSize.md,
    // White is allowed here: it sits on the brand fill.
    color: '#FFFDF8',
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    width: 100,
  },
  badgeLocked: {
    borderColor: colors.border,
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
