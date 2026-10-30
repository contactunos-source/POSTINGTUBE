'use client';

import React, { useState } from 'react';
import {
  Share2,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  ShieldAlert,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { PlatformLogo } from '@/components/SocialIcons';

interface ConnectedAccountsViewProps {
  accounts: Array<{
    id: string;
    platform: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    accountType: string;
    status: string;
    followersCount: number;
    pageId?: string;
    createdAt: string;
    updatedAt: string;
    tokenStatus: string;
    ownerEmail: string;
  }>;
  isLoading: boolean;
  onRefresh: () => void;
  onPlatformFilter: (platform: string) => void;
  onStatusFilter: (status: string) => void;
  onSearch: (query: string) => void;
  onDisconnectAccount: (accountId: string) => Promise<void>;
}

export const ConnectedAccountsView: React.FC<ConnectedAccountsViewProps> = ({
  accounts,
  isLoading,
  onRefresh,
  onPlatformFilter,
  onStatusFilter,
  onSearch,
  onDisconnectAccount,
}) => {
  const [search, setSearch] = useState('');
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  const handleDisconnect = async (accountId: string, name: string) => {
    if (!confirm(`Are you sure you want to disconnect ${name}? This action will be recorded in the security audit log.`)) {
      return;
    }

    setDisconnectingId(accountId);
    try {
      await onDisconnectAccount(accountId);
    } finally {
      setDisconnectingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Connected Social Accounts</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Monitor customer OAuth authorizations, token health, and channel connections across all integrated platforms.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
          <span>Refresh Accounts</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/90 shadow-2xs flex flex-wrap items-center gap-3">
        {/* Search Input */}
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
              placeholder="Search by username, page ID, or channel..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-hidden focus:border-gray-900 transition-all text-gray-800 placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Platform Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400 font-medium">Platform:</span>
          <select
            onChange={(e) => onPlatformFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Platforms</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="youtube">YouTube</option>
            <option value="linkedin">LinkedIn</option>
            <option value="twitter">Twitter (X)</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400 font-medium">Status:</span>
          <select
            onChange={(e) => onStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="connected">Connected & Valid</option>
            <option value="expired">Expired Token</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Social Channel</th>
                <th className="py-3 px-4">Platform</th>
                <th className="py-3 px-4">Owner / Customer</th>
                <th className="py-3 px-4">Connection Status</th>
                <th className="py-3 px-4">Token Authorization</th>
                <th className="py-3 px-4">Connected At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-gray-400 animate-pulse">
                    Querying connected accounts from Supabase...
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-gray-400">
                    No social media accounts match this filter.
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-gray-50/70 transition-colors">
                    {/* Channel & Avatar */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2.5">
                        <img
                          src={
                            acc.avatarUrl ||
                            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                          }
                          alt={acc.displayName}
                          className="w-8 h-8 rounded-full object-cover border border-gray-200"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 truncate">{acc.displayName}</div>
                          <div className="text-[10px] text-gray-400 truncate">@{acc.username}</div>
                        </div>
                      </div>
                    </td>

                    {/* Platform Badge */}
                    <td className="py-3 px-4">
                      <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-[10px] font-bold">
                        <PlatformLogo platform={acc.platform as any} className="w-3.5 h-3.5" />
                        <span className="capitalize">{acc.platform}</span>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4 text-gray-600 font-mono text-[11px]">
                      {acc.ownerEmail}
                    </td>

                    {/* Connection Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          acc.status === 'connected'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {acc.status}
                      </span>
                    </td>

                    {/* Token Status */}
                    <td className="py-3 px-4 font-semibold text-gray-700 text-[11px]">
                      {acc.tokenStatus}
                    </td>

                    {/* Connected Date */}
                    <td className="py-3 px-4 text-gray-400 text-[11px]">
                      {new Date(acc.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        disabled={disconnectingId === acc.id}
                        onClick={() => handleDisconnect(acc.id, acc.displayName)}
                        className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center space-x-1"
                        title="Disconnect invalid account"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Disconnect</span>
                      </button>
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
