// Edge Function "ai-vision": único ponto do sistema que conhece as chaves de IA.
// POST { task: "price_tag" | "shelf" | "receipt", image: { base64, mimeType } }
// POST { task: "match", pairs: [{ shelf: {id,name}, receipt: {id,name} }] }
import { createClient } from 'npm:@supabase/supabase-js@2';
import { MATCH_PROMPT_LIMIT, validateRequest, type AIRequest } from './request.ts';
import { matchPrompt, PRICE_TAG_PROMPT, RECEIPT_PROMPT, SHELF_PROMPT } from './prompts.ts';
import { createProvider, ProviderError } from './providers/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function errorResponse(message: string, code: string, status: number): Response {
  return json({ error: message, code }, status);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse('Método não permitido.', 'method_not_allowed', 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return errorResponse('Não autenticado.', 'not_authenticated', 401);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return errorResponse('Sessão inválida.', 'not_authenticated', 401);

  let request: AIRequest;
  try {
    request = validateRequest(await req.json());
  } catch (error) {
    return errorResponse((error as Error).message, 'bad_request', 400);
  }

  if (request.task === 'shelf') {
    const { data: plan } = await supabase.rpc('current_plan');
    if (plan !== 'premium') {
      return errorResponse('A leitura em lote é um recurso Premium.', 'premium_required', 403);
    }
  }

  const provider = createProvider();
  if (!provider) {
    return errorResponse(
      'Serviço de IA não configurado. Defina AI_PROVIDER e GEMINI_API_KEY (ou OPENAI_API_KEY) nos secrets da função.',
      'not_configured',
      503,
    );
  }

  try {
    let result: unknown;
    switch (request.task) {
      case 'price_tag':
        result = await provider.generateJson(PRICE_TAG_PROMPT, request.image);
        break;
      case 'shelf':
        result = await provider.generateJson(SHELF_PROMPT, request.image);
        break;
      case 'receipt':
        result = await provider.generateJson(RECEIPT_PROMPT, request.image);
        break;
      case 'match':
        result = await provider.generateJson(matchPrompt(request.pairs.slice(0, MATCH_PROMPT_LIMIT)));
        break;
    }
    return json({ result, provider: provider.id });
  } catch (error) {
    const status = error instanceof ProviderError ? error.status : 500;
    console.error('ai-vision failure', request.task, error);
    return errorResponse('Não foi possível processar a imagem agora. Tente novamente.', 'ai_failed', status);
  }
});
