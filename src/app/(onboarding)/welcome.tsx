import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, radii } from '../../constants/theme';

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xxl }]}>
      <View style={styles.hero}>
        <Text style={styles.logo}>🍕</Text>
        <Text style={styles.title}>Gula</Text>
        <Text style={styles.subtitle}>
          Rate every slice from Vom to Nirvana{'\n'}and build your pizza hall of fame.
        </Text>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push('/(onboarding)/taste')}
        >
          <Text style={styles.primaryButtonText}>Log your first slice</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push('/(onboarding)/taste')}
        >
          <Text style={styles.secondaryButtonText}>I already have an account</Text>
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
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  logo: {
    fontSize: 80,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.hero,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 28,
  },
  bottom: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
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
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
});
