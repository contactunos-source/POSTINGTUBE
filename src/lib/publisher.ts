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
      status: 'success' | 'failed' | 'pending' | 'action_required';
      platform?: string;
      accountName?: string;
      externalPostId?: string;
      externalPostUrl?: string;
      errorMessage?: string;
      actionType?: string;
      publishedAt?: string;
      timestamp?: string;
    }
  >;
}

export interface PublishProgressUpdate {
  accountId: string;
  account: SocialAccount;
  status: 'waiting' | 'publishing' | 'success' | 'failed';
  currentStep: number;
  totalSteps: number;
  publishedCount: number;
  failedCount: number;
  statusMessage: string;
  results: PublishExecutionSummary['results'];
}

export type PublishProgressCallback = (update: PublishProgressUpdate) => void;

// In-memory mutex to prevent simultaneous concurrent publishing of the exact same post
const activePublishingPosts = new Set<string>();

/**
 * Execute publishing across all target accounts for a post.
 * Features sequential execution, real-time progress callbacks, strict idempotency,
 * and clear failure statuses for unsupported platform actions like YouTube image posting.
 */
export async function executePostPublish(
  post: Post,
  accounts: SocialAccount[],
  onProgress?: PublishProgressCallback
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

    // Notify initial state: all accounts queued
    targetAccounts.forEach((account, idx) => {
      onProgress?.({
        accountId: account.id,
        account,
        status: results[account.id]?.status === 'success' ? 'success' : 'waiting',
        currentStep: idx,
        totalSteps: targetAccounts.length,
        publishedCount,
        failedCount,
        statusMessage: 'In publishing queue...',
        results,
      });
    });

    // 5. Execute destination accounts sequentially with real-time progress updates
    for (let i = 0; i < targetAccounts.length; i++) {
      const account = targetAccounts[i];

      // Strict Idempotency: If this account already published successfully in a previous run, do NOT publish again!
      if (results[account.id]?.status === 'success') {
        publishedCount++;
        onProgress?.({
          accountId: account.id,
          account,
          status: 'success',
          currentStep: i + 1,
          totalSteps: targetAccounts.length,
          publishedCount,
          failedCount,
          statusMessage: `Already published to ${account.displayName || account.username}`,
          results,
        });
        continue;
      }

      const dispatchStartTime = Date.now();
      const attemptedAt = new Date().toISOString();

      // Notify progress: account publishing started
      onProgress?.({
        accountId: account.id,
        account,
        status: 'publishing',
        currentStep: i + 1,
        totalSteps: targetAccounts.length,
        publishedCount,
        failedCount,
        statusMessage: `Publishing to ${account.displayName || account.platform}...`,
        results,
      });

      try {
        const adapter = getAdapterForPlatform(account.platform);
        const override =
          post.accountOverrides?.[account.id] ||
          post.platformOverrides?.[account.id] ||
          post.platformOverrides?.[account.platform];

        // Build effective post for platform/account with its specific media & format overrides
        const effectivePost: Post = {
          ...post,
          media: override?.media && override.media.length > 0 ? override.media : post.media,
          postType: (override?.postType as any) || post.postType,
        };

        // Validate post for this specific platform
        const validation = adapter.validatePost(effectivePost, override);
        if (!validation.valid) {
          failedCount++;
          results[account.id] = {
            status: 'failed',
            platform: account.platform,
            accountName: account.displayName || account.username,
            errorMessage: validation.errors.join('; '),
            timestamp: attemptedAt,
          };
          onProgress?.({
            accountId: account.id,
            account,
            status: 'failed',
            currentStep: i + 1,
            totalSteps: targetAccounts.length,
            publishedCount,
            failedCount,
            statusMessage: `Validation failed: ${validation.errors.join('; ')}`,
            results,
          });
          continue;
        }

        // Execute platform adapter
        const res: PublishResult = await adapter.publish(account, effectivePost, override);
        const latencyMs = Date.now() - dispatchStartTime;
        const finishedAt = new Date().toISOString();

        if (res.isAssistedCommunityPost) {
          // Official YouTube Data API v3 does not permit direct 3rd-party image posting.
          // Clearly mark as failed with explanation so user sees red status and can use manual Community link.
          failedCount++;
          results[account.id] = {
            status: 'failed',
            platform: account.platform,
            accountName: account.displayName || account.username,
            externalPostUrl: res.externalPostUrl,
            errorMessage:
              'Official YouTube Data API v3 does not permit direct 3rd-party image publishing. Use YouTube Studio or the manual Community tab.',
            actionType: 'community_assist',
            timestamp: finishedAt,
          };
          onProgress?.({
            accountId: account.id,
            account,
            status: 'failed',
            currentStep: i + 1,
            totalSteps: targetAccounts.length,
            publishedCount,
            failedCount,
            statusMessage: 'Direct image posting unsupported by YouTube API',
            results,
          });
          console.warn(
            `[Assisted YouTube Community] Post #${post.id} -> ${account.displayName}: Marked as failed for direct API posting with manual fallback.`
          );
        } else if (res.success) {
          publishedCount++;
          results[account.id] = {
            status: 'success',
            platform: account.platform,
            accountName: account.displayName || account.username,
            externalPostId: res.externalPostId,
            externalPostUrl: res.externalPostUrl,
            publishedAt: finishedAt,
            timestamp: finishedAt,
          };
          onProgress?.({
            accountId: account.id,
            account,
            status: 'success',
            currentStep: i + 1,
            totalSteps: targetAccounts.length,
            publishedCount,
            failedCount,
            statusMessage: `Published successfully to ${account.displayName || account.platform}`,
            results,
          });
          console.info(
            `[Published Successfully] Post #${post.id} -> ${account.displayName} (${account.platform}) in ${latencyMs}ms.`
          );
        } else {
          failedCount++;
          results[account.id] = {
            status: 'failed',
            platform: account.platform,
            accountName: account.displayName || account.username,
            errorMessage: res.errorMessage || 'Unknown publishing failure',
            timestamp: finishedAt,
          };
          onProgress?.({
            accountId: account.id,
            account,
            status: 'failed',
            currentStep: i + 1,
            totalSteps: targetAccounts.length,
            publishedCount,
            failedCount,
            statusMessage: res.errorMessage || 'Publishing failed',
            results,
          });
          console.warn(
            `[Publish Failed] Post #${post.id} -> ${account.displayName} (${account.platform}): ${res.errorMessage}`
          );
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
        onProgress?.({
          accountId: account.id,
          account,
          status: 'failed',
          currentStep: i + 1,
          totalSteps: targetAccounts.length,
          publishedCount,
          failedCount,
          statusMessage: message,
          results,
        });
        console.error(`[Publish Exception] Post #${post.id} -> ${account.displayName}:`, err);
      }
    }

    let overallStatus: PostStatus = 'published';
    if (publishedCount === 0 && failedCount > 0) {
      overallStatus = 'failed';
    } else if (failedCount > 0 && publishedCount > 0) {
      // Partial success: marked as partially_published so failures are clearly visible
      overallStatus = 'partially_published';
    } else if (publishedCount === 0 && failedCount === 0) {
      overallStatus = 'draft';
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
