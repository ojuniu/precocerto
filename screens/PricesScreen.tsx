import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { colors, radius, spacing } from '@/constants/theme';
import { listTrackedProducts, type TrackedProduct } from '@/services/data/productRepository';
import { displaySize } from '@/services/shopping/itemDraft';
import { formatDate } from '@/utils/date';
import { toUserMessage } from '@/utils/errors';
import { formatBRL } from '@/utils/money';
import { normalizeText } from '@/utils/text';

export default function PricesScreen() {
  const [products, setProducts] = useState<TrackedProduct[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProducts(await listTrackedProducts());
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const term = normalizeText(query);
  const visible = term ? products.filter((p) => normalizeText(`${p.brand ?? ''} ${p.name}`).includes(term)) : products;

  return (
    <Screen refreshing={loading && loaded} onRefresh={refresh}>
      <AppText variant="title" style={styles.title}>Preços</AppText>
      <AppText variant="body" color={colors.textSecondary}>Acompanhe como os preços dos seus produtos mudam com o tempo.</AppText>
      <TextField value={query} onChangeText={setQuery} placeholder="Buscar produto" returnKeyType="search" />
      {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
      {loaded && visible.length === 0 && !error ? (
        <EmptyState icon="trending-up-outline" title="Nenhum produto ainda" message="Os produtos que você fotografar aparecem aqui." />
      ) : null}
      {visible.map((product) => (
        <Card key={product.id} onPress={() => router.push(`/product/${product.id}`)} style={styles.row}>
          <View style={styles.icon}>
            <Ionicons name="pricetag-outline" size={18} color={colors.primaryDark} />
          </View>
          <View style={styles.info}>
            <AppText variant="bodyStrong" numberOfLines={1}>
              {product.name} {displaySize(product.sizeValue, product.sizeUnit) ?? ''}
            </AppText>
            <AppText variant="caption">
              {product.brand ? `${product.brand} · ` : ''}
              {product.observations} {product.observations === 1 ? 'registro' : 'registros'} · {formatDate(product.lastSeenAt)}
            </AppText>
          </View>
          <AppText variant="price">{formatBRL(product.lastPrice)}</AppText>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  icon: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 2 },
});
