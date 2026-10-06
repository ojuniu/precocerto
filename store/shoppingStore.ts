import { create } from 'zustand';
import { addItem, addItems, editItem, refreshTotals, removeItem, type AddItemResult } from '@/services/shopping/shoppingService';
import { listItems, updateCheckout } from '@/services/data/itemRepository';
import { getShopping as fetchShopping, updateShopping } from '@/services/data/shoppingRepository';
import { summarizeCheckout } from '@/services/comparison/checkout';
import type { ItemDraft } from '@/services/shopping/itemDraft';
import type { ImagePayload } from '@/types/ai';
import type { CheckoutStatus, Shopping, ShoppingItem } from '@/types/domain';
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
  setCheckout: (itemId: string, status: CheckoutStatus, chargedPrice?: number | null) => Promise<void>;
  finishCheckout: () => Promise<Shopping>;
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
      const [shopping, items] = await Promise.all([fetchShopping(shoppingId), listItems(shoppingId)]);
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

  setCheckout: async (itemId, status, chargedPrice = null) => {
    const previous = get().items;
    const apply = (items: ShoppingItem[]) =>
      items.map((i) => (i.id === itemId ? { ...i, checkoutStatus: status, checkoutChargedPrice: status === 'wrong' ? chargedPrice : null } : i));
    set({ items: apply(previous) });
    try {
      await updateCheckout(itemId, status, status === 'wrong' ? chargedPrice : null);
    } catch (error) {
      set({ items: previous });
      throw error;
    }
  },

  finishCheckout: async () => {
    const shopping = requireShopping(get().shopping);
    const summary = summarizeCheckout(get().items);
    const updated = await updateShopping(shopping.id, {
      status: 'checked',
      expectedTotal: summary.expectedTotal,
      paidTotal: summary.chargedTotal,
      difference: summary.difference,
      divergenceCount: summary.wrongCount,
    });
    set({ shopping: updated });
    return updated;
  },

  remove: async (itemId) => {
    const shopping = requireShopping(get().shopping);
    await removeItem(itemId);
    const items = get().items.filter((i) => i.id !== itemId);
    const refreshed = await refreshTotals(shopping.id, items);
    set({ shopping: refreshed.shopping, items });
  },
}));
