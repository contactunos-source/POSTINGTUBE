import { NextRequest, NextResponse } from 'next/server';

/**
 * Dedicated Instagram OAuth Route.
 * Completely isolated from Facebook OAuth to prevent any cross-linking or shared redirects.
 * 
 * Supports two official Meta flows:
 * 1. Direct Instagram Login for Business (https://www.instagram.com/oauth/authorize)
 *    Used when INSTAGRAM_APP_ID is configured.
 * 2. Meta Graph API via Facebook Login (https://www.facebook.com/v20.0/dialog/oauth)
 *    Requests official Instagram publishing permissions:
 *    - public_profile
 *    - pages_show_list
 *    - pages_read_engagement
 *    - pages_manage_posts
 *    - instagram_basic
 *    - instagram_content_publish
 */
const META_GRAPH_IG_SCOPES = [
  'public_profile',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
];

const DIRECT_IG_SCOPES = [
  'instagram_business_basic',
  'instagram_business_content_publish',
  'instagram_business_manage_messages',
  'instagram_business_manage_comments',
];

export async function GET(req: NextRequest) {
  const fbAppId = process.env.FACEBOOK_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const igAppId = process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID;
  const baseUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;
  const workspaceId = req.nextUrl.searchParams.get('workspace_id') || '';
  const requestedMode = req.nextUrl.searchParams.get('mode'); // 'direct' | 'facebook'

  // Decide mode: use direct Instagram OAuth if an INSTAGRAM_APP_ID exists and mode is not forced to facebook
  const useDirect = igAppId && requestedMode !== 'facebook';

  if (useDirect) {
    const stateObj = {
      workspaceId,
      platform: 'instagram',
      mode: 'direct',
    };
    const state = encodeURIComponent(JSON.stringify(stateObj));
    const scopes = DIRECT_IG_SCOPES.join(',');

    const directUrl = `https://www.instagram.com/oauth/authorize?client_id=${encodeURIComponent(
      igAppId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(
      scopes
    )}&response_type=code&state=${state}&enable_fb_login=1&force_reauth=true`;

    return NextResponse.redirect(directUrl);
  }

  // Fallback to Meta Graph API via Facebook Login dialog
  if (!fbAppId) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard?tab=connections&platform=instagram&error=${encodeURIComponent(
        'Please configure FACEBOOK_APP_ID in your environment variables to enable Instagram Login.'
      )}`
    );
  }

  const scopes = META_GRAPH_IG_SCOPES.join(',');
  const stateObj = {
    workspaceId,
    platform: 'instagram',
    mode: 'facebook',
  };
  const state = encodeURIComponent(JSON.stringify(stateObj));

  const igAuthUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${encodeURIComponent(
    fbAppId
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(
    scopes
  )}&state=${state}&response_type=code&auth_type=rerequest`;

  return NextResponse.redirect(igAuthUrl);
}
