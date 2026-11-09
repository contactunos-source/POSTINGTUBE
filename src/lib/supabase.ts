import { createClient } from '@supabase/supabase-js';
import { StorageService } from '@/lib/storage';

export const SUPABASE_PUBLIC_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mdykqpqhuwfpondyqnms.supabase.co';
export const SUPABASE_PUBLIC_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1keWtxcHFodXdmcG9uZHlxbm1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2NDY1MDgsImV4cCI6MjEwODIyMjUwOH0.jHlEb3e-MsQRxiSa22NziD8r8D47YZ_MP_ROKH9qUUk';

// Always available Supabase client with production fallback
export const supabase = createClient(SUPABASE_PUBLIC_URL, SUPABASE_PUBLIC_ANON_KEY);

/**
 * Sign in using Google OAuth via Supabase
 */
export async function signInWithGoogle(redirectTo: string = '/dashboard') {
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL || 'https://planposter.vercel.app');
  const finalRedirect = `${origin}/api/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: finalRedirect,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Sign in with Email & Password
 */
export async function signInWithEmail(email: string, pass: string) {
  return await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });
}

/**
 * Sign up with Email & Password
 */
export async function signUpWithEmail(email: string, pass: string) {
  return await supabase.auth.signUp({
    email,
    password: pass,
  });
}

// Auto-sync cookie for edge middleware protection
if (supabase && typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      document.cookie = 'pb_auth_session=1; path=/; max-age=2592000; SameSite=Lax';
    } else if (!localStorage.getItem('pb_guest_session')) {
      document.cookie = 'pb_auth_session=; path=/; max-age=0; SameSite=Lax';
    }
  });
}

/**
 * Guest Demo session for instant evaluation
 */
export function signInAsGuest() {
  if (typeof window !== 'undefined') {
    document.cookie = 'pb_auth_session=1; path=/; max-age=2592000; SameSite=Lax';
    localStorage.setItem(
      'pb_guest_session',
      JSON.stringify({
        id: 'usr_guest_demo',
        email: 'founder@preview.planposter.com',
        user_metadata: {
          full_name: 'Alex Rivera (Demo)',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        },
      })
    );
  }
}

export function getGuestUser(): any | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('pb_guest_session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Sign out of Supabase & completely purge all user session and cache state
 */
export async function signOutUser() {
  if (typeof window !== 'undefined') {
    document.cookie = 'pb_auth_session=; path=/; max-age=0; SameSite=Lax';
    StorageService.clearAllUserCaches();
    localStorage.removeItem('pb_guest_session');
  }
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signout warning:', e);
    }
  }
}
