import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, radii } from '../../constants/theme';
import { PIZZA_STYLES, type PizzaStyle } from '../../constants/enums';
import { useSessionStore } from '../../state/session';

export default function TasteSetter() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const completeOnboarding = useSessionStore((s) => s.completeOnboarding);
  const [selected, setSelected] = useState<PizzaStyle | null>(null);

  const handleContinue = () => {
    completeOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xxl }]}>
      <View style={styles.content}>
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
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable style={styles.primaryButton} onPress={handleContinue}>
          <Text style={styles.primaryButtonText}>
            {selected ? 'Continue' : 'Skip for now'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'space-between',
  },
  content: {
    paddingHorizontal: spacing.lg,
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
  bottom: {
    paddingHorizontal: spacing.lg,
  },
  primaryButton: {
    backgroundColor: colors.brand,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
