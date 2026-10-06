import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Logo } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { colors, fonts, spacing } from '@/constants/theme';

/** Exibida quando o app roda sem as variáveis do Supabase: explica exatamente o que falta. */
export default function SetupScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <Logo size={56} />
        <AppText variant="title">Configuração necessária</AppText>
        <AppText variant="body" color={colors.textSecondary}>
          O PreçoCerto precisa de um projeto Supabase para salvar compras e de uma chave de IA no servidor para ler etiquetas e cupons.
        </AppText>
      </View>
      <Card style={styles.card}>
        <AppText variant="heading">1. Crie o arquivo .env na raiz do projeto</AppText>
        <AppText style={styles.code}>{'EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co\nEXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...'}</AppText>
      </Card>
      <Card style={styles.card}>
        <AppText variant="heading">2. Aplique o banco e publique a função de IA</AppText>
        <AppText style={styles.code}>{'supabase db push\nsupabase secrets set GEMINI_API_KEY=...\nsupabase functions deploy ai-vision'}</AppText>
      </Card>
      <Card style={styles.card}>
        <AppText variant="heading">3. Reinicie o Expo</AppText>
        <AppText style={styles.code}>npx expo start -c</AppText>
        <AppText variant="caption">Detalhes completos no README.md.</AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.md, marginTop: spacing.xl },
  card: { gap: spacing.sm },
  code: {
    fontFamily: fonts.medium,
    fontSize: 13,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    borderRadius: 10,
  },
});
