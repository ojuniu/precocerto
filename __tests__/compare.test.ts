import { summarizeCheckout } from '@/services/comparison/checkout';
import { compareShopping } from '@/services/comparison/compare';
import { match, receiptItem, shelfItem } from './fixtures';

describe('compareShopping', () => {
  it('detecta divergência e calcula impacto', () => {
    const coca = shelfItem({ name: 'Coca-Cola 2L', shelfPrice: 9.99 });
    const arroz = shelfItem({ name: 'Arroz 5kg', shelfPrice: 24.9 });
    const rCoca = receiptItem({ productName: 'COCA COLA PET 2L', unitPrice: 11.49, totalPrice: 11.49 });
    const rArroz = receiptItem({ productName: 'ARROZ 5KG', unitPrice: 24.9, totalPrice: 24.9 });
    const summary = compareShopping([coca, arroz], [rCoca, rArroz], [match(coca, rCoca), match(arroz, rArroz)]);

    expect(summary.divergenceCount).toBe(1);
    expect(summary.difference).toBe(1.5);
    expect(summary.lines[0]?.status).toBe('overcharged');
    expect(summary.lines[0]?.difference).toBe(1.5);
    expect(summary.lines.find((l) => l.name === 'Arroz 5kg')?.status).toBe('ok');
  });

  it('usa a quantidade do cupom e as regras de promoção', () => {
    const item = shelfItem({ shelfPrice: 5, promo: { type: 'multibuy', buyQuantity: 3, payQuantity: 2 } });
    const charged = receiptItem({ quantity: 3, unitPrice: 5, totalPrice: 15 });
    const summary = compareShopping([item], [charged], [match(item, charged)]);
    expect(summary.lines[0]?.expectedTotal).toBe(10);
    expect(summary.lines[0]?.difference).toBe(5);
    expect(summary.lines[0]?.status).toBe('overcharged');
  });

  it('compara produtos pesáveis pelo peso do cupom', () => {
    const item = shelfItem({ shelfPrice: 39.9, priceUnit: 'kg' });
    const charged = receiptItem({ quantity: 0.452, unit: 'kg', unitPrice: 39.9, totalPrice: 18.03 });
    const summary = compareShopping([item], [charged], [match(item, charged)]);
    expect(summary.lines[0]?.status).toBe('ok');
  });

  it('marca cobrança menor como favorável', () => {
    const item = shelfItem({ shelfPrice: 10 });
    const charged = receiptItem({ totalPrice: 9 });
    expect(compareShopping([item], [charged], [match(item, charged)]).lines[0]?.status).toBe('undercharged');
  });

  it('não conta divergência em correspondência pendente', () => {
    const item = shelfItem({ shelfPrice: 10 });
    const charged = receiptItem({ totalPrice: 12 });
    const summary = compareShopping([item], [charged], [match(item, charged, { status: 'pending' })]);
    expect(summary.divergenceCount).toBe(0);
    expect(summary.pendingCount).toBe(1);
  });

  it('lista itens sem correspondência dos dois lados', () => {
    const item = shelfItem();
    const other = receiptItem({ totalPrice: 4.5 });
    const summary = compareShopping([item], [other], []);
    expect(summary.notInReceiptCount).toBe(1);
    expect(summary.notPhotographedCount).toBe(1);
    expect(summary.notPhotographedTotal).toBe(4.5);
  });
});


describe('summarizeCheckout', () => {
  it('soma o que passou e o impacto dos preços errados', () => {
    const coca = shelfItem({ shelfPrice: 9.99, checkoutStatus: 'wrong', checkoutChargedPrice: 11.49 });
    const leite = shelfItem({ shelfPrice: 5.79, quantity: 2, checkoutStatus: 'passed' });
    const arroz = shelfItem({ shelfPrice: 24.9 });
    const summary = summarizeCheckout([coca, leite, arroz]);
    expect(summary.expectedTotal).toBe(46.47);
    expect(summary.difference).toBe(1.5);
    expect(summary.chargedTotal).toBe(47.97);
    expect(summary.passedCount).toBe(2);
    expect(summary.wrongCount).toBe(1);
    expect(summary.pendingCount).toBe(1);
  });
});
