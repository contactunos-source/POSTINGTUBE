import { Post, SocialAccount, PlatformCaptionOverride } from '@/types/social';

export interface PublishResult {
  success: boolean;
  externalPostId?: string;
  externalPostUrl?: string;
  errorMessage?: string;
  details?: Record<string, unknown>;
}

export interface PlatformAdapter {
  validatePost(post: Post, override?: PlatformCaptionOverride): { valid: boolean; errors: string[] };
  publish(account: SocialAccount, post: Post, override?: PlatformCaptionOverride): Promise<PublishResult>;
  refreshTokens(account: SocialAccount): Promise<{ success: boolean; newExpiry?: string; error?: string }>;
}

// Helper simulating network delays with deterministic responses
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * META ADAPTER (Facebook Pages & Instagram Professional)
 * Official API: Meta Graph API v20.0
 * Endpoint: POST https://graph.facebook.com/v20.0/{page-id}/feed or /{ig-user-id}/media
 */
export const facebookAdapter: PlatformAdapter = {
  validatePost(post, override) {
    const text = override?.caption || post.content;
    const errors: string[] = [];
    if (!text && (!post.media || post.media.length === 0)) {
      errors.push('Facebook requires either text or at least one media asset.');
    }
    return { valid: errors.length === 0, errors };
  },
  async publish(account, post, override) {
    const text = override?.caption || post.content;
    const mediaUrl = post.media && post.media.length > 0 ? post.media[0].url : undefined;
    
    // If a real Page Access Token is configured, make real call to Meta Graph API
    if (account.accessToken) {
      try {
        const response = await fetch('/api/facebook/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pageId: account.pageId || account.externalId || account.id,
            accessToken: account.accessToken,
            message: text,
            mediaUrl,
            postType: post.postType,
            scheduledTimestamp: post.scheduledFor,
          }),
        });

        const data = await response.json();

        if (data.success) {
          return {
            success: true,
            externalPostId: data.postId,
            externalPostUrl: data.postUrl,
            details: data.details,
          };
        } else {
          return {
            success: false,
            errorMessage: `Facebook API Error: ${data.error || 'Failed to publish post'}`,
          };
        }
      } catch (e: unknown) {
        const err = e instanceof Error ? e.message : 'Network error communicating with Facebook API';
        return { success: false, errorMessage: err };
      }
    }

    // If no real token is configured on the account
    return {
      success: false,
      errorMessage: 'No Facebook Page Access Token configured. Please connect your Facebook Page with a valid token in Configuration -> Connections.',
    };
  },
  async refreshTokens(account) {
    await wait(400);
    const expiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    return { success: true, newExpiry: expiry };
  },
};

export const instagramAdapter: PlatformAdapter = {
  validatePost(post, override) {
    const text = override?.caption || post.content;
    const errors: string[] = [];
    if (!post.media || post.media.length === 0) {
      errors.push('Instagram requires at least one image or video container.');
    }
    if (text.length > 2200) {
      errors.push(`Caption exceeds Instagram limit of 2200 characters (Current: ${text.length}).`);
    }
    return { valid: errors.length === 0, errors };
  },
  async publish(account, post, override) {
    const text = override?.caption || post.content;
    const isReel = post.postType === 'reel';
    const mediaUrl = post.media && post.media.length > 0 ? post.media[0].url : undefined;

    // Real API call via Meta Graph API if access token is configured
    if (account.accessToken && mediaUrl) {
      try {
        const response = await fetch('/api/instagram/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            igUserId: account.externalId || account.pageId || account.id.replace(/^ig_/, ''),
            accessToken: account.accessToken,
            caption: text,
            mediaUrl,
            postType: post.postType,
          }),
        });

        const data = await response.json();
        if (data.success) {
          return {
            success: true,
            externalPostId: data.postId,
            externalPostUrl: data.postUrl,
            details: data.details,
          };
        } else {
          return {
            success: false,
            errorMessage: `Instagram API Error: ${data.error || 'Failed to publish to Instagram'}`,
          };
        }
      } catch (e: unknown) {
        const err = e instanceof Error ? e.message : 'Network error communicating with Instagram API';
        return { success: false, errorMessage: err };
      }
    }

    // Default simulation fallback
    await wait(800);
    const simulatedMediaId = `ig_${Date.now()}_${Math.floor(Math.random() * 999999)}`;

    return {
      success: true,
      externalPostId: simulatedMediaId,
      externalPostUrl: `https://instagram.com/p/${simulatedMediaId}`,
      details: {
        type: isReel ? 'reel' : 'feed_post',
        containerId: `container_${simulatedMediaId}`,
        firstCommentSent: !!(override?.firstComment || post.firstComment),
        publishedAt: new Date().toISOString(),
      },
    };
  },
  async refreshTokens(account) {
    await wait(500);
    const expiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    return { success: true, newExpiry: expiry };
  },
};

