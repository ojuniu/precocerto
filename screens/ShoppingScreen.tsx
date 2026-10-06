import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBanner } from '@/components/ErrorBanner';
import { GlassView } from '@/components/GlassView';
import { GradientCard } from '@/components/GradientCard';
import { Header } from '@/components/Header';
import { ItemRow } from '@/components/ItemRow';
import { PillAction } from '@/components/PillAction';
import { PlanUsage } from '@/components/PlanUsage';
import { Screen } from '@/components/Screen';
import { colors, radius, shadow, spacing } from '@/constants/theme';
import { summarizeCheckout } from '@/services/comparison/checkout';
import { useShoppingStore } from '@/store/shoppingStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { formatBRL } from '@/utils/money';

export default function ShoppingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { shopping, items, loading, error, load } = useShoppingStore();
  const refreshPlan = useSubscriptionStore((s) => s.refresh);

  useFocusEffect(
    useCallback(() => {
      if (id) load(id);
      refreshPlan();
    }, [id, load, refreshPlan]),
  );

  if (!shopping) {
    return (
      <SafeAreaView style={styles.center}>
        {error ? <ErrorBanner message={error} onRetry={() => id && load(id)} /> : <ActivityIndicator color={colors.primary} />}
      </SafeAreaView>
    );
  }

  const checked = shopping.status === 'checked';
  const unitCount = items.reduce((sum, item) => sum + (item.priceUnit === 'un' ? item.quantity : 1), 0);
  const checkout = summarizeCheckout(items);
  const checkoutStarted = checkout.passedCount > 0;

  return (
    <View style={styles.flex}>
      <Screen
        refreshing={loading}
        onRefresh={() => load(shopping.id)}
        footer={
          items.length > 0 ? (
            checked ? (
              <Button
                title="Ver conferência"
                variant="dark"
                size="lg"
                icon="receipt-outline"
                onPress={() => router.push(`/shopping/${shopping.id}/conference`)}
              />
            ) : (
              <Button
                title="Conferir pelo cupom"
                variant="secondary"
                icon="receipt-outline"
                onPress={() => router.push(`/shopping/${shopping.id}/receipt`)}
              />
            )
          ) : undefined
        }
      >
        <Header title="Minha compra" subtitle={shopping.marketName} onBack={() => router.navigate('/home')} />

        <GradientCard>
          <View style={styles.heroTop}>
            <GlassView tone="dark" style={styles.chip}>
              <Ionicons name="cart-outline" size={14} color={colors.white} />
              <AppText variant="caption" color={colors.white}>
                {items.length} {items.length === 1 ? 'produto' : 'produtos'} · {unitCount} {unitCount === 1 ? 'item' : 'itens'}
              </AppText>
            </GlassView>
            {checked ? (
              <GlassView tone="dark" style={styles.chip}>
                <Ionicons name="checkmark-circle" size={14} color={colors.lime} />
                <AppText variant="caption" color={colors.white}>Conferida</AppText>
              </GlassView>
            ) : null}
          </View>
          <View>
            <AppText variant="label" color="rgba(255,255,255,0.8)">Total pelas etiquetas</AppText>
            <AppText variant="priceLarge" color={colors.white} style={styles.heroPrice}>
              {formatBRL(shopping.expectedTotal)}
            </AppText>
            <AppText variant="caption" color="rgba(255,255,255,0.85)">
              {checked
                ? shopping.difference && shopping.difference > 0
                  ? `Cobrado a mais: ${formatBRL(shopping.difference)}`
                  : 'Nenhuma cobrança a mais registrada.'
                : 'É esse o valor que deve aparecer no caixa.'}
            </AppText>
          </View>
          {!checked && items.length > 0 ? (
            <PillAction
              title={checkoutStarted ? 'Continuar no caixa' : 'Estou no caixa'}
              icon="storefront-outline"
              onPress={() => router.push(`/shopping/${shopping.id}/checkout`)}
            />
          ) : null}
        </GradientCard>

        <PlanUsage compact />
        {error ? <ErrorBanner message={error} onRetry={() => load(shopping.id)} /> : null}

        {items.length === 0 ? (
          <EmptyState
            icon="pricetag-outline"
            title="Fotografe a primeira etiqueta"
            message="O produto e o preço são reconhecidos e somados automaticamente."
          />
        ) : (
          <>
            <AppText variant="heading">No carrinho</AppText>
            <Card tone="glass" style={styles.list}>
              {items.map((item, index) => (
                <View key={item.id} style={index > 0 ? styles.separator : undefined}>
                  <ItemRow item={item} onPress={() => router.push(`/shopping/${shopping.id}/item/${item.id}`)} />
                </View>
              ))}
            </Card>
          </>
        )}
      </Screen>

      {!checked ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Adicionar produto"
          onPress={() => router.push(`/shopping/${shopping.id}/camera`)}
          style={({ pressed }) => [styles.fab, items.length > 0 && styles.fabRaised, pressed && styles.pressed]}
        >
          <Ionicons name="scan" size={22} color={colors.white} />
          <AppText variant="bodyStrong" color={colors.white}>Adicionar</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background },
  heroTop: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  heroPrice: { fontSize: 44, lineHeight: 52 },
  list: { paddingVertical: spacing.xs },
  separator: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    ...shadow,
    shadowOpacity: 0.25,
  },
  fabRaised: { bottom: 100 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
});
