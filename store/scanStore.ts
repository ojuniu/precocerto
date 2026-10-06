import { create } from 'zustand';
import type { PriceTagScan, ShelfScan } from '@/services/ocr/ocrService';

/** Resultado da última leitura, entregue da tela de câmera para a tela de confirmação. */
interface ScanState {
  priceTag: PriceTagScan | null;
  shelf: ShelfScan | null;
  setPriceTag: (scan: PriceTagScan) => void;
  setShelf: (scan: ShelfScan) => void;
  clear: () => void;
}

export const useScanStore = create<ScanState>((set) => ({
  priceTag: null,
  shelf: null,
  setPriceTag: (priceTag) => set({ priceTag, shelf: null }),
  setShelf: (shelf) => set({ shelf, priceTag: null }),
  clear: () => set({ priceTag: null, shelf: null }),
}));
