import { Post } from '@/types/social';

export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Safely parse any date input (string, Date, ISO, or YYYY-MM-DD) into a valid Date object.
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

    // If string has date + time without timezone (e.g. "2026-10-30T14:40" or "2026-10-30 14:40:00")
    // Treat as IST (+05:30) explicitly
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      const normalized = trimmed.replace(' ', 'T');
      const withTz = normalized.length === 16 ? `${normalized}:00+05:30` : `${normalized}+05:30`;
      const dt = new Date(withTz);
      if (!isNaN(dt.getTime())) return dt;
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
 * Extracts YYYY-MM-DD string in India Standard Time (IST)
 */
export function getIstDateString(dateInput: string | Date | undefined | null): string {
  const d = parseDateSafe(dateInput);
  if (!d) return '';
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d); // e.g. '2026-10-30'
}

export type TimePhase = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * Accurately extracts hours, minutes, period (AM/PM), periodLabel, and phase in India Standard Time (IST)
 */
export function getIstTimeParts(dateInput: string | Date | undefined | null): {
  hour24: number;
  minute: number;
  hour12: number;
  period: 'AM' | 'PM';
  timeStr: string;
  periodLabel: string;
  phase: TimePhase;
} {
  const d = parseDateSafe(dateInput);
  if (!d) {
    return {
      hour24: 0,
      minute: 0,
      hour12: 12,
      period: 'AM',
      timeStr: '12:00 AM',
      periodLabel: 'Midnight',
      phase: 'night',
    };
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: IST_TIMEZONE,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  let h24 = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  if (h24 === 24) h24 = 0;
  const m = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);

  const isPm = h24 >= 12;
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  const period: 'AM' | 'PM' = isPm ? 'PM' : 'AM';
  const timeStr = `${h12}:${String(m).padStart(2, '0')} ${period}`;

  let periodLabel = 'Night';
  let phase: TimePhase = 'night';

  if (h24 === 0 && m === 0) {
    periodLabel = 'Midnight';
    phase = 'night';
  } else if (h24 >= 0 && h24 < 4) {
    periodLabel = 'Late Night';
    phase = 'night';
  } else if (h24 >= 4 && h24 < 6) {
    periodLabel = 'Early Morning';
    phase = 'morning';
  } else if (h24 >= 6 && h24 < 12) {
    periodLabel = 'Morning';
    phase = 'morning';
  } else if (h24 === 12 && m === 0) {
    periodLabel = 'Noon';
    phase = 'afternoon';
  } else if (h24 >= 12 && h24 < 17) {
    periodLabel = 'Afternoon';
    phase = 'afternoon';
  } else if (h24 >= 17 && h24 < 21) {
    periodLabel = 'Evening';
    phase = 'evening';
  } else {
    periodLabel = 'Night';
    phase = 'night';
  }

  return { hour24: h24, minute: m, hour12: h12, period, timeStr, periodLabel, phase };
}

/**
 * Converts a date string (YYYY-MM-DD) and time string (HH:mm) chosen by user in IST
 * into an unambiguous UTC ISO 8601 string (e.g. 2026-10-30T09:10:00.000Z for 2:40 PM IST).
 */
export function formatLocalToUtcIso(dateStr: string, timeStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hrs, mins] = timeStr.split(':').map(Number);
    const pad = (n: number) => String(n).padStart(2, '0');
    // India Standard Time is strictly UTC+05:30 with zero daylight savings
    const istIso = `${y}-${pad(m || 1)}-${pad(d || 1)}T${pad(hrs || 0)}:${pad(mins || 0)}:00+05:30`;
    const dt = new Date(istIso);
    if (!isNaN(dt.getTime())) {
      return dt.toISOString();
    }
    return new Date().toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Accurately extracts YYYY-MM-DD and HH:mm in India Standard Time (IST).
 */
export function extractLocalDateAndTime(isoDateString: string | undefined | null): { date: string; time: string } {
  const d = parseDateSafe(isoDateString) || new Date();
  const dateStr = getIstDateString(d);
  const { hour24, minute } = getIstTimeParts(d);
  const hh = String(hour24).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return {
    date: dateStr,
    time: `${hh}:${mm}`,
  };
}

/**
 * Converts a UTC ISO 8601 string into an IST 'YYYY-MM-DDTHH:mm' string suitable
 * for HTML5 <input type="datetime-local">.
 */
export function formatToDateTimeLocal(isoDateString: string | undefined | null): string {
  if (!isoDateString) return '';
  const { date, time } = extractLocalDateAndTime(isoDateString);
  return `${date}T${time}`;
}

/**
 * Format time in readable 12-hour format in India Standard Time e.g. "2:40 PM"
 */
export function formatTimeSafe(dateInput: string | Date | undefined | null, fallback = ''): string {
  const d = parseDateSafe(dateInput);
  if (!d) return fallback;
  try {
    const parts = getIstTimeParts(d);
    return parts.timeStr;
  } catch {
    return fallback;
  }
}

/**
 * Format full date & time with seconds in India Standard Time
 */
export function formatDateTimeWithSeconds(dateInput: string | Date | undefined | null, fallback = ''): string {
  const d = parseDateSafe(dateInput);
  if (!d) return fallback;
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: IST_TIMEZONE,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return fallback;
  }
}

/**
 * Format full date in India Standard Time e.g. "Friday, Oct 30, 2026"
 */
export function formatDateFullSafe(dateInput: string | Date | undefined | null, fallback = ''): string {
  const d = parseDateSafe(dateInput);
  if (!d) return fallback;
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: IST_TIMEZONE,
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  } catch {
    return fallback;
  }
}

/**
 * Format short date in India Standard Time e.g. "Oct 30, 2:40 PM"
 */
export function formatDateTimeShort(dateInput: string | Date | undefined | null, fallback = ''): string {
  const d = parseDateSafe(dateInput);
  if (!d) return fallback;
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: IST_TIMEZONE,
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return fallback;
  }
}

/**
 * Compare two dates by India Standard Time (IST) calendar day.
 */
export function isSameCalendarDay(
  d1: string | Date | undefined | null,
  d2: string | Date | undefined | null
): boolean {
  const date1Str = getIstDateString(d1);
  const date2Str = getIstDateString(d2);
  if (!date1Str || !date2Str) return false;
  return date1Str === date2Str;
}

/**
 * Check if a post matches a given calendar day in India Standard Time.
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
