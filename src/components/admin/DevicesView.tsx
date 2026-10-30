'use client';

import React from 'react';
import {
  Globe,
  Smartphone,
  Laptop,
  Compass,
  Monitor,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { HorizontalComparisonBar } from './AdminCharts';

interface DevicesViewProps {
  deviceData: {
    countries: Array<{ country: string; count: number; percentage: number }>;
    devices: Array<{ category: string; count: number; percentage: number }>;
    browsers: Array<{ name: string; count: number; percentage: number }>;
    os: Array<{ name: string; count: number; percentage: number }>;
    totalSessions: number;
  } | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const DevicesView: React.FC<DevicesViewProps> = ({
  deviceData,
  isLoading,
  onRefresh,
}) => {
  if (isLoading || !deviceData) {
    return (
      <div className="space-y-6 animate-pulse p-6">
        <div className="h-8 w-48 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-44 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const { countries, devices, browsers, os, totalSessions } = deviceData;

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Customer Location &amp; Device Insights</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Privacy-conscious telemetry across customer sessions ({totalSessions.toLocaleString()} audited sessions).
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer shadow-2xs w-fit"
          title="Refresh analytics"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 4 Analytics Panels Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Panel 1: Geographical Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Geographical Footprint</h3>
              <p className="text-[11px] text-gray-400">Country of origin via IP resolution</p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {countries.map((c) => (
              <HorizontalComparisonBar
                key={c.country}
                label={c.country}
                value={c.count}
                total={totalSessions}
                color="#3b82f6"
              />
            ))}
          </div>
        </div>

        {/* Panel 2: Device Categories */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Device Categories</h3>
              <p className="text-[11px] text-gray-400">Desktop vs Mobile vs Tablet</p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {devices.map((d) => (
              <HorizontalComparisonBar
                key={d.category}
                label={d.category.charAt(0).toUpperCase() + d.category.slice(1)}
                value={d.count}
                total={totalSessions}
                color="#8b5cf6"
              />
            ))}
          </div>
        </div>

        {/* Panel 3: Web Browsers */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Web Browsers</h3>
              <p className="text-[11px] text-gray-400">Browser client distributions</p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {browsers.map((b) => (
              <HorizontalComparisonBar
                key={b.name}
                label={b.name}
                value={b.count}
                total={totalSessions}
                color="#10b981"
              />
            ))}
          </div>
        </div>

        {/* Panel 4: Operating Systems */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Operating Systems</h3>
              <p className="text-[11px] text-gray-400">Client platforms &amp; environments</p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {os.map((o) => (
              <HorizontalComparisonBar
                key={o.name}
                label={o.name}
                value={o.count}
                total={totalSessions}
                color="#f59e0b"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 text-xs text-gray-600 flex items-center space-x-2.5">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        <span>
          <strong>Privacy Compliance:</strong> Telemetry records aggregated country and device metrics strictly for performance optimization. Precise GPS location tracking is not collected.
        </span>
      </div>
    </div>
  );
};
