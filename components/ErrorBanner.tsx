import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';
import { AppText } from './AppText';
import { Button } from './Button';

export interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  tone?: 'danger' | 'warning';
}

export function ErrorBanner({ message, onRetry, tone = 'danger' }: ErrorBannerProps) {
  const danger = tone === 'danger';
  return (
    <View style={[styles.banner, { backgroundColor: danger ? colors.dangerSoft : colors.warningSoft }]}>
      <View style={styles.row}>
        <Ionicons name={danger ? 'alert-circle' : 'warning'} size={20} color={danger ? colors.danger : colors.warning} />
        <AppText variant="body" style={styles.text}>{message}</AppText>
      </View>
      {onRetry ? <Button title="Tentar novamente" variant="secondary" onPress={onRetry} icon="refresh" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: radius.md, padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  text: { flex: 1 },
});
