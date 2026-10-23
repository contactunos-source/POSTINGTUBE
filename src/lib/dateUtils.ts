import { Post } from '@/types/social';
import { format, isSameDay } from 'date-fns';

/**
 * Safely parse any date input (string, Date, ISO, or YYYY-MM-DD) into a valid Date object.
 * Avoids UTC-midnight timezone shifts for date-only strings by parsing local year, month, day.
 */
export function parseDateSafe(dateInput: string | Date | undefined | null): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return null;

    // Check for YYYY-MM-DD format (date-only)
    const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      return new Date(year, month, day, 12, 0, 0); // midday avoids boundary issues
    }

    // Standard ISO 8601 or Date string
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

/**
 * Converts a local date string (YYYY-MM-DD) and time string (HH:mm) in user's browser
 * into an unambiguous UTC ISO 8601 string (e.g. 2026-10-24T09:00:00.000Z).
 */
export function formatLocalToUtcIso(dateStr: string, timeStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hrs, mins] = timeStr.split(':').map(Number);
    const localDate = new Date(y, (m || 1) - 1, d || 1, hrs || 0, mins || 0, 0);
    return localDate.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Accurately extracts local YYYY-MM-DD and HH:mm from an ISO UTC string.
 */
export function extractLocalDateAndTime(isoDateString: string | undefined | null): { date: string; time: string } {
  const d = parseDateSafe(isoDateString) || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
}

/**
 * Compare two dates by local calendar day (year, month, day) ignoring time and timezone shifts.
 */
export function isSameCalendarDay(
  d1: string | Date | undefined | null,
  d2: string | Date | undefined | null
): boolean {
  const date1 = parseDateSafe(d1);
  const date2 = parseDateSafe(d2);
  if (!date1 || !date2) return false;

  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if a post matches a given calendar day.
 * Checks scheduledFor, publishedAt, results timestamps, and createdAt.
 */
export function postMatchesDay(post: Post, day: Date): boolean {
  if (!post || !day) return false;

  // 1. Scheduled posts match scheduledFor
  if (post.scheduledFor && isSameCalendarDay(post.scheduledFor, day)) {
    return true;
  }

  // 2. Published posts match publishedAt
  if (post.publishedAt && isSameCalendarDay(post.publishedAt, day)) {
    return true;
  }

  // 3. Check individual account publication results timestamps
  if (post.results) {
    for (const res of Object.values(post.results)) {
      if (res?.publishedAt && isSameCalendarDay(res.publishedAt, day)) {
        return true;
      }
      if ((res as any)?.timestamp && isSameCalendarDay((res as any).timestamp, day)) {
        return true;
      }
    }
  }

  // 4. Fallback: If post has no scheduledFor or publishedAt, match createdAt
  if (!post.scheduledFor && !post.publishedAt && post.createdAt) {
    if (isSameCalendarDay(post.createdAt, day)) {
      return true;
    }
  }

  return false;
}

/**
 * Format time in readable 12-hour format e.g. "2:30 PM"
 */
export function formatTimeSafe(dateInput: string | Date | undefined | null, fallback = ''): string {
  const d = parseDateSafe(dateInput);
  if (!d) return fallback;
  try {
    return format(d, 'h:mm a');
  } catch {
    return fallback;
  }
}

/**
 * Format full date in readable format e.g. "Wednesday, Oct 22, 2026"
 */
export function formatDateFullSafe(dateInput: string | Date | undefined | null, fallback = ''): string {
  const d = parseDateSafe(dateInput);
  if (!d) return fallback;
  try {
    return format(d, 'EEEE, MMM d, yyyy');
  } catch {
    return fallback;
  }
}

/**
 * Format short date e.g. "Oct 24, 2:00 PM"
 */
export function formatDateTimeShort(dateInput: string | Date | undefined | null, fallback = ''): string {
  const d = parseDateSafe(dateInput);
  if (!d) return fallback;
  try {
    return format(d, 'MMM d, h:mm a');
  } catch {
    return fallback;
  }
}
