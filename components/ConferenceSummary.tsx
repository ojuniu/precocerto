import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';
import type { ComparisonSummary } from '@/services/comparison/compare';
import { formatBRL, formatSignedBRL } from '@/utils/money';
import { AppText } from './AppText';

function statusMessage(summary: ComparisonSummary): { text: string; tone: 'danger' | 'warning' | 'success' } {
  if (summary.divergenceCount > 0) {
    const plural = summary.divergenceCount === 1 ? '1 divergência' : `${summary.divergenceCount} divergências`;
    return { text: `🔴 Encontramos ${plural}`, tone: 'danger' };
  }
  if (summary.pendingCount > 0) return { text: '🟡 Confirme alguns produtos para concluir', tone: 'warning' };
  return { text: '🟢 Tudo certo! Nenhuma cobrança a mais', tone: 'success' };
}

const TONE_BG = { danger: colors.danger, warning: colors.warning, success: colors.primary } as const;

export function ConferenceSummary({ summary }: { summary: ComparisonSummary }) {
  const status = statusMessage(summary);
  const diffColor = summary.difference > 0.009 ? '#FFB4B6' : '#A7F3D0';
  return (
    <View style={[styles.card, { backgroundColor: colors.ink }]}>
      <View style={styles.grid}>
        <View style={styles.cell}>
          <AppText variant="label" color="rgba(255,255,255,0.6)">Preço esperado</AppText>
          <AppText variant="heading" color={colors.white}>{formatBRL(summary.expectedTotal)}</AppText>
        </View>
        <View style={styles.cell}>
          <AppText variant="label" color="rgba(255,255,255,0.6)">Preço cobrado</AppText>
          <AppText variant="heading" color={colors.white}>{formatBRL(summary.chargedTotal)}</AppText>
        </View>
      </View>
      <View>
        <AppText variant="label" color="rgba(255,255,255,0.6)">Diferença</AppText>
        <AppText variant="priceLarge" color={diffColor}>{formatSignedBRL(summary.difference)}</AppText>
      </View>
      <View style={[styles.status, { backgroundColor: TONE_BG[status.tone] }]}>
        <AppText variant="bodyStrong" color={colors.white}>{status.text}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, padding: spacing.xl, gap: spacing.lg },
  grid: { flexDirection: 'row', gap: spacing.lg },
  cell: { flex: 1, gap: 4 },
  status: { borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
});
