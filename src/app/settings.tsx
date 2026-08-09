import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Alert, Share, Text as RNText } from 'react-native';
import { useRouter } from 'expo-router';
import { goBack } from '../lib/nav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import {
  Host,
  Form,
  Section,
  Button,
  Text,
  Toggle,
  LabeledContent,
} from '@expo/ui/swift-ui';
import { useSessionStore } from '../state/session';
import { signOut } from '../lib/auth';
import { enableStreakReminders } from '../lib/notifications';
import { useEnsureProfile, useSaveProfile, useAchievements } from '../hooks/use-profile';
import { usePizzaLogs } from '../hooks/use-pizza-logs';
import { colors, spacing, fontSize, gradients } from '../constants/theme';

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const clearSession = useSessionStore((s) => s.clearSession);
  const email = useSessionStore((s) => s.email);
  const isAnonymous = useSessionStore((s) => s.isAnonymous);
  const cloudUnavailableReason = useSessionStore((s) => s.cloudUnavailableReason);
  const qc = useQueryClient();

  const { profile, ensureProfile } = useEnsureProfile();
  const { mutate: saveProfile } = useSaveProfile();
  const { data: logs } = usePizzaLogs();
  const { data: achievements } = useAchievements();

  const [remindersOn, setRemindersOn] = useState(false);

  const signedIn = !isAnonymous && !!email;

  useEffect(() => {
    Notifications.getAllScheduledNotificationsAsync()
      .then((scheduled) => setRemindersOn(scheduled.length > 0))
      .catch(() => {});
  }, []);

  const handleSignOut = async () => {
    await signOut();
    qc.clear();
    // The root layout guard redirects once the session clears.
  };

  const handleShareToggle = (isOn: boolean) => {
    const current = profile ?? ensureProfile();
    saveProfile({ ...current, shareWithCommunity: isOn });
  };

  const handleRemindersToggle = async (isOn: boolean) => {
    if (isOn) {
      const granted = await enableStreakReminders();
      setRemindersOn(granted);
      if (!granted) {
        Alert.alert(
          'Notifications are off',
          'Enable notifications for Local Pizza in system settings to get streak reminders.'
        );
      }
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
      setRemindersOn(false);
    }
  };

  const handleExport = async () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile: profile ?? null,
      logs: logs ?? [],
      achievements: achievements ?? [],
    };
    try {
      await Share.share({ message: JSON.stringify(payload, null, 2) });
    } catch {
      // User dismissed the share sheet, nothing to do.
    }
  };

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
        <Pressable onPress={() => goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={28} color={colors.textPrimary} />
        </Pressable>
        <RNText style={styles.title}>Settings</RNText>
        <View style={{ width: 28 }} />
      </View>

      <Host style={styles.host} useViewportSizeMeasurement>
        <Form>
          <Section
            title="Account"
            footer={
              cloudUnavailableReason ? (
                <Text>
                  Cloud sync is not enabled yet, so your data lives on this device for now.
                </Text>
              ) : undefined
            }
          >
            <LabeledContent label="Status">
              <Text>{signedIn ? email : 'Anonymous'}</Text>
            </LabeledContent>
            {signedIn ? (
              <Button label="Sign out" role="destructive" onPress={handleSignOut} />
            ) : (
              <Button label="Save your account" onPress={() => router.push('/sign-in')} />
            )}
          </Section>

          <Section
            title="Community"
            footer={<Text>Sharing is opt-in. Only shared logs appear to other pizza people.</Text>}
          >
            <Toggle
              label="Share my logs with the community"
              isOn={profile?.shareWithCommunity ?? false}
              onIsOnChange={handleShareToggle}
            />
          </Section>

          <Section
            title="Notifications"
            footer={<Text>A weekly nudge so your streak never dies of neglect.</Text>}
          >
            <Toggle
              label="Weekly streak reminder"
              isOn={remindersOn}
              onIsOnChange={(isOn) => void handleRemindersToggle(isOn)}
            />
          </Section>

          <Section title="Data" footer={<Text>Local Pizza v1.0.0, built with Expo</Text>}>
            <Button label="Export my data" onPress={() => void handleExport()} />
            <Button label="Clear all data" role="destructive" onPress={handleClearData} />
          </Section>
        </Form>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    experimental_backgroundImage: gradients.screen,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  host: {
    flex: 1,
  },
});
