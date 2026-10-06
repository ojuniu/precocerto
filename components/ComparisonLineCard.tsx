import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';
import type { ComparisonLine } from '@/services/comparison/compare';
import { itemTitle } from '@/services/shopping/itemDraft';
import { formatBRL, formatQuantity, formatSignedBRL } from '@/utils/money';
import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';
import { StatusPill } from './StatusPill';

export interface ComparisonLineCardProps {
  line: ComparisonLine;
  onToggleDivergence?: (confirmed: boolean) => void;
  onLink?: () => void;
  busy?: boolean;
}

function PriceColumn({ label, value, highlight }: { label: string; value: number | null; highlight?: string }) {
  return (
    <View style={styles.column}>
      <AppText variant="label">{label}</AppText>
      <AppText variant="price" color={highlight}>{formatBRL(value)}</AppText>
    </View>
  );
}

export function ComparisonLineCard({ line, onToggleDivergence, onLink, busy }: ComparisonLineCardProps) {
  const overcharged = line.status === 'overcharged';
  const confirmed = line.match?.divergenceConfirmed ?? false;
  const quantityLabel = line.quantity !== 1 ? `${formatQuantity(line.quantity)}${line.receiptItem?.unit === 'kg' ? ' kg' : 'x'}` : null;

  return (
    <Card tone={overcharged ? 'danger' : 'default'} style={styles.card}>
      {overcharged ? <AppText variant="bodyStrong" color={colors.danger}>⚠️ DIVERGÊNCIA ENCONTRADA</AppText> : null}
      <View style={styles.titleRow}>
        <View style={styles.flex}>
          <AppText variant="heading">{line.shoppingItem ? itemTitle(line.shoppingItem) : line.name}</AppText>
          {line.receiptName && line.receiptName !== line.name ? (
            <AppText variant="caption" numberOfLines={1}>No cupom: {line.receiptName}</AppText>
          ) : null}
        </View>
        {quantityLabel ? <StatusPill label={quantityLabel} /> : null}
      </View>

      {line.status === 'not_in_receipt' ? (
        <View style={styles.footerRow}>
          <AppText variant="caption" style={styles.flex}>Não encontramos este produto no cupom.</AppText>
          {onLink ? <Button title="Vincular" variant="secondary" icon="link" onPress={onLink} /> : null}
        </View>
      ) : line.status === 'not_photographed' ? (
        <View style={styles.prices}>
          <PriceColumn label="Caixa" value={line.chargedTotal} />
          <AppText variant="caption" style={styles.flex}>Produto não fotografado na prateleira.</AppText>
        </View>
      ) : (
        <>
          <View style={styles.prices}>
            <PriceColumn label="Prateleira" value={line.expectedTotal} />
            <PriceColumn label="Caixa" value={line.chargedTotal} highlight={overcharged ? colors.danger : undefined} />
            <View style={[styles.column, styles.right]}>
              <AppText variant="label">Diferença</AppText>
              {line.status === 'ok' ? (
                <AppText variant="bodyStrong" color={colors.primaryDark}>✅ Sem divergência</AppText>
              ) : (
                <AppText variant="price" color={overcharged ? colors.danger : colors.primaryDark}>{formatSignedBRL(line.difference)}</AppText>
              )}
            </View>
          </View>
          {line.status === 'undercharged' ? <StatusPill label="Você pagou menos que a etiqueta" tone="success" /> : null}
          {overcharged && onToggleDivergence ? (
            <View style={styles.divergenceFooter}>
              <AppText variant="caption">
                {confirmed ? 'Divergência confirmada por você.' : 'Preço incorreto? Confirme para registrar.'}
              </AppText>
              <Button
                title={confirmed ? 'Desfazer' : 'Confirmar divergência'}
                variant={confirmed ? 'secondary' : 'danger'}
                icon={confirmed ? 'arrow-undo' : 'flag'}
                loading={busy}
                onPress={() => onToggleDivergence(!confirmed)}
              />
            </View>
          ) : null}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  flex: { flex: 1 },
  prices: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-end' },
  column: { gap: 2, flex: 1 },
  right: { alignItems: 'flex-end' },
  divergenceFooter: {
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    borderRadius: radius.sm,
  },
});
