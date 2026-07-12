import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  ready: boolean;
  init: () => void;
  signUp: (email: string, password: string, name: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

/** 目前登入者的顯示名稱與 id（給 UI 與權限用） */
export function displayName(session: Session | null): string {
  const meta = session?.user.user_metadata as { name?: string } | undefined;
  return meta?.name || session?.user.email?.split('@')[0] || '訪客';
}

let initialized = false;

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  ready: false,

  init: () => {
    if (initialized) return;
    initialized = true;
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, ready: true });
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
    });
  },

  signUp: async (email, password, name) => {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } },
    });
    return error ? error.message : null;
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return error ? error.message : null;
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },
}));
