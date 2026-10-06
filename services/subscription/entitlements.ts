import { PLANS, type Feature, type PlanId } from './plans';

export interface SubscriptionState {
  planId: PlanId;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';
  currentPeriodEnd: string | null;
}

export interface UsageState {
  productsThisMonth: number;
}

export const FREE_SUBSCRIPTION: SubscriptionState = { planId: 'free', status: 'active', currentPeriodEnd: null };

export function activePlanId(subscription: SubscriptionState, now = new Date()): PlanId {
  if (subscription.planId === 'free') return 'free';
  const valid = subscription.status === 'active' || subscription.status === 'trialing';
  const notExpired = !subscription.currentPeriodEnd || new Date(subscription.currentPeriodEnd) > now;
  return valid && notExpired ? subscription.planId : 'free';
}

export function hasFeature(subscription: SubscriptionState, feature: Feature): boolean {
  return PLANS[activePlanId(subscription)].features.has(feature);
}

export function remainingProducts(subscription: SubscriptionState, usage: UsageState): number | null {
  const limit = PLANS[activePlanId(subscription)].monthlyProductLimit;
  return limit === null ? null : Math.max(0, limit - usage.productsThisMonth);
}

export function canAddProducts(subscription: SubscriptionState, usage: UsageState, count = 1): boolean {
  const remaining = remainingProducts(subscription, usage);
  return remaining === null || remaining >= count;
}
