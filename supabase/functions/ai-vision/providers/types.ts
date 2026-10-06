export interface VisionImage {
  base64: string;
  mimeType: string;
}

/** Contrato que todo provedor de IA do backend implementa. */
export interface VisionProvider {
  readonly id: string;
  /** Envia prompt (+ imagem opcional) e devolve o JSON já parseado. */
  generateJson(prompt: string, image?: VisionImage): Promise<unknown>;
}

export class ProviderError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
  }
}

export function parseJsonText(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new ProviderError('O provedor de IA retornou uma resposta inválida.');
  }
}
