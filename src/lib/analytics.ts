import { Post, SocialAccount, SocialPlatform, PlatformPostMetrics } from '@/types/social';

/**
 * Refresh Google / YouTube OAuth access token using refresh_token
 */
async function refreshYouTubeToken(account: SocialAccount): Promise<string | null> {
  if (!account.refreshToken) return null;

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET || '';

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: account.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.access_token || null;
    }
  } catch (err) {
    console.warn('[Analytics] Failed to refresh YouTube token:', err);
  }
  return null;
}

/**
 * Fetch real video analytics using YouTube Data API v3
 * Endpoint: GET https://www.googleapis.com/youtube/v3/videos?part=statistics&id=VIDEO_ID
 */
export async function fetchYouTubeMetrics(
  videoId: string,
  account: SocialAccount
): Promise<PlatformPostMetrics> {
  const cleanId = videoId.replace(/^https?:\/\/youtu\.be\//, '').replace(/^https?:\/\/.*[?&]v=/, '').split(/[?&#]/)[0].trim();
  const now = new Date().toISOString();

  let accessToken = account.accessToken;
  if (accessToken && accessToken.startsWith('{')) {
    try {
      accessToken = JSON.parse(accessToken).access_token;
    } catch {}
  }

  const queryApi = async (token: string) => {
    return fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${cleanId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  };

  try {
    if (!accessToken) {
      return {
        platform: 'youtube',
        externalPostId: cleanId,
        lastFetchedAt: now,
        fetchStatus: 'permission_error',
        errorMessage: 'Missing YouTube access token. Please re-authenticate in Connections.',
      };
    }

    let response = await queryApi(accessToken);

    // If 401 Unauthorized, attempt refresh
    if (response.status === 401 && account.refreshToken) {
      const newToken = await refreshYouTubeToken(account);
      if (newToken) {
        accessToken = newToken;
        response = await queryApi(newToken);
      }
    }

    if (response.status === 429) {
      return {
        platform: 'youtube',
        externalPostId: cleanId,
        lastFetchedAt: now,
        fetchStatus: 'rate_limited',
        errorMessage: 'YouTube Data API quota/rate limit exceeded. Try again later.',
      };
    }

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const msg = errJson?.error?.message || `YouTube API error: ${response.status}`;
      return {
        platform: 'youtube',
        externalPostId: cleanId,
        lastFetchedAt: now,
        fetchStatus: 'failed',
        errorMessage: msg,
      };
    }

    const data = await response.json();
    const item = data?.items?.[0];

    if (!item) {
      return {
        platform: 'youtube',
        externalPostId: cleanId,
        lastFetchedAt: now,
        fetchStatus: 'failed',
        errorMessage: `Video #${cleanId} not found or deleted on YouTube.`,
      };
    }

    const stats = item.statistics || {};
    const views = stats.viewCount !== undefined ? parseInt(stats.viewCount, 10) : 0;
    const likes = stats.likeCount !== undefined ? parseInt(stats.likeCount, 10) : 0;
    const comments = stats.commentCount !== undefined ? parseInt(stats.commentCount, 10) : 0;

    return {
      platform: 'youtube',
      externalPostId: cleanId,
      views,
      impressions: null, // YouTube Data API v3 does not expose impressions (requires separate YouTube Analytics API with channel owner token)
      reach: null,
      likes,
      comments,
      shares: null, // YouTube does not expose public share count via Data API v3
      engagementRate: views > 0 ? parseFloat((((likes + comments) / views) * 100).toFixed(2)) : 0,
      lastFetchedAt: now,
      fetchStatus: 'success',
      rawDetails: {
        title: item.snippet?.title,
        publishedAt: item.snippet?.publishedAt,
      },
    };
  } catch (err: any) {
    return {
      platform: 'youtube',
      externalPostId: cleanId,
      lastFetchedAt: now,
      fetchStatus: 'failed',
      errorMessage: err?.message || 'Failed to connect to YouTube Data API',
    };
  }
}

/**
 * Fetch real Instagram post/reel metrics using Meta Graph API
 * Endpoint: GET https://graph.facebook.com/v20.0/{mediaId}?fields=like_count,comments_count,media_type
 * Insights: GET https://graph.facebook.com/v20.0/{mediaId}/insights?metric=reach,saved
 */
export async function fetchInstagramMetrics(
  mediaId: string,
  account: SocialAccount
): Promise<PlatformPostMetrics> {
  const cleanId = mediaId.trim();
  const now = new Date().toISOString();

  let accessToken = account.accessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '';
  if (accessToken.startsWith('{')) {
    try {
      accessToken = JSON.parse(accessToken).access_token;
    } catch {}
  }

  if (!accessToken) {
    return {
      platform: 'instagram',
      externalPostId: cleanId,
      lastFetchedAt: now,
      fetchStatus: 'permission_error',
      errorMessage: 'Missing Instagram access token. Connect your Instagram Business account.',
    };
  }

  try {
    // 1. Fetch base media object (likes, comments, media type)
    const baseRes = await fetch(
      `https://graph.facebook.com/v20.0/${encodeURIComponent(cleanId)}?fields=id,like_count,comments_count,media_type,permalink&access_token=${accessToken}`
    );

    if (baseRes.status === 429) {
      return {
        platform: 'instagram',
        externalPostId: cleanId,
        lastFetchedAt: now,
        fetchStatus: 'rate_limited',
        errorMessage: 'Instagram Graph API rate limit reached.',
      };
    }

    if (!baseRes.ok) {
      const errData = await baseRes.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `Instagram API error: ${baseRes.status}`;

      // If object not found directly, try querying the Instagram account's recent media list
      const accountId = account.pageId || account.externalId || account.id.replace(/^ig_/, '');
      if (accountId && !cleanId.startsWith('ig_simulated')) {
        try {
          const listRes = await fetch(
            `https://graph.facebook.com/v20.0/${accountId}/media?fields=id,like_count,comments_count,media_type,permalink&access_token=${accessToken}&limit=15`
          );
          if (listRes.ok) {
            const listData = await listRes.json();
            const matchingItem = listData.data?.find((m: any) => m.id === cleanId);
            if (matchingItem) {
              return {
                platform: 'instagram',
                externalPostId: cleanId,
                views: null,
                impressions: null,
                reach: null,
                likes: matchingItem.like_count ?? 0,
                comments: matchingItem.comments_count ?? 0,
                shares: null,
                saved: null,
                lastFetchedAt: now,
                fetchStatus: 'success',
              };
            }
          }
        } catch {}
      }

      return {
        platform: 'instagram',
        externalPostId: cleanId,
        lastFetchedAt: now,
        fetchStatus: 'permission_error',
        errorMessage: errMsg,
      };
    }

    const baseData = await baseRes.json();
    const likes = baseData.like_count !== undefined ? baseData.like_count : 0;
    const comments = baseData.comments_count !== undefined ? baseData.comments_count : 0;
    const isVideoOrReel = baseData.media_type === 'VIDEO';

    let reach: number | null = null;
    let saved: number | null = null;
    let views: number | null = null;

    // 2. Fetch Insights (reach, saved, views/plays)
    try {
      const insightsMetrics = isVideoOrReel ? 'reach,saved,views' : 'reach,saved';
      const insightsRes = await fetch(
        `https://graph.facebook.com/v20.0/${encodeURIComponent(cleanId)}/insights?metric=${insightsMetrics}&access_token=${accessToken}`
      );

      if (insightsRes.ok) {
        const insightsData = await insightsRes.json();
        const metricsList = insightsData?.data || [];

        for (const item of metricsList) {
          const val = item.values?.[0]?.value ?? 0;
          if (item.name === 'reach') reach = val;
          if (item.name === 'saved') saved = val;
          if (item.name === 'views' || item.name === 'plays') views = val;
        }
      }
    } catch {
      // Insights might not be available for non-business or older media; base likes/comments are preserved
    }

    return {
      platform: 'instagram',
      externalPostId: cleanId,
      views,
      impressions: reach, // Instagram Business uses reach/impressions
      reach,
      likes,
      comments,
      shares: null, // Instagram Graph API does not expose shares publicly on media endpoints
      saved,
      engagementRate: (reach && reach > 0) ? parseFloat((((likes + comments) / reach) * 100).toFixed(2)) : null,
      lastFetchedAt: now,
      fetchStatus: 'success',
      rawDetails: {
        mediaType: baseData.media_type,
        permalink: baseData.permalink,
      },
    };
  } catch (err: any) {
    return {
      platform: 'instagram',
      externalPostId: cleanId,
      lastFetchedAt: now,
      fetchStatus: 'failed',
      errorMessage: err?.message || 'Network error communicating with Instagram Graph API',
    };
  }
}

/**
 * Fetch real Facebook Page post metrics using Meta Graph API
 * Endpoint: GET https://graph.facebook.com/v20.0/{page_id}_{post_id}?fields=shares,likes.summary(true),comments.summary(true)
 */
export async function fetchFacebookMetrics(
  postId: string,
  account: SocialAccount
): Promise<PlatformPostMetrics> {
  const pageId = account.pageId || account.externalId || '868941086292404';
  let cleanId = postId.trim();

  // If ID does not include pageId prefix, construct the compound ID
  const compoundId = cleanId.includes('_') ? cleanId : `${pageId}_${cleanId}`;
  const now = new Date().toISOString();

  let accessToken = account.accessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '';
  if (accessToken.startsWith('{')) {
    try {
      accessToken = JSON.parse(accessToken).access_token;
    } catch {}
  }

  if (!accessToken) {
    return {
      platform: 'facebook',
      externalPostId: cleanId,
      lastFetchedAt: now,
      fetchStatus: 'permission_error',
      errorMessage: 'Missing Facebook Page access token.',
    };
  }

  try {
    // 1. Try compound ID `{pageId}_{postId}`
    let response = await fetch(
      `https://graph.facebook.com/v20.0/${encodeURIComponent(compoundId)}?fields=id,shares,likes.summary(true),comments.summary(true),reactions.summary(true)&access_token=${accessToken}`
    );

    // 2. If 400/404, fallback to short ID `{postId}`
    if (!response.ok && cleanId !== compoundId) {
      const fallbackRes = await fetch(
        `https://graph.facebook.com/v20.0/${encodeURIComponent(cleanId)}?fields=id,shares,likes.summary(true),comments.summary(true),reactions.summary(true)&access_token=${accessToken}`
      );
      if (fallbackRes.ok) {
        response = fallbackRes;
      }
    }

    if (response.status === 429) {
      return {
        platform: 'facebook',
        externalPostId: cleanId,
        lastFetchedAt: now,
        fetchStatus: 'rate_limited',
        errorMessage: 'Facebook Graph API rate limit reached.',
      };
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `Facebook API error (${response.status})`;

      // Fallback: check recent page feed
      try {
        const feedRes = await fetch(
          `https://graph.facebook.com/v20.0/${pageId}/feed?fields=id,shares,likes.summary(true),comments.summary(true)&access_token=${accessToken}&limit=10`
        );
        if (feedRes.ok) {
          const feedData = await feedRes.json();
          const match = feedData.data?.find((p: any) => p.id === compoundId || p.id?.endsWith(`_${cleanId}`));
          if (match) {
            const likes = match.likes?.summary?.total_count ?? 0;
            const comments = match.comments?.summary?.total_count ?? 0;
            const shares = match.shares?.count ?? 0;
            return {
              platform: 'facebook',
              externalPostId: cleanId,
              views: null,
              impressions: null,
              reach: null,
              likes,
              comments,
              shares,
              lastFetchedAt: now,
              fetchStatus: 'success',
            };
          }
        }
      } catch {}

      return {
        platform: 'facebook',
        externalPostId: cleanId,
        lastFetchedAt: now,
        fetchStatus: 'permission_error',
        errorMessage: errMsg,
      };
    }

    const data = await response.json();
    const likes = data.likes?.summary?.total_count ?? data.reactions?.summary?.total_count ?? 0;
    const comments = data.comments?.summary?.total_count ?? 0;
    const shares = data.shares?.count ?? 0;

    return {
      platform: 'facebook',
      externalPostId: cleanId,
      views: null,
      impressions: null, // Note: Post impressions require 'pages_read_engagement' or reviewable permission
      reach: null,
      likes,
      comments,
      shares,
      lastFetchedAt: now,
      fetchStatus: 'success',
    };
  } catch (err: any) {
    return {
      platform: 'facebook',
      externalPostId: cleanId,
      lastFetchedAt: now,
      fetchStatus: 'failed',
      errorMessage: err?.message || 'Network error communicating with Facebook Graph API',
    };
  }
}

/**
 * Fetch Twitter / X Post metrics
 * Note: If Twitter integration is disabled, returns clean 'not_supported' status
 */
export async function fetchTwitterMetrics(
  tweetId: string,
  account: SocialAccount
): Promise<PlatformPostMetrics> {
  const cleanId = tweetId.trim();
  const now = new Date().toISOString();

  // If Twitter integration is disabled in system
  if (!account.accessToken || account.status === 'expired') {
    return {
      platform: 'twitter',
      externalPostId: cleanId,
      lastFetchedAt: now,
      fetchStatus: 'not_supported',
      errorMessage: 'Twitter (X) integration has been disabled or account is disconnected.',
    };
  }

  try {
    const res = await fetch(
      `https://api.twitter.com/2/tweets/${cleanId}?tweet.fields=public_metrics`,
      {
        headers: { Authorization: `Bearer ${account.accessToken}` },
      }
    );

    if (res.ok) {
      const json = await res.json();
      const metrics = json.data?.public_metrics;
      if (metrics) {
        return {
          platform: 'twitter',
          externalPostId: cleanId,
          views: metrics.impression_count ?? 0,
          impressions: metrics.impression_count ?? 0,
          likes: metrics.like_count ?? 0,
          comments: metrics.reply_count ?? 0,
          shares: (metrics.retweet_count ?? 0) + (metrics.quote_count ?? 0),
          saved: metrics.bookmark_count ?? 0,
          lastFetchedAt: now,
          fetchStatus: 'success',
        };
      }
    }

    return {
      platform: 'twitter',
      externalPostId: cleanId,
      lastFetchedAt: now,
      fetchStatus: 'permission_error',
      errorMessage: 'Twitter API error or missing v2 read permissions.',
    };
  } catch (err: any) {
    return {
      platform: 'twitter',
      externalPostId: cleanId,
      lastFetchedAt: now,
      fetchStatus: 'failed',
      errorMessage: err?.message || 'Failed to fetch Twitter metrics',
    };
  }
}

/**
 * Fetch LinkedIn Share metrics
 */
export async function fetchLinkedInMetrics(
  shareUrn: string,
  account: SocialAccount
): Promise<PlatformPostMetrics> {
  const cleanUrn = shareUrn.trim();
  const now = new Date().toISOString();

  if (!account.accessToken) {
    return {
      platform: 'linkedin',
      externalPostId: cleanUrn,
      lastFetchedAt: now,
      fetchStatus: 'permission_error',
      errorMessage: 'LinkedIn account access token not available.',
    };
  }

  try {
    const res = await fetch(`https://api.linkedin.com/v2/socialActions/${encodeURIComponent(cleanUrn)}`, {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });

    if (res.ok) {
      const data = await res.json();
      const likes = data.likesSummary?.totalLikes ?? 0;
      const comments = data.commentsSummary?.totalComments ?? 0;

      return {
        platform: 'linkedin',
        externalPostId: cleanUrn,
        views: null,
        impressions: null,
        likes,
        comments,
        shares: null,
        lastFetchedAt: now,
        fetchStatus: 'success',
      };
    }

    return {
      platform: 'linkedin',
      externalPostId: cleanUrn,
      lastFetchedAt: now,
      fetchStatus: 'permission_error',
      errorMessage: 'LinkedIn API: socialActions endpoint requires r_organization_social permission.',
    };
  } catch (err: any) {
    return {
      platform: 'linkedin',
      externalPostId: cleanUrn,
      lastFetchedAt: now,
      fetchStatus: 'failed',
      errorMessage: err?.message || 'Failed to fetch LinkedIn metrics',
    };
  }
}

/**
 * Unified Dispatcher:
 * Dispatches metric collection for any given platform and external ID
 */
export async function fetchPlatformPostMetrics(
  platform: SocialPlatform,
  externalPostId: string,
  account: SocialAccount
): Promise<PlatformPostMetrics> {
  switch (platform) {
    case 'youtube':
      return fetchYouTubeMetrics(externalPostId, account);
    case 'instagram':
      return fetchInstagramMetrics(externalPostId, account);
    case 'facebook':
      return fetchFacebookMetrics(externalPostId, account);
    case 'twitter':
      return fetchTwitterMetrics(externalPostId, account);
    case 'linkedin':
      return fetchLinkedInMetrics(externalPostId, account);
    default:
      return {
        platform,
        externalPostId,
        lastFetchedAt: new Date().toISOString(),
        fetchStatus: 'not_supported',
        errorMessage: `${platform} metrics not supported.`,
      };
  }
}

/**
 * Fetch and aggregate real metrics across all published destinations for a post
 */
export async function fetchAllMetricsForPost(
  post: Post,
  accounts: SocialAccount[]
): Promise<Record<string, PlatformPostMetrics>> {
  const results: Record<string, PlatformPostMetrics> = {};
  if (!post.results || Object.keys(post.results).length === 0) {
    return results;
  }

  const entries = Object.entries(post.results).filter(
    ([, res]) => res.status === 'success' && res.externalPostId
  );

  await Promise.allSettled(
    entries.map(async ([accId, res]) => {
      // Find matching account by ID or platform
      let account = accounts.find((a) => a.id === accId);
      if (!account && res.platform) {
        account = accounts.find((a) => a.platform === res.platform);
      }

      if (!account) {
        // Fallback account descriptor
        account = {
          id: accId,
          platform: (res.platform as SocialPlatform) || 'facebook',
          username: res.accountName || 'Account',
          displayName: res.accountName || 'Account',
          avatarUrl: '',
          status: 'connected',
        };
      }

      const platform = (res.platform as SocialPlatform) || account.platform;
      const metrics = await fetchPlatformPostMetrics(platform, res.externalPostId!, account);
      results[accId] = metrics;
    })
  );

  return results;
}
