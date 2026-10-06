import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Header } from '@/components/Header';
import { ProcessingOverlay } from '@/components/ProcessingOverlay';
import { Screen } from '@/components/Screen';
import { colors, radius, spacing } from '@/constants/theme';
import { useConferenceStore } from '@/store/conferenceStore';
import { useEnsureShopping } from '@/hooks/useEnsureShopping';
import { toUserMessage } from '@/utils/errors';
import { formatBRL } from '@/utils/money';

const STAGE_TEXT = {
  reading: 'Lendo produtos e preços do cupom...',
  saving: 'Salvando sua conferência...',
  matching: 'Comparando com os preços da prateleira...',
} as const;

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const shopping = useEnsureShopping(id);
  const { processReceipt, stage } = useConferenceStore();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickFromGallery = async () => {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    setPhotoUri(asset.uri);
    try {
      await processReceipt(id, { uri: asset.uri, width: asset.width });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      router.replace(`/shopping/${id}/conference`);
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setPhotoUri(null);
    }
  };

  return (
    <View style={styles.flex}>
      <Screen
        footer={
          <View style={styles.actions}>
            <Button title="Fotografar cupom" icon="camera" size="lg" onPress={() => router.push(`/shopping/${id}/camera?mode=receipt`)} />
            <Button title="Adicionar imagem da galeria" variant="secondary" icon="images-outline" onPress={pickFromGallery} />
          </View>
        }
      >
        <Header title="Conferir cupom" subtitle={shopping?.marketName} />
        <View style={styles.hero}>
          <View style={styles.icon}>
            <Ionicons name="receipt-outline" size={44} color={colors.primary} />
          </View>
          <AppText variant="title" align="center">Fotografe seu cupom fiscal para conferir os preços.</AppText>
          <AppText variant="body" align="center" color={colors.textSecondary}>
            Vamos comparar cada item cobrado com o preço que você fotografou na prateleira.
          </AppText>
        </View>
        {shopping ? (
          <View style={styles.expected}>
            <AppText variant="caption">Total esperado</AppText>
            <AppText variant="price">{formatBRL(shopping.expectedTotal)}</AppText>
          </View>
        ) : null}
        <View style={styles.tips}>
          <AppText variant="bodyStrong">Dicas para uma boa leitura</AppText>
          <AppText variant="caption">• Estique o cupom sobre uma superfície plana</AppText>
          <AppText variant="caption">• Use boa iluminação, sem reflexos</AppText>
          <AppText variant="caption">• Cupom muito longo? Fotografe a parte com os itens</AppText>
        </View>
        {error ? <ErrorBanner message={error} onRetry={pickFromGallery} /> : null}
      </Screen>
      {photoUri ? <ProcessingOverlay title="Processando cupom..." message={stage ? STAGE_TEXT[stage] : undefined} imageUri={photoUri} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  actions: { gap: spacing.sm },
  hero: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  icon: {
    width: 96,
    height: 96,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expected: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  tips: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.lg, gap: 4 },
});
