import { syncServerSession } from "@/lib/session-sync";
import { create } from 'zustand';
import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email?: string, password?: string) => Promise<unknown>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password?: string, fullName?: string) => Promise<unknown>;
  verifyOtp: (email: string, token: string, type?: 'signup' | 'recovery' | 'magiclink') => Promise<unknown>;
  signInWithMagicLink: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,

  checkSession: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ user: session?.user || null, loading: false });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        set({ user: session?.user || null, loading: false });

        // Auto-set cookie when session changes
        if (session) {
          const sessionId = session.access_token.slice(0, 32);
          const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
          document.cookie = `auth_token=${sessionId}; path=/; max-age=86400; SameSite=Lax${isSecure ? '; Secure' : ''}`;
        }
      });

      // FIX: Store subscription cleanup in a global ref for proper unsubscribe
      if (typeof window !== 'undefined') {
        // Store reference for cleanup on page unload
        // @ts-expect-error - Storing subscription globally for cleanup
        window.__authSubscription = subscription;
      }
    } catch (error) {
      console.error('Session check failed', error);
      set({ loading: false });
    }
  },

  signIn: async (email, password) => {
    if (!email || !password) throw new Error("Email and password required");
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  signInWithMagicLink: async (email) => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
  },

  signInWithGoogle: async () => {
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) throw error;
  },

  signUp: async (email, password, fullName) => {
    if (!email || !password) throw new Error("Email and password required");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;
    return data;
  },

  verifyOtp: async (email, otp, type) => {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: type || 'signup' });
    if (error) throw error;
    return data;
  },

  resetPassword: async (email) => {
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/update-password` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) throw error;
  },

  signOut: async () => {
    await supabase.auth.signOut();
            await syncServerSession(null);
    document.cookie = 'auth_token=; path=/; max-age=0';
    set({ user: null });
  },
}));

if (typeof window !== 'undefined') {
  useAuth.getState().checkSession();
}
