import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PillButton } from '../components/sticker';
import { colors, fonts, spacing, fontSize, shape } from '../constants/theme';
import { getProfile } from '../db/local-store';
import { cleanDisplayName, NAME_MAX } from '../features/display-name';
import { blankProfile, useProfile, useSaveProfile } from '../hooks/use-profile';
import { goBack } from '../lib/nav';
import { useSessionStore } from '../state/session';

// The name a player shows on the leaderboard. Without it every new player is
// "Pizza enthusiast" and nobody can tell their friends apart.
//
// `intent=first-log` is the step between the first reward and the account
// prompt: the points have just landed, so a name for them is an easy ask.
// Opened any other way (the leaderboard's "Add your name"), it saves and goes
// back. The name is never required: the top-right control leaves without one.

export default function Name() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ intent?: string; points?: string }>();
  const afterFirstLog = params.intent === 'first-log';
  const earned = Number(params.points) || 0;

  const userId = useSessionStore((s) => s.userId);
  const isAnonymous = useSessionStore((s) => s.isAnonymous);
  const markAccountPromptSeen = useSessionStore((s) => s.markAccountPromptSeen);
  const { data: profile, isFetched: profileLoaded } = useProfile();
  const { mutateAsync: saveProfile } = useSaveProfile();

  // Null until the player types, so a name they already have counts first.
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const stored = profile?.displayName ?? '';
  const name = cleanDisplayName(draft ?? stored);

  const next = () => {
    if (!afterFirstLog) {
      goBack();
    } else if (isAnonymous) {
      // No account yet: the account prompt is the last step of the first run.
      markAccountPromptSeen();
      router.replace({
        pathname: '/sign-in',
        params: { intent: 'first-log', points: String(earned) },
      });
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleSave = async () => {
    if (!name || saving) return;
    setSaving(true);
    try {
      // Read what is stored, not the cached query: the log that led here has
      // just changed the totals, and a stale copy would write them back.
      const current = await getProfile();
      await saveProfile({ ...(current ?? blankProfile(userId)), displayName: name });
    } finally {
      setSaving(false);
    }
    next();
  };

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
          <Pressable accessibilityRole="button" style={styles.leaveButton} hitSlop={8} onPress={next}>
            <Text style={styles.leaveText}>{afterFirstLog ? 'Skip' : 'Close'}</Text>
          </Pressable>
        </View>

        <Text style={styles.kicker}>The leaderboard</Text>
        <View style={styles.rule} />

        <Text accessibilityRole="header" style={styles.title}>
          What do we call you?
        </Text>
        <Text style={styles.subtitle}>
          Your name goes on the leaderboard next to your Pizza Points. You can change it in your
          profile.
        </Text>

        {/* The field keeps its own text (`defaultValue`, not `value`), so no
            keystroke waits on a render. It mounts once the stored profile has
            been read, so a name the player already has is in it. */}
        {profileLoaded && (
          <TextInput
            accessibilityLabel="Your name"
            style={styles.input}
            defaultValue={stored}
            onChangeText={setDraft}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
            autoFocus
            autoCapitalize="words"
            autoCorrect={false}
            textContentType="nickname"
            maxLength={NAME_MAX}
            returnKeyType="done"
            selectionColor={colors.brand}
            onSubmitEditing={() => void handleSave()}
          />
        )}

        <PillButton
          label={afterFirstLog ? 'Continue' : 'Save name'}
          onPress={() => void handleSave()}
          disabled={!name || saving}
        />
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
  leaveButton: {
    paddingVertical: spacing.sm,
  },
  leaveText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  // The small line of a shop sign, with its red rule: the same pair that
  // opens the first-run screen.
  kicker: {
    fontFamily: fonts.label,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: colors.textPrimary,
  },
  rule: {
    width: 56,
    height: 3,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    backgroundColor: colors.brand,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 34,
    textTransform: 'uppercase',
    color: colors.brand,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.bgInput,
    borderRadius: shape.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
});
