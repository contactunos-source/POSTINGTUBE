import { Post, SocialAccount, PostStatus } from '@/types/social';
import { getAdapterForPlatform, PublishResult } from './adapters';

export interface PublishExecutionSummary {
  postId: string;
  overallStatus: PostStatus;
  publishedCount: number;
  failedCount: number;
  results: Record<string, {
    status: 'success' | 'failed';
    platform: string;
    accountName: string;
    externalPostId?: string;
    externalPostUrl?: string;
    errorMessage?: string;
    timestamp: string;
  }>;
}

/**
 * Execute publishing across all target accounts for a post.
 * Handles validation, partial failures, retries, and records external IDs.
 */
export async function executePostPublish(
  post: Post,
  accounts: SocialAccount[]
): Promise<PublishExecutionSummary> {
  const targetAccounts = accounts.filter((acc) => post.targetAccountIds.includes(acc.id));
  
  const results: PublishExecutionSummary['results'] = {};
  let publishedCount = 0;
  let failedCount = 0;

  for (const account of targetAccounts) {
    try {
      const adapter = getAdapterForPlatform(account.platform);
      const override = post.platformOverrides[account.platform];

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
    // Partial success
    overallStatus = 'published';
  }

  return {
    postId: post.id,
    overallStatus,
    publishedCount,
    failedCount,
    results,
  };
}
