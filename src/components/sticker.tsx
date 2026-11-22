import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { colors, fonts, spacing, fontSize, shape, sticker } from '../constants/theme';

// Shared button and chip primitives, in the app's flat shape language (see
// `shape` in constants/theme): solid fills, no outlines, no hard shadows.
// Custom RN surfaces only; native surfaces stay native.

export function PillButton({
  onPress,
  disabled,
  icon,
  label,
  variant = 'primary',
  style,
}: {
  onPress: () => void;
  disabled?: boolean;
  icon?: string;
  label: string;
  variant?: 'primary' | 'quiet' | 'danger';
  style?: ViewStyle;
}) {
  // Primary is the one solid red block. Quiet and danger are grey blocks, so
  // a destructive action is never mistaken for the main one; danger says so
  // with red lettering.
  const fill = variant === 'primary' ? colors.brand : colors.bgElevated;
  const textColor =
    variant === 'primary' ? colors.surface : variant === 'danger' ? colors.brand : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.pill,
            { backgroundColor: fill },
            pressed && sticker.pressed,
            disabled && styles.disabled,
            style,
          ]}
        >
          {icon ? <SymbolView name={icon as never} size={18} tintColor={textColor} /> : null}
          <Text style={[styles.pillText, { color: textColor }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function CircleButton({
  onPress,
  children,
  label,
  size = 56,
}: {
  onPress: () => void;
  children: ReactNode;
  /** Icon-only control, so the label is the only name a screen reader gets. */
  label: string;
  size?: number;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6}>
      {({ pressed }) => (
        <View
          style={[
            styles.circle,
            { width: size, height: size, borderRadius: size / 2 },
            pressed && sticker.pressed,
          ]}
        >
          {children}
        </View>
      )}
    </Pressable>
  );
}

/** Selectable chip: a grey block; selected fills red. */
export function StickerChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      hitSlop={2}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.chip,
            selected && styles.chipSelected,
            pressed && sticker.pressed,
          ]}
        >
          <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Named "pill" for history; it is a rounded rectangle now.
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: shape.button,
    minHeight: 54,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  pillText: {
    fontFamily: fonts.label,
    fontSize: 15,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  disabled: {
    opacity: 0.6,
  },
  circle: {
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    backgroundColor: colors.bgElevated,
    borderRadius: shape.chip,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chipSelected: {
    backgroundColor: colors.brand,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  chipTextSelected: {
    color: colors.surface,
  },
});
