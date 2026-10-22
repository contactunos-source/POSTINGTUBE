import { NextRequest, NextResponse } from 'next/server';

/**
 * Full Buffer-grade Meta Scopes list matching Buffer's official Meta Login consent screen:
 * - Profile & Identity: public_profile, email
 * - Facebook Pages: pages_show_list, pages_read_engagement, pages_manage_posts, pages_manage_engagement, pages_manage_metadata, pages_read_user_content, read_insights
 * - Instagram: instagram_basic, instagram_content_publish, instagram_manage_comments, instagram_manage_insights
 * - Business: business_management
 */
const BUFFER_FULL_SCOPES = [
  'public_profile',
  'email',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'pages_manage_engagement',
  'pages_manage_metadata',
  'pages_read_user_content',
  'read_insights',
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_comments',
  'instagram_manage_insights',
  'business_management',
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

  // Determine scopes: custom env override, or buffer-full (default), or core fallback
  let selectedScopes: string[];
  if (process.env.FACEBOOK_SCOPES) {
    selectedScopes = process.env.FACEBOOK_SCOPES.split(',').map((s) => s.trim());
  } else if (requestedMode === 'core') {
    selectedScopes = CORE_PAGE_SCOPES;
  } else {
    selectedScopes = BUFFER_FULL_SCOPES;
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
