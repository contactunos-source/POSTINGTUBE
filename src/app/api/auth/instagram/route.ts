import { NextRequest, NextResponse } from 'next/server';

/**
 * Dedicated Instagram OAuth Route.
 * Completely isolated from Facebook OAuth to prevent any cross-linking or shared redirects.
 * Requests Meta Graph API Instagram Publishing permissions:
 * - public_profile
 * - pages_show_list
 * - pages_read_engagement
 * - pages_manage_posts
 * - instagram_basic
 * - instagram_content_publish
 */
const INSTAGRAM_SCOPES = [
  'public_profile',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
];

export async function GET(req: NextRequest) {
  const appId = process.env.FACEBOOK_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const baseUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;
  const workspaceId = req.nextUrl.searchParams.get('workspace_id') || '';

  if (!appId) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard?tab=connections&platform=instagram&error=${encodeURIComponent(
        'Please configure FACEBOOK_APP_ID in your environment variables to enable Instagram Login.'
      )}`
    );
  }

  const scopes = INSTAGRAM_SCOPES.join(',');

  const stateObj = {
    workspaceId,
    platform: 'instagram',
  };
  const state = encodeURIComponent(JSON.stringify(stateObj));

  const igAuthUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${encodeURIComponent(
    appId
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(
    scopes
  )}&state=${state}&response_type=code&auth_type=rerequest`;

  return NextResponse.redirect(igAuthUrl);
}
