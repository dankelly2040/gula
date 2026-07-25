import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { colors, spacing, fontSize, radii } from '../constants/theme';

type Props = {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  max?: number;
};

export function ScorePips({ label, value, onChange, max = 5 }: Props) {
  const handlePress = (pip: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onChange(value === pip ? null : pip);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.pips}>
        {Array.from({ length: max }, (_, i) => i + 1).map((pip) => (
          <Pressable
            key={pip}
            onPress={() => handlePress(pip)}
            style={[
              styles.pip,
              value !== null && pip <= value && styles.pipActive,
            ]}
          >
            <Text
              style={[
                styles.pipText,
                value !== null && pip <= value && styles.pipTextActive,
              ]}
            >
              {pip}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  label: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  pips: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  pip: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pipActive: {
    backgroundColor: colors.brand + '30',
    borderColor: colors.brand,
  },
  pipText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    fontWeight: '700',
  },
  pipTextActive: {
    color: colors.brand,
  },
});
