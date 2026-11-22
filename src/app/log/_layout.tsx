import { Stack } from 'expo-router';
import { colors } from '../../constants/theme';

export default function LogLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    >
      {/* Rate takes over in place after a snap; a slide would move the card. */}
      <Stack.Screen name="rate" options={{ animation: 'none' }} />
    </Stack>
  );
}
