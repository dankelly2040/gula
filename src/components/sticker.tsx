import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { colors, spacing, fontSize, radii, sticker } from '../constants/theme';

// Shared sticker-language primitives: ink outlines, hard offset shadows,
// press-down physicality. Custom RN surfaces only; native surfaces stay native.

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
  const fill =
    variant === 'primary' ? colors.brand : variant === 'danger' ? colors.danger : colors.surface;
  const textColor = variant === 'quiet' ? colors.ink : colors.surface;
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={4}>
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
  size = 56,
}: {
  onPress: () => void;
  children: ReactNode;
  size?: number;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={6}>
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

/** Selectable chip: white with ink outline; selected fills ember. */
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
    <Pressable onPress={onPress} hitSlop={2}>
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
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    ...sticker.border,
    ...sticker.shadow,
  },
  pillText: {
    fontSize: fontSize.md,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  disabled: {
    opacity: 0.6,
  },
  circle: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...sticker.border,
    ...sticker.shadow,
  },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    ...sticker.border,
    ...sticker.shadowSm,
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
