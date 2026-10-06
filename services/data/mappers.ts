import type {
  ItemMatch,
  Market,
  PriceUnit,
  Product,
  PromoType,
  Receipt,
  ReceiptItem,
  Shopping,
  ShoppingItem,
  ShoppingStatus,
  SizeUnit,
  MatchStatus,
} from '@/types/domain';

/** Linhas como vêm do Postgres (snake_case; numeric chega como string ou number). */
type Numeric = number | string | null;

const toNumber = (v: Numeric): number | null => (v === null || v === undefined ? null : Number(v));
const toNumberOr = (v: Numeric, fallback: number): number => toNumber(v) ?? fallback;

export interface MarketRow {
  id: string;
  name: string;
  city: string | null;
}

export interface ShoppingRow {
  id: string;
  user_id: string;
  market_id: string | null;
  market_name: string;
  status: ShoppingStatus;
  item_count: number;
  expected_total: Numeric;
  paid_total: Numeric;
  difference: Numeric;
  divergence_count: number;
  created_at: string;
}

export interface ShoppingItemRow {
  id: string;
  shopping_id: string;
  product_id: string | null;
  name: string;
  brand: string | null;
  description: string | null;
  size_value: Numeric;
  size_unit: string | null;
  price_unit: PriceUnit;
  shelf_price: Numeric;
  promo_price: Numeric;
  promo_type: PromoType;
  promo_buy_quantity: Numeric;
  promo_pay_quantity: Numeric;
  promo_nth_unit: Numeric;
  promo_discount_percent: Numeric;
  quantity: Numeric;
  image_path: string | null;
  confidence: Numeric;
  created_at: string;
}

export interface ReceiptRow {
  id: string;
  shopping_id: string;
  image_path: string | null;
  market_name: string | null;
  issued_at: string | null;
  subtotal: Numeric;
  discount_total: Numeric;
  total: Numeric;
  confidence: Numeric;
  receipt_items?: ReceiptItemRow[];
}

export interface ReceiptItemRow {
  id: string;
  receipt_id: string;
  line_number: number | null;
  code: string | null;
  product_name: string;
  quantity: Numeric;
  unit: PriceUnit;
  unit_price: Numeric;
  total_price: Numeric;
  discount: Numeric;
}

export interface ItemMatchRow {
  id: string;
  shopping_id: string;
  shopping_item_id: string;
  receipt_item_id: string;
  confidence: Numeric;
  status: MatchStatus;
  divergence_confirmed: boolean;
}

export interface ProductRow {
  id: string;
  name: string;
  brand: string | null;
  size_value: Numeric;
  size_unit: string | null;
}

export const mapMarket = (row: MarketRow): Market => ({ id: row.id, name: row.name, city: row.city });

export const mapShopping = (row: ShoppingRow): Shopping => ({
  id: row.id,
  userId: row.user_id,
  marketId: row.market_id,
  marketName: row.market_name,
  createdAt: row.created_at,
  status: row.status,
  itemCount: row.item_count,
  expectedTotal: toNumberOr(row.expected_total, 0),
  paidTotal: toNumber(row.paid_total),
  difference: toNumber(row.difference),
  divergenceCount: row.divergence_count,
});

export const mapShoppingItem = (row: ShoppingItemRow): ShoppingItem => ({
  id: row.id,
  shoppingId: row.shopping_id,
  productId: row.product_id,
  name: row.name,
  brand: row.brand,
  description: row.description,
  sizeValue: toNumber(row.size_value),
  sizeUnit: row.size_unit as SizeUnit | null,
  priceUnit: row.price_unit,
  shelfPrice: toNumberOr(row.shelf_price, 0),
  promoPrice: toNumber(row.promo_price),
  promo: {
    type: row.promo_type,
    buyQuantity: toNumber(row.promo_buy_quantity),
    payQuantity: toNumber(row.promo_pay_quantity),
    nthUnit: toNumber(row.promo_nth_unit),
    discountPercent: toNumber(row.promo_discount_percent),
  },
  quantity: toNumberOr(row.quantity, 1),
  imagePath: row.image_path,
  confidence: toNumber(row.confidence),
  createdAt: row.created_at,
});

export const mapReceiptItem = (row: ReceiptItemRow): ReceiptItem => ({
  id: row.id,
  receiptId: row.receipt_id,
  lineNumber: row.line_number,
  code: row.code,
  productName: row.product_name,
  quantity: toNumberOr(row.quantity, 1),
  unit: row.unit,
  unitPrice: toNumberOr(row.unit_price, 0),
  totalPrice: toNumberOr(row.total_price, 0),
  discount: toNumberOr(row.discount, 0),
});

export const mapReceipt = (row: ReceiptRow): Receipt => ({
  id: row.id,
  shoppingId: row.shopping_id,
  imagePath: row.image_path,
  marketName: row.market_name,
  issuedAt: row.issued_at,
  subtotal: toNumber(row.subtotal),
  discountTotal: toNumber(row.discount_total),
  total: toNumber(row.total),
  confidence: toNumber(row.confidence),
  items: (row.receipt_items ?? [])
    .map(mapReceiptItem)
    .sort((a, b) => (a.lineNumber ?? 0) - (b.lineNumber ?? 0)),
});

export const mapItemMatch = (row: ItemMatchRow): ItemMatch => ({
  id: row.id,
  shoppingId: row.shopping_id,
  shoppingItemId: row.shopping_item_id,
  receiptItemId: row.receipt_item_id,
  confidence: toNumberOr(row.confidence, 0),
  status: row.status,
  divergenceConfirmed: row.divergence_confirmed,
});

export const mapProduct = (row: ProductRow): Product => ({
  id: row.id,
  name: row.name,
  brand: row.brand,
  sizeValue: toNumber(row.size_value),
  sizeUnit: row.size_unit as SizeUnit | null,
});
