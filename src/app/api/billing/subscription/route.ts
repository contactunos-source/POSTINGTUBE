import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService, OFFICIAL_PLANS } from '@/lib/subscription';
import { DatabaseService } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || '';
    const email = searchParams.get('email') || '';
    const workspaceId = searchParams.get('workspaceId') || '';

    const subscription = await SubscriptionService.getUserSubscription(userId, email);
    const accounts = await DatabaseService.getAccounts(workspaceId, userId);
    const posts = await DatabaseService.getPosts(userId, workspaceId);
    const transactions = await SubscriptionService.getUserTransactions(userId, email);

    const connectedChannelsCount = accounts.filter(
      (a) => a.status === 'connected' || !a.status
    ).length;

    const scheduledPosts = posts.filter((p) => p.status === 'scheduled');
    const scheduledPostsCount = scheduledPosts.length;

    // Calculate monthly post usage for current calendar month
    const monthlyUsage = SubscriptionService.calculateMonthlyUsage(
      posts,
      accounts,
      subscription.planId
    );

    const planConfig = OFFICIAL_PLANS[subscription.planId] || OFFICIAL_PLANS.free;
    const channelLimit = subscription.channelsLimit || subscription.channelsCount || planConfig.channelsLimit;
    const canConnectMore = connectedChannelsCount < channelLimit;

    // Breakdown per channel for UI
    const channelUsage: Record<string, { name: string; platform: string; scheduledCount: number; limit: number }> = {};
    for (const acc of accounts) {
      const count = scheduledPosts.filter((p) => (p.targetAccountIds || []).includes(acc.id)).length;
      channelUsage[acc.id] = {
        name: acc.displayName || acc.username,
        platform: acc.platform,
        scheduledCount: count,
        limit: planConfig.monthlyPostsLimit,
      };
    }

    return NextResponse.json({
      success: true,
      subscription,
      planConfig,
      transactions,
      usage: {
        channels: {
          connected: connectedChannelsCount,
          limit: channelLimit,
          canConnectMore,
        },
        monthlyPosts: {
          totalUsed: monthlyUsage.totalPostsUsed,
          totalLimit: monthlyUsage.totalPostsLimit, // 30 for Free, -1 for paid plans
          remaining: monthlyUsage.remainingPosts ?? Math.max(0, (monthlyUsage.totalPostsLimit === -1 ? 999999 : 30) - monthlyUsage.totalPostsUsed),
          monthLabel: monthlyUsage.monthLabel,
          resetsAt: monthlyUsage.resetsAt,
          isLimitReached: monthlyUsage.isLimitReached,
          byChannel: monthlyUsage.accounts,
        },
        scheduledPosts: {
          total: scheduledPostsCount,
          limit: planConfig.monthlyPostsLimit,
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
