'use client';

import React, { useState } from 'react';
import {
  History,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Clock,
  RefreshCw,
  Terminal,
} from 'lucide-react';

interface ActivityLogsViewProps {
  logs: Array<{
    id: string;
    source: string;
    eventType: string;
    actor: string;
    details?: any;
    status: string;
    timestamp: string;
    ipAddress?: string;
  }>;
  isLoading: boolean;
  onRefresh: () => void;
  onEventTypeFilter: (type: string) => void;
  onSearch: (query: string) => void;
}

export const ActivityLogsView: React.FC<ActivityLogsViewProps> = ({
  logs,
  isLoading,
  onRefresh,
  onEventTypeFilter,
  onSearch,
}) => {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Audit Trail &amp; Activity Logs</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Cryptographically sealed, append-only security logs of critical owner actions and customer events.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/90 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                onSearch(e.target.value);
              }}
              placeholder="Search by event type, actor, or diagnostic details..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-hidden focus:border-gray-900 transition-all text-gray-800 placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400 font-medium">Event:</span>
          <select
            onChange={(e) => onEventTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Events</option>
            <option value="OWNER_LOGIN_SUCCESS">Owner Login Success</option>
            <option value="OWNER_LOGIN_ATTEMPT_FAILED">Owner Login Failed</option>
            <option value="POST_PUBLISHED">Post Published</option>
            <option value="POST_SCHEDULED">Post Scheduled</option>
            <option value="USER_ACCOUNT_SUSPENDED">Account Suspended</option>
            <option value="SOCIAL_ACCOUNT_DISCONNECTED_BY_OWNER">Account Disconnected</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Diagnostics / Details</th>
                <th className="py-3 px-4">Origin IP</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700 font-mono text-[11px]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-gray-400 animate-pulse font-sans">
                    Loading security audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-gray-400 font-sans">
                    No activity records found matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/70 transition-colors">
                    {/* Event Type */}
                    <td className="py-3 px-4 font-bold text-gray-900">
                      <div className="flex items-center space-x-1.5">
                        <Terminal className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{log.eventType}</span>
                      </div>
                    </td>

                    {/* Actor */}
                    <td className="py-3 px-4 text-gray-700 truncate max-w-[180px]">
                      {log.actor}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          log.status === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : log.status === 'failed' || log.status === 'blocked'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>

                    {/* Details */}
                    <td className="py-3 px-4 font-sans text-xs text-gray-600 truncate max-w-xs">
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '—')}
                    </td>

                    {/* IP */}
                    <td className="py-3 px-4 text-gray-400">{log.ipAddress || '127.0.0.1'}</td>

                    {/* Timestamp */}
                    <td className="py-3 px-4 text-right text-gray-500 font-sans text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
