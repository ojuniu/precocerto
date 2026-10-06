import type { PricePoint } from '@/types/domain';
import { roundMoney } from '@/utils/money';

export interface PriceStats {
  current: number;
  average: number;
  min: number;
  max: number;
  /** Variação do preço atual em relação à média (positivo = mais caro que a média). */
  vsAverage: number;
}

export function computePriceStats(points: PricePoint[]): PriceStats | null {
  if (points.length === 0) return null;
  const sorted = [...points].sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  const prices = sorted.map((p) => p.price);
  const current = prices[prices.length - 1] ?? 0;
  const average = roundMoney(prices.reduce((s, p) => s + p, 0) / prices.length);
  return {
    current,
    average,
    min: Math.min(...prices),
    max: Math.max(...prices),
    vsAverage: roundMoney(current - average),
  };
}

/** Um ponto por dia (o último do dia), para o gráfico não ficar poluído. */
export function dailySeries(points: PricePoint[]): { date: string; value: number }[] {
  const byDay = new Map<string, { date: string; value: number }>();
  [...points]
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt))
    .forEach((p) => byDay.set(p.observedAt.slice(0, 10), { date: p.observedAt, value: p.price }));
  return Array.from(byDay.values());
}

export function bestMarket<T extends { price: number }>(prices: T[]): T | null {
  return prices.reduce<T | null>((best, p) => (best === null || p.price < best.price ? p : best), null);
}
