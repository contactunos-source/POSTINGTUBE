import { NextRequest, NextResponse } from 'next/server';

/**
 * Verified Meta Scopes for Facebook Pages & Instagram publishing:
 * - public_profile: Basic profile verification
 * - pages_show_list: Discovers all Facebook Pages managed by user
 * - pages_read_engagement: Reads page status, posts, and verification
 * - pages_manage_posts: Publishes content, reels, and photos to Facebook Pages
 * - instagram_basic: Discovers connected Instagram Business accounts
 * - instagram_content_publish: Publishes posts, reels, and carousels to Instagram
 *
 * Excluded to prevent "Invalid Scopes" error on Meta Business apps:
 * - email (prohibited on Meta Business Login)
 * - pages_manage_engagement, pages_manage_metadata, pages_read_user_content, read_insights, instagram_manage_insights
 */
const VERIFIED_PUBLISHING_SCOPES = [
  'public_profile',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
];

const CORE_PAGE_SCOPES = [
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
  const requestedMode = req.nextUrl.searchParams.get('scope_mode');

  if (!appId) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard?tab=connections&error=${encodeURIComponent(
        'Please configure FACEBOOK_APP_ID in .env.local to enable Facebook Login.'
      )}`
    );
  }

  // Determine scopes: custom env override, or verified publishing scopes (default), or core fallback
  let selectedScopes: string[];
  if (process.env.FACEBOOK_SCOPES) {
    selectedScopes = process.env.FACEBOOK_SCOPES.split(',').map((s) => s.trim());
  } else if (requestedMode === 'core') {
    selectedScopes = CORE_PAGE_SCOPES;
  } else {
    selectedScopes = VERIFIED_PUBLISHING_SCOPES;
  }

  const scopes = selectedScopes.join(',');

  const stateObj = {
    workspaceId,
    scopeMode: requestedMode || 'full',
  };
  const state = encodeURIComponent(JSON.stringify(stateObj));

  const fbAuthUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${encodeURIComponent(
    appId
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(
    scopes
  )}&state=${state}&response_type=code`;

  return NextResponse.redirect(fbAuthUrl);
}
