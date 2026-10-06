import { PRICE_TOLERANCE } from '@/constants/config';
import { effectiveUnitPrice, expectedLineTotal } from '@/services/pricing/pricing';
import type { ItemMatch, ReceiptItem, ShoppingItem } from '@/types/domain';
import { roundMoney } from '@/utils/money';

export type ComparisonStatus =
  | 'ok'
  /** Caixa cobrou mais que a prateleira. */
  | 'overcharged'
  /** Caixa cobrou menos que a prateleira (favorável ao cliente). */
  | 'undercharged'
  /** Correspondência duvidosa aguardando confirmação do usuário. */
  | 'pending_match'
  /** Produto fotografado que não aparece no cupom. */
  | 'not_in_receipt'
  /** Produto do cupom que não foi fotografado. */
  | 'not_photographed';

export interface ComparisonLine {
  key: string;
  status: ComparisonStatus;
  name: string;
  receiptName: string | null;
  shoppingItem: ShoppingItem | null;
  receiptItem: ReceiptItem | null;
  match: ItemMatch | null;
  quantity: number;
  shelfUnitPrice: number | null;
  chargedUnitPrice: number | null;
  expectedTotal: number | null;
  chargedTotal: number | null;
  /** cobrado − esperado (positivo = pagou a mais). */
  difference: number;
}

export interface ComparisonSummary {
  lines: ComparisonLine[];
  /** Soma esperada dos itens conferidos (com correspondência). */
  expectedTotal: number;
  /** Soma cobrada dos mesmos itens. */
  chargedTotal: number;
  difference: number;
  divergenceCount: number;
  overchargedAmount: number;
  pendingCount: number;
  notInReceiptCount: number;
  notPhotographedCount: number;
  notPhotographedTotal: number;
}

const STATUS_ORDER: Record<ComparisonStatus, number> = {
  overcharged: 0,
  pending_match: 1,
  undercharged: 2,
  not_in_receipt: 3,
  not_photographed: 4,
  ok: 5,
};

function compareMatched(item: ShoppingItem, receiptItem: ReceiptItem, match: ItemMatch): ComparisonLine {
  const quantity = receiptItem.quantity > 0 ? receiptItem.quantity : item.quantity;
  const expectedTotal = expectedLineTotal(item, quantity);
  const chargedTotal = roundMoney(receiptItem.totalPrice);
  const difference = roundMoney(chargedTotal - expectedTotal);
  let status: ComparisonStatus = 'ok';
  if (match.status === 'pending') status = 'pending_match';
  else if (difference > PRICE_TOLERANCE) status = 'overcharged';
  else if (difference < -PRICE_TOLERANCE) status = 'undercharged';

  return {
    key: `m-${match.id}`,
    status,
    name: item.name,
    receiptName: receiptItem.productName,
    shoppingItem: item,
    receiptItem,
    match,
    quantity,
    shelfUnitPrice: effectiveUnitPrice(item),
    chargedUnitPrice: roundMoney(chargedTotal / quantity),
    expectedTotal,
    chargedTotal,
    difference,
  };
}

/** Compara o que foi visto na prateleira com o que foi cobrado no caixa. */
export function compareShopping(
  items: ShoppingItem[],
  receiptItems: ReceiptItem[],
  matches: ItemMatch[],
): ComparisonSummary {
  const activeMatches = matches.filter((m) => m.status !== 'rejected');
  const itemsById = new Map(items.map((i) => [i.id, i]));
  const receiptById = new Map(receiptItems.map((r) => [r.id, r]));
  const lines: ComparisonLine[] = [];
  const matchedItems = new Set<string>();
  const matchedReceipt = new Set<string>();

  for (const match of activeMatches) {
    const item = itemsById.get(match.shoppingItemId);
    const receiptItem = receiptById.get(match.receiptItemId);
    if (!item || !receiptItem) continue;
    matchedItems.add(item.id);
    matchedReceipt.add(receiptItem.id);
    lines.push(compareMatched(item, receiptItem, match));
  }

  for (const item of items) {
    if (matchedItems.has(item.id)) continue;
    lines.push({
      key: `s-${item.id}`,
      status: 'not_in_receipt',
      name: item.name,
      receiptName: null,
      shoppingItem: item,
      receiptItem: null,
      match: null,
      quantity: item.quantity,
      shelfUnitPrice: effectiveUnitPrice(item),
      chargedUnitPrice: null,
      expectedTotal: expectedLineTotal(item, item.quantity),
      chargedTotal: null,
      difference: 0,
    });
  }

  for (const receiptItem of receiptItems) {
    if (matchedReceipt.has(receiptItem.id)) continue;
    lines.push({
      key: `r-${receiptItem.id}`,
      status: 'not_photographed',
      name: receiptItem.productName,
      receiptName: receiptItem.productName,
      shoppingItem: null,
      receiptItem,
      match: null,
      quantity: receiptItem.quantity,
      shelfUnitPrice: null,
      chargedUnitPrice: receiptItem.unitPrice,
      expectedTotal: null,
      chargedTotal: receiptItem.totalPrice,
      difference: 0,
    });
  }

  lines.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  const settled = lines.filter((l) => l.status === 'ok' || l.status === 'overcharged' || l.status === 'undercharged');
  const expectedTotal = roundMoney(settled.reduce((s, l) => s + (l.expectedTotal ?? 0), 0));
  const chargedTotal = roundMoney(settled.reduce((s, l) => s + (l.chargedTotal ?? 0), 0));
  const overcharged = lines.filter((l) => l.status === 'overcharged');
  const notPhotographed = lines.filter((l) => l.status === 'not_photographed');

  return {
    lines,
    expectedTotal,
    chargedTotal,
    difference: roundMoney(chargedTotal - expectedTotal),
    divergenceCount: overcharged.length,
    overchargedAmount: roundMoney(overcharged.reduce((s, l) => s + l.difference, 0)),
    pendingCount: lines.filter((l) => l.status === 'pending_match').length,
    notInReceiptCount: lines.filter((l) => l.status === 'not_in_receipt').length,
    notPhotographedCount: notPhotographed.length,
    notPhotographedTotal: roundMoney(notPhotographed.reduce((s, l) => s + (l.chargedTotal ?? 0), 0)),
  };
}
