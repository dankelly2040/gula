import { Stack } from 'expo-router';
import { colors } from '../../constants/theme';

// One screen: the first-run pager (index).
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
