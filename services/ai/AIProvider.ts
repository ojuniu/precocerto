import type {
  ImagePayload,
  MatchCandidateInput,
  PriceTagReading,
  ReceiptReading,
  SemanticMatchPair,
  ShelfReading,
} from '@/types/ai';

/**
 * Contrato único de IA/visão do app. Telas e stores nunca falam com um fornecedor diretamente.
 * Implementações: SupabaseEdgeAIProvider (padrão, chaves no backend), ou qualquer outra.
 */
export interface AIProvider {
  readonly id: string;
  readPriceTag(image: ImagePayload): Promise<PriceTagReading>;
  readShelf(image: ImagePayload): Promise<ShelfReading>;
  readReceipt(image: ImagePayload): Promise<ReceiptReading>;
  compareProductNames(
    pairs: { shelf: MatchCandidateInput; receipt: MatchCandidateInput }[],
  ): Promise<SemanticMatchPair[]>;
}
