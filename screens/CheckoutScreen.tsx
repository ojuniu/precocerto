import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { GlassView } from '@/components/GlassView';
import { GradientCard } from '@/components/GradientCard';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { colors, gradients, radius, spacing } from '@/constants/theme';
import { useEnsureShopping } from '@/hooks/useEnsureShopping';
import { useSignedImages } from '@/hooks/useSignedImages';
import { summarizeCheckout } from '@/services/comparison/checkout';
import { describePromo, effectiveUnitPrice, expectedLineTotal } from '@/services/pricing/pricing';
import { itemTitle } from '@/services/shopping/itemDraft';
import { useShoppingStore } from '@/store/shoppingStore';
import type { ShoppingItem } from '@/types/domain';
import { formatDate } from '@/utils/date';
import { toUserMessage } from '@/utils/errors';
import { formatBRL, formatQuantity, formatSignedBRL, parseMoney } from '@/utils/money';

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function CheckoutRow({ item, imageUrl, onToggle, onWrong }: { item: ShoppingItem; imageUrl?: string; onToggle: () => void; onWrong: () => void }) {
  const passed = item.checkoutStatus === 'passed';
  const wrong = item.checkoutStatus === 'wrong';
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: passed }}
      accessibilityLabel={`Passou no caixa: ${itemTitle(item)}`}
      onPress={onToggle}
      style={({ pressed }) => [styles.row, wrong && styles.rowWrong, pressed && styles.pressed]}>
      <View style={[styles.check, passed && styles.checkOn, wrong && styles.checkWrong]}>
        {passed ? <Ionicons name="checkmark" size={18} color={colors.white} /> : null}
        {wrong ? <Ionicons name="alert" size={18} color={colors.white} /> : null}
      </View>
      {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.thumb} /> : null}
      <View style={styles.flex}>
        <AppText variant="bodyStrong" numberOfLines={1} style={passed ? styles.done : undefined}>{itemTitle(item)}</AppText>
        <AppText variant="caption">
          {item.quantity !== 1 ? `${formatQuantity(item.quantity)}${item.priceUnit === 'un' ? 'x' : ` ${item.priceUnit}`} · ` : ''}
          {wrong && item.checkoutChargedPrice !== null
            ? `Caixa: ${formatBRL(item.checkoutChargedPrice)}`
            : describePromo(item.promo, item.promoPrice) ?? 'Toque quando passar'}
        </AppText>
      </View>
      <View style={styles.right}>
        <AppText variant="price" color={wrong ? colors.danger : undefined}>{formatBRL(expectedLineTotal(item, item.quantity))}</AppText>
        <Pressable hitSlop={8} onPress={onWrong}>
          <AppText variant="caption" color={colors.danger}>{wrong ? 'Ver prova' : 'Preço errado?'}</AppText>
        </Pressable>
      </View>
    </Pressable>
  );
}

