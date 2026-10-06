import { create } from 'zustand';
import { getShopping } from '@/services/data/shoppingRepository';
import { addItem, addItems, editItem, refreshTotals, removeItem, type AddItemResult } from '@/services/shopping/shoppingService';
import { listItems } from '@/services/data/itemRepository';
import type { ItemDraft } from '@/services/shopping/itemDraft';
import type { ImagePayload } from '@/types/ai';
import type { Shopping, ShoppingItem } from '@/types/domain';
import { toUserMessage } from '@/utils/errors';

interface ShoppingState {
  shopping: Shopping | null;
  items: ShoppingItem[];
  loading: boolean;
  error: string | null;
  load: (shoppingId: string) => Promise<void>;
  setShopping: (shopping: Shopping) => void;
  addFromDraft: (draft: ItemDraft, image?: ImagePayload, rawReading?: unknown) => Promise<AddItemResult>;
  addBatch: (drafts: ItemDraft[], image?: ImagePayload) => Promise<number>;
  update: (itemId: string, draft: ItemDraft) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
}

function requireShopping(shopping: Shopping | null): Shopping {
  if (!shopping) throw new Error('Nenhuma compra aberta.');
  return shopping;
}

export const useShoppingStore = create<ShoppingState>((set, get) => ({
  shopping: null,
  items: [],
  loading: false,
  error: null,

  load: async (shoppingId) => {
    if (get().shopping?.id !== shoppingId) set({ shopping: null, items: [] });
    set({ loading: true, error: null });
    try {
      const [shopping, items] = await Promise.all([getShopping(shoppingId), listItems(shoppingId)]);
      set({ shopping, items, loading: false });
    } catch (error) {
      set({ loading: false, error: toUserMessage(error) });
    }
  },

  setShopping: (shopping) => set({ shopping, items: [] }),

  addFromDraft: async (draft, image, rawReading) => {
    const shopping = requireShopping(get().shopping);
    const result = await addItem(shopping.id, draft, get().items, image, rawReading);
    const items = result.merged
      ? get().items.map((i) => (i.id === result.item.id ? result.item : i))
      : [result.item, ...get().items];
    const refreshed = await refreshTotals(shopping.id, items);
    set({ shopping: refreshed.shopping, items });
    return result;
  },

  addBatch: async (drafts, image) => {
    const shopping = requireShopping(get().shopping);
    const added = await addItems(shopping.id, drafts, image);
    const items = [...added, ...get().items];
    const refreshed = await refreshTotals(shopping.id, items);
    set({ shopping: refreshed.shopping, items });
    return added.length;
  },

  update: async (itemId, draft) => {
    const shopping = requireShopping(get().shopping);
    const updated = await editItem(itemId, draft);
    const items = get().items.map((i) => (i.id === itemId ? updated : i));
    const refreshed = await refreshTotals(shopping.id, items);
    set({ shopping: refreshed.shopping, items });
  },

  remove: async (itemId) => {
    const shopping = requireShopping(get().shopping);
    await removeItem(itemId);
    const items = get().items.filter((i) => i.id !== itemId);
    const refreshed = await refreshTotals(shopping.id, items);
    set({ shopping: refreshed.shopping, items });
  },
}));
