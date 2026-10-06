import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { env, isSupabaseConfigured } from '@/constants/env';
import { AppError } from '@/utils/errors';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new AppError(
      'not_configured',
      'Supabase não configurado. Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.',
    );
  }
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        storage: Platform.OS === 'web' ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    AppState.addEventListener('change', (state) => {
      if (state === 'active') client?.auth.startAutoRefresh();
      else client?.auth.stopAutoRefresh();
    });
  }
  return client;
}

export async function requireUserId(): Promise<string> {
  const { data } = await getSupabase().auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new AppError('not_authenticated', 'Sua sessão expirou. Entre novamente.');
  return userId;
}

/** Converte erros do PostgREST/Postgres em mensagens amigáveis. */
export function databaseError(error: { message: string; code?: string } | null, fallback: string): AppError {
  const message = error?.message ?? '';
  if (message.includes('PRODUCT_LIMIT_REACHED')) {
    return new AppError('quota_exceeded', 'Você atingiu o limite de produtos do plano gratuito neste mês.', error);
  }
  return new AppError('database', fallback, error);
}