/**
 * X / TWITTER ADAPTER
 * Official API: X API v2 (POST https://api.x.com/2/tweets)
 */
export const twitterAdapter: PlatformAdapter = {
  validatePost(post, override) {
    const text = override?.caption || post.content;
    const errors: string[] = [];
    if (!text && (!post.media || post.media.length === 0)) {
      errors.push('Tweet must contain text or attached media.');
    }
    if (text.length > 280) {
      errors.push(`Tweet exceeds 280 character limit (Current: ${text.length}). Trim or upgrade to X Premium.`);
    }
    return { valid: errors.length === 0, errors };
  },
  async publish(account, post, override) {
    await wait(600);
    const text = override?.caption || post.content;
    const simulatedTweetId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const handle = account.username.replace('@', '');

    return {
      success: true,
      externalPostId: simulatedTweetId,
      externalPostUrl: `https://x.com/${handle}/status/${simulatedTweetId}`,
      details: {
        textSnippet: text.slice(0, 40),
        mediaIds: post.media?.map((m) => `media_${m.id}`) || [],
      },
    };
  },
  async refreshTokens(account) {
    await wait(400);
    return { success: true, newExpiry: new Date(Date.now() + 7200 * 1000).toISOString() };
  },
};

/**
 * LINKEDIN ADAPTER
 * Official API: LinkedIn Community Management API / Restli v2 posts
 */
export const linkedinAdapter: PlatformAdapter = {
  validatePost(post, override) {
    const text = override?.caption || post.content;
    const errors: string[] = [];
    if (!text && (!post.media || post.media.length === 0)) {
      errors.push('LinkedIn post cannot be blank.');
    }
    if (text.length > 3000) {
      errors.push(`LinkedIn text exceeds 3000 character limit (Current: ${text.length}).`);
    }
    return { valid: errors.length === 0, errors };
  },
  async publish(account, post, override) {
    await wait(700);
    const simulatedUrn = `urn:li:share:${Date.now()}`;
    return {
      success: true,
      externalPostId: simulatedUrn,
      externalPostUrl: `https://www.linkedin.com/feed/update/${simulatedUrn}`,
      details: {
        authorUrn: `urn:li:person:${account.id}`,
        distributionTarget: 'PUBLIC',
      },
    };
  },
  async refreshTokens() {
    await wait(400);
    return { success: true, newExpiry: new Date(Date.now() + 60 * 86400 * 1000).toISOString() };
  },
};

/**
 * YOUTUBE ADAPTER
 * Official API: Google YouTube Data API v3 (POST https://www.googleapis.com/upload/youtube/v3/videos)
 */
export const youtubeAdapter: PlatformAdapter = {
  validatePost(post, override) {
    const errors: string[] = [];
    const hasVideo = post.media?.some((m) => m.type === 'video');
    if (!hasVideo) {
      errors.push('YouTube requires an uploaded video file (MP4/MOV).');
    }
    const title = override?.title || post.content.split('\n')[0];
    if (!title || title.trim().length === 0) {
      errors.push('YouTube requires a video title.');
    }
    return { valid: errors.length === 0, errors };
  },
  async publish(account, post, override) {
    await wait(900);
    const videoId = `yt_${Math.random().toString(36).substring(2, 11)}`;
    return {
      success: true,
      externalPostId: videoId,
      externalPostUrl: `https://youtu.be/${videoId}`,
      details: {
        kind: 'youtube#video',
        snippet: {
          title: override?.title || post.content.split('\n')[0] || 'Scheduled Video',
          categoryId: '22',
        },
      },
    };
  },
  async refreshTokens() {
    await wait(450);
    return { success: true, newExpiry: new Date(Date.now() + 3600 * 1000).toISOString() };
  },
};

