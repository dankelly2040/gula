import { Stack } from 'expo-router';
import { colors } from '../../constants/theme';

// Without an index route in this group, the router would otherwise land on
// the alphabetically first screen (intro). Welcome is the entry point.
export const unstable_settings = {
  initialRouteName: 'welcome',
};

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    />
  );
}
