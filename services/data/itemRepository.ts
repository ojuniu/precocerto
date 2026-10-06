import type { PriceUnit, PromoRule, ShoppingItem, SizeUnit } from '@/types/domain';
import { databaseError, getSupabase } from './supabaseClient';
import { mapShoppingItem, type ShoppingItemRow } from './mappers';

const COLUMNS =
  'id, shopping_id, product_id, name, brand, description, size_value, size_unit, price_unit, shelf_price, promo_price, promo_type, promo_buy_quantity, promo_pay_quantity, promo_nth_unit, promo_discount_percent, quantity, image_path, confidence, created_at';

export interface ShoppingItemInput {
  name: string;
  brand: string | null;
  description: string | null;
  sizeValue: number | null;
  sizeUnit: SizeUnit | null;
  priceUnit: PriceUnit;
  shelfPrice: number;
  promoPrice: number | null;
  promo: PromoRule;
  quantity: number;
  imagePath?: string | null;
  confidence?: number | null;
  productId?: string | null;
  rawReading?: unknown;
}

function toRow(input: Partial<ShoppingItemInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.name !== undefined) row.name = input.name;
  if (input.brand !== undefined) row.brand = input.brand;
  if (input.description !== undefined) row.description = input.description;
  if (input.sizeValue !== undefined) row.size_value = input.sizeValue;
  if (input.sizeUnit !== undefined) row.size_unit = input.sizeUnit;
  if (input.priceUnit !== undefined) row.price_unit = input.priceUnit;
  if (input.shelfPrice !== undefined) row.shelf_price = input.shelfPrice;
  if (input.promoPrice !== undefined) row.promo_price = input.promoPrice;
  if (input.promo !== undefined) {
    row.promo_type = input.promo.type;
    row.promo_buy_quantity = input.promo.buyQuantity ?? null;
    row.promo_pay_quantity = input.promo.payQuantity ?? null;
    row.promo_nth_unit = input.promo.nthUnit ?? null;
    row.promo_discount_percent = input.promo.discountPercent ?? null;
  }
  if (input.quantity !== undefined) row.quantity = input.quantity;
  if (input.imagePath !== undefined) row.image_path = input.imagePath;
  if (input.confidence !== undefined) row.confidence = input.confidence;
  if (input.productId !== undefined) row.product_id = input.productId;
  if (input.rawReading !== undefined) row.raw_reading = input.rawReading;
  return row;
}

export async function listItems(shoppingId: string): Promise<ShoppingItem[]> {
  const { data, error } = await getSupabase()
    .from('shopping_items')
    .select(COLUMNS)
    .eq('shopping_id', shoppingId)
    .order('created_at', { ascending: false });
  if (error) throw databaseError(error, 'Não foi possível carregar os produtos.');
  return ((data ?? []) as ShoppingItemRow[]).map(mapShoppingItem);
}

export async function insertItems(shoppingId: string, inputs: ShoppingItemInput[]): Promise<ShoppingItem[]> {
  const rows = inputs.map((input) => ({ ...toRow(input), shopping_id: shoppingId }));
  const { data, error } = await getSupabase().from('shopping_items').insert(rows).select(COLUMNS);
  if (error) throw databaseError(error, 'Não foi possível salvar o produto.');
  return ((data ?? []) as ShoppingItemRow[]).map(mapShoppingItem);
}

export async function updateItem(id: string, input: Partial<ShoppingItemInput>): Promise<ShoppingItem> {
  const { data, error } = await getSupabase().from('shopping_items').update(toRow(input)).eq('id', id).select(COLUMNS).single();
  if (error) throw databaseError(error, 'Não foi possível atualizar o produto.');
  return mapShoppingItem(data as ShoppingItemRow);
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await getSupabase().from('shopping_items').delete().eq('id', id);
  if (error) throw databaseError(error, 'Não foi possível remover o produto.');
}
