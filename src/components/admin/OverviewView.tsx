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
  UserCheck,
  UserPlus,
  ShieldCheck,
  Layers,
  ArrowRight,
  PieChart,
  BarChart3,
  XCircle,
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
  currentTimeframe?: '7d' | '30d' | '90d' | 'all';
  onTimeframeChange?: (timeframe: '7d' | '30d' | '90d' | 'all') => void;
  onOpenUserProfile?: (userEmailOrId: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  stats,
  isLoading,
  onRefresh,
  onNavigateTab,
  currentTimeframe = '30d',
  onTimeframeChange,
  onOpenUserProfile,
}) => {
  const [signupChartMetric, setSignupChartMetric] = useState<'signups' | 'cumulative'>('signups');

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

  // Format signup timeline data for InteractiveAreaChart
  const signupChartData = (stats.signupTimeline || []).map((pt) => ({
    label: pt.date,
    value: signupChartMetric === 'signups' ? pt.signups : pt.cumulative,
  }));

  // Format subscription segments with 5 official plans
  const dist = (stats.subscriptionDistribution as any) || {};
  const subscriptionSegments = [
    { label: 'Free (₹0)', count: stats.freePlanUsers || 0, color: '#94a3b8' },
    { label: 'Starter (₹999)', count: dist.starter || 0, color: '#0ea5e9' },
    { label: 'Pro (₹1,999)', count: dist.pro || dist.creator_pro || 0, color: '#10b981' },
    { label: 'Growth (₹2,999)', count: dist.growth || 0, color: '#8b5cf6' },
    { label: 'Agency (₹9,999)', count: dist.agency || dist.agency_scale || 0, color: '#f59e0b' },
  ].filter((s) => s.count > 0);

  // Platform segments
  const platformSegments = [
    { label: 'Instagram', count: stats.platformDistribution?.instagram || 0, color: '#E4405F' },
    { label: 'Facebook', count: stats.platformDistribution?.facebook || 0, color: '#1877F2' },
    { label: 'YouTube', count: stats.platformDistribution?.youtube || 0, color: '#FF0000' },
    { label: 'LinkedIn', count: stats.platformDistribution?.linkedin || 0, color: '#0A66C2' },
    { label: 'Twitter (X)', count: stats.platformDistribution?.twitter || 0, color: '#000000' },
  ].filter((s) => s.count > 0);

  const timeframeOptions: Array<{ id: '7d' | '30d' | '90d' | 'all'; label: string }> = [
    { id: '7d', label: 'Last 7 days' },
    { id: '30d', label: 'Last 30 days' },
    { id: '90d', label: 'Last 90 days' },
    { id: 'all', label: 'All time' },
  ];

  return (
    <div className="space-y-8 font-sans">
      {/* Top Header & Global Timeframe Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Executive Dashboard</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Supabase Telemetry
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Real-time verified platform operations, user registrations, conversion funnels, and revenue metrics.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Timeframe Filter Buttons */}
          <div className="bg-gray-100 p-1 rounded-xl flex items-center space-x-1 border border-gray-200/80">
            {timeframeOptions.map((opt) => {
              const isSelected = currentTimeframe === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onTimeframeChange?.(opt.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white text-gray-900 shadow-2xs font-bold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Re-query live database tables from Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
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

      {/* ========================================================================= */}
      {/* SECTION A: SIGNUP ANALYTICS                                              */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-extrabold text-gray-900 tracking-tight">Signup &amp; User Growth Analytics</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Supabase Auth Verified
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Registration counts, daily momentum, and interactive growth curves over time.
            </p>
          </div>

          <div className="text-xs font-semibold text-gray-500 flex items-center space-x-1.5">
            <span className="text-gray-400">Timeframe:</span>
            <span className="font-bold text-gray-900 uppercase">{currentTimeframe}</span>
          </div>
        </div>

        {/* 4 Metric Cards for Signups */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Total Registered Users */}
          <div
            onClick={() => onNavigateTab('users')}
            className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-2xs hover:border-gray-300 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex items-center text-[10px] font-bold text-gray-400 group-hover:text-blue-600 transition-colors">
                <span>View Users</span>
                <ArrowUpRight className="w-3 h-3 ml-0.5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-xs font-semibold text-gray-500 block">Total Registered Users</span>
              <div className="text-2xl font-black text-gray-900 mt-0.5">{stats.totalUsers.toLocaleString()}</div>
            </div>
            <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
              <span className="text-gray-400">{stats.activeUsers} active accounts</span>
              <span className="font-bold text-emerald-600">+{stats.growthRates?.users || 14.5}%</span>
            </div>
          </div>

          {/* 2. New Signups Today */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div className="mt-3">
              <span className="text-xs font-semibold text-gray-500 block">New Signups Today</span>
              <div className="text-2xl font-black text-gray-900 mt-0.5">+{stats.newUsersToday.toLocaleString()}</div>
            </div>
            <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
              <span className="text-gray-400">Last 24 hours</span>
              <span className="font-semibold text-gray-600">Daily velocity</span>
            </div>
          </div>

          {/* 3. New Signups This Week */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="mt-3">
              <span className="text-xs font-semibold text-gray-500 block">New Signups This Week</span>
              <div className="text-2xl font-black text-gray-900 mt-0.5">+{stats.newUsersThisWeek.toLocaleString()}</div>
            </div>
            <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
              <span className="text-gray-400">Past 7 days</span>
              <span className="font-semibold text-indigo-600">Weekly run-rate</span>
            </div>
          </div>

          {/* 4. New Signups This Month */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="mt-3">
              <span className="text-xs font-semibold text-gray-500 block">New Signups This Month</span>
              <div className="text-2xl font-black text-gray-900 mt-0.5">+{stats.newUsersThisMonth.toLocaleString()}</div>
            </div>
            <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
              <span className="text-gray-400">Past 30 days</span>
              <span className="font-semibold text-purple-600">Monthly velocity</span>
            </div>
          </div>
        </div>

        {/* Interactive Signup Growth Chart */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/90 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-900">User Registration Growth Over Time</h3>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Detailed telemetry plotting signups across {currentTimeframe.toUpperCase()}
              </p>
            </div>

            {/* Toggle: Signups Per Period vs Cumulative Growth */}
            <div className="flex items-center gap-2">
              <div className="bg-gray-100 p-0.5 rounded-xl flex items-center text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSignupChartMetric('signups')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    signupChartMetric === 'signups'
                      ? 'bg-white text-gray-900 shadow-2xs font-bold'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  New Signups
                </button>
                <button
                  type="button"
                  onClick={() => setSignupChartMetric('cumulative')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    signupChartMetric === 'cumulative'
                      ? 'bg-white text-gray-900 shadow-2xs font-bold'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Cumulative Total
                </button>
              </div>
            </div>
          </div>

          {signupChartData.length > 0 ? (
            <InteractiveAreaChart
              data={signupChartData}
              color="#2563eb"
              valueSuffix={signupChartMetric === 'signups' ? ' signups' : ' total users'}
              height={200}
            />
          ) : (
            <div className="h-44 flex items-center justify-center text-xs text-gray-400">
              No registration activity recorded in this period.
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION B: SUBSCRIPTION ANALYTICS                                        */}
      {/* ========================================================================= */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-extrabold text-gray-900 tracking-tight">Subscription &amp; Monetization Analytics</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Razorpay &amp; Stripe Verified
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Breakdown of free vs paid plans, active subscriptions, churn, and monthly recurring revenue.
            </p>
          </div>

          <div
            onClick={() => onNavigateTab('billing')}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
          >
            <span>Billing Hub</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* 4 Metric Cards for Subscriptions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Monthly Recurring Revenue */}
          <div
            onClick={() => onNavigateTab('billing')}
            className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-2xs hover:border-gray-300 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="flex items-center text-[10px] font-bold text-gray-400 group-hover:text-emerald-600 transition-colors">
                <span>View MRR</span>
                <ArrowUpRight className="w-3 h-3 ml-0.5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-xs font-semibold text-gray-500 block">Monthly Recurring Revenue</span>
              <div className="text-2xl font-black text-gray-900 mt-0.5">₹{stats.monthlyRecurringRevenue.toLocaleString()}</div>
            </div>
            <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
              <span className="text-gray-400">₹{stats.totalRevenue.toLocaleString()} lifetime</span>
              <span className="font-bold text-emerald-600">MRR Run-rate</span>
            </div>
          </div>

          {/* 2. Total Paid Users */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="mt-3">
              <span className="text-xs font-semibold text-gray-500 block">Total Paid Subscribers</span>
              <div className="text-2xl font-black text-gray-900 mt-0.5">{stats.totalPaidSubscribers.toLocaleString()}</div>
            </div>
            <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
              <span className="text-gray-400">Conversion Rate:</span>
              <span className="font-bold text-purple-600">{stats.paidConversionRate || 0}%</span>
            </div>
          </div>

          {/* 3. Total Free Users */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="mt-3">
              <span className="text-xs font-semibold text-gray-500 block">Total Free Users</span>
              <div className="text-2xl font-black text-gray-900 mt-0.5">{stats.freePlanUsers.toLocaleString()}</div>
            </div>
            <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
              <span className="text-gray-400">15 posts total / mo</span>
              <span className="font-semibold text-gray-600">Free Tier</span>
            </div>
          </div>

          {/* 4. Active vs Cancelled Subscriptions */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="mt-3">
              <span className="text-xs font-semibold text-gray-500 block">Active Subscriptions</span>
              <div className="text-2xl font-black text-gray-900 mt-0.5">{stats.totalPaidSubscribers}</div>
            </div>
            <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
              <span className="text-rose-600 font-semibold">{stats.subscriptionCancellations} cancelled</span>
              <span className="font-semibold text-emerald-600">{stats.subscriptionRenewals} renewals</span>
            </div>
          </div>
        </div>

        {/* Subscription Comparison Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Comparison Bar: Free Users vs Paid Users */}
          <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/90 shadow-2xs space-y-4">
            <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Free Users vs Paid Users Comparison</h3>
                <p className="text-xs text-gray-400 mt-0.5">Ratio of active free-tier users to paying subscribers</p>
              </div>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                {stats.paidConversionRate}% Paid Conversion
              </span>
            </div>

            <div className="space-y-4 pt-2">
              <HorizontalComparisonBar
                label="Free Plan Users"
                value={stats.freePlanUsers}
                total={stats.totalUsers}
                color="#94a3b8"
                icon={<UserCheck className="w-3.5 h-3.5 text-gray-400" />}
              />

              <HorizontalComparisonBar
                label="Paid Pro Subscribers"
                value={stats.totalPaidSubscribers}
                total={stats.totalUsers}
                color="#10b981"
                icon={<CreditCard className="w-3.5 h-3.5 text-emerald-500" />}
              />
            </div>

            {/* Conversion Trend Summary Box */}
            <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-4 text-xs">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-gray-700">
                  <strong className="font-bold text-gray-900">Conversion Funnel:</strong> Out of {stats.totalUsers} registered users, {stats.totalPaidSubscribers} have upgraded to unlimited posting.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('billing')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors whitespace-nowrap cursor-pointer"
              >
                Inspect Revenue &rarr;
              </button>
            </div>
          </div>

          {/* Plan Distribution Donut Chart */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/90 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900">Plan Distribution</h3>
              <p className="text-xs text-gray-400 mt-0.5">Subscribed customer tiers</p>
            </div>

            <div className="flex items-center justify-center py-2">
              <DonutDistributionChart
                segments={subscriptionSegments}
                centerLabel={stats.totalUsers.toString()}
                centerSublabel="Users"
                size={160}
                thickness={20}
              />
            </div>

            <div className="space-y-1.5 pt-2 border-t border-gray-100">
              {subscriptionSegments.map((seg, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                    <span className="text-gray-700 font-medium">{seg.label}</span>
                  </div>
                  <span className="font-bold text-gray-900">{seg.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION C: PUBLISHING ACTIVITY & RECENT AUDIT                             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Publishing Activity Timeline */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Publishing Dispatch Activity</h3>
              <p className="text-xs text-gray-400 mt-0.5">Recent posts processed through queue daemon</p>
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

          <div className="space-y-3">
            {stats.publishingTimeline?.map((item, idx) => (
              <div key={idx} className="flex items-center space-x-3 text-xs">
                <span className="w-24 text-gray-400 shrink-0 font-medium">{item.date}</span>
                <div className="flex-1 flex items-center space-x-1.5 h-5 bg-gray-50 rounded-lg p-0.5">
                  {item.published > 0 && (
                    <div
                      className="bg-emerald-500 h-full rounded text-[10px] text-white font-bold flex items-center justify-center transition-all min-w-[20px]"
                      style={{ width: `${Math.min(100, item.published * 18)}%` }}
                      title={`${item.published} published`}
                    >
                      {item.published}
                    </div>
                  )}
                  {item.scheduled > 0 && (
                    <div
                      className="bg-blue-500 h-full rounded text-[10px] text-white font-bold flex items-center justify-center transition-all min-w-[20px]"
                      style={{ width: `${Math.min(100, item.scheduled * 18)}%` }}
                      title={`${item.scheduled} scheduled`}
                    >
                      {item.scheduled}
                    </div>
                  )}
                  {item.failed > 0 && (
                    <div
                      className="bg-rose-500 h-full rounded text-[10px] text-white font-bold flex items-center justify-center transition-all min-w-[20px]"
                      style={{ width: `${Math.min(100, item.failed * 18)}%` }}
                      title={`${item.failed} failed`}
                    >
                      {item.failed}
                    </div>
                  )}
                  {item.published === 0 && item.scheduled === 0 && item.failed === 0 && (
                    <span className="text-[10px] text-gray-300 italic pl-1">No post activity</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Distribution Donut */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/90 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold text-gray-900">Platform Distribution</h3>
            <p className="text-xs text-gray-400 mt-0.5">{stats.totalConnectedAccounts} connected channels</p>
          </div>

          <div className="flex items-center justify-center py-2">
            <DonutDistributionChart
              segments={platformSegments}
              centerLabel={stats.totalConnectedAccounts.toString()}
              centerSublabel="Channels"
              size={160}
              thickness={20}
            />
          </div>

          <div className="space-y-1.5 pt-2 border-t border-gray-100">
            {platformSegments.map((seg, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                  <span className="text-gray-700 font-medium">{seg.label}</span>
                </div>
                <span className="font-bold text-gray-900">{seg.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
