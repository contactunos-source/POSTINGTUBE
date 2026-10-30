import { NextRequest, NextResponse } from 'next/server';
import { verifyOwnerRequest } from '@/lib/admin/auth';

export async function GET(req: NextRequest) {
  const auth = verifyOwnerRequest(req);
  if (!auth.valid || !auth.email) {
    return NextResponse.json(
      { authenticated: false, error: auth.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    authenticated: true,
    email: auth.email,
    role: 'owner',
    verifiedAt: new Date().toISOString(),
  });
}
