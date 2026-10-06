import { create } from 'zustand';
import { listShoppings } from '@/services/data/shoppingRepository';
import type { Shopping } from '@/types/domain';
import { toUserMessage } from '@/utils/errors';

interface HistoryState {
  shoppings: Shopping[];
  loading: boolean;
  error: string | null;
  loaded: boolean;
  refresh: (historyDays?: number | null) => Promise<void>;
  upsert: (shopping: Shopping) => void;
  removeLocal: (id: string) => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  shoppings: [],
  loading: false,
  error: null,
  loaded: false,

  refresh: async (historyDays) => {
    set({ loading: true, error: null });
    try {
      const sinceISO = historyDays ? new Date(Date.now() - historyDays * 86_400_000).toISOString() : null;
      const shoppings = await listShoppings({ sinceISO, limit: 100 });
      set({ shoppings, loading: false, loaded: true });
    } catch (error) {
      set({ loading: false, error: toUserMessage(error), loaded: true });
    }
  },

  upsert: (shopping) => {
    const others = get().shoppings.filter((s) => s.id !== shopping.id);
    set({ shoppings: [shopping, ...others].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
  },

  removeLocal: (id) => set({ shoppings: get().shoppings.filter((s) => s.id !== id) }),
}));
