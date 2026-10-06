import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorBanner } from '@/components/ErrorBanner';
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

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      <AppText variant="bodyStrong">{value}</AppText>
    </View>
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
          {!editing ? <Button title="Editar" variant="secondary" icon="create-outline" onPress={() => setEditing(true)} style={styles.flex} /> : null}
          <Button title="Confirmar" icon="checkmark" size="lg" loading={saving || !shopping} onPress={confirm} style={styles.grow} />
        </View>
      }
    >
      <Header title={scan ? 'Produto identificado' : 'Adicionar produto'} />

      {scan && lowConfidence ? (
        <ErrorBanner tone="warning" message="⚠️ Não conseguimos identificar alguns dados com segurança. Confira antes de confirmar." />
      ) : null}

      {!editing ? (
        <Card style={styles.card}>
          <View style={styles.topRow}>
            {scan ? <Image source={{ uri: scan.image.uri }} style={styles.thumb} /> : null}
            <View style={styles.flex}>
              <AppText variant="label">Produto</AppText>
              <AppText variant="title">{draft.name}</AppText>
              {promoLabel ? <StatusPill label={promoLabel} tone="success" /> : null}
            </View>
          </View>
          <View style={styles.grid}>
            <Field label="Marca" value={draft.brand} />
            <Field label={draft.sizeUnit === 'l' || draft.sizeUnit === 'ml' ? 'Volume' : 'Peso'} value={displaySize(draft.sizeValue, draft.sizeUnit)} />
            <Field label="Descrição" value={draft.description} />
          </View>
          {hasSale ? (
            <View style={styles.priceRow}>
              <View>
                <AppText variant="label">Preço normal</AppText>
                <AppText variant="price" color={colors.textMuted} style={styles.strike}>{formatBRL(draft.shelfPrice)}</AppText>
              </View>
              <View style={styles.right}>
                <AppText variant="label">Preço promocional</AppText>
                <AppText variant="priceLarge" color={colors.primaryDark}>{formatBRL(draft.promoPrice)}</AppText>
              </View>
            </View>
          ) : (
            <View>
              <AppText variant="label">Preço{draft.priceUnit !== 'un' ? ` por ${draft.priceUnit}` : ''}</AppText>
              <AppText variant="priceLarge">{formatBRL(draft.shelfPrice)}</AppText>
            </View>
          )}
          {scan ? <AppText variant="caption">Confiança da leitura: {Math.round(scan.reading.confidence * 100)}%</AppText> : null}
        </Card>
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
  topRow: { flexDirection: 'row', gap: spacing.lg },
  thumb: { width: 84, height: 84, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  thumbSmall: { width: 56, height: 56, borderRadius: radius.sm },
  editThumbRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  field: { gap: 2, minWidth: '40%' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  right: { alignItems: 'flex-end' },
  strike: { textDecorationLine: 'line-through' },
});
