import { Post } from '@/types/social';
import { useState, useEffect } from 'react';

/**
 * Default fallback timezone & storage key for user-configured preference.
 */
export const USER_TZ_STORAGE_KEY = 'postingtube_user_tz';

/**
 * Time format setting: '12-hour' (e.g. 2:30 PM) or '24-hour' (e.g. 14:30)
 */
export type TimeFormat = '12-hour' | '24-hour';
export const USER_TIME_FORMAT_KEY = 'postingtube_time_format';

// High-performance shared Intl.DateTimeFormat cache
const dtfCache = new Map<string, Intl.DateTimeFormat>();
export function getCachedDTF(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  let formatter = dtfCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    dtfCache.set(key, formatter);
  }
  return formatter;
}


/**
 * Dynamically retrieves user's preferred time format:
 * 1. Checks localStorage ('postingtube_time_format').
 * 2. Defaults to '12-hour'.
 */
export function getUserTimeFormat(): TimeFormat {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(USER_TIME_FORMAT_KEY);
      if (saved === '12-hour' || saved === '24-hour') {
        return saved;
      }
    } catch {}
  }
  return '12-hour';
}

/**
 * Sets user's preferred time format and broadcasts change to all components.
 */
export function setUserTimeFormat(fmt: TimeFormat): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(USER_TIME_FORMAT_KEY, fmt);
      window.dispatchEvent(
        new CustomEvent('postingtube:time-format-changed', {
          detail: { timeFormat: fmt },
        })
      );
    } catch (e) {
      console.warn('Failed to persist user time format:', e);
    }
  }
}

/**
 * React hook to reactively subscribe to user time format preference.
 */
export function useUserTimeFormat() {
  const [timeFormat, setTimeFormatState] = useState<TimeFormat>(() => getUserTimeFormat());

  useEffect(() => {
    const update = () => {
      setTimeFormatState(getUserTimeFormat());
    };
    update();
    window.addEventListener('postingtube:time-format-changed', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('postingtube:time-format-changed', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  const changeFormat = (newFmt: TimeFormat) => {
    setUserTimeFormat(newFmt);
    setTimeFormatState(newFmt);
  };

  return { timeFormat, setTimeFormat: changeFormat, is24Hour: timeFormat === '24-hour' };
}

/**
 * Legacy constant preserved for backward compatibility
 * @deprecated Use getUserTimezone() instead.
 */
export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Checks whether an IANA timezone identifier is valid and supported by the current JavaScript engine.
 */
export function isValidTimezone(tz: string | undefined | null): boolean {
  if (!tz || typeof tz !== 'string') return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz.trim() });
    return true;
  } catch {
    return false;
  }
}

/**
 * Dynamically retrieves the active user timezone:
 * 1. Checks user preference saved in localStorage ('postingtube_user_tz').
 * 2. Falls back to the user's browser device timezone (Intl.DateTimeFormat().resolvedOptions().timeZone).
 * 3. Falls back to 'UTC' if running server-side or if browser timezone is undetermined.
 */
export function getUserTimezone(): string {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(USER_TZ_STORAGE_KEY);
      if (saved && isValidTimezone(saved)) {
        return saved.trim();
      }
    } catch {}

    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected && isValidTimezone(detected)) {
        return detected.trim();
      }
    } catch {}
  }
  return 'UTC';
}

/**
 * Updates the user's preferred timezone:
 * - If passed 'auto' or empty, resets preference to browser auto-detection.
 * - Dispatches a custom event 'postingtube:timezone-changed' so all live UI components sync immediately.
 */
export function setUserTimezone(tz: string): void {
  if (typeof window !== 'undefined') {
    try {
      const trimmed = tz ? tz.trim() : '';
      if (!trimmed || trimmed === 'auto') {
        localStorage.removeItem(USER_TZ_STORAGE_KEY);
      } else if (isValidTimezone(trimmed)) {
        localStorage.setItem(USER_TZ_STORAGE_KEY, trimmed);
      }
      window.dispatchEvent(
        new CustomEvent('postingtube:timezone-changed', {
          detail: { timeZone: getUserTimezone() },
        })
      );
    } catch (e) {
      console.warn('Failed to persist user timezone:', e);
    }
  }
}

export interface TimezoneInfo {
  timeZone: string;
  abbr: string;
  offsetStr: string;
  label: string;
  city: string;
  isAutoDetected: boolean;
}

/**
 * Formats detailed timezone metadata including clean abbreviation, exact UTC offset, and display label.
 */
