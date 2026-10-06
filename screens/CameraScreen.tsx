import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { GlassView } from '@/components/GlassView';
import { IconButton } from '@/components/IconButton';
import { ProcessingOverlay } from '@/components/ProcessingOverlay';
import { colors, radius, spacing } from '@/constants/theme';
import { scanPriceTag, scanShelf } from '@/services/ocr/ocrService';
import { useConferenceStore, type ReceiptStage } from '@/store/conferenceStore';
import { useEnsureShopping } from '@/hooks/useEnsureShopping';
import { useScanStore } from '@/store/scanStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { AppError, toUserMessage } from '@/utils/errors';
import { formatBRL } from '@/utils/money';

export type CameraMode = 'tag' | 'shelf' | 'receipt';

const GUIDANCE: Record<CameraMode, { title: string; frame: { width: string; aspect: number }; processing: string }> = {
  tag: { title: 'Enquadre a etiqueta de preço', frame: { width: '82%', aspect: 1.6 }, processing: 'Lendo preço...' },
  shelf: { title: 'Enquadre várias etiquetas da prateleira', frame: { width: '92%', aspect: 1.1 }, processing: 'Lendo etiquetas...' },
  receipt: { title: 'Enquadre o cupom fiscal inteiro', frame: { width: '78%', aspect: 0.5 }, processing: 'Processando cupom...' },
};

const RECEIPT_STAGE_TEXT: Record<ReceiptStage, string> = {
  reading: 'Lendo produtos e preços do cupom...',
  saving: 'Salvando sua conferência...',
  matching: 'Comparando com os preços da prateleira...',
};

interface Photo {
  uri: string;
  width?: number;
}

