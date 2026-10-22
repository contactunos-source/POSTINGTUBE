import { NextResponse } from 'next/server';

export async function GET() {
  const envToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '';
  const envPageId = process.env.FACEBOOK_PAGE_ID || '';
  const envAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '';

  return NextResponse.json({
    hasEnvToken: Boolean(envToken),
    envPageId: envPageId || null,
    envAppId: envAppId || null,
  });
}
