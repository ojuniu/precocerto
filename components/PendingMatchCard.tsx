import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import type { ComparisonLine } from '@/services/comparison/compare';
import { itemTitle } from '@/services/shopping/itemDraft';
import { formatBRL } from '@/utils/money';
import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';

export interface PendingMatchCardProps {
  line: ComparisonLine;
  onConfirm: () => void;
  onReject: () => void;
  busy?: boolean;
}

/** Correspondência duvidosa: o usuário decide, o app nunca assume sozinho. */
export function PendingMatchCard({ line, onConfirm, onReject, busy }: PendingMatchCardProps) {
  const confidence = Math.round((line.match?.confidence ?? 0) * 100);
  return (
    <Card tone="warning" style={styles.card}>
      <AppText variant="bodyStrong">É o mesmo produto?</AppText>
      <View style={styles.compare}>
        <View style={styles.side}>
          <AppText variant="label">Etiqueta</AppText>
          <AppText variant="bodyStrong">{line.shoppingItem ? itemTitle(line.shoppingItem) : line.name}</AppText>
          <AppText variant="caption">{formatBRL(line.shelfUnitPrice)}</AppText>
        </View>
        <View style={styles.side}>
          <AppText variant="label">Cupom</AppText>
          <AppText variant="bodyStrong">{line.receiptName}</AppText>
          <AppText variant="caption">{formatBRL(line.chargedUnitPrice)}</AppText>
        </View>
      </View>
      <AppText variant="caption" color={colors.textSecondary}>Semelhança: {confidence}%</AppText>
      <View style={styles.actions}>
        <Button title="Não" variant="secondary" icon="close" onPress={onReject} disabled={busy} style={styles.flex} />
        <Button title="Sim" icon="checkmark" onPress={onConfirm} loading={busy} style={styles.flex} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  compare: { flexDirection: 'row', gap: spacing.md },
  side: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
