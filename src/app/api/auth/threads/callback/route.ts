import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db';
import { SocialAccount } from '@/types/social';
import { mirrorAvatarToPermanentStorage } from '@/lib/avatarStorage';

/**
 * Dedicated Threads OAuth 2.0 Callback Route.
 * - Exchanges authorization code for Threads short-lived user token
 * - Upgrades token to 60-day long-lived access token
 * - Fetches profile info (id, username, name, avatar)
 * - Persists account directly into Supabase database (social_accounts table)
 */
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

  let redirectUri = process.env.THREADS_REDIRECT_URI || `${defaultBaseUrl}/api/auth/threads/callback`;
  const threadsAppId = process.env.THREADS_APP_ID || process.env.NEXT_PUBLIC_THREADS_APP_ID || '';
  const threadsAppSecret = process.env.THREADS_APP_SECRET || '';

  let workspaceId = '';
  let userId = '';
  let returnBaseUrl = defaultBaseUrl;

  if (stateRaw) {
    try {
      const parsed = JSON.parse(decodeURIComponent(stateRaw));
      workspaceId = parsed.workspaceId || '';
      userId = parsed.userId || '';
      if (parsed.returnUrl) returnBaseUrl = parsed.returnUrl;
      if (parsed.usedRedirectUri) redirectUri = parsed.usedRedirectUri;
    } catch {
      workspaceId = stateRaw;
    }
  }

  const makeRedirect = (params: Record<string, string>) => {
    const target = new URL('/dashboard', returnBaseUrl);
    target.searchParams.set('tab', 'connections');
    target.searchParams.set('platform', 'threads');
    if (workspaceId) {
      target.searchParams.set('workspace_id', workspaceId);
    }
    for (const [k, v] of Object.entries(params)) {
      target.searchParams.set(k, v);
    }
    return NextResponse.redirect(target.toString());
  };

  // 1. Check for cancellation or authorization error
  if (error || !code) {
    if (error === 'access_denied') {
      return makeRedirect({
        error: 'Threads authorization was cancelled or denied by user.',
      });
    }
    return makeRedirect({
      error: errorDescription || error || 'Threads authorization could not be completed.',
    });
  }

  if (!threadsAppId || !threadsAppSecret) {
    return makeRedirect({
      error: 'Missing THREADS_APP_ID or THREADS_APP_SECRET in server environment.',
    });
  }

  try {
    // 2. Exchange code for Short-Lived User Access Token
    const tokenForm = new URLSearchParams();
    tokenForm.append('client_id', threadsAppId);
    tokenForm.append('client_secret', threadsAppSecret);
    tokenForm.append('grant_type', 'authorization_code');
    tokenForm.append('redirect_uri', redirectUri);
    tokenForm.append('code', code);

    const tokenRes = await fetch('https://graph.threads.net/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenForm.toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      const errorMsg =
        tokenData.error_message ||
        tokenData.error?.message ||
        'Failed to exchange authorization code for Threads token.';
      console.error('[ThreadsOAuth] Short token exchange failed:', tokenData);
      return makeRedirect({ error: errorMsg });
    }

    const shortLivedToken: string = tokenData.access_token;
    const threadsUserId: string = String(tokenData.user_id || '');

    // 3. Exchange for 60-day Long-Lived Token
    let finalToken = shortLivedToken;
    let expiresInSec = 5184000; // 60 days default

    try {
      const longLivedUrl = `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${encodeURIComponent(
        threadsAppSecret
      )}&access_token=${encodeURIComponent(shortLivedToken)}`;

      const longLivedRes = await fetch(longLivedUrl);
      const longLivedData = await longLivedRes.json();

      if (longLivedRes.ok && longLivedData.access_token) {
        finalToken = longLivedData.access_token;
        if (longLivedData.expires_in) {
          expiresInSec = longLivedData.expires_in;
        }
      }
    } catch (e) {
      console.warn('[ThreadsOAuth] Long-lived token exchange notice:', e);
    }

    // 4. Fetch User Profile
    let username = 'threads_user';
    let displayName = 'Threads Profile';
    let avatarUrl = '';

    try {
      const profileRes = await fetch(
        `https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url,threads_biography&access_token=${encodeURIComponent(
          finalToken
        )}`
      );
      const profileData = await profileRes.json();

      if (profileData && profileData.username) {
        username = profileData.username.toLowerCase().replace(/^@/, '');
        displayName = profileData.name || `@${username}`;
        avatarUrl = profileData.threads_profile_picture_url || '';
      }
    } catch (e) {
      console.warn('[ThreadsOAuth] Could not fetch profile data:', e);
    }

    const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      displayName || username
    )}&background=000000&color=ffffff&size=256&bold=true`;
    const finalAvatar = avatarUrl || fallbackAvatar;

    const accountId = `th_${threadsUserId || username}`;

    // Mirror avatar to permanent storage in background
    if (finalAvatar && !finalAvatar.includes('supabase.co/storage')) {
      mirrorAvatarToPermanentStorage(accountId, finalAvatar).catch((err) => {
        console.warn('[ThreadsOAuth] Background avatar mirror notice:', err);
      });
    }

    // 5. Persist into Supabase database (social_accounts table)
    const threadsAccount: SocialAccount = {
      id: accountId,
      userId: userId || undefined,
      platform: 'threads',
      username,
      displayName,
      avatarUrl: finalAvatar,
      accountType: 'profile',
      status: 'connected',
      followersCount: 0,
      externalId: threadsUserId,
      accessToken: finalToken,
      tokenExpiresAt: new Date(Date.now() + expiresInSec * 1000).toISOString(),
    };

    await DatabaseService.saveAccount(threadsAccount, userId, workspaceId);

    // 6. Return to Connections page with success state
    return makeRedirect({
      th_connect_success: 'true',
      platform: 'threads',
      connected_account_name: displayName,
      connected_account_avatar: finalAvatar,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to complete Threads OAuth flow.';
    console.error('[ThreadsOAuth] Exception:', err);
    return makeRedirect({ error: msg });
  }
}
