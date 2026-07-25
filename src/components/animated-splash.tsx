// Animated launch splash: scattered pizza-topping particles flock together
// into a single pizza slice, hold a beat, then zoom/fade to reveal the app.
//
// Performance notes:
// - Exactly four shared values drive all ~96 particles (intro, form, drift,
//   wrapper scale) plus one overlay opacity. No per-particle shared values.
// - Per-particle motion is derived inside each style worklet from constants
//   precomputed once with a seeded PRNG (mulberry32), so layout is stable
//   across renders and there is no Math.random at render time.
// - Stagger is expressed by remapping the single `form` progress into a
//   per-particle window; spring-like overshoot comes from an ease-out-back
//   curve applied to that local progress.

import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  type SharedValue,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/constants/theme';

// --- Timeline (ms) ---------------------------------------------------------

const INTRO_DURATION = 300; // 0-300: particles fade in scattered
const FORM_START = 300; // 300-1500: flock into the slice
const FORM_DURATION = 1200;
const BREATH_START = 1500; // 1500-1900: hold + subtle breath pulse
const EXIT_START = 1900; // 1900-2400: zoom + fade out
const EXIT_DURATION = 500;

const REDUCED_HOLD = 800;
const REDUCED_FADE = 300;

// Fraction of the form window used for travel; the rest absorbs stagger.
// travel = 600ms, max stagger ~= 600ms (~8ms per particle over ~80 indices).
const TRAVEL_FRACTION = 0.5;

// --- Palette (crust / cheese / pepperoni) ----------------------------------

const CRUST_COLORS = ['#B84508', '#D9530E'];
const CHEESE_PRIMARY = '#F6C445';
const CHEESE_PALE = '#F1E599';
const PEPPERONI = '#C43C24';

// --- Geometry ---------------------------------------------------------------

const HALF_ANGLE = 0.52; // wedge is -PI/2 +/- 0.52 rad
const TIP_ANGLE = -Math.PI / 2;

const CHEESE_COUNT = 50;
const CRUST_COUNT = 30;
const PEPPERONI_CLUSTERS: Array<{ rFrac: number; angFrac: number }> = [
  { rFrac: 0.4, angFrac: -0.5 },
  { rFrac: 0.62, angFrac: 0.45 },
  { rFrac: 0.74, angFrac: -0.3 },
  { rFrac: 0.52, angFrac: 0.12 },
];
const PEPPERONI_PER_CLUSTER = 4;

type ParticleSpec = {
  key: string;
  width: number;
  height: number;
  borderRadius: number;
  color: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  rotFrom: number; // deg
  rotTo: number; // deg
  delay: number; // normalized [0, 1 - TRAVEL_FRACTION] window start in `form`
  introStart: number; // normalized fade-in window start in `intro`
  driftAmp: number; // px
  driftPhase: number; // cycles
};

