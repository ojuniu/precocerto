import type { ItemMatch, ReceiptItem, ShoppingItem } from '@/types/domain';

let seq = 0;
const id = (prefix: string) => `${prefix}-${++seq}`;

export function shelfItem(overrides: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    id: id('s'),
    shoppingId: 'shop',
    productId: null,
    name: 'Produto',
    brand: null,
    description: null,
    sizeValue: null,
    sizeUnit: null,
    priceUnit: 'un',
    shelfPrice: 10,
    promoPrice: null,
    promo: { type: 'none' },
    quantity: 1,
    imagePath: null,
    confidence: 0.9,
    createdAt: '2026-10-06T10:00:00Z',
    ...overrides,
  };
}

export function receiptItem(overrides: Partial<ReceiptItem> = {}): ReceiptItem {
  return {
    id: id('r'),
    receiptId: 'rec',
    lineNumber: 1,
    code: null,
    productName: 'PRODUTO',
    quantity: 1,
    unit: 'un',
    unitPrice: 10,
    totalPrice: 10,
    discount: 0,
    ...overrides,
  };
}

export function match(shelf: ShoppingItem, receipt: ReceiptItem, overrides: Partial<ItemMatch> = {}): ItemMatch {
  return {
    id: id('m'),
    shoppingId: 'shop',
    shoppingItemId: shelf.id,
    receiptItemId: receipt.id,
    confidence: 0.95,
    status: 'auto',
    divergenceConfirmed: false,
    ...overrides,
  };
}
