import { NextRequest, NextResponse } from 'next/server';

/**
 * Dedicated Threads OAuth 2.0 Route.
 * Initiates direct OAuth dialog with threads.net for user authorization.
 * Requests 'threads_basic' and 'threads_content_publish'.
 */
const THREADS_SCOPES = [
  'threads_basic',
  'threads_content_publish',
  'threads_manage_insights',
];

export async function GET(req: NextRequest) {
  const threadsAppId =
    process.env.THREADS_APP_ID ||
    process.env.NEXT_PUBLIC_THREADS_APP_ID ||
    '';

  const workspaceId = req.nextUrl.searchParams.get('workspace_id') || '';
  const userId = req.nextUrl.searchParams.get('user_id') || '';

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || (host && !host.includes('localhost') ? 'https' : 'http');
  const requestOrigin = host ? `${proto}://${host}` : req.nextUrl.origin;

  let redirectUri = process.env.THREADS_REDIRECT_URI;
  if (!redirectUri) {
    if (requestOrigin.includes('planposter.com') || requestOrigin.includes('vercel.app')) {
      redirectUri = 'https://planposter.com/api/auth/threads/callback';
    } else if (requestOrigin.startsWith('https://')) {
      redirectUri = `${requestOrigin}/api/auth/threads/callback`;
    } else {
      const httpsBase =
        (process.env.APP_URL?.startsWith('https') && process.env.APP_URL) ||
        (process.env.NEXT_PUBLIC_APP_URL?.startsWith('https') && process.env.NEXT_PUBLIC_APP_URL) ||
        'https://planposter.com';
      redirectUri = `${httpsBase}/api/auth/threads/callback`;
    }
  }

  const baseUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : requestOrigin);

  if (!threadsAppId) {
    const errorMsg =
      'Threads App ID is not configured in Vercel environment variables. Please add THREADS_APP_ID to your Vercel Project Settings.';
    return NextResponse.redirect(
      `${baseUrl}/dashboard?tab=connections&platform=threads&error=${encodeURIComponent(errorMsg)}`
    );
  }

  const stateObj = {
    workspaceId,
    userId,
    platform: 'threads',
    returnUrl: requestOrigin,
    usedRedirectUri: redirectUri,
  };
  const state = encodeURIComponent(JSON.stringify(stateObj));
  const scopes = THREADS_SCOPES.join(',');

  const authUrl = `https://threads.net/oauth/authorize?client_id=${encodeURIComponent(
    threadsAppId
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${encodeURIComponent(scopes)}&response_type=code&state=${state}`;

  return NextResponse.redirect(authUrl);
}
