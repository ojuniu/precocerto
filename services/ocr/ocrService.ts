import { IMAGE } from '@/constants/config';
import { getAIProvider } from '@/services/ai';
import { prepareImage, type PreparedImage } from '@/services/image/prepareImage';
import type { PriceTagReading, ShelfReading } from '@/types/ai';
import { AppError } from '@/utils/errors';
import { assessPriceTag, type ReadingQuality } from './readingQuality';

export interface PriceTagScan {
  image: PreparedImage;
  reading: PriceTagReading;
  quality: ReadingQuality;
}

export interface ShelfScan {
  image: PreparedImage;
  reading: ShelfReading;
}

/** Foto da etiqueta → imagem otimizada → IA → leitura validada + avaliação de qualidade. */
export async function scanPriceTag(photoUri: string, photoWidth?: number): Promise<PriceTagScan> {
  const image = await prepareImage(photoUri, IMAGE.priceTagMaxWidth, photoWidth);
  const reading = await getAIProvider().readPriceTag(image.payload);
  return { image, reading, quality: assessPriceTag(reading) };
}

/** Uma foto com várias etiquetas (leitura em lote). */
export async function scanShelf(photoUri: string, photoWidth?: number): Promise<ShelfScan> {
  const image = await prepareImage(photoUri, IMAGE.shelfMaxWidth, photoWidth);
  const reading = await getAIProvider().readShelf(image.payload);
  if (reading.tags.length === 0) {
    throw new AppError('unreadable', 'Não encontramos etiquetas nesta foto. Tente aproximar a câmera.');
  }
  return { image, reading };
}

export type { ReadingQuality } from './readingQuality';
