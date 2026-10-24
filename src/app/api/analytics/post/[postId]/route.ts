import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService, mapDbPostToPost, DEFAULT_WORKSPACE_ID } from '@/lib/db';
import { fetchAllMetricsForPost } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { Post } from '@/types/social';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const url = new URL(req.url);
    const workspaceIdParam = url.searchParams.get('workspaceId');
    const refresh = url.searchParams.get('refresh') === 'true';

    let targetPost: Post | null = null;
    let effectiveWsId = workspaceIdParam || DEFAULT_WORKSPACE_ID;

    if (supabase) {
      const { data: postRow } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (postRow) {
        targetPost = mapDbPostToPost(postRow);
        effectiveWsId = postRow.workspace_id || effectiveWsId;
      }
    }

    if (!targetPost) {
      const cached = await DatabaseService.getPosts(effectiveWsId);
      targetPost = cached.find((p) => p.id === postId) || null;
    }

    if (!targetPost) {
      return NextResponse.json({ error: `Post #${postId} not found` }, { status: 404 });
    }

    if (refresh && targetPost.status === 'published') {
      let accounts = await DatabaseService.getAccounts(effectiveWsId);
      if (accounts.length === 0 && supabase) {
        const { data: dbAccs } = await supabase.from('connected_accounts').select('*');
        if (dbAccs && dbAccs.length > 0) {
          accounts = dbAccs.map((a: any) => ({
            id: a.id,
            platform: a.platform,
            username: a.username,
            displayName: a.display_name,
            avatarUrl: a.avatar_url || '',
            accountType: a.account_type,
            accessToken: a.access_token,
            refreshToken: a.refresh_token,
            tokenExpiresAt: a.token_expires_at,
            pageId: a.page_id,
            status: a.status || 'connected',
            followersCount: a.followers_count || 0,
            externalId: a.page_id || a.id,
          }));
        }
      }

      const metricsMap = await fetchAllMetricsForPost(targetPost, accounts);
      const updatedPost = await DatabaseService.savePostAnalytics(targetPost.id, metricsMap, effectiveWsId);
      return NextResponse.json({
        success: true,
        postId,
        analytics: metricsMap,
        refreshedPost: updatedPost || targetPost,
      });
    }

    // Return existing analytics
    const analytics = targetPost.analytics || Object.fromEntries(
      Object.entries(targetPost.results || {})
        .filter(([, r]) => r?.analytics)
        .map(([k, r]) => [k, r.analytics])
    );

    return NextResponse.json({
      success: true,
      postId,
      analytics,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch analytics for post' },
      { status: 500 }
    );
  }
}
