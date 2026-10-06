import { expectedLineTotal, expectedShoppingTotal } from '@/services/pricing/pricing';
import { shelfItem } from './fixtures';

import { bestMarket, computePriceStats, dailySeries } from '@/services/pricing/priceStats';

describe('expectedLineTotal', () => {
  it('multiplica preço por quantidade', () => {
    expect(expectedLineTotal(shelfItem({ shelfPrice: 7.49 }), 3)).toBe(22.47);
  });

  it('usa o preço promocional de/por', () => {
    expect(expectedLineTotal(shelfItem({ shelfPrice: 11.99, promoPrice: 9.99, promo: { type: 'sale' } }), 2)).toBe(19.98);
  });

  it('aplica leve 3 pague 2', () => {
    const item = shelfItem({ shelfPrice: 5, promo: { type: 'multibuy', buyQuantity: 3, payQuantity: 2 } });
    expect(expectedLineTotal(item, 3)).toBe(10);
    expect(expectedLineTotal(item, 4)).toBe(15);
    expect(expectedLineTotal(item, 2)).toBe(10);
  });

  it('aplica desconto na segunda unidade', () => {
    const item = shelfItem({ shelfPrice: 10, promo: { type: 'nth_unit_discount', nthUnit: 2, discountPercent: 50 } });
    expect(expectedLineTotal(item, 1)).toBe(10);
    expect(expectedLineTotal(item, 2)).toBe(15);
    expect(expectedLineTotal(item, 3)).toBe(25);
  });

  it('aplica preço a partir de quantidade mínima', () => {
    const item = shelfItem({ shelfPrice: 4, promoPrice: 3, promo: { type: 'min_quantity', buyQuantity: 3 } });
    expect(expectedLineTotal(item, 2)).toBe(8);
    expect(expectedLineTotal(item, 3)).toBe(9);
  });

  it('calcula produto pesável por kg', () => {
    expect(expectedLineTotal(shelfItem({ shelfPrice: 39.9, priceUnit: 'kg' }), 0.452)).toBe(18.03);
  });

  it('soma o total da compra', () => {
    expect(expectedShoppingTotal([shelfItem({ shelfPrice: 24.9 }), shelfItem({ shelfPrice: 7.49, quantity: 2 })])).toBe(39.88);
  });
});

describe('priceStats', () => {
  const point = (observedAt: string, price: number) => ({ productId: 'p', marketId: null, marketName: 'M', price, source: 'shelf' as const, observedAt });
  const points = [point('2026-09-20T10:00:00Z', 10.99), point('2026-09-29T10:00:00Z', 10.49), point('2026-10-06T10:00:00Z', 9.99)];

  it('calcula atual, média, menor e maior', () => {
    expect(computePriceStats(points)).toEqual({ current: 9.99, average: 10.49, min: 9.99, max: 10.99, vsAverage: -0.5 });
    expect(computePriceStats([])).toBeNull();
  });

  it('agrupa por dia', () => {
    expect(dailySeries([...points, point('2026-10-06T18:00:00Z', 9.49)])).toHaveLength(3);
  });

  it('acha o mercado mais barato', () => {
    expect(bestMarket([{ name: 'A', price: 9.99 }, { name: 'B', price: 8.49 }, { name: 'C', price: 10.99 }])?.name).toBe('B');
  });
});
