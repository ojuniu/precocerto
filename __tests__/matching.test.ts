import { matchProducts, scorePair, extractSize } from '@/services/productMatching';

const shelf = (id: string, name: string, extra: Partial<{ brand: string; sizeValue: number; sizeUnit: string; unitPrice: number }> = {}) => ({
  id,
  name,
  brand: extra.brand ?? null,
  sizeValue: extra.sizeValue ?? null,
  sizeUnit: extra.sizeUnit ?? null,
  unitPrice: extra.unitPrice ?? 10,
});
const receipt = (id: string, name: string, unitPrice = 10) => ({ id, name, unitPrice });

describe('extractSize', () => {
  it('converte litros e quilos', () => {
    expect(extractSize('COCA COLA PET 2L')).toEqual({ value: 2000, base: 'ml' });
    expect(extractSize('Arroz Tipo 1 5kg')).toEqual({ value: 5000, base: 'g' });
    expect(extractSize('LEITE UHT 1LT')).toEqual({ value: 1000, base: 'ml' });
  });
});

describe('scorePair', () => {
  it('reconhece nomes abreviados do cupom', () => {
    const score = scorePair(shelf('a', 'Coca-Cola Original', { brand: 'Coca-Cola', sizeValue: 2, sizeUnit: 'l', unitPrice: 9.99 }), receipt('r', 'COCA COLA PET 2L', 11.49));
    expect(score).toBeGreaterThan(0.82);
  });

  it('penaliza tamanhos diferentes', () => {
    const same = scorePair(shelf('a', 'Coca-Cola Original', { sizeValue: 2, sizeUnit: 'l' }), receipt('r', 'COCA COLA PET 2L'));
    const different = scorePair(shelf('a', 'Coca-Cola Original', { sizeValue: 2, sizeUnit: 'l' }), receipt('r', 'COCA COLA LATA 350ML'));
    expect(different).toBeLessThan(same * 0.6);
  });

  it('expande abreviações comuns', () => {
    expect(scorePair(shelf('a', 'Leite Integral', { sizeValue: 1, sizeUnit: 'l', unitPrice: 5.79 }), receipt('r', 'LTE INT ITALAC 1L', 7.29))).toBeGreaterThan(0.6);
  });

  it('não confunde produtos diferentes', () => {
    expect(scorePair(shelf('a', 'Arroz Tipo 1', { sizeValue: 5, sizeUnit: 'kg' }), receipt('r', 'FEIJAO CARIOCA 1KG'))).toBeLessThan(0.45);
  });
});

describe('matchProducts', () => {
  const shelfItems = [
    shelf('coca', 'Coca-Cola Original', { brand: 'Coca-Cola', sizeValue: 2, sizeUnit: 'l', unitPrice: 9.99 }),
    shelf('arroz', 'Arroz Tipo 1', { brand: 'Tio João', sizeValue: 5, sizeUnit: 'kg', unitPrice: 24.9 }),
    shelf('feijao', 'Feijão Carioca', { brand: 'Camil', sizeValue: 1, sizeUnit: 'kg', unitPrice: 7.49 }),
    shelf('sabao', 'Sabão em pó', { brand: 'Omo', sizeValue: 1.6, sizeUnit: 'kg', unitPrice: 29.9 }),
  ];
  const receiptItems = [
    receipt('r1', 'ARROZ T JOAO T1 5KG', 24.9),
    receipt('r2', 'FEIJ CARIOCA CAMIL 1KG', 7.49),
    receipt('r3', 'REFRIG COCA COLA PET 2L', 11.49),
    receipt('r4', 'PAO FRANCES KG', 12.9),
  ];

  it('faz correspondência 1:1 e separa itens sem par', async () => {
    const result = await matchProducts(shelfItems, receiptItems);
    const pairs = Object.fromEntries(result.matches.map((m) => [m.shelfProduct.id, m.receiptProduct.id]));
    expect(pairs).toEqual({ coca: 'r3', arroz: 'r1', feijao: 'r2' });
    expect(result.unmatchedShelf.map((s) => s.id)).toEqual(['sabao']);
    expect(result.unmatchedReceipt.map((r) => r.id)).toEqual(['r4']);
  });

  it('marca correspondências duvidosas para confirmação', async () => {
    const result = await matchProducts([shelf('x', 'Biscoito Recheado Chocolate', { unitPrice: 3.5 })], [receipt('y', 'BISC MARILAN 140G', 3.5)]);
    const [first] = result.matches;
    if (first) expect(first.needsConfirmation).toBe(true);
  });

  it('usa o desempate semântico quando disponível', async () => {
    const result = await matchProducts(
      [shelf('x', 'Guaraná Antarctica', { sizeValue: 2, sizeUnit: 'l', unitPrice: 8.99 })],
      [receipt('y', 'REFRIG GUAR ANTARC 2L', 8.99)],
      { semanticMatcher: async (pairs) => pairs.map((p) => ({ shelfId: p.shelf.id, receiptId: p.receipt.id, sameProduct: true, confidence: 0.97 })) },
    );
    expect(result.matches[0]?.receiptProduct.id).toBe('y');
    expect(result.matches[0]?.needsConfirmation).toBe(false);
  });

  it('continua funcionando se o desempate semântico falhar', async () => {
    const result = await matchProducts(shelfItems, receiptItems, {
      semanticMatcher: async () => {
        throw new Error('offline');
      },
    });
    expect(result.matches).toHaveLength(3);
  });
});
