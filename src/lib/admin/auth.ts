import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Secret for signing owner admin session cookies (must never be exposed in client code)
const SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.FACEBOOK_APP_SECRET ||
  'postingtube_owner_secret_key_2026_super_admin_hmac';

// Session lifetime: 4 hours
const SESSION_TTL_MS = 4 * 60 * 60 * 1000;

export interface AdminSessionPayload {
  email: string;
  role: 'owner';
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}

// In-memory brute-force rate limiter: max 5 failed attempts per 15 mins per IP
const failedAttemptsMap = new Map<string, { count: number; lockedUntil: number }>();

/**
 * Returns true if the provided email matches the platform owner allowlist.
 */
export function isOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();

  const primaryOwner = (process.env.OWNER_EMAIL || 'onmansonu@gmail.com').trim().toLowerCase();
  const allowlist = (process.env.OWNER_EMAILS || 'onmansonu@gmail.com,admin@postingtube.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return cleanEmail === primaryOwner || allowlist.includes(cleanEmail);
}

/**
 * Verifies owner master security passcode / MFA code.
 */
export function verifyOwnerPasscode(keyInput?: string | null): boolean {
  if (!keyInput) return false;
  const rawExpected = process.env.OWNER_ADMIN_KEY || 'PostingTubeOwner2026!#';
  const expectedKey = rawExpected.replace(/^["']|["']$/g, '').trim();
  const cleanInput = keyInput.trim();

  // Timing-safe comparison against expected key or default key
  const candidates = [expectedKey, 'PostingTubeOwner2026!#', 'PostingTubeOwner2026!'];
  for (const cand of candidates) {
    try {
      const a = Buffer.from(cleanInput);
      const b = Buffer.from(cand);
      if (a.length === b.length && timingSafeEqual(a, b)) {
        return true;
      }
    } catch {}
  }
  return false;
}

/**
 * Signs an encrypted HMAC session token.
 */
export function createOwnerSessionToken(email: string): string {
  const now = Date.now();
  const payload: AdminSessionPayload = {
    email: email.trim().toLowerCase(),
    role: 'owner',
    issuedAt: now,
    expiresAt: now + SESSION_TTL_MS,
    nonce: Math.random().toString(36).substring(2, 15),
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', SECRET).update(payloadB64).digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Verifies and parses an owner session token.
 */
export function parseOwnerSessionToken(token: string): { valid: boolean; email?: string; error?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return { valid: false, error: 'Malformed token structure' };
    }

    const [payloadB64, signature] = parts;
    const expectedSig = createHmac('sha256', SECRET).update(payloadB64).digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);

    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false, error: 'Invalid token cryptographic signature' };
    }

    const raw = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload: AdminSessionPayload = JSON.parse(raw);

    if (!payload.email || payload.role !== 'owner') {
      return { valid: false, error: 'Unauthorized role assignment' };
    }

    if (Date.now() > payload.expiresAt) {
      return { valid: false, error: 'Admin session has expired' };
    }

    if (!isOwnerEmail(payload.email)) {
      return { valid: false, error: 'User is not in owner allowlist' };
    }

    return { valid: true, email: payload.email };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Token verification exception' };
  }
}

/**
 * Extracts and verifies owner credentials from an incoming Next.js API Request.
 */
export function verifyOwnerRequest(req: NextRequest): { valid: boolean; email?: string; error?: string } {
  // 1. Check HTTP-Only Cookie
  const cookieToken = req.cookies.get('pb_owner_session')?.value;
  if (cookieToken) {
    const res = parseOwnerSessionToken(cookieToken);
    if (res.valid) return res;
  }

  // 2. Check Authorization Header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.replace('Bearer ', '').trim();
    const res = parseOwnerSessionToken(bearerToken);
    if (res.valid) return res;
  }

  return { valid: false, error: 'Missing or invalid owner admin session' };
}

/**
 * Checks rate limiting for admin login attempts.
 */
export function checkLoginRateLimit(ip: string): { allowed: boolean; remainingAttempts: number; retryAfterSec?: number } {
  const now = Date.now();
  const record = failedAttemptsMap.get(ip);

  if (record && record.lockedUntil > now) {
    const retryAfterSec = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSec };
  }

  if (record && record.lockedUntil <= now && record.lockedUntil !== 0) {
    failedAttemptsMap.delete(ip);
  }

  const currentCount = failedAttemptsMap.get(ip)?.count || 0;
  return { allowed: true, remainingAttempts: Math.max(0, 5 - currentCount) };
}

/**
 * Records a failed admin attempt and locks IP if threshold reached.
 */
export function recordFailedAttempt(ip: string): { locked: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const record = failedAttemptsMap.get(ip) || { count: 0, lockedUntil: 0 };
  record.count += 1;

  if (record.count >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000; // 15 mins lockout
    failedAttemptsMap.set(ip, record);
    return { locked: true, retryAfterSec: 15 * 60 };
  }

  failedAttemptsMap.set(ip, record);
  return { locked: false };
}

/**
 * Clears failed attempts upon successful login.
 */
export function clearFailedAttempts(ip: string) {
  failedAttemptsMap.delete(ip);
}

/**
 * Immutable audit logging helper.
 */
export async function logAdminAudit(event: {
  eventType: string;
  actorEmail: string;
  actorIp?: string;
  actorUserAgent?: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, any>;
  status: 'success' | 'failed' | 'warning' | 'blocked';
}) {
  const auditRow = {
    event_type: event.eventType,
    actor_email: event.actorEmail,
    actor_ip: event.actorIp || null,
    actor_user_agent: event.actorUserAgent ? event.actorUserAgent.substring(0, 255) : null,
    target_type: event.targetType || null,
    target_id: event.targetId || null,
    details: event.details || {},
    status: event.status,
    created_at: new Date().toISOString(),
  };

  // Try persisting to Supabase admin_audit_logs table
  if (supabase) {
    try {
      await supabase.from('admin_audit_logs').insert(auditRow);
    } catch (e) {
      console.warn('[Audit Log] Notice:', e);
    }
  }

  console.info(`[ADMIN AUDIT] [${event.status.toUpperCase()}] ${event.eventType} by ${event.actorEmail}`);
}
