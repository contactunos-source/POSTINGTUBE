import { NextRequest, NextResponse } from 'next/server';

/**
 * Official Meta OAuth Scopes for Facebook Pages & Publishing:
 * - public_profile: Basic profile identity
 * - pages_show_list: Discovers all Facebook Pages the user manages
 * - pages_read_engagement: Reads Page engagement, published status, and verification
 * - pages_manage_posts: Creates, manages, and publishes content, reels, and photos
 */
const FACEBOOK_SCOPES = [
  'public_profile',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
];

export async function GET(req: NextRequest) {
  const appId = process.env.FACEBOOK_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const baseUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const redirectUri = `${baseUrl}/api/auth/facebook/callback`;
  const workspaceId = req.nextUrl.searchParams.get('workspace_id') || '';

  if (!appId) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard?tab=connections&error=${encodeURIComponent(
        'Please configure FACEBOOK_APP_ID in your environment variables to enable Facebook Login.'
      )}`
    );
  }

  const scopes = FACEBOOK_SCOPES.join(',');

  const stateObj = {
    workspaceId,
    platform: 'facebook',
  };
  const state = encodeURIComponent(JSON.stringify(stateObj));

  // auth_type=rerequest forces Meta to always display the complete permissions review dialog
  const fbAuthUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${encodeURIComponent(
    appId
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(
    scopes
  )}&state=${state}&response_type=code&auth_type=rerequest`;

  return NextResponse.redirect(fbAuthUrl);
}
