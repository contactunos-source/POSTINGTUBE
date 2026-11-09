import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const origin = requestUrl.origin;
  const redirectTo =
    requestUrl.searchParams.get('redirectTo') ||
    requestUrl.searchParams.get('next') ||
    '/dashboard';
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  if (error) {
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('error', error);
    if (errorDescription) {
      loginUrl.searchParams.set('error_description', errorDescription);
    }
    return NextResponse.redirect(loginUrl.toString());
  }

  // Redirect user to destination where Supabase client recovers session
  const target = new URL(redirectTo, origin);
  return NextResponse.redirect(target.toString());
}
