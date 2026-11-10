import { NextRequest, NextResponse } from 'next/server';

/**
 * Dedicated Instagram OAuth Route.
 *
 * Implements Meta's official "Instagram API (Unified Login) - Instagram Login Compatible"
 * using Configuration ID: 1863450354684620 and App ID: 3482720281909354.
 *
 * This allows users to log in directly with their Instagram account credentials,
 * shows the native Instagram permission authorization screen (like Buffer),
 * and redirects securely to our callback without "Invalid redirect_uri" errors.
 */

const DIRECT_IG_SCOPES = [
  'instagram_business_basic',
  'instagram_business_content_publish',
  'instagram_business_manage_messages',
  'instagram_business_manage_comments',
];

const META_GRAPH_IG_SCOPES = [
  'public_profile',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
];

export async function GET(req: NextRequest) {
  const fbAppId = process.env.FACEBOOK_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '3482720281909354';
  const igAppId = process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || '2116988269210142';
  const configId = process.env.FACEBOOK_INSTAGRAM_CONFIG_ID || '1863450354684620';
  const workspaceId = req.nextUrl.searchParams.get('workspace_id') || '';
  const userId = req.nextUrl.searchParams.get('user_id') || '';
  const requestedMode = req.nextUrl.searchParams.get('mode'); // 'unified' (default) | 'instagram_dot_com' | 'facebook'

  // Detect incoming request host and protocol dynamically
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || (host && !host.includes('localhost') ? 'https' : 'http');
  const requestOrigin = host ? `${proto}://${host}` : req.nextUrl.origin;

  // Determine production HTTPS callback URL
  let redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
  if (!redirectUri) {
    if (requestOrigin.startsWith('https://')) {
      redirectUri = `${requestOrigin}/api/auth/instagram/callback`;
    } else {
      const httpsBase =
        (process.env.APP_URL?.startsWith('https') && process.env.APP_URL) ||
        (process.env.NEXT_PUBLIC_APP_URL?.startsWith('https') && process.env.NEXT_PUBLIC_APP_URL) ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://planposter.com');
      redirectUri = `${httpsBase}/api/auth/instagram/callback`;
    }
  }

  // ---------------------------------------------------------------------------
  // OPTION 1: Meta Unified Login with Configuration ID (RECOMMENDED / DEFAULT)
  // This is Meta's official Instagram Login for Business framework.
  // Presents Instagram Login option & consent dialog directly.
  // ---------------------------------------------------------------------------
  if (!requestedMode || requestedMode === 'unified' || requestedMode === 'direct') {
    const stateObj = {
      workspaceId,
      userId,
      platform: 'instagram',
      mode: 'unified',
      returnUrl: requestOrigin,
      usedRedirectUri: redirectUri,
    };
    const state = encodeURIComponent(JSON.stringify(stateObj));

    // Notice: Uses client_id=fbAppId with config_id=1863450354684620.
    // Permissions are managed by the configuration on Meta's servers.
    const unifiedUrl = `https://www.facebook.com/dialog/oauth?client_id=${encodeURIComponent(
      fbAppId
    )}&config_id=${encodeURIComponent(
      configId
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&state=${state}&display=popup&override_default_response_type=true`;

    return NextResponse.redirect(unifiedUrl);
  }

  // ---------------------------------------------------------------------------
  // OPTION 2: Legacy Direct instagram.com Authorization (for standalone IG apps)
  // ---------------------------------------------------------------------------
  if (requestedMode === 'instagram_dot_com') {
    const stateObj = {
      workspaceId,
      userId,
      platform: 'instagram',
      mode: 'instagram_dot_com',
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

  // ---------------------------------------------------------------------------
  // OPTION 3: Classic Meta Graph API via Facebook Login dialog
  // ---------------------------------------------------------------------------
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
