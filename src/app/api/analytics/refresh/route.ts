import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService, mapDbPostToPost, mapDbAccountToAccount, DEFAULT_WORKSPACE_ID } from '@/lib/db';
import { fetchAllMetricsForPost } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { Post, SocialAccount } from '@/types/social';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { postId, workspaceId } = body;

    // 1. Resilient Account Loader: Query connected accounts from Supabase
    let accounts: SocialAccount[] = [];
    if (supabase) {
      try {
        let accQuery = supabase.from('connected_accounts').select('*');
        if (workspaceId) {
          accQuery = accQuery.eq('workspace_id', workspaceId);
        }
        const { data: accRows } = await accQuery;
        if (accRows && accRows.length > 0) {
          accounts = accRows.map(mapDbAccountToAccount);
        } else if (workspaceId) {
          // If no accounts found in this workspace, query all connected accounts as fallback
          const { data: allAccs } = await supabase.from('connected_accounts').select('*');
          if (allAccs && allAccs.length > 0) {
            accounts = allAccs.map(mapDbAccountToAccount);
          }
        }
      } catch (accErr) {
        console.warn('[Analytics API] DB account query error:', accErr);
      }
    }

    if (accounts.length === 0) {
      accounts = await DatabaseService.getAccounts(workspaceId || DEFAULT_WORKSPACE_ID);
    }

    // SCENARIO A: Refresh a Single Post
    if (postId) {
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

      // Fetch real-time analytics using official platform APIs
      const metricsMap = await fetchAllMetricsForPost(targetPost, accounts);

      // Persist to Supabase and cache
      const updatedPost = await DatabaseService.savePostAnalytics(
        targetPost.id,
        metricsMap,
        effectiveWsId
      );

      return NextResponse.json({
        success: true,
        postId: targetPost.id,
        analytics: metricsMap,
        refreshedPost: updatedPost || targetPost,
      });
    }

    // SCENARIO B: Refresh All Published Posts in Workspace
    const effectiveWsId = workspaceId || DEFAULT_WORKSPACE_ID;
    let publishedPosts: Post[] = [];

    if (supabase) {
      try {
        let postQuery = supabase
          .from('posts')
          .select('*')
          .eq('status', 'published')
          .order('published_at', { ascending: false });

        if (workspaceId) {
          postQuery = postQuery.eq('workspace_id', workspaceId);
        }

        const { data: postRows } = await postQuery;
        if (postRows && postRows.length > 0) {
          publishedPosts = postRows.map(mapDbPostToPost);
        } else if (workspaceId) {
          // Fallback to all published posts across workspaces if none in specific workspace ID
          const { data: fallbackRows } = await supabase
            .from('posts')
            .select('*')
            .eq('status', 'published')
            .order('published_at', { ascending: false });
          if (fallbackRows && fallbackRows.length > 0) {
            publishedPosts = fallbackRows.map(mapDbPostToPost);
          }
        }
      } catch (pErr) {
        console.warn('[Analytics API] DB post query error:', pErr);
      }
    }

    if (publishedPosts.length === 0) {
      const cachedPosts = await DatabaseService.getPosts(effectiveWsId);
      publishedPosts = cachedPosts.filter(
        (p) => p.status === 'published' && p.results && Object.keys(p.results).length > 0
      );
    }

    // Limit to latest 25 published posts for responsive rate-limit-safe execution
    const targetPosts = publishedPosts.slice(0, 25);
    const updatedResultsMap: Record<string, any> = {};
    const refreshedPostsList: Post[] = [];

    for (const post of targetPosts) {
      try {
        const metricsMap = await fetchAllMetricsForPost(post, accounts);
        const updatedPost = await DatabaseService.savePostAnalytics(
          post.id,
          metricsMap,
          post.workspaceId || effectiveWsId
        );
        updatedResultsMap[post.id] = metricsMap;
        if (updatedPost) {
          refreshedPostsList.push(updatedPost);
        }
      } catch (postErr) {
        console.warn(`[Analytics API] Error fetching metrics for post #${post.id}:`, postErr);
      }
    }

    // If some published posts weren't updated in this batch, retain them so frontend list is complete
    const updatedPostIds = new Set(refreshedPostsList.map((p) => p.id));
    for (const post of publishedPosts) {
      if (!updatedPostIds.has(post.id)) {
        refreshedPostsList.push(post);
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount: Object.keys(updatedResultsMap).length,
      analytics: updatedResultsMap,
      refreshedPosts: refreshedPostsList,
    });
  } catch (err: any) {
    console.error('[API /api/analytics/refresh] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to refresh post analytics' },
      { status: 500 }
    );
  }
}
