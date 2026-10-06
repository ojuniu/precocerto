/** Arredonda para centavos evitando erros de ponto flutuante. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'R$ --';
  const negative = value < 0;
  const [intPart, decPart] = Math.abs(roundMoney(value)).toFixed(2).split('.');
  const withThousands = (intPart ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}R$ ${withThousands},${decPart ?? '00'}`;
}

/** "+ R$ 1,50" / "- R$ 0,30" / "R$ 0,00" */
export function formatSignedBRL(value: number): string {
  const rounded = roundMoney(value);
  if (rounded === 0) return formatBRL(0);
  return `${rounded > 0 ? '+' : '-'} ${formatBRL(Math.abs(rounded))}`;
}

/** Converte "9,99", "R$ 1.234,56", "9.99" em número. Retorna null se inválido. */
export function parseMoney(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? roundMoney(input) : null;
  const cleaned = input.replace(/[^\d,.-]/g, '');
  if (!cleaned) return null;
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized: string;
  if (lastComma > lastDot) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma && lastComma !== -1) {
    normalized = cleaned.replace(/,/g, '');
  } else {
    normalized = cleaned.replace(',', '.');
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? roundMoney(value) : null;
}

export function parseQuantity(input: string): number | null {
  const value = Number(input.replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, '').replace('.', ',');
}
