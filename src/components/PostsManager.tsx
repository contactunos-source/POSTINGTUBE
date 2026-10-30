'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useClickOutside } from '@/hooks/useClickOutside';
import { Post, SocialAccount, PostStatus, SocialPlatform, PlatformPostMetrics } from '@/types/social';
import { PlatformLogo } from './SocialIcons';
import {
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileEdit,
  ExternalLink,
  RotateCcw,
  Trash2,
  Send,
  MoreVertical,
  ThumbsUp,
  MessageCircle,
  Activity,
  Eye,
  Share2,
  Tag,
  Pin,
  ChevronDown,
  Check,
  Filter,
  Calendar,
  Copy,
  Info,
  X,
  Play,
  ArrowUpDown,
  Sparkles,
  BarChart3,
  Heart,
  ShieldCheck,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { parseDateSafe, isSameCalendarDay, formatTimeSafe, formatDateFullSafe, formatDateTimeWithSeconds } from '@/lib/dateUtils';

interface PostsManagerProps {
  posts: Post[];
  accounts: SocialAccount[];
  workspaceId?: string;
  initialStatusFilter?: PostStatus | 'all';
  onEditPost: (post: Post) => void;
  onDeletePost: (id: string) => void;
  onPublishNow: (post: Post) => void;
  onRetryPost: (post: Post) => void;
  openCreateModal: () => void;
  onPostsUpdated?: (updated: Post[]) => void;
  onRefreshData?: () => Promise<void> | void;
}

function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'just now';
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export function formatCreationRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Created recently';
  const createdDate = new Date(dateStr);
  const diffSec = Math.max(0, Math.floor((Date.now() - createdDate.getTime()) / 1000));

  if (diffSec < 45) return 'Created just now';
  if (diffSec < 90) return 'Created 1 minute ago';
  if (diffSec < 3600) return `Created ${Math.floor(diffSec / 60)} minutes ago`;
  const diffHours = Math.floor(diffSec / 3600);
  if (diffHours === 1) return 'Created 1 hour ago';
  if (diffHours < 24) return `Created ${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Created 1 day ago';
  if (diffDays < 30) return `Created ${diffDays} days ago`;
  return `Created on ${format(createdDate, 'MMM d, yyyy')}`;
}

function getAggregatedMetrics(post: Post) {
  const analyticsMap: Record<string, PlatformPostMetrics> = {
    ...(post.analytics || {}),
  };

  if (post.results) {
    for (const [accId, res] of Object.entries(post.results)) {
      if (res?.analytics && !analyticsMap[accId]) {
        analyticsMap[accId] = res.analytics;
      }
    }
  }

  const entries = Object.values(analyticsMap);
  if (entries.length === 0) {
    return {
      hasAnalytics: false,
      totalViews: null,
      totalImpressions: null,
      totalReach: null,
      totalLikes: 0,
      totalComments: 0,
      totalShares: null,
      lastFetchedAt: null,
      destinations: [],
      hasPermissionError: false,
    };
  }

  let totalViews: number | null = null;
  let totalImpressions: number | null = null;
  let totalReach: number | null = null;
  let totalLikes = 0;
  let totalComments = 0;
  let totalShares: number | null = null;
  let latestFetchTime: string | null = null;
  let hasPermissionError = false;

  for (const m of entries) {
    if (m.views !== null && m.views !== undefined) {
      totalViews = (totalViews ?? 0) + m.views;
    }
    if (m.impressions !== null && m.impressions !== undefined) {
      totalImpressions = (totalImpressions ?? 0) + m.impressions;
    }
    if (m.reach !== null && m.reach !== undefined) {
      totalReach = (totalReach ?? 0) + m.reach;
    }
    if (m.likes !== null && m.likes !== undefined) {
      totalLikes += m.likes;
    }
    if (m.comments !== null && m.comments !== undefined) {
      totalComments += m.comments;
    }
    if (m.shares !== null && m.shares !== undefined) {
      totalShares = (totalShares ?? 0) + m.shares;
    }
    if (m.lastFetchedAt) {
      if (!latestFetchTime || new Date(m.lastFetchedAt) > new Date(latestFetchTime)) {
        latestFetchTime = m.lastFetchedAt;
      }
    }
    if (m.fetchStatus === 'permission_error' || m.fetchStatus === 'rate_limited') {
      hasPermissionError = true;
    }
  }

  return {
    hasAnalytics: true,
    totalViews,
    totalImpressions,
    totalReach,
    totalLikes,
    totalComments,
    totalShares,
    lastFetchedAt: latestFetchTime,
    destinations: entries,
    hasPermissionError,
  };
}

export function getPlatformDestinationUrl(acc: SocialAccount, res?: any): string {
  if (res?.externalPostUrl) return res.externalPostUrl;

  switch (acc.platform) {
    case 'youtube': {
      if (res?.externalPostId) {
        return `https://www.youtube.com/watch?v=${res.externalPostId}`;
      }
      if (acc.pageId) {
        return `https://www.youtube.com/channel/${acc.pageId}`;
      }
      if (acc.username) {
        return `https://www.youtube.com/@${acc.username.replace(/^@/, '')}`;
      }
      return 'https://www.youtube.com';
    }
    case 'facebook': {
      if (res?.externalPostId) {
        return `https://www.facebook.com/${res.externalPostId}`;
      }
      if (acc.pageId) {
        return `https://www.facebook.com/${acc.pageId}`;
      }
      return 'https://www.facebook.com';
    }
    case 'instagram': {
      if (res?.externalPostId) {
        return `https://www.instagram.com/p/${res.externalPostId}/`;
      }
      if (acc.username) {
        return `https://www.instagram.com/${acc.username.replace(/^@/, '')}/`;
      }
      return 'https://www.instagram.com';
    }
    case 'twitter': {
      if (res?.externalPostId) {
        return `https://x.com/i/status/${res.externalPostId}`;
      }
      return 'https://x.com';
    }
    case 'linkedin': {
      if (res?.externalPostId) {
        return `https://www.linkedin.com/feed/update/${res.externalPostId}`;
      }
      return 'https://www.linkedin.com';
    }
    default:
      return 'https://postingtube.com';
  }
}

