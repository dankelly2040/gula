import * as Notifications from 'expo-notifications';

/**
 * Contextual notification opt-in after the first log (brief §5 step 6),
 * framed around streaks. Schedules a weekly local reminder when granted.
 */
export async function enableStreakReminders(): Promise<boolean> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return false;

    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Keep your streak alive 🍕',
        body: 'No slice logged this week yet. Your hall of fame misses you.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 6, // Friday
        hour: 18,
        minute: 0,
      },
    });
    return true;
  } catch {
    return false;
  }
}
