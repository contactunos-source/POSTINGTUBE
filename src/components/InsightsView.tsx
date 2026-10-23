'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Post, SocialAccount, SocialPlatform, PlatformPostMetrics } from '@/types/social';
import { PlatformLogo } from './SocialIcons';
import { useClickOutside } from '@/hooks/useClickOutside';
import {
  TrendingUp,
  Users,
  Eye,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Share2,
  Heart,
  MessageCircle,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  Play,
  Clock,
  Sparkles,
  Info,
  X,
  AlertCircle,
  CalendarRange,
} from 'lucide-react';
import {
  format,
  subDays,
  startOfMonth,
  isWithinInterval,
  parseISO,
  eachDayOfInterval,
  isSameDay,
} from 'date-fns';
import {
  parseDateSafe,
  formatDateFullSafe,
  formatTimeSafe,
  formatDateTimeWithSeconds,
} from '@/lib/dateUtils';

interface InsightsViewProps {
  posts: Post[];
  accounts: SocialAccount[];
  workspaceId?: string;
  initialSelectedAccountId?: string;
  onPostsUpdated?: (updated: Post[]) => void;
  onSelectPost?: (post: Post) => void;
}

type DateRangeFilter = '7d' | '30d' | 'mtd' | 'custom';
type ChartMetricType = 'views' | 'engagement' | 'posts';
type TableSortType = 'top' | 'views' | 'engagement' | 'recent';

