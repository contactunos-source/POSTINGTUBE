import { NextRequest, NextResponse } from 'next/server';
import { verifyOwnerRequest, logAdminAudit } from '@/lib/admin/auth';

export async function POST(req: NextRequest) {
  const auth = verifyOwnerRequest(req);
  if (auth.valid && auth.email) {
    await logAdminAudit({
      eventType: 'OWNER_LOGOUT',
      actorEmail: auth.email,
      actorIp: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1',
      status: 'success',
    });
  }

  const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
  response.cookies.set('pb_owner_session', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });

  return response;
}
