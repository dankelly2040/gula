import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type HostInstance } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaptureStatus, CaptureTitle, captureShape } from './capture-chrome';
import { Canvas, Fill, ImageShader, Shader, Skia, useImage } from '@shopify/react-native-skia';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { LiftState } from '../state/draft-log';
import { colors, spacing } from '../constants/theme';

export type Rect = { x: number; y: number; width: number; height: number };

/**
 * The slice-lift moment, played over the rate screen right after a snap.
 *
 * Three beats, timed from the PlateDiary reference:
 *   1. Freeze: the photo holds still in the capture card ("Lifting your slice")
 *      for at least FREEZE_MS while Vision finds the subject.
 *   2. Dissolve: the background crumbles into dark specks (a per-cell noise
 *      threshold in a Skia shader) while the cutout stays put on top.
 *   3. Glide: the cutout springs from where it sat in the photo into the
 *      hero slot on the rate screen, growing a sticker shadow as it lands.
 *
 * Without a cutout (no subject found, or an old native build) the whole
 * photo glides instead, so the flow never dead-ends.
 */

// The capture screen already held the photo still; this is only settling time.
const FREEZE_MS = 120;
const DISSOLVE_MS = 750;

// Pixel-dust dissolve. Each `cell`-sized square gets a random erase time,
// nudged later towards the bottom so the dust reads as falling. Over its
// short erase window a cell shrinks into an ink speck, drifts down, and goes.
const DUST = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform float progress;
uniform float2 res;
uniform float cell;

float hash(float2 p) {
  return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453);
}

