import { expectedLineTotal } from '@/services/pricing/pricing';
import type { ShoppingItem } from '@/types/domain';
import { roundMoney } from '@/utils/money';

export interface CheckoutLine {
  item: ShoppingItem;
  expectedTotal: number;
  /** Total que apareceu no caixa (só quando o cliente informou o preço errado). */
  chargedTotal: number | null;
  difference: number;
}

export interface CheckoutSummary {
  expectedTotal: number;
  /** Total esperado + diferenças vistas no caixa. */
  chargedTotal: number;
  difference: number;
  passedCount: number;
  wrongCount: number;
  pendingCount: number;
  wrongLines: CheckoutLine[];
}

/** Resumo do Modo Caixa: o que já passou, o que veio com preço errado e o impacto no total. */
export function summarizeCheckout(items: ShoppingItem[]): CheckoutSummary {
  const lines = items.map((item): CheckoutLine => {
    const expectedTotal = expectedLineTotal(item, item.quantity);
    const charged = item.checkoutStatus === 'wrong' && item.checkoutChargedPrice !== null
      ? roundMoney(item.checkoutChargedPrice * item.quantity)
      : null;
    return { item, expectedTotal, chargedTotal: charged, difference: charged === null ? 0 : roundMoney(charged - expectedTotal) };
  });
  const expectedTotal = roundMoney(lines.reduce((s, l) => s + l.expectedTotal, 0));
  const difference = roundMoney(lines.reduce((s, l) => s + l.difference, 0));
  return {
    expectedTotal,
    chargedTotal: roundMoney(expectedTotal + difference),
    difference,
    passedCount: items.filter((i) => i.checkoutStatus !== 'pending').length,
    wrongCount: items.filter((i) => i.checkoutStatus === 'wrong').length,
    pendingCount: items.filter((i) => i.checkoutStatus === 'pending').length,
    wrongLines: lines.filter((l) => l.item.checkoutStatus === 'wrong'),
  };
}
