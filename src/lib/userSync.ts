import { supabase } from '@/lib/supabase';

export interface UserSyncPayload {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  role?: string;
  status?: string;
  plan?: string;
  createdAt?: string;
  lastActiveAt?: string;
}

/**
 * Synchronizes an authenticated user profile with Supabase and server state.
 * Can be safely called after registration, sign-in, or dashboard initial load.
 */
export async function syncUserProfile(user: any): Promise<boolean> {
  if (!user || !user.id || !user.email) return false;

  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.fullName ||
    (user.email.includes('@') ? user.email.split('@')[0] : 'Customer');

  const avatarUrl =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    user.avatarUrl ||
    '';

  const createdAt = user.created_at || user.createdAt || new Date().toISOString();
  const lastActiveAt = new Date().toISOString();

  const payload: UserSyncPayload = {
    id: user.id,
    email: user.email,
    fullName,
    avatarUrl,
    role: user.email === (process.env.NEXT_PUBLIC_OWNER_EMAIL || 'onmansonu@gmail.com') ? 'owner' : 'customer',
    status: 'active',
    plan: 'free',
    createdAt,
    lastActiveAt,
  };

  // 1. Direct Supabase user_profiles table upsert attempt
  if (supabase) {
    try {
      await supabase.from('user_profiles').upsert(
        {
          id: payload.id,
          email: payload.email,
          full_name: payload.fullName,
          avatar_url: payload.avatarUrl,
          role: payload.role,
          status: payload.status,
          plan: payload.plan,
          created_at: payload.createdAt,
          last_active_at: payload.lastActiveAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    } catch (e) {
      // Table might not exist yet before SQL migration is applied
      console.warn('[UserSync] Notice on direct Supabase upsert:', e);
    }
  }

  // 2. Also notify backend API to ensure server-side synchronization
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (apiErr) {
      console.warn('[UserSync] Notice on backend sync API:', apiErr);
    }
  }

  return true;
}