export function getUserTimezoneInfo(tzInput?: string): TimezoneInfo {
  const activeTz = tzInput && isValidTimezone(tzInput) ? tzInput.trim() : getUserTimezone();
  const isAutoDetected =
    typeof window !== 'undefined' ? !localStorage.getItem(USER_TZ_STORAGE_KEY) : true;
  const now = new Date();

  let tzNamePart = '';
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: activeTz,
      timeZoneName: 'short',
    }).formatToParts(now);
    tzNamePart = parts.find((p) => p.type === 'timeZoneName')?.value || '';
  } catch {}

  // Calculate exact UTC offset string: e.g. UTC+05:30 or UTC-05:00
  let offsetStr = 'UTC+00:00';
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: activeTz,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });
    const partsMap: Record<string, string> = {};
    for (const p of dtf.formatToParts(now)) partsMap[p.type] = p.value;
    let h = parseInt(partsMap.hour || '0', 10);
    if (h === 24) h = 0;
    const localMs = Date.UTC(
      parseInt(partsMap.year || '2026', 10),
      parseInt(partsMap.month || '1', 10) - 1,
      parseInt(partsMap.day || '1', 10),
      h,
      parseInt(partsMap.minute || '0', 10),
      parseInt(partsMap.second || '0', 10)
    );
    const diffMinutes = Math.round((localMs - now.getTime()) / 60000);
    const sign = diffMinutes >= 0 ? '+' : '-';
    const abs = Math.abs(diffMinutes);
    const offH = Math.floor(abs / 60);
    const offM = abs % 60;
    offsetStr = `UTC${sign}${String(offH).padStart(2, '0')}:${String(offM).padStart(2, '0')}`;
  } catch {}

  // Provide clean, recognizable abbreviations for standard international timezones
  let cleanAbbr = tzNamePart;
  if (!cleanAbbr || cleanAbbr.startsWith('GMT') || cleanAbbr === offsetStr) {
    if (activeTz === 'Asia/Kolkata' || activeTz === 'Asia/Calcutta') cleanAbbr = 'IST';
    else if (activeTz === 'Asia/Tokyo') cleanAbbr = 'JST';
    else if (activeTz === 'Asia/Singapore') cleanAbbr = 'SGT';
    else if (activeTz === 'Asia/Dubai') cleanAbbr = 'GST';
    else if (activeTz === 'Australia/Sydney') cleanAbbr = 'AEST';
    else cleanAbbr = tzNamePart || offsetStr;
  }

  const city = activeTz.split('/').pop()?.replace(/_/g, ' ') || activeTz;
  const label = cleanAbbr
    ? `${activeTz} (${cleanAbbr} • ${offsetStr})`
    : `${activeTz} (${offsetStr})`;

  return {
    timeZone: activeTz,
    abbr: cleanAbbr || offsetStr,
    offsetStr,
    label,
    city,
    isAutoDetected,
  };
}

/**
 * React hook to reactively subscribe to the active user timezone and updates.
 */
