import type { PriceTagReading } from '@/types/ai';
import type { PriceUnit, PromoRule, ShoppingItem, SizeUnit } from '@/types/domain';
import { normalizeText } from '@/utils/text';

/** Dados do produto como o usuário vê/edita antes de confirmar. */
export interface ItemDraft {
  name: string;
  brand: string | null;
  description: string | null;
  sizeValue: number | null;
  sizeUnit: SizeUnit | null;
  priceUnit: PriceUnit;
  shelfPrice: number | null;
  promoPrice: number | null;
  promo: PromoRule;
  quantity: number;
  confidence: number | null;
}

export function draftFromReading(reading: PriceTagReading): ItemDraft {
  return {
    name: reading.productName ?? '',
    brand: reading.brand,
    description: reading.description,
    sizeValue: reading.sizeValue,
    sizeUnit: reading.sizeUnit,
    priceUnit: reading.priceUnit,
    shelfPrice: reading.regularPrice,
    promoPrice: reading.promoPrice,
    promo: reading.promo,
    quantity: 1,
    confidence: reading.confidence,
  };
}

export function draftFromItem(item: ShoppingItem): ItemDraft {
  return {
    name: item.name,
    brand: item.brand,
    description: item.description,
    sizeValue: item.sizeValue,
    sizeUnit: item.sizeUnit,
    priceUnit: item.priceUnit,
    shelfPrice: item.shelfPrice,
    promoPrice: item.promoPrice,
    promo: item.promo,
    quantity: item.quantity,
    confidence: item.confidence,
  };
}

export function emptyDraft(): ItemDraft {
  return {
    name: '',
    brand: null,
    description: null,
    sizeValue: null,
    sizeUnit: null,
    priceUnit: 'un',
    shelfPrice: null,
    promoPrice: null,
    promo: { type: 'none' },
    quantity: 1,
    confidence: null,
  };
}

export type DraftError = 'name' | 'price' | 'quantity';

export function validateDraft(draft: ItemDraft): DraftError[] {
  const errors: DraftError[] = [];
  if (draft.name.trim().length < 2) errors.push('name');
  if (draft.shelfPrice === null || draft.shelfPrice <= 0) errors.push('price');
  if (!(draft.quantity > 0)) errors.push('quantity');
  return errors;
}

/** Chave para detectar o mesmo produto fotografado duas vezes na mesma compra. */
export function itemIdentityKey(item: Pick<ItemDraft, 'name' | 'brand' | 'sizeValue' | 'sizeUnit'>): string {
  return normalizeText([item.brand, item.name, item.sizeValue, item.sizeUnit].filter(Boolean).join(' '));
}

export function displaySize(value: number | null, unit: SizeUnit | null): string | null {
  if (value === null || unit === null) return null;
  const formatted = Number.isInteger(value) ? String(value) : String(value).replace('.', ',');
  return unit === 'l' ? `${formatted}L` : `${formatted}${unit}`;
}

export function itemTitle(item: Pick<ItemDraft, 'name' | 'sizeValue' | 'sizeUnit'>): string {
  const size = displaySize(item.sizeValue, item.sizeUnit);
  if (!size) return item.name;
  return normalizeText(item.name).includes(normalizeText(size)) ? item.name : `${item.name} ${size}`;
}
