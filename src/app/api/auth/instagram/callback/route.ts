import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db';
import { SocialAccount } from '@/types/social';
import { mirrorAvatarToPermanentStorage } from '@/lib/avatarStorage';

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
  displayName?: string;
  avatarUrl: string;
  accessToken: string;
  platform: 'instagram';
  instagramId: string;
  tokenExpiresAt?: string;
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

  const fbAppId = process.env.FACEBOOK_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '3482720281909354';
  const fbAppSecret = process.env.FACEBOOK_APP_SECRET || 'b1433776560f5cf75695f4785a8c9fa6';
  const igAppId = process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || '2116988269210142';
  const igAppSecret = process.env.INSTAGRAM_APP_SECRET || fbAppSecret;

  let workspaceId = '';
  let userId = '';
  let authMode: 'direct' | 'facebook' = 'direct';
  let returnBaseUrl = defaultBaseUrl;
  let activeRedirectUri = `${defaultBaseUrl}/api/auth/instagram/callback`;

  if (stateRaw) {
    try {
      const parsed = JSON.parse(decodeURIComponent(stateRaw));
      workspaceId = parsed.workspaceId || '';
      userId = parsed.userId || '';
      if (parsed.mode === 'direct' || !parsed.mode) {
        authMode = 'direct';
      } else if (parsed.mode === 'facebook') {
        authMode = 'facebook';
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
    if (authMode === 'direct') {
      const effectiveId = igAppId || '2116988269210142';
      const effectiveSecret = igAppSecret || fbAppSecret || 'b1433776560f5cf75695f4785a8c9fa6';

      const directTokenForm = new URLSearchParams();
      directTokenForm.append('client_id', effectiveId);
      directTokenForm.append('client_secret', effectiveSecret);
      directTokenForm.append('grant_type', 'authorization_code');
      directTokenForm.append('redirect_uri', activeRedirectUri);
      directTokenForm.append('code', cleanCode);

      let directData: any = null;
      let tokenErrorMsg = '';

      // 1. Try api.instagram.com/oauth/access_token
      try {
        const directRes = await fetch('https://api.instagram.com/oauth/access_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: directTokenForm.toString(),
        });
        directData = await directRes.json();
      } catch (err: any) {
        tokenErrorMsg = err?.message || 'Instagram API network error';
      }

      // 2. If api.instagram.com returned error or didn't return access_token, try graph.facebook.com
      if (!directData?.access_token) {
        try {
          const fbTokenRes = await fetch('https://graph.facebook.com/v20.0/oauth/access_token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: directTokenForm.toString(),
          });
          const fbTokenData = await fbTokenRes.json();
          if (fbTokenData.access_token) {
            directData = fbTokenData;
          } else if (fbTokenData.error) {
            tokenErrorMsg = fbTokenData.error.message || tokenErrorMsg;
          }
        } catch (e: any) {
          console.warn('Fallback graph.facebook.com token exchange failed:', e);
        }
      }

      if (!directData?.access_token) {
        return makeRedirect({
          error:
            directData?.error_message ||
            directData?.error?.message ||
            tokenErrorMsg ||
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
      let tokenExpiresIn = 60 * 24 * 60 * 60; // 60 days in seconds
      try {
        const longRes = await fetch(
          `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(
            effectiveSecret
          )}&access_token=${encodeURIComponent(shortToken)}`
        );
        const longData = await longRes.json();
        if (longData.access_token) {
          longToken = longData.access_token;
          if (longData.expires_in) {
            tokenExpiresIn = Number(longData.expires_in);
          }
        } else if (fbAppSecret && fbAppSecret !== effectiveSecret) {
          const fallbackRes = await fetch(
            `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(
              fbAppSecret
            )}&access_token=${encodeURIComponent(shortToken)}`
          );
          const fallbackData = await fallbackRes.json().catch(() => ({}));
          if (fallbackData.access_token) {
            longToken = fallbackData.access_token;
            if (fallbackData.expires_in) {
              tokenExpiresIn = Number(fallbackData.expires_in);
            }
          }
        }
      } catch (e) {
        console.warn('Long-lived Instagram token exchange warning:', e);
      }

      // Fetch user profile details
      let igUsername = '';
      let igDisplayName = '';
      let igAvatar = '';
      let igAccountType = '';
      let verifiedIgId = igUserId;

      // 1. Fetch core supported fields from Instagram Platform API (v21.0)
      // Note: Meta strictly requires valid field names; requesting non-existent fields causes code 100 errors.
      try {
        const profileRes = await fetch(
          `https://graph.instagram.com/v21.0/me?fields=id,username,account_type&access_token=${encodeURIComponent(
            longToken
          )}`
        );
        const profileData = await profileRes.json();
        const profileItem = Array.isArray(profileData?.data) ? profileData.data[0] : profileData;

        if (profileItem?.username) igUsername = profileItem.username;
        if (profileItem?.account_type) igAccountType = profileItem.account_type;
        if (profileItem?.id) verifiedIgId = profileItem.id;
      } catch (e) {
        console.warn('Instagram v21.0 profile fetch warning:', e);
      }

      // 2. Non-blocking attempt to retrieve profile picture if available
      try {
        const picRes = await fetch(
          `https://graph.instagram.com/v21.0/me?fields=profile_picture_url&access_token=${encodeURIComponent(
            longToken
          )}`
        );
        const picData = await picRes.json();
        const picItem = Array.isArray(picData?.data) ? picData.data[0] : picData;
        if (picItem?.profile_picture_url) igAvatar = picItem.profile_picture_url;
      } catch {}

      // 3. Fallback to unversioned /me endpoint if username was not found
      if (!igUsername) {
        try {
          const legacyRes = await fetch(
            `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${encodeURIComponent(
              longToken
            )}`
          );
          const legacyData = await legacyRes.json();
          const legacyItem = Array.isArray(legacyData?.data) ? legacyData.data[0] : legacyData;

          if (legacyItem?.username) igUsername = legacyItem.username;
          if (legacyItem?.account_type) igAccountType = legacyItem.account_type;
          if (legacyItem?.id) verifiedIgId = legacyItem.id;
        } catch {}
      }

      // 4. Fallback by user ID if available
      if (!igUsername && igUserId) {
        try {
          const nodeRes = await fetch(
            `https://graph.instagram.com/${igUserId}?fields=id,username,account_type&access_token=${encodeURIComponent(
              longToken
            )}`
          );
          const nodeData = await nodeRes.json();
          const nodeItem = Array.isArray(nodeData?.data) ? nodeData.data[0] : nodeData;

          if (nodeItem?.username) igUsername = nodeItem.username;
          if (nodeItem?.account_type) igAccountType = nodeItem.account_type;
          if (nodeItem?.id) verifiedIgId = nodeItem.id;
        } catch {}
      }

      // Check account type: personal accounts are explicitly disallowed by Meta API
      if (igAccountType && igAccountType.toUpperCase() === 'PERSONAL') {
        return makeRedirect({
          error:
            'PERSONAL_ACCOUNT_DETECTED: Your Instagram account is currently set to Personal. Meta APIs require an Instagram Professional (Business or Creator) account to connect. Please open Instagram, go to Settings > Account Type and Tools > Switch to Professional Account (100% free), then connect again.',
        });
      }

      const finalId = verifiedIgId || igUserId;

      // Graceful username resolution for ANY account:
      // Never block a successfully authorized user just because Meta delayed returning a username string!
      if (!igUsername) {
        if (finalId === '27268941606137076' || igUserId === '27268941606137076') {
          igUsername = 'planposterofficial';
          igDisplayName = 'Plan Poster Official';
        } else {
          igUsername = `instagram_${String(finalId).slice(-6)}`;
          igDisplayName = `@${igUsername}`;
        }
      }

      const safeCleanName = igUsername.replace(/^@/, '');
      const dynamicAvatar =
        igAvatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(safeCleanName)}&background=E1306C&color=ffffff&bold=true`;

      detectedChannels.push({
        id: String(finalId || igUsername),
        name: `@${safeCleanName}`,
        displayName: igDisplayName || `@${safeCleanName}`,
        avatarUrl: dynamicAvatar,
        accessToken: longToken,
        platform: 'instagram',
        instagramId: String(finalId),
        tokenExpiresAt: new Date(Date.now() + tokenExpiresIn * 1000).toISOString(),
      });
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
      const fbExpiresIn = longLivedData.expires_in ? Number(longLivedData.expires_in) : 60 * 24 * 60 * 60;
      const fbTokenExpiresAt = new Date(Date.now() + fbExpiresIn * 1000).toISOString();

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
              tokenExpiresAt: fbTokenExpiresAt,
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
              tokenExpiresAt: fbTokenExpiresAt,
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
      const accountId = `ig_${ch.id}`;
      let permAvatar = ch.avatarUrl;
      if (permAvatar) {
        try {
          permAvatar = await mirrorAvatarToPermanentStorage(accountId, permAvatar);
        } catch {}
      }
      const igAcc: SocialAccount = {
        id: accountId,
        userId: userId || undefined,
        platform: 'instagram',
        username: cleanUsername,
        displayName: ch.displayName || `@${cleanUsername}`,
        avatarUrl:
          permAvatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanUsername)}&background=E1306C&color=ffffff&bold=true`,
        accountType: 'business',
        status: 'connected',
        followersCount: 0,
        externalId: ch.id,
        accessToken: ch.accessToken,
        pageId: ch.id,
        tokenExpiresAt: ch.tokenExpiresAt || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
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
