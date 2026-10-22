'use client';

import React from 'react';
import { SocialAccount, Post } from '@/types/social';
import { PlatformLogo } from './SocialIcons';
import {
  TrendingUp,
  Users,
  Eye,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Share2,
} from 'lucide-react';

interface AnalyticsViewProps {
  accounts: SocialAccount[];
  posts?: Post[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ accounts, posts = [] }) => {
  const totalFollowers = accounts.reduce((acc, a) => acc + (a.followersCount || 0), 0);
  const publishedCount = posts.filter((p) => p.status === 'published').length;
  const scheduledCount = posts.filter((p) => p.status === 'scheduled').length;

  const stats = [
    {
      label: 'Connected Channels',
      value: `${accounts.length}`,
      subtext: accounts.length === 1 ? '1 active channel' : `${accounts.length} active channels`,
      icon: Layers,
    },
    {
      label: 'Verified Audience',
      value: totalFollowers.toLocaleString(),
      subtext: 'Across connected pages',
      icon: Users,
    },
    {
      label: 'Live Posts Dispatched',
      value: `${publishedCount}`,
      subtext: 'Via official APIs',
      icon: CheckCircle2,
    },
    {
      label: 'Scheduled in Pipeline',
      value: `${scheduledCount}`,
      subtext: 'Awaiting publish window',
      icon: Calendar,
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center space-x-2">
          <TrendingUp className="w-6 h-6 text-emerald-600" />
          <span>Analytics & Publishing Intelligence</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Real metrics calculated from your connected social accounts and published posts.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs font-semibold uppercase">{stat.label}</span>
                <Icon className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500 font-medium mt-1">
                {stat.subtext}
              </div>
            </div>
          );
        })}
      </div>

      {/* Connected Channels Audience Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs">
        <h3 className="text-base font-bold text-gray-900 mb-4">Connected Channels Audience Breakdown</h3>

        {accounts.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-xs">
            No accounts connected yet. Go to <strong className="text-gray-700">Configuration → Connections</strong> to link your Facebook Page.
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => {
              const maxFollowers = Math.max(1, ...accounts.map((a) => a.followersCount || 0));
              const percentage = Math.round(((account.followersCount || 0) / maxFollowers) * 100);

              return (
                <div key={account.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 font-semibold text-gray-800">
                      <PlatformLogo platform={account.platform} className="w-4 h-4" />
                      <span>{account.displayName}</span>
                      <span className="text-gray-400 font-normal">(@{account.username})</span>
                    </div>
                    <span className="font-bold text-gray-900">
                      {(account.followersCount || 0).toLocaleString()} followers
                    </span>
                  </div>

                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, percentage)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
