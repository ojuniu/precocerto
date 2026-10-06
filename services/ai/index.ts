import type { AIProvider } from './AIProvider';
import { SupabaseEdgeAIProvider } from './SupabaseEdgeAIProvider';

let provider: AIProvider = new SupabaseEdgeAIProvider();

/** Ponto único para trocar o provedor de IA do app (ex.: um OCR on-device no futuro). */
export function getAIProvider(): AIProvider {
  return provider;
}

export function setAIProvider(next: AIProvider): void {
  provider = next;
}

export type { AIProvider } from './AIProvider';
