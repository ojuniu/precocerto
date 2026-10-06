import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';
import { AppText } from './AppText';

export type PillTone = 'success' | 'danger' | 'warning' | 'neutral' | 'info';

const TONES: Record<PillTone, { bg: string; fg: string }> = {
  success: { bg: colors.primarySoft, fg: colors.primaryDark },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  warning: { bg: colors.warningSoft, fg: '#9A6A00' },
  neutral: { bg: colors.surfaceMuted, fg: colors.textSecondary },
  info: { bg: '#E8EEFF', fg: '#3651C9' },
};

export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: PillTone }) {
  const palette = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <AppText variant="caption" color={palette.fg} style={styles.text}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 4 },
  text: { fontSize: 12 },
});
