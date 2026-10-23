'use client';

import React, { useState, useMemo } from 'react';
import { Post, SocialAccount, PostStatus, SocialPlatform } from '@/types/social';
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
} from 'lucide-react';
import { format } from 'date-fns';
import { parseDateSafe, isSameCalendarDay, formatTimeSafe, formatDateFullSafe } from '@/lib/dateUtils';

interface PostsManagerProps {
  posts: Post[];
  accounts: SocialAccount[];
  initialStatusFilter?: PostStatus | 'all';
  onEditPost: (post: Post) => void;
  onDeletePost: (id: string) => void;
  onPublishNow: (post: Post) => void;
  onRetryPost: (post: Post) => void;
  openCreateModal: () => void;
}

export const PostsManager: React.FC<PostsManagerProps> = ({
  posts,
  accounts,
  initialStatusFilter = 'all',
  onEditPost,
  onDeletePost,
  onPublishNow,
  onRetryPost,
  openCreateModal,
}) => {
  const [activeTab, setActiveTab] = useState<PostStatus | 'all'>(initialStatusFilter);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedPostForDetails, setSelectedPostForDetails] = useState<Post | null>(null);
  const [menuOpenPostId, setMenuOpenPostId] = useState<string | null>(null);
  const [expandedContentIds, setExpandedContentIds] = useState<Record<string, boolean>>({});

  // Calculate live counts for the status navigation bar
  const counts = useMemo(() => {
    return {
      all: posts.length,
      published: posts.filter((p) => p.status === 'published').length,
      scheduled: posts.filter((p) => p.status === 'scheduled').length,
      draft: posts.filter((p) => p.status === 'draft').length,
      failed: posts.filter((p) => p.status === 'failed').length,
    };
  }, [posts]);

  // Filtered & sorted posts
  const filteredPosts = useMemo(() => {
    return posts
      .filter((post) => {
        // Status filter
        if (activeTab !== 'all' && post.status !== activeTab) {
          return false;
        }

        // Platform filter
        if (platformFilter !== 'all') {
          const targetAccounts = accounts.filter((a) => post.targetAccountIds.includes(a.id));
          const matchesPlatform = targetAccounts.some((a) => a.platform === platformFilter);
          if (!matchesPlatform) return false;
        }

        // Search filter
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchesContent = post.content.toLowerCase().includes(term);
          const matchesTags = (post.tags || []).some((t) => t.toLowerCase().includes(term));
          const targetAccounts = accounts.filter((a) => post.targetAccountIds.includes(a.id));
          const matchesAccount = targetAccounts.some(
            (a) =>
              a.displayName.toLowerCase().includes(term) ||
              a.username.toLowerCase().includes(term)
          );
          if (!matchesContent && !matchesTags && !matchesAccount) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.scheduledFor || a.publishedAt || a.createdAt).getTime();
        const timeB = new Date(b.scheduledFor || b.publishedAt || b.createdAt).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [posts, accounts, activeTab, platformFilter, searchTerm, sortOrder]);

  // Group posts by readable date heading
  const groupedPosts = useMemo(() => {
    const groups: { [key: string]: Post[] } = {};
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    filteredPosts.forEach((post) => {
      const rawDate = post.scheduledFor || post.publishedAt || post.createdAt;
      const parsed = parseDateSafe(rawDate);
      let key = 'Upcoming';

      if (parsed) {
        if (isSameCalendarDay(parsed, today)) {
          key = `Today, ${format(parsed, 'MMMM d')}`;
        } else if (isSameCalendarDay(parsed, yesterday)) {
          key = `Yesterday, ${format(parsed, 'MMMM d')}`;
        } else if (isSameCalendarDay(parsed, tomorrow)) {
          key = `Tomorrow, ${format(parsed, 'MMMM d')}`;
        } else {
          key = format(parsed, 'EEEE, MMMM d, yyyy');
        }
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(post);
    });

    return groups;
  }, [filteredPosts]);

  // Helper to get all accounts targeted by this post
  const getPostAccounts = (post: Post): SocialAccount[] => {
    const matched = accounts.filter((a) => post.targetAccountIds.includes(a.id));
    if (matched.length > 0) return matched;
    // Fallback if account was disconnected or deleted
    return accounts.slice(0, 1);
  };

  // Helper to duplicate a post into a new draft
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
    <div className="min-h-full bg-slate-50/60 text-gray-900 p-6 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Posts Management</h1>
            <p className="text-xs text-gray-500 mt-1">
              Publish, schedule, and track unified multi-platform social updates.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="self-start sm:self-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-xl text-xs shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <span>+ Create Post</span>
          </button>
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
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Platform Filter */}
            <div className="relative">
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value as any)}
                className="text-xs bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700 font-medium shadow-2xs focus:outline-hidden focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">All Platforms</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
                <option value="twitter">X (Twitter)</option>
              </select>
            </div>

            {/* Sort Toggle */}
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs transition-colors cursor-pointer"
              title="Toggle date sort order"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
              <span>{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
            </button>
          </div>
        </div>

        {/* Empty State */}
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

                    return (
                      <div key={post.id} className="flex items-start gap-4 md:gap-6">
                        {/* Left Time Column */}
                        <div className="w-20 md:w-24 shrink-0 pt-2 text-right">
                          <div className="text-xs md:text-sm font-bold text-gray-900 tracking-tight">
                            {timeStr}
                          </div>
                          <div className="text-[10px] text-gray-400 flex items-center justify-end space-x-1 mt-0.5">
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
                        </div>

                        {/* Right Post Card */}
                        <div className="flex-1 bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs text-gray-900 transition-all hover:border-gray-300 space-y-4">
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
                                      {isAccFailed && (
                                        <span
                                          className="inline-flex items-center text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded-md"
                                          title={accResult?.errorMessage || 'Platform publishing failed'}
                                        >
                                          ✕ Failed
                                        </span>
                                      )}
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
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
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

                            {/* Right Media Preview */}
                            {mediaItem && (
                              <div
                                onClick={() => setSelectedPostForDetails(post)}
                                className="relative w-28 h-28 md:w-32 md:h-32 rounded-xl overflow-hidden shrink-0 border border-gray-200 bg-gray-50 cursor-pointer group shadow-2xs"
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

                          {/* Failure Error Alert (if any platform failed) */}
                          {post.results &&
                            Object.entries(post.results).some(([, r]) => r.status === 'failed') && (
                              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 space-y-1">
                                <div className="font-bold flex items-center space-x-1.5 text-rose-900">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Publishing Alert</span>
                                </div>
                                {Object.entries(post.results)
                                  .filter(([, r]) => r.status === 'failed')
                                  .map(([accId, r]) => {
                                    const acc = accounts.find((a) => a.id === accId);
                                    return (
                                      <div key={accId} className="text-[11px] text-rose-700">
                                        • {acc?.displayName || 'Account'}: {r.errorMessage || 'Unknown error'}
                                      </div>
                                    );
                                  })}
                              </div>
                            )}

                          {/* Bottom Action Footer */}
                          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="text-gray-500 flex items-center space-x-2">
                              {post.scheduledFor && (
                                <span className="flex items-center space-x-1">
                                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                                  <span>
                                    Scheduled: {formatDateFullSafe(post.scheduledFor)} at{' '}
                                    {formatTimeSafe(post.scheduledFor)}
                                  </span>
                                </span>
                              )}
                              {post.publishedAt && !post.scheduledFor && (
                                <span className="flex items-center space-x-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>Published: {formatDateFullSafe(post.publishedAt)}</span>
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

                              {/* Retry Failed */}
                              {post.status === 'failed' && (
                                <button
                                  onClick={() => onRetryPost(post)}
                                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Retry</span>
                                </button>
                              )}

                              {/* Per-Platform Live Links */}
                              {post.status === 'published' &&
                                postAccounts.map((acc) => {
                                  const res = post.results?.[acc.id] || post.results?.[acc.platform];
                                  const liveUrl =
                                    res?.externalPostUrl ||
                                    (acc.platform === 'facebook'
                                      ? `https://www.facebook.com/${acc.pageId || '868941086292404'}`
                                      : 'https://instagram.com');

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
                              <div className="relative">
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
                                      className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-700 flex items-center space-x-2"
                                    >
                                      <Info className="w-3.5 h-3.5 text-gray-500" />
                                      <span>View Full Details</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        onEditPost(post);
                                        setMenuOpenPostId(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-700 flex items-center space-x-2"
                                    >
                                      <FileEdit className="w-3.5 h-3.5 text-gray-500" />
                                      <span>Edit Post</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleDuplicatePost(post);
                                        setMenuOpenPostId(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-700 flex items-center space-x-2"
                                    >
                                      <Copy className="w-3.5 h-3.5 text-gray-500" />
                                      <span>Duplicate Draft</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        onDeletePost(post.id);
                                        setMenuOpenPostId(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center space-x-2"
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 text-gray-900 max-h-[90vh] overflow-y-auto space-y-6">
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

                    return (
                      <div
                        key={acc.id}
                        className="p-3.5 rounded-xl border border-gray-200 bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <img
                              src={acc.avatarUrl}
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

                          {/* Live link if available */}
                          {res?.externalPostUrl && (
                            <a
                              href={res.externalPostUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-800 transition-colors"
                              title="Open live post"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Raw Execution Results / Meta Logs */}
              {selectedPostForDetails.results &&
                Object.keys(selectedPostForDetails.results).length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Meta API Dispatch Logs
                    </label>
                    <pre className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-[11px] font-mono overflow-x-auto">
                      {JSON.stringify(selectedPostForDetails.results, null, 2)}
                    </pre>
                  </div>
                )}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    onDeletePost(selectedPostForDetails.id);
                    setSelectedPostForDetails(null);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Post</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      onEditPost(selectedPostForDetails);
                      setSelectedPostForDetails(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setSelectedPostForDetails(null)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
