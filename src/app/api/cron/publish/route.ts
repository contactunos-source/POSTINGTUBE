import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Scheduled Publishing Cron Worker
 * Can be triggered by Supabase pg_cron, Vercel Cron, or internal scheduler.
 * Finds all posts due for publishing and executes multi-platform API dispatch concurrently.
 */
async function handlePublishCron(req: NextRequest) {
  try {
    const now = new Date().toISOString();
    let publishedCount = 0;
    let failedCount = 0;
    const logs: string[] = [];

    // 1. If Supabase is connected, query from PostgreSQL database
    if (supabase) {
      const { data: duePosts, error } = await supabase
        .from('posts')
        .select('*')
        .eq('status', 'scheduled')
        .lte('scheduled_for', now);

      if (error) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            hint: 'Ensure posts table exists in Supabase.',
          },
          { status: 200 }
        );
      }

      // Determine application base URL reliably
      const host = req.headers.get('host') || 'localhost:3000';
      const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
      const appUrl =
        process.env.APP_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        `${proto}://${host}`;

      for (const post of duePosts || []) {
        // Atomic lock to guarantee single worker execution across concurrent invocations
        const { data: lockedRows, error: lockErr } = await supabase
          .from('posts')
          .update({ status: 'publishing', updated_at: new Date().toISOString() })
          .eq('id', post.id)
          .eq('status', 'scheduled')
          .select('id');

        if (lockErr || !lockedRows || lockedRows.length === 0) {
          // Another worker or active browser tab has already claimed this post
          continue;
        }

        let accounts: any[] = [];

        if (post.target_account_ids && post.target_account_ids.length > 0) {
          const { data: accs } = await supabase
            .from('connected_accounts')
            .select('*')
            .in('id', post.target_account_ids);
          if (accs && accs.length > 0) {
            accounts = accs;
          }
        }

        // Fallback default accounts if none specifically loaded
        if (accounts.length === 0) {
          if (process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
            accounts.push({
              id: 'fb_default',
              platform: 'facebook',
              page_id: process.env.FACEBOOK_PAGE_ID || '868941086292404',
              access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
              display_name: process.env.FACEBOOK_PAGE_NAME || 'U NOS Digital marketing',
            });
          }
        }

        // Deduplicate accounts by unique platform destination
        const seenDestinations = new Set<string>();
        const uniqueAccounts: any[] = [];
        for (const acc of accounts) {
          const destKey = `${acc.platform}_${acc.external_id || acc.page_id || acc.id}`;
          if (seenDestinations.has(destKey)) continue;
          seenDestinations.add(destKey);
          uniqueAccounts.push(acc);
        }

        const mediaUrl = post.media && post.media.length > 0 ? post.media[0].url : undefined;
        const postResults: Record<string, any> = { ...(post.results || {}) };
        let postSuccessCount = 0;
        let postFailCount = 0;

        // Concurrent multi-platform publishing dispatch
        await Promise.allSettled(
          uniqueAccounts.map(async (account) => {
            // Idempotency: skip destinations that have already succeeded
            if (postResults[account.id]?.status === 'success') {
              postSuccessCount++;
              return;
            }

            const startTime = Date.now();
            const accountOverride =
              post.platform_overrides?.[account.id] ||
              post.platform_overrides?.account_overrides?.[account.id] ||
              post.platform_overrides?.[account.platform] ||
              {};

            try {
              if (account.platform === 'facebook') {
                const res = await fetch(`${appUrl}/api/facebook/publish`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    pageId: account.page_id || account.id,
                    accessToken: account.access_token,
                    message: accountOverride.caption || post.content,
                    mediaUrl,
                    postType: post.post_type,
                  }),
                });
                const data = await res.json();
                const latency = Date.now() - startTime;
                if (data.success) {
                  postSuccessCount++;
                  publishedCount++;
                  postResults[account.id] = {
                    status: 'success',
                    platform: 'facebook',
                    accountName: account.display_name || account.username,
                    externalPostId: data.postId,
                    externalPostUrl: data.postUrl,
                    publishedAt: new Date().toISOString(),
                    timestamp: new Date().toISOString(),
                    latencyMs: latency,
                  };
                  logs.push(`Published post #${post.id} to Facebook (${data.postId}) in ${latency}ms`);
                } else {
                  postFailCount++;
                  failedCount++;
                  postResults[account.id] = {
                    status: 'failed',
                    platform: 'facebook',
                    accountName: account.display_name || account.username,
                    errorMessage: data.error || 'Failed to publish to Facebook',
                    timestamp: new Date().toISOString(),
                    latencyMs: latency,
                  };
                  logs.push(`Failed post #${post.id} on Facebook: ${data.error}`);
                }
              } else if (account.platform === 'instagram') {
                const res = await fetch(`${appUrl}/api/instagram/publish`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    igUserId: account.external_id || account.page_id || account.id,
                    accessToken: account.access_token,
                    caption: accountOverride.caption || post.content,
                    mediaUrl,
                    postType: post.post_type,
                  }),
                });
                const data = await res.json();
                const latency = Date.now() - startTime;
                if (data.success) {
                  postSuccessCount++;
                  publishedCount++;
                  postResults[account.id] = {
                    status: 'success',
                    platform: 'instagram',
                    accountName: account.display_name || account.username,
                    externalPostId: data.postId,
                    externalPostUrl: data.postUrl,
                    publishedAt: new Date().toISOString(),
                    timestamp: new Date().toISOString(),
                    latencyMs: latency,
                  };
                  logs.push(`Published post #${post.id} to Instagram (${data.postId}) in ${latency}ms`);
                } else {
                  postFailCount++;
                  failedCount++;
                  postResults[account.id] = {
                    status: 'failed',
                    platform: 'instagram',
                    accountName: account.display_name || account.username,
                    errorMessage: data.error || 'Failed to publish to Instagram',
                    timestamp: new Date().toISOString(),
                    latencyMs: latency,
                  };
                  logs.push(`Failed post #${post.id} on Instagram: ${data.error}`);
                }
              } else if (account.platform === 'youtube') {
                const res = await fetch(`${appUrl}/api/youtube/publish`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    channelId: account.external_id || account.page_id || account.id,
                    accessToken: account.access_token,
                    refreshToken: account.refresh_token,
                    title: accountOverride.title || post.platform_overrides?.youtube?.title || post.content.split('\n')[0] || 'Scheduled Video',
                    description: accountOverride.caption || post.platform_overrides?.youtube?.caption || post.content,
                    tags: accountOverride.tags || post.platform_overrides?.youtube?.tags || post.tags || [],
                    mediaUrl,
                    thumbnailUrl: accountOverride.thumbnailUrl || post.platform_overrides?.youtube?.thumbnailUrl || post.media?.[0]?.thumbnailUrl,
                    scheduledTimestamp: post.scheduled_for,
                    postType: post.post_type,
                    categoryId: accountOverride.categoryId || post.platform_overrides?.youtube?.categoryId || '22',
                    madeForKids: accountOverride.madeForKids ?? post.platform_overrides?.youtube?.madeForKids ?? false,
                    privacyStatus: accountOverride.privacyStatus || post.platform_overrides?.youtube?.privacyStatus || 'public',
                    playlistId: accountOverride.playlistId || post.platform_overrides?.youtube?.playlistId,
                    recordingDate: accountOverride.recordingDate || post.platform_overrides?.youtube?.recordingDate,
                    videoLocation: accountOverride.videoLocation || post.platform_overrides?.youtube?.videoLocation,
                  }),
                });
                const data = await res.json();
                const latency = Date.now() - startTime;
                if (data.success) {
                  postSuccessCount++;
                  publishedCount++;
                  postResults[account.id] = {
                    status: 'success',
                    platform: 'youtube',
                    accountName: account.display_name || account.username,
                    externalPostId: data.videoId,
                    externalPostUrl: data.videoUrl,
                    publishedAt: new Date().toISOString(),
                    timestamp: new Date().toISOString(),
                    latencyMs: latency,
                  };
                  logs.push(`Published post #${post.id} to YouTube (${data.videoId}) in ${latency}ms`);
                } else {
                  postFailCount++;
                  failedCount++;
                  postResults[account.id] = {
                    status: 'failed',
                    platform: 'youtube',
                    accountName: account.display_name || account.username,
                    errorMessage: data.error || 'Failed to publish to YouTube',
                    timestamp: new Date().toISOString(),
                    latencyMs: latency,
                  };
                  logs.push(`Failed post #${post.id} on YouTube: ${data.error}`);
                }
              }
            } catch (channelErr: unknown) {
              postFailCount++;
              failedCount++;
              const msg = channelErr instanceof Error ? channelErr.message : 'Channel publish failed';
              logs.push(`Error on post #${post.id}: ${msg}`);
            }
          })
        );

        // Update post status in Supabase
        const overallStatus = postSuccessCount > 0 ? 'published' : postFailCount > 0 ? 'failed' : 'published';
        await supabase
          .from('posts')
          .update({
            status: overallStatus,
            published_at: postSuccessCount > 0 ? now : null,
            results: postResults,
            updated_at: new Date().toISOString(),
          })
          .eq('id', post.id);

        await supabase
          .from('scheduled_jobs')
          .update({
            status: postSuccessCount > 0 ? 'completed' : 'failed',
            last_error: postFailCount > 0 ? 'Publishing failure recorded in post results' : null,
            updated_at: now,
          })
          .eq('post_id', post.id);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now,
      publishedCount,
      failedCount,
      logs,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Cron execution failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handlePublishCron(req);
}

export async function POST(req: NextRequest) {
  return handlePublishCron(req);
}
