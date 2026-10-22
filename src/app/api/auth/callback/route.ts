import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const origin = requestUrl.origin;
  const redirectTo = requestUrl.searchParams.get('redirectTo') || '/dashboard';

  // Redirect user to destination where Supabase client recovers session
  const target = new URL(redirectTo, origin);
  return NextResponse.redirect(target.toString());
}
