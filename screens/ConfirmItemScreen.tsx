import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { GlassView } from '@/components/GlassView';
import { GradientCard } from '@/components/GradientCard';
import { Header } from '@/components/Header';
import { ItemForm } from '@/components/ItemForm';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { useToast } from '@/components/Toast';
import { colors, radius, spacing } from '@/constants/theme';
import { describePromo } from '@/services/pricing/pricing';
import { displaySize, draftFromReading, emptyDraft, itemTitle, validateDraft, type DraftError, type ItemDraft } from '@/services/shopping/itemDraft';
import { useEnsureShopping } from '@/hooks/useEnsureShopping';
import { useScanStore } from '@/store/scanStore';
import { useShoppingStore } from '@/store/shoppingStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { AppError, toUserMessage } from '@/utils/errors';
import { formatBRL } from '@/utils/money';

function StatTile({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <GlassView style={styles.tile}>
      <View style={styles.tileIcon}>
        <Ionicons name={icon} size={16} color={colors.primaryDark} />
      </View>
      <AppText variant="bodyStrong" numberOfLines={1}>{value}</AppText>
      <AppText variant="caption" numberOfLines={1}>{label}</AppText>
    </GlassView>
  );
}

export default function ConfirmItemScreen() {
  const { id, manual } = useLocalSearchParams<{ id: string; manual?: string }>();
  const shopping = useEnsureShopping(id);
  const scan = useScanStore((s) => (manual ? null : s.priceTag));
  const addFromDraft = useShoppingStore((s) => s.addFromDraft);
  const refreshPlan = useSubscriptionStore((s) => s.refresh);
  const showToast = useToast((s) => s.show);

  const initialDraft = useMemo(() => (scan ? draftFromReading(scan.reading) : emptyDraft()), [scan]);
  const lowConfidence = !scan || scan.quality.lowConfidence;
  const [draft, setDraft] = useState<ItemDraft>(initialDraft);
  const [editing, setEditing] = useState(lowConfidence);
  const [errors, setErrors] = useState<DraftError[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    const problems = validateDraft(draft);
    if (problems.length > 0) {
      setErrors(problems);
      setEditing(true);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await addFromDraft(draft, scan?.image.payload, scan?.reading);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      showToast(result.merged ? `Quantidade atualizada: ${itemTitle(draft)}` : `Adicionado: ${itemTitle(draft)}`);
      refreshPlan();
      router.back();
    } catch (e) {
      if (e instanceof AppError && e.code === 'quota_exceeded') {
        router.push('/premium');
      }
      setError(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const promoLabel = describePromo(draft.promo, draft.promoPrice);
  const hasSale = draft.promoPrice !== null && draft.shelfPrice !== null;
  const uncertain = scan?.quality.uncertainFields ?? [];

  return (
    <Screen
      footer={
        <View style={styles.actions}>
          {!editing ? <Button title="Editar" variant="secondary" icon="create-outline" size="lg" onPress={() => setEditing(true)} style={styles.flex} /> : null}
          <Button title="Confirmar" variant="dark" icon="checkmark" size="lg" loading={saving || !shopping} onPress={confirm} style={styles.grow} />
        </View>
      }
    >
      <Header title={scan ? 'Produto identificado' : 'Adicionar produto'} />

      {scan && lowConfidence ? (
        <ErrorBanner tone="warning" message="⚠️ Não conseguimos identificar alguns dados com segurança. Confira antes de confirmar." />
      ) : null}

      {!editing ? (
        <View style={styles.card}>
          {scan ? (
            <View style={styles.photoWrap}>
              <Image source={{ uri: scan.image.uri }} style={styles.photo} resizeMode="cover" />
              <GlassView tone="dark" style={styles.confidence}>
                <Ionicons name="sparkles" size={14} color={colors.lime} />
                <AppText variant="caption" color={colors.white}>Leitura {Math.round(scan.reading.confidence * 100)}%</AppText>
              </GlassView>
            </View>
          ) : null}
          <View style={styles.titleBlock}>
            <AppText variant="title">{draft.name}</AppText>
            {promoLabel ? <StatusPill label={promoLabel} tone="success" /> : null}
          </View>
          <View style={styles.tiles}>
            <StatTile icon="ribbon-outline" label="Marca" value={draft.brand} />
            <StatTile
              icon="cube-outline"
              label={draft.sizeUnit === 'l' || draft.sizeUnit === 'ml' ? 'Volume' : 'Peso'}
              value={displaySize(draft.sizeValue, draft.sizeUnit)}
            />
            <StatTile icon="scale-outline" label="Vendido por" value={draft.priceUnit === 'un' ? 'unidade' : draft.priceUnit} />
          </View>
          {draft.description ? <AppText variant="caption">{draft.description}</AppText> : null}
          <GradientCard>
            {hasSale ? (
              <View style={styles.priceRow}>
                <View>
                  <AppText variant="label" color="rgba(255,255,255,0.8)">De</AppText>
                  <AppText variant="price" color="rgba(255,255,255,0.75)" style={styles.strike}>{formatBRL(draft.shelfPrice)}</AppText>
                </View>
                <View style={styles.right}>
                  <AppText variant="label" color="rgba(255,255,255,0.8)">Por</AppText>
                  <AppText variant="priceLarge" color={colors.white}>{formatBRL(draft.promoPrice)}</AppText>
                </View>
              </View>
            ) : (
              <View>
                <AppText variant="label" color="rgba(255,255,255,0.8)">Preço na etiqueta{draft.priceUnit !== 'un' ? ` (por ${draft.priceUnit})` : ''}</AppText>
                <AppText variant="priceLarge" color={colors.white}>{formatBRL(draft.shelfPrice)}</AppText>
              </View>
            )}
          </GradientCard>
        </View>
      ) : (
        <>
          {scan ? (
            <View style={styles.editThumbRow}>
              <Image source={{ uri: scan.image.uri }} style={styles.thumbSmall} />
              <AppText variant="caption" style={styles.flex}>Campos em amarelo foram lidos com pouca confiança.</AppText>
            </View>
          ) : null}
          <ItemForm draft={draft} onChange={setDraft} errors={errors} uncertain={uncertain} />
        </>
      )}

      {error ? <ErrorBanner message={error} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flex: 2 },
  actions: { flexDirection: 'row', gap: spacing.md },
  card: { gap: spacing.lg },
  photoWrap: { borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  photo: { width: '100%', aspectRatio: 1.35 },
  confidence: { position: 'absolute', left: spacing.md, bottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  titleBlock: { gap: spacing.sm, alignItems: 'flex-start' },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1, padding: spacing.md, gap: 2, borderRadius: radius.md },
  tileIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  thumbSmall: { width: 56, height: 56, borderRadius: radius.sm },
  editThumbRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  right: { alignItems: 'flex-end' },
  strike: { textDecorationLine: 'line-through' },
});
