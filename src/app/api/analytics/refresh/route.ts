import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService, mapDbPostToPost, mapDbAccountToAccount, DEFAULT_WORKSPACE_ID } from '@/lib/db';
import { fetchAllMetricsForPost } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { Post, SocialAccount } from '@/types/social';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { postId, workspaceId } = body;

    if (postId) {
      // 1. Find post directly in Supabase or cache
      let targetPost: Post | null = null;
      let effectiveWsId = workspaceId || DEFAULT_WORKSPACE_ID;

      if (supabase) {
        const { data: postRow, error } = await supabase
          .from('posts')
          .select('*')
          .eq('id', postId)
          .single();

        if (!error && postRow) {
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

      if (targetPost.status !== 'published') {
        return NextResponse.json(
          { error: `Post #${postId} is not published yet (${targetPost.status})` },
          { status: 400 }
        );
      }

      // 2. Fetch connected accounts
      const accounts = await DatabaseService.getAccounts(effectiveWsId);

      // 3. Fetch real-time analytics using official platform APIs
      const metricsMap = await fetchAllMetricsForPost(targetPost, accounts);

      // 4. Persist to Supabase and cache
      await DatabaseService.savePostAnalytics(targetPost.id, metricsMap, effectiveWsId);

      return NextResponse.json({
        success: true,
        postId: targetPost.id,
        analytics: metricsMap,
      });
    }

    // Refresh multiple published posts in workspace
    const effectiveWsId = workspaceId || DEFAULT_WORKSPACE_ID;
    const [accounts, allPosts] = await Promise.all([
      DatabaseService.getAccounts(effectiveWsId),
      DatabaseService.getPosts(effectiveWsId),
    ]);

    const publishedPosts = allPosts
      .filter((p) => p.status === 'published' && p.results && Object.keys(p.results).length > 0)
      .slice(0, 15);

    const updatedResultsMap: Record<string, any> = {};

    for (const post of publishedPosts) {
      try {
        const metricsMap = await fetchAllMetricsForPost(post, accounts);
        await DatabaseService.savePostAnalytics(post.id, metricsMap, effectiveWsId);
        updatedResultsMap[post.id] = metricsMap;
      } catch (postErr) {
        console.warn(`[Analytics API] Error fetching metrics for post #${post.id}:`, postErr);
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount: Object.keys(updatedResultsMap).length,
      analytics: updatedResultsMap,
    });
  } catch (err: any) {
    console.error('[API /api/analytics/refresh] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to refresh post analytics' },
      { status: 500 }
    );
  }
}
