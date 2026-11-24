import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cubicBezier,
  useAnimatedStyle,
  type CSSAnimationKeyframes,
  type SharedValue,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SliceArt } from './onboarding-art';
import { cutoutUriFor } from '../lib/cutouts';
import { getZoneForScore } from '../constants/enums';
import {
  colors,
  fonts,
  illustration,
  radii,
  spacing,
  STICKER_SHADOW_RGB,
} from '../constants/theme';
import type { PizzaLog } from '../db/types';

// A logged pizza as an object, not a row: the pizza hangs in the air above a
// soft ground shadow, tilted in perspective, with the restaurant and the
// score underneath. No card, no border.
//
// The look follows an editorial slice chart: real slices cut out on a clean
// ground, a soft shadow in each slice's own shape, and a small uppercase
// label. The chart's curved leader line was tried here and taken out: under
// a pizza that is already centered over its name it pointed at nothing.
//
// What floats, best first:
//   1. the cutout lifted from the photo (the pizza itself, on transparency),
//      over a blurred shadow of its own outline
//   2. the photo, cropped round like a pie with a crust rim
//   3. the illustrated slice, when the log has no photo
// The drawn fallbacks (2 and 3) get an extruded crust edge and a ground
// ellipse instead, since they have no photographic depth of their own.
//
// The 3D is three cheap layers, all transform and opacity on the UI thread:
//   - a slow bob (CSS keyframes, looping) with the ground shadow tightening
//     as the pizza rises
//   - a perspective tilt that follows the item's place in the scroll view,
//     so the grid turns as it moves under the finger
//   - on a real phone, a few more degrees from gravity, so tilting the
//     device looks around the pizza. The simulator reports no gravity.
// Reduced motion drops the bob and the gravity term and keeps a fixed tilt.

export const FLOAT_STAGE = 150;
/** Stage, gap, name line, score line. The list uses this for row math. */
export const FLOAT_ITEM_HEIGHT = FLOAT_STAGE + 4 + 22 + 30;

const OBJECT = 128;
const DISC = 118;
const EDGE = 6; // visible thickness of the extruded edge
const BOB = 5;
const BOB_MS = 2600;

const EASE_IN_OUT = cubicBezier(0.45, 0, 0.55, 1);

const RISE_AND_FALL: CSSAnimationKeyframes = {
  from: { transform: [{ translateY: -BOB }] },
  to: { transform: [{ translateY: BOB }] },
};

// High pizza: small, faint shadow. Low pizza: wide, dark shadow.
const SHADOW_BREATHE: CSSAnimationKeyframes = {
  from: { opacity: 0.55, transform: [{ scaleX: 0.8 }] },
  to: { opacity: 1, transform: [{ scaleX: 1 }] },
};

// A cutout's shadow is the cutout again, inked, in three faint layers that
// spread as they fall. Stacked, they read as one soft shadow in the slice's
// own shape. (An image blur would be simpler, but it is not applied to a
// tinted image on iOS.)
const SHADOW_LAYERS = [
  { x: 2, y: 6, scale: 1, opacity: 0.1 },
  { x: 4, y: 10, scale: 1.02, opacity: 0.08 },
  { x: 6, y: 15, scale: 1.05, opacity: 0.06 },
] as const;

type Gravity = { x: number; y: number; z: number };

type Props = {
  log: PizzaLog;
  rank?: number;
  index: number;
  width: number;
  /** Top of this item's row inside the list content. */
  rowTop: number;
  scrollY: SharedValue<number>;
  viewportHeight: SharedValue<number>;
  /** Device gravity (Reanimated sensor value). Only read, never written. */
  gravity: { get: () => Gravity } | null;
  still: boolean;
};

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.max(min, Math.min(max, value));
}

