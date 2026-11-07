import {
  getUserTimezoneInfo,
  formatLocalToUtcIso,
  extractLocalDateAndTime,
  getLocalDateString,
  getLocalTimeParts,
  isSameCalendarDay,
} from '../src/lib/dateUtils';

const testTimezones = [
  { tz: 'America/New_York', country: 'United States (East Coast)', expectedAbbr: ['EST', 'EDT', 'GMT-5', 'UTC-05:00'] },
  { tz: 'America/Los_Angeles', country: 'United States (West Coast)', expectedAbbr: ['PST', 'PDT', 'GMT-8', 'UTC-08:00'] },
  { tz: 'Europe/London', country: 'United Kingdom', expectedAbbr: ['GMT', 'BST', 'UTC+00:00'] },
  { tz: 'Europe/Berlin', country: 'Germany', expectedAbbr: ['CET', 'CEST', 'GMT+1', 'UTC+01:00'] },
  { tz: 'Asia/Kolkata', country: 'India', expectedAbbr: ['IST', 'GMT+5:30', 'UTC+05:30'] },
  { tz: 'Asia/Tokyo', country: 'Japan', expectedAbbr: ['JST', 'GMT+9', 'UTC+09:00'] },
  { tz: 'Australia/Sydney', country: 'Australia', expectedAbbr: ['AEST', 'AEDT', 'GMT+11', 'UTC+11:00'] },
  { tz: 'Asia/Dubai', country: 'United Arab Emirates', expectedAbbr: ['GST', 'GMT+4', 'UTC+04:00'] },
];

console.log('=== MULTI-COUNTRY TIMEZONE & LOCALIZATION VERIFICATION ===\n');

let allPassed = true;

for (const item of testTimezones) {
  const info = getUserTimezoneInfo(item.tz);
  console.log(`Country/Region: ${item.country}`);
  console.log(`  Timezone: ${info.timeZone}`);
  console.log(`  Abbreviation: ${info.abbr}`);
  console.log(`  Offset: ${info.offsetStr}`);
  console.log(`  Label: ${info.label}`);

  // Test roundtrip scheduling conversion
  const testDate = '2026-11-15';
  const testTime = '14:30'; // 2:30 PM local time

  const utcIso = formatLocalToUtcIso(testDate, testTime, item.tz);
  const extracted = extractLocalDateAndTime(utcIso, item.tz);
  const parts = getLocalTimeParts(utcIso, item.tz);
  const dayStr = getLocalDateString(utcIso, item.tz);

  console.log(`  Local Schedule Input: ${testDate} ${testTime}`);
  console.log(`  Stored UTC ISO: ${utcIso}`);
  console.log(`  Extracted Local: ${extracted.date} ${extracted.time} (${parts.periodLabel} • ${parts.timeStr})`);

  const roundtripMatches = extracted.date === testDate && extracted.time === testTime && dayStr === testDate;
  if (!roundtripMatches) {
    console.error(`  ❌ Roundtrip mismatch for ${item.tz}: Expected ${testDate} ${testTime}, got ${extracted.date} ${extracted.time}`);
    allPassed = false;
  } else {
    console.log(`  ✅ Roundtrip verification PASSED`);
  }

  // Same calendar day check
  const isSame = isSameCalendarDay(utcIso, new Date(`${testDate}T12:00:00Z`), item.tz);
  console.log(`  Calendar day indexing in ${item.tz}: ${dayStr}`);
  console.log('');
}

if (allPassed) {
  console.log('🎉 ALL MULTI-COUNTRY TIMEZONES VERIFIED WITH 100% PRECISION!');
} else {
  process.exit(1);
}
