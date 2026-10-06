import type {
  BoundingBox,
  FieldConfidence,
  PriceTagReading,
  ReceiptLineReading,
  ReceiptReading,
  SemanticMatchPair,
  ShelfReading,
  ShelfTagReading,
} from '@/types/ai';
import type { PriceUnit, PromoRule, PromoType, SizeUnit } from '@/types/domain';
import { parseMoney } from '@/utils/money';

/**
 * Validação defensiva das respostas da IA. Nada que vem do provedor é confiado sem passar por aqui:
 * campos ausentes viram null, números inválidos são descartados e a confiança é limitada a 0..1.
 */

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

function str(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function num(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') return parseMoney(v);
  return null;
}

function positiveMoney(v: unknown): number | null {
  const value = num(v);
  return value !== null && value > 0 ? value : null;
}

function confidence(v: unknown, fallback = 0): number {
  const value = num(v);
  if (value === null) return fallback;
  const scaled = value > 1 ? value / 100 : value;
  return Math.max(0, Math.min(1, scaled));
}

const SIZE_UNITS: Record<string, SizeUnit> = {
  g: 'g', gr: 'g', grs: 'g', gramas: 'g', kg: 'kg', ml: 'ml', l: 'l', lt: 'l', litro: 'l', litros: 'l',
  un: 'un', und: 'un', unid: 'un', unidades: 'un', m: 'm', metros: 'm',
};

function sizeUnit(v: unknown): SizeUnit | null {
  const key = str(v)?.toLowerCase();
  return key ? SIZE_UNITS[key] ?? null : null;
}

function priceUnit(v: unknown): PriceUnit {
  const key = str(v)?.toLowerCase();
  if (key === 'kg' || key === 'quilo') return 'kg';
  if (key === 'l' || key === 'lt' || key === 'litro') return 'l';
  return 'un';
}

const PROMO_TYPES: PromoType[] = ['none', 'sale', 'multibuy', 'nth_unit_discount', 'min_quantity'];

function promoRule(v: unknown): PromoRule {
  if (!isObject(v)) return { type: 'none' };
  const type = PROMO_TYPES.find((t) => t === v.type) ?? 'none';
  return {
    type,
    buyQuantity: num(v.buyQuantity),
    payQuantity: num(v.payQuantity),
    nthUnit: num(v.nthUnit),
    discountPercent: num(v.discountPercent),
  };
}

function fieldConfidence(v: unknown, overall: number): FieldConfidence {
  const source = isObject(v) ? v : {};
  return {
    name: confidence(source.name, overall),
    price: confidence(source.price, overall),
    size: confidence(source.size, overall),
    brand: confidence(source.brand, overall),
  };
}

export function parsePriceTag(raw: unknown): PriceTagReading {
  const v = isObject(raw) ? raw : {};
  const overall = confidence(v.confidence);
  let regularPrice = positiveMoney(v.regularPrice);
  let promoPrice = positiveMoney(v.promoPrice);
  // "De R$ 11,99 por R$ 9,99": garante que o promocional seja o menor.
  if (regularPrice !== null && promoPrice !== null && promoPrice > regularPrice) {
    [regularPrice, promoPrice] = [promoPrice, regularPrice];
  }
  if (regularPrice === null && promoPrice !== null) {
    regularPrice = promoPrice;
    promoPrice = null;
  }
  if (promoPrice !== null && promoPrice === regularPrice) promoPrice = null;
  let promo = promoRule(v.promo);
  if (promo.type === 'none' && promoPrice !== null) promo = { type: 'sale' };

  return {
    productName: str(v.productName),
    brand: str(v.brand),
    description: str(v.description),
    sizeValue: positiveMoney(v.sizeValue),
    sizeUnit: sizeUnit(v.sizeUnit),
    priceUnit: priceUnit(v.priceUnit),
    regularPrice,
    promoPrice,
    promo,
    priceLegible: v.priceLegible !== false && regularPrice !== null,
    fieldConfidence: fieldConfidence(v.fieldConfidence, overall),
    confidence: overall,
  };
}

function bbox(v: unknown): BoundingBox | null {
  if (!Array.isArray(v) || v.length !== 4) return null;
  const values = v.map((n) => num(n));
  if (values.some((n) => n === null)) return null;
  const [x, y, w, h] = values.map((n) => Math.max(0, Math.min(1, n as number)));
  return [x ?? 0, y ?? 0, w ?? 0, h ?? 0];
}

export function parseShelf(raw: unknown): ShelfReading {
  const v = isObject(raw) ? raw : {};
  const tags = Array.isArray(v.tags) ? v.tags : [];
  return {
    tags: tags.map((tag): ShelfTagReading => ({ ...parsePriceTag(tag), bbox: bbox(isObject(tag) ? tag.bbox : null) })),
  };
}

function receiptLine(raw: unknown): ReceiptLineReading | null {
  if (!isObject(raw)) return null;
  const description = str(raw.description);
  if (!description) return null;
  const quantity = num(raw.quantity);
  return {
    lineNumber: num(raw.lineNumber),
    code: str(raw.code),
    description,
    quantity: quantity !== null && quantity > 0 ? quantity : 1,
    unit: priceUnit(raw.unit),
    unitPrice: positiveMoney(raw.unitPrice),
    totalPrice: positiveMoney(raw.totalPrice),
    discount: Math.abs(num(raw.discount) ?? 0),
  };
}

export function parseReceipt(raw: unknown): ReceiptReading {
  const v = isObject(raw) ? raw : {};
  const items = Array.isArray(v.items) ? v.items : [];
  return {
    marketName: str(v.marketName),
    issuedAt: str(v.issuedAt),
    items: items.map(receiptLine).filter((l): l is ReceiptLineReading => l !== null),
    subtotal: positiveMoney(v.subtotal),
    discountTotal: num(v.discountTotal),
    total: positiveMoney(v.total),
    confidence: confidence(v.confidence),
  };
}

export function parseMatchPairs(raw: unknown): SemanticMatchPair[] {
  const v = isObject(raw) ? raw : {};
  const pairs = Array.isArray(v.pairs) ? v.pairs : [];
  return pairs.flatMap((p): SemanticMatchPair[] => {
    if (!isObject(p)) return [];
    const shelfId = str(p.shelfId);
    const receiptId = str(p.receiptId);
    if (!shelfId || !receiptId) return [];
    return [{ shelfId, receiptId, sameProduct: p.sameProduct === true, confidence: confidence(p.confidence) }];
  });
}
