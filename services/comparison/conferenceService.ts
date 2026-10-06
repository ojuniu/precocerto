import { getAIProvider } from '@/services/ai';
import { listItems } from '@/services/data/itemRepository';
import { addMatch, deleteMatch, listMatches, replaceMatches, saveMatchFigures, setMatchStatus } from '@/services/data/matchRepository';
import { getReceipt, saveReceipt } from '@/services/data/receiptRepository';
import { getShopping, updateShopping } from '@/services/data/shoppingRepository';
import { uploadScan } from '@/services/data/storageRepository';
import { effectiveUnitPrice } from '@/services/pricing/pricing';
import { matchProducts, type SemanticMatcher } from '@/services/productMatching';
import { scanReceipt } from '@/services/receipt/receiptService';
import type { ItemMatch, Receipt, Shopping, ShoppingItem } from '@/types/domain';
import { compareShopping, type ComparisonSummary } from './compare';

export interface Conference {
  shopping: Shopping;
  items: ShoppingItem[];
  receipt: Receipt | null;
  matches: ItemMatch[];
  summary: ComparisonSummary | null;
  warnings: string[];
}

const semanticMatcher: SemanticMatcher = (pairs) => getAIProvider().compareProductNames(pairs);

/** Calcula o resumo e grava os números na compra e em cada correspondência (para o histórico). */
async function persistSummary(shoppingId: string, receipt: Receipt, items: ShoppingItem[], matches: ItemMatch[]) {
  const summary = compareShopping(items, receipt.items, matches);
  const figures = summary.lines
    .filter((line) => line.match)
    .map((line) => ({
      matchId: line.match!.id,
      expectedTotal: line.expectedTotal,
      chargedTotal: line.chargedTotal,
      difference: line.difference,
    }));
  await saveMatchFigures(figures);
  const shopping = await updateShopping(shoppingId, {
    status: 'checked',
    paidTotal: receipt.total ?? summary.chargedTotal + summary.notPhotographedTotal,
    difference: summary.difference,
    divergenceCount: summary.divergenceCount,
  });
  return { summary, shopping };
}

export async function loadConference(shoppingId: string): Promise<Conference> {
  const [shopping, items, receipt, matches] = await Promise.all([
    getShopping(shoppingId),
    listItems(shoppingId),
    getReceipt(shoppingId),
    listMatches(shoppingId),
  ]);
  const summary = receipt ? compareShopping(items, receipt.items, matches) : null;
  return { shopping, items, receipt, matches, summary, warnings: [] };
}

/**
 * Fluxo completo do cupom: foto → IA → cupom normalizado → salvar → matching → comparação → salvar resumo.
 * `onStage` permite à tela mostrar em que etapa o processamento está.
 */
export async function checkReceipt(
  shoppingId: string,
  photo: { uri: string; width?: number },
  onStage: (stage: 'reading' | 'matching' | 'saving') => void = () => undefined,
): Promise<Conference> {
  onStage('reading');
  const { image, receipt: normalized } = await scanReceipt(photo.uri, photo.width);

  onStage('saving');
  const imagePath = await uploadScan(image.payload, 'receipts').catch(() => null);
  const receipt = await saveReceipt(shoppingId, normalized, imagePath);
  const items = await listItems(shoppingId);

  onStage('matching');
  const result = await matchProducts(
    items.map((item) => ({
      id: item.id,
      name: [item.name, item.description].filter(Boolean).join(' '),
      brand: item.brand,
      sizeValue: item.sizeValue,
      sizeUnit: item.sizeUnit,
      unitPrice: effectiveUnitPrice(item),
      item,
    })),
    receipt.items.map((r) => ({ id: r.id, name: r.productName, unitPrice: r.unitPrice })),
    { semanticMatcher },
  );

  onStage('saving');
  const matches = await replaceMatches(
    shoppingId,
    result.matches.map((m) => ({
      shoppingItemId: m.shelfProduct.id,
      receiptItemId: m.receiptProduct.id,
      confidence: m.confidence,
      status: m.needsConfirmation ? 'pending' : 'auto',
      method: m.method,
    })),
  );
  const { summary, shopping } = await persistSummary(shoppingId, receipt, items, matches);
  return { shopping, items, receipt, matches, summary, warnings: normalized.warnings };
}

async function refresh(shoppingId: string): Promise<Conference> {
  const conference = await loadConference(shoppingId);
  if (!conference.receipt) return conference;
  const { summary, shopping } = await persistSummary(shoppingId, conference.receipt, conference.items, conference.matches);
  return { ...conference, shopping, summary };
}

export async function confirmMatch(shoppingId: string, matchId: string): Promise<Conference> {
  await setMatchStatus(matchId, 'confirmed');
  return refresh(shoppingId);
}

export async function rejectMatch(shoppingId: string, matchId: string): Promise<Conference> {
  await deleteMatch(matchId);
  return refresh(shoppingId);
}

/** Vínculo manual feito pelo usuário entre um produto fotografado e uma linha do cupom. */
export async function linkManually(shoppingId: string, shoppingItemId: string, receiptItemId: string): Promise<Conference> {
  await addMatch(shoppingId, { shoppingItemId, receiptItemId, confidence: 1, status: 'manual', method: 'manual' });
  return refresh(shoppingId);
}
