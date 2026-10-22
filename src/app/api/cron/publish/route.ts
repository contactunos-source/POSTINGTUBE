import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Scheduled Publishing Cron Worker
 * Can be triggered by Supabase pg_cron, Vercel Cron, or internal scheduler.
 * Finds all posts due for publishing and executes platform API dispatch.
 */
export async function GET(req: NextRequest) {
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
        // If table doesn't exist yet, return friendly note
        return NextResponse.json({
          success: false,
          error: error.message,
          hint: 'Run supabase/schema.sql in your Supabase SQL editor to create the tables.',
        }, { status: 200 });
      }

      for (const post of duePosts || []) {
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

        // Fallback to default Facebook Page if no specific accounts attached
        if (accounts.length === 0 && process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
          accounts = [{
            platform: 'facebook',
            page_id: process.env.FACEBOOK_PAGE_ID || '868941086292404',
            access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
            display_name: process.env.FACEBOOK_PAGE_NAME || 'U NOS Digital marketing'
          }];
        }

        for (const account of accounts) {
          if (account.platform === 'facebook' && account.access_token) {
            try {
              const mediaUrl = post.media && post.media.length > 0 ? post.media[0].url : undefined;
              const appUrl =
                process.env.APP_URL ||
                process.env.NEXT_PUBLIC_APP_URL ||
                (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

              const publishRes = await fetch(`${appUrl}/api/facebook/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  pageId: account.page_id || account.id,
                  accessToken: account.access_token,
                  message: post.content,
                  mediaUrl,
                  postType: post.post_type,
                }),
              });

              const data = await publishRes.json();
              if (data.success && data.postId) {
                publishedCount++;
                logs.push(`Published post #${post.id} to Facebook Page ${account.display_name} (ID: ${data.postId})`);
              } else {
                failedCount++;
                logs.push(`Failed post #${post.id}: ${data.error || 'Unknown error'}`);
              }
            } catch (err: unknown) {
              failedCount++;
              logs.push(`Error posting #${post.id}: ${err instanceof Error ? err.message : 'Unknown'}`);
            }
          }
        }

        // Update post status in Supabase
        await supabase
          .from('posts')
          .update({
            status: failedCount > 0 && publishedCount === 0 ? 'failed' : 'published',
            published_at: now,
          })
          .eq('id', post.id);
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
