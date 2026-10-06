import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';
import { describePromo, effectiveUnitPrice, expectedLineTotal } from '@/services/pricing/pricing';
import { itemTitle } from '@/services/shopping/itemDraft';
import type { ShoppingItem } from '@/types/domain';
import { formatBRL, formatQuantity } from '@/utils/money';
import { AppText } from './AppText';

export function ItemRow({ item, onPress }: { item: ShoppingItem; onPress: () => void }) {
  const promo = describePromo(item.promo, item.promoPrice);
  const unitSuffix = item.priceUnit === 'un' ? '' : `/${item.priceUnit}`;
  const showQuantity = item.quantity !== 1 || item.priceUnit !== 'un';
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.check}>
        <Ionicons name="checkmark" size={16} color={colors.white} />
      </View>
      <View style={styles.info}>
        <AppText variant="bodyStrong" numberOfLines={1}>{itemTitle(item)}</AppText>
        <View style={styles.meta}>
          {item.brand ? <AppText variant="caption" numberOfLines={1}>{item.brand}</AppText> : null}
          {showQuantity ? (
            <AppText variant="caption">
              {formatQuantity(item.quantity)}
              {item.priceUnit === 'un' ? 'x' : ` ${item.priceUnit}`} · {formatBRL(effectiveUnitPrice(item))}
              {unitSuffix}
            </AppText>
          ) : null}
          {promo ? <AppText variant="caption" color={colors.primaryDark}>{promo}</AppText> : null}
        </View>
      </View>
      <AppText variant="price">{formatBRL(expectedLineTotal(item, item.quantity))}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  pressed: { opacity: 0.6 },
  check: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.sm },
});
