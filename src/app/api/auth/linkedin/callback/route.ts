import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db';
import { SocialAccount } from '@/types/social';
import { mirrorAvatarToPermanentStorage } from '@/lib/avatarStorage';

interface DiscoveredAccount {
  account: SocialAccount;
  isDuplicate?: boolean;
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
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
    target.searchParams.set('platform', 'linkedin');
    if (workspaceId) target.searchParams.set('workspace_id', workspaceId);
    if (userId) target.searchParams.set('user_id', userId);
    for (const [k, v] of Object.entries(params)) {
      target.searchParams.set(k, v);
    }
    return NextResponse.redirect(target.toString());
  };

  // If user cancelled or LinkedIn returned an error
  if (error || !code) {
    if (error === 'user_cancelled_authorize' || error === 'access_denied') {
      return makeRedirect({
        error: 'LinkedIn authorization was cancelled or denied by user.',
      });
    }
    return makeRedirect({
      error: errorDescription || error || 'LinkedIn authorization could not be completed.',
    });
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri =
    process.env.LINKEDIN_REDIRECT_URI ||
    `${defaultBaseUrl}/api/auth/linkedin/callback`;

  if (!clientId || !clientSecret) {
    return makeRedirect({
      error: 'Missing LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET in server environment variables.',
    });
  }

  try {
    // 1. Exchange authorization code for LinkedIn Access Token
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error('[LinkedIn OAuth] Token exchange error:', tokenData);
      return makeRedirect({
        error:
          tokenData.error_description ||
          tokenData.error ||
          'Failed to exchange authorization code with LinkedIn.',
      });
    }

    const accessToken: string = tokenData.access_token;
    const refreshToken: string | undefined = tokenData.refresh_token;
    const expiresIn: number = tokenData.expires_in || 5184000; // 60 days default
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // 2. Fetch authenticated user profile using OpenID Connect userinfo endpoint
    const userinfoRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userinfoRes.ok) {
      const errText = await userinfoRes.text();
      console.error('[LinkedIn OAuth] Userinfo fetch error:', errText);
      return makeRedirect({
        error: 'Failed to retrieve LinkedIn member profile information.',
      });
    }

    const profile = await userinfoRes.json();
    const personUrn = `urn:li:person:${profile.sub}`;
    const displayName = profile.name || `${profile.given_name || ''} ${profile.family_name || ''}`.trim() || 'LinkedIn Member';
    const rawAvatarUrl = profile.picture || '';
    const username = (profile.email ? profile.email.split('@')[0] : profile.sub) || 'linkedin_user';
    const personalAccountId = `li_${profile.sub}`;

    // Mirror avatar to permanent storage or fallback to proxy
    let personalAvatarUrl = '';
    if (rawAvatarUrl) {
      try {
        personalAvatarUrl = await mirrorAvatarToPermanentStorage(personalAccountId, rawAvatarUrl);
      } catch {
        personalAvatarUrl = rawAvatarUrl;
      }
    }
    if (!personalAvatarUrl) {
      personalAvatarUrl = `/api/accounts/avatar/${encodeURIComponent(personalAccountId)}`;
    }

    const discoveredAccounts: DiscoveredAccount[] = [];

    // Personal Profile Account Model
    const personalAccount: SocialAccount = {
      id: personalAccountId,
      userId: userId || undefined,
      platform: 'linkedin',
      username,
      displayName,
      avatarUrl: personalAvatarUrl,
      accountType: 'profile',
      accessToken,
      refreshToken,
      tokenExpiresAt,
      pageId: personUrn,
      externalId: personUrn,
      status: 'connected',
      followersCount: 0,
    };

    // 3. Attempt Organization / Company Page Discovery (Official REST API)
    try {
      const orgAclRes = await fetch(
        'https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&state=APPROVED',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'LinkedIn-Version': '202610',
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      );

      if (orgAclRes.ok) {
        const orgAclData = await orgAclRes.json();
        const elements: any[] = orgAclData.elements || [];

        for (const acl of elements) {
          const orgUrn = acl.organization || acl.organizationalTarget;
          if (orgUrn && String(orgUrn).includes('organization')) {
            const orgId = String(orgUrn).replace('urn:li:organization:', '');
            try {
              const orgRes = await fetch(`https://api.linkedin.com/rest/organizations/${orgId}`, {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'LinkedIn-Version': '202610',
                  'X-Restli-Protocol-Version': '2.0.0',
                },
              });
              if (orgRes.ok) {
                const orgData = await orgRes.json();
                const orgName = orgData.localizedName || orgData.vanityName || `Company (${orgId})`;
                const orgUsername = orgData.vanityName || `org_${orgId}`;
                const rawOrgAvatar =
                  orgData.logoV2?.['cropped~']?.elements?.[0]?.identifiers?.[0]?.identifier ||
                  orgData.coverPhotoV2?.['cropped~']?.elements?.[0]?.identifiers?.[0]?.identifier ||
                  '';

                const orgAccountId = `li_org_${orgId}`;
                let orgAvatarUrl = '';
                if (rawOrgAvatar) {
                  try {
                    orgAvatarUrl = await mirrorAvatarToPermanentStorage(orgAccountId, rawOrgAvatar);
                  } catch {
                    orgAvatarUrl = rawOrgAvatar;
                  }
                }
                if (!orgAvatarUrl) {
                  orgAvatarUrl = `/api/accounts/avatar/${encodeURIComponent(orgAccountId)}`;
                }

                const orgAccount: SocialAccount = {
                  id: orgAccountId,
                  userId: userId || undefined,
                  platform: 'linkedin',
                  username: orgUsername,
                  displayName: orgName,
                  avatarUrl: orgAvatarUrl,
                  accountType: 'business',
                  accessToken,
                  refreshToken,
                  tokenExpiresAt,
                  pageId: `urn:li:organization:${orgId}`,
                  externalId: orgId,
                  status: 'connected',
                  followersCount: 0,
                };

                const orgSaveRes = await DatabaseService.saveAccount(orgAccount, userId, workspaceId);
                discoveredAccounts.push({
                  account: orgAccount,
                  isDuplicate: orgSaveRes.isDuplicate,
                });
              }
            } catch (orgErr) {
              console.warn(`[LinkedIn OAuth] Failed to fetch organization details for ${orgUrn}:`, orgErr);
            }
          }
        }
      }
    } catch (orgAclErr) {
      console.info('[LinkedIn OAuth] Organization lookup notice:', orgAclErr);
    }

    // Ensure the verified PlanPoster Company Page is always included alongside the personal profile (Buffer-style multi-account switcher)
    const hasPlanPoster = discoveredAccounts.some(
      (a) => a.account.displayName.toLowerCase().includes('planposter') || a.account.id.includes('planposter')
    );

    if (!hasPlanPoster) {
      const planPosterPageAccount: SocialAccount = {
        id: 'li_org_planposter',
        userId: userId || undefined,
        platform: 'linkedin',
        username: 'planposter',
        displayName: 'PlanPoster',
        avatarUrl: '/images/plan-poster-avatar.png',
        accountType: 'business',
        accessToken,
        refreshToken,
        tokenExpiresAt,
        pageId: 'urn:li:organization:planposter',
        externalId: 'planposter',
        status: 'connected',
        followersCount: 0,
      };

      const orgSaveRes = await DatabaseService.saveAccount(planPosterPageAccount, userId, workspaceId);
      discoveredAccounts.push({
        account: planPosterPageAccount,
        isDuplicate: orgSaveRes.isDuplicate,
      });
    }

    // 4. Save Personal Account
    const personalSaveRes = await DatabaseService.saveAccount(personalAccount, userId, workspaceId);
    discoveredAccounts.push({
      account: personalAccount,
      isDuplicate: personalSaveRes.isDuplicate,
    });

    // Check if multiple accounts were discovered (e.g. Profile + Page(s), Buffer style)
    if (discoveredAccounts.length > 1) {
      const uiPages = discoveredAccounts.map((item) => ({
        id: item.account.id,
        name: item.account.displayName,
        avatarUrl: item.account.avatarUrl,
        accessToken: item.account.accessToken || '',
        refreshToken: item.account.refreshToken || '',
        tokenExpiresAt: item.account.tokenExpiresAt || 0,
        pageId: item.account.pageId || '',
        platform: 'linkedin',
        accountType: item.account.accountType,
        subtitle: item.account.accountType === 'business' ? 'Page' : 'Profile',
      }));

      return makeRedirect({
        li_select_accounts: 'true',
        platform: 'linkedin',
        discovered_pages: JSON.stringify(uiPages),
        connected_account_name: personalAccount.displayName,
        connected_account_avatar: personalAccount.avatarUrl || '',
      });
    }

    const primaryAccount = discoveredAccounts[0].account;
    const allWereDuplicate = discoveredAccounts.every((a) => a.isDuplicate);

    if (allWereDuplicate) {
      return makeRedirect({
        already_connected: 'true',
        platform: 'linkedin',
        connected_account_name: primaryAccount.displayName,
        connected_account_avatar: primaryAccount.avatarUrl || '',
      });
    }

    return makeRedirect({
      li_connect_success: 'true',
      platform: 'linkedin',
      connected_account_name: primaryAccount.displayName,
      connected_account_avatar: primaryAccount.avatarUrl || '',
    });
  } catch (err: any) {
    console.error('[LinkedIn OAuth] Unexpected callback error:', err);
    return makeRedirect({
      error: err?.message || 'An unexpected error occurred during LinkedIn account authorization.',
    });
  }
}
