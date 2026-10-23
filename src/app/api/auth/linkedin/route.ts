import { NextRequest, NextResponse } from 'next/server';

/**
 * LinkedIn OAuth 2.0 Authorization Endpoint (Official LinkedIn REST / OpenID Flow)
 *
 * Supported Products & Scopes:
 * - "Sign In with LinkedIn using OpenID Connect": openid, profile, email
 * - "Share on LinkedIn": w_member_social (Personal profile publishing)
 * - "Community Management API" (Optional / for Company Pages):
 *     w_organization_social, r_organization_social, rw_organization_admin
 */
const DEFAULT_LINKEDIN_SCOPES = [
  'openid',
  'profile',
  'email',
  'w_member_social',
];

// If organization/company page management is approved in Developer Portal
const ORGANIZATION_SCOPES = [
  'w_organization_social',
  'r_organization_social',
  'rw_organization_admin',
];

export async function GET(req: NextRequest) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const workspaceId = req.nextUrl.searchParams.get('workspace_id') || '';
  const includeOrg = req.nextUrl.searchParams.get('include_org') === 'true';

  // Determine host and protocol dynamically
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || (host && !host.includes('localhost') ? 'https' : 'http');
  const requestOrigin = host ? `${proto}://${host}` : req.nextUrl.origin;

  const baseUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    requestOrigin;

  const redirectUri =
    process.env.LINKEDIN_REDIRECT_URI ||
    `${baseUrl}/api/auth/linkedin/callback`;

  if (!clientId) {
    const errorMsg =
      'LinkedIn Client ID is not configured. Please set LINKEDIN_CLIENT_ID in your environment variables.';
    return NextResponse.redirect(
      `${baseUrl}/dashboard?tab=connections&platform=linkedin&error=${encodeURIComponent(errorMsg)}`
    );
  }

  // Create state parameter with workspace ID and CSRF random salt
  const stateObj = {
    workspaceId,
    platform: 'linkedin',
    csrf: Math.random().toString(36).substring(2, 15),
    returnUrl: baseUrl,
    includeOrg,
  };
  const state = encodeURIComponent(JSON.stringify(stateObj));

  // Determine scopes to request
  const scopes = includeOrg
    ? [...DEFAULT_LINKEDIN_SCOPES, ...ORGANIZATION_SCOPES]
    : DEFAULT_LINKEDIN_SCOPES;

  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes.join(' '));
  authUrl.searchParams.set('state', state);

  return NextResponse.redirect(authUrl.toString());
}
