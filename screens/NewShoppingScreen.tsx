import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { colors, radius, spacing } from '@/constants/theme';
import { findOrCreateMarket, listRecentMarkets, searchMarkets } from '@/services/data/marketRepository';
import { createShopping } from '@/services/data/shoppingRepository';
import { useShoppingStore } from '@/store/shoppingStore';
import type { Market } from '@/types/domain';
import { formatDate } from '@/utils/date';
import { toUserMessage } from '@/utils/errors';

function MarketOption({ market, selected, onPress }: { market: Market; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.option, selected && styles.optionSelected]}>
      <Ionicons name="storefront-outline" size={18} color={selected ? colors.white : colors.textSecondary} />
      <AppText variant="bodyStrong" color={selected ? colors.white : colors.text} style={styles.flex} numberOfLines={1}>
        {market.name}
      </AppText>
      {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.white} /> : null}
    </Pressable>
  );
}

export default function NewShoppingScreen() {
  const setShopping = useShoppingStore((s) => s.setShopping);
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<Market[]>([]);
  const [results, setResults] = useState<Market[]>([]);
  const [selected, setSelected] = useState<Market | null>(null);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listRecentMarkets()
      .then((markets) => {
        setRecent(markets);
        if (markets[0]) setSelected(markets[0]);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const timer = setTimeout(() => {
      searchMarkets(query)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const typedName = query.trim();
  const exactMatch = results.some((m) => m.name.toLowerCase() === typedName.toLowerCase());
  const options = typedName.length >= 2 ? results : recent;

  const start = async () => {
    setCreating(true);
    setError(null);
    try {
      const market = selected ?? (typedName.length >= 2 ? await findOrCreateMarket(typedName) : null);
      if (!market) {
        setError('Escolha ou digite o nome do supermercado.');
        return;
      }
      const shopping = await createShopping({ id: market.id, name: market.name });
      setShopping(shopping);
      router.dismissAll();
      router.push(`/shopping/${shopping.id}`);
      router.push(`/shopping/${shopping.id}/camera`);
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const useTyped = async () => {
    setCreating(true);
    setError(null);
    try {
      setSelected(await findOrCreateMarket(typedName));
      setQuery('');
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Screen
      edges={['top']}
      footer={<Button title="Começar compra" size="lg" icon="camera" loading={creating} onPress={start} disabled={!selected && typedName.length < 2} />}
    >
      <Header title="Nova compra" />

      <View style={styles.group}>
        <AppText variant="label">Supermercado</AppText>
        {selected ? (
          <MarketOption market={selected} selected onPress={() => setSelected(null)} />
        ) : null}
        <TextField
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setSelected(null);
            setSearching(text.trim().length >= 2);
          }}
          placeholder="Buscar ou digitar o nome"
          autoCapitalize="words"
          returnKeyType="done"
        />
        {searching ? <ActivityIndicator color={colors.primary} /> : null}
        {typedName.length >= 2 && !exactMatch && !searching ? (
          <Pressable onPress={useTyped} style={styles.option}>
            <Ionicons name="add-circle-outline" size={18} color={colors.primaryDark} />
            <AppText variant="bodyStrong" color={colors.primaryDark}>Usar “{typedName}”</AppText>
          </Pressable>
        ) : null}
        {typedName.length < 2 && recent.length > 0 ? <AppText variant="caption">Recentes</AppText> : null}
        {options
          .filter((m) => m.id !== selected?.id)
          .map((market) => (
            <MarketOption key={market.id} market={market} selected={false} onPress={() => setSelected(market)} />
          ))}
      </View>

      <View style={styles.group}>
        <AppText variant="label">Data</AppText>
        <View style={styles.dateBox}>
          <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
          <AppText variant="bodyStrong">{formatDate(new Date().toISOString())}</AppText>
          <AppText variant="caption">automática</AppText>
        </View>
      </View>

      {error ? <ErrorBanner message={error} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  flex: { flex: 1 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  optionSelected: { backgroundColor: colors.ink },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
});
