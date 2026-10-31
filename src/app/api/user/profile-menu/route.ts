import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SubscriptionService } from '@/lib/subscription';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || '';
    const email = searchParams.get('email') || '';
    const workspaceId = searchParams.get('workspaceId') || '';

    const client = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
      : (supabaseUrl && supabaseAnonKey
          ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } })
          : null);

    let profile: any = null;
    let subscription: any = null;
    let workspace: any = null;
    let channelsCount = 0;

    // Fetch verified subscription from SubscriptionService (dual-persistence: Supabase + JSON fallback)
    try {
      subscription = await SubscriptionService.getUserSubscription(userId, email);
    } catch (e) {
      console.warn('[ProfileMenuAPI] Error fetching subscription via SubscriptionService:', e);
    }

    if (client) {
      // 1. Fetch user profile
      try {
        if (userId || email) {
          let query = client.from('user_profiles').select('*');
          if (userId && email) {
            query = query.or(`id.eq.${userId},email.eq.${email}`);
          } else if (userId) {
            query = query.eq('id', userId);
          } else if (email) {
            query = query.eq('email', email);
          }
          const { data } = await query.limit(1).maybeSingle();
          profile = data;
        }
      } catch (e) {
        console.warn('[ProfileMenuAPI] Error fetching profile:', e);
      }

      // 2. Fetch active subscription
      try {
        if (userId || email) {
          let subQuery = client.from('subscriptions').select('*');
          if (userId && email) {
            subQuery = subQuery.or(`user_id.eq.${userId},user_id.eq.${email}`);
          } else if (userId) {
            subQuery = subQuery.eq('user_id', userId);
          } else if (email) {
            subQuery = subQuery.eq('user_id', email);
          }
          const { data: subData } = await subQuery
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          subscription = subData;
        }
      } catch (e) {
        console.warn('[ProfileMenuAPI] Error fetching subscription:', e);
      }

      // 3. Fetch workspace / organization name
      try {
        if (workspaceId || userId) {
          let wsQuery = client.from('workspaces').select('*');
          if (workspaceId) {
            wsQuery = wsQuery.eq('id', workspaceId);
          } else if (userId) {
            wsQuery = wsQuery.eq('user_id', userId);
          }
          const { data: wsData } = await wsQuery.limit(1).maybeSingle();
          workspace = wsData;
        }
      } catch (e) {
        console.warn('[ProfileMenuAPI] Error fetching workspace:', e);
      }

      // 4. Fetch connected accounts / channels count
      try {
        if (userId || workspaceId) {
          let accQuery = client
            .from('connected_accounts')
            .select('*', { count: 'exact', head: true });

          if (userId && workspaceId) {
            accQuery = accQuery.or(`user_id.eq.${userId},workspace_id.eq.${workspaceId}`);
          } else if (userId) {
            accQuery = accQuery.eq('user_id', userId);
          } else if (workspaceId) {
            accQuery = accQuery.eq('workspace_id', workspaceId);
          }

          const { count } = await accQuery;
          if (typeof count === 'number') {
            channelsCount = count;
          }
        }
      } catch (e) {
        console.warn('[ProfileMenuAPI] Error fetching accounts count:', e);
      }
    }

    // Determine normalized plan name and actual status
    const rawPlan = subscription?.planId || subscription?.plan_id || profile?.plan || 'free';
    let planDisplayName = 'Free plan';
    let planTier: 'Free' | 'Pro' | 'Premium' = 'Free';

    if (rawPlan === 'creator_pro' || rawPlan === 'pro') {
      planDisplayName = 'Pro plan';
      planTier = 'Pro';
    } else if (rawPlan === 'agency_scale' || rawPlan === 'premium') {
      planDisplayName = 'Premium plan';
      planTier = 'Premium';
    } else {
      planDisplayName = 'Free plan';
      planTier = 'Free';
    }

    const planStatus = subscription?.status || (rawPlan !== 'free' ? 'active' : 'free');

    // Organization / Workspace name
    const orgName =
      workspace?.name && workspace.name !== 'PostingTube' && workspace.name !== 'Personal Workspace'
        ? workspace.name
        : 'My organization';

    return NextResponse.json({
      success: true,
      profile: {
        userId: userId || profile?.id || '',
        email: email || profile?.email || '',
        fullName: profile?.full_name || email.split('@')[0] || 'Creator',
        avatarUrl: profile?.avatar_url || '',
        organizationName: orgName,
        planName: planDisplayName,
        planTier,
        planStatus,
        channelsCount,
      },
    });
  } catch (err: any) {
    console.error('[ProfileMenuAPI] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch profile menu data' },
      { status: 500 }
    );
  }
}
