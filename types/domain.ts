export type PriceUnit = 'un' | 'kg' | 'l';

export type SizeUnit = 'g' | 'kg' | 'ml' | 'l' | 'un' | 'm';

export type PromoType =
  | 'none'
  /** Preço promocional simples (de/por). */
  | 'sale'
  /** "Leve X pague Y". */
  | 'multibuy'
  /** "Segunda (ou N-ésima) unidade com X% de desconto". */
  | 'nth_unit_discount'
  /** Preço reduzido a partir de uma quantidade mínima ("a partir de 3 un: R$ X"). */
  | 'min_quantity';

export interface PromoRule {
  type: PromoType;
  /** multibuy: leve; min_quantity: quantidade mínima. */
  buyQuantity?: number | null;
  /** multibuy: pague. */
  payQuantity?: number | null;
  /** nth_unit_discount: qual unidade recebe desconto (ex.: 2). */
  nthUnit?: number | null;
  /** nth_unit_discount: percentual de desconto (0-100). */
  discountPercent?: number | null;
}

export type ShoppingStatus = 'in_progress' | 'awaiting_receipt' | 'checked';

export interface Market {
  id: string;
  name: string;
  city?: string | null;
}

export interface Shopping {
  id: string;
  userId: string;
  marketId: string | null;
  marketName: string;
  createdAt: string;
  status: ShoppingStatus;
  itemCount: number;
  expectedTotal: number;
  paidTotal: number | null;
  difference: number | null;
  divergenceCount: number;
}

export interface ShoppingItem {
  id: string;
  shoppingId: string;
  productId: string | null;
  name: string;
  brand: string | null;
  description: string | null;
  sizeValue: number | null;
  sizeUnit: SizeUnit | null;
  priceUnit: PriceUnit;
  /** Preço normal (sem promoção). */
  shelfPrice: number;
  /** Preço promocional unitário, quando a etiqueta indica (de/por). */
  promoPrice: number | null;
  promo: PromoRule;
  quantity: number;
  imagePath: string | null;
  confidence: number | null;
  createdAt: string;
  /** Modo Caixa: passou no caixa, ou o cliente viu preço diferente. */
  checkoutStatus: CheckoutStatus;
  /** Preço unitário que apareceu no caixa, quando diferente da etiqueta. */
  checkoutChargedPrice: number | null;
}

export type CheckoutStatus = 'pending' | 'passed' | 'wrong';

export interface ReceiptItem {
  id: string;
  receiptId: string;
  lineNumber: number | null;
  code: string | null;
  productName: string;
  quantity: number;
  unit: PriceUnit;
  unitPrice: number;
  totalPrice: number;
  discount: number;
}

export interface Receipt {
  id: string;
  shoppingId: string;
  imagePath: string | null;
  marketName: string | null;
  issuedAt: string | null;
  subtotal: number | null;
  discountTotal: number | null;
  total: number | null;
  confidence: number | null;
  items: ReceiptItem[];
}

export type MatchStatus = 'auto' | 'confirmed' | 'pending' | 'rejected' | 'manual';

export interface ItemMatch {
  id: string;
  shoppingId: string;
  shoppingItemId: string;
  receiptItemId: string;
  confidence: number;
  status: MatchStatus;
  divergenceConfirmed: boolean;
}

export interface PricePoint {
  productId: string;
  marketId: string | null;
  marketName: string;
  price: number;
  source: 'shelf' | 'receipt';
  observedAt: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string | null;
  sizeValue: number | null;
  sizeUnit: SizeUnit | null;
}
