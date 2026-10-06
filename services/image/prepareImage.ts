import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePayload } from '@/types/ai';
import { IMAGE } from '@/constants/config';

export interface PreparedImage {
  uri: string;
  width: number;
  height: number;
  payload: ImagePayload;
}

/** Reduz e comprime a foto antes de enviar à IA: menos dados, resposta mais rápida, mesma legibilidade. */
export async function prepareImage(uri: string, maxWidth: number, sourceWidth?: number): Promise<PreparedImage> {
  const context = ImageManipulator.manipulate(uri);
  if (!sourceWidth || sourceWidth > maxWidth) context.resize({ width: maxWidth });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ compress: IMAGE.compress, format: SaveFormat.JPEG, base64: true });
  if (!result.base64) throw new Error('Falha ao preparar a imagem.');
  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    payload: { base64: result.base64, mimeType: 'image/jpeg' },
  };
}
