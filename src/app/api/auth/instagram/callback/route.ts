import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db';
import { SocialAccount } from '@/types/social';

/**
 * Dedicated Instagram OAuth Callback Route.
 * Completely separate from Facebook callback.
 * Discovers Instagram Business / Creator accounts attached to user's Meta assets.
 * 
 * Never fakes accounts or returns hardcoded fallback profiles.
 */
interface DetectedChannel {
  id: string;
  name: string;
  avatarUrl: string;
  accessToken: string;
  platform: 'instagram';
  instagramId: string;
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const stateRaw = searchParams.get('state');

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || (host && !host.includes('localhost') ? 'https' : 'http');
  const requestOrigin = host ? `${proto}://${host}` : req.nextUrl.origin;

  const defaultBaseUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : requestOrigin);

  const fbAppId = process.env.FACEBOOK_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const fbAppSecret = process.env.FACEBOOK_APP_SECRET;
  const igAppId = process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID;
  const igAppSecret = process.env.INSTAGRAM_APP_SECRET || fbAppSecret;

  let workspaceId = '';
  let userId = '';
  let authMode: 'direct' | 'facebook' = 'facebook';
  let returnBaseUrl = defaultBaseUrl;
  let activeRedirectUri = `${defaultBaseUrl}/api/auth/instagram/callback`;

  if (stateRaw) {
    try {
      const parsed = JSON.parse(decodeURIComponent(stateRaw));
      workspaceId = parsed.workspaceId || '';
      userId = parsed.userId || '';
      if (parsed.mode === 'direct') {
        authMode = 'direct';
      }
      if (parsed.returnUrl) {
        returnBaseUrl = parsed.returnUrl;
      }
      if (parsed.usedRedirectUri) {
        activeRedirectUri = parsed.usedRedirectUri;
      }
    } catch {
      workspaceId = stateRaw;
    }
  }

  const makeRedirect = (params: Record<string, string>) => {
    const target = new URL('/dashboard', returnBaseUrl);
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

  // If user cancelled or Meta reported an authorization error
  if (error || !code) {
    if (error === 'access_denied') {
      return makeRedirect({
        error: 'Instagram authorization was cancelled or denied by user.',
      });
    }

    return makeRedirect({
      error: errorDescription || error || 'Instagram authorization could not be completed.',
    });
  }

  const detectedChannels: DetectedChannel[] = [];
  const cleanCode = code.replace(/#_$/, '');

  try {
    // -------------------------------------------------------------------------
    // FLOW A: DIRECT INSTAGRAM LOGIN (via Instagram Login for Business)
    // -------------------------------------------------------------------------
    if (authMode === 'direct' && igAppId && igAppSecret) {
      const directTokenForm = new URLSearchParams();
      directTokenForm.append('client_id', igAppId);
      directTokenForm.append('client_secret', igAppSecret);
      directTokenForm.append('grant_type', 'authorization_code');
      directTokenForm.append('redirect_uri', activeRedirectUri);
      directTokenForm.append('code', cleanCode);

      const directRes = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: directTokenForm.toString(),
      });

      const directData = await directRes.json();

      if (directData.error_type || directData.error_message || directData.error) {
        return makeRedirect({
          error:
            directData.error_message ||
            directData.error?.message ||
            'Failed to exchange authorization code with Instagram.',
        });
      }

      // Handle data array or flat object returned by Meta
      const tokenItem = Array.isArray(directData.data) ? directData.data[0] : directData;
      const shortToken = tokenItem?.access_token || directData.access_token;
      const igUserId = tokenItem?.user_id || directData.user_id;

      if (!shortToken) {
        return makeRedirect({
          error: 'Did not receive valid access token from Instagram.',
        });
      }

      // Exchange for 60-day long-lived token
      let longToken = shortToken;
      try {
        const longRes = await fetch(
          `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(
            igAppSecret
          )}&access_token=${encodeURIComponent(shortToken)}`
        );
        const longData = await longRes.json();
        if (longData.access_token) {
          longToken = longData.access_token;
        }
      } catch (e) {
        console.warn('Long-lived Instagram token exchange warning:', e);
      }

      // Fetch user profile details
      let igUsername = '';
      let igAvatar = '';

      try {
        const profileRes = await fetch(
          `https://graph.instagram.com/me?fields=id,username,name,profile_picture_url&access_token=${encodeURIComponent(
            longToken
          )}`
        );
        const profileData = await profileRes.json();
        if (profileData.username) {
          igUsername = profileData.username;
        }
        if (profileData.profile_picture_url) {
          igAvatar = profileData.profile_picture_url;
        }
      } catch (e) {
        console.warn('Instagram profile fetch warning:', e);
      }

      if (!igUsername) {
        try {
          const simpleRes = await fetch(
            `https://graph.instagram.com/me?fields=id,username&access_token=${encodeURIComponent(longToken)}`
          );
          const simpleData = await simpleRes.json();
          if (simpleData.username) igUsername = simpleData.username;
        } catch {}
      }

      if (!igUsername && igUserId) {
        try {
          const fbGraphRes = await fetch(
            `https://graph.facebook.com/v20.0/${igUserId}?fields=id,username,name,profile_picture_url&access_token=${encodeURIComponent(
              longToken
            )}`
          );
          const fbGraphData = await fbGraphRes.json();
          if (fbGraphData.username) igUsername = fbGraphData.username;
          if (fbGraphData.profile_picture_url) igAvatar = fbGraphData.profile_picture_url;
        } catch {}
      }

      if (igUserId || igUsername) {
        detectedChannels.push({
          id: String(igUserId || igUsername),
          name: igUsername ? `@${igUsername}` : `@user_${igUserId}`,
          avatarUrl: igAvatar,
          accessToken: longToken,
          platform: 'instagram',
          instagramId: String(igUserId),
        });
      }
    } else {
      // -------------------------------------------------------------------------
      // FLOW B: META GRAPH API via FACEBOOK LOGIN (linked Instagram accounts)
      // -------------------------------------------------------------------------
      if (!fbAppId || !fbAppSecret) {
        return makeRedirect({
          error: 'Missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET in server environment.',
        });
      }

      // 1. Exchange authorization code for User Access Token
      const tokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${encodeURIComponent(
        fbAppId
      )}&client_secret=${encodeURIComponent(fbAppSecret)}&redirect_uri=${encodeURIComponent(
        activeRedirectUri
      )}&code=${encodeURIComponent(cleanCode)}`;

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
        fbAppId
      )}&client_secret=${encodeURIComponent(fbAppSecret)}&fb_exchange_token=${encodeURIComponent(
        shortLivedToken
      )}`;

      const longLivedRes = await fetch(longLivedUrl);
      const longLivedData = await longLivedRes.json();
      const userToken = longLivedData.access_token || shortLivedToken;

      // 3. Discover Instagram Business/Creator Accounts linked to Facebook Pages
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

      // Check configured target page if accounts list was empty
      const targetPageId = process.env.FACEBOOK_PAGE_ID;
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
                pData.instagram_business_account?.profile_picture_url ||
                pData.picture?.data?.url ||
                '',
              accessToken: pData.access_token || userToken,
              platform: 'instagram',
              instagramId: igId,
            });
          }
        } catch (e) {
          console.warn('Target page Instagram check error:', e);
        }
      }
    }

    // -------------------------------------------------------------------------
    // RESULT EVALUATION: Never fake an account!
    // -------------------------------------------------------------------------
    if (detectedChannels.length === 0) {
      // Guide the user with clear next steps rather than inventing fake data
      return makeRedirect({
        no_instagram_found: 'true',
        platform: 'instagram',
      });
    }

    // Persist discovered Instagram accounts directly to Supabase database
    for (const ch of detectedChannels) {
      const cleanUsername = (ch.name || 'instagram_account').replace(/^@/, '').toLowerCase().replace(/\s+/g, '');
      const igAcc: SocialAccount = {
        id: `ig_${ch.id}`,
        userId: userId || undefined,
        platform: 'instagram',
        username: cleanUsername,
        displayName: `@${cleanUsername}`,
        avatarUrl:
          ch.avatarUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanUsername || 'Instagram')}&background=E1306C&color=fff&size=256&bold=true`,
        accountType: 'business',
        status: 'connected',
        followersCount: 0,
        externalId: ch.id,
        accessToken: ch.accessToken,
        pageId: ch.id,
      };

      await DatabaseService.saveAccount(igAcc, userId, workspaceId);
    }

    const firstChannel = detectedChannels[0];

    // Redirect to Connections tab with genuinely discovered Instagram profiles
    return makeRedirect({
      ig_connect_success: 'true',
      platform: 'instagram',
      connected_account_name: firstChannel ? firstChannel.name : 'Instagram Account',
      connected_account_avatar: firstChannel ? firstChannel.avatarUrl : '',
      discovered_pages: JSON.stringify(detectedChannels),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to complete Instagram OAuth flow';
    return makeRedirect({ error: msg });
  }
}