half4 main(float2 xy) {
  float2 id = floor(xy / cell);
  float order = hash(id) * 0.85 + (xy.y / res.y) * 0.15;
  float t = progress * 1.25;
  if (order > t) {
    return image.eval(xy);
  }
  float k = clamp((t - order) / 0.22, 0.0, 1.0);
  if (k >= 1.0) {
    return half4(0.0);
  }
  float2 local = fract(xy / cell) - 0.5;
  local.y -= k * 0.35;
  float size = mix(0.5, 0.08, k);
  if (max(abs(local.x), abs(local.y)) > size) {
    return half4(0.0);
  }
  half4 col = image.eval(xy);
  half4 ink = half4(0.29, 0.25, 0.21, 1.0);
  return mix(col, ink, half(k)) * half(1.0 - k * 0.5);
}
`);

type Stage = 'frozen' | 'dissolve' | 'glide';

type Props = {
  photoUri: string;
  lift: LiftState;
  /** Where the cutout should land, in window coordinates. */
  target: Rect | null;
  /** Fired when the glide starts, so the screen underneath can fade in. */
  onLanding: () => void;
  /** Fired once the cutout has settled; the parent then shows its own hero. */
  onDone: () => void;
};

export function SliceLift({ photoUri, lift, target, onLanding, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const rootRef = useRef<HostInstance>(null);
  const viewportRef = useRef<HostInstance>(null);
  const [rootOrigin, setRootOrigin] = useState<{ x: number; y: number } | null>(null);
  const [viewport, setViewport] = useState<Rect | null>(null);
  const [frozenLongEnough, setFrozenLongEnough] = useState(false);
  const [dissolved, setDissolved] = useState(false);

  const result = lift.status === 'done' ? lift.result : null;
  const uprightUri = result?.photoUri ?? photoUri;
  const cutoutUri = result?.cutoutUri ?? null;
  const hasCutout = cutoutUri !== null && result?.box != null;
  const skPhoto = useImage(uprightUri);

  // The stage is derived, not stored: beat 1 ends when Vision has answered
  // and the freeze has had its moment; beat 2 is skipped without a cutout or
  // a compiled shader (Make returns null on a compile error).
  // With a cutout, also wait for Skia to have the photo decoded, so the
  // dissolve starts from a fully drawn frame rather than part-way through.
  const skiaReady = !(hasCutout && DUST) || skPhoto !== null;
  const ready = frozenLongEnough && lift.status === 'done' && viewport !== null && skiaReady;
  const stage: Stage = !ready ? 'frozen' : hasCutout && DUST && !dissolved ? 'dissolve' : 'glide';
  const from = useMemo<Rect | null>(() => {
    if (!ready || !viewport) return null;
    return result?.box && hasCutout
      ? subjectRectInViewport(viewport, result.width, result.height, result.box)
      : viewport;
  }, [ready, viewport, result, hasCutout]);

  const progress = useSharedValue(0);
  const glide = useSharedValue(0);
  const cardOpacity = useSharedValue(1);

  useEffect(() => {
    const id = setTimeout(() => setFrozenLongEnough(true), FREEZE_MS);
    return () => clearTimeout(id);
  }, []);

  // Window coordinates for both the root (to place the flyer) and the
  // viewport (to place the subject); the hero target arrives the same way.
  const measure = useCallback(() => {
    rootRef.current?.measureInWindow((x, y) => setRootOrigin({ x, y }));
    viewportRef.current?.measureInWindow((x, y, width, height) =>
      setViewport({ x, y, width, height })
    );
  }, []);

  // Beat 2: crumble the background.
  useEffect(() => {
    if (stage !== 'dissolve') return;
    progress.value = withTiming(
      1,
      { duration: DISSOLVE_MS, easing: Easing.inOut(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(setDissolved)(true);
      }
    );
  }, [stage, progress]);

  // Beat 3: spring the cutout into the hero slot.
  useEffect(() => {
    if (stage !== 'glide' || !target || !from) return;
    onLanding();
    cardOpacity.value = withTiming(0, { duration: 260 });
    glide.value = withSpring(1, { damping: 15, stiffness: 140, mass: 0.9 }, (finished) => {
      if (finished) runOnJS(onDone)();
    });
  }, [stage, target, from, glide, cardOpacity, onLanding, onDone]);

  const uniforms = useDerivedValue(() => ({
    progress: progress.value,
    res: [viewport?.width ?? 1, viewport?.height ?? 1],
    cell: 9,
  }));

  const cardStyle = useAnimatedStyle(() => ({ opacity: cardOpacity.value }));

  const to = target;
  const origin = rootOrigin;
  const flyerStyle = useAnimatedStyle(() => {
    if (!from || !origin) return { opacity: 0 };
    const dest = to ?? from;
    const k = glide.value;
    return {
      opacity: 1,
      left: from.x - origin.x + (dest.x - from.x) * k,
      top: from.y - origin.y + (dest.y - from.y) * k,
      width: from.width + (dest.width - from.width) * k,
      height: from.height + (dest.height - from.height) * k,
    };
  });
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: 0.28 * glide.value,
    transform: [{ translateY: 3 * glide.value }],
  }));

  const showPhotoStill = stage === 'frozen' || (stage === 'dissolve' && !skPhoto);
  const flyerUri = cutoutUri ?? uprightUri;

  return (
    <View
      ref={rootRef}
      pointerEvents="none"
      style={[styles.root, { paddingTop: insets.top + spacing.md }]}
      onLayout={measure}
    >
      <Animated.View style={[styles.column, cardStyle]}>
        <CaptureTitle />
        <View ref={viewportRef} style={[captureShape.viewport, styles.viewport]} onLayout={measure}>
            {showPhotoStill && (
              <Image source={{ uri: uprightUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            )}
            {stage === 'dissolve' && DUST && skPhoto && viewport && (
              <Canvas style={{ width: viewport.width, height: viewport.height }}>
                <Fill>
                  <Shader source={DUST} uniforms={uniforms}>
                    <ImageShader
                      image={skPhoto}
                      fit="cover"
                      rect={{ x: 0, y: 0, width: viewport.width, height: viewport.height }}
                    />
                  </Shader>
                </Fill>
              </Canvas>
            )}
        </View>
        <CaptureStatus>{stage === 'frozen' ? 'Lifting your slice' : 'Nice slice'}</CaptureStatus>
      </Animated.View>

      {stage !== 'frozen' && from && (
        <Animated.View style={[styles.flyer, flyerStyle]}>
          {cutoutUri && (
            <Animated.View style={[StyleSheet.absoluteFill, shadowStyle]}>
              <Image
                source={{ uri: flyerUri }}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
                tintColor={colors.ink}
              />
            </Animated.View>
          )}
          <Image
            source={{ uri: flyerUri }}
            style={StyleSheet.absoluteFill}
            contentFit={cutoutUri ? 'contain' : 'cover'}
          />
        </Animated.View>
      )}
    </View>
  );
}

/**
 * Where the subject sits on screen. The photo is drawn with `cover` inside the
 * viewport, so map the normalised box through that scale and crop, then clamp
 * to the visible area.
 */
function subjectRectInViewport(
  viewport: Rect,
  imageWidth: number,
  imageHeight: number,
  box: { x: number; y: number; width: number; height: number }
): Rect {
  const scale = Math.max(viewport.width / imageWidth, viewport.height / imageHeight);
  const drawnWidth = imageWidth * scale;
  const drawnHeight = imageHeight * scale;
  const offsetX = (viewport.width - drawnWidth) / 2;
  const offsetY = (viewport.height - drawnHeight) / 2;
  const left = Math.max(0, offsetX + box.x * drawnWidth);
  const top = Math.max(0, offsetY + box.y * drawnHeight);
  const right = Math.min(viewport.width, offsetX + (box.x + box.width) * drawnWidth);
  const bottom = Math.min(viewport.height, offsetY + (box.y + box.height) * drawnHeight);
  return {
    x: viewport.x + left,
    y: viewport.y + top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    paddingHorizontal: spacing.lg,
  },
  column: {
    alignItems: 'center',
  },
  // The shape comes from capture-chrome, shared with the capture screen so
  // the photo does not jump between routes. White, not the camera's dark:
  // the dust reveals a blank sheet.
  viewport: {
    backgroundColor: colors.surface,
  },
  flyer: {
    position: 'absolute',
  },
});
