import { useEffect, useState } from 'react';
import { getSignedImageUrl } from '@/services/data/storageRepository';

/** URLs temporárias das fotos das etiquetas (o bucket é privado). */
export function useSignedImages(paths: (string | null)[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = paths.filter(Boolean).sort().join('|');

  useEffect(() => {
    const missing = key ? key.split('|') : [];
    let cancelled = false;
    Promise.all(missing.map(async (path) => [path, await getSignedImageUrl(path).catch(() => null)] as const)).then((pairs) => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      pairs.forEach(([path, url]) => {
        if (url) next[path] = url;
      });
      setUrls(next);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return urls;
}
