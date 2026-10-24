import { Post, SocialAccount, SocialPlatform, PlatformPostMetrics } from '@/types/social';
import { supabase } from '@/lib/supabase';

/**
 * Refresh Google / YouTube OAuth access token using refresh_token
 * Persists the fresh access token and new expiry directly to Supabase and cache.
 */
async function refreshYouTubeToken(account: SocialAccount): Promise<string | null> {
  let refreshToken = account.refreshToken;

  // Check if refresh_token was stored inside JSON-packed access_token
  if (!refreshToken && account.accessToken && account.accessToken.startsWith('{')) {
    try {
      const parsed = JSON.parse(account.accessToken);
      refreshToken = parsed.refresh_token || null;
    } catch {}
  }

  if (!refreshToken) return null;

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET || '';

    if (!clientId || !clientSecret) {
      console.warn('[Analytics] Missing Google OAuth client credentials in environment.');
      return null;
    }

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const newAccessToken = data.access_token;
      if (newAccessToken) {
        account.accessToken = newAccessToken;
        account.refreshToken = refreshToken;
        const expiresIn = data.expires_in || 3600;
        const newExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();
        account.tokenExpiresAt = newExpiry;

        // Persist fresh token directly to Supabase
        if (supabase && account.id) {
          try {
            const tokenBundle = JSON.stringify({
              access_token: newAccessToken,
              refresh_token: refreshToken,
              expires_at: newExpiry,
            });
            await supabase
              .from('connected_accounts')
              .update({
                access_token: tokenBundle,
                token_expires_at: newExpiry,
                status: 'connected',
                updated_at: new Date().toISOString(),
              })
              .eq('id', account.id);
          } catch (dbErr) {
            console.warn('[Analytics] Failed to persist refreshed YouTube token to DB:', dbErr);
          }
        }

        return newAccessToken;
      }
    } else {
      const errJson = await res.json().catch(() => ({}));
      console.warn('[Analytics] YouTube token refresh API error:', res.status, errJson);
    }
  } catch (err) {
    console.warn('[Analytics] Failed to refresh YouTube token:', err);
  }
  return null;
}

/**
 * Fetch real video analytics using YouTube Data API v3
 * Endpoint: GET https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=VIDEO_ID
 */
