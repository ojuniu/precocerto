import { create } from 'zustand';
import { getMonthlyProductCount, getSubscription } from '@/services/data/subscriptionRepository';
import {
  activePlanId,
  FREE_SUBSCRIPTION,
  hasFeature,
  PLANS,
  remainingProducts,
  type Feature,
  type Plan,
  type SubscriptionState,
} from '@/services/subscription';

interface SubscriptionStoreState {
  subscription: SubscriptionState;
  productsThisMonth: number;
  loaded: boolean;
  refresh: () => Promise<void>;
  plan: () => Plan;
  can: (feature: Feature) => boolean;
  remaining: () => number | null;
}

export const useSubscriptionStore = create<SubscriptionStoreState>((set, get) => ({
  subscription: FREE_SUBSCRIPTION,
  productsThisMonth: 0,
  loaded: false,

  refresh: async () => {
    try {
      const [subscription, productsThisMonth] = await Promise.all([getSubscription(), getMonthlyProductCount()]);
      set({ subscription, productsThisMonth, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  plan: () => PLANS[activePlanId(get().subscription)],
  can: (feature) => hasFeature(get().subscription, feature),
  remaining: () => remainingProducts(get().subscription, { productsThisMonth: get().productsThisMonth }),
}));
