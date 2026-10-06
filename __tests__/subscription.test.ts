import { activePlanId, canAddProducts, hasFeature, remainingProducts } from '@/services/subscription';
import { formatBRL, formatSignedBRL, parseMoney } from '@/utils/money';

describe('subscription', () => {
  const free = { planId: 'free' as const, status: 'active' as const, currentPeriodEnd: null };
  const premium = { planId: 'premium' as const, status: 'active' as const, currentPeriodEnd: '2999-01-01T00:00:00Z' };

  it('limita produtos no plano gratuito', () => {
    expect(remainingProducts(free, { productsThisMonth: 75 })).toBe(5);
    expect(canAddProducts(free, { productsThisMonth: 80 })).toBe(false);
    expect(canAddProducts(premium, { productsThisMonth: 10_000 })).toBe(true);
  });

  it('libera recursos premium', () => {
    expect(hasFeature(free, 'batch_reading')).toBe(false);
    expect(hasFeature(premium, 'batch_reading')).toBe(true);
  });

  it('volta para o gratuito quando a assinatura expira', () => {
    expect(activePlanId({ ...premium, currentPeriodEnd: '2020-01-01T00:00:00Z' })).toBe('free');
  });
});

describe('money', () => {
  it('formata em reais', () => {
    expect(formatBRL(1234.5)).toBe('R$ 1.234,50');
    expect(formatSignedBRL(1.5)).toBe('+ R$ 1,50');
    expect(formatSignedBRL(-0.3)).toBe('- R$ 0,30');
  });

  it('lê valores brasileiros', () => {
    expect(parseMoney('R$ 1.234,56')).toBe(1234.56);
    expect(parseMoney('9,99')).toBe(9.99);
    expect(parseMoney('9.99')).toBe(9.99);
    expect(parseMoney('abc')).toBeNull();
  });
});
