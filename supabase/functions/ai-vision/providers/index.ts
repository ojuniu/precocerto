import { GeminiProvider } from './gemini.ts';
import { OpenAIProvider } from './openai.ts';
import type { VisionProvider } from './types.ts';

/**
 * Escolhe o provedor pelo secret AI_PROVIDER ("gemini" | "openai").
 * Para adicionar outro (Claude, Google Vision, OCR próprio...), implemente VisionProvider e registre aqui.
 */
export function createProvider(): VisionProvider | null {
  const provider = (Deno.env.get('AI_PROVIDER') ?? 'gemini').toLowerCase();
  if (provider === 'openai') {
    const key = Deno.env.get('OPENAI_API_KEY');
    return key ? new OpenAIProvider(key, Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini') : null;
  }
  const key = Deno.env.get('GEMINI_API_KEY');
  return key ? new GeminiProvider(key, Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash') : null;
}

export { ProviderError } from './types.ts';
export type { VisionProvider } from './types.ts';