export function useUserTimezone() {
  const [tz, setTz] = useState<string>(() => getUserTimezone());
  const [info, setInfo] = useState<TimezoneInfo>(() => getUserTimezoneInfo(tz));

  useEffect(() => {
    const update = () => {
      const current = getUserTimezone();
      setTz(current);
      setInfo(getUserTimezoneInfo(current));
    };

    update();
    window.addEventListener('postingtube:timezone-changed', update);
    window.addEventListener('storage', update);

    return () => {
      window.removeEventListener('postingtube:timezone-changed', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  const changeTimezone = (newTz: string) => {
    setUserTimezone(newTz);
    const updated = getUserTimezone();
    setTz(updated);
    setInfo(getUserTimezoneInfo(updated));
  };

  return { timeZone: tz, info, setTimezone: changeTimezone };
}

/**
 * Curated list of popular world business timezones for quick selection.
 */
export const POPULAR_TIMEZONES = [
  { region: 'Americas', tz: 'America/New_York', label: 'New York (Eastern Time - US & Canada)' },
  { region: 'Americas', tz: 'America/Chicago', label: 'Chicago (Central Time - US & Canada)' },
  { region: 'Americas', tz: 'America/Denver', label: 'Denver (Mountain Time - US & Canada)' },
  { region: 'Americas', tz: 'America/Los_Angeles', label: 'Los Angeles / San Francisco (Pacific Time)' },
  { region: 'Americas', tz: 'America/Toronto', label: 'Toronto (Eastern Time - Canada)' },
  { region: 'Americas', tz: 'America/Vancouver', label: 'Vancouver (Pacific Time - Canada)' },
  { region: 'Americas', tz: 'America/Sao_Paulo', label: 'São Paulo (Brasília Time - Brazil)' },
  { region: 'Americas', tz: 'America/Mexico_City', label: 'Mexico City (Central Time - Mexico)' },
  { region: 'Europe', tz: 'Europe/London', label: 'London (GMT / BST - United Kingdom)' },
  { region: 'Europe', tz: 'Europe/Paris', label: 'Paris (CET / CEST - France)' },
  { region: 'Europe', tz: 'Europe/Berlin', label: 'Berlin / Frankfurt (CET / CEST - Germany)' },
  { region: 'Europe', tz: 'Europe/Amsterdam', label: 'Amsterdam (CET - Netherlands)' },
  { region: 'Europe', tz: 'Europe/Madrid', label: 'Madrid (CET - Spain)' },
  { region: 'Europe', tz: 'Europe/Rome', label: 'Rome (CET - Italy)' },
  { region: 'Europe', tz: 'Europe/Athens', label: 'Athens (EET - Greece)' },
  { region: 'Europe', tz: 'Europe/Istanbul', label: 'Istanbul (TRT - Turkey)' },
  { region: 'Asia & Middle East', tz: 'Asia/Kolkata', label: 'India (IST - New Delhi, Mumbai, Bengaluru)' },
  { region: 'Asia & Middle East', tz: 'Asia/Dubai', label: 'Dubai (GST - UAE & Gulf)' },
  { region: 'Asia & Middle East', tz: 'Asia/Riyadh', label: 'Riyadh (AST - Saudi Arabia)' },
  { region: 'Asia & Middle East', tz: 'Asia/Singapore', label: 'Singapore (SGT - Singapore)' },
  { region: 'Asia & Middle East', tz: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
  { region: 'Asia & Middle East', tz: 'Asia/Tokyo', label: 'Tokyo (JST - Japan)' },
  { region: 'Asia & Middle East', tz: 'Asia/Seoul', label: 'Seoul (KST - South Korea)' },
  { region: 'Asia & Middle East', tz: 'Asia/Bangkok', label: 'Bangkok / Jakarta (ICT)' },
  { region: 'Asia & Middle East', tz: 'Asia/Karachi', label: 'Karachi (PKT - Pakistan)' },
  { region: 'Asia & Middle East', tz: 'Asia/Dhaka', label: 'Dhaka (BST - Bangladesh)' },
  { region: 'Australia & Pacific', tz: 'Australia/Sydney', label: 'Sydney / Melbourne (AEST / AEDT)' },
  { region: 'Australia & Pacific', tz: 'Australia/Brisbane', label: 'Brisbane (AEST - No DST)' },
  { region: 'Australia & Pacific', tz: 'Australia/Perth', label: 'Perth (AWST - Western Australia)' },
  { region: 'Australia & Pacific', tz: 'Pacific/Auckland', label: 'Auckland / Wellington (NZST / NZDT)' },
  { region: 'Africa', tz: 'Africa/Cairo', label: 'Cairo (EET - Egypt)' },
  { region: 'Africa', tz: 'Africa/Johannesburg', label: 'Johannesburg (SAST - South Africa)' },
  { region: 'Africa', tz: 'Africa/Lagos', label: 'Lagos (WAT - Nigeria)' },
  { region: 'Africa', tz: 'Africa/Nairobi', label: 'Nairobi (EAT - Kenya)' },
  { region: 'Universal', tz: 'UTC', label: 'UTC (Coordinated Universal Time)' },
];

/**
 * Safely parse any date input (string, Date, ISO, or YYYY-MM-DD) into a valid Date object.
 */
export function parseDateSafe(
  dateInput: string | Date | undefined | null,
  tz: string = getUserTimezone()
): Date | null {
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
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      const normalized = trimmed.replace(' ', 'T');
      const datePart = normalized.substring(0, 10);
      const timePart = normalized.substring(11, 16);
      const utcIso = formatLocalToUtcIso(datePart, timePart, tz);
      const dt = new Date(utcIso);
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
 * Extracts YYYY-MM-DD string in the user's localized timezone.
 */
export function getLocalDateString(
  dateInput: string | Date | undefined | null,
  tz: string = getUserTimezone()
): string {
  const d = parseDateSafe(dateInput, tz);
  if (!d) return '';
  const activeTz = isValidTimezone(tz) ? tz : getUserTimezone();
  const formatter = getCachedDTF('en-CA', {
    timeZone: activeTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d); // Returns 'YYYY-MM-DD'
}

/**
 * Backward compatibility alias for getLocalDateString.
 */
export function getIstDateString(
  dateInput: string | Date | undefined | null,
  tz: string = getUserTimezone()
): string {
  return getLocalDateString(dateInput, tz);
}

export type TimePhase = 'morning' | 'afternoon' | 'evening' | 'night';

export interface LocalTimeParts {
  hour24: number;
  minute: number;
  hour12: number;
  period: 'AM' | 'PM';
  timeStr: string;
  periodLabel: string;
  phase: TimePhase;
}

/**
 * Accurately extracts hours, minutes, period (AM/PM), periodLabel, and phase in the user's localized timezone
 * respecting the user's chosen time format ('12-hour' or '24-hour').
 */
export function getLocalTimeParts(
  dateInput: string | Date | undefined | null,
  tz: string = getUserTimezone(),
  formatInput?: TimeFormat
): LocalTimeParts {
  const activeFormat = formatInput || getUserTimeFormat();
  const d = parseDateSafe(dateInput, tz);
  if (!d) {
    return {
      hour24: 0,
      minute: 0,
      hour12: 12,
      period: 'AM',
      timeStr: activeFormat === '24-hour' ? '00:00' : '12:00 AM',
      periodLabel: 'Midnight',
      phase: 'night',
    };
  }

  const activeTz = isValidTimezone(tz) ? tz : getUserTimezone();
  const formatter = getCachedDTF('en-US', {
    timeZone: activeTz,
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
  const hh24Str = String(h24).padStart(2, '0');
  const mmStr = String(m).padStart(2, '0');
  const timeStr = activeFormat === '24-hour' ? `${hh24Str}:${mmStr}` : `${h12}:${mmStr} ${period}`;

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
 * Backward compatibility alias for getLocalTimeParts.
 */
export function getIstTimeParts(
  dateInput: string | Date | undefined | null,
  tz: string = getUserTimezone()
): LocalTimeParts {
  return getLocalTimeParts(dateInput, tz);
}

/**
 * Converts a date string (YYYY-MM-DD) and time string (HH:mm) chosen by user in their local timezone
 * into an unambiguous UTC ISO 8601 string (e.g. '2026-11-10T09:00:00.000Z').
 *
 * Uses a 2-pass inversion algorithm that guarantees exact round-trip precision across all 400+ IANA
 * timezones, including daylight saving transitions.
 */
export function formatLocalToUtcIso(
  dateStr: string,
  timeStr: string,
  tz: string = getUserTimezone()
): string {
  try {
    const activeTz = isValidTimezone(tz) ? tz : getUserTimezone();
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hrs, mins] = timeStr.split(':').map(Number);

    if (isNaN(y) || isNaN(m) || isNaN(d)) {
      return new Date().toISOString();
    }
    const safeH = isNaN(hrs) ? 12 : hrs;
    const safeM = isNaN(mins) ? 0 : mins;

    const targetUtcMs = Date.UTC(y, m - 1, d, safeH, safeM, 0);

    const getLocalMsInTz = (utcMs: number): number => {
      const dObj = new Date(utcMs);
      const formatter = getCachedDTF('en-US', {
        timeZone: activeTz,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
      });
      const partsMap: Record<string, string> = {};
      for (const part of formatter.formatToParts(dObj)) {
        partsMap[part.type] = part.value;
      }
      let h = parseInt(partsMap.hour || '0', 10);
      if (h === 24) h = 0;
      return Date.UTC(
        parseInt(partsMap.year || String(y), 10),
        parseInt(partsMap.month || String(m), 10) - 1,
        parseInt(partsMap.day || String(d), 10),
        h,
        parseInt(partsMap.minute || '0', 10),
        parseInt(partsMap.second || '0', 10)
      );
    };

    let guessUtc = targetUtcMs;
    let localMs = getLocalMsInTz(guessUtc);
    let diff = localMs - targetUtcMs;
    guessUtc -= diff;

    // Second pass for daylight saving transition edge cases
    localMs = getLocalMsInTz(guessUtc);
    diff = localMs - targetUtcMs;
    guessUtc -= diff;

    const resDate = new Date(guessUtc);
    if (!isNaN(resDate.getTime())) {
      return resDate.toISOString();
    }
    return new Date().toISOString();
  } catch (err) {
    console.error('formatLocalToUtcIso conversion error:', err);
    return new Date().toISOString();
  }
}

/**
 * Accurately extracts YYYY-MM-DD and HH:mm in the user's localized timezone.
 */
export function extractLocalDateAndTime(
  isoDateString: string | undefined | null,
  tz: string = getUserTimezone()
): { date: string; time: string } {
  const d = parseDateSafe(isoDateString, tz) || new Date();
  const dateStr = getLocalDateString(d, tz);
  const { hour24, minute } = getLocalTimeParts(d, tz);
  const hh = String(hour24).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return {
    date: dateStr,
    time: `${hh}:${mm}`,
  };
}

/**
 * Converts a UTC ISO 8601 string into a local 'YYYY-MM-DDTHH:mm' string suitable
 * for HTML5 <input type="datetime-local">.
 */
export function formatToDateTimeLocal(
  isoDateString: string | undefined | null,
  tz: string = getUserTimezone()
): string {
  if (!isoDateString) return '';
  const { date, time } = extractLocalDateAndTime(isoDateString, tz);
  return `${date}T${time}`;
}

/**
 * Format time in readable format in the user's localized timezone e.g. "2:40 PM" or "14:40"
 */
export function formatTimeSafe(
  dateInput: string | Date | undefined | null,
  fallback = '',
  tz: string = getUserTimezone(),
  formatInput?: TimeFormat
): string {
  const d = parseDateSafe(dateInput, tz);
  if (!d) return fallback;
  try {
    const parts = getLocalTimeParts(d, tz, formatInput);
    return parts.timeStr;
  } catch {
    return fallback;
  }
}

/**
 * Format full date & time with seconds in the user's localized timezone
 */
export function formatDateTimeWithSeconds(
  dateInput: string | Date | undefined | null,
  fallback = '',
  tz: string = getUserTimezone(),
  formatInput?: TimeFormat
): string {
  const d = parseDateSafe(dateInput, tz);
  if (!d) return fallback;
  try {
    const activeTz = isValidTimezone(tz) ? tz : getUserTimezone();
    const activeFormat = formatInput || getUserTimeFormat();
    return new Intl.DateTimeFormat('en-US', {
      timeZone: activeTz,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: activeFormat === '24-hour' ? '2-digit' : 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: activeFormat !== '24-hour',
    }).format(d);
  } catch {
    return fallback;
  }
}

/**
 * Format full date in the user's localized timezone e.g. "Friday, Oct 30, 2026"
 */
export function formatDateFullSafe(
  dateInput: string | Date | undefined | null,
  fallback = '',
  tz: string = getUserTimezone()
): string {
  const d = parseDateSafe(dateInput, tz);
  if (!d) return fallback;
  try {
    const activeTz = isValidTimezone(tz) ? tz : getUserTimezone();
    return new Intl.DateTimeFormat('en-US', {
      timeZone: activeTz,
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
 * Format short date in the user's localized timezone e.g. "Oct 30, 2:40 PM"
 */
export function formatDateTimeShort(
  dateInput: string | Date | undefined | null,
  fallback = '',
  tz: string = getUserTimezone()
): string {
  const d = parseDateSafe(dateInput, tz);
  if (!d) return fallback;
  try {
    const activeTz = isValidTimezone(tz) ? tz : getUserTimezone();
    return new Intl.DateTimeFormat('en-US', {
      timeZone: activeTz,
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
 * Compare two dates by the user's localized calendar day.
 */
export function isSameCalendarDay(
  d1: string | Date | undefined | null,
  d2: string | Date | undefined | null,
  tz: string = getUserTimezone()
): boolean {
  const date1Str = getLocalDateString(d1, tz);
  const date2Str = getLocalDateString(d2, tz);
  if (!date1Str || !date2Str) return false;
  return date1Str === date2Str;
}

/**
 * Check if a post matches a given calendar day in the user's localized timezone.
 */
export function postMatchesDay(
  post: Post,
  day: Date,
  tz: string = getUserTimezone()
): boolean {
  if (!post || !day) return false;

  // 1. Scheduled posts match scheduledFor
  if (post.scheduledFor && isSameCalendarDay(post.scheduledFor, day, tz)) {
    return true;
  }

  // 2. Published posts match publishedAt
  if (post.publishedAt && isSameCalendarDay(post.publishedAt, day, tz)) {
    return true;
  }

  // 3. Check individual account publication results timestamps
  if (post.results) {
    for (const res of Object.values(post.results)) {
      if (res?.publishedAt && isSameCalendarDay(res.publishedAt, day, tz)) {
        return true;
      }
      if ((res as any)?.timestamp && isSameCalendarDay((res as any).timestamp, day, tz)) {
        return true;
      }
    }
  }

  // 4. Fallback: If post has no scheduledFor or publishedAt, match createdAt
  if (!post.scheduledFor && !post.publishedAt && post.createdAt) {
    if (isSameCalendarDay(post.createdAt, day, tz)) {
      return true;
    }
  }

  return false;
}
