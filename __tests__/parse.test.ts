import { parsePriceTag, parseReceipt, parseShelf } from '@/services/ai/parse';
import { assessPriceTag } from '@/services/ocr/readingQuality';

describe('parsePriceTag', () => {
  it('normaliza preços em texto e promoção de/por', () => {
    const reading = parsePriceTag({
      productName: 'Coca-Cola Original',
      brand: 'Coca-Cola',
      sizeValue: 2,
      sizeUnit: 'L',
      regularPrice: '9,99',
      promoPrice: 11.99,
      confidence: 0.93,
    });
    expect(reading.regularPrice).toBe(11.99);
    expect(reading.promoPrice).toBe(9.99);
    expect(reading.promo.type).toBe('sale');
    expect(reading.sizeUnit).toBe('l');
  });

  it('sinaliza leitura sem preço para confirmação manual', () => {
    const reading = parsePriceTag({ productName: 'Arroz', regularPrice: null, priceLegible: false, confidence: 0.9 });
    const quality = assessPriceTag(reading);
    expect(quality.lowConfidence).toBe(true);
    expect(quality.missingFields).toContain('price');
  });

  it('aceita lixo sem quebrar', () => {
    const reading = parsePriceTag('não é json');
    expect(reading.productName).toBeNull();
    expect(reading.confidence).toBe(0);
  });

  it('converte confiança em porcentagem', () => {
    expect(parsePriceTag({ confidence: 87 }).confidence).toBeCloseTo(0.87);
  });
});

describe('parseShelf', () => {
  it('lê várias etiquetas com bbox', () => {
    const shelf = parseShelf({ tags: [{ productName: 'A', regularPrice: 1, bbox: [0.1, 0.2, 0.3, 0.4] }, { productName: 'B', regularPrice: 2 }] });
    expect(shelf.tags).toHaveLength(2);
    expect(shelf.tags[0]?.bbox).toEqual([0.1, 0.2, 0.3, 0.4]);
    expect(shelf.tags[1]?.bbox).toBeNull();
  });
});

describe('parseReceipt', () => {
  it('ignora itens sem descrição', () => {
    const receipt = parseReceipt({ items: [{ description: '' }, { description: 'LEITE', quantity: '2', totalPrice: '11,58' }], total: '11,58' });
    expect(receipt.items).toHaveLength(1);
    expect(receipt.items[0]?.quantity).toBe(2);
    expect(receipt.total).toBe(11.58);
  });
});
