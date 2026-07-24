import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '../state/session';
import { colors, spacing, fontSize, radii } from '../constants/theme';

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const clearSession = useSessionStore((s) => s.clearSession);
  const qc = useQueryClient();

  const handleClearData = () => {
    Alert.alert(
      'Clear all data?',
      'This will delete all your logs and reset the app. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear everything',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            clearSession();
            qc.clear();
            router.replace('/');
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Status</Text>
          <Text style={styles.rowValue}>Local (no account yet)</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <Pressable style={styles.dangerRow} onPress={handleClearData}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
          <Text style={styles.dangerText}>Clear all data</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Gula v1.0.0</Text>
        <Text style={styles.footerText}>Built with Expo</Text>
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
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowLabel: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  rowValue: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgCard,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.danger + '30',
  },
  dangerText: {
    fontSize: fontSize.md,
    color: colors.danger,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
