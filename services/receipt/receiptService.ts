import { IMAGE } from '@/constants/config';
import { getAIProvider } from '@/services/ai';
import { prepareImage, type PreparedImage } from '@/services/image/prepareImage';
import { AppError } from '@/utils/errors';
import { normalizeReceipt, type NormalizedReceipt } from './normalizeReceipt';

export interface ReceiptScan {
  image: PreparedImage;
  receipt: NormalizedReceipt;
}

/** Foto do cupom → IA → cupom normalizado (linhas completas, duplicadas agrupadas, consistência conferida). */
export async function scanReceipt(photoUri: string, photoWidth?: number): Promise<ReceiptScan> {
  const image = await prepareImage(photoUri, IMAGE.receiptMaxWidth, photoWidth);
  const reading = await getAIProvider().readReceipt(image.payload);
  const receipt = normalizeReceipt(reading);
  if (receipt.lines.length === 0) {
    throw new AppError('unreadable', 'Não conseguimos ler os itens do cupom. Tente uma foto mais nítida e com boa luz.');
  }
  return { image, receipt };
}

export { normalizeReceipt } from './normalizeReceipt';
export type { NormalizedReceipt, NormalizedReceiptLine } from './normalizeReceipt';
