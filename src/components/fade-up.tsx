import { useEffect, type ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

/**
 * Fade and rise, replayable.
 *
 * Reanimated's `entering` prop is the obvious way to do this, but driving it
 * by changing `key` to force a remount is a race: it plays on some reloads
 * and leaves the content stuck at opacity 0 on others. An explicit shared
 * value keyed on `runId` behaves the same way every time.
 */
export function FadeUp({
  delay = 0,
  runId,
  style,
  children,
}: {
  delay?: number;
  runId: number;
  style?: ViewStyle;
  children: ReactNode;
}) {
  const enter = useSharedValue(0);

  useEffect(() => {
    enter.value = 0;
    enter.value = withDelay(
      delay,
      withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) })
    );
  }, [delay, runId, enter]);

  const animated = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 12 }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
