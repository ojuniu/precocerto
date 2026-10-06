import type { Shopping, ShoppingStatus } from '@/types/domain';
import { databaseError, getSupabase } from './supabaseClient';
import { mapShopping, type ShoppingRow } from './mappers';

const COLUMNS =
  'id, user_id, market_id, market_name, status, item_count, expected_total, paid_total, difference, divergence_count, created_at';

export async function createShopping(market: { id: string | null; name: string }): Promise<Shopping> {
  const { data, error } = await getSupabase()
    .from('shoppings')
    .insert({ market_id: market.id, market_name: market.name })
    .select(COLUMNS)
    .single();
  if (error) throw databaseError(error, 'Não foi possível criar a compra.');
  return mapShopping(data as ShoppingRow);
}

export async function listShoppings(options: { limit?: number; sinceISO?: string | null } = {}): Promise<Shopping[]> {
  let query = getSupabase().from('shoppings').select(COLUMNS).order('created_at', { ascending: false }).limit(options.limit ?? 50);
  if (options.sinceISO) query = query.gte('created_at', options.sinceISO);
  const { data, error } = await query;
  if (error) throw databaseError(error, 'Não foi possível carregar suas compras.');
  return ((data ?? []) as ShoppingRow[]).map(mapShopping);
}

export async function getShopping(id: string): Promise<Shopping> {
  const { data, error } = await getSupabase().from('shoppings').select(COLUMNS).eq('id', id).single();
  if (error) throw databaseError(error, 'Compra não encontrada.');
  return mapShopping(data as ShoppingRow);
}

export interface ShoppingTotalsUpdate {
  itemCount?: number;
  expectedTotal?: number;
  paidTotal?: number | null;
  difference?: number | null;
  divergenceCount?: number;
  status?: ShoppingStatus;
}

export async function updateShopping(id: string, update: ShoppingTotalsUpdate): Promise<Shopping> {
  const patch: Record<string, unknown> = {};
  if (update.itemCount !== undefined) patch.item_count = update.itemCount;
  if (update.expectedTotal !== undefined) patch.expected_total = update.expectedTotal;
  if (update.paidTotal !== undefined) patch.paid_total = update.paidTotal;
  if (update.difference !== undefined) patch.difference = update.difference;
  if (update.divergenceCount !== undefined) patch.divergence_count = update.divergenceCount;
  if (update.status !== undefined) {
    patch.status = update.status;
    if (update.status === 'checked') patch.checked_at = new Date().toISOString();
  }
  const { data, error } = await getSupabase().from('shoppings').update(patch).eq('id', id).select(COLUMNS).single();
  if (error) throw databaseError(error, 'Não foi possível atualizar a compra.');
  return mapShopping(data as ShoppingRow);
}

export async function deleteShopping(id: string): Promise<void> {
  const { error } = await getSupabase().from('shoppings').delete().eq('id', id);
  if (error) throw databaseError(error, 'Não foi possível excluir a compra.');
}
