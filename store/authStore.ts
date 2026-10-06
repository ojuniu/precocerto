import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { isSupabaseConfigured } from '@/constants/env';
import { getSupabase } from '@/services/data/supabaseClient';
import { AppError } from '@/utils/errors';

interface AuthState {
  session: Session | null;
  initialized: boolean;
  initialize: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
}

function authError(message: string | undefined, fallback: string): AppError {
  if (message?.includes('Invalid login credentials')) return new AppError('not_authenticated', 'E-mail ou senha incorretos.');
  if (message?.includes('already registered')) return new AppError('not_authenticated', 'Este e-mail já tem conta. Faça login.');
  if (message?.includes('Anonymous sign-ins are disabled')) {
    return new AppError('not_configured', 'Login sem conta desativado no Supabase (Authentication → Sign In / Providers → Anonymous).');
  }
  return new AppError('not_authenticated', message ?? fallback);
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  initialized: false,

  initialize: async () => {
    if (!isSupabaseConfigured) {
      set({ initialized: true });
      return;
    }
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, initialized: true });
    supabase.auth.onAuthStateChange((_event, session) => set({ session }));
  },

  signInWithEmail: async (email, password) => {
    const { data, error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw authError(error.message, 'Não foi possível entrar.');
    set({ session: data.session });
  },

  signUpWithEmail: async (email, password) => {
    const { data, error } = await getSupabase().auth.signUp({ email: email.trim(), password });
    if (error) throw authError(error.message, 'Não foi possível criar a conta.');
    if (!data.session) {
      throw new AppError('not_authenticated', 'Conta criada! Confirme seu e-mail e depois faça login.');
    }
    set({ session: data.session });
  },

  continueAsGuest: async () => {
    const { data, error } = await getSupabase().auth.signInAnonymously();
    if (error) throw authError(error.message, 'Não foi possível continuar sem conta.');
    set({ session: data.session });
  },

  signOut: async () => {
    await getSupabase().auth.signOut();
    set({ session: null });
  },
}));
