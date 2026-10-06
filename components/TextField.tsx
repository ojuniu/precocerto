import { forwardRef } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { AppText } from './AppText';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string | null;
  highlight?: boolean;
  prefix?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, highlight, prefix, style, ...rest },
  ref,
) {
  return (
    <View style={styles.wrapper}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <View style={[styles.field, highlight && styles.highlight, error ? styles.error : null]}>
        {prefix ? <AppText variant="bodyStrong" color={colors.textSecondary}>{prefix}</AppText> : null}
        <TextInput ref={ref} placeholderTextColor={colors.textMuted} style={[styles.input, style]} {...rest} />
      </View>
      {error ? <AppText variant="caption" color={colors.danger}>{error}</AppText> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  highlight: { borderColor: colors.warning, backgroundColor: colors.warningSoft },
  error: { borderColor: colors.danger },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.text, paddingVertical: spacing.md },
});
