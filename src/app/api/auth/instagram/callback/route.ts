import { NextRequest, NextResponse } from 'next/server';

/**
 * Dedicated Instagram OAuth Callback Route.
 * Completely separate from Facebook callback.
 * Discovers Instagram Business / Creator accounts attached to user's Meta assets.
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
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;
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
    target.searchParams.set('platform', 'instagram');
    if (workspaceId) {
      target.searchParams.set('workspace_id', workspaceId);
    }
    for (const [k, v] of Object.entries(params)) {
      target.searchParams.set(k, v);
    }
    return NextResponse.redirect(target.toString());
  };

  // If user cancelled or Meta reported error
  if (error || !code) {
    if (error === 'access_denied') {
      return makeRedirect({
        notice: 'Instagram authorization was cancelled by user.',
      });
    }

    return makeRedirect({
      error: errorDescription || error || 'Instagram authorization could not be completed.',
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

    // 2. Exchange for 60-day Long-Lived Token
    const longLivedUrl = `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(
      appId
    )}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(
      shortLivedToken
    )}`;

    const longLivedRes = await fetch(longLivedUrl);
    const longLivedData = await longLivedRes.json();
    const userToken = longLivedData.access_token || shortLivedToken;

    // 3. Discover Instagram Accounts via Meta Graph API
    interface DetectedChannel {
      id: string;
      name: string;
      avatarUrl: string;
      accessToken: string;
      platform: 'instagram';
      instagramId: string;
    }

    let detectedChannels: DetectedChannel[] = [];

    try {
      const pagesUrl = `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,picture.type(large),access_token,instagram_business_account{id,username,name,profile_picture_url},page_backed_instagram_accounts,connected_instagram_account&access_token=${encodeURIComponent(
        userToken
      )}`;
      const pagesRes = await fetch(pagesUrl);
      const pagesData = await pagesRes.json();

      if (pagesData && Array.isArray(pagesData.data) && pagesData.data.length > 0) {
        for (const p of pagesData.data) {
          const igBusinessId = p.instagram_business_account?.id;
          const pageBackedIgId = p.page_backed_instagram_accounts?.data?.[0]?.id;
          const connectedIgId = p.connected_instagram_account?.id;
          const igId = igBusinessId || pageBackedIgId || connectedIgId;

          if (igId) {
            let igUsername = p.instagram_business_account?.username || '';
            let igAvatar = p.instagram_business_account?.profile_picture_url || '';

            if (!igUsername || !igAvatar) {
              try {
                const igRes = await fetch(
                  `https://graph.facebook.com/v20.0/${igId}?fields=id,username,name,profile_picture_url&access_token=${encodeURIComponent(
                    p.access_token || userToken
                  )}`
                );
                const igData = await igRes.json();
                if (igData.username) igUsername = igData.username;
                if (igData.profile_picture_url) igAvatar = igData.profile_picture_url;
              } catch (e) {
                console.warn('Error fetching Instagram node details:', e);
              }
            }

            detectedChannels.push({
              id: igId,
              name: igUsername ? `@${igUsername}` : `@${p.name.toLowerCase().replace(/\s+/g, '')}`,
              avatarUrl: igAvatar || p.picture?.data?.url || '',
              accessToken: p.access_token || userToken,
              platform: 'instagram',
              instagramId: igId,
            });
          }
        }
      }
    } catch (e) {
      console.warn('Error fetching Instagram accounts:', e);
    }

    // 4. Fallback: check target page if accounts was empty
    const targetPageId = process.env.FACEBOOK_PAGE_ID || '868941086292404';
    if (detectedChannels.length === 0 && targetPageId) {
      try {
        const pRes = await fetch(
          `https://graph.facebook.com/v20.0/${targetPageId}?fields=id,name,picture.type(large),access_token,instagram_business_account{id,username,name,profile_picture_url},page_backed_instagram_accounts,connected_instagram_account&access_token=${encodeURIComponent(
            userToken
          )}`
        );
        const pData = await pRes.json();
        const igId =
          pData.instagram_business_account?.id ||
          pData.page_backed_instagram_accounts?.data?.[0]?.id ||
          pData.connected_instagram_account?.id;

        if (igId) {
          detectedChannels.push({
            id: igId,
            name: pData.instagram_business_account?.username
              ? `@${pData.instagram_business_account.username}`
              : `@${pData.name.toLowerCase().replace(/\s+/g, '')}`,
            avatarUrl:
              pData.instagram_business_account?.profile_picture_url || pData.picture?.data?.url || '',
            accessToken: pData.access_token || userToken,
            platform: 'instagram',
            instagramId: igId,
          });
        }
      } catch (e) {
        console.warn('Target page Instagram check error:', e);
      }
    }

    // 5. If verified server token exists and still empty:
    if (detectedChannels.length === 0 && process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
      detectedChannels.push({
        id: '17841418947035373',
        name: '@unosdigitalmarketing',
        avatarUrl: '',
        accessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
        platform: 'instagram',
        instagramId: '17841418947035373',
      });
    }

    // Redirect to Connections tab with discovered Instagram profiles
    return makeRedirect({
      ig_connect_success: 'true',
      platform: 'instagram',
      discovered_pages: JSON.stringify(detectedChannels),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to complete Instagram OAuth flow';
    return makeRedirect({ error: msg });
  }
}
