import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ComparisonLineCard } from '@/components/ComparisonLineCard';
import { ConferenceSummary } from '@/components/ConferenceSummary';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Header } from '@/components/Header';
import { PendingMatchCard } from '@/components/PendingMatchCard';
import { Screen } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import { colors, radius, spacing } from '@/constants/theme';
import { summarizeCheckout } from '@/services/comparison/checkout';
import type { ComparisonLine } from '@/services/comparison/compare';
import { itemTitle } from '@/services/shopping/itemDraft';
import { useConferenceStore } from '@/store/conferenceStore';
import { formatDate } from '@/utils/date';
import { toUserMessage } from '@/utils/errors';
import { formatBRL, formatSignedBRL } from '@/utils/money';

function Section({ title, lines, render }: { title: string; lines: ComparisonLine[]; render: (line: ComparisonLine) => ReactNode }) {
  if (lines.length === 0) return null;
  return (
    <View style={styles.section}>
      <AppText variant="heading">{title}</AppText>
      {lines.map(render)}
    </View>
  );
}

export default function ConferenceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { conference, loading, error, load, confirm, reject, link, toggleDivergence } = useConferenceStore();
  const showToast = useToast((s) => s.show);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [linking, setLinking] = useState<ComparisonLine | null>(null);

  useEffect(() => {
    if (id) load(id);
  }, [id, load]);

  const act = async (key: string, action: () => Promise<void>, success?: string) => {
    setBusyKey(key);
    try {
      await action();
      if (success) showToast(success);
    } catch (e) {
      showToast(toUserMessage(e), 'error');
    } finally {
      setBusyKey(null);
    }
  };

  if (!conference || conference.shopping.id !== id) {
    return (
      <SafeAreaView style={styles.center}>
        {error ? <ErrorBanner message={error} onRetry={() => load(id)} /> : <ActivityIndicator color={colors.primary} />}
      </SafeAreaView>
    );
  }

  const { shopping, receipt, summary, warnings } = conference;
  const by = (status: ComparisonLine['status']) => summary?.lines.filter((l) => l.status === status) ?? [];
  const unmatchedReceipt = by('not_photographed');
  const checkout = summarizeCheckout(conference.items);
  const checkoutCard = checkout.passedCount > 0 ? (
    <Card tone={checkout.wrongCount > 0 ? 'danger' : 'success'} style={styles.checkoutCard}>
      <View style={styles.infoRow}>
        <AppText variant="heading">Conferido no caixa</AppText>
        <AppText variant="caption">{checkout.passedCount} de {conference.items.length}</AppText>
      </View>
      {checkout.wrongLines.length === 0 ? (
        <AppText variant="body" color={colors.textSecondary}>Nenhum preço errado foi registrado no caixa.</AppText>
      ) : (
        checkout.wrongLines.map((line) => (
          <View key={line.item.id} style={styles.infoRow}>
            <AppText variant="bodyStrong" style={styles.flex} numberOfLines={1}>{itemTitle(line.item)}</AppText>
            <AppText variant="bodyStrong" color={colors.danger}>
              {line.chargedTotal === null ? 'preço errado' : formatSignedBRL(line.difference)}
            </AppText>
          </View>
        ))
      )}
    </Card>
  ) : null;

  return (
    <Screen
      refreshing={loading}
      onRefresh={() => load(id)}
      footer={
        <Button
          title={receipt ? 'Fotografar cupom novamente' : 'Fotografar cupom'}
          variant={receipt ? 'secondary' : 'primary'}
          icon="camera-outline"
          onPress={() => router.push(`/shopping/${id}/camera?mode=receipt`)}
        />
      }
    >
      <Header
        title="Conferência"
        subtitle={`${shopping.marketName} · ${formatDate(shopping.createdAt)}`}
        right={
          <Pressable onPress={() => router.push(`/shopping/${id}`)} hitSlop={8}>
            <AppText variant="caption" color={colors.primaryDark}>Ver lista</AppText>
          </Pressable>
        }
      />

      {!receipt || !summary ? (
        <>
          {checkoutCard}
          <EmptyState
            icon="receipt-outline"
            title="Cupom ainda não conferido"
            message="Fotografe o cupom fiscal para comparar cada linha com o preço da etiqueta."
          />
        </>
      ) : (
        <>
          <ConferenceSummary summary={summary} />
          {checkoutCard}
          {warnings.map((w) => (
            <ErrorBanner key={w} tone="warning" message={w} />
          ))}
          {error ? <ErrorBanner message={error} /> : null}

          <Section
            title="Confirme estas correspondências"
            lines={by('pending_match')}
            render={(line) => (
              <PendingMatchCard
                key={line.key}
                line={line}
                busy={busyKey === line.key}
                onConfirm={() => line.match && act(line.key, () => confirm(line.match!.id))}
                onReject={() => line.match && act(line.key, () => reject(line.match!.id))}
              />
            )}
          />

          <Section
            title="Divergências"
            lines={by('overcharged')}
            render={(line) => (
              <ComparisonLineCard
                key={line.key}
                line={line}
                busy={busyKey === line.key}
                onToggleDivergence={(confirmed) =>
                  line.match &&
                  act(line.key, () => toggleDivergence(line.match!.id, confirmed), confirmed ? 'Divergência registrada' : undefined)
                }
              />
            )}
          />

          <Section
            title="Conferidos"
            lines={[...by('undercharged'), ...by('ok')]}
            render={(line) => <ComparisonLineCard key={line.key} line={line} />}
          />

          <Section
            title="Fotografados, mas não encontrados no cupom"
            lines={by('not_in_receipt')}
            render={(line) => (
              <ComparisonLineCard key={line.key} line={line} onLink={unmatchedReceipt.length > 0 ? () => setLinking(line) : undefined} />
            )}
          />

          <Section
            title="No cupom, mas não fotografados"
            lines={unmatchedReceipt}
            render={(line) => <ComparisonLineCard key={line.key} line={line} />}
          />

          <Card tone="glass" style={styles.receiptInfo}>
            <View style={styles.infoRow}>
              <AppText variant="caption">Total do cupom</AppText>
              <AppText variant="bodyStrong">{formatBRL(receipt.total)}</AppText>
            </View>
            {receipt.discountTotal ? (
              <View style={styles.infoRow}>
                <AppText variant="caption">Descontos no cupom</AppText>
                <AppText variant="bodyStrong" color={colors.primaryDark}>- {formatBRL(receipt.discountTotal)}</AppText>
              </View>
            ) : null}
            <View style={styles.infoRow}>
              <AppText variant="caption">Itens no cupom</AppText>
              <AppText variant="bodyStrong">{receipt.items.length}</AppText>
            </View>
          </Card>
        </>
      )}

      <Modal visible={linking !== null} animationType="slide" transparent onRequestClose={() => setLinking(null)}>
        <View style={styles.modalBackdrop}>
          <SafeAreaView edges={['bottom']} style={styles.sheet}>
            <AppText variant="heading">Qual item do cupom é “{linking?.name}”?</AppText>
            <ScrollView style={styles.sheetList} contentContainerStyle={styles.sheetContent}>
              {unmatchedReceipt.map((line) => (
                <Pressable
                  key={line.key}
                  style={styles.sheetOption}
                  onPress={() => {
                    const target = linking;
                    setLinking(null);
                    if (target?.shoppingItem && line.receiptItem) {
                      act(target.key, () => link(target.shoppingItem!.id, line.receiptItem!.id), 'Produtos vinculados');
                    }
                  }}
                >
                  <AppText variant="bodyStrong" style={styles.flex}>{line.name}</AppText>
                  <AppText variant="price">{formatBRL(line.chargedTotal)}</AppText>
                </Pressable>
              ))}
            </ScrollView>
            <Button title="Cancelar" variant="ghost" onPress={() => setLinking(null)} />
          </SafeAreaView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background },
  flex: { flex: 1 },
  section: { gap: spacing.md },
  receiptInfo: { gap: spacing.sm },
  checkoutCard: { gap: spacing.sm },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    maxHeight: '75%',
  },
  sheetList: { flexGrow: 0 },
  sheetContent: { gap: spacing.sm },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
});
