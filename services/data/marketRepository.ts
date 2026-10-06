import type { Market } from '@/types/domain';
import { databaseError, getSupabase, requireUserId } from './supabaseClient';
import { mapMarket, type MarketRow } from './mappers';

const COLUMNS = 'id, name, city';

/** Mercados usados recentemente pelo usuário (mais recente primeiro, sem repetição). */
export async function listRecentMarkets(limit = 8): Promise<Market[]> {
  const { data, error } = await getSupabase()
    .from('shoppings')
    .select('market_id, markets(id, name, city)')
    .not('market_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(40);
  if (error) throw databaseError(error, 'Não foi possível carregar seus mercados.');
  const seen = new Map<string, Market>();
  for (const row of (data ?? []) as unknown as { markets: MarketRow | null }[]) {
    if (row.markets && !seen.has(row.markets.id)) seen.set(row.markets.id, mapMarket(row.markets));
  }
  return Array.from(seen.values()).slice(0, limit);
}

export async function searchMarkets(query: string): Promise<Market[]> {
  const term = query.trim();
  if (term.length < 2) return [];
  const { data, error } = await getSupabase()
    .from('markets')
    .select(COLUMNS)
    .ilike('name', `%${term.replace(/[%_]/g, '')}%`)
    .order('name')
    .limit(15);
  if (error) throw databaseError(error, 'Não foi possível buscar mercados.');
  return ((data ?? []) as MarketRow[]).map(mapMarket);
}

/** Retorna o mercado existente com o mesmo nome ou cria um novo. */
export async function findOrCreateMarket(name: string): Promise<Market> {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  const supabase = getSupabase();
  const { data: existing, error: findError } = await supabase
    .from('markets')
    .select(COLUMNS)
    .ilike('name', trimmed.replace(/[%_]/g, ''))
    .is('city', null)
    .limit(1)
    .maybeSingle();
  if (findError) throw databaseError(findError, 'Não foi possível buscar o mercado.');
  if (existing) return mapMarket(existing as MarketRow);

  const userId = await requireUserId();
  const { data, error } = await supabase.from('markets').insert({ name: trimmed, created_by: userId }).select(COLUMNS).single();
  if (error) throw databaseError(error, 'Não foi possível cadastrar o mercado.');
  return mapMarket(data as MarketRow);
}
