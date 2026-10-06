import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Header } from '@/components/Header';
import { PriceChart } from '@/components/PriceChart';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { getMarketComparison, getPriceHistory, getProduct, type MarketPrice } from '@/services/data/productRepository';
import { bestMarket, computePriceStats, dailySeries } from '@/services/pricing/priceStats';
import { displaySize } from '@/services/shopping/itemDraft';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import type { PricePoint, Product } from '@/types/domain';
import { formatShortDate } from '@/utils/date';
import { toUserMessage } from '@/utils/errors';
import { formatBRL, formatSignedBRL } from '@/utils/money';

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="label">{label}</AppText>
      <AppText variant="price" color={color}>{value}</AppText>
    </View>
  );
}

function PremiumLock({ title }: { title: string }) {
  return (
    <Card tone="success" style={styles.lock}>
      <Ionicons name="lock-closed" size={20} color={colors.primaryDark} />
      <AppText variant="bodyStrong" style={styles.flex}>{title}</AppText>
      <Button title="Premium" variant="primary" onPress={() => router.push('/premium')} />
    </Card>
  );
}

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const canHistory = useSubscriptionStore((s) => s.can('price_history'));
  const canCompare = useSubscriptionStore((s) => s.can('market_comparison'));
  const [product, setProduct] = useState<Product | null>(null);
  const [points, setPoints] = useState<PricePoint[]>([]);
  const [markets, setMarkets] = useState<MarketPrice[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([getProduct(id), getPriceHistory(id)])
      .then(([p, history]) => {
        setProduct(p);
        setPoints(history);
      })
      .catch((e) => setError(toUserMessage(e)));
    if (canCompare) getMarketComparison(id).then(setMarkets).catch(() => setMarkets([]));
  }, [id, canCompare]);

  if (!product) {
    return (
      <Screen>
        <Header title="Produto" />
        {error ? <ErrorBanner message={error} /> : <ActivityIndicator color={colors.primary} />}
      </Screen>
    );
  }

  const stats = computePriceStats(points);
  const series = dailySeries(points);
  const best = bestMarket(markets);
  const size = displaySize(product.sizeValue, product.sizeUnit);

  return (
    <Screen>
      <Header title={`${product.name}${size ? ` ${size}` : ''}`} subtitle={product.brand ?? undefined} />

      {stats ? (
        <Card style={styles.card}>
          <AppText variant="label">Preço atual</AppText>
          <AppText variant="priceLarge">{formatBRL(stats.current)}</AppText>
          {canHistory && points.length > 1 ? (
            <AppText variant="caption" color={stats.vsAverage > 0 ? colors.danger : colors.primaryDark}>
              {stats.vsAverage === 0 ? 'Na média' : `${formatSignedBRL(stats.vsAverage)} em relação à média`}
            </AppText>
          ) : null}
        </Card>
      ) : null}

      {canHistory && stats ? (
        <>
          <Card style={styles.card}>
            <AppText variant="heading">Histórico de preços</AppText>
            <PriceChart points={series} />
            <View style={styles.stats}>
              <Stat label="Média" value={formatBRL(stats.average)} />
              <Stat label="Menor" value={formatBRL(stats.min)} color={colors.primaryDark} />
              <Stat label="Maior" value={formatBRL(stats.max)} color={colors.danger} />
            </View>
          </Card>
          <Card style={styles.card}>
            {[...points].reverse().slice(0, 12).map((p, i) => (
              <View key={`${p.observedAt}-${i}`} style={styles.pointRow}>
                <AppText variant="bodyStrong" style={styles.date}>{formatShortDate(p.observedAt)}</AppText>
                <AppText variant="caption" style={styles.flex} numberOfLines={1}>
                  {p.marketName} · {p.source === 'shelf' ? 'prateleira' : 'caixa'}
                </AppText>
                <AppText variant="price">{formatBRL(p.price)}</AppText>
              </View>
            ))}
          </Card>
        </>
      ) : (
        <PremiumLock title="Veja o gráfico, média, menor e maior preço registrado." />
      )}

      <AppText variant="heading">Comparação entre mercados</AppText>
      {canCompare ? (
        markets.length > 0 ? (
          <Card style={styles.card}>
            {best ? (
              <AppText variant="bodyStrong" color={colors.primaryDark}>🏆 Melhor preço: {best.marketName}</AppText>
            ) : null}
            {markets
              .slice()
              .sort((a, b) => a.price - b.price)
              .map((m) => (
                <View key={m.marketId} style={styles.pointRow}>
                  <AppText variant="bodyStrong" style={styles.flex}>{m.marketName}</AppText>
                  <AppText variant="price" color={m.marketId === best?.marketId ? colors.primaryDark : undefined}>{formatBRL(m.price)}</AppText>
                </View>
              ))}
          </Card>
        ) : (
          <AppText variant="caption">Ainda não há preços deste produto em outros mercados.</AppText>
        )
      ) : (
        <PremiumLock title="Descubra em qual mercado este produto está mais barato." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: spacing.md },
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, gap: 2 },
  pointRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  date: { width: 52 },
  lock: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
