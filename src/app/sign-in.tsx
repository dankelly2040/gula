import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Host, TextInput } from '@expo/ui';
import { SymbolView } from 'expo-symbols';
import { colors, spacing, fontSize, radii } from '../constants/theme';
import { useSessionStore } from '../state/session';
import { upgradeToEmail, requestEmailCode, verifyEmailCode } from '../lib/auth';
import { syncWithCloud } from '../db/sync';

type Step = 'email' | 'code' | 'done';

export default function SignIn() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const isAnonymous = useSessionStore((s) => s.isAnonymous);
  const cloudUnavailableReason = useSessionStore((s) => s.cloudUnavailableReason);
  const completeOnboarding = useSessionStore((s) => s.completeOnboarding);

  const isUpgrade = isAuthenticated && isAnonymous;
  const cloudUnavailable = cloudUnavailableReason !== null;

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      setError('Enter a valid email address');
      return;
    }
    setError(null);
    setLoading(true);
    const { error: err } = isUpgrade
      ? await upgradeToEmail(trimmed)
      : await requestEmailCode(trimmed);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setEmail(trimmed);
    setCode('');
    setStep('code');
  };

  const handleVerify = async () => {
    const trimmed = code.trim();
    if (trimmed.length !== 6) {
      setError('Enter the 6-digit code from your email');
      return;
    }
    setError(null);
    setLoading(true);
    const { error: err } = await verifyEmailCode(
      email,
      trimmed,
      isUpgrade ? 'email_change' : 'email'
    );
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    if (isUpgrade) {
      setStep('done');
    } else {
      completeOnboarding();
      void syncWithCloud();
      router.replace('/(tabs)');
    }
  };

  const title = isUpgrade ? 'Save your hall of fame' : 'Welcome back';
  const subtitle = isUpgrade
    ? 'Add an email so your logs, points, and streaks survive a lost phone.'
    : 'Sign in with your email to pick up where you left off.';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>

        {step === 'done' ? (
          <View style={styles.doneWrap}>
            <SymbolView
              name="checkmark.seal.fill"
              size={56}
              tintColor={colors.success}
              style={styles.doneSymbol}
            />
            <Text style={styles.title}>Check your inbox</Text>
            <Text style={styles.subtitle}>
              Your account is linked to {email}. Your hall of fame is safe.
            </Text>
            <Pressable style={styles.primaryButton} onPress={() => router.back()}>
              <Text style={styles.primaryButtonText}>Done</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            {cloudUnavailable && (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>
                  Cloud accounts are not enabled yet, your data stays on this device for now
                </Text>
              </View>
            )}

            {step === 'email' ? (
              <>
                <Text style={styles.inputLabel}>Email</Text>
                <Host matchContents style={styles.inputHost}>
                  <TextInput
                    defaultValue={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    editable={!cloudUnavailable && !loading}
                    onSubmitEditing={() => void handleSendCode()}
                    style={styles.inputInner}
                    textStyle={styles.inputText}
                    cursorColor={colors.brand}
                  />
                </Host>

                {error && <Text style={styles.errorText}>{error}</Text>}

                <Pressable
                  style={[
                    styles.primaryButton,
                    (cloudUnavailable || loading) && styles.primaryButtonDisabled,
                  ]}
                  onPress={handleSendCode}
                  disabled={cloudUnavailable || loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Send code</Text>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>We sent a 6-digit code to {email}</Text>
                <Host matchContents style={styles.inputHost}>
                  <TextInput
                    defaultValue={code}
                    onChangeText={setCode}
                    placeholder="123456"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoComplete="one-time-code"
                    editable={!cloudUnavailable && !loading}
                    onSubmitEditing={() => void handleVerify()}
                    style={styles.inputInner}
                    textStyle={styles.codeText}
                    cursorColor={colors.brand}
                  />
                </Host>

                {error && <Text style={styles.errorText}>{error}</Text>}

                <Pressable
                  style={[
                    styles.primaryButton,
                    (cloudUnavailable || loading) && styles.primaryButtonDisabled,
                  ]}
                  onPress={handleVerify}
                  disabled={cloudUnavailable || loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Verify</Text>
                  )}
                </Pressable>

                <Pressable
                  style={styles.linkButton}
                  onPress={() => {
                    setStep('email');
                    setCode('');
                    setError(null);
                  }}
                  disabled={loading}
                >
                  <Text style={styles.linkText}>Use a different email</Text>
                </Pressable>
              </>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.lg,
  },
  closeButton: {
    paddingVertical: spacing.sm,
  },
  closeText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
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
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  noticeBox: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  noticeText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  inputHost: {
    backgroundColor: colors.bgInput,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  inputInner: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  inputText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
  },
  codeText: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    letterSpacing: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.brand,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  linkText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  doneWrap: {
    alignItems: 'stretch',
    gap: spacing.sm,
    paddingTop: spacing.xxl,
  },
  doneSymbol: {
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
});
