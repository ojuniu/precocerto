/**
 * Apenas variáveis públicas (EXPO_PUBLIC_*) podem ficar no app.
 * Chaves de IA ficam como secrets da Edge Function no Supabase.
 */
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  aiFunctionName: process.env.EXPO_PUBLIC_AI_FUNCTION_NAME ?? 'ai-vision',
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
