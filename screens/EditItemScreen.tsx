import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Header } from '@/components/Header';
import { ItemForm } from '@/components/ItemForm';
import { Screen } from '@/components/Screen';
import { colors, radius, spacing } from '@/constants/theme';
import { getSignedImageUrl } from '@/services/data/storageRepository';
import { draftFromItem, validateDraft, type DraftError, type ItemDraft } from '@/services/shopping/itemDraft';
import { useEnsureShopping } from '@/hooks/useEnsureShopping';
import { useShoppingStore } from '@/store/shoppingStore';
import { toUserMessage } from '@/utils/errors';

export default function EditItemScreen() {
  const { id, itemId } = useLocalSearchParams<{ id: string; itemId: string }>();
  useEnsureShopping(id);
  const item = useShoppingStore((s) => s.items.find((i) => i.id === itemId));
  const { update, remove } = useShoppingStore();
  const [draft, setDraft] = useState<ItemDraft | null>(item ? draftFromItem(item) : null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<DraftError[]>([]);
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item?.imagePath) getSignedImageUrl(item.imagePath).then(setImageUrl);
  }, [item?.imagePath]);

  if (!item || !draft) {
    return (
      <Screen>
        <Header title="Produto" />
        <EmptyState icon="alert-circle-outline" title="Produto não encontrado" />
      </Screen>
    );
  }

  const save = async () => {
    const problems = validateDraft(draft);
    setErrors(problems);
    if (problems.length > 0) return;
    setBusy('save');
    setError(null);
    try {
      await update(item.id, draft);
      router.back();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = () => {
    Alert.alert('Remover produto?', `${item.name} sairá da lista desta compra.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          setBusy('delete');
          try {
            await remove(item.id);
            router.back();
          } catch (e) {
            setError(toUserMessage(e));
            setBusy(null);
          }
        },
      },
    ]);
  };

  return (
    <Screen
      footer={
        <View style={styles.actions}>
          <Button title="Remover" variant="danger" icon="trash-outline" loading={busy === 'delete'} onPress={confirmDelete} style={styles.flex} />
          <Button title="Salvar" icon="checkmark" loading={busy === 'save'} onPress={save} style={styles.grow} />
        </View>
      }
    >
      <Header title="Editar produto" />
      {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" /> : null}
      <ItemForm draft={draft} onChange={setDraft} errors={errors} />
      {error ? <ErrorBanner message={error} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  grow: { flex: 2 },
  image: { width: '100%', height: 160, borderRadius: radius.lg, backgroundColor: colors.surfaceMuted },
});
