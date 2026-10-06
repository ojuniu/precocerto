import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { colors, radius, shadow, spacing } from '@/constants/theme';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'danger' | 'warning' | 'success';
}

const TONES = {
  default: { backgroundColor: colors.surface, borderColor: colors.surface },
  danger: { backgroundColor: colors.surface, borderColor: colors.danger },
  warning: { backgroundColor: colors.warningSoft, borderColor: colors.warningSoft },
  success: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
} as const;

export function Card({ children, onPress, style, tone = 'default' }: CardProps) {
  const content = [styles.card, TONES[tone], style];
  if (!onPress) return <View style={content}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [content, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1.5, ...shadow },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});
