import type { PricePoint, Product, SizeUnit } from '@/types/domain';
import { AppError } from '@/utils/errors';
import { databaseError, getSupabase } from './supabaseClient';
import { mapProduct, type ProductRow } from './mappers';

export async function upsertProduct(input: {
  name: string;
  brand: string | null;
  sizeValue: number | null;
  sizeUnit: SizeUnit | null;
}): Promise<string | null> {
  const { data, error } = await getSupabase().rpc('upsert_product', {
    p_name: input.name,
    p_brand: input.brand,
    p_size_value: input.sizeValue,
    p_size_unit: input.sizeUnit,
  });
  // O catálogo é um bônus: se falhar, o item continua sendo salvo sem vínculo.
  if (error) return null;
  return (data as string | null) ?? null;
}

export interface TrackedProduct extends Product {
  observations: number;
  lastPrice: number | null;
  lastSeenAt: string | null;
}

/** Produtos que o usuário já fotografou, com o último preço visto. */
export async function listTrackedProducts(): Promise<TrackedProduct[]> {
  const { data, error } = await getSupabase()
    .from('shopping_items')
    .select('product_id, shelf_price, promo_price, created_at, products(id, name, brand, size_value, size_unit)')
    .not('product_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw databaseError(error, 'Não foi possível carregar seus produtos.');
  const byProduct = new Map<string, TrackedProduct>();
  type Row = { shelf_price: number | string; promo_price: number | string | null; created_at: string; products: ProductRow | null };
  for (const row of (data ?? []) as unknown as Row[]) {
    if (!row.products) continue;
    const existing = byProduct.get(row.products.id);
    if (existing) {
      existing.observations += 1;
      continue;
    }
    byProduct.set(row.products.id, {
      ...mapProduct(row.products),
      observations: 1,
      lastPrice: Number(row.promo_price ?? row.shelf_price),
      lastSeenAt: row.created_at,
    });
  }
  return Array.from(byProduct.values());
}

export async function getProduct(id: string): Promise<Product> {
  const { data, error } = await getSupabase().from('products').select('id, name, brand, size_value, size_unit').eq('id', id).single();
  if (error) throw databaseError(error, 'Produto não encontrado.');
  return mapProduct(data as ProductRow);
}

export async function getPriceHistory(productId: string): Promise<PricePoint[]> {
  const { data, error } = await getSupabase()
    .from('price_history')
    .select('product_id, market_id, market_name, price, source, observed_at')
    .eq('product_id', productId)
    .order('observed_at', { ascending: true })
    .limit(200);
  if (error) throw databaseError(error, 'Não foi possível carregar o histórico de preços.');
  type Row = { product_id: string; market_id: string | null; market_name: string; price: number | string; source: 'shelf' | 'receipt'; observed_at: string };
  return ((data ?? []) as Row[]).map((r) => ({
    productId: r.product_id,
    marketId: r.market_id,
    marketName: r.market_name,
    price: Number(r.price),
    source: r.source,
    observedAt: r.observed_at,
  }));
}

export interface MarketPrice {
  marketId: string;
  marketName: string;
  price: number;
  observedAt: string;
  samples: number;
}

export async function getMarketComparison(productId: string): Promise<MarketPrice[]> {
  const { data, error } = await getSupabase().rpc('market_price_comparison', { p_product_id: productId });
  if (error) {
    if (error.message.includes('PREMIUM_REQUIRED')) throw new AppError('premium_required', 'Comparação entre mercados é Premium.');
    throw databaseError(error, 'Não foi possível comparar mercados.');
  }
  type Row = { market_id: string; market_name: string; latest_price: number | string; observed_at: string; samples: number };
  return ((data ?? []) as Row[]).map((r) => ({
    marketId: r.market_id,
    marketName: r.market_name,
    price: Number(r.latest_price),
    observedAt: r.observed_at,
    samples: Number(r.samples),
  }));
}
