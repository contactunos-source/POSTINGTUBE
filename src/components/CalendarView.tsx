'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useClickOutside } from '@/hooks/useClickOutside';
import { Post, SocialAccount, SocialPlatform, PostStatus } from '@/types/social';
import { PlatformLogo } from './SocialIcons';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Clock,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  X,
  Play,
  ExternalLink,
  ImageIcon,
  Eye,
  GripVertical,
  Filter,
  Layers,
  Globe,
  Tag,
  Film,
  Check,
  CalendarDays,
  List as ListIcon,
  Sparkles,
  RotateCw,
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  addYears,
  subYears,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachMonthOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
} from 'date-fns';
import {
  parseDateSafe,
  isSameCalendarDay,
  postMatchesDay,
  formatTimeSafe,
  formatDateFullSafe,
  formatDateTimeWithSeconds,
  getLocalTimeParts,
  getLocalDateString,
  formatLocalToUtcIso,
  useUserTimezone,
  useUserTimeFormat,
} from '@/lib/dateUtils';
import { TimezoneSelectorModal } from './TimezoneSelectorModal';
import { PostPlatformCaptionsView } from './PostPlatformCaptionsView';

interface CalendarViewProps {
  posts: Post[];
  accounts: SocialAccount[];
  workspaceName?: string;
  onSelectPost: (post: Post) => void;
  onCreateAtDate: (date: Date) => void;
  onReschedulePost?: (postId: string, newScheduledFor: string) => Promise<boolean>;
  openCreateModal?: () => void;
  onNavigateToTab?: (tab: string) => void;
  onRefreshData?: () => Promise<void> | void;
}

export type CalendarViewMode = 'day' | 'week' | 'month' | 'year';

