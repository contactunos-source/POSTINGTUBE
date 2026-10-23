'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useClickOutside } from '@/hooks/useClickOutside';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Globe,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface ScheduleDatePickerProps {
  scheduledDate: string; // 'YYYY-MM-DD'
  scheduledTime: string; // 'HH:mm' (24-hour)
  onDateChange: (dateStr: string) => void;
  onTimeChange: (timeStr: string) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export const ScheduleDatePicker: React.FC<ScheduleDatePickerProps> = ({
  scheduledDate,
  scheduledTime,
  onDateChange,
  onTimeChange,
  onValidationChange,
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Parse current selected date or fallback to tomorrow
  const selectedDateObj = useMemo(() => {
    try {
      const [y, m, d] = scheduledDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    } catch {
      return new Date();
    }
  }, [scheduledDate]);

  // Calendar browsing month and year (independent of selected date until chosen)
  const [viewYear, setViewYear] = useState(() => selectedDateObj.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => selectedDateObj.getMonth()); // 0-11

  // Keep view aligned when selectedDate changes externally
  useEffect(() => {
    setViewYear(selectedDateObj.getFullYear());
    setViewMonth(selectedDateObj.getMonth());
  }, [scheduledDate]);

  // Close calendar popover on outside click or Escape key
  useClickOutside(calendarRef, () => setIsCalendarOpen(false), {
    enabled: isCalendarOpen,
  });

  // Today reference at midnight
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  // Timezone detection
  const detectedTimezone = useMemo(() => {
    try {
      const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(new Date());
      const abbr = parts.find((p) => p.type === 'timeZoneName')?.value || '';
      return { tzName, abbr: abbr ? `${abbr}` : tzName };
    } catch {
      return { tzName: 'UTC', abbr: 'UTC' };
    }
  }, []);

  // Parse 24-hr scheduledTime into 12-hr format
  const { hour12, minute, period } = useMemo(() => {
    try {
      const [h24Str, mStr] = scheduledTime.split(':');
      const h24 = parseInt(h24Str, 10);
      const m = parseInt(mStr, 10);
      const isPm = h24 >= 12;
      let h12 = h24 % 12;
      if (h12 === 0) h12 = 12;
      return {
        hour12: h12,
        minute: isNaN(m) ? 0 : m,
        period: isPm ? 'PM' : 'AM',
      };
    } catch {
      return { hour12: 2, minute: 0, period: 'PM' };
    }
  }, [scheduledTime]);

  const handleTimeUpdate = (newH12: number, newM: number, newPeriod: 'AM' | 'PM') => {
    let h24 = newH12 % 12;
    if (newPeriod === 'PM') h24 += 12;
    const hh = String(h24).padStart(2, '0');
    const mm = String(newM).padStart(2, '0');
    onTimeChange(`${hh}:${mm}`);
  };

  // Full scheduled Date Object & Validation
  const scheduledDateTimeObj = useMemo(() => {
    try {
      const [y, m, d] = scheduledDate.split('-').map(Number);
      const [hh, mm] = scheduledTime.split(':').map(Number);
      return new Date(y, m - 1, d, hh, mm);
    } catch {
      return null;
    }
  }, [scheduledDate, scheduledTime]);

  // Is schedule strictly in the past? Leeway of 30 seconds for immediate scheduling
  const isPast = useMemo(() => {
    if (!scheduledDateTimeObj || isNaN(scheduledDateTimeObj.getTime())) return false;
    return scheduledDateTimeObj.getTime() < Date.now() - 30 * 1000;
  }, [scheduledDateTimeObj]);

  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(!isPast);
    }
  }, [isPast, onValidationChange]);

  // Scheduling summary formatted string
  const summaryString = useMemo(() => {
    if (!scheduledDateTimeObj || isNaN(scheduledDateTimeObj.getTime())) return '';
    const dayOfWeek = scheduledDateTimeObj.toLocaleDateString('en-US', { weekday: 'long' });
    const day = scheduledDateTimeObj.getDate();
    const month = scheduledDateTimeObj.toLocaleDateString('en-US', { month: 'long' });
    const year = scheduledDateTimeObj.getFullYear();
    const timeStr = scheduledDateTimeObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${dayOfWeek}, ${day} ${month} ${year} · ${timeStr} ${detectedTimezone.abbr}`;
  }, [scheduledDateTimeObj, detectedTimezone]);

  // Calendar calculations
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const yStr = String(viewYear);
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    onDateChange(`${yStr}-${mStr}-${dStr}`);
    setIsCalendarOpen(false);
  };

  // Formatted date string for button display
  const displayFormattedDate = useMemo(() => {
    return selectedDateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedDateObj]);

  return (
    <div className="space-y-4">
      {/* 1. Date & Time Inputs (Stacked cleanly for right-sidebar card) */}
      <div className="space-y-3.5 relative" ref={calendarRef}>
        {/* Date Selector Field */}
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5 flex items-center space-x-1">
            <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
            <span>Publishing Date</span>
          </label>
          <button
            type="button"
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
              isCalendarOpen
                ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs text-gray-900'
                : 'bg-gray-50/80 hover:bg-white border-gray-200 hover:border-gray-300 text-gray-800'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <span className="font-bold text-gray-900 text-xs">{displayFormattedDate}</span>
            </div>
            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isCalendarOpen ? 'rotate-90 text-emerald-600' : ''}`} />
          </button>

          {/* Calendar Popover */}
          {isCalendarOpen && (
            <div className="absolute top-[68px] left-0 z-50 w-72 bg-white rounded-2xl border border-gray-200 shadow-[0_12px_36px_rgba(0,0,0,0.12)] p-4 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Calendar Header with Navigation */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                <h4 className="text-xs font-bold text-gray-900">
                  {monthNames[viewMonth]} {viewYear}
                </h4>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                    title="Previous month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                    title="Next month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day of week headers */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <span key={d} className="text-[10px] font-bold text-gray-400">
                    {d}
                  </span>
                ))}
              </div>

              {/* Calendar Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {/* Blank days from previous month */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`blank-${i}`} className="w-8 h-8" />
                ))}

                {/* Month days */}
                {Array.from({ length: daysInCurrentMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const dayDate = new Date(viewYear, viewMonth, day);
                  const isDayPast = dayDate < today;
                  const isDayToday =
                    dayDate.getFullYear() === today.getFullYear() &&
                    dayDate.getMonth() === today.getMonth() &&
                    dayDate.getDate() === today.getDate();
                  const isDaySelected =
                    dayDate.getFullYear() === selectedDateObj.getFullYear() &&
                    dayDate.getMonth() === selectedDateObj.getMonth() &&
                    dayDate.getDate() === selectedDateObj.getDate();

                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={isDayPast}
                      onClick={() => handleSelectDay(day)}
                      className={`w-8 h-8 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                        isDaySelected
                          ? 'bg-emerald-600 text-white font-bold shadow-xs scale-105'
                          : isDayPast
                          ? 'text-gray-300 cursor-not-allowed line-through text-[11px]'
                          : isDayToday
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold hover:bg-emerald-100'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Quick Jump Today Button */}
              <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    const yStr = String(today.getFullYear());
                    const mStr = String(today.getMonth() + 1).padStart(2, '0');
                    const dStr = String(today.getDate()).padStart(2, '0');
                    onDateChange(`${yStr}-${mStr}-${dStr}`);
                    setIsCalendarOpen(false);
                  }}
                  className="text-emerald-600 font-bold hover:underline cursor-pointer"
                >
                  Select Today
                </button>
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(false)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 12-Hour Time Selector Field */}
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>Publishing Time</span>
          </label>
          <div className="flex items-center space-x-2 bg-gray-50/80 border border-gray-200 rounded-xl p-2">
            {/* Hour Dropdown */}
            <select
              value={hour12}
              onChange={(e) => handleTimeUpdate(parseInt(e.target.value, 10), minute, period as 'AM' | 'PM')}
              className="bg-white border border-gray-200 text-gray-900 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-emerald-500 cursor-pointer shadow-2xs"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}
                </option>
              ))}
            </select>

            <span className="font-bold text-gray-400 text-sm">:</span>

            {/* Minute Dropdown (5-min intervals or any 0-59) */}
            <select
              value={minute}
              onChange={(e) => handleTimeUpdate(hour12, parseInt(e.target.value, 10), period as 'AM' | 'PM')}
              className="bg-white border border-gray-200 text-gray-900 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-emerald-500 cursor-pointer shadow-2xs"
            >
              {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                <option key={m} value={m}>
                  {String(m).padStart(2, '0')}
                </option>
              ))}
            </select>

            {/* AM / PM Segmented Control */}
            <div className="flex items-center bg-gray-200/70 p-0.5 rounded-lg text-xs font-bold ml-auto">
              <button
                type="button"
                onClick={() => handleTimeUpdate(hour12, minute, 'AM')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  period === 'AM'
                    ? 'bg-white text-emerald-700 shadow-2xs font-extrabold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => handleTimeUpdate(hour12, minute, 'PM')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  period === 'PM'
                    ? 'bg-white text-emerald-700 shadow-2xs font-extrabold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                PM
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Detected Timezone Badge */}
      <div className="flex items-center space-x-1.5 text-[11px] text-gray-500 px-1">
        <Globe className="w-3.5 h-3.5 text-gray-400" />
        <span>Timezone:</span>
        <strong className="text-gray-700 font-semibold">{detectedTimezone.tzName} ({detectedTimezone.abbr})</strong>
      </div>

      {/* 3. Scheduling Summary Preview Card */}
      <div
        className={`p-3.5 rounded-xl border transition-all ${
          isPast
            ? 'bg-amber-50/80 border-amber-200 text-amber-900'
            : 'bg-emerald-50/50 border-emerald-200/80 text-emerald-950'
        }`}
      >
        <div className="flex items-start space-x-2.5">
          {isPast ? (
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
              {isPast ? 'Invalid Schedule Warning' : 'Scheduled for'}
            </span>
            <p className="text-xs font-bold leading-snug">
              {summaryString}
            </p>
            {isPast && (
              <p className="text-[11px] text-amber-700 font-medium pt-0.5">
                The selected time has already passed. Please select a future time.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
