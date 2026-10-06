import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { AppText } from './AppText';

/** Barra de uso do plano gratuito; some no Premium. */
export function PlanUsage({ compact = false }: { compact?: boolean }) {
  const plan = useSubscriptionStore((s) => s.plan());
  const used = useSubscriptionStore((s) => s.productsThisMonth);
  const limit = plan.monthlyProductLimit;
  if (limit === null) return null;
  const ratio = Math.min(1, used / limit);
  const nearLimit = ratio >= 0.8;
  if (compact && !nearLimit) return null;
  return (
    <Pressable onPress={() => router.push('/premium')} style={[styles.box, nearLimit && styles.warning]}>
      <View style={styles.row}>
        <AppText variant="caption" color={colors.text}>
          {used} de {limit} produtos este mês
        </AppText>
        <AppText variant="caption" color={colors.primaryDark}>Ver Premium</AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: nearLimit ? colors.warning : colors.primary }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  warning: { backgroundColor: colors.warningSoft },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
