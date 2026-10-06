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
import { Header } from '@/components/Header';
import { ItemRow } from '@/components/ItemRow';
import { PlanUsage } from '@/components/PlanUsage';
import { Screen } from '@/components/Screen';
import { colors, radius, shadow, spacing } from '@/constants/theme';
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

  return (
    <View style={styles.flex}>
      <Screen
        refreshing={loading}
        onRefresh={() => load(shopping.id)}
        footer={
          items.length > 0 ? (
            <Button
              title={checked ? 'Ver conferência' : 'Finalizar e conferir cupom'}
              variant="dark"
              size="lg"
              icon="receipt-outline"
              onPress={() => router.push(checked ? `/shopping/${shopping.id}/conference` : `/shopping/${shopping.id}/receipt`)}
            />
          ) : undefined
        }
      >
        <Header title="Minha compra" subtitle={shopping.marketName} onBack={() => router.navigate('/home')} />

        <Card style={styles.totalCard}>
          <AppText variant="label">Total estimado</AppText>
          <AppText variant="priceLarge">{formatBRL(shopping.expectedTotal)}</AppText>
          <AppText variant="caption">
            {items.length} {items.length === 1 ? 'produto' : 'produtos'} · {unitCount} {unitCount === 1 ? 'item' : 'itens'}
          </AppText>
        </Card>

        <PlanUsage compact />
        {error ? <ErrorBanner message={error} onRetry={() => load(shopping.id)} /> : null}

        {items.length === 0 ? (
          <EmptyState
            icon="pricetag-outline"
            title="Fotografe a primeira etiqueta"
            message="O produto e o preço são reconhecidos automaticamente."
          />
        ) : (
          <Card style={styles.list}>
            {items.map((item, index) => (
              <View key={item.id} style={index > 0 ? styles.separator : undefined}>
                <ItemRow item={item} onPress={() => router.push(`/shopping/${shopping.id}/item/${item.id}`)} />
              </View>
            ))}
          </Card>
        )}
      </Screen>

      {!checked ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Adicionar produto"
          onPress={() => router.push(`/shopping/${shopping.id}/camera`)}
          style={({ pressed }) => [styles.fab, items.length > 0 && styles.fabRaised, pressed && styles.pressed]}
        >
          <Ionicons name="camera" size={22} color={colors.white} />
          <AppText variant="bodyStrong" color={colors.white}>Adicionar produto</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background },
  totalCard: { gap: spacing.xs },
  list: { paddingVertical: spacing.xs },
  separator: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    ...shadow,
    shadowOpacity: 0.25,
  },
  fabRaised: { bottom: 110 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
});
