import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing } from '../constants/theme';

// Tabs, app-wide: words in the sign capitals. The chosen one is red with a
// red rule under it; the others are grey. No pill, no outline, no fill.

type Props<K extends string> = {
  options: readonly { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
  style?: ViewStyle;
};

export function TextTabs<K extends string>({ options, value, onChange, style }: Props<K>) {
  return (
    <View style={[styles.row, style]} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            hitSlop={10}
            onPress={() => {
              if (selected) return;
              if (process.env.EXPO_OS === 'ios') void Haptics.selectionAsync();
              onChange(option.key);
            }}
          >
            <Text style={[styles.text, selected && styles.textOn]}>{option.label}</Text>
            <View style={[styles.rule, selected && styles.ruleOn]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  text: {
    fontFamily: fonts.label,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  textOn: {
    color: colors.brand,
  },
  rule: {
    height: 3,
    marginTop: 6,
    backgroundColor: 'transparent',
  },
  ruleOn: {
    backgroundColor: colors.brand,
  },
});
