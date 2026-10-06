import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { ShoppingCard } from '@/components/ShoppingCard';
import { colors, spacing } from '@/constants/theme';
import { useHistoryStore } from '@/store/historyStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { formatBRL, formatSignedBRL } from '@/utils/money';
import { openShopping } from '@/utils/navigation';

export default function HistoryScreen() {
  const { shoppings, loading, loaded, error, refresh } = useHistoryStore();
  const historyDays = useSubscriptionStore((s) => s.plan().historyDays);

  useFocusEffect(
    useCallback(() => {
      refresh(historyDays);
    }, [refresh, historyDays]),
  );

  const checked = shoppings.filter((s) => s.status === 'checked');
  const totalPaid = checked.reduce((sum, s) => sum + (s.paidTotal ?? 0), 0);
  const overcharged = checked.reduce((sum, s) => sum + Math.max(0, s.difference ?? 0), 0);
  const divergences = checked.reduce((sum, s) => sum + s.divergenceCount, 0);

  return (
    <Screen refreshing={loading && loaded} onRefresh={() => refresh(historyDays)}>
      <AppText variant="title" style={styles.title}>Histórico</AppText>

      {checked.length > 0 ? (
        <Card style={styles.stats}>
          <View style={styles.stat}>
            <AppText variant="label">Conferidas</AppText>
            <AppText variant="heading">{checked.length}</AppText>
          </View>
          <View style={styles.stat}>
            <AppText variant="label">Total pago</AppText>
            <AppText variant="heading">{formatBRL(totalPaid)}</AppText>
          </View>
          <View style={styles.stat}>
            <AppText variant="label">Cobrado a mais</AppText>
            <AppText variant="heading" color={overcharged > 0 ? colors.danger : colors.primaryDark}>
              {overcharged > 0 ? formatSignedBRL(overcharged) : 'R$ 0,00'}
            </AppText>
            <AppText variant="caption">{divergences} divergências</AppText>
          </View>
        </Card>
      ) : null}

      {error ? <ErrorBanner message={error} onRetry={() => refresh(historyDays)} /> : null}
      {loaded && shoppings.length === 0 && !error ? (
        <EmptyState
          icon="time-outline"
          title="Seu histórico está vazio"
          message="Cada compra conferida fica salva aqui com todos os detalhes."
          action={<Button title="Nova compra" icon="add" onPress={() => router.push('/shopping/new')} />}
        />
      ) : null}
      {shoppings.map((shopping) => (
        <ShoppingCard key={shopping.id} shopping={shopping} onPress={() => openShopping(shopping)} />
      ))}
      {historyDays ? (
        <Button title={`Mostrando os últimos ${historyDays} dias · Ver histórico completo`} variant="ghost" onPress={() => router.push('/premium')} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.md },
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, gap: 2 },
});