/**
 * TIKTOK ADAPTER
 * Official API: TikTok Content Posting API
 */
export const tiktokAdapter: PlatformAdapter = {
  validatePost(post) {
    const errors: string[] = [];
    const hasMedia = post.media && post.media.length > 0;
    if (!hasMedia) {
      errors.push('TikTok requires a video file or photo carousel.');
    }
    return { valid: errors.length === 0, errors };
  },
  async publish(account, post, override) {
    await wait(800);
    const publishId = `tt_publish_${Date.now()}`;
    return {
      success: true,
      externalPostId: publishId,
      externalPostUrl: `https://www.tiktok.com/@${account.username}/video/${publishId}`,
      details: {
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_comment: false,
      },
    };
  },
  async refreshTokens() {
    await wait(400);
    return { success: true, newExpiry: new Date(Date.now() + 86400 * 365 * 1000).toISOString() };
  },
};

/**
 * THREADS ADAPTER
 * Official API: Meta Threads API
 */
export const threadsAdapter: PlatformAdapter = {
  validatePost(post, override) {
    const text = override?.caption || post.content;
    const errors: string[] = [];
    if (text.length > 500) {
      errors.push(`Threads limit is 500 characters (Current: ${text.length}).`);
    }
    return { valid: errors.length === 0, errors };
  },
  async publish(account, post, override) {
    await wait(600);
    const id = `th_${Date.now()}`;
    return {
      success: true,
      externalPostId: id,
      externalPostUrl: `https://threads.net/@${account.username}/post/${id}`,
    };
  },
  async refreshTokens() {
    await wait(400);
    return { success: true };
  },
};

/**
 * BLUESKY ADAPTER
 * Official API: AT Protocol (`com.atproto.repo.createRecord`)
 */
export const blueskyAdapter: PlatformAdapter = {
  validatePost(post, override) {
    const text = override?.caption || post.content;
    const errors: string[] = [];
    if (text.length > 300) {
      errors.push(`Bluesky limit is 300 characters (Current: ${text.length}).`);
    }
    return { valid: errors.length === 0, errors };
  },
  async publish(account, post, override) {
    await wait(500);
    const rkey = Math.random().toString(36).substring(2, 10);
    return {
      success: true,
      externalPostId: `at://did:plc:${account.id}/app.bsky.feed.post/${rkey}`,
      externalPostUrl: `https://bsky.app/profile/${account.username}/post/${rkey}`,
    };
  },
  async refreshTokens() {
    return { success: true };
  },
};

/**
 * PINTEREST ADAPTER
 * Official API: Pinterest API v5
 */
export const pinterestAdapter: PlatformAdapter = {
  validatePost(post) {
    const errors: string[] = [];
    if (!post.media || post.media.length === 0) {
      errors.push('Pinterest Pin requires an image or video.');
    }
    return { valid: errors.length === 0, errors };
  },
  async publish(account, post) {
    await wait(700);
    const pinId = `pin_${Date.now()}`;
    return {
      success: true,
      externalPostId: pinId,
      externalPostUrl: `https://pinterest.com/pin/${pinId}`,
    };
  },
  async refreshTokens() {
    return { success: true };
  },
};

export const ADAPTER_REGISTRY: Record<string, PlatformAdapter> = {
  facebook: facebookAdapter,
  instagram: instagramAdapter,
  twitter: twitterAdapter,
  linkedin: linkedinAdapter,
  youtube: youtubeAdapter,
  tiktok: tiktokAdapter,
  threads: threadsAdapter,
  bluesky: blueskyAdapter,
  pinterest: pinterestAdapter,
};

export function getAdapterForPlatform(platform: string): PlatformAdapter {
  const adapter = ADAPTER_REGISTRY[platform];
  if (!adapter) {
    throw new Error(`No adapter found for platform: ${platform}`);
  }
  return adapter;
}