export default function CameraScreen() {
  const params = useLocalSearchParams<{ id: string; mode?: CameraMode }>();
  const shoppingId = params.id;
  const [mode, setMode] = useState<CameraMode>(params.mode ?? 'tag');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const focused = useIsFocused();
  const [torch, setTorch] = useState(false);
  const [processing, setProcessing] = useState<Photo | null>(null);
  const [error, setError] = useState<{ message: string; photo: Photo } | null>(null);

  const shopping = useEnsureShopping(shoppingId);
  const canBatch = useSubscriptionStore((s) => s.can('batch_reading'));
  const setPriceTag = useScanStore((s) => s.setPriceTag);
  const setShelf = useScanStore((s) => s.setShelf);
  const processReceipt = useConferenceStore((s) => s.processReceipt);
  const receiptStage = useConferenceStore((s) => s.stage);
  const guidance = GUIDANCE[mode];

  const process = async (photo: Photo) => {
    setError(null);
    setProcessing(photo);
    try {
      if (mode === 'tag') {
        setPriceTag(await scanPriceTag(photo.uri, photo.width));
        router.push(`/shopping/${shoppingId}/confirm`);
      } else if (mode === 'shelf') {
        setShelf(await scanShelf(photo.uri, photo.width));
        router.push(`/shopping/${shoppingId}/shelf`);
      } else {
        await processReceipt(shoppingId, photo);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        router.dismissTo(`/shopping/${shoppingId}`);
        router.push(`/shopping/${shoppingId}/conference`);
      }
    } catch (e) {
      if (e instanceof AppError && e.code === 'premium_required') {
        router.push('/premium');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
        setError({ message: toUserMessage(e), photo });
      }
    } finally {
      setProcessing(null);
    }
  };

  const capture = async () => {
    if (!cameraRef.current || processing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      await process({ uri: picture.uri, width: picture.width });
    } catch (e) {
      setError({ message: toUserMessage(e), photo: { uri: '' } });
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    const asset = result.canceled ? null : result.assets[0];
    if (asset) await process({ uri: asset.uri, width: asset.width });
  };

  const selectMode = (next: CameraMode) => {
    if (next === 'shelf' && !canBatch) {
      router.push('/premium');
      return;
    }
    setMode(next);
  };

  if (!permission) return <View style={styles.black} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permission}>
        <Ionicons name="camera-outline" size={48} color={colors.primary} />
        <AppText variant="title" align="center">Precisamos da câmera</AppText>
        <AppText variant="body" align="center" color={colors.textSecondary}>
          É com ela que o PreçoCerto lê as etiquetas de preço e o cupom fiscal.
        </AppText>
        <Button title="Permitir câmera" onPress={requestPermission} size="lg" style={styles.fullWidth} />
        {mode === 'receipt' ? <Button title="Escolher da galeria" variant="secondary" icon="images" onPress={pickFromGallery} style={styles.fullWidth} /> : null}
        <Button title="Voltar" variant="ghost" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const modes: { key: CameraMode; label: string; icon: keyof typeof Ionicons.glyphMap; locked?: boolean }[] = [
    { key: 'tag', label: 'Etiqueta', icon: 'pricetag-outline' },
    { key: 'shelf', label: 'Prateleira', icon: 'grid-outline', locked: !canBatch },
    ...(mode === 'receipt' || (shopping?.itemCount ?? 0) > 0 ? [{ key: 'receipt' as const, label: 'Cupom', icon: 'receipt-outline' as const }] : []),
  ];

  return (
    <View style={styles.black}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} active={focused && !processing} />

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <IconButton icon="chevron-back" label="Fechar câmera" tone="dark" onPress={() => router.back()} />
          {mode !== 'receipt' && shopping && shopping.itemCount > 0 ? (
            <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Ver lista">
              <GlassView tone="dark" style={styles.summaryPill}>
                <Ionicons name="cart" size={16} color={colors.lime} />
                <AppText variant="bodyStrong" color={colors.white}>
                  {shopping.itemCount} · {formatBRL(shopping.expectedTotal)}
                </AppText>
              </GlassView>
            </Pressable>
          ) : (
            <GlassView tone="dark" style={styles.summaryPill}>
              <AppText variant="bodyStrong" color={colors.white}>{mode === 'receipt' ? 'Cupom fiscal' : 'Nova etiqueta'}</AppText>
            </GlassView>
          )}
          <IconButton icon={torch ? 'flash' : 'flash-off'} label="Lanterna" tone="dark" onPress={() => setTorch((t) => !t)} />
        </View>

        <View style={styles.guideArea}>
          <View style={[styles.frame, { width: guidance.frame.width as `${number}%`, aspectRatio: guidance.frame.aspect }]}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <GlassView tone="dark" style={styles.guidePill}>
            <AppText variant="bodyStrong" color={colors.white} align="center">{guidance.title}</AppText>
          </GlassView>
        </View>

        {error ? (
          <View style={styles.errorPanel}>
            <AppText variant="bodyStrong">Não deu certo desta vez</AppText>
            <AppText variant="body" color={colors.textSecondary}>{error.message}</AppText>
            <View style={styles.errorActions}>
              {error.photo.uri ? (
                <Button title="Tentar de novo" icon="refresh" onPress={() => process(error.photo)} style={styles.flex} />
              ) : null}
              {mode === 'tag' ? (
                <Button
                  title="Digitar"
                  variant="secondary"
                  icon="create-outline"
                  onPress={() => router.push(`/shopping/${shoppingId}/confirm?manual=1`)}
                  style={styles.flex}
                />
              ) : null}
            </View>
            <Button title="Fechar" variant="ghost" onPress={() => setError(null)} />
          </View>
        ) : null}

        <GlassView tone="dark" intensity={50} style={styles.panel}>
          <View style={styles.tiles}>
            {modes.map((m) => {
              const selected = mode === m.key;
              return (
                <Pressable
                  key={m.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => selectMode(m.key)}
                  style={[styles.tile, selected && styles.tileSelected]}
                >
                  <Ionicons name={m.icon} size={20} color={selected ? colors.ink : colors.white} />
                  <AppText variant="caption" color={selected ? colors.ink : colors.white}>
                    {m.label}
                    {m.locked ? ' ★' : ''}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.controls}>
            <IconButton icon="images-outline" label="Escolher da galeria" tone="dark" size={52} onPress={pickFromGallery} />
            <Pressable accessibilityRole="button" accessibilityLabel="Fotografar" onPress={capture} style={({ pressed }) => [styles.shutter, pressed && styles.shutterPressed]}>
              <View style={styles.shutterInner} />
            </Pressable>
            {mode === 'tag' ? (
              <IconButton
                icon="create-outline"
                label="Digitar preço"
                tone="dark"
                size={52}
                onPress={() => router.push(`/shopping/${shoppingId}/confirm?manual=1`)}
              />
            ) : (
              <View style={styles.placeholder} />
            )}
          </View>
        </GlassView>
      </SafeAreaView>

      {processing ? (
        <ProcessingOverlay
          title={guidance.processing}
          message={mode === 'receipt' && receiptStage ? RECEIPT_STAGE_TEXT[receiptStage] : 'Reconhecendo produto e preço'}
          imageUri={processing.uri}
        />
      ) : null}
    </View>
  );
}

const CORNER = 28;

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000' },
  flex: { flex: 1 },
  fullWidth: { alignSelf: 'stretch' },
  permission: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xxl,
    backgroundColor: colors.background,
  },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  summaryPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  guideArea: { alignItems: 'center', gap: spacing.lg, flexShrink: 1 },
  guidePill: { borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginHorizontal: spacing.xl },
  frame: { maxHeight: '70%' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.lime },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 18 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 18 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 18 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 18 },
  errorPanel: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 230,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    zIndex: 5,
  },
  errorActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  panel: { marginHorizontal: spacing.md, marginBottom: spacing.sm, borderRadius: radius.xl, padding: spacing.md, gap: spacing.lg },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tileSelected: { backgroundColor: colors.white },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', alignSelf: 'stretch', paddingBottom: spacing.xs },
  shutter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterPressed: { transform: [{ scale: 0.94 }] },
  shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.white },
  placeholder: { width: 52 },
});
