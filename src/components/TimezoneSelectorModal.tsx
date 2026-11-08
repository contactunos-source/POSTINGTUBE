'use client';

import React, { useState, useMemo } from 'react';
import {
  Globe,
  Clock,
  Check,
  Search,
  X,
  Sparkles,
  MapPin,
} from 'lucide-react';
import {
  getUserTimezone,
  setUserTimezone,
  getUserTimezoneInfo,
  POPULAR_TIMEZONES,
  formatTimeSafe,
  useUserTimeFormat,
} from '@/lib/dateUtils';

interface TimezoneSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTimezoneChanged?: (newTz: string) => void;
}

export const TimezoneSelectorModal: React.FC<TimezoneSelectorModalProps> = ({
  isOpen,
  onClose,
  onTimezoneChanged,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { timeFormat } = useUserTimeFormat();
  const activeTz = getUserTimezone();
  const activeTzInfo = useMemo(() => getUserTimezoneInfo(activeTz), [activeTz]);

  // Detected device browser timezone
  const browserTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }, []);
  const browserTzInfo = useMemo(() => getUserTimezoneInfo(browserTz), [browserTz]);

  // Full list of supported IANA timezones
  const allTimezones = useMemo(() => {
    try {
      if (typeof Intl.supportedValuesOf === 'function') {
        return Intl.supportedValuesOf('timeZone');
      }
    } catch {}
    return POPULAR_TIMEZONES.map((p) => p.tz);
  }, []);

  // Filtered list based on search query
  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      return null; // Show grouped popular list when no search
    }

    return allTimezones
      .filter((tz) => {
        const lower = tz.toLowerCase();
        const city = tz.split('/').pop()?.toLowerCase() || '';
        return lower.includes(q) || city.includes(q);
      })
      .slice(0, 50); // Limit to top 50 matches for instant UI responsiveness
  }, [searchQuery, allTimezones]);

  if (!isOpen) return null;

  const handleSelect = (tz: string) => {
    setUserTimezone(tz);
    if (onTimezoneChanged) onTimezoneChanged(tz);
    onClose();
  };

  const handleAutoDetect = () => {
    setUserTimezone('auto');
    if (onTimezoneChanged) onTimezoneChanged(browserTz);
    onClose();
  };

  const now = new Date();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 to-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Select Timezone</h2>
              <p className="text-xs text-gray-500">
                Post dates, calendar grids, and schedules adapt to your country
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Banner */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 min-w-0">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="truncate">
              <span className="text-gray-500">Current: </span>
              <span className="font-bold text-gray-800">{activeTzInfo.label}</span>
            </div>
          </div>
          <div className="flex items-center space-x-1 font-mono text-emerald-700 font-bold shrink-0">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTimeSafe(now)}</span>
          </div>
        </div>

        {/* Search Input & Auto-detect Button */}
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search country, city, or timezone (e.g. New York, London, Tokyo, IST)..."
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              autoFocus
            />
          </div>

          <button
            type="button"
            onClick={handleAutoDetect}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              activeTzInfo.isAutoDetected
                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <div className="text-left">
                <span className="block font-bold">Use Device Timezone (Recommended)</span>
                <span className="text-[11px] text-gray-500 font-normal">
                  Auto-detected: {browserTzInfo.label}
                </span>
              </div>
            </div>
            {activeTzInfo.isAutoDetected && (
              <span className="flex items-center space-x-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                <Check className="w-3 h-3" />
                <span>Active</span>
              </span>
            )}
          </button>
        </div>

        {/* Timezones List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
          {filteredList ? (
            /* Search Results */
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 pb-1">
                Matches ({filteredList.length})
              </p>
              {filteredList.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500">
                  No timezones found matching &ldquo;{searchQuery}&rdquo;. Try another city name.
                </div>
              ) : (
                filteredList.map((tz) => {
                  const isSelected = activeTz === tz;
                  const info = getUserTimezoneInfo(tz);
                  return (
                    <button
                      key={tz}
                      type="button"
                      onClick={() => handleSelect(tz)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200'
                          : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-2 text-left truncate">
                        <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{info.label}</span>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0 ml-2">
                        <span className="text-[11px] font-mono text-gray-400">
                          {formatTimeSafe(now, '', tz)}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            /* Grouped Popular Timezones */
            <div className="space-y-4">
              {['Americas', 'Europe', 'Asia & Middle East', 'Australia & Pacific', 'Africa', 'Universal'].map(
                (region) => {
                  const regionItems = POPULAR_TIMEZONES.filter((p) => p.region === region);
                  return (
                    <div key={region} className="space-y-1">
                      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2">
                        {region}
                      </h4>
                      <div className="space-y-0.5">
                        {regionItems.map((item) => {
                          const isSelected = activeTz === item.tz;
                          const info = getUserTimezoneInfo(item.tz);
                          return (
                            <button
                              key={item.tz}
                              type="button"
                              onClick={() => handleSelect(item.tz)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200'
                                  : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center space-x-2 text-left truncate">
                                <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span className="truncate">{item.label}</span>
                              </div>
                              <div className="flex items-center space-x-2 shrink-0 ml-2">
                                <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {info.abbr}
                                </span>
                                <span className="text-[11px] font-mono text-gray-400">
                                  {formatTimeSafe(now, '', item.tz)}
                                </span>
                                {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