export async function fetchYouTubeMetrics(
  videoId: string,
  account: SocialAccount
): Promise<PlatformPostMetrics> {
  const cleanId = videoId
    .replace(/^https?:\/\/youtu\.be\//, '')
    .replace(/^https?:\/\/.*[?&]v=/, '')
    .split(/[?&#]/)[0]
    .trim();
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
    // If no access token, or if we have a refresh token and token is expired/missing, refresh first
    if (!accessToken && (account.refreshToken || (account.accessToken && account.accessToken.includes('refresh_token')))) {
      const refreshed = await refreshYouTubeToken(account);
      if (refreshed) accessToken = refreshed;
    }

    if (!accessToken) {
      return {
        platform: 'youtube',
        externalPostId: cleanId,
        lastFetchedAt: now,
        fetchStatus: 'permission_error',
        errorMessage: 'Missing YouTube access token. Please re-authenticate your channel in Connections.',
      };
    }

    let response = await queryApi(accessToken);

    // If 401 Unauthorized, refresh token and retry
    if (response.status === 401) {
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
        fetchStatus: response.status === 401 || response.status === 403 ? 'permission_error' : 'failed',
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
      impressions: null, // Note: YouTube Data API v3 does not expose impression reach metrics (requires separate YouTube Reporting API)
      reach: null,
      likes,
      comments,
      shares: null, // Note: YouTube does not expose public share count via Data API v3
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
 * Supports both Instagram User Tokens (graph.instagram.com) and Linked Page Tokens (graph.facebook.com)
 */
export async function fetchInstagramMetrics(
  mediaId: string,
  account: SocialAccount
): Promise<PlatformPostMetrics> {
  const cleanId = mediaId.trim();
  const now = new Date().toISOString();

  let accessToken = account.accessToken || '';
  if (accessToken.startsWith('{')) {
    try {
      accessToken = JSON.parse(accessToken).access_token || '';
    } catch {}
  }

  // Check for fallback Facebook Page token if account token is empty or invalid
  const fallbackPageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '';

  if (!accessToken && !fallbackPageToken) {
    return {
      platform: 'instagram',
      externalPostId: cleanId,
      lastFetchedAt: now,
      fetchStatus: 'permission_error',
      errorMessage: 'Missing Instagram access token. Connect your Instagram Business account in Connections.',
    };
  }

  try {
    let baseData: any = null;
    let successfulToken = accessToken;
    let successfulDomain = 'facebook'; // 'instagram' or 'facebook'

    // Strategy 1: If token starts with IGAA (Instagram User Token), try graph.instagram.com first
    if (accessToken && accessToken.startsWith('IGAA')) {
      try {
        const igRes = await fetch(
          `https://graph.instagram.com/v20.0/${encodeURIComponent(cleanId)}?fields=id,like_count,comments_count,media_type,permalink&access_token=${accessToken}`
        );
        if (igRes.ok) {
          baseData = await igRes.json();
          successfulDomain = 'instagram';
        }
      } catch {}
    }

    // Strategy 2: Try graph.facebook.com with account token (for standard Page tokens)
    if (!baseData && accessToken && !accessToken.startsWith('IGAA')) {
      const fbRes = await fetch(
        `https://graph.facebook.com/v20.0/${encodeURIComponent(cleanId)}?fields=id,like_count,comments_count,media_type,permalink&access_token=${accessToken}`
      );
      if (fbRes.ok) {
        baseData = await fbRes.json();
        successfulDomain = 'facebook';
      }
    }

    // Strategy 3: Try graph.facebook.com with verified system Page Token
    if (!baseData && fallbackPageToken && fallbackPageToken !== accessToken) {
      const fallbackRes = await fetch(
        `https://graph.facebook.com/v20.0/${encodeURIComponent(cleanId)}?fields=id,like_count,comments_count,media_type,permalink&access_token=${fallbackPageToken}`
      );
      if (fallbackRes.ok) {
        baseData = await fallbackRes.json();
        successfulToken = fallbackPageToken;
        successfulDomain = 'facebook';
      }
    }

    // If still not found, check the linked Instagram Business account media list
    if (!baseData) {
      const igAccountId = account.pageId || account.externalId || process.env.INSTAGRAM_ACCOUNT_ID || '17841417726295028';
      const tokenToUse = fallbackPageToken || accessToken;
      try {
        const listRes = await fetch(
          `https://graph.facebook.com/v20.0/${igAccountId}/media?fields=id,like_count,comments_count,media_type,permalink&access_token=${tokenToUse}&limit=25`
        );
        if (listRes.ok) {
          const listJson = await listRes.json();
          const match = listJson.data?.find((m: any) => m.id === cleanId);
          if (match) {
            baseData = match;
            successfulToken = tokenToUse;
            successfulDomain = 'facebook';
          }
        }
      } catch {}
    }

    if (!baseData) {
      return {
        platform: 'instagram',
        externalPostId: cleanId,
        lastFetchedAt: now,
        fetchStatus: 'permission_error',
        errorMessage: `Instagram media #${cleanId} not found or token expired. Please re-authenticate your Instagram account.`,
      };
    }

    const likes = baseData.like_count !== undefined ? baseData.like_count : 0;
    const comments = baseData.comments_count !== undefined ? baseData.comments_count : 0;
    const isVideoOrReel = baseData.media_type === 'VIDEO';

    let reach: number | null = null;
    let saved: number | null = null;
    let views: number | null = null;
    let shares: number | null = null;

    // 2. Fetch Insights (reach, saved, views, shares, total_interactions) using verified metrics
    const tokenForInsights = fallbackPageToken || successfulToken;
    if (tokenForInsights && successfulDomain === 'facebook') {
      try {
        const metricNames = isVideoOrReel
          ? 'views,reach,saved,shares,total_interactions'
          : 'reach,saved,total_interactions';

        const insightsRes = await fetch(
          `https://graph.facebook.com/v20.0/${encodeURIComponent(cleanId)}/insights?metric=${metricNames}&access_token=${tokenForInsights}`
        );

        if (insightsRes.ok) {
          const insightsData = await insightsRes.json();
          const metricsList = insightsData?.data || [];

          for (const item of metricsList) {
            const val = item.values?.[0]?.value ?? 0;
            if (item.name === 'views') views = val;
            if (item.name === 'reach') reach = val;
            if (item.name === 'saved') saved = val;
            if (item.name === 'shares') shares = val;
          }
        }
      } catch (iErr) {
        console.warn('[Analytics] Instagram insights query skipped:', iErr);
      }
    }

    const totalInteractions = likes + comments + (shares || 0) + (saved || 0);
    const engagementRate = views && views > 0
      ? parseFloat(((totalInteractions / views) * 100).toFixed(2))
      : reach && reach > 0
      ? parseFloat(((totalInteractions / reach) * 100).toFixed(2))
      : null;

    return {
      platform: 'instagram',
      externalPostId: cleanId,
      views,
      impressions: reach,
      reach,
      likes,
      comments,
      shares,
      saved,
      engagementRate,
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
 * Endpoint: GET https://graph.facebook.com/v20.0/{post_id}?fields=id,shares,likes.summary(true),comments.summary(true)
 */
export async function fetchFacebookMetrics(
  postId: string,
  account: SocialAccount
): Promise<PlatformPostMetrics> {
  const pageId = account.pageId || account.externalId || process.env.FACEBOOK_PAGE_ID || '868941086292404';
  let cleanId = postId.trim();

  // If ID does not include pageId prefix, construct compound ID
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
    // 1. Try compound ID `{pageId}_{postId}` without invalid 'reactions' field
    let response = await fetch(
      `https://graph.facebook.com/v20.0/${encodeURIComponent(compoundId)}?fields=id,shares,likes.summary(true),comments.summary(true)&access_token=${accessToken}`
    );

    // 2. If not found, try clean ID directly (for video/photo objects)
    if (!response.ok && cleanId !== compoundId) {
      const fallbackRes = await fetch(
        `https://graph.facebook.com/v20.0/${encodeURIComponent(cleanId)}?fields=id,views,shares,likes.summary(true),comments.summary(true)&access_token=${accessToken}`
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

    // 3. Fallback: query page feed to locate matching post
    let data: any = null;
    if (response.ok) {
      data = await response.json();
    } else {
      try {
        const feedRes = await fetch(
          `https://graph.facebook.com/v20.0/${pageId}/feed?fields=id,shares,likes.summary(true),comments.summary(true)&access_token=${accessToken}&limit=15`
        );
        if (feedRes.ok) {
          const feedData = await feedRes.json();
          const match = feedData.data?.find(
            (p: any) => p.id === compoundId || p.id?.endsWith(`_${cleanId}`) || p.id === cleanId
          );
          if (match) {
            data = match;
          }
        }
      } catch {}
    }

    if (!data) {
      return {
        platform: 'facebook',
        externalPostId: cleanId,
        lastFetchedAt: now,
        fetchStatus: 'permission_error',
        errorMessage: `Facebook post #${cleanId} not found or requires pages_read_engagement permission.`,
      };
    }

    const likes = data.likes?.summary?.total_count ?? 0;
    const comments = data.comments?.summary?.total_count ?? 0;
    const shares = data.shares?.count ?? 0;
    let views: number | null = typeof data.views === 'number' ? data.views : null;

    // Check video insights if this is a video object
    if (views === null && !cleanId.includes('_')) {
      try {
        const vInsightsRes = await fetch(
          `https://graph.facebook.com/v20.0/${encodeURIComponent(cleanId)}/video_insights?access_token=${accessToken}`
        );
        if (vInsightsRes.ok) {
          const vData = await vInsightsRes.json();
          const playCountItem = vData.data?.find(
            (i: any) => i.name === 'blue_reels_play_count' || i.name === 'fb_reels_total_plays'
          );
          if (playCountItem && typeof playCountItem.values?.[0]?.value === 'number') {
            views = playCountItem.values[0].value;
          }
        }
      } catch {}
    }

    const totalInteractions = likes + comments + shares;
    const engagementRate = views && views > 0
      ? parseFloat(((totalInteractions / views) * 100).toFixed(2))
      : null;

    return {
      platform: 'facebook',
      externalPostId: cleanId,
      views,
      impressions: null,
      reach: null,
      likes,
      comments,
      shares,
      engagementRate,
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
 * Note: If Twitter integration is disconnected or disabled, returns clean 'not_supported' or 'permission_error' status
 */
export async function fetchTwitterMetrics(
  tweetId: string,
  account: SocialAccount
): Promise<PlatformPostMetrics> {
  const cleanId = tweetId.trim();
  const now = new Date().toISOString();

  if (!account.accessToken || account.status === 'expired') {
    return {
      platform: 'twitter',
      externalPostId: cleanId,
      lastFetchedAt: now,
      fetchStatus: 'not_supported',
      errorMessage: 'Twitter (X) account is disconnected or requires re-authentication.',
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
        const views = metrics.impression_count ?? 0;
        const likes = metrics.like_count ?? 0;
        const comments = metrics.reply_count ?? 0;
        const shares = (metrics.retweet_count ?? 0) + (metrics.quote_count ?? 0);
        const saved = metrics.bookmark_count ?? 0;
        const totalInteractions = likes + comments + shares;

        return {
          platform: 'twitter',
          externalPostId: cleanId,
          views,
          impressions: views,
          likes,
          comments,
          shares,
          saved,
          engagementRate: views > 0 ? parseFloat(((totalInteractions / views) * 100).toFixed(2)) : null,
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
      errorMessage: 'Twitter API: Tweet read permissions or API tier required.',
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
        engagementRate: null,
        lastFetchedAt: now,
        fetchStatus: 'success',
      };
    }

    return {
      platform: 'linkedin',
      externalPostId: cleanUrn,
      lastFetchedAt: now,
      fetchStatus: 'permission_error',
      errorMessage: 'LinkedIn API: socialActions endpoint requires verified r_organization_social permission.',
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
