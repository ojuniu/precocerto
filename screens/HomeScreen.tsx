import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBanner } from '@/components/ErrorBanner';
import { GlassView } from '@/components/GlassView';
import { GradientCard } from '@/components/GradientCard';
import { Logo } from '@/components/Logo';
import { PillAction } from '@/components/PillAction';
import { PlanUsage } from '@/components/PlanUsage';
import { Screen } from '@/components/Screen';
import { ShoppingCard } from '@/components/ShoppingCard';
import { colors, radius, spacing } from '@/constants/theme';
import { useHistoryStore } from '@/store/historyStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { formatBRL } from '@/utils/money';
import { openShopping } from '@/utils/navigation';

function MiniStat({ icon, label, value, tone }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; tone?: string }) {
  return (
    <GlassView style={styles.stat}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={16} color={colors.primaryDark} />
      </View>
      <AppText variant="price" color={tone}>{value}</AppText>
      <AppText variant="caption">{label}</AppText>
    </GlassView>
  );
}

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
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const thisMonth = shoppings.filter((s) => s.createdAt >= monthStart);
  const spent = thisMonth.reduce((sum, s) => sum + (s.paidTotal ?? s.expectedTotal), 0);
  const divergences = thisMonth.reduce((sum, s) => sum + s.divergenceCount, 0);

  return (
    <Screen refreshing={loading && loaded} onRefresh={() => refresh(historyDays)}>
      <View style={styles.topRow}>
        <Logo size={44} />
        <View style={styles.flex}>
          <AppText variant="title">Olá 👋</AppText>
          <AppText variant="caption">Pronto para sua próxima compra?</AppText>
        </View>
        <Pressable onPress={() => router.push('/profile')} style={styles.roundButton} accessibilityLabel="Conta">
          <Ionicons name="person" size={20} color={colors.text} />
        </Pressable>
      </View>

      <GradientCard>
        <View style={styles.heroHeader}>
          <View style={styles.flex}>
            <AppText variant="title" color={colors.white}>{ongoing ? 'Compra em andamento' : 'Nova compra'}</AppText>
            <View style={styles.heroMeta}>
              <Ionicons name={ongoing ? 'storefront-outline' : 'sparkles-outline'} size={14} color="rgba(255,255,255,0.85)" />
              <AppText variant="caption" color="rgba(255,255,255,0.85)">
                {ongoing ? ongoing.marketName : 'Fotografe, some e confira no caixa'}
              </AppText>
            </View>
          </View>
          {ongoing ? (
            <GlassView tone="dark" style={styles.countChip}>
              <AppText variant="caption" color={colors.white}>{ongoing.itemCount} itens</AppText>
            </GlassView>
          ) : null}
        </View>
        {ongoing ? (
          <View>
            <AppText variant="label" color="rgba(255,255,255,0.7)">Total até agora</AppText>
            <AppText variant="priceLarge" color={colors.white}>{formatBRL(ongoing.expectedTotal)}</AppText>
          </View>
        ) : (
          <View style={styles.steps}>
            {(['camera', 'calculator', 'checkmark-done'] as const).map((icon, i) => (
              <GlassView key={icon} tone="dark" style={styles.step}>
                <Ionicons name={icon} size={18} color={colors.white} />
                <AppText variant="caption" color={colors.white}>{['Foto', 'Soma', 'Confere'][i]}</AppText>
              </GlassView>
            ))}
          </View>
        )}
        <PillAction
          title={ongoing ? 'Continuar compra' : 'Começar compra'}
          onPress={() => (ongoing ? openShopping(ongoing) : router.push('/shopping/new'))}
        />
      </GradientCard>

      <View style={styles.stats}>
        <MiniStat icon="bag-handle-outline" label="Compras no mês" value={String(thisMonth.length)} />
        <MiniStat icon="wallet-outline" label="Gasto no mês" value={formatBRL(spent)} />
        <MiniStat icon="alert-circle-outline" label="Divergências" value={String(divergences)} tone={divergences > 0 ? colors.danger : undefined} />
      </View>

      <PlanUsage compact />

      <View style={styles.sectionHeader}>
        <AppText variant="heading">Últimas compras</AppText>
        {recent.length > 0 ? (
          <Pressable onPress={() => router.push('/history')}>
            <AppText variant="bodyStrong" color={colors.primaryDark}>Ver todas</AppText>
          </Pressable>
        ) : null}
      </View>
      {error ? <ErrorBanner message={error} onRetry={() => refresh(historyDays)} /> : null}
      {loaded && !error && recent.length === 0 ? (
        <EmptyState icon="basket-outline" title="Nenhuma compra conferida ainda" message="Suas compras aparecem aqui com o total e as divergências." />
      ) : null}
      {recent.map((shopping) => (
        <ShoppingCard key={shopping.id} shopping={shopping} onPress={() => openShopping(shopping)} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  roundButton: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  countChip: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  steps: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm },
  step: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: spacing.md, borderRadius: radius.md },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, padding: spacing.md, gap: 2, borderRadius: radius.md },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
