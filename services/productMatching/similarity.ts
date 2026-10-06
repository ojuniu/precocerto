import { extractSize, sizeFromParts, tokenize, type ParsedSize } from './normalize';
import { normalizeText } from '@/utils/text';

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0] ?? 0;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = prev[j] ?? 0;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      prev[j] = Math.min((prev[j] ?? 0) + 1, (prev[j - 1] ?? 0) + 1, diagonal + cost);
      diagonal = temp;
    }
  }
  return prev[b.length] ?? Math.max(a.length, b.length);
}

/** Similaridade entre dois tokens (0..1), tolerante a abreviações por truncamento ("coca" ~ "cocacola"). */
export function tokenSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  if (shorter.length >= 3 && longer.startsWith(shorter)) return 0.85;
  const distance = levenshtein(a, b);
  const ratio = 1 - distance / Math.max(a.length, b.length);
  return ratio >= 0.75 ? ratio * 0.9 : 0;
}

function coverage(source: string[], target: string[]): number {
  if (source.length === 0) return 0;
  const total = source.reduce((sum, token) => {
    const best = target.reduce((max, other) => Math.max(max, tokenSimilarity(token, other)), 0);
    return sum + best;
  }, 0);
  return total / source.length;
}

/** Junta tokens consecutivos ("coca" + "cola" → "cocacola") para lidar com grafias diferentes. */
function withJoinedPairs(tokens: string[]): string[] {
  const joined = tokens.slice(0, -1).map((token, i) => token + (tokens[i + 1] ?? ''));
  return [...tokens, ...joined];
}

function sizesCompatible(a: ParsedSize, b: ParsedSize): boolean | null {
  if (a.base !== b.base) return null;
  return Math.abs(a.value - b.value) / Math.max(a.value, b.value) <= 0.02;
}

export interface ShelfSide {
  name: string;
  brand: string | null;
  sizeValue: number | null;
  sizeUnit: string | null;
  unitPrice: number;
}

export interface ReceiptSide {
  name: string;
  unitPrice: number;
}

/** Pontuação lexical + heurística (0..1) de que etiqueta e linha do cupom são o mesmo produto. */
export function scorePair(shelf: ShelfSide, receipt: ReceiptSide): number {
  const shelfText = [shelf.brand ?? '', shelf.name].join(' ');
  const shelfTokens = Array.from(new Set(tokenize(shelfText)));
  const receiptTokens = Array.from(new Set(tokenize(receipt.name)));
  if (shelfTokens.length === 0 || receiptTokens.length === 0) return 0;

  const receiptCoverage = coverage(receiptTokens, withJoinedPairs(shelfTokens));
  const shelfCoverage = coverage(shelfTokens, withJoinedPairs(receiptTokens));
  let score = receiptCoverage * 0.6 + shelfCoverage * 0.4;

  const shelfSize = sizeFromParts(shelf.sizeValue, shelf.sizeUnit) ?? extractSize(shelf.name);
  const receiptSize = extractSize(receipt.name);
  if (shelfSize && receiptSize) {
    const compatible = sizesCompatible(shelfSize, receiptSize);
    if (compatible === true) score += 0.15;
    else if (compatible === false) score *= 0.45;
  }

  if (shelf.brand) {
    const brandTokens = tokenize(shelf.brand);
    const normalizedReceipt = normalizeText(receipt.name).replace(/\s/g, '');
    if (brandTokens.length > 0 && brandTokens.every((t) => normalizedReceipt.includes(t.slice(0, 4)))) score += 0.08;
  }

  if (shelf.unitPrice > 0 && receipt.unitPrice > 0) {
    const ratio = receipt.unitPrice / shelf.unitPrice;
    if (ratio >= 0.8 && ratio <= 1.25) score += 0.04;
    else if (ratio > 2 || ratio < 0.5) score -= 0.1;
  }

  return Math.max(0, Math.min(1, score));
}
