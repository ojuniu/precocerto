import { AppError } from '@/utils/errors';
import type { PlanId } from './plans';

/**
 * Ponto de integração com pagamentos (RevenueCat, Stripe, Google Play Billing, App Store...).
 * O app só conversa com esta interface; trocar de provedor não exige reescrever telas.
 * A confirmação definitiva do plano deve sempre vir do backend (webhook → tabela subscriptions).
 */
export interface PaymentProvider {
  readonly id: string;
  purchase(planId: PlanId): Promise<void>;
  restore(): Promise<void>;
}

export class NotConfiguredPaymentProvider implements PaymentProvider {
  readonly id = 'not_configured';

  async purchase(): Promise<void> {
    throw new AppError('not_configured', 'Pagamentos ainda não estão disponíveis nesta versão.');
  }

  async restore(): Promise<void> {
    throw new AppError('not_configured', 'Pagamentos ainda não estão disponíveis nesta versão.');
  }
}

let provider: PaymentProvider = new NotConfiguredPaymentProvider();

export function setPaymentProvider(next: PaymentProvider): void {
  provider = next;
}

export function getPaymentProvider(): PaymentProvider {
  return provider;
}
