import { insertItems, listItems, updateItem, deleteItem, type ShoppingItemInput } from '@/services/data/itemRepository';
import { upsertProduct } from '@/services/data/productRepository';
import { updateShopping } from '@/services/data/shoppingRepository';
import { uploadScan } from '@/services/data/storageRepository';
import { expectedShoppingTotal } from '@/services/pricing/pricing';
import type { ImagePayload } from '@/types/ai';
import type { Shopping, ShoppingItem } from '@/types/domain';
import { AppError } from '@/utils/errors';
import { itemIdentityKey, validateDraft, type ItemDraft } from './itemDraft';

function draftToInput(draft: ItemDraft): ShoppingItemInput {
  if (validateDraft(draft).length > 0 || draft.shelfPrice === null) {
    throw new AppError('unknown', 'Confira o nome e o preço do produto.');
  }
  return {
    name: draft.name.trim(),
    brand: draft.brand?.trim() || null,
    description: draft.description?.trim() || null,
    sizeValue: draft.sizeValue,
    sizeUnit: draft.sizeUnit,
    priceUnit: draft.priceUnit,
    shelfPrice: draft.shelfPrice,
    promoPrice: draft.promoPrice,
    promo: draft.promo,
    quantity: draft.quantity,
    confidence: draft.confidence,
  };
}

/** Recalcula quantidade de itens e total esperado da compra. */
export async function refreshTotals(shoppingId: string, items?: ShoppingItem[]): Promise<{ shopping: Shopping; items: ShoppingItem[] }> {
  const current = items ?? (await listItems(shoppingId));
  const shopping = await updateShopping(shoppingId, {
    itemCount: current.length,
    expectedTotal: expectedShoppingTotal(current),
  });
  return { shopping, items: current };
}

export interface AddItemResult {
  item: ShoppingItem;
  merged: boolean;
}

/**
 * Salva um produto confirmado. Se o mesmo produto já estiver na compra com o mesmo preço,
 * soma a quantidade em vez de criar uma linha duplicada.
 */
export async function addItem(
  shoppingId: string,
  draft: ItemDraft,
  existingItems: ShoppingItem[],
  image?: ImagePayload,
  rawReading?: unknown,
): Promise<AddItemResult> {
  const input = draftToInput(draft);
  const key = itemIdentityKey(input);
  const duplicate = existingItems.find(
    (item) => itemIdentityKey(item) === key && item.shelfPrice === input.shelfPrice && item.promoPrice === input.promoPrice,
  );
  if (duplicate) {
    const item = await updateItem(duplicate.id, { quantity: duplicate.quantity + input.quantity });
    return { item, merged: true };
  }

  const [productId, imagePath] = await Promise.all([
    upsertProduct(input),
    image ? uploadScan(image, 'tags').catch(() => null) : Promise.resolve(null),
  ]);
  const [item] = await insertItems(shoppingId, [{ ...input, productId, imagePath, rawReading }]);
  if (!item) throw new AppError('database', 'Não foi possível salvar o produto.');
  return { item, merged: false };
}

/** Vários produtos de uma vez (leitura em lote de prateleira). */
export async function addItems(shoppingId: string, drafts: ItemDraft[], image?: ImagePayload): Promise<ShoppingItem[]> {
  const inputs = drafts.map(draftToInput);
  const imagePath = image ? await uploadScan(image, 'shelves').catch(() => null) : null;
  const productIds = await Promise.all(inputs.map((input) => upsertProduct(input)));
  return insertItems(
    shoppingId,
    inputs.map((input, i) => ({ ...input, productId: productIds[i] ?? null, imagePath })),
  );
}

export async function editItem(itemId: string, draft: ItemDraft): Promise<ShoppingItem> {
  const input = draftToInput(draft);
  const productId = await upsertProduct(input);
  return updateItem(itemId, { ...input, productId });
}

export async function removeItem(itemId: string): Promise<void> {
  await deleteItem(itemId);
}
