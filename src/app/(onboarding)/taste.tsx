import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, radii } from '../../constants/theme';
import { PIZZA_STYLES, type PizzaStyle } from '../../constants/enums';
import { useSessionStore } from '../../state/session';
import { useEnsureProfile, useSaveProfile } from '../../hooks/use-profile';

export default function TasteSetter() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const completeOnboarding = useSessionStore((s) => s.completeOnboarding);
  const { ensureProfile } = useEnsureProfile();
  const saveProfile = useSaveProfile();
  const [selected, setSelected] = useState<PizzaStyle | null>(null);
  const [homeCity, setHomeCity] = useState('');
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const profile = ensureProfile();
      await saveProfile.mutateAsync({
        ...profile,
        favoriteStyle: selected,
        homeCity: homeCity.trim() || null,
      });
    } finally {
      setSaving(false);
    }
    completeOnboarding();
    router.replace('/log/capture');
  };

  const handleSkip = () => {
    completeOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>What's your go-to style?</Text>
        <Text style={styles.subtitle}>Pick your favorite (you can always change this)</Text>

        <View style={styles.grid}>
          {PIZZA_STYLES.map((style) => (
            <Pressable
              key={style}
              style={[styles.chip, selected === style && styles.chipSelected]}
              onPress={() => setSelected(style)}
            >
              <Text
                style={[styles.chipText, selected === style && styles.chipTextSelected]}
              >
                {style}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.inputLabel}>Home city (optional)</Text>
        <TextInput
          style={styles.input}
          value={homeCity}
          onChangeText={setHomeCity}
          placeholder="Where do you eat most of your pizza?"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
        />
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable
          style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
          onPress={handleContinue}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Continue</Text>
          )}
        </Pressable>

        <Pressable style={styles.skipButton} onPress={handleSkip} disabled={saving}>
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  chipSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brand + '20',
  },
  chipText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.brand,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.bgInput,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  bottom: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.brand,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
});
