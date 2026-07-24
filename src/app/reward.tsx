import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { colors, spacing, fontSize, radii } from '../constants/theme';

export default function Reward() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  return (
    <View style={styles.overlay}>
      <View style={[styles.card, { marginBottom: insets.bottom + spacing.lg }]}>
        <Text style={styles.emoji}>🏆</Text>
        <Text style={styles.title}>Slice logged!</Text>
        <Text style={styles.points}>+10 points</Text>
        <Text style={styles.message}>
          Your pizza hall of fame is growing. Keep logging to climb the ranks.
        </Text>
        <Pressable
          style={styles.button}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.buttonText}>View your hall of fame</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: colors.gold + '40',
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  points: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.gold,
    marginBottom: spacing.md,
  },
  message: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.brand,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