export const CalendarView: React.FC<CalendarViewProps> = ({
  posts,
  accounts,
  workspaceName = 'U NOS Digital marketing',
  onSelectPost,
  onCreateAtDate,
  onReschedulePost,
  openCreateModal,
  onNavigateToTab,
  onRefreshData,
}) => {
  // Navigation & View Mode
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-refresh when CalendarView mounts to ensure 100% backend synchronization
  useEffect(() => {
    if (onRefreshData) {
      onRefreshData();
    }
  }, []);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'scheduled' | 'draft' | 'failed' | 'partially_published'>('all');
  const [platformFilter, setPlatformFilter] = useState<'all' | SocialPlatform>('all');
  const [postTypeFilter, setPostTypeFilter] = useState<'all' | 'post' | 'reel' | 'video' | 'story'>('all');

  // Drawers & Modals
  const [isNoDateDrawerOpen, setIsNoDateDrawerOpen] = useState(false);
  const [selectedDayForModal, setSelectedDayForModal] = useState<Date | null>(null);
  const [inspectedPost, setInspectedPost] = useState<Post | null>(null);

  // Dropdown States
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [isPlatformMenuOpen, setIsPlatformMenuOpen] = useState(false);
  const [isPostTypeMenuOpen, setIsPostTypeMenuOpen] = useState(false);

  // Refs for click outside
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const platformMenuRef = useRef<HTMLDivElement>(null);
  const postTypeMenuRef = useRef<HTMLDivElement>(null);
  const dayModalRef = useRef<HTMLDivElement>(null);
  const postModalRef = useRef<HTMLDivElement>(null);
  const noDateDrawerRef = useRef<HTMLDivElement>(null);

  // Modal helpers with Browser History & Escape Key support
  const openPostModal = (post: Post) => {
    setInspectedPost(post);
    if (typeof window !== 'undefined') {
      window.history.pushState({ calendarModal: 'post' }, '');
    }
  };

  const closePostModal = () => {
    setInspectedPost(null);
    if (typeof window !== 'undefined' && window.history.state?.calendarModal === 'post') {
      window.history.back();
    }
  };

  const openDayModal = (day: Date) => {
    setSelectedDayForModal(day);
    if (typeof window !== 'undefined') {
      window.history.pushState({ calendarModal: 'day' }, '');
    }
  };

  const closeDayModal = () => {
    setSelectedDayForModal(null);
    if (typeof window !== 'undefined' && window.history.state?.calendarModal === 'day') {
      window.history.back();
    }
  };

  useClickOutside(viewMenuRef, () => setIsViewMenuOpen(false), { enabled: isViewMenuOpen });
  useClickOutside(statusMenuRef, () => setIsStatusMenuOpen(false), { enabled: isStatusMenuOpen });
  useClickOutside(platformMenuRef, () => setIsPlatformMenuOpen(false), { enabled: isPlatformMenuOpen });
  useClickOutside(postTypeMenuRef, () => setIsPostTypeMenuOpen(false), { enabled: isPostTypeMenuOpen });
  useClickOutside(dayModalRef, () => closeDayModal(), { enabled: selectedDayForModal !== null });
  useClickOutside(postModalRef, () => closePostModal(), { enabled: inspectedPost !== null });
  useClickOutside(noDateDrawerRef, () => setIsNoDateDrawerOpen(false), { enabled: isNoDateDrawerOpen });

  // Handle Browser Back Navigation for Modals
  useEffect(() => {
    const handlePopState = () => {
      if (inspectedPost) setInspectedPost(null);
      if (selectedDayForModal) setSelectedDayForModal(null);
      if (isNoDateDrawerOpen) setIsNoDateDrawerOpen(false);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [inspectedPost, selectedDayForModal, isNoDateDrawerOpen]);

  // Handle Escape Key to dismiss any active modal, popover, or drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (inspectedPost) {
          closePostModal();
          e.stopPropagation();
        } else if (selectedDayForModal) {
          closeDayModal();
          e.stopPropagation();
        } else if (isNoDateDrawerOpen) {
          setIsNoDateDrawerOpen(false);
          e.stopPropagation();
        } else if (isViewMenuOpen || isStatusMenuOpen || isPlatformMenuOpen || isPostTypeMenuOpen) {
          setIsViewMenuOpen(false);
          setIsStatusMenuOpen(false);
          setIsPlatformMenuOpen(false);
          setIsPostTypeMenuOpen(false);
          e.stopPropagation();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectedPost, selectedDayForModal, isNoDateDrawerOpen, isViewMenuOpen, isStatusMenuOpen, isPlatformMenuOpen, isPostTypeMenuOpen]);

  // Drag and drop state
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [dragOverDayIso, setDragOverDayIso] = useState<string | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Dynamic User Timezone (Auto-detected from browser or user configured)
  const { timeZone, info: tzInfo } = useUserTimezone();
  const { timeFormat, is24Hour } = useUserTimeFormat();
  const [isTimezoneModalOpen, setIsTimezoneModalOpen] = useState(false);

  // Navigation handlers
  const handleNext = () => {
    if (viewMode === 'day') setCurrentDate((d) => addDays(d, 1));
    else if (viewMode === 'week') setCurrentDate((d) => addWeeks(d, 1));
    else if (viewMode === 'month') setCurrentDate((d) => addMonths(d, 1));
    else setCurrentDate((d) => addYears(d, 1));
  };

  const handlePrev = () => {
    if (viewMode === 'day') setCurrentDate((d) => subDays(d, 1));
    else if (viewMode === 'week') setCurrentDate((d) => subWeeks(d, 1));
    else if (viewMode === 'month') setCurrentDate((d) => subMonths(d, 1));
    else setCurrentDate((d) => subYears(d, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Week days interval calculation (Sunday to Saturday as in reference image)
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate]);

  // Month days interval calculation
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  // Year months interval calculation
  const yearMonths = useMemo(() => {
    const yearStart = new Date(currentDate.getFullYear(), 0, 1);
    const yearEnd = new Date(currentDate.getFullYear(), 11, 31);
    return eachMonthOfInterval({ start: yearStart, end: yearEnd });
  }, [currentDate]);

  // Header Title based on view mode
  const headerTitle = useMemo(() => {
    if (viewMode === 'month') {
      return format(currentDate, 'MMMM yyyy');
    } else if (viewMode === 'week') {
      const monthStr = format(weekDays[0], 'MMMM yyyy');
      const endMonthStr = format(weekDays[6], 'MMMM yyyy');
      return monthStr === endMonthStr ? monthStr : `${format(weekDays[0], 'MMM')} - ${format(weekDays[6], 'MMM yyyy')}`;
    } else if (viewMode === 'day') {
      return format(currentDate, 'MMMM d, yyyy');
    } else {
      return format(currentDate, 'yyyy');
    }
  }, [currentDate, viewMode, weekDays]);

  // Filtered posts based on all active filters
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'failed') {
          const isOverallFailed = p.status === 'failed';
          const isPartialFailed = p.status === 'partially_published';
          const hasFailedChannel = Object.values(p.results || {}).some(
            (r: any) => r?.status === 'failed' || r?.status === 'action_required' || r?.error || r?.errorMessage
          );
          if (!isOverallFailed && !isPartialFailed && !hasFailedChannel) return false;
        } else if (statusFilter === 'partially_published') {
          if (p.status !== 'partially_published') return false;
        } else if (p.status !== statusFilter) {
          return false;
        }
      }

      // Platform filter
      if (platformFilter !== 'all') {
        const resultAccIds = Object.keys(p.results || {});
        const allIds = Array.from(new Set([...(p.targetAccountIds || []), ...resultAccIds]));
        const postAccs = accounts.filter((a) => allIds.includes(a.id));
        const hasPlatform = postAccs.some((a) => a.platform === platformFilter);
        if (!hasPlatform) return false;
      }

      // Post type filter
      if (postTypeFilter !== 'all') {
        const type = p.postType || 'post';
        if (type !== postTypeFilter) return false;
      }

      return true;
    });
  }, [posts, statusFilter, platformFilter, postTypeFilter, accounts]);

  // Undated drafts / No Date posts
  const undatedPosts = useMemo(() => {
    return posts.filter((p) => p.status === 'draft' && !p.scheduledFor && !p.publishedAt);
  }, [posts]);

  // Pre-index filtered posts into a localized date map to achieve instant O(1) lookups instead of O(N*logN) repeated 168 times
  const postsByDayMap = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const post of filteredPosts) {
      const dateIso = post.scheduledFor || post.publishedAt || post.createdAt;
      if (!dateIso) continue;
      const dayKey = getLocalDateString(dateIso, timeZone);
      const list = map.get(dayKey) || [];
      list.push(post);
      map.set(dayKey, list);
    }
    map.forEach((list) => {
      list.sort((a, b) => {
        const timeA = a.scheduledFor || a.publishedAt || a.createdAt;
        const timeB = b.scheduledFor || b.publishedAt || b.createdAt;
        const partsA = getLocalTimeParts(timeA, timeZone);
        const partsB = getLocalTimeParts(timeB, timeZone);
        return partsA.hour24 * 60 + partsA.minute - (partsB.hour24 * 60 + partsB.minute);
      });
    });
    return map;
  }, [filteredPosts, timeZone]);

  // Retrieve posts for a specific day sorted chronologically by user's exact local time (O(1) lookup)
  const getPostsForDay = useCallback(
    (day: Date) => {
      const key = getLocalDateString(day, timeZone);
      return postsByDayMap.get(key) || [];
    },
    [postsByDayMap, timeZone]
  );

  // Helper to get accounts targeted by a post
  const getAccountsForPost = (post: Post): SocialAccount[] => {
    const matched = accounts.filter((a) => post.targetAccountIds.includes(a.id));
    return matched.length > 0 ? matched : accounts.slice(0, 1);
  };

  // HTML5 Drag and Drop handlers for Rescheduling
  const handleDragStart = (e: React.DragEvent, post: Post) => {
    if (post.status === 'published') {
      e.preventDefault();
      return;
    }
    setDraggedPostId(post.id);
    e.dataTransfer.setData('text/plain', post.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverDay = (e: React.DragEvent, day: Date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const dayIso = day.toISOString();
    if (dragOverDayIso !== dayIso) {
      setDragOverDayIso(dayIso);
    }
  };

  const handleDragLeaveDay = (day: Date) => {
    if (dragOverDayIso === day.toISOString()) {
      setDragOverDayIso(null);
    }
  };

  const handleDropOnDay = async (e: React.DragEvent, targetDay: Date, targetHour?: number) => {
    e.preventDefault();
    setDragOverDayIso(null);
    const postId = e.dataTransfer.getData('text/plain') || draggedPostId;
    setDraggedPostId(null);

    if (!postId || !onReschedulePost) return;

    const post = posts.find((p) => p.id === postId);
    if (!post || post.status === 'published') return;

    // Extract current local time parts to preserve minutes
    const originalParts = getLocalTimeParts(post.scheduledFor || post.publishedAt || post.createdAt, timeZone);
    const hours = typeof targetHour === 'number' ? targetHour : originalParts.hour24;
    const minutes = originalParts.minute;

    const targetDayStr = getLocalDateString(targetDay, timeZone);
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const newScheduledIso = formatLocalToUtcIso(targetDayStr, `${hh}:${mm}`, timeZone);

    setIsRescheduling(true);
    try {
      await onReschedulePost(post.id, newScheduledIso);
    } finally {
      setIsRescheduling(false);
    }
  };

  // Complete 24-Hour Timeline Slots covering the entire day (12-hour AM/PM or 24-hour 00:00 - 23:00)
  const timeSlots = useMemo(() => {
    return Array.from({ length: 24 }).map((_, hour) => {
      const isPm = hour >= 12;
      let h12 = hour % 12;
      if (h12 === 0) h12 = 12;
      const period = isPm ? 'PM' : 'AM';
      const label = is24Hour
        ? `${String(hour).padStart(2, '0')}:00`
        : `${h12} ${period}`;

      let periodLabel = 'Night';
      let phase: 'night' | 'morning' | 'afternoon' | 'evening' = 'night';

      if (hour === 0) {
        periodLabel = 'Midnight';
        phase = 'night';
      } else if (hour < 4) {
        periodLabel = 'Late Night';
        phase = 'night';
      } else if (hour < 6) {
        periodLabel = 'Early Morning';
        phase = 'morning';
      } else if (hour < 12) {
        periodLabel = 'Morning';
        phase = 'morning';
      } else if (hour === 12) {
        periodLabel = 'Noon';
        phase = 'afternoon';
      } else if (hour < 17) {
        periodLabel = 'Afternoon';
        phase = 'afternoon';
      } else if (hour < 21) {
        periodLabel = 'Evening';
        phase = 'evening';
      } else {
        periodLabel = 'Night';
        phase = 'night';
      }

      return { hour, label, periodLabel, phase };
    });
  }, [is24Hour]);

  // Helper to determine per-account publish status for a post
  const getAccountPublishStatus = (postItem: Post, account: SocialAccount) => {
    if (postItem.status === 'draft') return 'draft';
    if (postItem.status === 'scheduled') return 'scheduled';

    const res = (postItem.results?.[account.id] || postItem.results?.[account.platform]) as any;
    if (res?.status === 'failed' || res?.status === 'action_required' || Boolean(res?.error) || Boolean(res?.errorMessage)) {
      return 'failed';
    }
    if (res?.status === 'success') {
      return 'success';
    }

    if (postItem.status === 'failed') return 'failed';
    if (postItem.status === 'published') return 'success';
    return 'pending';
  };

  // Helper for rendering post card (matches the reference image layout in our clean brand theme)
  const renderPostCard = (post: Post, options: { compact?: boolean; showDragHandle?: boolean } = {}) => {
    const postAccounts = getAccountsForPost(post);
    const localParts = getLocalTimeParts(post.scheduledFor || post.publishedAt || post.createdAt, timeZone);
    const timeStr = localParts.timeStr;
    const media = post.media && post.media.length > 0 ? post.media[0] : null;
    const isDraggable = post.status !== 'published';

    const isVideo =
      media &&
      (media.type === 'video' ||
        /\.(mp4|webm|mov|m4v|avi|mkv)($|\?)/i.test(media.url || '') ||
        /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(media.name || ''));

    let ytThumb: string | null = null;
    if (media && post.results) {
      for (const r of Object.values(post.results)) {
        if (r?.platform === 'youtube' && r.externalPostId && /^[a-zA-Z0-9_-]{11}$/.test(r.externalPostId)) {
          ytThumb = `https://img.youtube.com/vi/${r.externalPostId}/hqdefault.jpg`;
          break;
        }
      }
    }

    const hasRealImageThumb =
      media &&
      Boolean(media.thumbnailUrl) &&
      !/\.(mp4|webm|mov|m4v|avi|mkv)($|\?)/i.test(media.thumbnailUrl || '');

    return (
      <div
        key={post.id}
        draggable={isDraggable}
        onDragStart={(e) => handleDragStart(e, post)}
        onClick={(e) => {
          e.stopPropagation();
          openPostModal(post);
        }}
        className={`group/card bg-white border rounded-2xl p-3 sm:p-3.5 transition-all select-none relative shadow-xs hover:shadow-md cursor-pointer ${
          post.status === 'published'
            ? 'border-emerald-200/90 hover:border-emerald-400'
            : post.status === 'scheduled'
            ? 'border-gray-200/90 hover:border-emerald-500'
            : post.status === 'draft'
            ? 'border-amber-200/90 hover:border-amber-400'
            : post.status === 'partially_published'
            ? 'border-amber-300 hover:border-amber-500 bg-amber-50/15'
            : 'border-rose-200/90 hover:border-rose-400 bg-rose-50/15'
        }`}
      >
        {/* Top Header: Time on left, Account Badges on right */}
        <div className="flex items-center justify-between mb-2 gap-2 min-w-0">
          {/* Exact Time Display with Period Phase */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <span className="text-xs sm:text-[13px] font-extrabold text-gray-900 tracking-tight">
              {timeStr}
            </span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.5 rounded-md capitalize inline-flex items-center">
              {localParts.periodLabel}
            </span>
          </div>

          {/* Targeted Social Media Icons */}
          <div className="flex items-center space-x-1 shrink-0">
            {postAccounts.map((acc) => {
              const status = getAccountPublishStatus(post, acc);
              const isFailed = status === 'failed';
              const isSuccess = status === 'success';
              const err = post.results?.[acc.id]?.errorMessage || post.results?.[acc.platform]?.errorMessage;

              return (
                <div
                  key={acc.id}
                  className={`relative w-5 h-5 rounded-full flex items-center justify-center p-0.5 shadow-2xs transition-all ${
                    isFailed
                      ? 'bg-rose-50 border border-rose-500 text-rose-600 ring-1 ring-rose-400/50'
                      : isSuccess
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-700'
                      : 'bg-white border border-gray-200/90 text-gray-700'
                  }`}
                  title={`${acc.displayName || acc.username || acc.platform} (${acc.platform}): ${
                    isFailed
                      ? `Failed / Not posted ${err ? `— ${err}` : ''}`
                      : isSuccess
                      ? 'Published successfully'
                      : 'Scheduled'
                  }`}
                >
                  <PlatformLogo platform={acc.platform} className={`w-3.5 h-3.5 ${isFailed ? 'text-rose-600' : ''}`} />
                  {isFailed && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-600 border border-white shadow-xs flex items-center justify-center"
                      title="Failed / Not posted"
                    >
                      <span className="w-0.5 h-0.5 rounded-full bg-white" />
                    </span>
                  )}
                </div>
              );
            })}

            {/* Overall Post Status Dot */}
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ml-1 ${
                post.status === 'published'
                  ? 'bg-emerald-500'
                  : post.status === 'scheduled'
                  ? 'bg-sky-500'
                  : post.status === 'draft'
                  ? 'bg-amber-500'
                  : post.status === 'partially_published'
                  ? 'bg-amber-500 ring-2 ring-amber-200'
                  : 'bg-rose-500 ring-2 ring-rose-200 animate-pulse'
              }`}
              title={`Status: ${post.status}`}
            />
          </div>
        </div>

        {/* Content Body: Caption Preview on left, Rectangular Media Thumbnail on right */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-relaxed break-words">
              {post.content || (
                <span className="text-gray-400 italic font-normal">
                  {post.media?.length ? '(Media asset)' : '(Empty post)'}
                </span>
              )}
            </p>
            {post.postType && post.postType !== 'post' && (
              <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                {post.postType}
              </span>
            )}
          </div>

          {/* Rectangular media thumbnail preview */}
          {media && (
            <div className="w-14 h-14 sm:w-16 sm:h-14 rounded-xl overflow-hidden shrink-0 bg-gray-950 border border-gray-200 shadow-2xs relative group-hover/card:border-emerald-300 transition-colors">
              {isVideo ? (
                <div className="w-full h-full relative flex items-center justify-center bg-gray-950">
                  {ytThumb || hasRealImageThumb ? (
                    <img
                      src={ytThumb || media.thumbnailUrl}
                      alt={media.name || 'Video cover'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={`${media.url}#t=0.001`}
                      preload="metadata"
                      muted
                      playsInline
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/25 flex items-center justify-center pointer-events-none">
                    <div className="w-4 h-4 rounded-full bg-black/60 flex items-center justify-center shadow-xs">
                      <Play className="w-2.5 h-2.5 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                </div>
              ) : (
                <img
                  src={media.thumbnailUrl || media.url}
                  alt={media.name || 'Asset thumbnail'}
                  className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-200"
                />
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 w-full font-sans space-y-4 min-w-0">
      {/* TOP HEADER ROW: Calendar Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            <CalendarIcon className="w-5 h-5 text-white" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-gray-900 tracking-tight">Content Calendar</h2>
            </div>
            <p className="text-[11px] text-gray-500 font-medium">
              Multi-platform scheduling &amp; visual content pipeline
            </p>
          </div>
        </div>

        {/* Right Top Actions: List/Calendar Toggle + New Post Button */}
        <div className="flex items-center space-x-2">
          {/* List vs Calendar Toggle */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => onNavigateToTab && onNavigateToTab('posts-all')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-emerald-700 shadow-2xs flex items-center space-x-1.5 cursor-default"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>Calendar</span>
            </button>
          </div>

          {/* New Post Button */}
          <button
            onClick={() => {
              if (openCreateModal) openCreateModal();
              else onCreateAtDate(new Date());
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-black hover:bg-gray-800 text-white transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Post</span>
          </button>
        </div>
      </div>

      {/* SUB-CONTROL BAR: Navigation, View Selector, Filters, and Timezone */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white border border-gray-200/80 rounded-2xl p-2.5 shadow-2xs">
        {/* Left Side: Prev / Next / Title / Today / View Mode */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Previous / Next buttons */}
          <div className="flex items-center space-x-0.5 border border-gray-200 rounded-xl p-0.5 bg-white">
            <button
              onClick={handlePrev}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors cursor-pointer"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors cursor-pointer"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Title Header: e.g. October 2026 */}
          <span className="text-sm md:text-base font-bold text-gray-900 px-1">
            {headerTitle}
          </span>

          {/* Today Button */}
          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200/80 rounded-xl transition-colors cursor-pointer"
          >
            Today
          </button>

          {/* Refresh Button */}
          {onRefreshData && (
            <button
              onClick={async () => {
                setIsRefreshing(true);
                try {
                  await onRefreshData();
                } finally {
                  setTimeout(() => setIsRefreshing(false), 400);
                }
              }}
              disabled={isRefreshing}
              className="p-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer flex items-center space-x-1"
              title="Refresh calendar posts"
            >
              <RotateCw className={`w-3.5 h-3.5 text-gray-500 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          )}

          {/* View Mode Selector Dropdown: Day, Week, Month, Year */}
          <div className="relative" ref={viewMenuRef}>
            <button
              onClick={() => setIsViewMenuOpen(!isViewMenuOpen)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-800 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center space-x-1.5 cursor-pointer capitalize"
            >
              <span>{viewMode}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {isViewMenuOpen && (
              <div className="absolute left-0 mt-1.5 w-32 bg-white border border-gray-200 rounded-xl shadow-lg p-1 z-30 space-y-0.5">
                {(['day', 'week', 'month', 'year'] as CalendarViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setViewMode(mode);
                      setIsViewMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium capitalize flex items-center justify-between cursor-pointer ${
                      viewMode === mode
                        ? 'bg-emerald-50 text-emerald-700 font-bold'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>{mode}</span>
                    {viewMode === mode && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Filters, No Date Drawer, Timezone */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter Dropdown: All Posts, Published, Scheduled, Drafts */}
          <div className="relative" ref={statusMenuRef}>
            <button
              onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-800 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-gray-500" />
              <span className="capitalize">
                {statusFilter === 'all' ? 'All Posts' : statusFilter}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {isStatusMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-44 bg-white border border-gray-200 rounded-xl shadow-lg p-1 z-30 space-y-0.5">
                {[
                  { id: 'all', label: 'All Posts' },
                  { id: 'published', label: 'Published' },
                  { id: 'partially_published', label: 'Partially Published' },
                  { id: 'scheduled', label: 'Scheduled' },
                  { id: 'draft', label: 'Drafts' },
                  { id: 'failed', label: 'Failed' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setStatusFilter(item.id as any);
                      setIsStatusMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between cursor-pointer ${
                      statusFilter === item.id
                        ? 'bg-emerald-50 text-emerald-700 font-bold'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {item.id === 'all'
                        ? posts.length
                        : posts.filter((p) => p.status === item.id).length}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Platforms Filter Dropdown */}
          <div className="relative" ref={platformMenuRef}>
            <button
              onClick={() => setIsPlatformMenuOpen(!isPlatformMenuOpen)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-800 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Tag className="w-3.5 h-3.5 text-gray-500" />
              <span className="capitalize">
                {platformFilter === 'all' ? 'Platforms' : platformFilter}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {isPlatformMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-44 bg-white border border-gray-200 rounded-xl shadow-lg p-1 z-30 space-y-0.5">
                <button
                  onClick={() => {
                    setPlatformFilter('all');
                    setIsPlatformMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                    platformFilter === 'all'
                      ? 'bg-emerald-50 text-emerald-700 font-bold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  All Platforms
                </button>
                {(['facebook', 'instagram', 'youtube', 'linkedin', 'threads'] as SocialPlatform[]).map(
                  (plat) => (
                    <button
                      key={plat}
                      onClick={() => {
                        setPlatformFilter(plat);
                        setIsPlatformMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-2 cursor-pointer ${
                        platformFilter === plat
                          ? 'bg-emerald-50 text-emerald-700 font-bold'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <PlatformLogo platform={plat} className="w-3.5 h-3.5" />
                      <span className="capitalize">{plat}</span>
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Post Type Filter Dropdown */}
          <div className="relative" ref={postTypeMenuRef}>
            <button
              onClick={() => setIsPostTypeMenuOpen(!isPostTypeMenuOpen)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-800 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Film className="w-3.5 h-3.5 text-gray-500" />
              <span className="capitalize">
                {postTypeFilter === 'all' ? 'Post Type' : postTypeFilter}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {isPostTypeMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-36 bg-white border border-gray-200 rounded-xl shadow-lg p-1 z-30 space-y-0.5">
                {[
                  { id: 'all', label: 'All Types' },
                  { id: 'post', label: 'Image / Post' },
                  { id: 'video', label: 'Video' },
                  { id: 'reel', label: 'Reel' },
                  { id: 'story', label: 'Story' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setPostTypeFilter(item.id as any);
                      setIsPostTypeMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                      postTypeFilter === item.id
                        ? 'bg-emerald-50 text-emerald-700 font-bold'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* No Date (Undated Drafts) Drawer Button */}
          <button
            onClick={() => setIsNoDateDrawerOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold text-gray-800 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Undated drafts"
          >
            <CalendarDays className="w-3.5 h-3.5 text-gray-500" />
            <span>No Date</span>
            {undatedPosts.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-mono text-[10px]">
                {undatedPosts.length}
              </span>
            )}
          </button>

          {/* Timezone Indicator & Quick Switcher */}
          <button
            type="button"
            onClick={() => setIsTimezoneModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer shadow-2xs group"
            title="Click to view or change timezone"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-gray-800">{tzInfo.label}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: WEEK VIEW (High-Precision User Local Time Timeline Grid) */}
      {/* ========================================================================= */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[960px] max-h-[840px] overflow-y-auto">
              {/* Single Unified CSS Grid for Header and all 24 Hour Rows — Guaranteed Pixel-Perfect Column Alignment */}
              <div className="grid grid-cols-[76px_repeat(7,minmax(0,1fr))] relative">
                {/* 1. Header Cells (Row 0): Sticky at top, perfectly synchronized with body columns */}
                {/* Timezone corner header with quick modal launcher */}
                <button
                  type="button"
                  onClick={() => setIsTimezoneModalOpen(true)}
                  className="sticky top-0 z-20 py-3 px-1 border-b border-r border-gray-200 bg-gray-50/95 hover:bg-emerald-50/90 backdrop-blur-xs flex flex-col items-center justify-center text-[10px] font-extrabold text-emerald-800 transition-colors cursor-pointer select-none"
                  title={`Active Timezone: ${tzInfo.label}. Click to change.`}
                >
                  <span className="leading-tight font-black">{tzInfo.abbr}</span>
                  <span className="text-[8px] text-emerald-600 font-semibold mt-0.5">{tzInfo.offsetStr}</span>
                </button>

                {/* 7 Days Columns with highlighted today */}
                {weekDays.map((day, dayIdx) => {
                  const isCurrentDay = isToday(day);
                  const isLastDay = dayIdx === weekDays.length - 1;

                  return (
                    <div
                      key={day.toISOString()}
                      className={`sticky top-0 z-20 py-3 px-2 border-b border-gray-200 transition-colors select-none text-center relative ${
                        !isLastDay ? 'border-r border-gray-200/80' : ''
                      } ${
                        isCurrentDay
                          ? 'bg-emerald-50/90 backdrop-blur-xs'
                          : 'bg-gray-50/95 backdrop-blur-xs hover:bg-gray-100/80'
                      }`}
                    >
                      {isCurrentDay && (
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-600" />
                      )}
                      <div
                        className={`text-[11px] font-bold uppercase tracking-wider ${
                          isCurrentDay ? 'text-emerald-700' : 'text-gray-500'
                        }`}
                      >
                        <span className="hidden sm:inline">{format(day, 'EEEE')}</span>
                        <span className="sm:hidden">{format(day, 'EEE')}</span>
                      </div>
                      <div
                        className={`text-sm font-extrabold mt-0.5 ${
                          isCurrentDay ? 'text-emerald-800' : 'text-gray-900'
                        }`}
                      >
                        {format(day, 'd')}
                      </div>
                    </div>
                  );
                })}

                {/* 2. Timeline Body Cells: Perfectly Synchronized Row-by-Row in the exact same Grid Tracks */}
                {timeSlots.map((slot) => {
                  return (
                    <React.Fragment key={slot.hour}>
                      {/* Column 0: Time Gutter Cell strictly aligned to this hour row */}
                      <div className="border-b border-r border-gray-200/80 bg-gray-50/50 min-h-[96px] flex flex-col justify-start items-end pr-3 pt-2 select-none">
                        <span className="text-[11px] font-bold text-gray-900 leading-tight">
                          {slot.label}
                        </span>
                        <span
                          className={`text-[8.5px] font-semibold mt-0.5 px-1 py-0.2 rounded ${
                            slot.phase === 'morning'
                              ? 'text-amber-700 bg-amber-50/80'
                              : slot.phase === 'afternoon'
                              ? 'text-sky-700 bg-sky-50/80'
                              : slot.phase === 'evening'
                              ? 'text-purple-700 bg-purple-50/80'
                              : 'text-indigo-700 bg-indigo-50/80'
                          }`}
                        >
                          {slot.periodLabel}
                        </span>
                      </div>

                      {/* Columns 1-7: Day Cells for this specific hour row */}
                      {weekDays.map((day, dayIdx) => {
                        const dayPosts = getPostsForDay(day);
                        const isCurrentDay = isToday(day);
                        const isLastDay = dayIdx === weekDays.length - 1;

                        // Filter posts scheduled specifically in this 1-hour slot
                        const slotPosts = dayPosts.filter((post) => {
                          const time = post.scheduledFor || post.publishedAt || post.createdAt;
                          const parts = getLocalTimeParts(time, timeZone);
                          return parts.hour24 === slot.hour;
                        });

                        const slotDropKey = `${day.toISOString()}_${slot.hour}`;
                        const isSlotDropTarget = dragOverDayIso === slotDropKey;

                        return (
                          <div
                            key={`${day.toISOString()}_${slot.hour}`}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragOverDayIso(slotDropKey);
                            }}
                            onDragLeave={() => setDragOverDayIso(null)}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragOverDayIso(null);
                              handleDropOnDay(e, day, slot.hour);
                            }}
                            onClick={() => {
                              const target = new Date(day);
                              target.setHours(slot.hour, 0, 0, 0);
                              onCreateAtDate(target);
                            }}
                            className={`min-h-[96px] p-2 relative transition-all group cursor-pointer border-b border-gray-100/90 min-w-0 ${
                              !isLastDay ? 'border-r border-gray-200/80' : ''
                            } ${
                              isCurrentDay ? 'bg-emerald-50/10' : ''
                            } ${
                              isSlotDropTarget
                                ? 'bg-emerald-50 ring-2 ring-emerald-500 ring-inset'
                                : 'hover:bg-gray-50/70'
                            }`}
                          >
                            {/* Post Cards scheduled in this exact slot */}
                            {slotPosts.length > 0 ? (
                              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-0.5">
                                {slotPosts.map((post) => (
                                  <div
                                    key={post.id}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {renderPostCard(post, { compact: true })}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              /* Clean interactive hover to schedule at this slot */
                              <div className="opacity-0 group-hover:opacity-100 h-full flex items-center justify-center transition-opacity min-h-[72px]">
                                <span className="text-[10px] font-semibold text-gray-400 group-hover:text-emerald-700 flex items-center space-x-1">
                                  <Plus className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>{slot.label}</span>
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: DAY VIEW (Expanded High-Resolution Timeline) */}
      {/* ========================================================================= */}
      {viewMode === 'day' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          {/* Day View Header */}
          <div className="p-4 border-b border-gray-200 bg-gray-50/80 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-base font-extrabold text-gray-900">
                {format(currentDate, 'EEEE, MMMM d, yyyy')}
              </span>
              {isToday(currentDate) && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Today
                </span>
              )}
            </div>

            <button
              onClick={() => onCreateAtDate(currentDate)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule for this Day</span>
            </button>
          </div>

          {/* Hourly Timeline with Local Phase Information */}
          <div className="divide-y divide-gray-100 max-h-[750px] overflow-y-auto">
            {Array.from({ length: 24 }).map((_, hour) => {
              const hourPosts = getPostsForDay(currentDate).filter((p) => {
                const ts = p.scheduledFor || p.publishedAt || p.createdAt;
                const parts = getLocalTimeParts(ts, timeZone);
                return parts.hour24 === hour;
              });

              const isPm = hour >= 12;
              let h12 = hour % 12;
              if (h12 === 0) h12 = 12;
              const period = isPm ? 'PM' : 'AM';
              const label = is24Hour
                ? `${String(hour).padStart(2, '0')}:00`
                : `${h12} ${period}`;

              let periodLabel = 'Night';
              if (hour === 0) periodLabel = 'Midnight';
              else if (hour < 4) periodLabel = 'Late Night';
              else if (hour < 6) periodLabel = 'Early Morning';
              else if (hour < 12) periodLabel = 'Morning';
              else if (hour === 12) periodLabel = 'Noon';
              else if (hour < 17) periodLabel = 'Afternoon';
              else if (hour < 21) periodLabel = 'Evening';
              else periodLabel = 'Night';

              return (
                <div
                  key={hour}
                  onClick={() => {
                    const target = new Date(currentDate);
                    target.setHours(hour, 0, 0, 0);
                    onCreateAtDate(target);
                  }}
                  className="flex items-start p-3 hover:bg-gray-50/50 transition-colors group cursor-pointer min-h-[64px]"
                >
                  <div className="w-20 pr-3 flex flex-col items-end select-none shrink-0 pt-0.5">
                    <span className="text-xs font-bold text-gray-800 leading-tight">
                      {label}
                    </span>
                    <span className="text-[9px] font-semibold text-gray-400 mt-0.5">
                      {periodLabel}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2 min-w-0">
                    {hourPosts.map((post) => (
                      <div key={post.id} onClick={(e) => e.stopPropagation()} className="w-full max-w-xl">
                        {renderPostCard(post)}
                      </div>
                    ))}

                    {hourPosts.length === 0 && (
                      <div className="opacity-0 group-hover:opacity-100 text-[11px] text-gray-400 flex items-center space-x-1 pt-1">
                        <Plus className="w-3 h-3 text-emerald-600" />
                        <span>Click to schedule at {label} ({periodLabel})</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: MONTH VIEW (Full 7x5 Calendar Grid Matrix) */}
      {/* ========================================================================= */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[860px]">
              {/* Days of week header */}
              <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/90 text-center py-2.5 sm:py-3 text-[11px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider">
                <div><span className="hidden sm:inline">Sunday</span><span className="sm:hidden">Sun</span></div>
                <div><span className="hidden sm:inline">Monday</span><span className="sm:hidden">Mon</span></div>
                <div><span className="hidden sm:inline">Tuesday</span><span className="sm:hidden">Tue</span></div>
                <div><span className="hidden sm:inline">Wednesday</span><span className="sm:hidden">Wed</span></div>
                <div><span className="hidden sm:inline">Thursday</span><span className="sm:hidden">Thu</span></div>
                <div><span className="hidden sm:inline">Friday</span><span className="sm:hidden">Fri</span></div>
                <div><span className="hidden sm:inline">Saturday</span><span className="sm:hidden">Sat</span></div>
              </div>

              {/* Days matrix */}
              <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-gray-100 min-h-[720px] sm:min-h-[840px]">
                {monthDays.map((day) => {
                  const dayPosts = getPostsForDay(day);
                  const isCurrMonth = isSameMonth(day, currentDate);
                  const isCurrentDay = isToday(day);
                  const isDropTarget = dragOverDayIso === day.toISOString();

                  return (
                    <div
                      key={day.toISOString()}
                      onDragOver={(e) => handleDragOverDay(e, day)}
                      onDragLeave={() => handleDragLeaveDay(day)}
                      onDrop={(e) => handleDropOnDay(e, day)}
                      onClick={() => openDayModal(day)}
                      className={`group relative p-2.5 flex flex-col justify-between transition-all min-h-[140px] sm:min-h-[160px] cursor-pointer ${
                        isDropTarget
                          ? 'bg-emerald-50/70 ring-2 ring-emerald-500 ring-inset'
                          : isCurrMonth
                          ? 'bg-white hover:bg-emerald-50/15'
                          : 'bg-gray-50/40 text-gray-400'
                      }`}
                    >
                      {/* Day Header Row */}
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                            isCurrentDay
                              ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                              : isCurrMonth
                              ? 'text-gray-900'
                              : 'text-gray-400'
                          }`}
                        >
                          {format(day, 'd')}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCreateAtDate(day);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-emerald-100 text-emerald-700 transition-opacity cursor-pointer"
                          title="Schedule post for this date"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Day's scheduled posts */}
                      <div className="flex-1 space-y-2 overflow-y-auto max-h-48 scrollbar-none">
                        {dayPosts.slice(0, 3).map((post) => (
                          <div key={post.id} onClick={(e) => e.stopPropagation()}>
                            {renderPostCard(post, { compact: true })}
                          </div>
                        ))}

                        {dayPosts.length > 3 && (
                          <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50/90 rounded-md py-1 text-center border border-emerald-200">
                            +{dayPosts.length - 3} more posts
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: YEAR VIEW (12-Month Distribution Matrix) */}
      {/* ========================================================================= */}
      {viewMode === 'year' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h3 className="text-base font-bold text-gray-900">
              {currentDate.getFullYear()} Social Content Pipeline
            </h3>
            <span className="text-xs text-gray-500 font-medium">
              Click any month to inspect details
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {yearMonths.map((mDate) => {
              const mStart = startOfMonth(mDate);
              const mEnd = endOfMonth(mDate);
              const mDays = eachDayOfInterval({
                start: startOfWeek(mStart, { weekStartsOn: 0 }),
                end: endOfWeek(mEnd, { weekStartsOn: 0 }),
              });

              const mPosts = filteredPosts.filter((p) => {
                const ts = p.scheduledFor || p.publishedAt || p.createdAt;
                const d = parseDateSafe(ts);
                return d ? d.getFullYear() === mDate.getFullYear() && d.getMonth() === mDate.getMonth() : false;
              });

              const publishedMCount = mPosts.filter((p) => p.status === 'published').length;
              const scheduledMCount = mPosts.filter((p) => p.status === 'scheduled').length;

              return (
                <div
                  key={mDate.toISOString()}
                  onClick={() => {
                    setCurrentDate(mDate);
                    setViewMode('month');
                  }}
                  className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/40 hover:bg-white hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                      {format(mDate, 'MMMM')}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {mPosts.length} posts
                    </span>
                  </div>

                  {/* Mini Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-medium text-gray-400">
                    <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
                    {mDays.map((d) => {
                      const hasPost = mPosts.some((p) => postMatchesDay(p, d));
                      const isCurrentM = isSameMonth(d, mDate);
                      const isTod = isToday(d);

                      return (
                        <div
                          key={d.toISOString()}
                          className={`h-5 rounded flex items-center justify-center ${
                            isTod
                              ? 'bg-emerald-600 text-white font-bold'
                              : hasPost
                              ? 'bg-emerald-100 text-emerald-900 font-bold'
                              : isCurrentM
                              ? 'text-gray-700'
                              : 'text-gray-300'
                          }`}
                        >
                          {format(d, 'd')}
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary bar */}
                  <div className="text-[10px] text-gray-500 pt-1 border-t border-gray-100 flex items-center justify-between">
                    <span>{publishedMCount} published</span>
                    <span>{scheduledMCount} scheduled</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SLIDE-OUT DRAWER: "NO DATE" (Undated Drafts) */}
      {/* ========================================================================= */}
      {isNoDateDrawerOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end">
          <div
            ref={noDateDrawerRef}
            className="w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col space-y-4 animate-in slide-in-from-right duration-200"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center space-x-2">
                <CalendarDays className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-gray-900">Undated Drafts</h3>
                <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                  {undatedPosts.length}
                </span>
              </div>
              <button
                onClick={() => setIsNoDateDrawerOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Drag and drop any undated draft directly onto any day on the calendar to schedule it immediately.
            </p>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {undatedPosts.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400">
                  No undated drafts available.
                </div>
              ) : (
                undatedPosts.map((draft) => (
                  <div
                    key={draft.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, draft)}
                    onClick={() => {
                      setIsNoDateDrawerOpen(false);
                      onSelectPost(draft);
                    }}
                    className="p-3 border border-gray-200 rounded-xl bg-gray-50/50 hover:bg-white hover:border-emerald-400 shadow-2xs transition-all cursor-grab active:cursor-grabbing space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-700 uppercase text-[10px]">
                        Draft
                      </span>
                      <span className="text-[10px] text-gray-400 flex items-center space-x-1">
                        <GripVertical className="w-3 h-3" />
                        <span>Drag to calendar</span>
                      </span>
                    </div>
                    <p className="text-xs text-gray-800 font-medium line-clamp-2">
                      {draft.content || '(Empty content)'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Day Posts Inspection (Triggered from Month View day click) */}
      {/* ========================================================================= */}
      {selectedDayForModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div
            ref={dayModalRef}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {format(selectedDayForModal, 'EEEE, MMMM d, yyyy')}
                </h3>
                <span className="text-xs text-gray-500">
                  {getPostsForDay(selectedDayForModal).length} posts scheduled / published
                </span>
              </div>
              <button
                onClick={() => closeDayModal()}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {getPostsForDay(selectedDayForModal).length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  No posts on this date.
                </div>
              ) : (
                getPostsForDay(selectedDayForModal).map((post) => (
                  <div key={post.id} onClick={() => closeDayModal()}>
                    {renderPostCard(post)}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => {
                  const targetDay = selectedDayForModal;
                  closeDayModal();
                  onCreateAtDate(targetDay);
                }}
                className="w-full py-2.5 rounded-xl bg-black hover:bg-gray-800 text-white text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule New Post for this Date</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Inspected Post Details */}
      {/* ========================================================================= */}
      {inspectedPost && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div
            ref={postModalRef}
            className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    inspectedPost.status === 'published'
                      ? 'bg-emerald-100 text-emerald-800'
                      : inspectedPost.status === 'scheduled'
                      ? 'bg-sky-100 text-sky-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {inspectedPost.status}
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  {formatDateFullSafe(inspectedPost.scheduledFor || inspectedPost.publishedAt, '', timeZone)} · {formatTimeSafe(inspectedPost.scheduledFor || inspectedPost.publishedAt, '', timeZone)}
                </span>
              </div>
              <button
                onClick={() => closePostModal()}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Targeted Channels */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Targeted Accounts
              </span>
              <div className="flex flex-wrap gap-2">
                {getAccountsForPost(inspectedPost).map((acc) => {
                  const status = getAccountPublishStatus(inspectedPost, acc);
                  const isFailed = status === 'failed';
                  const isSuccess = status === 'success';

                  return (
                    <div
                      key={acc.id}
                      className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                        isFailed
                          ? 'border-rose-300 bg-rose-50 text-rose-700'
                          : isSuccess
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-gray-200 bg-gray-50 text-gray-800'
                      }`}
                    >
                      <PlatformLogo platform={acc.platform} className={`w-3.5 h-3.5 ${isFailed ? 'text-rose-600' : ''}`} />
                      <span>{acc.displayName || acc.username}</span>
                      {isFailed && (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.2 rounded">
                          Failed
                        </span>
                      )}
                      {isSuccess && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.2 rounded">
                          Published
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Publishing Error Alert if any account failed */}
            {getAccountsForPost(inspectedPost).some((acc) => getAccountPublishStatus(inspectedPost, acc) === 'failed') && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                <span className="text-xs font-bold text-rose-800 block">
                  Publishing Alert
                </span>
                {getAccountsForPost(inspectedPost)
                  .filter((acc) => getAccountPublishStatus(inspectedPost, acc) === 'failed')
                  .map((acc) => {
                    const err = inspectedPost.results?.[acc.id]?.errorMessage || inspectedPost.results?.[acc.platform]?.errorMessage;
                    return (
                      <p key={acc.id} className="text-[11px] text-rose-700">
                        <strong className="capitalize">{acc.platform} ({acc.displayName || acc.username}):</strong> {err || 'Failed to publish to this account.'}
                      </p>
                    );
                  })}
              </div>
            )}

            {/* Media Asset Preview */}
            {inspectedPost.media && inspectedPost.media.length > 0 && (() => {
              const med = inspectedPost.media[0];
              const isVid = med.type === 'video' || /\.(mp4|webm|mov|m4v|avi|mkv)($|\?)/i.test(med.url || '');
              return (
                <div className="w-full h-56 rounded-xl overflow-hidden bg-black relative border border-gray-100">
                  {isVid ? (
                    <video
                      src={med.url}
                      controls
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={med.url}
                      alt="Post media preview"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              );
            })()}

            {/* Platform-Specific Captions & AI Features */}
            <PostPlatformCaptionsView
              post={inspectedPost}
              accounts={accounts}
            />

            {/* Footer Actions */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-end">
              <button
                onClick={() => closePostModal()}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Timezone Switcher Modal */}
      <TimezoneSelectorModal
        isOpen={isTimezoneModalOpen}
        onClose={() => setIsTimezoneModalOpen(false)}
      />
    </div>
  );
};
