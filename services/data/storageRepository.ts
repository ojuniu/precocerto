import { STORAGE_BUCKET } from '@/constants/config';
import type { ImagePayload } from '@/types/ai';
import { base64ToArrayBuffer } from '@/utils/base64';
import { AppError } from '@/utils/errors';
import { getSupabase, requireUserId } from './supabaseClient';

export type ScanKind = 'tags' | 'shelves' | 'receipts';

const randomId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Salva a foto no bucket privado, em `{userId}/{kind}/...` (a política RLS exige a pasta do próprio usuário). */
export async function uploadScan(image: ImagePayload, kind: ScanKind): Promise<string> {
  const userId = await requireUserId();
  const extension = image.mimeType === 'image/png' ? 'png' : 'jpg';
  const path = `${userId}/${kind}/${randomId()}.${extension}`;
  const { error } = await getSupabase()
    .storage.from(STORAGE_BUCKET)
    .upload(path, base64ToArrayBuffer(image.base64), { contentType: image.mimeType, upsert: false });
  if (error) throw new AppError('database', 'Não foi possível salvar a foto.', error);
  return path;
}

export async function getSignedImageUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  const { data, error } = await getSupabase().storage.from(STORAGE_BUCKET).createSignedUrl(path, expiresInSeconds);
  return error ? null : data.signedUrl;
}
