import { NextRequest, NextResponse } from 'next/server';

interface DiscoveredXAccount {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  platform: 'twitter';
  followersCount: number;
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const stateRaw = searchParams.get('state');

  // Retrieve PKCE code_verifier from secure cookie
  const codeVerifier = req.cookies.get('pb_tw_verifier')?.value;

  // Detect origin
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || (host && !host.includes('localhost') ? 'https' : 'http');
  const requestOrigin = host ? `${proto}://${host}` : req.nextUrl.origin;

  const defaultBaseUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    requestOrigin;

  let workspaceId = '';
  let returnBaseUrl = defaultBaseUrl;
  let stateRedirectUri = '';

  if (stateRaw) {
    try {
      const parsed = JSON.parse(decodeURIComponent(stateRaw));
      workspaceId = parsed.workspaceId || '';
      if (parsed.returnUrl) returnBaseUrl = parsed.returnUrl;
      if (parsed.redirectUri) stateRedirectUri = parsed.redirectUri;
    } catch {
      workspaceId = stateRaw;
    }
  }

  const makeRedirect = (params: Record<string, string>) => {
    const target = new URL('/dashboard', returnBaseUrl);
    target.searchParams.set('tab', 'connections');
    target.searchParams.set('platform', 'twitter');
    if (workspaceId) target.searchParams.set('workspace_id', workspaceId);
    for (const [k, v] of Object.entries(params)) {
      target.searchParams.set(k, v);
    }
    const res = NextResponse.redirect(target.toString());
    res.cookies.delete('pb_tw_verifier');
    return res;
  };

  // If user cancelled or X returned an error
  if (error || !code) {
    if (error === 'access_denied') {
      return makeRedirect({
        notice: 'X (Twitter) authorization was cancelled by user.',
      });
    }
    return makeRedirect({
      error: errorDescription || error || 'X authorization could not be completed.',
    });
  }

  if (!codeVerifier) {
    return makeRedirect({
      error: 'Security session expired (missing PKCE verifier). Please restart X authorization.',
    });
  }

  const clientId = process.env.TWITTER_CLIENT_ID || process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  const redirectUri = stateRedirectUri || process.env.TWITTER_REDIRECT_URI || `${defaultBaseUrl}/api/auth/twitter/callback`;

  if (!clientId) {
    return makeRedirect({
      error: 'Missing TWITTER_CLIENT_ID in server environment variables.',
    });
  }

  try {
    // 1. Exchange authorization code + PKCE verifier for Tokens
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (clientSecret) {
      headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
    }

    const tokenParams = new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers,
      body: tokenParams,
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error('[Twitter OAuth] Token exchange error:', tokenData);
      return makeRedirect({
        error: tokenData.error_description || tokenData.error || 'Failed to exchange authorization code with X.',
      });
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 7200;
    const tokenExpiresAt = new Date(Date.now() + (expiresIn - 120) * 1000).toISOString();

    // 2. Fetch authenticated user profile from X API v2
    const meRes = await fetch(
      'https://api.twitter.com/2/users/me?user.fields=profile_image_url,public_metrics,description',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    const meData = await meRes.json();

    if (meData.errors && meData.errors.length > 0) {
      console.error('[Twitter OAuth] Users/me error:', meData.errors);
      return makeRedirect({
        error: meData.errors[0]?.message || 'Failed to retrieve X profile information.',
      });
    }

    const user = meData.data;
    if (!user || !user.id) {
      return makeRedirect({
        error: 'Unable to retrieve authenticated X user identity.',
      });
    }

    // 3. Format discovered X account
    const discoveredAccounts: DiscoveredXAccount[] = [
      {
        id: user.id,
        name: user.name || user.username,
        username: user.username,
        avatarUrl: user.profile_image_url || '',
        accessToken,
        refreshToken,
        tokenExpiresAt,
        platform: 'twitter',
        followersCount: user.public_metrics?.followers_count || 0,
      },
    ];

    // 4. Return successful callback with discovered account payload
    return makeRedirect({
      twitter_connect_success: 'true',
      platform: 'twitter',
      discovered_channels: JSON.stringify(discoveredAccounts),
    });
  } catch (err: unknown) {
    console.error('[Twitter OAuth] Unexpected callback error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to complete X OAuth flow';
    return makeRedirect({ error: msg });
  }
}
