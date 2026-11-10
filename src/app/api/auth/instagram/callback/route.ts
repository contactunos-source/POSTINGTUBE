import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db';
import { SocialAccount } from '@/types/social';
import { mirrorAvatarToPermanentStorage } from '@/lib/avatarStorage';

/**
 * Dedicated Instagram OAuth Callback Route.
 *
 * Supports:
 * 1. Meta Unified Login (config_id: 1863450354684620, Instagram Login Compatible)
 * 2. Legacy Direct Instagram OAuth
 * 3. Facebook Graph Page-linked Instagram accounts
 *
 * Discovers authorized Instagram Professional (Business / Creator) accounts
 * and persists them directly into Supabase.
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

  const fbAppId = process.env.FACEBOOK_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '3482720281909354';
  const fbAppSecret = process.env.FACEBOOK_APP_SECRET || 'b1433776560f5cf75695f4785a8c9fa6';
  const igAppId = process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || '2116988269210142';
  const igAppSecret = process.env.INSTAGRAM_APP_SECRET || fbAppSecret;

  let workspaceId = '';
  let userId = '';
  let authMode: 'unified' | 'instagram_dot_com' | 'facebook' = 'unified';
  let returnBaseUrl = defaultBaseUrl;
  let activeRedirectUri = `${defaultBaseUrl}/api/auth/instagram/callback`;

  if (stateRaw) {
    try {
      const parsed = JSON.parse(decodeURIComponent(stateRaw));
      workspaceId = parsed.workspaceId || '';
      userId = parsed.userId || '';
      if (parsed.mode === 'instagram_dot_com') {
        authMode = 'instagram_dot_com';
      } else if (parsed.mode === 'facebook') {
        authMode = 'facebook';
      } else {
        authMode = 'unified';
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
    let userToken = '';

    // =========================================================================
    // STEP 1: Code-to-Token Exchange
    // =========================================================================

    if (authMode === 'instagram_dot_com') {
      // Legacy standalone Instagram Basic Display / Consumer token exchange
      const directTokenForm = new URLSearchParams();
      directTokenForm.append('client_id', igAppId);
      directTokenForm.append('client_secret', igAppSecret);
      directTokenForm.append('grant_type', 'authorization_code');
      directTokenForm.append('redirect_uri', activeRedirectUri);
      directTokenForm.append('code', cleanCode);

      try {
        const directRes = await fetch('https://api.instagram.com/oauth/access_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: directTokenForm.toString(),
        });
        const directData = await directRes.json();
        userToken = directData.access_token || '';
      } catch (err) {
        console.warn('api.instagram.com token exchange failed:', err);
      }
    }

    // Default & Unified Login: Exchange code via Graph API using Meta App credentials
    if (!userToken) {
      const tokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${encodeURIComponent(
        fbAppId
      )}&client_secret=${encodeURIComponent(fbAppSecret)}&redirect_uri=${encodeURIComponent(
        activeRedirectUri
      )}&code=${encodeURIComponent(cleanCode)}`;

      const tokenRes = await fetch(tokenUrl);
      const tokenData = await tokenRes.json();

      if (tokenData.access_token) {
        const shortToken = tokenData.access_token;
        // Upgrade to 60-day Long-Lived Token
        try {
          const longUrl = `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(
            fbAppId
          )}&client_secret=${encodeURIComponent(fbAppSecret)}&fb_exchange_token=${encodeURIComponent(shortToken)}`;
          const longRes = await fetch(longUrl);
          const longData = await longRes.json();
          userToken = longData.access_token || shortToken;
        } catch {
          userToken = shortToken;
        }
      } else {
        return makeRedirect({
          error: tokenData.error?.message || 'Failed to exchange authorization code with Meta.',
        });
      }
    }

    if (!userToken) {
      return makeRedirect({
        error: 'Did not receive valid access token from Meta.',
      });
    }

    // =========================================================================
    // STEP 2: Multi-Strategy Instagram Account Discovery
    // =========================================================================

    // STRATEGY 1: Meta Unified Login - Assigned Instagram Accounts (/me/assigned_instagram_accounts)
    try {
      const assignedUrl = `https://graph.facebook.com/v20.0/me/assigned_instagram_accounts?fields=id,username,name,profile_picture_url&access_token=${encodeURIComponent(
        userToken
      )}`;
      const assignedRes = await fetch(assignedUrl);
      const assignedData = await assignedRes.json();

      if (assignedData?.data && Array.isArray(assignedData.data) && assignedData.data.length > 0) {
        for (const item of assignedData.data) {
          detectedChannels.push({
            id: String(item.id),
            name: item.username ? `@${item.username}` : (item.name ? `@${item.name}` : `@user_${item.id}`),
            avatarUrl: item.profile_picture_url || '',
            accessToken: userToken,
            platform: 'instagram',
            instagramId: String(item.id),
          });
        }
      }
    } catch (e) {
      console.warn('Strategy 1 (/me/assigned_instagram_accounts) warning:', e);
    }

    // STRATEGY 2: Facebook Pages with linked Instagram Business Account (/me/accounts)
    if (detectedChannels.length === 0) {
      try {
        const pagesUrl = `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,picture.type(large),access_token,instagram_business_account{id,username,name,profile_picture_url},connected_instagram_account{id,username,name,profile_picture_url}&access_token=${encodeURIComponent(
          userToken
        )}`;
        const pagesRes = await fetch(pagesUrl);
        const pagesData = await pagesRes.json();

        if (pagesData?.data && Array.isArray(pagesData.data)) {
          for (const p of pagesData.data) {
            const igAccount = p.instagram_business_account || p.connected_instagram_account;
            if (igAccount?.id) {
              let igUsername = igAccount.username || '';
              let igAvatar = igAccount.profile_picture_url || '';

              if (!igUsername || !igAvatar) {
                try {
                  const nodeRes = await fetch(
                    `https://graph.facebook.com/v20.0/${igAccount.id}?fields=id,username,name,profile_picture_url&access_token=${encodeURIComponent(
                      p.access_token || userToken
                    )}`
                  );
                  const nodeData = await nodeRes.json();
                  if (nodeData.username) igUsername = nodeData.username;
                  if (nodeData.profile_picture_url) igAvatar = nodeData.profile_picture_url;
                } catch {}
              }

              detectedChannels.push({
                id: String(igAccount.id),
                name: igUsername ? `@${igUsername}` : `@${p.name.toLowerCase().replace(/\s+/g, '')}`,
                avatarUrl: igAvatar || p.picture?.data?.url || '',
                accessToken: p.access_token || userToken,
                platform: 'instagram',
                instagramId: String(igAccount.id),
              });
            }
          }
        }
      } catch (e) {
        console.warn('Strategy 2 (/me/accounts) warning:', e);
      }
    }

    // STRATEGY 3: Direct User Node (/me)
    if (detectedChannels.length === 0) {
      try {
        const meRes = await fetch(
          `https://graph.facebook.com/v20.0/me?fields=id,username,name,profile_picture_url&access_token=${encodeURIComponent(
            userToken
          )}`
        );
        const meData = await meRes.json();
        if (meData?.id && (meData.username || meData.name)) {
          detectedChannels.push({
            id: String(meData.id),
            name: meData.username ? `@${meData.username}` : `@${meData.name.toLowerCase().replace(/\s+/g, '')}`,
            avatarUrl: meData.profile_picture_url || '',
            accessToken: userToken,
            platform: 'instagram',
            instagramId: String(meData.id),
          });
        }
      } catch (e) {
        console.warn('Strategy 3 (/me) warning:', e);
      }
    }

    // STRATEGY 4: Target Instagram Account node check
    const targetIgId = process.env.INSTAGRAM_ACCOUNT_ID || '17841417726295028';
    if (detectedChannels.length === 0 && targetIgId) {
      try {
        const targetRes = await fetch(
          `https://graph.facebook.com/v20.0/${targetIgId}?fields=id,username,name,profile_picture_url&access_token=${encodeURIComponent(
            userToken
          )}`
        );
        const targetData = await targetRes.json();
        if (targetData?.id && !targetData.error) {
          detectedChannels.push({
            id: String(targetData.id),
            name: targetData.username ? `@${targetData.username}` : `@account_${targetData.id}`,
            avatarUrl: targetData.profile_picture_url || '',
            accessToken: userToken,
            platform: 'instagram',
            instagramId: String(targetData.id),
          });
        }
      } catch (e) {
        console.warn('Strategy 4 (target node) warning:', e);
      }
    }

    // =========================================================================
    // STEP 3: Evaluation & Supabase Persistence
    // =========================================================================

    if (detectedChannels.length === 0) {
      return makeRedirect({
        no_instagram_found: 'true',
        platform: 'instagram',
      });
    }

    // Persist discovered Instagram accounts to Supabase
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
        displayName: `@${cleanUsername}`,
        avatarUrl:
          permAvatar ||
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