function formatRelativeTime(date: Date | null): string {
  if (!date) return 'never';
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export const InsightsView: React.FC<InsightsViewProps> = ({
  posts,
  accounts,
  workspaceId,
  initialSelectedAccountId = 'all',
  onPostsUpdated,
  onSelectPost,
}) => {
  // Account selection state ('all' or specific accountId)
  const [selectedAccountId, setSelectedAccountId] = useState<string>(initialSelectedAccountId);

  useEffect(() => {
    if (initialSelectedAccountId) {
      setSelectedAccountId(initialSelectedAccountId);
    }
  }, [initialSelectedAccountId]);

  // Date Range filter states
  const [dateRange, setDateRange] = useState<DateRangeFilter>('30d');
  const [customStartDate, setCustomStartDate] = useState<string>(
    format(subDays(new Date(), 30), 'yyyy-MM-dd')
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );

  // Chart Metric state
  const [chartMetric, setChartMetric] = useState<ChartMetricType>('views');
  const [hoveredChartPoint, setHoveredChartPoint] = useState<any | null>(null);

  // Table states
  const [tableSearch, setTableSearch] = useState<string>('');
  const [tableSort, setTableSort] = useState<TableSortType>('top');
  const [inspectedPost, setInspectedPost] = useState<Post | null>(null);

  // Refresh states
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(new Date());
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const inspectedModalRef = useRef<HTMLDivElement>(null);
  useClickOutside(inspectedModalRef, () => setInspectedPost(null), {
    enabled: inspectedPost !== null,
  });

  // Filter connected accounts only
  const connectedAccounts = useMemo(() => {
    return accounts.filter((a) => a.status === 'connected' || !a.status);
  }, [accounts]);

  // Determine current active date interval
  const { currentInterval, previousInterval } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    if (dateRange === '7d') {
      start = subDays(now, 7);
    } else if (dateRange === '30d') {
      start = subDays(now, 30);
    } else if (dateRange === 'mtd') {
      start = startOfMonth(now);
    } else {
      start = parseISO(customStartDate) || subDays(now, 30);
      end = parseISO(customEndDate) || now;
      if (start > end) {
        start = subDays(end, 30);
      }
    }

    const durationMs = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - durationMs);
    const prevEnd = new Date(start.getTime());

    return {
      currentInterval: { start, end },
      previousInterval: { start: prevStart, end: prevEnd },
    };
  }, [dateRange, customStartDate, customEndDate]);

  // Filter published posts based on selected account and date interval
  const publishedPosts = useMemo(() => {
    return posts.filter((p) => {
      if (p.status !== 'published') return false;

      // Filter by account if specific account selected
      if (selectedAccountId !== 'all') {
        const matchesTarget = (p.targetAccountIds || []).includes(selectedAccountId);
        const matchesResults = p.results && Object.keys(p.results).includes(selectedAccountId);
        if (!matchesTarget && !matchesResults) return false;
      }

      // Filter by date interval
      const postDate = parseDateSafe(p.publishedAt || p.scheduledFor || p.createdAt);
      if (!postDate) return false;

      return isWithinInterval(postDate, {
        start: currentInterval.start,
        end: currentInterval.end,
      });
    });
  }, [posts, selectedAccountId, currentInterval]);

  // Posts in the previous interval for trend comparisons
  const previousPeriodPosts = useMemo(() => {
    return posts.filter((p) => {
      if (p.status !== 'published') return false;

      if (selectedAccountId !== 'all') {
        const matchesTarget = (p.targetAccountIds || []).includes(selectedAccountId);
        const matchesResults = p.results && Object.keys(p.results).includes(selectedAccountId);
        if (!matchesTarget && !matchesResults) return false;
      }

      const postDate = parseDateSafe(p.publishedAt || p.scheduledFor || p.createdAt);
      if (!postDate) return false;

      return isWithinInterval(postDate, {
        start: previousInterval.start,
        end: previousInterval.end,
      });
    });
  }, [posts, selectedAccountId, previousInterval]);

  // Calculate Real Aggregated Metrics
  const currentMetrics = useMemo(() => {
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let hasViews = false;
    let hasLikes = false;
    let hasComments = false;
    let hasShares = false;

    publishedPosts.forEach((post) => {
      const resultsEntries = post.results ? Object.entries(post.results) : [];

      resultsEntries.forEach(([accId, res]) => {
        if (selectedAccountId !== 'all' && accId !== selectedAccountId) {
          return;
        }

        const metrics = res.analytics || (post.analytics ? post.analytics[accId] : undefined);
        if (metrics) {
          if (typeof metrics.views === 'number') {
            totalViews += metrics.views;
            hasViews = true;
          }
          if (typeof metrics.likes === 'number') {
            totalLikes += metrics.likes;
            hasLikes = true;
          }
          if (typeof metrics.comments === 'number') {
            totalComments += metrics.comments;
            hasComments = true;
          }
          if (typeof metrics.shares === 'number') {
            totalShares += metrics.shares;
            hasShares = true;
          }
        }
      });
    });

    const totalInteractions = totalLikes + totalComments + totalShares;
    const engagementRate = hasViews && totalViews > 0
      ? ((totalInteractions / totalViews) * 100)
      : null;

    return {
      postCount: publishedPosts.length,
      views: hasViews ? totalViews : null,
      likes: hasLikes ? totalLikes : 0,
      comments: hasComments ? totalComments : 0,
      shares: hasShares ? totalShares : 0,
      totalInteractions,
      engagementRate,
    };
  }, [publishedPosts, selectedAccountId]);

  // Calculate Previous Period Metrics for Trends
  const previousMetrics = useMemo(() => {
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let hasViews = false;

    previousPeriodPosts.forEach((post) => {
      const resultsEntries = post.results ? Object.entries(post.results) : [];

      resultsEntries.forEach(([accId, res]) => {
        if (selectedAccountId !== 'all' && accId !== selectedAccountId) return;
        const metrics = res.analytics || (post.analytics ? post.analytics[accId] : undefined);
        if (metrics) {
          if (typeof metrics.views === 'number') {
            totalViews += metrics.views;
            hasViews = true;
          }
          if (typeof metrics.likes === 'number') totalLikes += metrics.likes;
          if (typeof metrics.comments === 'number') totalComments += metrics.comments;
          if (typeof metrics.shares === 'number') totalShares += metrics.shares;
        }
      });
    });

    return {
      postCount: previousPeriodPosts.length,
      views: hasViews ? totalViews : null,
      interactions: totalLikes + totalComments + totalShares,
    };
  }, [previousPeriodPosts, selectedAccountId]);

  // Calculate Percentage Change
  const getChangePercent = (current: number | null, prev: number | null) => {
    if (current === null || prev === null || prev === 0) return null;
    const change = ((current - prev) / prev) * 100;
    return Math.round(change * 10) / 10;
  };

  const viewsChange = getChangePercent(currentMetrics.views, previousMetrics.views);
  const postsChange = getChangePercent(currentMetrics.postCount, previousMetrics.postCount);
  const interactionsChange = getChangePercent(
    currentMetrics.totalInteractions,
    previousMetrics.interactions
  );

  // Generate Daily Trend Data for Chart
  const dailyChartData = useMemo(() => {
    const days = eachDayOfInterval({
      start: currentInterval.start,
      end: currentInterval.end,
    });

    return days.map((day) => {
      let dayViews = 0;
      let dayLikes = 0;
      let dayComments = 0;
      let dayShares = 0;
      let dayPostCount = 0;
      let dayHasViews = false;

      publishedPosts.forEach((post) => {
        const postDate = parseDateSafe(post.publishedAt || post.scheduledFor || post.createdAt);
        if (!postDate || !isSameDay(postDate, day)) return;

        dayPostCount++;
        const resultsEntries = post.results ? Object.entries(post.results) : [];

        resultsEntries.forEach(([accId, res]) => {
          if (selectedAccountId !== 'all' && accId !== selectedAccountId) return;
          const metrics = res.analytics || (post.analytics ? post.analytics[accId] : undefined);
          if (metrics) {
            if (typeof metrics.views === 'number') {
              dayViews += metrics.views;
              dayHasViews = true;
            }
            if (typeof metrics.likes === 'number') dayLikes += metrics.likes;
            if (typeof metrics.comments === 'number') dayComments += metrics.comments;
            if (typeof metrics.shares === 'number') dayShares += metrics.shares;
          }
        });
      });

      return {
        dateStr: format(day, 'MMM d'),
        fullDateStr: format(day, 'MMMM d, yyyy'),
        views: dayViews,
        likes: dayLikes,
        comments: dayComments,
        shares: dayShares,
        engagement: dayLikes + dayComments + dayShares,
        posts: dayPostCount,
        hasViews: dayHasViews,
      };
    });
  }, [currentInterval, publishedPosts, selectedAccountId]);

  // Refresh Analytics Directly from Official Platform APIs
  const handleRefreshAnalytics = async () => {
    setIsRefreshing(true);
    setRefreshError(null);

    try {
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
        if (onPostsUpdated && data.refreshedPosts) {
          onPostsUpdated(data.refreshedPosts);
        }
      } else {
        setRefreshError(data.error || 'Failed to refresh analytics from platform APIs');
      }
    } catch (err: any) {
      setRefreshError(err?.message || 'Network error refreshing analytics');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Sort and Filter Table Posts
  const sortedTablePosts = useMemo(() => {
    let list = [...publishedPosts];

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      list = list.filter((p) => p.content.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      const getMetrics = (post: Post) => {
        let v = 0;
        let eng = 0;
        const res = post.results ? Object.entries(post.results) : [];
        res.forEach(([accId, r]) => {
          if (selectedAccountId !== 'all' && accId !== selectedAccountId) return;
          const m = r.analytics || (post.analytics ? post.analytics[accId] : undefined);
          if (m) {
            if (typeof m.views === 'number') v += m.views;
            if (typeof m.likes === 'number') eng += m.likes;
            if (typeof m.comments === 'number') eng += m.comments;
            if (typeof m.shares === 'number') eng += m.shares;
          }
        });
        const rate = v > 0 ? (eng / v) * 100 : eng;
        return { views: v, engagement: eng, rate };
      };

      const mA = getMetrics(a);
      const mB = getMetrics(b);

      if (tableSort === 'views') return mB.views - mA.views;
      if (tableSort === 'engagement') return mB.engagement - mA.engagement;
      if (tableSort === 'top') return mB.rate - mA.rate;
      // 'recent'
      const dateA = new Date(a.publishedAt || a.createdAt).getTime();
      const dateB = new Date(b.publishedAt || b.createdAt).getTime();
      return dateB - dateA;
    });

    return list;
  }, [publishedPosts, tableSearch, tableSort, selectedAccountId]);

  // Selected Account details
  const activeAccount = useMemo(() => {
    if (selectedAccountId === 'all') return null;
    return accounts.find((a) => a.id === selectedAccountId);
  }, [selectedAccountId, accounts]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans space-y-6">
      {/* Top Header: Title, Real Time Indicator & Refresh */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
                Insights &amp; Performance
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Official API metrics verified across connected channels. Zero mock data.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Refresh Button & Last Updated Time */}
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <span className="text-[11px] font-medium text-gray-400 block">Last Synced</span>
            <span className="text-xs font-semibold text-gray-700">
              {formatRelativeTime(lastRefreshedAt)}
            </span>
          </div>

          <button
            onClick={handleRefreshAnalytics}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-900 hover:bg-black text-white transition-all shadow-xs flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{isRefreshing ? 'Fetching Official APIs...' : 'Refresh Insights'}</span>
          </button>
        </div>
      </div>

      {refreshError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{refreshError}</span>
        </div>
      )}

      {/* Account Selection Tabs (All Channels vs Specific Connected Accounts) */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedAccountId('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center space-x-2 cursor-pointer ${
            selectedAccountId === 'all'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All Channels ({connectedAccounts.length})</span>
        </button>

        {connectedAccounts.map((account) => {
          const isSelected = selectedAccountId === account.id;
          return (
            <button
              key={account.id}
              onClick={() => setSelectedAccountId(account.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center space-x-2 cursor-pointer ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <PlatformLogo platform={account.platform} className="w-3.5 h-3.5" />
              <span className="truncate max-w-[140px]">{account.displayName || account.username}</span>
            </button>
          );
        })}
      </div>

      {/* Date Range Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-gray-200/90 rounded-2xl p-3 shadow-2xs">
        <div className="flex items-center space-x-1.5">
          {[
            { id: '7d', label: 'Last 7 Days' },
            { id: '30d', label: 'Last 30 Days' },
            { id: 'mtd', label: 'Month to Date' },
            { id: 'custom', label: 'Custom Range' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setDateRange(item.id as DateRangeFilter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                dateRange === item.id
                  ? 'bg-gray-900 text-white shadow-2xs font-bold'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {dateRange === 'custom' && (
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-gray-400 font-medium">From</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-800 bg-gray-50 text-xs focus:outline-hidden focus:border-emerald-500"
            />
            <span className="text-gray-400 font-medium">To</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-800 bg-gray-50 text-xs focus:outline-hidden focus:border-emerald-500"
            />
          </div>
        )}

        <div className="text-xs text-gray-500 font-medium flex items-center space-x-1.5">
          <CalendarRange className="w-3.5 h-3.5 text-gray-400" />
          <span>
            {format(currentInterval.start, 'MMM d, yyyy')} – {format(currentInterval.end, 'MMM d, yyyy')}
          </span>
        </div>
      </div>

      {/* SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Posts Published */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Posts Published</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-gray-900">
            {currentMetrics.postCount}
          </div>
          <div className="text-xs text-gray-500 flex items-center justify-between pt-1 border-t border-gray-100">
            <span>In selected window</span>
            {postsChange !== null && (
              <span
                className={`font-semibold flex items-center space-x-0.5 ${
                  postsChange >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {postsChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                <span>{Math.abs(postsChange)}%</span>
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Total Views */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Views / Reach</span>
            <Eye className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-gray-900">
            {currentMetrics.views !== null ? currentMetrics.views.toLocaleString() : 'Not available'}
          </div>
          <div className="text-xs text-gray-500 flex items-center justify-between pt-1 border-t border-gray-100">
            <span>Verified impressions</span>
            {viewsChange !== null && (
              <span
                className={`font-semibold flex items-center space-x-0.5 ${
                  viewsChange >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {viewsChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                <span>{Math.abs(viewsChange)}%</span>
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Total Reactions & Engagements */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Engagements</span>
            <Heart className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-gray-900">
            {currentMetrics.totalInteractions.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 flex items-center justify-between pt-1 border-t border-gray-100">
            <span>Likes + Comments + Shares</span>
            {interactionsChange !== null && (
              <span
                className={`font-semibold flex items-center space-x-0.5 ${
                  interactionsChange >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {interactionsChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                <span>{Math.abs(interactionsChange)}%</span>
              </span>
            )}
          </div>
        </div>

        {/* Card 4: Engagement Rate */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Engagement Rate</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-gray-900">
            {currentMetrics.engagementRate !== null
              ? `${currentMetrics.engagementRate.toFixed(2)}%`
              : currentMetrics.totalInteractions > 0
              ? `${currentMetrics.totalInteractions} interactions`
              : '0.00%'}
          </div>
          <div className="text-xs text-gray-500 flex items-center justify-between pt-1 border-t border-gray-100">
            <span>Per viewed audience</span>
            <span className="text-emerald-600 font-semibold">Active</span>
          </div>
        </div>
      </div>

      {/* PERFORMANCE CHART OVER TIME (Interactive SVG Chart) */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Performance Over Time</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Daily trajectory of verified performance metrics
            </p>
          </div>

          {/* Metric Selector for Chart */}
          <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setChartMetric('views')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                chartMetric === 'views'
                  ? 'bg-white text-gray-900 shadow-2xs font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Views / Reach
            </button>
            <button
              onClick={() => setChartMetric('engagement')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                chartMetric === 'engagement'
                  ? 'bg-white text-gray-900 shadow-2xs font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Engagements
            </button>
            <button
              onClick={() => setChartMetric('posts')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                chartMetric === 'posts'
                  ? 'bg-white text-gray-900 shadow-2xs font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Posts
            </button>
          </div>
        </div>

        {/* SVG Chart Area */}
        <div className="relative h-64 w-full">
          {dailyChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-gray-400">
              No data available for this range.
            </div>
          ) : (() => {
            const values = dailyChartData.map((d) =>
              chartMetric === 'views' ? d.views : chartMetric === 'engagement' ? d.engagement : d.posts
            );
            const maxVal = Math.max(1, ...values);
            const width = 800;
            const height = 220;
            const paddingX = 40;
            const paddingY = 20;

            const points = dailyChartData.map((d, idx) => {
              const val = chartMetric === 'views' ? d.views : chartMetric === 'engagement' ? d.engagement : d.posts;
              const x = paddingX + (idx / Math.max(1, dailyChartData.length - 1)) * (width - 2 * paddingX);
              const y = height - paddingY - (val / maxVal) * (height - 2 * paddingY);
              return { x, y, data: d, value: val };
            });

            const pathD = points.reduce((acc, p, idx) => {
              return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
            }, '');

            const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

            return (
              <div className="w-full h-full relative">
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  className="w-full h-full overflow-visible"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                    const y = height - paddingY - pct * (height - 2 * paddingY);
                    const labelVal = Math.round(pct * maxVal);
                    return (
                      <g key={pct}>
                        <line
                          x1={paddingX}
                          y1={y}
                          x2={width - paddingX}
                          y2={y}
                          stroke="#f3f4f6"
                          strokeWidth="1"
                        />
                        <text
                          x={paddingX - 10}
                          y={y + 3}
                          textAnchor="end"
                          fontSize="9"
                          fill="#9ca3af"
                        >
                          {labelVal.toLocaleString()}
                        </text>
                      </g>
                    );
                  })}

                  {/* Area fill */}
                  <path d={areaD} fill="url(#chartGradient)" />

                  {/* Line stroke */}
                  <path d={pathD} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />

                  {/* Data points */}
                  {points.map((p, idx) => (
                    <circle
                      key={idx}
                      cx={p.x}
                      cy={p.y}
                      r={hoveredChartPoint?.fullDateStr === p.data.fullDateStr ? 5 : 3}
                      className="cursor-pointer transition-all fill-emerald-600 stroke-white stroke-2"
                      onMouseEnter={() => setHoveredChartPoint(p.data)}
                    />
                  ))}
                </svg>

                {/* Hover Tooltip Card */}
                {hoveredChartPoint && (
                  <div className="absolute top-2 right-4 bg-gray-900 text-white rounded-xl p-3 shadow-xl text-xs space-y-1.5 z-20 pointer-events-none">
                    <div className="font-bold text-gray-200 border-b border-gray-800 pb-1">
                      {hoveredChartPoint.fullDateStr}
                    </div>
                    <div className="space-y-0.5 text-[11px]">
                      <div className="flex items-center justify-between space-x-3">
                        <span className="text-gray-400">Views:</span>
                        <span className="font-bold">{hoveredChartPoint.views.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between space-x-3">
                        <span className="text-gray-400">Likes:</span>
                        <span className="font-bold">{hoveredChartPoint.likes.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between space-x-3">
                        <span className="text-gray-400">Comments:</span>
                        <span className="font-bold">{hoveredChartPoint.comments.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between space-x-3">
                        <span className="text-gray-400">Posts Dispatched:</span>
                        <span className="font-bold text-emerald-400">{hoveredChartPoint.posts}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* POST PERFORMANCE TABLE */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        {/* Table Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-900">Post Performance Table</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Verified metric breakdowns across published posts
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search caption..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 text-gray-800 focus:outline-hidden focus:border-emerald-500 w-48"
              />
            </div>

            {/* Sort Dropdown */}
            <select
              value={tableSort}
              onChange={(e) => setTableSort(e.target.value as TableSortType)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-700 border border-gray-200 rounded-xl bg-gray-50 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              <option value="top">Top Performing</option>
              <option value="views">Most Views</option>
              <option value="engagement">Most Engagement</option>
              <option value="recent">Most Recent</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 uppercase font-semibold text-[11px]">
                <th className="pb-3 pl-2">Post</th>
                <th className="pb-3">Platform</th>
                <th className="pb-3">Published At</th>
                <th className="pb-3 text-right">Views</th>
                <th className="pb-3 text-right">Likes</th>
                <th className="pb-3 text-right">Comments</th>
                <th className="pb-3 text-right">Shares</th>
                <th className="pb-3 text-right">Eng. Rate</th>
                <th className="pb-3 text-right pr-2">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedTablePosts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400">
                    No published posts found in the selected date interval.
                  </td>
                </tr>
              ) : (
                sortedTablePosts.map((post) => {
                  const media = post.media && post.media.length > 0 ? post.media[0] : null;
                  const resultsEntries = post.results ? Object.entries(post.results) : [];

                  let postViews: number | null = null;
                  let likes = 0;
                  let comments = 0;
                  let shares = 0;

                  for (const [accId, r] of resultsEntries) {
                    if (selectedAccountId !== 'all' && accId !== selectedAccountId) continue;
                    const m = r.analytics || (post.analytics ? post.analytics[accId] : undefined);
                    if (m) {
                      if (typeof m.views === 'number') {
                        postViews = (postViews ?? 0) + m.views;
                      }
                      if (typeof m.likes === 'number') likes += m.likes;
                      if (typeof m.comments === 'number') comments += m.comments;
                      if (typeof m.shares === 'number') shares += m.shares;
                    }
                  }

                  const totalInteractions = likes + comments + shares;
                  const rate = postViews && postViews > 0 ? (totalInteractions / postViews) * 100 : null;

                  const targetAccounts = accounts.filter((a) => (post.targetAccountIds || []).includes(a.id));
                  const primaryAcc = targetAccounts[0];

                  return (
                    <tr
                      key={post.id}
                      className="hover:bg-gray-50/60 transition-colors cursor-pointer group"
                      onClick={() => setInspectedPost(post)}
                    >
                      {/* Post Thumbnail & Caption */}
                      <td className="py-3 pl-2">
                        <div className="flex items-center space-x-3 max-w-xs">
                          {media ? (
                            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-gray-100 border border-gray-200 relative">
                              {media.type === 'video' ? (
                                <div className="w-full h-full relative bg-gray-900 flex items-center justify-center">
                                  <img
                                    src={media.thumbnailUrl || media.url}
                                    alt="Video thumbnail"
                                    className="w-full h-full object-cover opacity-80"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-3.5 h-3.5 rounded-full bg-black/60 flex items-center justify-center">
                                      <Play className="w-2 h-2 text-white fill-white ml-0.5" />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <img
                                  src={media.thumbnailUrl || media.url}
                                  alt="Post thumbnail"
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                              <span className="text-[10px] font-bold">TXT</span>
                            </div>
                          )}

                          <span className="line-clamp-2 text-xs font-medium text-gray-800 leading-snug">
                            {post.content || '(Media Post)'}
                          </span>
                        </div>
                      </td>

                      {/* Platform */}
                      <td className="py-3">
                        <div className="flex items-center space-x-1.5">
                          <PlatformLogo platform={primaryAcc?.platform || 'facebook'} className="w-3.5 h-3.5" />
                          <span className="font-semibold text-gray-700 capitalize">
                            {primaryAcc?.displayName || primaryAcc?.username || 'Channel'}
                          </span>
                        </div>
                      </td>

                      {/* Published At */}
                      <td className="py-3 text-gray-500 whitespace-nowrap">
                        {formatDateFullSafe(post.publishedAt || post.createdAt)}
                      </td>

                      {/* Views */}
                      <td className="py-3 text-right font-medium text-gray-900">
                        {postViews !== null ? postViews.toLocaleString() : 'Not available'}
                      </td>

                      {/* Likes */}
                      <td className="py-3 text-right font-medium text-gray-900">
                        {likes.toLocaleString()}
                      </td>

                      {/* Comments */}
                      <td className="py-3 text-right font-medium text-gray-900">
                        {comments.toLocaleString()}
                      </td>

                      {/* Shares */}
                      <td className="py-3 text-right font-medium text-gray-900">
                        {shares.toLocaleString()}
                      </td>

                      {/* Engagement Rate */}
                      <td className="py-3 text-right font-semibold text-emerald-700">
                        {rate !== null ? `${rate.toFixed(2)}%` : '—'}
                      </td>

                      {/* Action */}
                      <td className="py-3 text-right pr-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedPost(post);
                          }}
                          className="px-2.5 py-1 rounded-lg border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 text-[11px] font-semibold transition-all cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECT POST DETAILS MODAL */}
      {inspectedPost && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div
            ref={inspectedModalRef}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  PUBLISHED
                </span>
                <span className="text-xs text-gray-500">
                  {formatDateFullSafe(inspectedPost.publishedAt || inspectedPost.createdAt)}
                </span>
              </div>
              <button
                onClick={() => setInspectedPost(null)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Media Asset Preview */}
            {inspectedPost.media && inspectedPost.media.length > 0 && (
              <div className="w-full h-56 rounded-xl overflow-hidden bg-black relative border border-gray-100">
                {inspectedPost.media[0].type === 'video' ? (
                  <video
                    src={inspectedPost.media[0].url}
                    controls
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img
                    src={inspectedPost.media[0].url}
                    alt="Post media preview"
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            )}

            {/* Caption Content */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Caption
              </span>
              <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs text-gray-800 leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
                {inspectedPost.content || '(No caption provided)'}
              </div>
            </div>

            {/* Platform Analytics Breakdown */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Platform Breakdown
              </span>
              <div className="space-y-2">
                {inspectedPost.results &&
                  Object.entries(inspectedPost.results).map(([accId, res]) => {
                    const acc = accounts.find((a) => a.id === accId);
                    const metrics = res.analytics || (inspectedPost.analytics ? inspectedPost.analytics[accId] : undefined);

                    return (
                      <div
                        key={accId}
                        className="p-3 rounded-xl border border-gray-200 bg-gray-50/70 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2 font-bold text-gray-900">
                            <PlatformLogo platform={acc?.platform || (res.platform as any) || 'facebook'} className="w-3.5 h-3.5" />
                            <span>{acc?.displayName || res.accountName || 'Channel'}</span>
                          </div>
                          {res.externalPostUrl && (
                            <a
                              href={res.externalPostUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center space-x-1"
                            >
                              <span>View live</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        <div className="grid grid-cols-4 gap-2 pt-1 border-t border-gray-200/80 text-center text-xs">
                          <div>
                            <span className="text-[10px] text-gray-400 block">Views</span>
                            <span className="font-bold text-gray-800">
                              {metrics?.views !== null && metrics?.views !== undefined ? metrics.views.toLocaleString() : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block">Likes</span>
                            <span className="font-bold text-gray-800">
                              {metrics?.likes !== null && metrics?.likes !== undefined ? metrics.likes.toLocaleString() : '0'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block">Comments</span>
                            <span className="font-bold text-gray-800">
                              {metrics?.comments !== null && metrics?.comments !== undefined ? metrics.comments.toLocaleString() : '0'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block">Shares</span>
                            <span className="font-bold text-gray-800">
                              {metrics?.shares !== null && metrics?.shares !== undefined ? metrics.shares.toLocaleString() : '0'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setInspectedPost(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
