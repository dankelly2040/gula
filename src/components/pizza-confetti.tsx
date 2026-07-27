import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

// One-shot pizza confetti explosion: tiny slices, pepperoni, cheese, and
// crust bits burst from a point, tumble under gravity, and fade. Same
// single-progress-value architecture as the animated splash: one shared
// value drives every particle via per-particle constants.

const DURATION_MS = 3000;
const COUNT = 220;
const GRAVITY = 1050; // px/s^2

const CHEESE = '#F6C445';
const CHEESE_LIGHT = '#F1E599';
const PEPPERONI = '#C43C24';
const CRUST = '#B84508';
const EMBER = '#D9530E';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type ParticleSpec = {
  key: number;
  kind: 'slice' | 'pepperoni' | 'cheese' | 'crust';
  size: number;
  color: string;
  ox: number; // origin as a fraction of screen width
  oy: number; // origin as a fraction of screen height
  vx: number; // px/s
  vy: number; // px/s (negative = up)
  spin: number; // total radians over the flight
  delay: number; // 0-1 fraction of DURATION when this particle appears
};

// Three cannons: bottom-left and bottom-right firing inward and up,
// plus a center burst, so the blast covers the whole screen.
const CANNONS = [
  { ox: 0.06, oy: 0.98, baseAngle: -Math.PI / 2 + 0.55, spread: 0.55 },
  { ox: 0.94, oy: 0.98, baseAngle: -Math.PI / 2 - 0.55, spread: 0.55 },
  { ox: 0.5, oy: 0.95, baseAngle: -Math.PI / 2, spread: 0.9 },
] as const;

function buildParticles(seed: number): ParticleSpec[] {
  const rng = mulberry32(seed);
  const specs: ParticleSpec[] = [];
  for (let i = 0; i < COUNT; i++) {
    const roll = rng();
    // Pepperoni-forward mix: it is a pizza celebration.
    const kind =
      roll < 0.16 ? 'slice' : roll < 0.58 ? 'pepperoni' : roll < 0.88 ? 'cheese' : 'crust';
    const cannon = CANNONS[i % CANNONS.length];
    const angle = cannon.baseAngle + (rng() - 0.5) * cannon.spread * 2;
    const speed = 750 + rng() * 750;
    specs.push({
      key: i,
      kind,
      size:
        kind === 'slice'
          ? 11 + rng() * 7
          : kind === 'pepperoni'
            ? 8 + rng() * 8
            : 5 + rng() * 5,
      color:
        kind === 'pepperoni'
          ? PEPPERONI
          : kind === 'crust'
            ? (rng() > 0.5 ? CRUST : EMBER)
            : rng() > 0.25
              ? CHEESE
              : CHEESE_LIGHT,
      ox: cannon.ox,
      oy: cannon.oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      spin: (rng() - 0.5) * 24,
      delay: rng() * 0.14,
    });
  }
  return specs;
}

function Particle({
  spec,
  progress,
  width,
  height,
}: {
  spec: ParticleSpec;
  progress: SharedValue<number>;
  width: number;
  height: number;
}) {
  const style = useAnimatedStyle(() => {
    const t = Math.max(0, progress.value - spec.delay) * (DURATION_MS / 1000);
    const x = spec.ox * width + spec.vx * t;
    const y = spec.oy * height + spec.vy * t + 0.5 * GRAVITY * t * t;
    const opacity = interpolate(progress.value, [0, 0.04, 0.82, 1], [0, 1, 1, 0]);
    return {
      opacity,
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${spec.spin * progress.value}rad` },
      ],
    };
  });

  if (spec.kind === 'slice') {
    // Tiny slice: a wedge built from borders, with a crust-colored top edge.
    return (
      <Animated.View style={[styles.particle, style]}>
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: spec.size * 0.55,
            borderRightWidth: spec.size * 0.55,
            borderTopWidth: spec.size,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: spec.color,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: -spec.size * 0.55,
            width: spec.size * 1.1,
            height: spec.size * 0.28,
            borderRadius: spec.size * 0.14,
            backgroundColor: CRUST,
          }}
        />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: spec.size,
          height: spec.kind === 'crust' ? spec.size * 0.6 : spec.size,
          borderRadius: spec.kind === 'pepperoni' ? spec.size / 2 : spec.size * 0.25,
          backgroundColor: spec.color,
        },
        style,
      ]}
    />
  );
}

export function PizzaConfetti({
  seed = 7,
  onDone,
}: {
  seed?: number;
  onDone?: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const particles = useMemo(() => buildParticles(seed), [seed]);

  useEffect(() => {
    if (reducedMotion) {
      onDone?.();
      return;
    }
    progress.value = withTiming(1, {
      duration: DURATION_MS,
      easing: Easing.out(Easing.quad),
    });
    const timer = setTimeout(() => onDone?.(), DURATION_MS + 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((spec) => (
        <Particle key={spec.key} spec={spec} progress={progress} width={width} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
