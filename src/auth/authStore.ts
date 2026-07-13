import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  ready: boolean;
  isAdmin: boolean;
  init: () => void;
  signUp: (email: string, password: string, name: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

/** 目前登入者的顯示名稱 */
export function displayName(session: Session | null): string {
  const meta = session?.user.user_metadata as { name?: string } | undefined;
  return meta?.name || session?.user.email?.split('@')[0] || '訪客';
}

async function loadAdmin(session: Session | null): Promise<boolean> {
  if (!session) return false;
  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .single();
  return !!data?.is_admin;
}

let initialized = false;

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  ready: false,
  isAdmin: false,

  init: () => {
    if (initialized) return;
    initialized = true;
    supabase.auth.getSession().then(async ({ data }) => {
      set({ session: data.session, ready: true, isAdmin: await loadAdmin(data.session) });
    });
    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session, isAdmin: await loadAdmin(session) });
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
