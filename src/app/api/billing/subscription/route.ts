import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/subscription';
import { DatabaseService } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || '';
    const email = searchParams.get('email') || '';
    const workspaceId = searchParams.get('workspaceId') || '';

    const subscription = await SubscriptionService.getUserSubscription(userId, email);
    const accounts = await DatabaseService.getAccounts(workspaceId, userId);
    const posts = await DatabaseService.getPosts(userId, workspaceId);

    const connectedChannelsCount = accounts.filter(
      (a) => a.status === 'connected' || !a.status
    ).length;

    const scheduledPosts = posts.filter((p) => p.status === 'scheduled');
    const scheduledPostsCount = scheduledPosts.length;

    // Calculate scheduled posts per channel for Free plan breakdown
    const channelUsage: Record<string, { name: string; platform: string; scheduledCount: number; limit: number }> = {};
    for (const acc of accounts) {
      const count = scheduledPosts.filter((p) => (p.targetAccountIds || []).includes(acc.id)).length;
      channelUsage[acc.id] = {
        name: acc.displayName || acc.username,
        platform: acc.platform,
        scheduledCount: count,
        limit: subscription.planId === 'pro' ? -1 : 5,
      };
    }

    const channelLimit = subscription.planId === 'pro' ? subscription.channelsCount : 3;
    const canConnectMore = connectedChannelsCount < channelLimit;

    return NextResponse.json({
      success: true,
      subscription,
      usage: {
        channels: {
          connected: connectedChannelsCount,
          limit: channelLimit,
          canConnectMore,
        },
        scheduledPosts: {
          total: scheduledPostsCount,
          perChannelLimit: subscription.planId === 'pro' ? -1 : 5,
          byChannel: channelUsage,
        },
      },
    });
  } catch (err: any) {
    console.error('[BillingSubscriptionAPI] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