export const PostsManager: React.FC<PostsManagerProps> = ({
  posts,
  accounts,
  workspaceId,
  initialStatusFilter = 'all',
  onEditPost,
  onDeletePost,
  onPublishNow,
  onRetryPost,
  openCreateModal,
  onPostsUpdated,
  onRefreshData,
}) => {
  const [localPosts, setLocalPosts] = useState<Post[]>(posts);
  const [activeTab, setActiveTab] = useState<PostStatus | 'all'>(initialStatusFilter);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedPostForDetails, setSelectedPostForDetails] = useState<Post | null>(null);
  const [menuOpenPostId, setMenuOpenPostId] = useState<string | null>(null);
  const [expandedContentIds, setExpandedContentIds] = useState<Record<string, boolean>>({});

  // Analytics Refresh States
  const [refreshingPostId, setRefreshingPostId] = useState<string | null>(null);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [lastAnalyticsRefresh, setLastAnalyticsRefresh] = useState<Date | null>(null);

  // Sync prop changes
  useEffect(() => {
    setLocalPosts(posts);
  }, [posts]);

  const localPostsRef = useRef(localPosts);
  useEffect(() => {
    localPostsRef.current = localPosts;
  }, [localPosts]);

  // Sync initial status filter changes when user navigates via sidebar tabs
  useEffect(() => {
    setActiveTab(initialStatusFilter);
  }, [initialStatusFilter]);

  // Auto-tick every 30 seconds to dynamically update relative creation timestamps
  const [, setCreationTimestampTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setCreationTimestampTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const activeMenuRef = useRef<HTMLDivElement>(null);
  const detailsModalRef = useRef<HTMLDivElement>(null);

  // Close open action menu on outside click or Escape key
  useClickOutside(activeMenuRef, () => setMenuOpenPostId(null), {
    enabled: menuOpenPostId !== null,
  });

  // Close post details modal on outside click or Escape key
  useClickOutside(detailsModalRef, () => setSelectedPostForDetails(null), {
    enabled: selectedPostForDetails !== null,
  });

  const isPostFailed = (p: Post) => {
    if (p.status === 'failed') return true;
    if (p.results && Object.values(p.results).some((r) => r?.status === 'failed')) {
      return true;
    }
    return false;
  };

  const isPostPublished = (p: Post) => {
    if (p.status === 'published') return true;
    if (p.results && Object.values(p.results).some((r) => r?.status === 'success')) {
      return true;
    }
    return false;
  };

  const isYouTubeCommunityIssue = (acc: SocialAccount, res?: any) => {
    const isYt = acc.platform === 'youtube' || res?.platform === 'youtube';
    if (!isYt) return false;
    if (res?.status === 'action_required' && res?.actionType === 'community_assist') return true;
    const msg = (res?.errorMessage || '').toLowerCase();
    return (
      (res?.status === 'failed' || res?.status === 'action_required') &&
      (msg.includes('video') || msg.includes('community') || msg.includes('photo') || msg.includes('image'))
    );
  };

  // Calculate live counts for the status navigation bar
  const counts = useMemo(() => {
    return {
      all: localPosts.length,
      published: localPosts.filter(isPostPublished).length,
      scheduled: localPosts.filter((p) => p.status === 'scheduled').length,
      draft: localPosts.filter((p) => p.status === 'draft').length,
      failed: localPosts.filter(isPostFailed).length,
    };
  }, [localPosts]);

  // Refresh single post analytics
  const handleRefreshSinglePost = async (post: Post) => {
    setRefreshingPostId(post.id);
    try {
      const res = await fetch('/api/analytics/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, workspaceId }),
      });
      const data = await res.json();
      if (data.success && data.analytics) {
        const next = localPostsRef.current.map((p) => {
          if (p.id !== post.id) return p;
          const updatedResults = { ...(p.results || {}) };
          for (const [accId, metrics] of Object.entries(data.analytics as Record<string, PlatformPostMetrics>)) {
            if (updatedResults[accId]) {
              updatedResults[accId].analytics = metrics;
            } else {
              updatedResults[accId] = {
                status: 'success',
                platform: metrics.platform,
                externalPostId: metrics.externalPostId,
                analytics: metrics,
              };
            }
          }
          return {
            ...p,
            results: updatedResults,
            analytics: data.analytics,
          };
        });

        setLocalPosts(next);
        if (onPostsUpdated) {
          setTimeout(() => onPostsUpdated(next), 0);
        }

        setSelectedPostForDetails((prev) => {
          if (!prev || prev.id !== post.id) return prev;
          const updatedResults = { ...(prev.results || {}) };
          for (const [accId, metrics] of Object.entries(data.analytics as Record<string, PlatformPostMetrics>)) {
            if (updatedResults[accId]) {
              updatedResults[accId].analytics = metrics;
            } else {
              updatedResults[accId] = {
                status: 'success',
                platform: metrics.platform,
                externalPostId: metrics.externalPostId,
                analytics: metrics,
              };
            }
          }
          return {
            ...prev,
            results: updatedResults,
            analytics: data.analytics,
          };
        });
      }
    } catch (err) {
      console.error('Failed to refresh analytics for post:', err);
    } finally {
      setRefreshingPostId(null);
    }
  };

  // Refresh all published posts analytics
  const handleRefreshAllAnalytics = async () => {
    setIsRefreshingAll(true);
    try {
      const res = await fetch('/api/analytics/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      });
      const data = await res.json();
      if (data.success && data.analytics) {
        setLastAnalyticsRefresh(new Date());
        const next = localPostsRef.current.map((p) => {
          const postAnalytics = data.analytics[p.id];
          if (!postAnalytics) return p;
          const updatedResults = { ...(p.results || {}) };
          for (const [accId, metrics] of Object.entries(postAnalytics as Record<string, PlatformPostMetrics>)) {
            if (updatedResults[accId]) {
              updatedResults[accId].analytics = metrics;
            } else {
              updatedResults[accId] = {
                status: 'success',
                platform: metrics.platform,
                externalPostId: metrics.externalPostId,
                analytics: metrics,
              };
            }
          }
          return {
            ...p,
            results: updatedResults,
            analytics: postAnalytics,
          };
        });

        setLocalPosts(next);
        if (onPostsUpdated) {
          setTimeout(() => onPostsUpdated(next), 0);
        }

        setSelectedPostForDetails((prev) => {
          if (!prev || !data.analytics[prev.id]) return prev;
          const postAnalytics = data.analytics[prev.id];
          const updatedResults = { ...(prev.results || {}) };
          for (const [accId, metrics] of Object.entries(postAnalytics as Record<string, PlatformPostMetrics>)) {
            if (updatedResults[accId]) {
              updatedResults[accId].analytics = metrics;
            } else {
              updatedResults[accId] = {
                status: 'success',
                platform: metrics.platform,
                externalPostId: metrics.externalPostId,
                analytics: metrics,
              };
            }
          }
          return {
            ...prev,
            results: updatedResults,
            analytics: postAnalytics,
          };
        });
      }
    } catch (err) {
      console.error('Failed to refresh all analytics:', err);
    } finally {
      setIsRefreshingAll(false);
    }
  };

  // Auto-refresh analytics in background on initial view of published posts
  useEffect(() => {
    const publishedWithResults = localPosts.filter(
      (p) => p.status === 'published' && p.results && Object.keys(p.results).length > 0
    );
    if (publishedWithResults.length === 0) return;

    // Check if any post hasn't been fetched in the last 10 minutes
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    const needsFetch = publishedWithResults.some((p) => {
      const metrics = Object.values(p.analytics || {});
      if (metrics.length === 0) return true;
      const last = Math.max(...metrics.map((m) => new Date(m.lastFetchedAt).getTime() || 0));
      return last < tenMinutesAgo;
    });

    if (needsFetch) {
      const timer = setTimeout(() => {
        handleRefreshAllAnalytics();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Filtered & sorted posts
  const filteredPosts = useMemo(() => {
    return localPosts
      .filter((post) => {
        // Status filter: ensure posts with partial failures appear in both published and failed tabs
        if (activeTab === 'failed') {
          if (!isPostFailed(post)) return false;
        } else if (activeTab === 'published') {
          if (!isPostPublished(post)) return false;
        } else if (activeTab !== 'all' && post.status !== activeTab) {
          return false;
        }

        // Platform filter
        if (platformFilter !== 'all') {
          const hasPlatform = post.targetAccountIds?.some((accId) => {
            const acc = accounts.find((a) => a.id === accId);
            return acc?.platform === platformFilter;
          });
          if (!hasPlatform) return false;
        }

        // Search filter (searches caption, tags, account names)
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchContent = post.content?.toLowerCase().includes(q);
          const matchTags = post.tags?.some((t) => t.toLowerCase().includes(q));
          const matchAccount = post.targetAccountIds?.some((accId) => {
            const acc = accounts.find((a) => a.id === accId);
            return (
              acc?.displayName?.toLowerCase().includes(q) ||
              acc?.username?.toLowerCase().includes(q)
            );
          });
          if (!matchContent && !matchTags && !matchAccount) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.scheduledFor || a.publishedAt || a.createdAt).getTime();
        const dateB = new Date(b.scheduledFor || b.publishedAt || b.createdAt).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      });
  }, [localPosts, activeTab, platformFilter, searchTerm, sortOrder, accounts]);

  // Group filtered posts by day for visual timeline
  const groupedPosts = useMemo(() => {
    const groups: Record<string, Post[]> = {};
    for (const post of filteredPosts) {
      const dateVal = post.scheduledFor || post.publishedAt || post.createdAt;
      const dateKey = formatDateFullSafe(dateVal, 'Undated');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(post);
    }
    return groups;
  }, [filteredPosts]);

  // Accounts mapping helper
  const getPostAccounts = (post: Post): SocialAccount[] => {
    const directAccounts = (post.targetAccountIds || [])
      .map((id) => accounts.find((a) => a.id === id))
      .filter(Boolean) as SocialAccount[];

    if (directAccounts.length > 0) return directAccounts;

    // Fallback: extract from results map
    if (post.results) {
      return Object.entries(post.results).map(([accId, res]) => {
        const existing = accounts.find((a) => a.id === accId);
        if (existing) return existing;
        return {
          id: accId,
          platform: (res.platform as SocialPlatform) || 'facebook',
          displayName: res.accountName || 'Connected Page',
          username: res.accountName?.toLowerCase().replace(/\s+/g, '') || 'page',
          avatarUrl: '',
          status: 'connected',
        };
      });
    }

    return accounts.slice(0, 1);
  };

  const handleDuplicatePost = (post: Post) => {
    onEditPost({
      ...post,
      id: `post_${Date.now()}`,
      status: 'draft',
      scheduledFor: undefined,
      publishedAt: undefined,
      results: {},
    });
  };

  const toggleContentExpansion = (id: string) => {
    setExpandedContentIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-full bg-slate-50/60 text-gray-900 p-3 sm:p-6 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Posts Management</h1>
            <p className="text-xs text-gray-500 mt-1">
              Publish, schedule, and track real-time analytics across all your social channels.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:space-x-2.5">
            {/* Real-time Posts & Analytics Refresh Button */}
            <button
              onClick={async () => {
                setIsRefreshingAll(true);
                try {
                  if (onRefreshData) {
                    await onRefreshData();
                  }
                  await handleRefreshAllAnalytics();
                } finally {
                  setIsRefreshingAll(false);
                }
              }}
              disabled={isRefreshingAll}
              className="bg-white border border-gray-200/90 hover:bg-gray-50 text-gray-700 font-semibold py-2 px-3 rounded-xl text-xs shadow-2xs transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              title="Fetch latest posts from database and real-time social analytics"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isRefreshingAll ? 'animate-spin' : ''}`} />
              <span>{isRefreshingAll ? 'Refreshing...' : 'Refresh Posts & Analytics'}</span>
            </button>

            <button
              onClick={openCreateModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-3.5 rounded-xl text-xs shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <span>+ Create Post</span>
            </button>
          </div>
        </div>

        {/* 1. Unified Status Navigation Bar (All Posts | Published | Scheduled | Drafts | Failed) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-1.5 shadow-2xs">
          <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none">
            {[
              { id: 'all', label: 'All Posts', count: counts.all },
              { id: 'published', label: 'Published', count: counts.published },
              { id: 'scheduled', label: 'Scheduled', count: counts.scheduled },
              { id: 'draft', label: 'Drafts', count: counts.draft },
              { id: 'failed', label: 'Failed', count: counts.failed },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 shadow-2xs font-bold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-emerald-200/80 text-emerald-800'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Filter & Search Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 flex-1 max-w-md">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search caption, tags, account..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-8 pr-8 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 placeholder:text-gray-400 focus:outline-hidden focus:border-emerald-500 shadow-2xs"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 p-0.5 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Platform Filter */}
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as any)}
              className="text-xs py-2.5 px-3 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-hidden focus:border-emerald-500 cursor-pointer shadow-2xs"
            >
              <option value="all">All Channels</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
              <option value="linkedin">LinkedIn</option>
              <option value="threads">Threads</option>
              <option value="pinterest">Pinterest</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto">
            {/* Sort Order */}
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="text-xs py-2 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 flex items-center space-x-1.5 shadow-2xs cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
              <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>
        </div>

        {/* Posts List / Timeline */}
        {filteredPosts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 p-8 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">No posts found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {activeTab === 'published'
                ? 'No published posts found. Publish or schedule a post to see it live here.'
                : activeTab === 'scheduled'
                ? 'No upcoming scheduled posts. Choose a future date on the calendar or create one.'
                : 'There are no posts matching the current filters.'}
            </p>
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Create your first post
            </button>
          </div>
        ) : (
          /* Grouped Date Sections */
          <div className="space-y-8">
            {Object.keys(groupedPosts).map((dateKey) => (
              <div key={dateKey} className="space-y-4">
                {/* Date Header */}
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <h3 className="text-sm font-bold text-gray-800 tracking-tight">
                    {dateKey}
                  </h3>
                  <div className="flex-1 h-px bg-gray-200/80"></div>
                </div>

                {/* Posts Timeline Items */}
                <div className="space-y-5">
                  {groupedPosts[dateKey].map((post) => {
                    const postAccounts = getPostAccounts(post);
                    const timeStr = formatTimeSafe(
                      post.scheduledFor || post.publishedAt || post.createdAt,
                      '12:00 PM'
                    );
                    const hasMedia = post.media && post.media.length > 0;
                    const mediaItem = hasMedia ? post.media[0] : null;
                    const isExpanded = !!expandedContentIds[post.id];
                    const isLongContent = post.content.length > 180;
                    const analytics = getAggregatedMetrics(post);
                    const isPostRefreshing = refreshingPostId === post.id || isRefreshingAll;

                    return (
                      <div key={post.id} className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2 sm:gap-4 md:gap-6">
                        {/* Left Time Column (Horizontal status bar on mobile, vertical timestamp on sm+) */}
                        <div className="w-full sm:w-24 md:w-28 shrink-0 pt-0 sm:pt-2 flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1.5 sm:space-y-1">
                          <div className="text-xs md:text-sm font-bold text-gray-900 tracking-tight">
                            {timeStr}
                          </div>
                          <div className="text-[10px] text-gray-400 flex items-center justify-end space-x-1">
                            {post.status === 'scheduled' ? (
                              <span className="text-sky-600 font-semibold flex items-center space-x-0.5">
                                <Clock className="w-2.5 h-2.5 inline" />
                                <span>Scheduled</span>
                              </span>
                            ) : post.status === 'published' ? (
                              <span className="text-emerald-600 font-semibold flex items-center space-x-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5 inline" />
                                <span>Live</span>
                              </span>
                            ) : post.status === 'failed' ? (
                              <span className="text-rose-600 font-semibold flex items-center space-x-0.5">
                                <AlertTriangle className="w-2.5 h-2.5 inline" />
                                <span>Failed</span>
                              </span>
                            ) : (
                              <span className="text-gray-500 font-semibold">Draft</span>
                            )}
                          </div>

                          {/* Dynamic Relative Creation Timestamp */}
                          <div
                            className="hidden sm:flex text-[10px] text-gray-500 font-medium hover:text-gray-900 transition-colors cursor-help pt-1 items-center justify-end space-x-1"
                            title={`Database Creation Time: ${formatDateTimeWithSeconds(post.createdAt)}`}
                          >
                            <Clock className="w-2.5 h-2.5 text-gray-400 shrink-0" />
                            <span className="truncate">{formatCreationRelativeTime(post.createdAt)}</span>
                          </div>
                        </div>

                        {/* Right Post Card */}
                        <div className="flex-1 min-w-0 bg-white border border-gray-200/90 rounded-2xl p-4 sm:p-5 shadow-xs text-gray-900 transition-all hover:border-gray-300 space-y-4">
                          {/* Upper Section: Target Platforms List & Status */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
                            {/* All Selected Platforms with individual Status pills */}
                            <div className="flex flex-wrap items-center gap-2">
                              {postAccounts.map((acc) => {
                                const accResult = post.results?.[acc.id] || post.results?.[acc.platform];
                                const isAccSuccess = accResult?.status === 'success' || (post.status === 'published' && !accResult);
                                const isAccFailed = accResult?.status === 'failed' || (post.status === 'failed' && accResult?.errorMessage);

                                return (
                                  <div
                                    key={acc.id}
                                    className="flex items-center space-x-2 bg-gray-50/80 border border-gray-200/80 rounded-xl px-2.5 py-1"
                                  >
                                    <div className="relative">
                                      <img
                                        src={acc.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200'}
                                        alt={acc.displayName}
                                        className="w-5 h-5 rounded-md object-cover border border-gray-200"
                                      />
                                      <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-white flex items-center justify-center shadow-xs">
                                        <PlatformLogo platform={acc.platform} className="w-2 h-2" />
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-1.5 text-xs">
                                      <span className="font-semibold text-gray-800">
                                        {acc.displayName || acc.username}
                                      </span>

                                      {/* Platform Individual Status Pill */}
                                      {post.status === 'published' && isAccSuccess && (
                                        <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md">
                                          ✓ Live
                                        </span>
                                      )}
                                      {post.status === 'scheduled' && (
                                        <span className="inline-flex items-center text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded-md">
                                          ⏱ Scheduled
                                        </span>
                                      )}
                                      {(() => {
                                        const isYtAssist = isYouTubeCommunityIssue(acc, accResult);
                                        if (isYtAssist) {
                                          return (
                                            <span
                                              className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-md border border-amber-200/60"
                                              title="Assisted YouTube Community Post ready"
                                            >
                                              ℹ Community Post Ready
                                            </span>
                                          );
                                        }
                                        if (isAccFailed) {
                                          return (
                                            <span
                                              className="inline-flex items-center text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded-md"
                                              title={accResult?.errorMessage || 'Platform publishing failed'}
                                            >
                                              ✕ Failed
                                            </span>
                                          );
                                        }
                                        return null;
                                      })()}
                                      {post.status === 'draft' && (
                                        <span className="inline-flex items-center text-[10px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.2 rounded-md">
                                          Draft
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* View Details Pill Button */}
                            <button
                              onClick={() => setSelectedPostForDetails(post)}
                              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1 cursor-pointer"
                            >
                              <Info className="w-3.5 h-3.5" />
                              <span>View Details</span>
                            </button>
                          </div>

                          {/* Middle Section: Caption & Media Preview */}
                          <div className="flex flex-col-reverse sm:flex-row items-start justify-between gap-4">
                            <div className="flex-1 min-w-0 w-full">
                              <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed break-words font-normal">
                                {isLongContent && !isExpanded
                                  ? `${post.content.slice(0, 180)}...`
                                  : post.content}
                              </p>

                              {isLongContent && (
                                <button
                                  onClick={() => toggleContentExpansion(post.id)}
                                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 mt-1 cursor-pointer"
                                >
                                  {isExpanded ? 'Show less' : 'Show more'}
                                </button>
                              )}

                              {/* Tags */}
                              {post.tags && post.tags.length > 0 && (
                                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                  <Tag className="w-3 h-3 text-gray-400" />
                                  {post.tags.map((t) => (
                                    <span
                                      key={t}
                                      className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-medium"
                                    >
                                      #{t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Right Media Preview (Full width banner on mobile, thumbnail on sm+) */}
                            {mediaItem && (
                              <div
                                onClick={() => setSelectedPostForDetails(post)}
                                className="relative w-full sm:w-28 sm:h-28 md:w-32 md:h-32 h-44 sm:h-auto rounded-xl overflow-hidden shrink-0 border border-gray-200 bg-gray-50 cursor-pointer group shadow-2xs"
                              >
                                {mediaItem.type === 'video' ? (
                                  <div className="w-full h-full relative">
                                    <video src={mediaItem.url} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white">
                                      <Play className="w-6 h-6 fill-white" />
                                    </div>
                                  </div>
                                ) : (
                                  <img
                                    src={mediaItem.thumbnailUrl || mediaItem.url}
                                    alt="Post media thumbnail"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                )}
                                {post.media.length > 1 && (
                                  <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                    +{post.media.length - 1}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Assisted YouTube Community Post Notification */}
                          {postAccounts.some((acc) =>
                            isYouTubeCommunityIssue(acc, post.results?.[acc.id] || post.results?.[acc.platform])
                          ) && (
                            <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                              <div className="font-bold flex items-center space-x-1.5 text-amber-950">
                                <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>YouTube Community Image Post Ready</span>
                              </div>
                              <p className="text-[11px] text-amber-800 leading-relaxed">
                                Official YouTube Data API v3 does not permit direct third-party publishing for Community tab image posts. Use the <strong>&quot;Publish to YouTube Community ↗&quot;</strong> button below to copy your caption and open your channel&apos;s Community tab directly.
                              </p>
                            </div>
                          )}

                          {/* Failure Error Alert (if any platform failed with an unexpected error) */}
                          {postAccounts.some((acc) => {
                            const r = post.results?.[acc.id] || post.results?.[acc.platform];
                            return r?.status === 'failed' && !isYouTubeCommunityIssue(acc, r);
                          }) && (
                            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 space-y-1">
                              <div className="font-bold flex items-center space-x-1.5 text-rose-900">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Publishing Alert</span>
                              </div>
                              {postAccounts
                                .filter((acc) => {
                                  const r = post.results?.[acc.id] || post.results?.[acc.platform];
                                  return r?.status === 'failed' && !isYouTubeCommunityIssue(acc, r);
                                })
                                .map((acc) => {
                                  const r = post.results?.[acc.id] || post.results?.[acc.platform];
                                  return (
                                    <div key={acc.id} className="text-[11px] text-rose-700">
                                      • {acc.displayName || acc.username}: {r?.errorMessage || 'Unknown error'}
                                    </div>
                                  );
                                })}
                            </div>
                          )}

                          {/* Real-Time Social Media Analytics Bar (Official APIs) */}
                          {post.status === 'published' && (
                            <div className="bg-slate-50/90 border border-slate-200/90 rounded-xl p-3.5 space-y-2.5">
                              {/* Analytics Header */}
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center space-x-2">
                                  <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="font-bold text-gray-800">Official Social Analytics</span>
                                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-semibold border border-emerald-200/60 flex items-center space-x-1">
                                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                    <span>Verified</span>
                                  </span>
                                </div>

                                <div className="flex items-center space-x-2">
                                  {analytics.lastFetchedAt ? (
                                    <span
                                      className="text-[11px] text-gray-500 font-medium"
                                      title={`Last verified via official API: ${new Date(analytics.lastFetchedAt).toLocaleString()}`}
                                    >
                                      Updated {formatRelativeTime(analytics.lastFetchedAt)}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-gray-400">Click to fetch live</span>
                                  )}

                                  <button
                                    onClick={() => handleRefreshSinglePost(post)}
                                    disabled={isPostRefreshing}
                                    className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-gray-200 disabled:opacity-40"
                                    title="Fetch fresh real-time analytics from official platform APIs"
                                  >
                                    <RefreshCw className={`w-3 h-3 ${isPostRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
                                  </button>
                                </div>
                              </div>

                              {/* Metric Cards Grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                                {/* Views */}
                                <div className="bg-white border border-gray-200/80 rounded-xl p-2.5 shadow-2xs">
                                  <div className="flex items-center space-x-1 text-[11px] font-medium text-gray-500 mb-1">
                                    <Eye className="w-3 h-3 text-sky-500" />
                                    <span>Views</span>
                                  </div>
                                  <div className="text-sm font-bold text-gray-900">
                                    {analytics.totalViews !== null ? (
                                      analytics.totalViews.toLocaleString()
                                    ) : (
                                      <span
                                        className="text-[11px] text-gray-400 font-normal italic"
                                        title="Platform does not expose public view count for this post format"
                                      >
                                        Not available
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Impressions / Reach */}
                                <div className="bg-white border border-gray-200/80 rounded-xl p-2.5 shadow-2xs">
                                  <div className="flex items-center space-x-1 text-[11px] font-medium text-gray-500 mb-1">
                                    <TrendingUp className="w-3 h-3 text-indigo-500" />
                                    <span>Impressions</span>
                                  </div>
                                  <div className="text-sm font-bold text-gray-900">
                                    {analytics.totalImpressions !== null ? (
                                      analytics.totalImpressions.toLocaleString()
                                    ) : analytics.totalReach !== null ? (
                                      <span>
                                        {analytics.totalReach.toLocaleString()}{' '}
                                        <span className="text-[10px] font-normal text-gray-400">(Reach)</span>
                                      </span>
                                    ) : (
                                      <span
                                        className="text-[11px] text-gray-400 font-normal italic"
                                        title="Impressions metric requires specific page insights permission"
                                      >
                                        Not available
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Likes */}
                                <div className="bg-white border border-gray-200/80 rounded-xl p-2.5 shadow-2xs">
                                  <div className="flex items-center space-x-1 text-[11px] font-medium text-gray-500 mb-1">
                                    <Heart className="w-3 h-3 text-rose-500" />
                                    <span>Likes</span>
                                  </div>
                                  <div className="text-sm font-bold text-gray-900">
                                    {analytics.totalLikes.toLocaleString()}
                                  </div>
                                </div>

                                {/* Comments */}
                                <div className="bg-white border border-gray-200/80 rounded-xl p-2.5 shadow-2xs">
                                  <div className="flex items-center space-x-1 text-[11px] font-medium text-gray-500 mb-1">
                                    <MessageCircle className="w-3 h-3 text-amber-500" />
                                    <span>Comments</span>
                                  </div>
                                  <div className="text-sm font-bold text-gray-900">
                                    {analytics.totalComments.toLocaleString()}
                                  </div>
                                </div>

                                {/* Shares */}
                                <div className="bg-white border border-gray-200/80 rounded-xl p-2.5 shadow-2xs">
                                  <div className="flex items-center space-x-1 text-[11px] font-medium text-gray-500 mb-1">
                                    <Share2 className="w-3 h-3 text-emerald-500" />
                                    <span>Shares</span>
                                  </div>
                                  <div className="text-sm font-bold text-gray-900">
                                    {analytics.totalShares !== null ? (
                                      analytics.totalShares.toLocaleString()
                                    ) : (
                                      <span
                                        className="text-[11px] text-gray-400 font-normal italic"
                                        title="Platform does not expose share counts publicly"
                                      >
                                        Not available
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Engagement Rate / Interactions */}
                                <div className="bg-white border border-gray-200/80 rounded-xl p-2.5 shadow-2xs">
                                  <div className="flex items-center space-x-1 text-[11px] font-medium text-gray-500 mb-1">
                                    <Sparkles className="w-3 h-3 text-purple-500" />
                                    <span>Engagement</span>
                                  </div>
                                  <div className="text-sm font-bold text-gray-900">
                                    {analytics.totalViews && analytics.totalViews > 0 ? (
                                      <span>
                                        {(((analytics.totalLikes + analytics.totalComments + (analytics.totalShares || 0)) / analytics.totalViews) * 100).toFixed(1)}%
                                      </span>
                                    ) : (analytics.totalLikes + analytics.totalComments + (analytics.totalShares || 0)) > 0 ? (
                                      <span>
                                        {(analytics.totalLikes + analytics.totalComments + (analytics.totalShares || 0)).toLocaleString()}{' '}
                                        <span className="text-[10px] font-normal text-gray-400">(Actions)</span>
                                      </span>
                                    ) : (
                                      <span
                                        className="text-[11px] text-gray-400 font-normal italic"
                                        title="Real-time verified engagement actions"
                                      >
                                        0%
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Per-Platform Live Breakdown Pills */}
                              {analytics.destinations.length > 0 && (
                                <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                                  <span className="text-gray-400 font-medium">Breakdown:</span>
                                  {analytics.destinations.map((dest) => (
                                    <div
                                      key={`${dest.platform}_${dest.externalPostId}`}
                                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-700 shadow-2xs"
                                    >
                                      <PlatformLogo platform={dest.platform} className="w-3 h-3" />
                                      <span className="capitalize font-semibold">{dest.platform}:</span>
                                      <span>
                                        {dest.views !== null && dest.views !== undefined ? `${dest.views} views · ` : ''}
                                        {dest.reach !== null && dest.reach !== undefined ? `${dest.reach} reach · ` : ''}
                                        {dest.likes ?? 0} likes · {dest.comments ?? 0} comments
                                      </span>
                                      {dest.fetchStatus === 'permission_error' && (
                                        <span className="text-amber-600 font-medium ml-0.5" title={dest.errorMessage || 'Permission restricted'}>
                                          ⚠️
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Bottom Action Footer */}
                          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="text-gray-500 flex flex-wrap items-center gap-3">
                              {post.scheduledFor && (
                                <span className="flex items-center space-x-1 font-medium">
                                  <Clock className="w-3.5 h-3.5 text-sky-500" />
                                  <span>
                                    Scheduled: {formatDateTimeWithSeconds(post.scheduledFor)}
                                  </span>
                                </span>
                              )}
                              {post.publishedAt && (
                                <span className="flex items-center space-x-1 font-medium text-emerald-700">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>Published: {formatDateTimeWithSeconds(post.publishedAt)}</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-2">
                              {/* Publish Now */}
                              {post.status === 'scheduled' && (
                                <button
                                  onClick={() => onPublishNow(post)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Publish Now</span>
                                </button>
                              )}

                              {/* Retry Failed (for completely failed posts or unexpected failures) */}
                              {(post.status === 'failed' ||
                                (post.status === 'published' &&
                                  postAccounts.some((a) => {
                                    const r = post.results?.[a.id] || post.results?.[a.platform];
                                    return r?.status === 'failed' && !isYouTubeCommunityIssue(a, r);
                                  }))) && (
                                <button
                                  onClick={() => onRetryPost(post)}
                                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                                  title="Retry only the failed destinations with strict idempotency"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Retry Failed</span>
                                </button>
                              )}

                              {/* 1-Click Assisted YouTube Community Publisher Button */}
                              {postAccounts
                                .filter((acc) => {
                                  const res = post.results?.[acc.id] || post.results?.[acc.platform];
                                  return isYouTubeCommunityIssue(acc, res);
                                })
                                .map((acc) => {
                                  const res = post.results?.[acc.id] || post.results?.[acc.platform];
                                  const liveUrl = getPlatformDestinationUrl(acc, res);
                                  return (
                                    <button
                                      key={`yt-comm-${acc.id}`}
                                      onClick={() => {
                                        if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                          navigator.clipboard.writeText(post.content || '');
                                        }
                                        alert('Post caption copied to clipboard! Opening your channel\'s YouTube Community tab in a new tab.');
                                        window.open(liveUrl, '_blank');
                                      }}
                                      className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                                      title="Copy caption and open YouTube Community tab to finalize post"
                                    >
                                      <PlatformLogo platform="youtube" className="w-3.5 h-3.5" />
                                      <span>Publish to YouTube Community ↗</span>
                                    </button>
                                  );
                                })}

                              {/* Per-Platform Live Links (strictly to successful destinations and correct platforms) */}
                              {postAccounts
                                .filter((acc) => {
                                  const res = post.results?.[acc.id] || post.results?.[acc.platform];
                                  if (isYouTubeCommunityIssue(acc, res)) {
                                    return false; // Dedicated YouTube Community button shown above
                                  }
                                  return (
                                    res?.status === 'success' ||
                                    (post.status === 'published' && (!res || res.status !== 'failed'))
                                  );
                                })
                                .map((acc) => {
                                  const res = post.results?.[acc.id] || post.results?.[acc.platform];
                                  const liveUrl = getPlatformDestinationUrl(acc, res);

                                  return (
                                    <a
                                      key={acc.id}
                                      href={liveUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-2.5 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-gray-200/80 shadow-2xs"
                                    >
                                      <PlatformLogo platform={acc.platform} className="w-3 h-3" />
                                      <span>Go to {acc.platform} ↗</span>
                                    </a>
                                  );
                                })}

                              {/* Dropdown Menu (Edit, Duplicate, Delete) */}
                              <div
                                className="relative"
                                ref={menuOpenPostId === post.id ? activeMenuRef : undefined}
                              >
                                <button
                                  onClick={() =>
                                    setMenuOpenPostId(menuOpenPostId === post.id ? null : post.id)
                                  }
                                  className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors border border-gray-200 cursor-pointer"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {menuOpenPostId === post.id && (
                                  <div className="absolute right-0 bottom-full mb-1 w-40 bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-50 text-xs">
                                    <button
                                      onClick={() => {
                                        setSelectedPostForDetails(post);
                                        setMenuOpenPostId(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-700 flex items-center space-x-2 cursor-pointer"
                                    >
                                      <Info className="w-3.5 h-3.5 text-gray-500" />
                                      <span>View Full Details</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        onEditPost(post);
                                        setMenuOpenPostId(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-700 flex items-center space-x-2 cursor-pointer"
                                    >
                                      <FileEdit className="w-3.5 h-3.5 text-gray-500" />
                                      <span>Edit Post</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleDuplicatePost(post);
                                        setMenuOpenPostId(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-700 flex items-center space-x-2 cursor-pointer"
                                    >
                                      <Copy className="w-3.5 h-3.5 text-gray-500" />
                                      <span>Duplicate Draft</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        onDeletePost(post.id);
                                        setMenuOpenPostId(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center space-x-2 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Comprehensive Post Details Modal */}
        {selectedPostForDetails && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedPostForDetails(null);
            }}
          >
            <div
              ref={detailsModalRef}
              className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 text-gray-900 max-h-[90vh] overflow-y-auto space-y-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center space-x-2">
                  <span className="text-base font-bold text-gray-900">Post Publishing Details</span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      selectedPostForDetails.status === 'published'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : selectedPostForDetails.status === 'scheduled'
                        ? 'bg-sky-50 text-sky-700 border border-sky-200'
                        : selectedPostForDetails.status === 'failed'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {selectedPostForDetails.status.toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedPostForDetails(null)}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Media Preview (if any) */}
              {selectedPostForDetails.media && selectedPostForDetails.media.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Attached Media
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedPostForDetails.media.map((m, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 max-h-56 flex items-center justify-center"
                      >
                        {m.type === 'video' ? (
                          <video src={m.url} controls className="w-full h-full object-cover" />
                        ) : (
                          <img
                            src={m.thumbnailUrl || m.url}
                            alt={m.name || 'Post attachment'}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Caption */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Post Caption
                </label>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs md:text-sm text-gray-800 leading-relaxed whitespace-pre-line font-normal">
                  {selectedPostForDetails.content}
                </div>
              </div>

              {/* Timing & Creation Metadata Section (Creation Time kept strictly separate from scheduled & published) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                {/* 1. Creation Time */}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    Creation Time
                  </span>
                  <div
                    className="font-semibold text-gray-800 flex items-center space-x-1.5 cursor-help"
                    title={`Database Creation Time: ${formatDateTimeWithSeconds(selectedPostForDetails.createdAt)}`}
                  >
                    <Clock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span className="truncate">{formatCreationRelativeTime(selectedPostForDetails.createdAt)}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 block truncate">
                    {formatDateTimeWithSeconds(selectedPostForDetails.createdAt)}
                  </span>
                </div>

                {/* 2. Scheduled Time */}
                {selectedPostForDetails.scheduledFor ? (
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Intended Scheduled Time
                    </span>
                    <span className="font-semibold text-sky-900 flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span className="truncate">{formatDateTimeWithSeconds(selectedPostForDetails.scheduledFor)}</span>
                    </span>
                  </div>
                ) : (
                  <div className="space-y-0.5 opacity-60">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Scheduled Time</span>
                    <span className="text-gray-500 text-[11px]">—</span>
                  </div>
                )}

                {/* 3. Published Time */}
                {selectedPostForDetails.publishedAt ? (
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Actual Publishing Time
                    </span>
                    <span className="font-semibold text-emerald-700 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{formatDateTimeWithSeconds(selectedPostForDetails.publishedAt)}</span>
                    </span>
                  </div>
                ) : (
                  <div className="space-y-0.5 opacity-60">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Publishing Time</span>
                    <span className="text-gray-500 text-[11px]">Not published yet</span>
                  </div>
                )}
              </div>

              {/* Real-Time Platform Analytics Detailed Card */}
              {selectedPostForDetails.status === 'published' && (() => {
                const analytics = getAggregatedMetrics(selectedPostForDetails);
                const isPostRefreshing = refreshingPostId === selectedPostForDetails.id || isRefreshingAll;

                return (
                  <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-gray-900">
                          Official Platform Analytics &amp; Engagement
                        </span>
                      </div>

                      <button
                        onClick={() => handleRefreshSinglePost(selectedPostForDetails)}
                        disabled={isPostRefreshing}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1 cursor-pointer disabled:opacity-40"
                      >
                        <RefreshCw className={`w-3 h-3 ${isPostRefreshing ? 'animate-spin' : ''}`} />
                        <span>{isPostRefreshing ? 'Fetching...' : 'Refresh Now'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
                        <span className="text-[11px] text-gray-500 block mb-1">Total Views</span>
                        <span className="text-base font-bold text-gray-900">
                          {analytics.totalViews !== null ? analytics.totalViews.toLocaleString() : (
                            <span className="text-xs text-gray-400 font-normal italic">N/A</span>
                          )}
                        </span>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
                        <span className="text-[11px] text-gray-500 block mb-1">Impressions / Reach</span>
                        <span className="text-base font-bold text-gray-900">
                          {analytics.totalImpressions !== null ? analytics.totalImpressions.toLocaleString() : analytics.totalReach !== null ? `${analytics.totalReach.toLocaleString()}` : (
                            <span className="text-xs text-gray-400 font-normal italic">N/A</span>
                          )}
                        </span>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
                        <span className="text-[11px] text-gray-500 block mb-1">Total Likes</span>
                        <span className="text-base font-bold text-gray-900">
                          {analytics.totalLikes.toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
                        <span className="text-[11px] text-gray-500 block mb-1">Total Comments</span>
                        <span className="text-base font-bold text-gray-900">
                          {analytics.totalComments.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {analytics.lastFetchedAt && (
                      <div className="text-[10px] text-gray-400">
                        Last verified with official API: {new Date(analytics.lastFetchedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Per-Platform Results Breakdown */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Multi-Platform Publishing Destination Breakdown
                </label>
                <div className="space-y-2.5">
                  {getPostAccounts(selectedPostForDetails).map((acc) => {
                    const res =
                      selectedPostForDetails.results?.[acc.id] ||
                      selectedPostForDetails.results?.[acc.platform];
                    const isSuccess =
                      res?.status === 'success' ||
                      (selectedPostForDetails.status === 'published' && !res?.errorMessage);
                    const isFailed = res?.status === 'failed';
                    const postMetrics = res?.analytics || selectedPostForDetails.analytics?.[acc.id];

                    return (
                      <div
                        key={acc.id}
                        className="p-3.5 rounded-xl border border-gray-200 bg-white shadow-2xs space-y-2.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <img
                                src={acc.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200'}
                                alt={acc.displayName}
                                className="w-9 h-9 rounded-lg object-cover border border-gray-200"
                              />
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-xs">
                                <PlatformLogo platform={acc.platform} className="w-2.5 h-2.5" />
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-bold text-gray-900 flex items-center space-x-1.5">
                                <span>{acc.displayName}</span>
                                <span className="text-[10px] text-gray-400 capitalize">
                                  ({acc.platform})
                                </span>
                              </div>
                              <div className="text-[11px] text-gray-500">
                                @{acc.username}
                              </div>
                              {isFailed && res?.errorMessage && (
                                <div className="text-[11px] text-rose-600 font-medium mt-0.5 max-w-sm">
                                  {res.errorMessage}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Status & Link */}
                          <div className="flex items-center space-x-2">
                            {isSuccess && (
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center space-x-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Published Successfully</span>
                              </span>
                            )}
                            {isFailed && (
                              <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 flex items-center space-x-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Publication Failed</span>
                              </span>
                            )}
                            {selectedPostForDetails.status === 'scheduled' && (
                              <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 flex items-center space-x-1">
                                <Clock className="w-3.5 h-3.5 text-sky-600" />
                                <span>Scheduled</span>
                              </span>
                            )}

                            {/* Live link to official destination if successful */}
                            {isSuccess && (
                              <a
                                href={getPlatformDestinationUrl(acc, res)}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-emerald-700 transition-colors"
                                title={`Open on ${acc.platform}`}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Per-Platform Specific Metrics */}
                        {postMetrics && isSuccess && (
                          <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center gap-3 text-xs bg-gray-50/70 p-2.5 rounded-lg">
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                              Live Stats:
                            </span>
                            {postMetrics.views !== null && postMetrics.views !== undefined && (
                              <span className="font-semibold text-gray-800">
                                👁️ {postMetrics.views.toLocaleString()} views
                              </span>
                            )}
                            {postMetrics.reach !== null && postMetrics.reach !== undefined && (
                              <span className="font-semibold text-gray-800">
                                📈 {postMetrics.reach.toLocaleString()} reach
                              </span>
                            )}
                            <span className="font-semibold text-gray-800">
                              ❤️ {postMetrics.likes ?? 0} likes
                            </span>
                            <span className="font-semibold text-gray-800">
                              💬 {postMetrics.comments ?? 0} comments
                            </span>
                            {postMetrics.shares !== null && postMetrics.shares !== undefined && (
                              <span className="font-semibold text-gray-800">
                                🔄 {postMetrics.shares} shares
                              </span>
                            )}
                            {postMetrics.externalPostId && (
                              <span className="text-[10px] text-gray-400 font-mono ml-auto">
                                ID: {postMetrics.externalPostId}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Close Button Footer */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
                <button
                  onClick={() => setSelectedPostForDetails(null)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
