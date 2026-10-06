import { normalizeReceipt } from '@/services/receipt/normalizeReceipt';
import type { ReceiptReading } from '@/types/ai';

const reading = (overrides: Partial<ReceiptReading> = {}): ReceiptReading => ({
  marketName: 'Supermercado BH',
  issuedAt: '06/10/2026',
  items: [],
  subtotal: null,
  discountTotal: null,
  total: null,
  confidence: 0.9,
  ...overrides,
});

describe('normalizeReceipt', () => {
  it('completa preço unitário a partir do total', () => {
    const result = normalizeReceipt(
      reading({ items: [{ lineNumber: 1, code: null, description: 'LEITE 1L', quantity: 3, unit: 'un', unitPrice: null, totalPrice: 17.37, discount: 0 }], total: 17.37 }),
    );
    expect(result.lines[0]?.unitPrice).toBe(5.79);
    expect(result.consistency.consistent).toBe(true);
  });

  it('agrupa linhas repetidas do mesmo produto', () => {
    const line = { lineNumber: 1, code: '789', description: 'COCA COLA 2L', quantity: 1, unit: 'un' as const, unitPrice: 9.99, totalPrice: 9.99, discount: 0 };
    const result = normalizeReceipt(reading({ items: [line, { ...line, lineNumber: 4 }], total: 19.98 }));
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]?.quantity).toBe(2);
    expect(result.lines[0]?.totalPrice).toBe(19.98);
  });

  it('aplica desconto do item ao valor pago', () => {
    const result = normalizeReceipt(
      reading({ items: [{ lineNumber: 1, code: null, description: 'SABAO OMO', quantity: 1, unit: 'un', unitPrice: 29.9, totalPrice: 29.9, discount: 5 }], total: 24.9 }),
    );
    expect(result.lines[0]?.totalPrice).toBe(24.9);
    expect(result.consistency.consistent).toBe(true);
  });

  it('avisa quando a soma não bate com o total', () => {
    const result = normalizeReceipt(
      reading({ items: [{ lineNumber: 1, code: null, description: 'ARROZ', quantity: 1, unit: 'un', unitPrice: 24.9, totalPrice: 24.9, discount: 0 }], total: 40 }),
    );
    expect(result.consistency.consistent).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('descarta linhas sem nenhum valor', () => {
    const result = normalizeReceipt(
      reading({ items: [{ lineNumber: 1, code: null, description: 'ILEGIVEL', quantity: 1, unit: 'un', unitPrice: null, totalPrice: null, discount: 0 }] }),
    );
    expect(result.lines).toHaveLength(0);
  });
});
