import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Safely initialize Supabase client
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Sign in using Google OAuth via Supabase
 */
export async function signInWithGoogle(redirectTo: string = '/dashboard') {
  if (!supabase) {
    alert('Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local to enable Supabase Google Auth.');
    return;
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const finalRedirect = `${origin}/api/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`;

  try {
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
      if (error.message.includes('Unsupported provider') || error.message.includes('provider is not enabled')) {
        alert(
          'Google Auth setup needed in Supabase:\n\n1. Open: https://supabase.com/dashboard/project/mdykqpqhuwfpondyqnms/auth/providers\n2. Toggle "Google" to Enabled\n3. Add your Google OAuth Client ID & Secret from Google Cloud Console.\n\nTip: You can also use Email sign-in or "Continue as Demo Guest" below!'
        );
        return;
      }
      throw error;
    }

    return data;
  } catch (err: any) {
    if (err?.message?.includes('provider is not enabled')) {
      alert(
        'Google Auth setup needed in Supabase:\n\n1. Open: https://supabase.com/dashboard/project/mdykqpqhuwfpondyqnms/auth/providers\n2. Toggle "Google" to Enabled\n3. Add your Google OAuth Client ID & Secret.\n\nTip: You can also use Email sign-in or "Continue as Demo Guest" below!'
      );
    } else {
      alert(`Supabase Auth Error: ${err?.message || 'Failed to initialize Google login'}`);
    }
  }
}

/**
 * Sign in with Email & Password
 */
export async function signInWithEmail(email: string, pass: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  return await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });
}

/**
 * Sign up with Email & Password
 */
export async function signUpWithEmail(email: string, pass: string) {
  if (!supabase) throw new Error('Supabase is not configured');
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
        email: 'founder@preview.postingtube.com',
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
 * Sign out of Supabase & clear guest session
 */
export async function signOutUser() {
  if (typeof window !== 'undefined') {
    document.cookie = 'pb_auth_session=; path=/; max-age=0; SameSite=Lax';
    localStorage.removeItem('pb_guest_session');
  }
  if (supabase) {
    await supabase.auth.signOut();
  }
}
