import { FREE_SUBSCRIPTION, type SubscriptionState } from '@/services/subscription';
import { databaseError, getSupabase } from './supabaseClient';

export async function getSubscription(): Promise<SubscriptionState> {
  const { data, error } = await getSupabase()
    .from('subscriptions')
    .select('plan, status, current_period_end')
    .maybeSingle();
  if (error) throw databaseError(error, 'Não foi possível carregar seu plano.');
  if (!data) return FREE_SUBSCRIPTION;
  const row = data as { plan: SubscriptionState['planId']; status: SubscriptionState['status']; current_period_end: string | null };
  return { planId: row.plan, status: row.status, currentPeriodEnd: row.current_period_end };
}

export async function getMonthlyProductCount(): Promise<number> {
  const { data, error } = await getSupabase().rpc('monthly_product_count');
  if (error) throw databaseError(error, 'Não foi possível carregar seu uso do mês.');
  return Number(data ?? 0);
}
