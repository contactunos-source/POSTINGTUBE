import { NextRequest, NextResponse } from 'next/server';
import {
  isOwnerEmail,
  verifyOwnerPasscode,
  createOwnerSessionToken,
  checkLoginRateLimit,
  recordFailedAttempt,
  clearFailedAttempts,
  logAdminAudit,
} from '@/lib/admin/auth';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
  const userAgent = req.headers.get('user-agent') || 'Unknown';

  // 1. Check rate limits
  const rateLimit = checkLoginRateLimit(ip);
  if (!rateLimit.allowed) {
    await logAdminAudit({
      eventType: 'OWNER_LOGIN_BLOCKED_RATE_LIMIT',
      actorEmail: 'unknown',
      actorIp: ip,
      actorUserAgent: userAgent,
      status: 'blocked',
      details: { retryAfterSec: rateLimit.retryAfterSec },
    });

    return NextResponse.json(
      {
        success: false,
        error: `Too many failed access attempts. Access locked for ${rateLimit.retryAfterSec} seconds.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { email, passcode } = body;

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPasscode = (passcode || '').trim();

    // 2. Validate email is in owner allowlist
    const isValidEmail = isOwnerEmail(cleanEmail);
    // 3. Validate master security passcode
    const isValidPasscode = verifyOwnerPasscode(cleanPasscode);

    if (!isValidEmail || !isValidPasscode) {
      const lockResult = recordFailedAttempt(ip);

      await logAdminAudit({
        eventType: 'OWNER_LOGIN_ATTEMPT_FAILED',
        actorEmail: cleanEmail || 'unspecified',
        actorIp: ip,
        actorUserAgent: userAgent,
        status: 'failed',
        details: {
          emailMatches: isValidEmail,
          locked: lockResult.locked,
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Access Denied: Invalid owner credentials.',
          remainingAttempts: Math.max(0, rateLimit.remainingAttempts - 1),
        },
        { status: 401 }
      );
    }

    // 4. Successful Owner Authentication
    clearFailedAttempts(ip);
    const token = createOwnerSessionToken(cleanEmail);

    await logAdminAudit({
      eventType: 'OWNER_LOGIN_SUCCESS',
      actorEmail: cleanEmail,
      actorIp: ip,
      actorUserAgent: userAgent,
      status: 'success',
      details: { role: 'owner', sessionDurationHours: 4 },
    });

    const response = NextResponse.json({
      success: true,
      email: cleanEmail,
      role: 'owner',
      message: 'Owner authorization granted.',
    });

    // Set secure HTTP-Only session cookie
    response.cookies.set('pb_owner_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 4 * 60 * 60, // 4 hours
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Authentication processing error' },
      { status: 500 }
    );
  }
}
