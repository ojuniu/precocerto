import { FunctionsHttpError } from '@supabase/supabase-js';
import { env } from '@/constants/env';
import { getSupabase } from '@/services/data/supabaseClient';
import type { ImagePayload, MatchCandidateInput, VisionTask } from '@/types/ai';
import { AppError } from '@/utils/errors';
import type { AIProvider } from './AIProvider';
import { parseMatchPairs, parsePriceTag, parseReceipt, parseShelf } from './parse';

type FunctionTask = VisionTask | 'match';

interface FunctionErrorBody {
  error?: string;
  code?: string;
}

async function toAppError(error: unknown): Promise<AppError> {
  if (error instanceof FunctionsHttpError) {
    let body: FunctionErrorBody = {};
    try {
      body = (await error.context.json()) as FunctionErrorBody;
    } catch {
      // corpo não-JSON
    }
    if (body.code === 'premium_required') return new AppError('premium_required', body.error ?? 'Recurso exclusivo do Premium.');
    if (body.code === 'not_configured') {
      return new AppError('not_configured', body.error ?? 'Serviço de IA não configurado no servidor.');
    }
    return new AppError('ai_failed', body.error ?? 'Não foi possível processar a imagem agora.', error);
  }
  return new AppError('network', 'Sem conexão com o serviço de leitura. Verifique sua internet.', error);
}

/** Envia imagens para a Edge Function `ai-vision`, que guarda as chaves e escolhe o provedor (Gemini/OpenAI). */
export class SupabaseEdgeAIProvider implements AIProvider {
  readonly id = 'supabase-edge';

  private async invoke(task: FunctionTask, payload: Record<string, unknown>): Promise<unknown> {
    const { data, error } = await getSupabase().functions.invoke(env.aiFunctionName, { body: { task, ...payload } });
    if (error) throw await toAppError(error);
    const result = (data as { result?: unknown } | null)?.result;
    if (result === undefined) throw new AppError('ai_failed', 'Resposta vazia do serviço de leitura.');
    return result;
  }

  async readPriceTag(image: ImagePayload) {
    return parsePriceTag(await this.invoke('price_tag', { image }));
  }

  async readShelf(image: ImagePayload) {
    return parseShelf(await this.invoke('shelf', { image }));
  }

  async readReceipt(image: ImagePayload) {
    return parseReceipt(await this.invoke('receipt', { image }));
  }

  async compareProductNames(pairs: { shelf: MatchCandidateInput; receipt: MatchCandidateInput }[]) {
    return parseMatchPairs(await this.invoke('match', { pairs }));
  }
}
