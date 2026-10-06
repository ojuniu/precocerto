export type PlanId = 'free' | 'premium';

export type Feature =
  | 'price_tag_reading'
  | 'receipt_check'
  | 'basic_history'
  | 'batch_reading'
  | 'full_history'
  | 'price_history'
  | 'market_comparison'
  | 'price_alerts'
  | 'no_ads';

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: number;
  /** null = ilimitado. */
  monthlyProductLimit: number | null;
  /** Quantos dias de histórico de compras ficam visíveis. null = completo. */
  historyDays: number | null;
  features: ReadonlySet<Feature>;
}

const FREE_FEATURES: Feature[] = ['price_tag_reading', 'receipt_check', 'basic_history'];

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Gratuito',
    priceMonthly: 0,
    monthlyProductLimit: 80,
    historyDays: 60,
    features: new Set(FREE_FEATURES),
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    priceMonthly: 9.9,
    monthlyProductLimit: null,
    historyDays: null,
    features: new Set<Feature>([
      ...FREE_FEATURES,
      'batch_reading',
      'full_history',
      'price_history',
      'market_comparison',
      'price_alerts',
      'no_ads',
    ]),
  },
};

export const PREMIUM_HIGHLIGHTS = [
  'Produtos ilimitados',
  'Leitura em lote (várias etiquetas por foto)',
  'Histórico completo',
  'Histórico de preços por produto',
  'Comparação entre mercados',
  'Alertas de preço',
  'Sem anúncios',
] as const;
