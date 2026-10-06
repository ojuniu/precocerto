import type { PriceUnit, PromoRule, SizeUnit } from './domain';

/**
 * Contratos normalizados entre o app e qualquer provedor de IA/OCR.
 * Todo provedor (Gemini, OpenAI, OCR próprio...) precisa devolver exatamente estes formatos.
 */

export type VisionTask = 'price_tag' | 'shelf' | 'receipt';

export interface FieldConfidence {
  name: number;
  price: number;
  size: number;
  brand: number;
}

export interface PriceTagReading {
  productName: string | null;
  brand: string | null;
  description: string | null;
  sizeValue: number | null;
  sizeUnit: SizeUnit | null;
  priceUnit: PriceUnit;
  /** Preço normal (ou o único preço da etiqueta). */
  regularPrice: number | null;
  /** Preço promocional, quando a etiqueta mostra "de/por" ou oferta. */
  promoPrice: number | null;
  promo: PromoRule;
  priceLegible: boolean;
  fieldConfidence: FieldConfidence;
  confidence: number;
}

/** bbox normalizada [x, y, largura, altura] entre 0 e 1. */
export type BoundingBox = [number, number, number, number];

export interface ShelfTagReading extends PriceTagReading {
  bbox: BoundingBox | null;
}

export interface ShelfReading {
  tags: ShelfTagReading[];
}

export interface ReceiptLineReading {
  lineNumber: number | null;
  code: string | null;
  description: string;
  quantity: number;
  unit: PriceUnit;
  unitPrice: number | null;
  totalPrice: number | null;
  discount: number;
}

export interface ReceiptReading {
  marketName: string | null;
  issuedAt: string | null;
  items: ReceiptLineReading[];
  subtotal: number | null;
  discountTotal: number | null;
  total: number | null;
  confidence: number;
}

export interface MatchCandidateInput {
  id: string;
  name: string;
}

export interface SemanticMatchPair {
  shelfId: string;
  receiptId: string;
  sameProduct: boolean;
  confidence: number;
}

export interface ImagePayload {
  base64: string;
  mimeType: 'image/jpeg' | 'image/png';
}