// Deterministic seeded PRNG so the scatter layout is identical every launch.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildParticles(screenW: number, screenH: number): ParticleSpec[] {
  const rng = mulberry32(0x5157a); // "gula"-ish seed, fixed

  // Slice bounding box: ~55% of screen width tall, tip at the bottom center.
  const R = screenW * 0.55;
  const tipX = screenW / 2;
  const tipY = screenH / 2 + R / 2;

  const scatterX = () => 20 + rng() * (screenW - 40);
  const scatterY = () => 60 + rng() * (screenH - 120);

  const polar = (r: number, ang: number): [number, number] => [
    tipX + r * Math.cos(ang),
    tipY + r * Math.sin(ang),
  ];

  const cheese: ParticleSpec[] = [];
  const crust: ParticleSpec[] = [];
  const pepperoni: ParticleSpec[] = [];

  // Cheese: jittered radial grid filling the wedge interior. Rows grow in
  // point count with radius so density stays roughly even (45 grid points),
  // then a few extra random interior fills bring it to 50.
  let cheeseMade = 0;
  const pushCheese = (r: number, ang: number) => {
    const [x, y] = polar(r, ang);
    const size = 6 + rng() * 2.5;
    cheese.push({
      key: `cheese-${cheeseMade}`,
      width: size,
      height: size,
      borderRadius: size * 0.32,
      color: rng() < 0.18 ? CHEESE_PALE : CHEESE_PRIMARY,
      fromX: scatterX(),
      fromY: scatterY(),
      toX: x,
      toY: y,
      rotFrom: (rng() - 0.5) * 220,
      rotTo: (rng() - 0.5) * 24,
      delay: 0,
      introStart: rng() * 0.55,
      driftAmp: 2 + rng() * 4,
      driftPhase: rng(),
    });
    cheeseMade += 1;
  };

  const rows = 9;
  for (let k = 0; k < rows; k += 1) {
    const cols = k + 1;
    const rFrac = 0.1 + 0.72 * (k / (rows - 1));
    for (let c = 0; c < cols; c += 1) {
      const angFrac = cols === 1 ? 0 : -0.82 + (1.64 * c) / (cols - 1);
      const r = R * (rFrac + (rng() - 0.5) * 0.05);
      const ang = TIP_ANGLE + HALF_ANGLE * (angFrac + (rng() - 0.5) * 0.12);
      pushCheese(r, ang);
    }
  }
  while (cheeseMade < CHEESE_COUNT) {
    const r = R * (0.18 + rng() * 0.6);
    const ang = TIP_ANGLE + HALF_ANGLE * (rng() * 1.5 - 0.75);
    pushCheese(r, ang);
  }

  // Crust: rounded rects along the outer arc band, settling tangent to the
  // arc so the band reads as a continuous crust.
  for (let i = 0; i < CRUST_COUNT; i += 1) {
    const angFrac = -0.97 + (1.94 * i) / (CRUST_COUNT - 1);
    const ang = TIP_ANGLE + HALF_ANGLE * (angFrac + (rng() - 0.5) * 0.05);
    const r = R * (0.9 + rng() * 0.08);
    const [x, y] = polar(r, ang);
    const tangentDeg = ((ang + Math.PI / 2) * 180) / Math.PI;
    crust.push({
      key: `crust-${i}`,
      width: 8 + rng() * 2,
      height: 5 + rng(),
      borderRadius: 2.5,
      color: CRUST_COLORS[i % CRUST_COLORS.length],
      fromX: scatterX(),
      fromY: scatterY(),
      toX: x,
      toY: y,
      rotFrom: (rng() - 0.5) * 260,
      rotTo: tangentDeg,
      delay: 0,
      introStart: rng() * 0.55,
      driftAmp: 2 + rng() * 4,
      driftPhase: rng(),
    });
  }

  // Pepperoni: 4 tight clusters inside the wedge; overlapping circles per
  // cluster read as one pepperoni slice.
  PEPPERONI_CLUSTERS.forEach((cluster, ci) => {
    const clusterAng = TIP_ANGLE + HALF_ANGLE * cluster.angFrac * 0.6;
    const [cx, cy] = polar(R * cluster.rFrac, clusterAng);
    for (let j = 0; j < PEPPERONI_PER_CLUSTER; j += 1) {
      const spreadAng = (j / PEPPERONI_PER_CLUSTER) * Math.PI * 2 + rng();
      const spreadR = 2 + rng() * 2.5;
      const size = 8.5 + rng();
      pepperoni.push({
        key: `pep-${ci}-${j}`,
        width: size,
        height: size,
        borderRadius: size / 2,
        color: PEPPERONI,
        fromX: scatterX(),
        fromY: scatterY(),
        toX: cx + Math.cos(spreadAng) * spreadR,
        toY: cy + Math.sin(spreadAng) * spreadR,
        rotFrom: (rng() - 0.5) * 180,
        rotTo: 0,
        delay: 0,
        introStart: rng() * 0.55,
        driftAmp: 2 + rng() * 3,
        driftPhase: rng(),
      });
    }
  });

  // Render order: cheese underneath, crust band, pepperoni on top.
  const all = [...cheese, ...crust, ...pepperoni];

  // Stagger by index: remap into windows of the single `form` progress.
  // Each particle travels for TRAVEL_FRACTION of the form duration; delays
  // spread across the remaining fraction (~8ms of real time per step).
  const maxDelay = 1 - TRAVEL_FRACTION;
  return all.map((p, i) => ({
    ...p,
    delay: (i / (all.length - 1)) * maxDelay,
  }));
}

// Spring-like overshoot without per-particle springs: ease-out-back briefly
// exceeds 1.0 then settles, tuned to feel like damping ~12 / stiffness ~90.
function easeOutBack(t: number): number {
  'worklet';
  const c1 = 1.2;
  const c3 = c1 + 1;
  const u = t - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
}

