import type { VisionImage } from './providers/types.ts';

export const MAX_IMAGE_BASE64_LENGTH = 8_000_000;
export const MATCH_PROMPT_LIMIT = 120;

type NamedRef = { id: string; name: string };

export type AIRequest =
  | { task: 'price_tag' | 'shelf' | 'receipt'; image: VisionImage }
  | { task: 'match'; pairs: Array<{ shelf: NamedRef; receipt: NamedRef }> };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function isNamedRef(v: unknown): v is NamedRef {
  return isRecord(v) && typeof v.id === 'string' && typeof v.name === 'string' && v.name.length <= 300;
}

export function validateRequest(body: unknown): AIRequest {
  if (!isRecord(body)) throw new Error('Corpo inválido.');
  const task = body.task;
  if (task === 'match') {
    if (!Array.isArray(body.pairs) || body.pairs.length === 0) throw new Error('Pares ausentes.');
    const pairs = body.pairs.filter((p) => isRecord(p) && isNamedRef(p.shelf) && isNamedRef(p.receipt)) as Array<{
      shelf: NamedRef;
      receipt: NamedRef;
    }>;
    return { task, pairs };
  }
  if (task !== 'price_tag' && task !== 'shelf' && task !== 'receipt') throw new Error('Tarefa desconhecida.');
  const image = body.image;
  if (!isRecord(image) || typeof image.base64 !== 'string' || image.base64.length === 0) {
    throw new Error('Imagem ausente.');
  }
  if (image.base64.length > MAX_IMAGE_BASE64_LENGTH) throw new Error('Imagem muito grande.');
  const mimeType = image.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
  return { task, image: { base64: image.base64, mimeType } };
}
