import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { GlassView } from '@/components/GlassView';
import { GradientCard } from '@/components/GradientCard';
import { IconButton } from '@/components/IconButton';
import { Logo } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { colors, gradients, spacing } from '@/constants/theme';
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
      <GradientCard colors={gradients.ink}>
        <Logo size={56} inverted />
        <AppText variant="display" color={colors.white}>PreçoCerto <AppText variant="display" color={colors.lime}>Premium</AppText></AppText>
        <AppText variant="body" color="rgba(255,255,255,0.8)">Seu fiscal de preços sem limites.</AppText>
        <AppText variant="priceLarge" color={colors.white}>
          {formatBRL(premium.priceMonthly)}
          <AppText variant="body" color="rgba(255,255,255,0.7)"> /mês</AppText>
        </AppText>
      </GradientCard>
      <GlassView style={styles.list}>
        {PREMIUM_HIGHLIGHTS.map((feature) => (
          <View key={feature} style={styles.feature}>
            <View style={styles.check}>
              <Ionicons name="checkmark" size={16} color={colors.white} />
            </View>
            <AppText variant="bodyStrong">{feature}</AppText>
          </View>
        ))}
      </GlassView>
      <AppText variant="caption">
        Plano gratuito: até {PLANS.free.monthlyProductLimit} produtos por mês, leitura de etiquetas, conferência de cupom e histórico dos últimos {PLANS.free.historyDays} dias.
      </AppText>
      {error ? <ErrorBanner message={error} tone="warning" /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  close: { alignItems: 'flex-end' },
  list: { gap: spacing.md, padding: spacing.xl },
  feature: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  check: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