function Particle({
  spec,
  intro,
  form,
  drift,
}: {
  spec: ParticleSpec;
  intro: SharedValue<number>;
  form: SharedValue<number>;
  drift: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    // Per-particle window remap of the shared form progress.
    const raw = (form.value - spec.delay) / TRAVEL_FRACTION;
    const local = raw < 0 ? 0 : raw > 1 ? 1 : raw;
    const eased = easeOutBack(local);

    // Gentle idle drift while scattered; fades out as the particle forms.
    const idle = 1 - local;
    const cycle = (drift.value + spec.driftPhase) * Math.PI * 2;
    const dx = Math.sin(cycle) * spec.driftAmp * idle;
    const dy = Math.cos(cycle * 0.8) * spec.driftAmp * 0.7 * idle;

    const x = spec.fromX + (spec.toX - spec.fromX) * eased;
    const y = spec.fromY + (spec.toY - spec.fromY) * eased;
    const rot = spec.rotFrom + (spec.rotTo - spec.rotFrom) * eased;

    // Staggered fade/pop-in during the intro phase.
    const appear = interpolate(
      intro.value,
      [spec.introStart, 1],
      [0, 1],
      Extrapolation.CLAMP,
    );

    return {
      opacity: appear,
      transform: [
        { translateX: x + dx - spec.width / 2 },
        { translateY: y + dy - spec.height / 2 },
        { rotate: `${rot}deg` },
        { scale: 0.5 + 0.5 * appear },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 0,
          top: 0,
          width: spec.width,
          height: spec.height,
          borderRadius: spec.borderRadius,
          backgroundColor: spec.color,
        },
        style,
      ]}
    />
  );
}

export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  const particles = useMemo(() => buildParticles(width, height), [width, height]);

  const intro = useSharedValue(0);
  const form = useSharedValue(0);
  const drift = useSharedValue(0);
  const resolve = useSharedValue(0); // particles crossfade into the crisp slice
  const wrapperScale = useSharedValue(1);
  const overlayOpacity = useSharedValue(1);

  // The slice image must land exactly on the particle formation: formation
  // radius R with tip at (width/2, height/2 + R/2); in image space the tip
  // sits at (0.5, 0.94) and the radius is 0.82 of the image size.
  const sliceR = width * 0.55;
  const imageSize = sliceR / 0.82;
  const imageLeft = width / 2 - imageSize / 2;
  const imageTop = height / 2 + sliceR / 2 - imageSize * 0.94;

  const finishedRef = useRef(false);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const handleFinish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinishRef.current();
  };

  useEffect(() => {
    if (reducedMotion) {
      // Show the assembled slice statically, then a short fade.
      intro.value = 1;
      form.value = 1;
      resolve.value = 1;
      overlayOpacity.value = withDelay(
        REDUCED_HOLD,
        withTiming(0, { duration: REDUCED_FADE }, (finished) => {
          if (finished) runOnJS(handleFinish)();
        }),
      );
      return;
    }

    // Phase 1: fade in scattered, with a continuous gentle drift loop.
    intro.value = withTiming(1, {
      duration: INTRO_DURATION,
      easing: Easing.out(Easing.quad),
    });
    drift.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.linear }),
      -1,
    );

    // Phase 2: single progress value; particles self-stagger in worklets.
    form.value = withDelay(
      FORM_START,
      withTiming(1, { duration: FORM_DURATION, easing: Easing.linear }),
    );

    // Phase 3a: the particle field resolves into the crisp slice graphic.
    resolve.value = withDelay(
      BREATH_START,
      withTiming(1, { duration: 320, easing: Easing.inOut(Easing.quad) }),
    );

    // Phase 3 + 4 (scale): breath pulse, then zoom out.
    wrapperScale.value = withDelay(
      BREATH_START,
      withSequence(
        withTiming(1.03, { duration: 200, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 200, easing: Easing.inOut(Easing.quad) }),
        withTiming(1.15, {
          duration: EXIT_DURATION,
          easing: Easing.in(Easing.quad),
        }),
      ),
    );

    // Phase 4 (fade): overlay fades out, then hands off to the app.
    overlayOpacity.value = withDelay(
      EXIT_START,
      withTiming(0, { duration: EXIT_DURATION, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) runOnJS(handleFinish)();
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const wrapperStyle = useAnimatedStyle(() => ({
    transform: [{ scale: wrapperScale.value }],
  }));

  const particleLayerStyle = useAnimatedStyle(() => ({
    opacity: 1 - resolve.value,
  }));

  const sliceImageStyle = useAnimatedStyle(() => ({
    opacity: resolve.value,
    transform: [{ scale: 1.05 - 0.05 * resolve.value }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.overlay, overlayStyle]}>
      <Animated.View style={[StyleSheet.absoluteFill, wrapperStyle]}>
        <Animated.View style={[StyleSheet.absoluteFill, particleLayerStyle]}>
          {particles.map((spec) => (
            <Particle
              key={spec.key}
              spec={spec}
              intro={intro}
              form={form}
              drift={drift}
            />
          ))}
        </Animated.View>
        <Animated.Image
          source={require('../../assets/splash-slice.png')}
          style={[
            {
              position: 'absolute',
              left: imageLeft,
              top: imageTop,
              width: imageSize,
              height: imageSize,
            },
            sliceImageStyle,
          ]}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Must exactly match the native splash background for a seamless handoff.
    backgroundColor: colors.bg, // #FAF1B2
    zIndex: 9999,
    elevation: 9999,
  },
});
