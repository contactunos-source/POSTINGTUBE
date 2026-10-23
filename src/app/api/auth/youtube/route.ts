import { NextRequest, NextResponse } from 'next/server';

/**
 * YouTube OAuth 2.0 Authorization Endpoint (Official Google OAuth 2.0 Web Server Flow)
 *
 * Scopes:
 * - https://www.googleapis.com/auth/youtube.upload: Upload and manage videos
 * - https://www.googleapis.com/auth/youtube.readonly: Retrieve channel identity, subscriber count, and metadata
 * - https://www.googleapis.com/auth/userinfo.profile: Google profile name & avatar
 */
const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
];

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID;
  const workspaceId = req.nextUrl.searchParams.get('workspace_id') || '';

  // Determine host and protocol dynamically
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || (host && !host.includes('localhost') ? 'https' : 'http');
  const requestOrigin = host ? `${proto}://${host}` : req.nextUrl.origin;

  const baseUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    requestOrigin;

  const redirectUri = process.env.YOUTUBE_REDIRECT_URI || `${baseUrl}/api/auth/youtube/callback`;

  if (!clientId) {
    const errorMsg = 'Google Client ID is not configured. Please set GOOGLE_CLIENT_ID in your environment variables.';
    return NextResponse.redirect(
      `${baseUrl}/dashboard?tab=connections&platform=youtube&error=${encodeURIComponent(errorMsg)}`
    );
  }

  // Create state parameter with workspace ID and CSRF random salt
  const stateObj = {
    workspaceId,
    platform: 'youtube',
    csrf: Math.random().toString(36).substring(2, 15),
    returnUrl: baseUrl,
  };
  const state = encodeURIComponent(JSON.stringify(stateObj));

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', YOUTUBE_SCOPES.join(' '));
  authUrl.searchParams.set('access_type', 'offline'); // Requests refresh_token
  authUrl.searchParams.set('prompt', 'consent'); // Guarantees refresh_token on repeated approvals
  authUrl.searchParams.set('state', state);

  return NextResponse.redirect(authUrl.toString());
}
