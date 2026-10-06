import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';
import { AppText } from './AppText';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  size?: 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}

const PALETTE: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, fg: colors.white },
  secondary: { bg: colors.glass, fg: colors.text, border: colors.glassBorder },
  ghost: { bg: 'transparent', fg: colors.primaryDark },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  dark: { bg: colors.ink, fg: colors.white },
};

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, size = 'md', style }: ButtonProps) {
  const palette = PALETTE[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' && styles.large,
        { backgroundColor: palette.bg, borderColor: palette.border ?? 'transparent', opacity: inactive ? 0.55 : pressed ? 0.85 : 1 },
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={size === 'lg' ? 22 : 18} color={palette.fg} /> : null}
          <AppText variant="bodyStrong" color={palette.fg} style={size === 'lg' ? styles.largeText : undefined}>
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  large: { minHeight: 62 },
  largeText: { fontSize: 17 },
  pressed: { transform: [{ scale: 0.98 }] },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
