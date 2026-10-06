import type { NormalizedReceipt } from '@/services/receipt/normalizeReceipt';
import type { Receipt } from '@/types/domain';
import { databaseError, getSupabase } from './supabaseClient';
import { mapReceipt, type ReceiptRow } from './mappers';

const COLUMNS =
  'id, shopping_id, image_path, market_name, issued_at, subtotal, discount_total, total, confidence, receipt_items(id, receipt_id, line_number, code, product_name, quantity, unit, unit_price, total_price, discount)';

export async function getReceipt(shoppingId: string): Promise<Receipt | null> {
  const { data, error } = await getSupabase().from('receipts').select(COLUMNS).eq('shopping_id', shoppingId).maybeSingle();
  if (error) throw databaseError(error, 'Não foi possível carregar o cupom.');
  return data ? mapReceipt(data as unknown as ReceiptRow) : null;
}

/** Substitui o cupom da compra (permite fotografar de novo). */
export async function saveReceipt(shoppingId: string, receipt: NormalizedReceipt, imagePath: string | null): Promise<Receipt> {
  const supabase = getSupabase();
  const { error: deleteError } = await supabase.from('receipts').delete().eq('shopping_id', shoppingId);
  if (deleteError) throw databaseError(deleteError, 'Não foi possível substituir o cupom anterior.');

  const { data: inserted, error } = await supabase
    .from('receipts')
    .insert({
      shopping_id: shoppingId,
      image_path: imagePath,
      market_name: receipt.marketName,
      issued_at: receipt.issuedAt,
      subtotal: receipt.subtotal,
      discount_total: receipt.discountTotal,
      total: receipt.total,
      confidence: receipt.confidence,
      raw_reading: receipt,
    })
    .select('id')
    .single();
  if (error || !inserted) throw databaseError(error, 'Não foi possível salvar o cupom.');
  const receiptId = (inserted as { id: string }).id;

  const { error: itemsError } = await supabase.from('receipt_items').insert(
    receipt.lines.map((line, index) => ({
      receipt_id: receiptId,
      line_number: line.lineNumber ?? index + 1,
      code: line.code,
      product_name: line.description,
      quantity: line.quantity,
      unit: line.unit,
      unit_price: line.unitPrice,
      total_price: line.totalPrice,
      discount: line.discount,
    })),
  );
  if (itemsError) throw databaseError(itemsError, 'Não foi possível salvar os itens do cupom.');

  const saved = await getReceipt(shoppingId);
  if (!saved) throw databaseError(null, 'Cupom não encontrado após salvar.');
  return saved;
}
