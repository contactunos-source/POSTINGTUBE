import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db';
import { SocialAccount } from '@/types/social';

interface DiscoveredYouTubeChannel {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  platform: 'youtube';
  followersCount: number;
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const stateRaw = searchParams.get('state');

  // Detect origin
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || (host && !host.includes('localhost') ? 'https' : 'http');
  const requestOrigin = host ? `${proto}://${host}` : req.nextUrl.origin;

  const defaultBaseUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    requestOrigin;

  let workspaceId = '';
  let userId = '';
  let returnBaseUrl = defaultBaseUrl;

  if (stateRaw) {
    try {
      const parsed = JSON.parse(decodeURIComponent(stateRaw));
      workspaceId = parsed.workspaceId || '';
      userId = parsed.userId || '';
      if (parsed.returnUrl) returnBaseUrl = parsed.returnUrl;
    } catch {
      workspaceId = stateRaw;
    }
  }

  const makeRedirect = (params: Record<string, string>) => {
    const target = new URL('/dashboard', returnBaseUrl);
    target.searchParams.set('tab', 'connections');
    target.searchParams.set('platform', 'youtube');
    if (workspaceId) target.searchParams.set('workspace_id', workspaceId);
    for (const [k, v] of Object.entries(params)) {
      target.searchParams.set(k, v);
    }
    return NextResponse.redirect(target.toString());
  };

  // If user cancelled or Google returned an error
  if (error || !code) {
    if (error === 'access_denied') {
      return makeRedirect({
        error: 'Google YouTube authorization was cancelled or denied by user.',
      });
    }
    return makeRedirect({
      error: error || 'Google authorization could not be completed.',
    });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI || `${defaultBaseUrl}/api/auth/youtube/callback`;

  if (!clientId || !clientSecret) {
    return makeRedirect({
      error: 'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in server environment variables.',
    });
  }

  try {
    // 1. Exchange authorization code for Google Tokens (access_token + refresh_token)
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error('[YouTube OAuth] Token exchange error:', tokenData);
      return makeRedirect({
        error: tokenData.error_description || tokenData.error || 'Failed to exchange authorization code with Google.',
      });
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 3600;
    const tokenExpiresAt = new Date(Date.now() + (expiresIn - 120) * 1000).toISOString();

    // 2. Fetch authenticated user's YouTube channels via YouTube Data API v3
    const channelsUrl = 'https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&mine=true';
    const channelsRes = await fetch(channelsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    const channelsData = await channelsRes.json();

    if (channelsData.error) {
      console.error('[YouTube OAuth] Channels fetch error:', channelsData.error);
      return makeRedirect({
        error: `YouTube API Error: ${channelsData.error.message || 'Failed to retrieve YouTube channels.'}`,
      });
    }

    const items = channelsData.items || [];
    if (items.length === 0) {
      return makeRedirect({
        error: 'No YouTube channel found on this Google account. Please create a YouTube channel on youtube.com first, then reconnect.',
      });
    }

    // 3. Format discovered channels
    const discoveredChannels: DiscoveredYouTubeChannel[] = items.map((item: any) => {
      const snippet = item.snippet || {};
      const stats = item.statistics || {};
      const rawCount = parseInt(stats.subscriberCount, 10);
      const subCount = Number.isFinite(rawCount) ? rawCount : 0;

      return {
        id: item.id,
        name: snippet.title || 'YouTube Channel',
        username: snippet.customUrl ? (snippet.customUrl.startsWith('@') ? snippet.customUrl : `@${snippet.customUrl}`) : (snippet.title || 'channel'),
        avatarUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
        accessToken,
        refreshToken,
        tokenExpiresAt,
        platform: 'youtube',
        followersCount: subCount,
      };
    });

    // 4. Directly persist discovered channels to Supabase database
    for (const ch of discoveredChannels) {
      const cleanHandle = (ch.username || ch.name).replace(/^@/, '').toLowerCase().replace(/\s+/g, '');
      const ytAcc: SocialAccount = {
        id: `yt_${ch.id}`,
        userId: userId || undefined,
        platform: 'youtube',
        username: cleanHandle,
        displayName: ch.name,
        avatarUrl: ch.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
        accountType: 'channel',
        status: 'connected',
        followersCount: ch.followersCount || 0,
        externalId: ch.id,
        accessToken: ch.accessToken,
        refreshToken: ch.refreshToken,
        tokenExpiresAt: ch.tokenExpiresAt,
        pageId: ch.id,
      };

      await DatabaseService.saveAccount(ytAcc, userId, workspaceId);
    }

    const firstChannel = discoveredChannels[0];

    // 5. Return successful callback with discovered channels payload
    return makeRedirect({
      youtube_connect_success: 'true',
      platform: 'youtube',
      connected_account_name: firstChannel ? firstChannel.name : 'YouTube Channel',
      connected_account_avatar: firstChannel ? firstChannel.avatarUrl : '',
      discovered_channels: JSON.stringify(discoveredChannels),
    });
  } catch (err: unknown) {
    console.error('[YouTube OAuth] Unexpected callback exception:', err);
    const msg = err instanceof Error ? err.message : 'Failed to complete YouTube OAuth';
    return makeRedirect({ error: msg });
  }
}
