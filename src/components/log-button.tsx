import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, radii, sticker } from '../constants/theme';

const SIZE = 64;
const LIFT = 50; // clears the tab bar's label row

/**
 * Bottom padding a scrolling tab screen should reserve so its last item can
 * clear the button. Without it the button sits on top of content, which is
 * how it covered the calendar on Profile.
 */
export const LOG_BUTTON_CLEARANCE = SIZE + LIFT + 16;

/**
 * The log action, floated over the tab bar.
 *
 * A native tab bar caps its glyph box at roughly 25-30pt, so a tab item can
 * never be the prominent centre button. This is a real view sitting above the
 * bar instead, which is why the log route is no longer a tab at all.
 */
export function LogButton() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const press = useSharedValue(0);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: press.value * 4 },
      { scale: 1 - press.value * 0.06 },
    ],
    // Ride the shadow down with the button so it reads as pressed into the page.
    shadowOffset: { width: 0, height: 7 - press.value * 5 },
  }));

  return (
    // box-none so only the button itself swallows touches; the tab bar
    // underneath stays tappable.
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, styles.overlay]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log a pizza"
        hitSlop={8}
        onPressIn={() => {
          press.value = withTiming(1, { duration: 90 });
          if (process.env.EXPO_OS === 'ios') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        }}
        onPressOut={() => {
          press.value = withSpring(0, { damping: 12, stiffness: 320 });
        }}
        onPress={() => router.push('/log/capture')}
        // Clear of the bar. Four tabs spread evenly put the centre of the bar
        // between Discover and Leaderboard, so a button sitting down at the
        // label row covers both.
        style={{ marginBottom: insets.bottom + LIFT }}
      >
        <Animated.View style={[styles.button, style]}>
          <SymbolView name="plus" size={30} weight="bold" tintColor={colors.surface} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
    ...sticker.border,
    ...sticker.shadowLg,
  },
});
