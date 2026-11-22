import { useEffect, type ComponentType } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  cubicBezier,
  useReducedMotion,
  type CSSAnimationKeyframes,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useObserve } from 'expo-observe';
import { CameraArt, CrownArt, PointsArt, SliceArt } from '../../components/onboarding-art';
import { PillButton } from '../../components/sticker';
import { useSplashDone } from '../../lib/splash-gate';
import { useSessionStore } from '../../state/session';
import { colors, fonts, spacing, fontSize } from '../../constants/theme';

// First run: one screen that says how the game works. The four lines write
// themselves in, one after another, and then the button sends the user
// straight into logging a slice. Nobody creates an account here: that prompt
// comes after the first log, once there are points worth keeping.
//
// Motion: a first-run screen is seen once, so it earns a real entrance. Each
// line's art lands, then its words rise out of a mask one at a time.
// Everything is transform and opacity on the UI thread (Reanimated CSS
// keyframes), with no bounce and no haptics, because the user did not cause
// any of it. Reduced motion keeps the order but swaps movement for a fade.

type Line = {
  key: string;
  words: string[];
  Art: ComponentType<{ size?: number }>;
  /** Resting tilt of the art, in degrees. */
  tilt: number;
};

const LINES: Line[] = [
  { key: 'eat', words: ['Eat', 'pizza.'], Art: SliceArt, tilt: -8 },
  { key: 'log', words: ['Log', 'a', 'pic.'], Art: CameraArt, tilt: 6 },
  {
    key: 'earn',
    words: ['Earn', 'Pizza', 'Points.'],
    Art: PointsArt,
    tilt: -6,
  },
  {
    key: 'win',
    words: ['Become', 'pizza', 'royalty.'],
    Art: CrownArt,
    tilt: 7,
  },
];

// --- Timeline (ms from the splash handoff) ----------------------------------

const TITLE_AT = 120;
const FIRST_LINE_AT = 480;
const LINE_EVERY = 560; // a comfortable reading pace, one line per beat
const WORD_AFTER_STICKER = 90;
const WORD_EVERY = 75;
const ACTIONS_AT = FIRST_LINE_AT + LINES.length * LINE_EVERY + 120;

// Reduced motion: same order, compressed, opacity only.
const STILL_LINE_EVERY = 110;

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

const RISE: CSSAnimationKeyframes = {
  from: { transform: [{ translateY: '110%' }] },
  to: { transform: [{ translateY: '0%' }] },
};

const FADE: CSSAnimationKeyframes = {
  from: { opacity: 0 },
  to: { opacity: 1 },
};

const LIFT: CSSAnimationKeyframes = {
  from: { opacity: 0, transform: [{ translateY: 14 }] },
  to: { opacity: 1, transform: [{ translateY: 0 }] },
};

/** The art lands a little small and over-rotated, then settles. */
function land(tilt: number): CSSAnimationKeyframes {
  return {
    from: { opacity: 0, transform: [{ scale: 0.82 }, { rotate: `${tilt - 14}deg` }] },
    to: { opacity: 1, transform: [{ scale: 1 }, { rotate: `${tilt}deg` }] },
  };
}

const LAND = LINES.map((line) => land(line.tilt));

function play(name: CSSAnimationKeyframes, delay: number, duration: number) {
  return {
    animationName: name,
    animationDuration: `${duration}ms`,
    animationDelay: `${delay}ms`,
    animationTimingFunction: EASE_OUT,
    animationFillMode: 'both',
  } as const;
}

export default function Onboarding() {
  const { markInteractive } = useObserve();
  useEffect(() => {
    markInteractive();
  }, [markInteractive]);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  const splashDone = useSplashDone();
  const completeOnboarding = useSessionStore((s) => s.completeOnboarding);

  const handleStart = () => {
    // Opening the guard first makes the log flow reachable; the capture
    // screen then replaces this group.
    completeOnboarding();
    router.replace('/log/capture');
  };

  const lineAt = (index: number) =>
    still ? TITLE_AT + (index + 1) * STILL_LINE_EVERY : FIRST_LINE_AT + index * LINE_EVERY;
  const actionsAt = still ? lineAt(LINES.length) : ACTIONS_AT;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.md },
      ]}
    >
      {/* Mounted at the handoff, so the sequence starts in view, not behind
          the launch splash. */}
      {splashDone && (
        <>
          <View style={styles.story}>
            <Animated.View style={[styles.heading, play(still ? FADE : LIFT, TITLE_AT, 420)]}>
              <Text accessibilityRole="header" style={styles.title}>
                How it works
              </Text>
              <View style={styles.rule} />
            </Animated.View>

            <View style={styles.lines}>
              {LINES.map((line, index) => {
                const at = lineAt(index);
                const { Art } = line;
                return (
                  <View
                    key={line.key}
                    style={styles.line}
                    accessible
                    accessibilityLabel={line.words.join(' ')}
                  >
                    <Animated.View
                      style={[
                        styles.art,
                        { transform: [{ rotate: `${line.tilt}deg` }] },
                        play(still ? FADE : LAND[index], at, 460),
                      ]}
                    >
                      <Art size={ART_SIZE} />
                    </Animated.View>

                    <View style={styles.words}>
                      {line.words.map((word, w) => (
                        <View key={`${line.key}-${w}`} style={styles.wordMask}>
                          <Animated.Text
                            style={[
                              styles.word,
                              play(
                                still ? FADE : RISE,
                                still ? at : at + WORD_AFTER_STICKER + w * WORD_EVERY,
                                still ? 300 : 620
                              ),
                            ]}
                          >
                            {word}
                          </Animated.Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <Animated.View style={[styles.actions, play(still ? FADE : LIFT, actionsAt, 480)]}>
            <PillButton label="Log your first slice" icon="camera.fill" onPress={handleStart} />
            <Pressable
              accessibilityRole="button"
              style={styles.accountButton}
              hitSlop={8}
              onPress={() => router.push('/sign-in')}
            >
              <Text style={styles.accountText}>I already have an account</Text>
            </Pressable>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const ART_SIZE = 54;
// Heavy capitals run wide. Sized so the three-word lines fit beside the art
// on a 402pt screen; narrower phones wrap them, which the row layout allows.
const WORD_SIZE = 24;
const WORD_LINE = 30;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
  },
  story: {
    flex: 1,
    justifyContent: 'center',
  },
  heading: {
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: fonts.label,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: colors.textPrimary,
  },
  // The red rule under the small line of a shop sign.
  rule: {
    width: 56,
    height: 3,
    marginTop: spacing.sm,
    backgroundColor: colors.brand,
  },
  lines: {
    gap: spacing.lg + spacing.xs,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  art: {
    width: ART_SIZE,
    height: ART_SIZE,
  },
  words: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 8,
  },
  // Each word rises out of its own clipped box.
  wordMask: {
    overflow: 'hidden',
  },
  word: {
    fontFamily: fonts.display,
    fontSize: WORD_SIZE,
    lineHeight: WORD_LINE,
    textTransform: 'uppercase',
    color: colors.brand,
  },
  actions: {
    gap: spacing.md,
  },
  accountButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
  },
  accountText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
