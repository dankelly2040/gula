import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { PillButton } from '../../components/sticker';
import { colors, spacing, fontSize } from '../../constants/theme';
import { useEffect } from 'react';
import { useObserve } from 'expo-observe';

export default function Welcome() {
  const { markInteractive } = useObserve();
  useEffect(() => {
    markInteractive();
  }, [markInteractive]);

  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.hero}>
        <SymbolView
          name="fork.knife.circle.fill"
          size={72}
          tintColor={colors.brand}
          style={styles.logo}
        />
        <Text style={styles.title}>Gula</Text>
        <Text style={styles.subtitle}>
          Rate every slice from Vom to Nirvana{'\n'}and remember every pizza you eat.
        </Text>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        <PillButton
          label="Log a slice"
          onPress={() => router.push('/(onboarding)/taste')}
          style={styles.primaryButton}
        />

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push('/(onboarding)/intro')}
        >
          <Text style={styles.secondaryButtonText}>How it works</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push('/sign-in')}
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
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    // Lift the brand block slightly above geometric center so it reads as
    // optically centered against the CTA stack below.
    paddingBottom: spacing.xxl,
  },
  logo: {
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
    gap: spacing.sm,
  },
  primaryButton: {
    marginBottom: spacing.xs,
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