export function FloatingPizza({
  log,
  rank,
  index,
  width,
  rowTop,
  scrollY,
  viewportHeight,
  gravity,
  still,
}: Props) {
  const router = useRouter();
  const zone = getZoneForScore(log.moneyShot);
  const name = log.spotName ?? 'Unknown spot';

  const cutoutUri = cutoutUriFor(log.id);
  // The local photo goes stale when iOS renumbers the app container; the
  // uploaded copy survives.
  const photoUri = log.photoUri ?? log.photoUrl;
  const [cutoutBroken, setCutoutBroken] = useState(false);
  const [photoBroken, setPhotoBroken] = useState(false);
  const kind: 'cutout' | 'photo' | 'art' =
    cutoutUri && !cutoutBroken ? 'cutout' : photoUri && !photoBroken ? 'photo' : 'art';

  // Left column turns toward the right, right column toward the left, so a
  // row of two faces inward. A small roll keeps neighbors from matching.
  const leftColumn = index % 2 === 0;
  const yaw = leftColumn ? 11 : -11;
  const roll = [-5, 4, 3, -4][index % 4];
  const center = rowTop + FLOAT_STAGE / 2;

  const tilt = useAnimatedStyle(() => {
    const half = Math.max(viewportHeight.get() / 2, 1);
    // -1 at the top of the viewport, +1 at the bottom.
    const place = clamp((center - scrollY.get() - half) / half, -1, 1);

    let lookX = 0;
    let lookY = 0;
    if (gravity && !still) {
      const g = gravity.get();
      if (g.x !== 0 || g.y !== 0 || g.z !== 0) {
        lookY = clamp((g.x / 9.81) * 28, -14, 14);
        // A phone in the hand rests around y = -6.4; lean from there.
        lookX = clamp(((g.y + 6.4) / 9.81) * -24, -10, 10);
      }
    }

    return {
      transform: [
        { perspective: 520 },
        { rotateX: `${24 - place * 13 + lookX}deg` },
        { rotateY: `${yaw + lookY}deg` },
        { rotateZ: `${roll}deg` },
      ],
    };
  });

  const phase = (index * 430) % BOB_MS;
  const loop = (name_: CSSAnimationKeyframes) =>
    still
      ? null
      : ({
          animationName: name_,
          animationDuration: `${BOB_MS}ms`,
          animationDelay: `${phase}ms`,
          animationTimingFunction: EASE_IN_OUT,
          animationIterationCount: 'infinite',
          animationDirection: 'alternate',
          animationFillMode: 'both',
        } as const);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${rank != null ? `Number ${rank}, ` : ''}${name}, ${log.moneyShot} ${zone.label}`}
      onPress={() => router.push(`/pizza/${log.id}`)}
      style={{ width }}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.item,
            { transform: [{ scale: pressed ? 0.96 : 1 }] },
            PRESS_TRANSITION,
          ]}
        >
          <View style={styles.stage}>
            {kind !== 'cutout' && (
              <Animated.View style={[styles.groundShadow, loop(SHADOW_BREATHE)]} />
            )}

            <Animated.View style={loop(RISE_AND_FALL)}>
              <Animated.View style={[styles.object, tilt]}>
                {kind === 'cutout' && (
                  <>
                    {SHADOW_LAYERS.map((layer) => (
                      <Image
                        key={layer.y}
                        source={{ uri: cutoutUri! }}
                        style={[
                          imageStyles.fill,
                          {
                            opacity: layer.opacity,
                            transform: [
                              { translateX: layer.x },
                              { translateY: layer.y },
                              { scale: layer.scale },
                            ],
                          },
                        ]}
                        contentFit="contain"
                        tintColor={colors.ink}
                      />
                    ))}
                    <Image
                      source={{ uri: cutoutUri! }}
                      style={imageStyles.fill}
                      contentFit="contain"
                      onError={() => setCutoutBroken(true)}
                    />
                  </>
                )}

                {kind === 'photo' && (
                  <>
                    <View style={[styles.disc, styles.discEdge, styles.edgeOffset]} />
                    <View style={[styles.disc, styles.discRim]}>
                      <Image
                        source={{ uri: photoUri! }}
                        style={imageStyles.discPhoto}
                        contentFit="cover"
                        onError={() => setPhotoBroken(true)}
                      />
                    </View>
                  </>
                )}

                {kind === 'art' && (
                  <>
                    <View style={[StyleSheet.absoluteFill, styles.edgeOffset]}>
                      <SliceArt size={OBJECT} mono={illustration.crust} />
                    </View>
                    <SliceArt size={OBJECT} />
                  </>
                )}
              </Animated.View>
            </Animated.View>

            {rank != null && (
              <View style={[styles.rank, rank === 1 && styles.rankFirst]}>
                <Text style={[styles.rankText, rank === 1 && styles.rankTextFirst]}>{rank}</Text>
              </View>
            )}
          </View>

          <View style={styles.labelRow}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={[styles.score, { color: zone.color }]}>{log.moneyShot}</Text>
            <Text style={[styles.zone, { color: zone.color }]}>{zone.label}</Text>
          </View>
        </Animated.View>
      )}
    </Pressable>
  );
}

// Press feedback: a quick squeeze, as a CSS transition on the UI thread.
const PRESS_TRANSITION = {
  transitionProperty: 'transform',
  transitionDuration: '120ms',
} as const;

const imageStyles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  discPhoto: {
    flex: 1,
    borderRadius: DISC / 2,
  },
});

const styles = StyleSheet.create({
  item: {
    alignItems: 'center',
    height: FLOAT_ITEM_HEIGHT,
  },
  stage: {
    width: '100%',
    height: FLOAT_STAGE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  // A soft ellipse on the "floor" under the pizza. The gap between it and
  // the pizza is what reads as height.
  groundShadow: {
    position: 'absolute',
    bottom: 8,
    width: 58,
    height: 6,
    borderRadius: 29,
    backgroundColor: `rgba(${STICKER_SHADOW_RGB}, 0.16)`,
    boxShadow: `0 0 14px 9px rgba(${STICKER_SHADOW_RGB}, 0.16)`,
  },
  object: {
    width: OBJECT,
    height: OBJECT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  // The same shape again, pushed down: the pizza's front edge.
  edgeOffset: {
    transform: [{ translateY: EDGE }],
  },
  disc: {
    position: 'absolute',
    width: DISC,
    height: DISC,
    borderRadius: DISC / 2,
  },
  discEdge: {
    backgroundColor: illustration.crust,
  },
  discRim: {
    backgroundColor: illustration.crustLight,
    padding: 6,
  },
  rank: {
    position: 'absolute',
    top: 4,
    left: spacing.md,
    minWidth: 28,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
  },
  rankFirst: {
    backgroundColor: colors.gold,
  },
  rankText: {
    fontFamily: fonts.display,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textPrimary,
  },
  rankTextFirst: {
    color: colors.surface,
  },
  labelRow: {
    height: 22,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  name: {
    flexShrink: 1,
    fontFamily: fonts.label,
    fontSize: 11,
    lineHeight: 22,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.textPrimary,
  },
  scoreRow: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 6,
  },
  score: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 30,
  },
  zone: {
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
