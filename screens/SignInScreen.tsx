import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Logo } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { colors, spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { toUserMessage } from '@/utils/errors';

type Mode = 'sign-in' | 'sign-up';
type Busy = 'email' | 'guest' | null;

export default function SignInScreen() {
  const { signInWithEmail, signUpWithEmail, continueAsGuest } = useAuthStore();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (kind: Busy, action: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await action();
      router.replace('/home');
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const submit = () => {
    if (!email.includes('@') || password.length < 6) {
      setError('Informe um e-mail válido e uma senha com pelo menos 6 caracteres.');
      return;
    }
    run('email', () => (mode === 'sign-in' ? signInWithEmail(email, password) : signUpWithEmail(email, password)));
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Logo size={72} />
        <AppText variant="display">PreçoCerto</AppText>
        <AppText variant="body" color={colors.textSecondary}>Seu fiscal de preços pessoal no supermercado.</AppText>
      </View>

      <Button title="Começar agora" size="lg" icon="flash" loading={busy === 'guest'} disabled={busy !== null} onPress={() => run('guest', continueAsGuest)} />
      <AppText variant="caption" align="center">Sem cadastro. Você pode criar uma conta depois para não perder seu histórico.</AppText>

      <View style={styles.divider}>
        <View style={styles.line} />
        <AppText variant="caption">ou use seu e-mail</AppText>
        <View style={styles.line} />
      </View>

      <TextField label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <TextField label="Senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
      {error ? <ErrorBanner message={error} /> : null}
      <Button title={mode === 'sign-in' ? 'Entrar' : 'Criar conta'} variant="dark" loading={busy === 'email'} disabled={busy !== null} onPress={submit} />
      <Button
        title={mode === 'sign-in' ? 'Não tenho conta' : 'Já tenho conta'}
        variant="ghost"
        onPress={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.sm, marginTop: spacing.xxl, marginBottom: spacing.lg },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.sm },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
