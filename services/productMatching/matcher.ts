import { CONFIDENCE } from '@/constants/config';
import type { MatchCandidateInput, SemanticMatchPair } from '@/types/ai';
import { scorePair, type ReceiptSide, type ShelfSide } from './similarity';

export interface ShelfCandidate extends ShelfSide {
  id: string;
}

export interface ReceiptCandidate extends ReceiptSide {
  id: string;
}

export interface ProductMatch<S extends ShelfCandidate = ShelfCandidate, R extends ReceiptCandidate = ReceiptCandidate> {
  matched: true;
  confidence: number;
  /** true quando a confiança não é alta o bastante: o usuário precisa confirmar. */
  needsConfirmation: boolean;
  method: 'lexical' | 'semantic';
  shelfProduct: S;
  receiptProduct: R;
}

export interface MatchingResult<S extends ShelfCandidate, R extends ReceiptCandidate> {
  matches: ProductMatch<S, R>[];
  unmatchedShelf: S[];
  unmatchedReceipt: R[];
}

/** Desempate semântico opcional (ex.: IA). Recebe pares duvidosos e devolve um veredito por par. */
export type SemanticMatcher = (
  pairs: { shelf: MatchCandidateInput; receipt: MatchCandidateInput }[],
) => Promise<SemanticMatchPair[]>;

export interface MatchingOptions {
  semanticMatcher?: SemanticMatcher;
  autoThreshold?: number;
  minThreshold?: number;
  /** Quantos candidatos por item de prateleira enviar ao desempate semântico. */
  semanticTopK?: number;
}

interface ScoredPair {
  shelfIndex: number;
  receiptIndex: number;
  score: number;
  method: 'lexical' | 'semantic';
}

const pairKey = (shelfId: string, receiptId: string) => `${shelfId}::${receiptId}`;

function combineScores(lexical: number, verdict: SemanticMatchPair | undefined): { score: number; semantic: boolean } {
  if (!verdict) return { score: lexical, semantic: false };
  if (verdict.sameProduct) {
    return { score: Math.max(lexical, lexical * 0.35 + verdict.confidence * 0.65), semantic: true };
  }
  return { score: verdict.confidence >= 0.7 ? lexical * 0.5 : lexical, semantic: true };
}

async function askSemantic<S extends ShelfCandidate, R extends ReceiptCandidate>(
  shelf: S[],
  receipt: R[],
  matrix: number[][],
  options: Required<Pick<MatchingOptions, 'autoThreshold' | 'semanticTopK'>> & { semanticMatcher: SemanticMatcher; floor: number },
): Promise<Map<string, SemanticMatchPair>> {
  const requests: { shelf: MatchCandidateInput; receipt: MatchCandidateInput }[] = [];
  shelf.forEach((shelfItem, i) => {
    const row = matrix[i] ?? [];
    const best = Math.max(0, ...row);
    if (best >= options.autoThreshold) return;
    row
      .map((score, j) => ({ score, j }))
      .filter(({ score }) => score >= options.floor)
      .sort((a, b) => b.score - a.score)
      .slice(0, options.semanticTopK)
      .forEach(({ j }) => {
        const receiptItem = receipt[j];
        if (!receiptItem) return;
        const shelfName = [shelfItem.brand, shelfItem.name, shelfItem.sizeValue ? `${shelfItem.sizeValue}${shelfItem.sizeUnit ?? ''}` : '']
          .filter(Boolean)
          .join(' ');
        requests.push({ shelf: { id: shelfItem.id, name: shelfName }, receipt: { id: receiptItem.id, name: receiptItem.name } });
      });
  });

  const verdicts = new Map<string, SemanticMatchPair>();
  if (requests.length === 0) return verdicts;
  try {
    const answers = await options.semanticMatcher(requests);
    answers.forEach((answer) => verdicts.set(pairKey(answer.shelfId, answer.receiptId), answer));
  } catch {
    // O desempate semântico é opcional: sem ele, as correspondências duvidosas seguem para confirmação manual.
  }
  return verdicts;
}

/**
 * Faz a correspondência 1:1 entre produtos fotografados e linhas do cupom.
 * Nunca aceita silenciosamente uma correspondência duvidosa: abaixo do limiar automático,
 * a correspondência volta com `needsConfirmation = true`.
 */
export async function matchProducts<S extends ShelfCandidate, R extends ReceiptCandidate>(
  shelf: S[],
  receipt: R[],
  options: MatchingOptions = {},
): Promise<MatchingResult<S, R>> {
  const autoThreshold = options.autoThreshold ?? CONFIDENCE.matchAuto;
  const minThreshold = options.minThreshold ?? CONFIDENCE.matchMin;
  const matrix = shelf.map((s) => receipt.map((r) => scorePair(s, r)));

  const verdicts = options.semanticMatcher
    ? await askSemantic(shelf, receipt, matrix, {
        semanticMatcher: options.semanticMatcher,
        autoThreshold,
        semanticTopK: options.semanticTopK ?? 3,
        floor: minThreshold * 0.5,
      })
    : new Map<string, SemanticMatchPair>();

  const pairs: ScoredPair[] = [];
  shelf.forEach((s, i) =>
    receipt.forEach((r, j) => {
      const { score, semantic } = combineScores(matrix[i]?.[j] ?? 0, verdicts.get(pairKey(s.id, r.id)));
      if (score >= minThreshold) pairs.push({ shelfIndex: i, receiptIndex: j, score, method: semantic ? 'semantic' : 'lexical' });
    }),
  );
  pairs.sort((a, b) => b.score - a.score);

  const usedShelf = new Set<number>();
  const usedReceipt = new Set<number>();
  const matches: ProductMatch<S, R>[] = [];
  for (const pair of pairs) {
    if (usedShelf.has(pair.shelfIndex) || usedReceipt.has(pair.receiptIndex)) continue;
    const shelfProduct = shelf[pair.shelfIndex];
    const receiptProduct = receipt[pair.receiptIndex];
    if (!shelfProduct || !receiptProduct) continue;
    usedShelf.add(pair.shelfIndex);
    usedReceipt.add(pair.receiptIndex);
    const confidence = Math.round(pair.score * 100) / 100;
    matches.push({
      matched: true,
      confidence,
      needsConfirmation: confidence < autoThreshold,
      method: pair.method,
      shelfProduct,
      receiptProduct,
    });
  }

  return {
    matches,
    unmatchedShelf: shelf.filter((_, i) => !usedShelf.has(i)),
    unmatchedReceipt: receipt.filter((_, j) => !usedReceipt.has(j)),
  };
}
