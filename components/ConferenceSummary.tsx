import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { colors, gradients, radius, spacing } from '@/constants/theme';
import type { ComparisonSummary } from '@/services/comparison/compare';
import { formatBRL, formatSignedBRL } from '@/utils/money';
import { AppText } from './AppText';
import { GlassView } from './GlassView';
import { GradientCard } from './GradientCard';

type Tone = 'danger' | 'warning' | 'success';

function statusMessage(summary: ComparisonSummary): { text: string; tone: Tone; icon: keyof typeof Ionicons.glyphMap } {
  if (summary.divergenceCount > 0) {
    const plural = summary.divergenceCount === 1 ? '1 divergência' : `${summary.divergenceCount} divergências`;
    return { text: `Encontramos ${plural}`, tone: 'danger', icon: 'alert-circle' };
  }
  if (summary.pendingCount > 0) return { text: 'Confirme alguns produtos para concluir', tone: 'warning', icon: 'help-circle' };
  return { text: 'Tudo certo! Nenhuma cobrança a mais', tone: 'success', icon: 'checkmark-circle' };
}

const GRADIENT = { danger: gradients.danger, warning: gradients.ink, success: gradients.hero } as const;

export function ConferenceSummary({ summary }: { summary: ComparisonSummary }) {
  const status = statusMessage(summary);
  return (
    <GradientCard colors={GRADIENT[status.tone]}>
      <GlassView tone="dark" style={styles.status}>
        <Ionicons name={status.icon} size={16} color={colors.white} />
        <AppText variant="bodyStrong" color={colors.white}>{status.text}</AppText>
      </GlassView>
      <View>
        <AppText variant="label" color="rgba(255,255,255,0.75)">Diferença</AppText>
        <AppText variant="priceLarge" color={colors.white} style={styles.big}>{formatSignedBRL(summary.difference)}</AppText>
      </View>
      <View style={styles.grid}>
        <GlassView tone="dark" style={styles.cell}>
          <AppText variant="label" color="rgba(255,255,255,0.7)">Esperado</AppText>
          <AppText variant="heading" color={colors.white}>{formatBRL(summary.expectedTotal)}</AppText>
        </GlassView>
        <GlassView tone="dark" style={styles.cell}>
          <AppText variant="label" color="rgba(255,255,255,0.7)">Cobrado</AppText>
          <AppText variant="heading" color={colors.white}>{formatBRL(summary.chargedTotal)}</AppText>
        </GlassView>
      </View>
    </GradientCard>
  );
}

const styles = StyleSheet.create({
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  big: { fontSize: 44, lineHeight: 52 },
  grid: { flexDirection: 'row', gap: spacing.sm },
  cell: { flex: 1, gap: 2, padding: spacing.md, borderRadius: radius.md },
});
