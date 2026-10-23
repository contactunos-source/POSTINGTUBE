import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accountId, workspaceId } = body;

    if (!accountId) {
      return NextResponse.json({ error: 'Missing accountId parameter' }, { status: 400 });
    }

    console.log(`[Channel Delete] Deleting channel ${accountId} from workspace ${workspaceId}`);

    const client = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
      : createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

    // 1. Remove pending scheduled jobs for this account
    try {
      await client.from('scheduled_jobs').delete().eq('account_id', accountId).eq('status', 'pending');
    } catch (jobErr) {
      console.warn('[Channel Delete] Job cleanup notice:', jobErr);
    }

    // 2. Delete from connected_accounts
    let query = client.from('connected_accounts').delete().eq('id', accountId);
    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }
    const { error: deleteErr } = await query;

    if (deleteErr) {
      console.error('[Channel Delete] Supabase error deleting account:', deleteErr);
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    // 3. Clean up target_account_ids on draft/scheduled posts targeting this channel
    try {
      const { data: affectedPosts } = await client
        .from('posts')
        .select('id, target_account_ids')
        .contains('target_account_ids', [accountId]);

      if (affectedPosts && affectedPosts.length > 0) {
        for (const post of affectedPosts) {
          const updatedTargets = (post.target_account_ids || []).filter((id: string) => id !== accountId);
          await client
            .from('posts')
            .update({ target_account_ids: updatedTargets })
            .eq('id', post.id);
        }
      }
    } catch (postCleanupErr) {
      console.warn('[Channel Delete] Post target cleanup notice:', postCleanupErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Channel disconnected, stored tokens purged, and pending queues updated.',
    });
  } catch (error: any) {
    console.error('[Channel Delete] Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete channel' }, { status: 500 });
  }
}
