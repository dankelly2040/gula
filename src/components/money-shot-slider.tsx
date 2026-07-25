import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { MONEY_SHOT_ZONES, getZoneForScore } from '../constants/enums';
import { colors, spacing, fontSize, radii, sticker } from '../constants/theme';

type Props = {
  value: number;
  onChange: (value: number) => void;
};

const TRACK_HEIGHT = 12;
const THUMB_SIZE = 36;
const TRACK_PADDING = THUMB_SIZE / 2;

// Runs on the UI runtime inside the pan gesture, so it must be a worklet:
// calling a plain JS closure there throws under react-native-worklets 0.10+.
function clampValue(x: number, trackWidth: number): number {
  'worklet';
  const usable = trackWidth - THUMB_SIZE;
  if (usable <= 0) return 50;
  const clamped = Math.max(0, Math.min(x - TRACK_PADDING, usable));
  return Math.round((clamped / usable) * 100);
}

export function MoneyShotSlider({ value, onChange }: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const zone = getZoneForScore(value);
  const scale = useSharedValue(1);

  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  }, []);

  const gesture = Gesture.Pan()
    .onStart((e) => {
      scale.value = withSpring(1.3);
      const val = clampValue(e.x, trackWidth);
      runOnJS(onChange)(val);
      runOnJS(triggerHaptic)();
    })
    .onUpdate((e) => {
      const val = clampValue(e.x, trackWidth);
      runOnJS(onChange)(val);
    })
    .onEnd(() => {
      scale.value = withSpring(1);
      runOnJS(triggerHaptic)();
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const thumbLeft =
    trackWidth > 0 ? (value / 100) * (trackWidth - THUMB_SIZE) + TRACK_PADDING - THUMB_SIZE / 2 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Rate this pizza</Text>
        <View style={[styles.scoreBadge, { backgroundColor: zone.color + '30' }]}>
          <Text style={[styles.scoreText, { color: zone.color }]}>{value}</Text>
          <Text style={[styles.zoneText, { color: zone.color }]}>{zone.label}</Text>
        </View>
      </View>

      <GestureDetector gesture={gesture}>
        <View
          style={styles.trackContainer}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        >
          <View style={styles.track}>
            {MONEY_SHOT_ZONES.map((z) => (
              <View
                key={z.label}
                style={[
                  styles.zoneSegment,
                  {
                    backgroundColor: z.color,
                    flex: z.max - z.min,
                  },
                ]}
              />
            ))}
          </View>

          <View style={[styles.fill, { width: `${value}%` }]} />

          <Animated.View
            style={[
              styles.thumb,
              { left: thumbLeft, backgroundColor: zone.color },
              thumbStyle,
            ]}
          />
        </View>
      </GestureDetector>

      <View style={styles.zoneLabels}>
        <Text style={styles.zoneLabelText}>Vom</Text>
        <Text style={styles.zoneLabelText}>Nirvana</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  scoreText: {
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  zoneText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  trackContainer: {
    height: THUMB_SIZE + 20,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    flexDirection: 'row',
    overflow: 'hidden',
    // The yellow zones (Crave/Nirvana) vanish into the butter-yellow ground
    // below ~0.7; keep the base track strong.
    opacity: 0.7,
  },
  zoneSegment: {
    height: '100%',
  },
  fill: {
    position: 'absolute',
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: 'transparent',
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    // Ink ring plus hard offset shadow keeps the thumb in the sticker language.
    borderWidth: 2,
    borderColor: colors.ink,
    ...sticker.shadowSm,
  },
  zoneLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  zoneLabelText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
