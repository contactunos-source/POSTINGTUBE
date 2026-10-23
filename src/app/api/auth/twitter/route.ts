import { NextRequest, NextResponse } from 'next/server';
import { generateCodeVerifier, generateCodeChallenge } from '@/lib/twitter';

/**
 * X (Twitter) OAuth 2.0 Authorization Endpoint with PKCE
 *
 * Official Scopes:
 * - tweet.read: Read tweets and profile context
 * - tweet.write: Create, delete, and publish tweets
 * - users.read: Retrieve user handle, display name, and avatar
 * - offline.access: Obtains a refresh_token for persistent background publishing
 */
const TWITTER_SCOPES = [
  'tweet.read',
  'tweet.write',
  'users.read',
  'offline.access',
];

export async function GET(req: NextRequest) {
  const clientId = process.env.TWITTER_CLIENT_ID || process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID;
  const workspaceId = req.nextUrl.searchParams.get('workspace_id') || '';

  // Detect host and protocol dynamically
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || (host && !host.includes('localhost') ? 'https' : 'http');
  const requestOrigin = host ? `${proto}://${host}` : req.nextUrl.origin;

  const baseUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    requestOrigin;

  const redirectUri = process.env.TWITTER_REDIRECT_URI || `${baseUrl}/api/auth/twitter/callback`;

  if (!clientId) {
    const errorMsg = 'X (Twitter) Client ID is not configured. Please set TWITTER_CLIENT_ID in your environment variables.';
    return NextResponse.redirect(
      `${baseUrl}/dashboard?tab=connections&platform=twitter&error=${encodeURIComponent(errorMsg)}`
    );
  }

  // 1. Generate PKCE code verifier and code challenge
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // 2. Prepare state parameter with workspace ID and CSRF token
  const stateObj = {
    workspaceId,
    platform: 'twitter',
    csrf: Math.random().toString(36).substring(2, 15),
    returnUrl: baseUrl,
    redirectUri,
  };
  const state = encodeURIComponent(JSON.stringify(stateObj));

  // 3. Construct official X authorization URL
  const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', TWITTER_SCOPES.join(' '));
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  // 4. Set HTTP-only cookie with code_verifier for exchange in callback
  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set('pb_tw_verifier', codeVerifier, {
    httpOnly: true,
    secure: proto === 'https',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes
  });

  return response;
}
