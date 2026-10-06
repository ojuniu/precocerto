import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { IconButton } from '@/components/IconButton';
import { Logo } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { colors, radius, spacing } from '@/constants/theme';
import { getPaymentProvider, PLANS, PREMIUM_HIGHLIGHTS } from '@/services/subscription';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { toUserMessage } from '@/utils/errors';
import { formatBRL } from '@/utils/money';

export default function PremiumScreen() {
  const refresh = useSubscriptionStore((s) => s.refresh);
  const isPremium = useSubscriptionStore((s) => s.plan().id === 'premium');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const premium = PLANS.premium;

  const subscribe = async () => {
    setBusy(true);
    setError(null);
    try {
      await getPaymentProvider().purchase('premium');
      await refresh();
      router.back();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      edges={['top']}
      footer={
        isPremium ? (
          <Button title="Você já é Premium" variant="secondary" icon="checkmark-circle" onPress={() => router.back()} />
        ) : (
          <Button title={`Assinar por ${formatBRL(premium.priceMonthly)}/mês`} size="lg" loading={busy} onPress={subscribe} />
        )
      }
    >
      <View style={styles.close}>
        <IconButton icon="close" label="Fechar" onPress={() => router.back()} />
      </View>
      <View style={styles.hero}>
        <Logo size={64} />
        <AppText variant="display">PreçoCerto Premium</AppText>
        <AppText variant="body" color={colors.textSecondary}>Seu fiscal de preços sem limites.</AppText>
      </View>
      <View style={styles.list}>
        {PREMIUM_HIGHLIGHTS.map((feature) => (
          <View key={feature} style={styles.feature}>
            <View style={styles.check}>
              <Ionicons name="checkmark" size={16} color={colors.white} />
            </View>
            <AppText variant="bodyStrong">{feature}</AppText>
          </View>
        ))}
      </View>
      <AppText variant="caption">
        Plano gratuito: até {PLANS.free.monthlyProductLimit} produtos por mês, leitura de etiquetas, conferência de cupom e histórico dos últimos {PLANS.free.historyDays} dias.
      </AppText>
      {error ? <ErrorBanner message={error} tone="warning" /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  close: { alignItems: 'flex-end' },
  hero: { gap: spacing.sm },
  list: { gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl },
  feature: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  check: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
