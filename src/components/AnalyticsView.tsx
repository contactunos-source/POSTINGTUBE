'use client';

import React, { useState } from 'react';
import { SocialAccount, Post } from '@/types/social';
import { PlatformLogo } from './SocialIcons';
import {
  TrendingUp,
  Users,
  Eye,
  CheckCircle2,
  Calendar,
  Layers,
  ShieldCheck,
  Share2,
  Heart,
  MessageCircle,
  ExternalLink,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface AnalyticsViewProps {
  accounts: SocialAccount[];
  posts?: Post[];
  workspaceId?: string;
  onRefreshData?: () => Promise<void> | void;
  onPostsUpdated?: (updated: Post[]) => void;
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return 'never';
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  accounts,
  posts = [],
  workspaceId,
  onRefreshData,
  onPostsUpdated,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const totalFollowers = accounts.reduce((acc, a) => acc + (a.followersCount || 0), 0);
  const publishedPosts = posts.filter(
    (p) =>
      p.status === 'published' ||
      (p.results && Object.values(p.results).some((r) => r?.status === 'success'))
  );
  const publishedCount = publishedPosts.length;
  const scheduledCount = posts.filter((p) => p.status === 'scheduled').length;

  // Aggregate real engagement metrics across all published posts
  let totalViews = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalShares = 0;
  let hasAnyViews = false;
  let hasAnyLikes = false;
  let hasAnyComments = false;
  let hasAnyShares = false;

  publishedPosts.forEach((p) => {
    const results = p.results ? Object.entries(p.results) : [];
    results.forEach(([accId, res]) => {
      const metrics = res.analytics || (p.analytics ? p.analytics[accId] : undefined);
      if (metrics) {
        if (typeof metrics.views === 'number') {
          totalViews += metrics.views;
          hasAnyViews = true;
        }
        if (typeof metrics.likes === 'number') {
          totalLikes += metrics.likes;
          hasAnyLikes = true;
        }
        if (typeof metrics.comments === 'number') {
          totalComments += metrics.comments;
          hasAnyComments = true;
        }
        if (typeof metrics.shares === 'number') {
          totalShares += metrics.shares;
          hasAnyShares = true;
        }
      }
    });
  });

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshError(null);

    try {
      // 1. Fetch latest Supabase records for accounts and posts
      if (onRefreshData) {
        await onRefreshData();
      }

      // 2. Fetch official live analytics from social media platform APIs
      const res = await fetch('/api/analytics/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspaceId || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setLastRefreshedAt(new Date());
        if (onPostsUpdated && data.refreshedPosts && Array.isArray(data.refreshedPosts)) {
          onPostsUpdated(data.refreshedPosts);
        }
      } else if (data.error) {
        setRefreshError(data.error || 'Failed to refresh platform metrics');
      }
    } catch (err: any) {
      console.error('Failed to refresh analytics:', err);
      setRefreshError(err?.message || 'Network error refreshing analytics');
    } finally {
      setIsRefreshing(false);
    }
  };

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

  const engagementStats = [
    {
      label: 'Total Views / Reach',
      value: hasAnyViews ? totalViews.toLocaleString() : '0',
      subtext: 'Across verified published posts',
      icon: Eye,
      color: 'text-indigo-600',
    },
    {
      label: 'Total Reactions & Likes',
      value: hasAnyLikes ? totalLikes.toLocaleString() : '0',
      subtext: 'Direct user engagements',
      icon: Heart,
      color: 'text-rose-600',
    },
    {
      label: 'Total Comments',
      value: hasAnyComments ? totalComments.toLocaleString() : '0',
      subtext: 'Audience discussions',
      icon: MessageCircle,
      color: 'text-blue-600',
    },
    {
      label: 'Total Shares',
      value: hasAnyShares ? totalShares.toLocaleString() : '0',
      subtext: 'Social distributions',
      icon: Share2,
      color: 'text-emerald-600',
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto font-sans space-y-6 sm:space-y-8 w-full overflow-hidden">
      {/* Top Header: Title, Live Sync Status & Top Refresh Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-gray-200/90 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-2xs shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Analytics &amp; Publishing Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Real metrics calculated from your connected social accounts and published posts via official platform APIs.
            </p>
          </div>
        </div>

        {/* Right Side: Refresh Button & Last Synced Timestamp */}
        <div className="flex items-center justify-between sm:justify-end space-x-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100 shrink-0">
          <div className="text-left sm:text-right">
            <span className="text-[11px] font-semibold text-gray-400 block uppercase tracking-wider">
              Last Synced
            </span>
            <span className="text-xs font-semibold text-gray-700">
              {formatRelativeTime(lastRefreshedAt)}
            </span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-gray-900 hover:bg-black text-white transition-all shadow-xs flex items-center space-x-2 cursor-pointer disabled:opacity-50 shrink-0"
            title="Fetch real-time verified metrics from official social APIs and Supabase"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isRefreshing ? 'animate-spin text-emerald-400' : 'text-emerald-400'
              }`}
            />
            <span>{isRefreshing ? 'Refreshing Metrics...' : 'Refresh Analytics'}</span>
          </button>
        </div>
      </div>

      {refreshError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{refreshError}</span>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="p-4 sm:p-5 bg-white rounded-2xl border border-gray-200/80 shadow-xs"
            >
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs font-semibold uppercase">{stat.label}</span>
                <Icon className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500 font-medium mt-1">{stat.subtext}</div>
            </div>
          );
        })}
      </div>

      {/* Real Engagement Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Published Posts Engagement Metrics</span>
          </h2>
          <span className="text-xs text-gray-500 font-medium">
            Aggregated from official platform endpoints
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {engagementStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="p-4 sm:p-5 bg-white rounded-2xl border border-gray-200/80 shadow-xs"
              >
                <div className="flex items-center justify-between text-gray-400 mb-2">
                  <span className="text-xs font-semibold uppercase">{stat.label}</span>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-500 font-medium mt-1">{stat.subtext}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Published Posts Performance Table */}
      {publishedPosts.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-gray-900">
              Recent Published Posts &amp; Official Metrics
            </h3>
            <span className="text-xs text-gray-500 font-medium">
              {publishedPosts.length} {publishedPosts.length === 1 ? 'post' : 'posts'}
            </span>
          </div>

          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 scrollbar-thin">
            <table className="w-full text-left text-xs min-w-[620px]">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 uppercase font-semibold">
                  <th className="pb-3 pl-2">Post Content</th>
                  <th className="pb-3">Platform</th>
                  <th className="pb-3 text-right">Views</th>
                  <th className="pb-3 text-right">Likes</th>
                  <th className="pb-3 text-right">Comments</th>
                  <th className="pb-3 text-right">Shares</th>
                  <th className="pb-3 text-right pr-2">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {publishedPosts.map((post) => {
                  const results = post.results ? Object.entries(post.results) : [];
                  if (results.length === 0) {
                    return (
                      <tr key={post.id} className="hover:bg-gray-50/50">
                        <td className="py-3 pl-2 max-w-xs truncate font-medium text-gray-800">
                          {post.content || 'Untitled post'}
                        </td>
                        <td className="py-3 text-gray-400">Direct</td>
                        <td className="py-3 text-right text-gray-400">—</td>
                        <td className="py-3 text-right text-gray-400">—</td>
                        <td className="py-3 text-right text-gray-400">—</td>
                        <td className="py-3 text-right text-gray-400">—</td>
                        <td className="py-3 text-right pr-2 text-gray-400">—</td>
                      </tr>
                    );
                  }

                  return results.map(([accId, res]) => {
                    const metrics =
                      res.analytics || (post.analytics ? post.analytics[accId] : undefined);
                    const account = accounts.find((a) => a.id === accId);
                    const platform = (account?.platform || res.platform || 'facebook') as any;

                    return (
                      <tr key={`${post.id}_${accId}`} className="hover:bg-gray-50/50">
                        <td className="py-3 pl-2 max-w-xs truncate font-medium text-gray-800">
                          {post.content || 'Untitled post'}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center space-x-1.5">
                            <PlatformLogo platform={platform} className="w-3.5 h-3.5" />
                            <span className="font-semibold text-gray-700 capitalize">
                              {account?.displayName || platform}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-right font-medium text-gray-900">
                          {metrics?.views !== null && metrics?.views !== undefined
                            ? metrics.views.toLocaleString()
                            : 'Not available'}
                        </td>
                        <td className="py-3 text-right font-medium text-gray-900">
                          {metrics?.likes !== null && metrics?.likes !== undefined
                            ? metrics.likes.toLocaleString()
                            : '0'}
                        </td>
                        <td className="py-3 text-right font-medium text-gray-900">
                          {metrics?.comments !== null && metrics?.comments !== undefined
                            ? metrics.comments.toLocaleString()
                            : '0'}
                        </td>
                        <td className="py-3 text-right font-medium text-gray-900">
                          {metrics?.shares !== null && metrics?.shares !== undefined
                            ? metrics.shares.toLocaleString()
                            : '—'}
                        </td>
                        <td className="py-3 text-right pr-2">
                          {res.externalPostUrl ? (
                            <a
                              href={res.externalPostUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 text-emerald-600 hover:text-emerald-700 font-medium"
                            >
                              <span>View</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Connected Channels Audience Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-6 shadow-xs">
        <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-4">
          Connected Channels Audience Breakdown
        </h3>

        {accounts.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-xs">
            No accounts connected yet. Go to <strong className="text-gray-700">Configuration → Connections</strong> to link your accounts.
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => {
              const maxFollowers = Math.max(1, ...accounts.map((a) => a.followersCount || 0));
              const percentage = Math.round(((account.followersCount || 0) / maxFollowers) * 100);

              return (
                <div key={account.id} className="space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
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
