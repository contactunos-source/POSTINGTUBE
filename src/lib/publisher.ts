import { Post, SocialAccount, PostStatus } from '@/types/social';
import { getAdapterForPlatform, PublishResult } from './adapters';

export interface PublishExecutionSummary {
  postId: string;
  overallStatus: PostStatus;
  publishedCount: number;
  failedCount: number;
  results: Record<
    string,
    {
      status: 'success' | 'failed' | 'pending';
      platform?: string;
      accountName?: string;
      externalPostId?: string;
      externalPostUrl?: string;
      errorMessage?: string;
      publishedAt?: string;
      timestamp?: string;
    }
  >;
}

// In-memory mutex to prevent simultaneous concurrent publishing of the exact same post
const activePublishingPosts = new Set<string>();

/**
 * Execute publishing across all target accounts for a post.
 * Features strict idempotency, duplicate prevention, and per-destination isolation.
 */
export async function executePostPublish(
  post: Post,
  accounts: SocialAccount[]
): Promise<PublishExecutionSummary> {
  // 1. Guard against concurrent worker / interval executions
  if (activePublishingPosts.has(post.id)) {
    console.warn(`[Duplicate Prevention] Post #${post.id} is already in-flight. Skipping duplicate invocation.`);
    return {
      postId: post.id,
      overallStatus: 'publishing',
      publishedCount: Object.values(post.results || {}).filter((r) => r.status === 'success').length,
      failedCount: 0,
      results: post.results || {},
    };
  }

  activePublishingPosts.add(post.id);

  try {
    // 2. Deduplicate target account IDs
    const uniqueTargetAccountIds = Array.from(new Set(post.targetAccountIds || []));

    // 3. Resolve accounts and deduplicate by external destination (prevents duplicate page / account postings)
    const seenDestinations = new Set<string>();
    const targetAccounts: SocialAccount[] = [];

    for (const accId of uniqueTargetAccountIds) {
      const acc = accounts.find((a) => a.id === accId);
      if (!acc) continue;

      const destinationKey = `${acc.platform}_${acc.externalId || acc.pageId || acc.id}`;
      if (seenDestinations.has(destinationKey)) {
        console.warn(`[Duplicate Prevention] Duplicate destination account detected (${destinationKey}). Skipping duplicate.`);
        continue;
      }
      seenDestinations.add(destinationKey);
      targetAccounts.push(acc);
    }

    // 4. Carry forward any previous successful results (Idempotent publishing)
    const results: PublishExecutionSummary['results'] = { ...(post.results || {}) };
    let publishedCount = 0;
    let failedCount = 0;

    for (const account of targetAccounts) {
      // If this account already published successfully in a previous run, do NOT publish again!
      if (results[account.id]?.status === 'success') {
        publishedCount++;
        console.info(`[Idempotency] Account ${account.displayName || account.username} already published for post #${post.id}. Skipping.`);
        continue;
      }

      try {
        const adapter = getAdapterForPlatform(account.platform);
        const override = post.platformOverrides?.[account.platform];

        // Validate post for this specific platform
        const validation = adapter.validatePost(post, override);
        if (!validation.valid) {
          failedCount++;
          results[account.id] = {
            status: 'failed',
            platform: account.platform,
            accountName: account.displayName || account.username,
            errorMessage: validation.errors.join('; '),
            timestamp: new Date().toISOString(),
          };
          continue;
        }

        // Execute platform adapter
        const res: PublishResult = await adapter.publish(account, post, override);

        if (res.success) {
          publishedCount++;
          results[account.id] = {
            status: 'success',
            platform: account.platform,
            accountName: account.displayName || account.username,
            externalPostId: res.externalPostId,
            externalPostUrl: res.externalPostUrl,
            timestamp: new Date().toISOString(),
          };
        } else {
          failedCount++;
          results[account.id] = {
            status: 'failed',
            platform: account.platform,
            accountName: account.displayName || account.username,
            errorMessage: res.errorMessage || 'Unknown publishing failure',
            timestamp: new Date().toISOString(),
          };
        }
      } catch (err: unknown) {
        failedCount++;
        const message = err instanceof Error ? err.message : 'Publishing execution failed';
        results[account.id] = {
          status: 'failed',
          platform: account.platform,
          accountName: account.displayName || account.username,
          errorMessage: message,
          timestamp: new Date().toISOString(),
        };
      }
    }

    let overallStatus: PostStatus = 'published';
    if (publishedCount === 0 && failedCount > 0) {
      overallStatus = 'failed';
    } else if (failedCount > 0) {
      // Partial success: keep as published so completed platforms are preserved
      overallStatus = 'published';
    }

    return {
      postId: post.id,
      overallStatus,
      publishedCount,
      failedCount,
      results,
    };
  } finally {
    activePublishingPosts.delete(post.id);
  }
}
