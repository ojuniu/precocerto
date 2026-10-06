import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';
import type { Shopping } from '@/types/domain';
import { formatDate } from '@/utils/date';
import { formatBRL, formatSignedBRL } from '@/utils/money';
import { AppText } from './AppText';
import { Card } from './Card';
import { StatusPill } from './StatusPill';

function statusPill(shopping: Shopping) {
  if (shopping.status !== 'checked') return <StatusPill label="Em andamento" tone="info" />;
  if (shopping.divergenceCount > 0) {
    const label = shopping.divergenceCount === 1 ? '1 diferença' : `${shopping.divergenceCount} diferenças`;
    return <StatusPill label={label} tone="danger" />;
  }
  return <StatusPill label="Sem divergências" tone="success" />;
}

export function ShoppingCard({ shopping, onPress }: { shopping: Shopping; onPress: () => void }) {
  const total = shopping.paidTotal ?? shopping.expectedTotal;
  const products = shopping.itemCount === 1 ? '1 produto' : `${shopping.itemCount} produtos`;
  return (
    <Card onPress={onPress}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Ionicons name="storefront-outline" size={20} color={colors.primaryDark} />
        </View>
        <View style={styles.info}>
          <AppText variant="heading" numberOfLines={1}>{shopping.marketName}</AppText>
          <AppText variant="caption">{formatDate(shopping.createdAt)} · {products}</AppText>
        </View>
        <View style={styles.amount}>
          <AppText variant="price">{formatBRL(total)}</AppText>
          {shopping.status === 'checked' && shopping.difference ? (
            <AppText variant="caption" color={shopping.difference > 0 ? colors.danger : colors.primaryDark}>
              {formatSignedBRL(shopping.difference)}
            </AppText>
          ) : null}
        </View>
      </View>
      <View style={styles.footer}>{statusPill(shopping)}</View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 2 },
  amount: { alignItems: 'flex-end' },
  footer: { marginTop: spacing.md },
});
