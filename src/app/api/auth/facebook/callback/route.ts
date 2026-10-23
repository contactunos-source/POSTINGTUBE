import { NextRequest, NextResponse } from 'next/server';

/**
 * Handles Pure Facebook OAuth 2.0 Callback.
 * - Exchanges code for user token
 * - Upgrades to 60-day long-lived token
 * - Discovers Facebook Pages managed by user
 * - Strictly returns platform: 'facebook' (zero cross-linking with Instagram)
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const stateRaw = searchParams.get('state');

  const baseUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const redirectUri = `${baseUrl}/api/auth/facebook/callback`;
  const appId = process.env.FACEBOOK_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  let workspaceId = '';
  if (stateRaw) {
    try {
      const parsed = JSON.parse(decodeURIComponent(stateRaw));
      workspaceId = parsed.workspaceId || '';
    } catch {
      workspaceId = stateRaw;
    }
  }

  const makeRedirect = (params: Record<string, string>) => {
    const target = new URL('/dashboard', baseUrl);
    target.searchParams.set('tab', 'connections');
    target.searchParams.set('platform', 'facebook');
    if (workspaceId) {
      target.searchParams.set('workspace_id', workspaceId);
    }
    for (const [k, v] of Object.entries(params)) {
      target.searchParams.set(k, v);
    }
    return NextResponse.redirect(target.toString());
  };

  // If Meta reported an authorization error or user cancelled
  if (error || !code) {
    if (error === 'access_denied') {
      return makeRedirect({
        error: 'Facebook authorization was cancelled or denied by user.',
      });
    }

    if (error === 'invalid_scope' || errorDescription?.includes('Invalid Scopes')) {
      const fallbackUrl = new URL('/api/auth/facebook', baseUrl);
      if (workspaceId) fallbackUrl.searchParams.set('workspace_id', workspaceId);
      return NextResponse.redirect(fallbackUrl.toString());
    }

    return makeRedirect({
      error: errorDescription || error || 'Facebook authorization could not be completed.',
    });
  }

  if (!appId || !appSecret) {
    return makeRedirect({
      error: 'Missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET in server environment.',
    });
  }

  try {
    // 1. Exchange authorization code for User Access Token
    const tokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${encodeURIComponent(
      appId
    )}&client_secret=${encodeURIComponent(appSecret)}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&code=${encodeURIComponent(code)}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return makeRedirect({
        error: tokenData.error.message || 'Failed to exchange authorization code with Meta.',
      });
    }

    const shortLivedToken = tokenData.access_token;

    // 2. Exchange for 60-day Long-Lived User Token
    const longLivedUrl = `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(
      appId
    )}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(
      shortLivedToken
    )}`;

    const longLivedRes = await fetch(longLivedUrl);
    const longLivedData = await longLivedRes.json();
    const userToken = longLivedData.access_token || shortLivedToken;

    // 3. Discover Facebook Pages
    interface DetectedChannel {
      id: string;
      name: string;
      avatarUrl: string;
      accessToken: string;
      platform: 'facebook';
    }

    let detectedChannels: DetectedChannel[] = [];

    try {
      const pagesUrl = `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,picture.type(large),access_token&access_token=${encodeURIComponent(
        userToken
      )}`;
      const pagesRes = await fetch(pagesUrl);
      const pagesData = await pagesRes.json();

      if (pagesData && Array.isArray(pagesData.data) && pagesData.data.length > 0) {
        for (const p of pagesData.data) {
          detectedChannels.push({
            id: p.id,
            name: p.name,
            avatarUrl: p.picture?.data?.url || '',
            accessToken: p.access_token || userToken,
            platform: 'facebook',
          });
        }
      }
    } catch (e) {
      console.warn('Error fetching /me/accounts for Facebook:', e);
    }

    // 4. Fallback to configured target Page if accounts list was empty
    const targetPageId = process.env.FACEBOOK_PAGE_ID || '868941086292404';
    if (detectedChannels.length === 0 && targetPageId) {
      try {
        const pRes = await fetch(
          `https://graph.facebook.com/v20.0/${targetPageId}?fields=id,name,picture.type(large),access_token&access_token=${encodeURIComponent(
            userToken
          )}`
        );
        const pData = await pRes.json();
        if (pData.id && pData.name) {
          detectedChannels.push({
            id: pData.id,
            name: pData.name,
            avatarUrl: pData.picture?.data?.url || '',
            accessToken: pData.access_token || userToken,
            platform: 'facebook',
          });
        }
      } catch (e) {
        console.warn('Target page direct check error:', e);
      }
    }

    // 5. Final fallback with verified server token if no user pages found yet
    if (detectedChannels.length === 0 && process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
      detectedChannels.push({
        id: targetPageId,
        name: process.env.FACEBOOK_PAGE_NAME || 'U NOS Digital marketing',
        avatarUrl: '',
        accessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
        platform: 'facebook',
      });
    }

    // Redirect to Connections tab with discovered Facebook accounts
    return makeRedirect({
      fb_connect_success: 'true',
      platform: 'facebook',
      discovered_pages: JSON.stringify(detectedChannels),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to complete Facebook OAuth flow';
    return makeRedirect({ error: msg });
  }
}
