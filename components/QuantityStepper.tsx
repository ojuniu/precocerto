import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';
import { formatQuantity } from '@/utils/money';
import { AppText } from './AppText';

export interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  suffix?: string;
}

export function QuantityStepper({ value, onChange, step = 1, min = 1, suffix }: QuantityStepperProps) {
  const change = (delta: number) => onChange(Math.max(min, Math.round((value + delta) * 1000) / 1000));
  return (
    <View style={styles.row}>
      <Pressable accessibilityLabel="Diminuir" style={styles.button} onPress={() => change(-step)}>
        <Ionicons name="remove" size={20} color={colors.text} />
      </Pressable>
      <AppText variant="price" style={styles.value}>
        {formatQuantity(value)}
        {suffix ? ` ${suffix}` : ''}
      </AppText>
      <Pressable accessibilityLabel="Aumentar" style={styles.button} onPress={() => change(step)}>
        <Ionicons name="add" size={20} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  button: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { minWidth: 64, textAlign: 'center' },
});
