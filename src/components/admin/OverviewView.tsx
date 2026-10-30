'use client';

import React, { useState } from 'react';
import {
  Users,
  Share2,
  Send,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  DollarSign,
  Activity,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { AdminOverviewStats } from '@/lib/admin/service';
import {
  InteractiveAreaChart,
  DonutDistributionChart,
  HorizontalComparisonBar,
} from './AdminCharts';
import { PlatformLogo } from '@/components/SocialIcons';

interface OverviewViewProps {
  stats: AdminOverviewStats | null;
  isLoading: boolean;
  onRefresh: () => void;
  onNavigateTab: (tab: any) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  stats,
  isLoading,
  onRefresh,
  onNavigateTab,
}) => {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  if (isLoading || !stats) {
    return (
      <div className="space-y-6 animate-pulse p-6">
        <div className="h-8 w-48 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-gray-100 rounded-2xl" />
          <div className="h-72 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  const kpis = [
    {
      title: 'Total Registered Users',
      value: stats.totalUsers.toLocaleString(),
      subvalue: `${stats.activeUsers} active now`,
      change: `+${stats.newUsersThisMonth} this month`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      actionTab: 'users',
    },
    {
      title: 'Monthly Recurring Revenue',
      value: `$${stats.monthlyRecurringRevenue.toLocaleString()}`,
      subvalue: `$${stats.totalRevenue.toLocaleString()} lifetime`,
      change: `${stats.totalPaidSubscribers} paid subscribers`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      actionTab: 'billing',
    },
    {
      title: 'Connected Social Accounts',
      value: stats.totalConnectedAccounts.toLocaleString(),
      subvalue: 'Across Meta & YouTube',
      change: '100% official OAuth',
      icon: Share2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      actionTab: 'accounts',
    },
    {
      title: 'Total Published Posts',
      value: stats.totalPublishedPosts.toLocaleString(),
      subvalue: `${stats.totalScheduledPosts} scheduled in queue`,
      change: `${stats.totalDrafts} drafts`,
      icon: Send,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      actionTab: 'posts',
    },
  ];

  // Secondary metrics row
  const secondaryKpis = [
    { label: 'New Users Today', value: stats.newUsersToday },
    { label: 'New Users This Week', value: stats.newUsersThisWeek },
    { label: 'Paid Subscribers', value: stats.totalPaidSubscribers },
    { label: 'Free-Plan Users', value: stats.freePlanUsers },
    { label: 'Publishing Failures', value: stats.failedPublishingAttempts, isError: stats.failedPublishingAttempts > 0 },
    { label: 'Active Renewals', value: stats.subscriptionRenewals },
  ];

  // Formatting segments for distribution
  const platformSegments = [
    { label: 'Instagram', count: stats.platformDistribution.instagram || 0, color: '#E4405F' },
    { label: 'Facebook', count: stats.platformDistribution.facebook || 0, color: '#1877F2' },
    { label: 'YouTube', count: stats.platformDistribution.youtube || 0, color: '#FF0000' },
    { label: 'LinkedIn', count: stats.platformDistribution.linkedin || 0, color: '#0A66C2' },
    { label: 'Twitter (X)', count: stats.platformDistribution.twitter || 0, color: '#000000' },
  ].filter((s) => s.count > 0);

  const subscriptionSegments = [
    { label: 'Free Starter', count: stats.subscriptionDistribution.free, color: '#94a3b8' },
    { label: 'Creator Pro', count: stats.subscriptionDistribution.creator_pro, color: '#10b981' },
    { label: 'Agency Scale', count: stats.subscriptionDistribution.agency_scale, color: '#6366f1' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Executive Overview</h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              Live Production
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time telemetry and revenue performance across all PostingTube customers.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
            <span>Sync Telemetry</span>
          </button>
        </div>
      </div>

      {/* Critical System Alerts (if any) */}
      {stats.systemAlerts && stats.systemAlerts.length > 0 && (
        <div className="space-y-2">
          {stats.systemAlerts.map((alt) => (
            <div
              key={alt.id}
              className={`p-3.5 rounded-2xl border flex items-start space-x-3 text-xs transition-all ${
                alt.type === 'critical'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : alt.type === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              {alt.type === 'critical' ? (
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              ) : alt.type === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <Zap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-bold">{alt.title}</div>
                <div className="text-[11px] opacity-90 mt-0.5">{alt.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Primary KPI Metric Cards (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigateTab(kpi.actionTab)}
              className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs hover:border-gray-300 transition-all cursor-pointer group space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className={`w-9 h-9 rounded-xl ${kpi.bgColor} ${kpi.color} flex items-center justify-center`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex items-center text-[10px] font-bold text-gray-400 group-hover:text-gray-900 transition-colors">
                  <span>View</span>
                  <ArrowUpRight className="w-3 h-3 ml-0.5" />
                </div>
              </div>

              <div>
                <span className="text-[11px] font-medium text-gray-500 block truncate">{kpi.title}</span>
                <div className="text-2xl font-black text-gray-900 tracking-tight mt-0.5">{kpi.value}</div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                <span className="text-gray-400 truncate">{kpi.subvalue}</span>
                <span className="font-semibold text-emerald-600">{kpi.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Secondary Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {secondaryKpis.map((s, i) => (
          <div key={i} className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-2xs space-y-1">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block truncate">
              {s.label}
            </span>
            <div className={`text-lg font-black ${s.isError ? 'text-rose-600' : 'text-gray-900'}`}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Publishing Activity (Last 7 Days) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Publishing Dispatch Activity</h3>
              <p className="text-[11px] text-gray-400">Total posts processed through queue daemon</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-gray-600 text-[11px]">Published</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-gray-600 text-[11px]">Scheduled</span>
              </div>
            </div>
          </div>

          <InteractiveAreaChart
            data={stats.publishingTimeline.map((t) => ({ label: t.date, value: t.published + t.scheduled }))}
            color="#10b981"
            valueSuffix=" posts"
            height={200}
          />
        </div>

        {/* Chart 2: Platform Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold text-gray-900">Platform Share</h3>
            <p className="text-[11px] text-gray-400">Connected account distribution</p>
          </div>

          <div className="flex justify-center py-2">
            <DonutDistributionChart
              segments={
                platformSegments.length > 0
                  ? platformSegments
                  : [{ label: 'None', count: 1, color: '#e2e8f0' }]
              }
              size={150}
              thickness={18}
              centerLabel={stats.totalConnectedAccounts.toString()}
              centerSublabel="Accounts"
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-gray-100">
            {platformSegments.map((seg) => (
              <HorizontalComparisonBar
                key={seg.label}
                label={seg.label}
                value={seg.count}
                total={stats.totalConnectedAccounts}
                color={seg.color}
                icon={<PlatformLogo platform={seg.label.toLowerCase().replace(' (x)', '') as any} className="w-3.5 h-3.5" />}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Row: Subscriptions Distribution & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subscription Tier Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold text-gray-900">Subscription Plans</h3>
            <p className="text-[11px] text-gray-400">Customer tier distribution</p>
          </div>

          <div className="space-y-3 pt-1">
            <HorizontalComparisonBar
              label="Free Starter ($0)"
              value={stats.subscriptionDistribution.free}
              total={stats.totalUsers}
              color="#94a3b8"
            />
            <HorizontalComparisonBar
              label="Creator Pro ($29/mo)"
              value={stats.subscriptionDistribution.creator_pro}
              total={stats.totalUsers}
              color="#10b981"
            />
            <HorizontalComparisonBar
              label="Agency Scale ($79/mo)"
              value={stats.subscriptionDistribution.agency_scale}
              total={stats.totalUsers}
              color="#6366f1"
            />
          </div>

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/70 text-xs flex items-center justify-between">
            <span className="text-gray-500 font-medium">Estimated Annual ARR</span>
            <span className="font-black text-gray-900">${Math.round(stats.monthlyRecurringRevenue * 12).toLocaleString()}</span>
          </div>
        </div>

        {/* Recent Audit & Activity Feed */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Recent Platform Activity</h3>
              <p className="text-[11px] text-gray-400">Real-time log of customer actions and dispatches</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('activity')}
              className="text-xs font-bold text-gray-900 hover:underline cursor-pointer"
            >
              View All Logs →
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {stats.recentActivity.slice(0, 5).map((act) => (
              <div key={act.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      act.status === 'failed' ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{act.description}</div>
                    <div className="text-[10px] text-gray-400 flex items-center space-x-1">
                      <span>{act.userEmail}</span>
                      <span>•</span>
                      <span>{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                    act.status === 'failed'
                      ? 'bg-rose-50 text-rose-700 border border-rose-100'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {act.eventType.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
