import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db';
import { SocialAccount } from '@/types/social';

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
  let returnBaseUrl = defaultBaseUrl;

  if (stateRaw) {
    try {
      const parsed = JSON.parse(decodeURIComponent(stateRaw));
      workspaceId = parsed.workspaceId || '';
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
    const avatarUrl = profile.picture || '';
    const username = (profile.email ? profile.email.split('@')[0] : profile.sub) || 'linkedin_user';

    const discoveredAccounts: DiscoveredAccount[] = [];

    // Personal Profile Account Model
    const personalAccount: SocialAccount = {
      id: `li_${profile.sub}`,
      platform: 'linkedin',
      username,
      displayName,
      avatarUrl,
      accountType: 'profile',
      accessToken,
      refreshToken,
      tokenExpiresAt,
      pageId: personUrn,
      externalId: personUrn,
      status: 'connected',
      followersCount: 0,
    };

    // 3. Attempt Organization / Company Page Discovery (if scope permitted)
    try {
      const orgAclRes = await fetch(
        'https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&state=APPROVED',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      );

      if (orgAclRes.ok) {
        const orgAclData = await orgAclRes.json();
        const elements: any[] = orgAclData.elements || [];

        for (const acl of elements) {
          const orgUrn = acl.organizationalTarget; // e.g., urn:li:organization:123456
          if (orgUrn && orgUrn.startsWith('urn:li:organization:')) {
            const orgId = orgUrn.replace('urn:li:organization:', '');
            try {
              const orgRes = await fetch(`https://api.linkedin.com/v2/organizations/${orgId}`, {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'X-Restli-Protocol-Version': '2.0.0',
                },
              });
              if (orgRes.ok) {
                const orgData = await orgRes.json();
                const orgName = orgData.localizedName || orgData.vanityName || `Company (${orgId})`;
                const orgUsername = orgData.vanityName || `org_${orgId}`;
                const orgAvatar =
                  orgData.logoV2?.['cropped~']?.elements?.[0]?.identifiers?.[0]?.identifier ||
                  orgData.coverPhotoV2?.['cropped~']?.elements?.[0]?.identifiers?.[0]?.identifier ||
                  '';

                const orgAccount: SocialAccount = {
                  id: `li_org_${orgId}`,
                  platform: 'linkedin',
                  username: orgUsername,
                  displayName: `${orgName} (Company Page)`,
                  avatarUrl: orgAvatar,
                  accountType: 'business',
                  accessToken,
                  refreshToken,
                  tokenExpiresAt,
                  pageId: orgUrn,
                  externalId: orgUrn,
                  status: 'connected',
                  followersCount: 0,
                };

                const orgSaveRes = await DatabaseService.saveAccount(orgAccount, workspaceId);
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
      console.info('[LinkedIn OAuth] Organization lookup skipped or not granted:', orgAclErr);
    }

    // 4. Save Personal Account
    const personalSaveRes = await DatabaseService.saveAccount(personalAccount, workspaceId);
    discoveredAccounts.unshift({
      account: personalAccount,
      isDuplicate: personalSaveRes.isDuplicate,
    });

    const primaryAccount = discoveredAccounts[0].account;
    const allWereDuplicate = discoveredAccounts.every((a) => a.isDuplicate);

    if (allWereDuplicate) {
      return makeRedirect({
        already_connected: 'true',
        connected_account_name: primaryAccount.displayName,
        connected_account_avatar: primaryAccount.avatarUrl || '',
      });
    }

    return makeRedirect({
      li_connect_success: 'true',
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
