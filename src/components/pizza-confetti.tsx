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

const DURATION_MS = 1900;
const COUNT = 72;
const GRAVITY = 1350; // px/s^2

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
  vx: number; // px/s
  vy: number; // px/s (negative = up)
  spin: number; // total radians over the flight
  delay: number; // 0-1 fraction of DURATION when this particle appears
};

function buildParticles(seed: number): ParticleSpec[] {
  const rng = mulberry32(seed);
  const specs: ParticleSpec[] = [];
  for (let i = 0; i < COUNT; i++) {
    const roll = rng();
    const kind =
      roll < 0.25 ? 'slice' : roll < 0.55 ? 'pepperoni' : roll < 0.85 ? 'cheese' : 'crust';
    // Radial burst, biased upward like a popped cork.
    const angle = -Math.PI / 2 + (rng() - 0.5) * Math.PI * 1.15;
    const speed = 420 + rng() * 620;
    specs.push({
      key: i,
      kind,
      size: kind === 'slice' ? 10 + rng() * 6 : 5 + rng() * 5,
      color:
        kind === 'pepperoni'
          ? PEPPERONI
          : kind === 'crust'
            ? (rng() > 0.5 ? CRUST : EMBER)
            : rng() > 0.25
              ? CHEESE
              : CHEESE_LIGHT,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      spin: (rng() - 0.5) * 22,
      delay: rng() * 0.08,
    });
  }
  return specs;
}

function Particle({
  spec,
  progress,
  originX,
  originY,
}: {
  spec: ParticleSpec;
  progress: SharedValue<number>;
  originX: number;
  originY: number;
}) {
  const style = useAnimatedStyle(() => {
    const t = Math.max(0, progress.value - spec.delay) * (DURATION_MS / 1000);
    const x = originX + spec.vx * t;
    const y = originY + spec.vy * t + 0.5 * GRAVITY * t * t;
    const opacity = interpolate(progress.value, [0, 0.05, 0.75, 1], [0, 1, 1, 0]);
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
        <Particle
          key={spec.key}
          spec={spec}
          progress={progress}
          originX={width / 2}
          originY={height * 0.45}
        />
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
