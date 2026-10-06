import type { PromoRule, ShoppingItem } from '@/types/domain';
import { roundMoney } from '@/utils/money';

export type PricedItem = Pick<ShoppingItem, 'shelfPrice' | 'promoPrice' | 'promo' | 'priceUnit'>;

/** Preço unitário efetivo da prateleira para 1 unidade (ou 1 kg/l). */
export function effectiveUnitPrice(item: PricedItem): number {
  if (item.promoPrice !== null && item.promoPrice > 0 && (item.promo.type === 'sale' || item.promo.type === 'none')) {
    return item.promoPrice;
  }
  return item.shelfPrice;
}

function multibuyTotal(unitPrice: number, quantity: number, rule: PromoRule): number {
  const buy = rule.buyQuantity ?? 0;
  const pay = rule.payQuantity ?? 0;
  if (buy <= 0 || pay <= 0 || pay >= buy || !Number.isInteger(quantity)) return unitPrice * quantity;
  const fullGroups = Math.floor(quantity / buy);
  const remainder = quantity % buy;
  return (fullGroups * pay + remainder) * unitPrice;
}

function nthUnitDiscountTotal(unitPrice: number, quantity: number, rule: PromoRule): number {
  const nth = rule.nthUnit ?? 2;
  const percent = rule.discountPercent ?? 0;
  if (nth <= 1 || percent <= 0 || !Number.isInteger(quantity)) return unitPrice * quantity;
  const discountedUnits = Math.floor(quantity / nth);
  return quantity * unitPrice - discountedUnits * unitPrice * (percent / 100);
}

function minQuantityTotal(item: PricedItem, quantity: number): number {
  const threshold = item.promo.buyQuantity ?? 0;
  if (item.promoPrice !== null && threshold > 0 && quantity >= threshold) return item.promoPrice * quantity;
  return item.shelfPrice * quantity;
}

/**
 * Total esperado para uma quantidade, aplicando as regras de promoção da etiqueta.
 * Para itens pesáveis (kg/l), `quantity` é o peso/volume e o preço é por kg/l.
 */
export function expectedLineTotal(item: PricedItem, quantity: number): number {
  if (quantity <= 0) return 0;
  switch (item.promo.type) {
    case 'multibuy':
      return roundMoney(multibuyTotal(item.shelfPrice, quantity, item.promo));
    case 'nth_unit_discount':
      return roundMoney(nthUnitDiscountTotal(item.shelfPrice, quantity, item.promo));
    case 'min_quantity':
      return roundMoney(minQuantityTotal(item, quantity));
    default:
      return roundMoney(effectiveUnitPrice(item) * quantity);
  }
}

export function expectedShoppingTotal(items: readonly (PricedItem & { quantity: number })[]): number {
  return roundMoney(items.reduce((sum, item) => sum + expectedLineTotal(item, item.quantity), 0));
}

export function describePromo(rule: PromoRule, promoPrice: number | null): string | null {
  switch (rule.type) {
    case 'multibuy':
      return rule.buyQuantity && rule.payQuantity ? `Leve ${rule.buyQuantity} pague ${rule.payQuantity}` : 'Leve mais, pague menos';
    case 'nth_unit_discount':
      return `${rule.nthUnit ?? 2}ª unidade com ${rule.discountPercent ?? 0}% off`;
    case 'min_quantity':
      return rule.buyQuantity ? `A partir de ${rule.buyQuantity} unidades` : 'Preço por quantidade';
    case 'sale':
      return promoPrice !== null ? 'Promoção' : null;
    default:
      return null;
  }
}

export const NO_PROMO: PromoRule = { type: 'none' };
