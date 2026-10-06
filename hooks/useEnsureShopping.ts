import { useEffect } from 'react';
import { useShoppingStore } from '@/store/shoppingStore';

/** Garante que a compra da rota esteja carregada (ex.: app reaberto direto numa tela interna). */
export function useEnsureShopping(shoppingId: string | undefined) {
  const loadedId = useShoppingStore((s) => s.shopping?.id);
  const load = useShoppingStore((s) => s.load);
  useEffect(() => {
    if (shoppingId && loadedId !== shoppingId) load(shoppingId);
  }, [shoppingId, loadedId, load]);
  return useShoppingStore((s) => (s.shopping?.id === shoppingId ? s.shopping : null));
}
