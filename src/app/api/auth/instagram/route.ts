import { NextRequest, NextResponse } from 'next/server';

/**
 * Dedicated Instagram OAuth Route.
 * Completely isolated from Facebook OAuth to prevent any cross-linking or shared redirects.
 * 
 * Supports:
 * 1. Direct Instagram Login for Business (https://www.instagram.com/oauth/authorize)
 *    Used when INSTAGRAM_APP_ID is configured.
 * 2. Meta Graph API via Facebook Login (https://www.facebook.com/v20.0/dialog/oauth)
 *    Requests official Instagram publishing permissions.
 *
 * NOTE ON REDIRECT_URI:
 * Instagram OAuth strictly requires an HTTPS redirect URI matching the Meta App settings.
 * If running on HTTP localhost, it defaults to the registered HTTPS production domain
 * (https://postingtube.vercel.app/api/auth/instagram/callback) and preserves the local origin
 * in state.returnUrl so the user returns seamlessly to their local dashboard after authorization.
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
  const workspaceId = req.nextUrl.searchParams.get('workspace_id') || '';
  const userId = req.nextUrl.searchParams.get('user_id') || '';
  const requestedMode = req.nextUrl.searchParams.get('mode'); // 'direct' | 'facebook'

  // Detect incoming request host and protocol dynamically
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || (host && !host.includes('localhost') ? 'https' : 'http');
  const requestOrigin = host ? `${proto}://${host}` : req.nextUrl.origin;

  // Decide mode: use direct Instagram OAuth if an INSTAGRAM_APP_ID exists and mode is not forced to facebook
  const useDirect = igAppId && requestedMode !== 'facebook';

  // Compute compliant redirect URI
  let redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
  if (!redirectUri) {
    if (requestOrigin.startsWith('https://')) {
      redirectUri = `${requestOrigin}/api/auth/instagram/callback`;
    } else {
      // Instagram API requires HTTPS. When testing locally, default to the registered HTTPS Vercel URL
      const httpsBase =
        (process.env.APP_URL?.startsWith('https') && process.env.APP_URL) ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://postingtube.vercel.app');
      redirectUri = `${httpsBase}/api/auth/instagram/callback`;
    }
  }

  if (useDirect) {
    const stateObj = {
      workspaceId,
      userId,
      platform: 'instagram',
      mode: 'direct',
      returnUrl: requestOrigin,
      usedRedirectUri: redirectUri,
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
      `${requestOrigin}/dashboard?tab=connections&platform=instagram&error=${encodeURIComponent(
        'Please configure FACEBOOK_APP_ID in your environment variables to enable Instagram Login.'
      )}`
    );
  }

  const scopes = META_GRAPH_IG_SCOPES.join(',');
  const stateObj = {
    workspaceId,
    userId,
    platform: 'instagram',
    mode: 'facebook',
    returnUrl: requestOrigin,
    usedRedirectUri: redirectUri,
  };
  const state = encodeURIComponent(JSON.stringify(stateObj));

  const igAuthUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${encodeURIComponent(
    fbAppId
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(
    scopes
  )}&state=${state}&response_type=code&auth_type=rerequest`;

  return NextResponse.redirect(igAuthUrl);
}
