import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import { colors, radius, spacing } from '@/constants/theme';
import { assessPriceTag } from '@/services/ocr/readingQuality';
import { draftFromReading, itemTitle, validateDraft } from '@/services/shopping/itemDraft';
import { useEnsureShopping } from '@/hooks/useEnsureShopping';
import { useScanStore } from '@/store/scanStore';
import { useShoppingStore } from '@/store/shoppingStore';
import { toUserMessage } from '@/utils/errors';
import { formatBRL } from '@/utils/money';

/** Leitura em lote: várias etiquetas em uma foto; o usuário escolhe quais adicionar. */
export default function ShelfResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const shopping = useEnsureShopping(id);
  const scan = useScanStore((s) => s.shelf);
  const addBatch = useShoppingStore((s) => s.addBatch);
  const showToast = useToast((s) => s.show);
  const candidates = useMemo(
    () =>
      (scan?.reading.tags ?? []).map((tag, index) => {
        const draft = draftFromReading(tag);
        const valid = validateDraft(draft).length === 0;
        return { key: String(index), tag, draft, valid, lowConfidence: assessPriceTag(tag).lowConfidence };
      }),
    [scan],
  );
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(candidates.filter((c) => c.valid && !c.lowConfidence).map((c) => c.key)),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  if (!scan) {
    return (
      <Screen>
        <Header title="Etiquetas encontradas" />
        <EmptyState icon="images-outline" title="Nenhuma leitura disponível" />
      </Screen>
    );
  }

  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  const add = async () => {
    setSaving(true);
    setError(null);
    try {
      const drafts = candidates.filter((c) => selected.has(c.key)).map((c) => c.draft);
      const count = await addBatch(drafts, scan.image.payload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      showToast(`${count} produtos adicionados`);
      router.back();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      footer={
        <Button
          title={selected.size === 0 ? 'Selecione os produtos' : `Adicionar ${selected.size} ${selected.size === 1 ? 'produto' : 'produtos'}`}
          icon="add"
          size="lg"
          loading={saving || !shopping}
          disabled={selected.size === 0}
          onPress={add}
        />
      }
    >
      <Header title="Etiquetas encontradas" subtitle={`${candidates.length} na foto`} />
      <View
        style={[styles.imageBox, { aspectRatio: scan.image.width / Math.max(1, scan.image.height) }]}
        onLayout={(e) => setImageSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      >
        <Image source={{ uri: scan.image.uri }} style={StyleSheet.absoluteFill} resizeMode="stretch" />
        {candidates.map((c, i) =>
          c.tag.bbox && imageSize.width > 0 ? (
            <View
              key={c.key}
              style={[
                styles.bbox,
                {
                  left: c.tag.bbox[0] * imageSize.width,
                  top: c.tag.bbox[1] * imageSize.height,
                  width: c.tag.bbox[2] * imageSize.width,
                  height: c.tag.bbox[3] * imageSize.height,
                  borderColor: selected.has(c.key) ? colors.primary : colors.white,
                },
              ]}
            >
              <AppText variant="caption" color={colors.white} style={styles.bboxLabel}>{i + 1}</AppText>
            </View>
          ) : null,
        )}
      </View>
      {candidates.map((c, i) => {
        const isSelected = selected.has(c.key);
        return (
          <Pressable key={c.key} onPress={() => c.valid && toggle(c.key)}>
            <Card style={[styles.row, !c.valid && styles.disabled]} tone={c.lowConfidence && c.valid ? 'warning' : 'default'}>
              <Ionicons
                name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                size={26}
                color={isSelected ? colors.primary : colors.textMuted}
              />
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{i + 1}. {c.draft.name ? itemTitle(c.draft) : 'Produto não identificado'}</AppText>
                <AppText variant="caption">
                  {c.valid ? (c.lowConfidence ? 'Leitura incerta: confira depois na lista' : c.draft.brand ?? 'Leitura confiável') : 'Preço ilegível: fotografe esta etiqueta sozinha'}
                </AppText>
              </View>
              <AppText variant="price">{formatBRL(c.draft.promoPrice ?? c.draft.shelfPrice)}</AppText>
            </Card>
          </Pressable>
        );
      })}
      {error ? <ErrorBanner message={error} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  imageBox: { width: '100%', borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  bbox: { position: 'absolute', borderWidth: 2, borderRadius: 6 },
  bboxLabel: { backgroundColor: colors.ink, paddingHorizontal: 4, alignSelf: 'flex-start', fontSize: 11 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  disabled: { opacity: 0.55 },
});
