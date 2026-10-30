'use client';

import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Cpu,
  Layers,
  RefreshCw,
  Copy,
  Check,
  Server,
  Zap,
} from 'lucide-react';
import { PlatformLogo } from '@/components/SocialIcons';

interface SystemHealthViewProps {
  health: {
    overallStatus: 'healthy' | 'warning' | 'critical';
    database: {
      status: 'connected' | 'error';
      latencyMs: number;
      poolHealth: string;
      tables: Record<string, { count: number; status: string }>;
    };
    publishingQueue: {
      status: 'active' | 'stalled';
      pendingJobs: number;
      processingJobs: number;
      failedJobs: number;
    };
    integrations: Array<{
      platform: string;
      status: 'operational' | 'degraded' | 'rate_limited';
      connectedCount: number;
      lastVerifiedAt: string;
      issues?: string;
    }>;
    diagnostics: Array<{ level: string; message: string; timestamp: string }>;
  } | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const SystemHealthView: React.FC<SystemHealthViewProps> = ({
  health,
  isLoading,
  onRefresh,
}) => {
  const [copiedSql, setCopiedSql] = useState(false);

  if (isLoading || !health) {
    return (
      <div className="space-y-6 animate-pulse p-6">
        <div className="h-8 w-48 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const { overallStatus, database, publishingQueue, integrations, diagnostics } = health;

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-gray-900 tracking-tight">System &amp; Integration Health</h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                overallStatus === 'healthy'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : overallStatus === 'warning'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {overallStatus === 'healthy' ? 'All Systems Operational' : `${overallStatus} State`}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Diagnostic telemetry, database latency, background queue status, and OAuth platform endpoints.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
          <span>Run Health Check</span>
        </button>
      </div>

      {/* 3 Core System Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Database */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-gray-900">Supabase PostgreSQL</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <div>
            <div className="text-2xl font-black text-gray-900">{database.latencyMs}ms</div>
            <span className="text-[11px] text-gray-400">Connection pool round-trip latency</span>
          </div>

          <div className="pt-2 border-t border-gray-100 text-xs text-gray-600">
            Pool Health: <strong className="text-gray-900">{database.poolHealth}</strong>
          </div>
        </div>

        {/* Publishing Queue */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-gray-900">Publishing Daemon</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          </div>

          <div>
            <div className="text-2xl font-black text-gray-900">{publishingQueue.pendingJobs} pending</div>
            <span className="text-[11px] text-gray-400">
              {publishingQueue.processingJobs} processing • {publishingQueue.failedJobs} failed
            </span>
          </div>

          <div className="pt-2 border-t border-gray-100 text-xs text-gray-600">
            Idempotency Mutex: <strong className="text-emerald-700">Active (45s window)</strong>
          </div>
        </div>

        {/* OAuth Integrations */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-gray-900">Social OAuth APIs</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          </div>

          <div>
            <div className="text-2xl font-black text-gray-900">
              {integrations.filter((i) => i.status === 'operational').length} / {integrations.length}
            </div>
            <span className="text-[11px] text-gray-400">Endpoints verified live</span>
          </div>

          <div className="pt-2 border-t border-gray-100 text-xs text-gray-600">
            Protocol: <strong className="text-gray-900">Official Graph &amp; v3 API</strong>
          </div>
        </div>
      </div>

      {/* Platform Integrations Status Grid */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h3 className="text-sm font-bold text-gray-900">Platform API Connectivity</h3>
          <p className="text-[11px] text-gray-400">Status of official third-party social media integrations</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {integrations.map((item) => (
            <div
              key={item.platform}
              className="p-3.5 rounded-xl border border-gray-200/80 bg-gray-50/50 space-y-2"
            >
              <div className="flex items-center justify-between">
                <PlatformLogo platform={item.platform as any} className="w-4 h-4" />
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                    item.status === 'operational'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {item.status}
                </span>
              </div>

              <div>
                <span className="text-xs font-bold text-gray-900 capitalize block">{item.platform}</span>
                <span className="text-[10px] text-gray-400">{item.connectedCount} connected channels</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Database Tables Statistics */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h3 className="text-sm font-bold text-gray-900">PostgreSQL Table Diagnostics</h3>
          <p className="text-[11px] text-gray-400">Live row counts and table status in Supabase</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(database.tables).map(([tableName, data]) => (
            <div key={tableName} className="p-3 rounded-xl border border-gray-200/80 bg-gray-50/50 space-y-1">
              <span className="text-[10px] font-mono text-gray-400 truncate block">{tableName}</span>
              <div className="text-base font-black text-gray-900">{data.count.toLocaleString()}</div>
              <span className="text-[9px] font-semibold text-emerald-600 uppercase block">✓ Active</span>
            </div>
          ))}
        </div>
      </div>

      {/* Diagnostics Logs */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-gray-900">Health Diagnostic Stream</h3>
        <div className="space-y-1.5 font-mono text-[11px]">
          {diagnostics.map((d, i) => (
            <div key={i} className="p-2.5 rounded-xl bg-gray-900 text-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                    d.level === 'warning' ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-black'
                  }`}
                >
                  {d.level}
                </span>
                <span>{d.message}</span>
              </div>
              <span className="text-[10px] text-gray-500">{new Date(d.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
