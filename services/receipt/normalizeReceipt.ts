import type { ReceiptLineReading, ReceiptReading } from '@/types/ai';
import { roundMoney } from '@/utils/money';
import { normalizeText } from '@/utils/text';

export interface NormalizedReceiptLine {
  lineNumber: number | null;
  code: string | null;
  description: string;
  quantity: number;
  unit: ReceiptLineReading['unit'];
  unitPrice: number;
  /** Valor bruto da linha (quantidade × unitário), antes de descontos. */
  grossTotal: number;
  discount: number;
  /** Valor efetivamente pago na linha (bruto − desconto). */
  totalPrice: number;
}

export interface ReceiptConsistency {
  itemsSum: number;
  /** Diferença entre a soma das linhas e o total lido no cupom. */
  gap: number | null;
  consistent: boolean;
}

export interface NormalizedReceipt {
  marketName: string | null;
  issuedAt: string | null;
  lines: NormalizedReceiptLine[];
  subtotal: number | null;
  discountTotal: number;
  /** Descontos do cupom que não estão atribuídos a nenhuma linha. */
  unallocatedDiscount: number;
  total: number | null;
  confidence: number;
  consistency: ReceiptConsistency;
  warnings: string[];
}

function completeLine(line: ReceiptLineReading): NormalizedReceiptLine | null {
  const description = line.description.trim();
  if (!description) return null;
  const quantity = line.quantity > 0 ? line.quantity : 1;
  let unitPrice = line.unitPrice;
  let grossTotal = line.totalPrice;
  if (unitPrice === null && grossTotal === null) return null;
  if (unitPrice === null && grossTotal !== null) unitPrice = grossTotal / quantity;
  if (grossTotal === null && unitPrice !== null) grossTotal = unitPrice * quantity;
  const discount = Math.abs(line.discount || 0);
  const gross = roundMoney(grossTotal ?? 0);
  return {
    lineNumber: line.lineNumber,
    code: line.code,
    description,
    quantity,
    unit: line.unit,
    unitPrice: roundMoney(unitPrice ?? 0),
    grossTotal: gross,
    discount: roundMoney(discount),
    totalPrice: roundMoney(gross - discount),
  };
}

/** Linhas repetidas do mesmo produto (passado duas vezes no caixa) viram uma só, somando quantidades. */
export function mergeDuplicateLines(lines: NormalizedReceiptLine[]): NormalizedReceiptLine[] {
  const merged = new Map<string, NormalizedReceiptLine>();
  for (const line of lines) {
    const key = `${line.code ?? normalizeText(line.description)}|${line.unitPrice}|${line.unit}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...line });
      continue;
    }
    existing.quantity = Math.round((existing.quantity + line.quantity) * 1000) / 1000;
    existing.grossTotal = roundMoney(existing.grossTotal + line.grossTotal);
    existing.discount = roundMoney(existing.discount + line.discount);
    existing.totalPrice = roundMoney(existing.totalPrice + line.totalPrice);
  }
  return Array.from(merged.values());
}

/** Limpa, completa e confere a consistência do cupom lido pela IA. */
export function normalizeReceipt(reading: ReceiptReading): NormalizedReceipt {
  const warnings: string[] = [];
  const lines = mergeDuplicateLines(
    reading.items.map(completeLine).filter((line): line is NormalizedReceiptLine => line !== null),
  );
  if (lines.length < reading.items.length) warnings.push('Algumas linhas do cupom não puderam ser lidas.');

  const lineDiscounts = roundMoney(lines.reduce((sum, l) => sum + l.discount, 0));
  const discountTotal = roundMoney(Math.max(Math.abs(reading.discountTotal ?? 0), lineDiscounts));
  const unallocatedDiscount = roundMoney(Math.max(0, discountTotal - lineDiscounts));
  const itemsSum = roundMoney(lines.reduce((sum, l) => sum + l.totalPrice, 0) - unallocatedDiscount);
  const gap = reading.total !== null ? roundMoney(reading.total - itemsSum) : null;
  const consistent = gap === null || Math.abs(gap) <= 0.05;
  if (!consistent) warnings.push('A soma dos itens não bate com o total do cupom. Algum item pode não ter sido lido.');
  if (unallocatedDiscount > 0) warnings.push('O cupom tem descontos que não estão ligados a um item específico.');

  return {
    marketName: reading.marketName,
    issuedAt: reading.issuedAt,
    lines,
    subtotal: reading.subtotal,
    discountTotal,
    unallocatedDiscount,
    total: reading.total ?? itemsSum,
    confidence: reading.confidence,
    consistency: { itemsSum, gap, consistent },
    warnings,
  };
}