/** "Na placa tava X": cartão em tela cheia para mostrar ao atendente, com a foto da etiqueta. */
function ProofSheet({ item, imageUrl, marketName, onClose, onSave, onClear }: {
  item: ShoppingItem;
  imageUrl?: string;
  marketName: string;
  onClose: () => void;
  onSave: (charged: number | null) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const [charged, setCharged] = useState(item.checkoutChargedPrice !== null ? item.checkoutChargedPrice.toFixed(2).replace('.', ',') : '');
  const [saving, setSaving] = useState(false);
  const unit = effectiveUnitPrice(item);
  const chargedValue = parseMoney(charged);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(chargedValue);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.sheet}>
        <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
          <Header title="Mostre ao atendente" onBack={onClose} />
          <GradientCard>
            <AppText variant="label" color="rgba(255,255,255,0.75)">Preço na etiqueta</AppText>
            <AppText style={styles.bigPrice} color={colors.white}>{formatBRL(unit)}</AppText>
            <AppText variant="heading" color={colors.white}>{itemTitle(item)}</AppText>
            {describePromo(item.promo, item.promoPrice) ? (
              <GlassView tone="dark" style={styles.promoChip}>
                <AppText variant="caption" color={colors.white}>{describePromo(item.promo, item.promoPrice)}</AppText>
              </GlassView>
            ) : null}
            <AppText variant="caption" color="rgba(255,255,255,0.8)">
              Fotografado em {formatDate(item.createdAt)} às {formatTime(item.createdAt)} · {marketName}
            </AppText>
          </GradientCard>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.proofImage} resizeMode="contain" />
          ) : (
            <GlassView style={styles.noImage}>
              <Ionicons name="image-outline" size={22} color={colors.textMuted} />
              <AppText variant="caption">Este item foi digitado, sem foto da etiqueta.</AppText>
            </GlassView>
          )}
          <TextField label="Quanto apareceu no caixa? (opcional)" prefix="R$" value={charged} onChangeText={setCharged} keyboardType="decimal-pad" placeholder="0,00" />
          {chargedValue !== null ? (
            <AppText variant="bodyStrong" color={chargedValue > unit ? colors.danger : colors.primaryDark}>
              Diferença por unidade: {formatSignedBRL(chargedValue - unit)}
            </AppText>
          ) : null}
          <Button title="Registrar divergência" variant="dark" size="lg" icon="flag" loading={saving} onPress={save} />
          {item.checkoutStatus === 'wrong' ? <Button title="O caixa corrigiu" variant="secondary" icon="checkmark" onPress={onClear} /> : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function CheckoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const shopping = useEnsureShopping(id);
  const items = useShoppingStore((s) => s.items);
  const { setCheckout, finishCheckout } = useShoppingStore();
  const showToast = useToast((s) => s.show);
  const images = useSignedImages(items.map((i) => i.imagePath));
  const [proofItemId, setProofItemId] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  if (!shopping) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  const summary = summarizeCheckout(items);
  const progress = items.length === 0 ? 0 : summary.passedCount / items.length;
  const proofItem = items.find((i) => i.id === proofItemId) ?? null;
  const ordered = [...items].sort((a, b) => Number(a.checkoutStatus === 'passed') - Number(b.checkoutStatus === 'passed'));

  const run = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (e) {
      showToast(toUserMessage(e), 'error');
    }
  };

  const toggle = (item: ShoppingItem) =>
    run(async () => {
      Haptics.selectionAsync().catch(() => undefined);
      await setCheckout(item.id, item.checkoutStatus === 'pending' ? 'passed' : 'pending');
    });

  const finish = async () => {
    setFinishing(true);
    try {
      await finishCheckout();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      showToast(summary.wrongCount > 0 ? 'Compra concluída com divergências registradas' : 'Compra concluída sem divergências');
      router.dismissTo('/home');
    } catch (e) {
      showToast(toUserMessage(e), 'error');
    } finally {
      setFinishing(false);
    }
  };

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <Button title="Concluir" icon="checkmark-done" variant="dark" loading={finishing} onPress={finish} style={styles.flex} />
          <Button title="Cupom" icon="receipt-outline" variant="secondary" onPress={() => router.push(`/shopping/${id}/receipt`)} style={styles.flex} />
        </View>
      }
    >
      <Header title="Modo Caixa" subtitle={shopping.marketName} />

      <GradientCard colors={summary.wrongCount > 0 ? gradients.danger : gradients.hero}>
        <AppText variant="label" color="rgba(255,255,255,0.75)">Total que deve aparecer no caixa</AppText>
        <AppText style={styles.bigPrice} color={colors.white}>{formatBRL(summary.chargedTotal)}</AppText>
        {summary.difference !== 0 ? (
          <AppText variant="bodyStrong" color={colors.white}>
            Etiquetas: {formatBRL(summary.expectedTotal)} · Diferença {formatSignedBRL(summary.difference)}
          </AppText>
        ) : (
          <AppText variant="body" color="rgba(255,255,255,0.85)">Compare com a tela do caixa antes de pagar.</AppText>
        )}
        <View style={styles.progressRow}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress * 100}%` }]} />
          </View>
          <AppText variant="caption" color={colors.white}>{summary.passedCount}/{items.length}</AppText>
        </View>
      </GradientCard>

      <GlassView style={styles.tip}>
        <Ionicons name="hand-left-outline" size={18} color={colors.primaryDark} />
        <AppText variant="caption" style={styles.flex}>
          Toque no produto quando ele passar. Viu um valor diferente na tela? Toque em “Preço errado?” e mostre a etiqueta ao atendente.
        </AppText>
      </GlassView>

      <View style={styles.list}>
        {ordered.map((item) => (
          <CheckoutRow
            key={item.id}
            item={item}
            imageUrl={item.imagePath ? images[item.imagePath] : undefined}
            onToggle={() => toggle(item)}
            onWrong={() => setProofItemId(item.id)}
          />
        ))}
      </View>

      {proofItem ? (
        <ProofSheet
          item={proofItem}
          imageUrl={proofItem.imagePath ? images[proofItem.imagePath] : undefined}
          marketName={shopping.marketName}
          onClose={() => setProofItemId(null)}
          onSave={(charged) =>
            run(async () => {
              await setCheckout(proofItem.id, 'wrong', charged);
              setProofItemId(null);
              showToast('Divergência registrada');
            })
          }
          onClear={() =>
            run(async () => {
              await setCheckout(proofItem.id, 'passed');
              setProofItemId(null);
            })
          }
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { flexDirection: 'row', gap: spacing.md },
  bigPrice: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 46, lineHeight: 54, letterSpacing: -1.5 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  track: { flex: 1, height: 8, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.white },
  tip: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, alignItems: 'center', borderRadius: radius.md },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  rowWrong: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  pressed: { opacity: 0.85 },
  check: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkWrong: { backgroundColor: colors.danger, borderColor: colors.danger },
  thumb: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted },
  done: { color: colors.textMuted, textDecorationLine: 'line-through' },
  right: { alignItems: 'flex-end', gap: 4 },
  sheet: { flex: 1, backgroundColor: colors.background },
  sheetContent: { padding: spacing.xl, gap: spacing.lg },
  promoChip: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 4 },
  proofImage: { width: '100%', height: 260, borderRadius: radius.lg, backgroundColor: colors.ink },
  noImage: { flexDirection: 'row', gap: spacing.sm, padding: spacing.lg, alignItems: 'center' },
});
