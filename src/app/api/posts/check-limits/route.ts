import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/subscription';
import { DatabaseService } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId = '',
      email = '',
      workspaceId = '',
      targetAccountIds = [],
      scheduledFor,
      excludePostId,
    } = body;

    if (!Array.isArray(targetAccountIds) || targetAccountIds.length === 0) {
      return NextResponse.json(
        { allowed: false, error: 'targetAccountIds is required' },
        { status: 400 }
      );
    }

    const accounts = await DatabaseService.getAccounts(workspaceId, userId);
    const existingPosts = await DatabaseService.getPosts(userId, workspaceId);

    const check = await SubscriptionService.checkCanPublishOrSchedulePosts({
      userId,
      email,
      targetAccountIds,
      existingPosts,
      accounts,
      excludePostId,
      scheduledFor,
    });

    if (!check.allowed) {
      return NextResponse.json(
        {
          allowed: false,
          reason: check.reason,
          blockedAccounts: check.blockedAccounts,
          usageSummary: check.usageSummary,
          planId: check.planId,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      allowed: true,
      blockedAccounts: [],
      allowedAccountIds: check.allowedAccountIds,
      usageSummary: check.usageSummary,
      planId: check.planId,
    });
  } catch (err: any) {
    console.error('[CheckLimitsAPI] Error:', err);
    return NextResponse.json(
      { allowed: false, error: err?.message || 'Failed to check limits' },
      { status: 500 }
    );
  }
}
