import { router } from 'expo-router';
import type { Shopping } from '@/types/domain';

export function openShopping(shopping: Pick<Shopping, 'id' | 'status'>) {
  router.push(shopping.status === 'checked' ? `/shopping/${shopping.id}/conference` : `/shopping/${shopping.id}`);
}
