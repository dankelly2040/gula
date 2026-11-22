import { StyleSheet, Text } from 'react-native';
import { colors, fonts, shape, spacing } from '../constants/theme';

// The fixed parts of the "Snap your slice" moment. The capture screen and
// the slice-lift overlay that plays right after it both draw these, in the
// same places, so nothing jumps when one hands off to the other.

export function CaptureTitle() {
  return (
    <>
      <Text style={styles.title}>Snap your slice.</Text>
      <Text style={styles.tagline}>snap · rate · log</Text>
    </>
  );
}

/** The one line under the photo that says what is happening. */
export function CaptureStatus({ children }: { children: string }) {
  return <Text style={styles.status}>{children}</Text>;
}

export const captureShape = StyleSheet.create({
  // The photo itself is the shape: a rounded rectangle, no frame around it.
  viewport: {
    alignSelf: 'stretch',
    borderRadius: shape.panel,
    overflow: 'hidden',
    aspectRatio: 3 / 4,
  },
});

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.display,
    fontSize: 21,
    lineHeight: 28,
    textTransform: 'uppercase',
    color: colors.brand,
    marginTop: spacing.sm,
  },
  tagline: {
    fontFamily: fonts.label,
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  status: {
    fontFamily: fonts.label,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
});
