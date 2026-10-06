import { normalizeText } from '@/utils/text';

/**
 * Abreviações comuns em cupons fiscais brasileiros (NFC-e / SAT).
 * A chave é a forma abreviada já normalizada.
 */
const ABBREVIATIONS: Record<string, string> = {
  refrig: 'refrigerante',
  refri: 'refrigerante',
  ref: 'refrigerante',
  lte: 'leite',
  lt: 'lata',
  pct: 'pacote',
  pc: 'pacote',
  cx: 'caixa',
  gf: 'garrafa',
  grf: 'garrafa',
  arr: 'arroz',
  feij: 'feijao',
  fj: 'feijao',
  mac: 'macarrao',
  macarr: 'macarrao',
  cerv: 'cerveja',
  az: 'azeite',
  ol: 'oleo',
  marg: 'margarina',
  qjo: 'queijo',
  qj: 'queijo',
  pres: 'presunto',
  iog: 'iogurte',
  choc: 'chocolate',
  achoc: 'achocolatado',
  bisc: 'biscoito',
  bis: 'biscoito',
  sab: 'sabonete',
  det: 'detergente',
  desinf: 'desinfetante',
  amac: 'amaciante',
  pap: 'papel',
  hig: 'higienico',
  cafe: 'cafe',
  acuc: 'acucar',
  acu: 'acucar',
  cr: 'creme',
  frg: 'frango',
  fgo: 'frango',
  carn: 'carne',
  bov: 'bovina',
  sui: 'suina',
  int: 'integral',
  desn: 'desnatado',
  semid: 'semidesnatado',
  trad: 'tradicional',
  orig: 'original',
  nat: 'natural',
  temp: 'tempero',
  molh: 'molho',
  tom: 'tomate',
  ext: 'extrato',
  farin: 'farinha',
  far: 'farinha',
  trig: 'trigo',
  sal: 'sal',
  agua: 'agua',
  min: 'mineral',
  s: 'sem',
  c: 'com',
  zero: 'zero',
  light: 'light',
};

/** Palavras que aparecem muito e pouco ajudam a diferenciar produtos. */
const STOPWORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'com', 'sem', 'tipo', 'un', 'und', 'unid', 'pet', 'garrafa',
  'pacote', 'caixa', 'lata', 'embalagem', 'emb', 'kg', 'g', 'gr', 'ml', 'l', 'lt', 'litro', 'litros',
]);

export interface ParsedSize {
  /** Valor convertido para unidade base (g, ml ou un). */
  value: number;
  base: 'g' | 'ml' | 'un';
}

const SIZE_PATTERN = /(\d+(?:\.\d+)?)\s*(kg|g|gr|grs|mg|ml|l|lt|lts|litros?|un|und|unid|x)\b/g;

export function extractSize(text: string): ParsedSize | null {
  const normalized = normalizeText(text);
  let match: RegExpExecArray | null;
  let found: ParsedSize | null = null;
  SIZE_PATTERN.lastIndex = 0;
  while ((match = SIZE_PATTERN.exec(normalized)) !== null) {
    const value = Number(match[1]);
    const unit = match[2] ?? '';
    if (!Number.isFinite(value) || value <= 0) continue;
    if (unit === 'kg') found = { value: value * 1000, base: 'g' };
    else if (unit === 'g' || unit === 'gr' || unit === 'grs') found = { value, base: 'g' };
    else if (unit === 'mg') found = { value: value / 1000, base: 'g' };
    else if (unit === 'ml') found = { value, base: 'ml' };
    else if (unit.startsWith('l')) found = { value: value * 1000, base: 'ml' };
    else if (!found) found = { value, base: 'un' };
  }
  return found;
}

export function sizeFromParts(value: number | null, unit: string | null): ParsedSize | null {
  if (value === null || unit === null) return null;
  return extractSize(`${value}${unit}`);
}

/** Tokens significativos, com abreviações expandidas e sem medidas. */
export function tokenize(text: string): string[] {
  const withoutSizes = normalizeText(text).replace(SIZE_PATTERN, ' ');
  return withoutSizes
    .split(/[\s.]+/)
    .filter(Boolean)
    .map((token) => ABBREVIATIONS[token] ?? token)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token) && !/^\d+$/.test(token));
}
