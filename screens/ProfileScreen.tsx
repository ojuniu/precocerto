import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorBanner } from '@/components/ErrorBanner';
import { PlanUsage } from '@/components/PlanUsage';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { colors, spacing } from '@/constants/theme';
import { getSupabase } from '@/services/data/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { formatDate } from '@/utils/date';
import { toUserMessage } from '@/utils/errors';

export default function ProfileScreen() {
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const plan = useSubscriptionStore((s) => s.plan());
  const subscription = useSubscriptionStore((s) => s.subscription);
  const refreshPlan = useSubscriptionStore((s) => s.refresh);
  const showToast = useToast((s) => s.show);
  const isGuest = session?.user.is_anonymous ?? false;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshPlan();
    }, [refreshPlan]),
  );

  /** Converte a conta anônima em conta com e-mail, mantendo todo o histórico. */
  const saveAccount = async () => {
    if (!email.includes('@') || password.length < 6) {
      setError('Informe um e-mail válido e uma senha com pelo menos 6 caracteres.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await getSupabase().auth.updateUser({ email: email.trim(), password });
      if (updateError) throw updateError;
      showToast('Conta criada! Confirme o e-mail se solicitado.');
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const confirmSignOut = () => {
    const message = isGuest ? 'Você está sem conta: ao sair, seu histórico não poderá ser recuperado.' : 'Você poderá entrar novamente com seu e-mail.';
    Alert.alert('Sair?', message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => signOut().then(() => router.replace('/sign-in')) },
    ]);
  };

  return (
    <Screen>
      <AppText variant="title" style={styles.title}>Conta</AppText>

      <Card style={styles.card}>
        <View style={styles.row}>
          <Ionicons name="person-circle" size={44} color={colors.primary} />
          <View style={styles.flex}>
            <AppText variant="heading">{isGuest ? 'Visitante' : session?.user.email}</AppText>
            <AppText variant="caption">{isGuest ? 'Sem conta vinculada' : 'Conta com e-mail'}</AppText>
          </View>
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.row}>
          <AppText variant="heading" style={styles.flex}>Plano {plan.name}</AppText>
          <StatusPill label={plan.id === 'premium' ? 'Ativo' : 'Gratuito'} tone={plan.id === 'premium' ? 'success' : 'neutral'} />
        </View>
        {plan.id === 'premium' && subscription.currentPeriodEnd ? (
          <AppText variant="caption">Renova em {formatDate(subscription.currentPeriodEnd)}</AppText>
        ) : null}
        <PlanUsage />
        {plan.id === 'free' ? <Button title="Conhecer o Premium" icon="star" onPress={() => router.push('/premium')} /> : null}
      </Card>

      {isGuest ? (
        <Card style={styles.card}>
          <AppText variant="heading">Salve seu histórico</AppText>
          <AppText variant="caption">Crie uma conta para acessar suas compras em outro celular.</AppText>
          <TextField label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextField label="Senha" value={password} onChangeText={setPassword} secureTextEntry />
          {error ? <ErrorBanner message={error} /> : null}
          <Button title="Criar conta" variant="dark" loading={saving} onPress={saveAccount} />
        </Card>
      ) : null}

      <Button title="Sair" variant="ghost" icon="log-out-outline" onPress={confirmSignOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.md },
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
});
