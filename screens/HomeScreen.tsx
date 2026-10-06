import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBanner } from '@/components/ErrorBanner';
import { PlanUsage } from '@/components/PlanUsage';
import { Screen } from '@/components/Screen';
import { ShoppingCard } from '@/components/ShoppingCard';
import { colors, radius, shadow, spacing } from '@/constants/theme';
import { useHistoryStore } from '@/store/historyStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { formatBRL } from '@/utils/money';
import { openShopping } from '@/utils/navigation';

export default function HomeScreen() {
  const { shoppings, loading, error, loaded, refresh } = useHistoryStore();
  const refreshPlan = useSubscriptionStore((s) => s.refresh);
  const historyDays = useSubscriptionStore((s) => s.plan().historyDays);

  useFocusEffect(
    useCallback(() => {
      refresh(historyDays);
      refreshPlan();
    }, [refresh, refreshPlan, historyDays]),
  );

  const ongoing = shoppings.find((s) => s.status !== 'checked');
  const recent = shoppings.filter((s) => s.id !== ongoing?.id).slice(0, 5);

  return (
    <Screen refreshing={loading && loaded} onRefresh={() => refresh(historyDays)}>
      <View style={styles.greeting}>
        <AppText variant="title">Olá 👋</AppText>
        <AppText variant="body" color={colors.textSecondary}>Pronto para sua próxima compra?</AppText>
      </View>

      <Pressable onPress={() => router.push('/shopping/new')} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
        <View style={styles.ctaIcon}>
          <Ionicons name="add" size={30} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <AppText variant="title" color={colors.white}>Nova compra</AppText>
          <AppText variant="body" color="rgba(255,255,255,0.85)">Fotografe etiquetas e confira o cupom</AppText>
        </View>
      </Pressable>

      {ongoing ? (
        <Pressable onPress={() => openShopping(ongoing)} style={({ pressed }) => [styles.ongoing, pressed && styles.pressed]}>
          <Ionicons name="cart" size={22} color={colors.primaryDark} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong">Continuar compra em {ongoing.marketName}</AppText>
            <AppText variant="caption">
              {ongoing.itemCount} produtos · {formatBRL(ongoing.expectedTotal)}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      ) : null}

      <PlanUsage compact />

      <AppText variant="heading">Últimas compras</AppText>
      {error ? <ErrorBanner message={error} onRetry={() => refresh(historyDays)} /> : null}
      {loaded && !error && recent.length === 0 && !ongoing ? (
        <EmptyState icon="basket-outline" title="Nenhuma compra ainda" message="Suas compras conferidas aparecem aqui." />
      ) : null}
      {recent.map((shopping) => (
        <ShoppingCard key={shopping.id} shopping={shopping} onPress={() => openShopping(shopping)} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { gap: spacing.xs, marginTop: spacing.md },
  flex: { flex: 1, gap: 2 },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    ...shadow,
    shadowOpacity: 0.18,
  },
  ctaIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ongoing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});
