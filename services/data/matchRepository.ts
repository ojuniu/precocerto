import type { ItemMatch, MatchStatus } from '@/types/domain';
import { databaseError, getSupabase } from './supabaseClient';
import { mapItemMatch, type ItemMatchRow } from './mappers';

const COLUMNS = 'id, shopping_id, shopping_item_id, receipt_item_id, confidence, status, divergence_confirmed';

export interface MatchInput {
  shoppingItemId: string;
  receiptItemId: string;
  confidence: number;
  status: MatchStatus;
  method: 'lexical' | 'semantic' | 'manual';
}

export interface MatchFigures {
  expectedTotal: number | null;
  chargedTotal: number | null;
  difference: number | null;
}

export async function listMatches(shoppingId: string): Promise<ItemMatch[]> {
  const { data, error } = await getSupabase().from('item_matches').select(COLUMNS).eq('shopping_id', shoppingId);
  if (error) throw databaseError(error, 'Não foi possível carregar a conferência.');
  return ((data ?? []) as ItemMatchRow[]).map(mapItemMatch);
}

export async function replaceMatches(shoppingId: string, matches: MatchInput[]): Promise<ItemMatch[]> {
  const supabase = getSupabase();
  const { error: deleteError } = await supabase.from('item_matches').delete().eq('shopping_id', shoppingId);
  if (deleteError) throw databaseError(deleteError, 'Não foi possível refazer a conferência.');
  if (matches.length === 0) return [];
  const { data, error } = await supabase
    .from('item_matches')
    .insert(
      matches.map((m) => ({
        shopping_id: shoppingId,
        shopping_item_id: m.shoppingItemId,
        receipt_item_id: m.receiptItemId,
        confidence: m.confidence,
        status: m.status,
        method: m.method,
      })),
    )
    .select(COLUMNS);
  if (error) throw databaseError(error, 'Não foi possível salvar a conferência.');
  return ((data ?? []) as ItemMatchRow[]).map(mapItemMatch);
}

export async function addMatch(shoppingId: string, match: MatchInput): Promise<ItemMatch> {
  const { data, error } = await getSupabase()
    .from('item_matches')
    .insert({
      shopping_id: shoppingId,
      shopping_item_id: match.shoppingItemId,
      receipt_item_id: match.receiptItemId,
      confidence: match.confidence,
      status: match.status,
      method: match.method,
    })
    .select(COLUMNS)
    .single();
  if (error) throw databaseError(error, 'Não foi possível vincular os produtos.');
  return mapItemMatch(data as ItemMatchRow);
}

export async function setMatchStatus(matchId: string, status: MatchStatus): Promise<void> {
  const { error } = await getSupabase().from('item_matches').update({ status }).eq('id', matchId);
  if (error) throw databaseError(error, 'Não foi possível atualizar a correspondência.');
}

export async function deleteMatch(matchId: string): Promise<void> {
  const { error } = await getSupabase().from('item_matches').delete().eq('id', matchId);
  if (error) throw databaseError(error, 'Não foi possível desfazer a correspondência.');
}

export async function setDivergenceConfirmed(matchId: string, confirmed: boolean): Promise<void> {
  const { error } = await getSupabase()
    .from('item_matches')
    .update({ divergence_confirmed: confirmed, divergence_confirmed_at: confirmed ? new Date().toISOString() : null })
    .eq('id', matchId);
  if (error) throw databaseError(error, 'Não foi possível registrar a divergência.');
}

export async function saveMatchFigures(figures: ({ matchId: string } & MatchFigures)[]): Promise<void> {
  const supabase = getSupabase();
  const results = await Promise.all(
    figures.map((f) =>
      supabase
        .from('item_matches')
        .update({ expected_total: f.expectedTotal, charged_total: f.chargedTotal, difference: f.difference })
        .eq('id', f.matchId),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw databaseError(failed.error, 'Não foi possível salvar os valores da conferência.');
}
