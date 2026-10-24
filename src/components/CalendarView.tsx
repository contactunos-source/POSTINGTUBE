'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  FileEdit,
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
  formatToDateTimeLocal,
  formatDateTimeWithSeconds,
} from '@/lib/dateUtils';

interface CalendarViewProps {
  posts: Post[];
  accounts: SocialAccount[];
  workspaceName?: string;
  onSelectPost: (post: Post) => void;
  onCreateAtDate: (date: Date) => void;
  onReschedulePost?: (postId: string, newScheduledFor: string) => Promise<boolean>;
  openCreateModal?: () => void;
  onNavigateToTab?: (tab: string) => void;
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
}) => {
  // Navigation & View Mode
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'scheduled' | 'draft' | 'failed'>('all');
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

  useClickOutside(viewMenuRef, () => setIsViewMenuOpen(false), { enabled: isViewMenuOpen });
  useClickOutside(statusMenuRef, () => setIsStatusMenuOpen(false), { enabled: isStatusMenuOpen });
  useClickOutside(platformMenuRef, () => setIsPlatformMenuOpen(false), { enabled: isPlatformMenuOpen });
  useClickOutside(postTypeMenuRef, () => setIsPostTypeMenuOpen(false), { enabled: isPostTypeMenuOpen });
  useClickOutside(dayModalRef, () => setSelectedDayForModal(null), { enabled: selectedDayForModal !== null });
  useClickOutside(postModalRef, () => setInspectedPost(null), { enabled: inspectedPost !== null });
  useClickOutside(noDateDrawerRef, () => setIsNoDateDrawerOpen(false), { enabled: isNoDateDrawerOpen });

  // Drag and drop state
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [dragOverDayIso, setDragOverDayIso] = useState<string | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Quick Reschedule state inside post modal
  const [rescheduleDateInput, setRescheduleDateInput] = useState<string>('');
  const [rescheduleSuccessMsg, setRescheduleSuccessMsg] = useState<string | null>(null);

  // Detect local timezone
  const userTimezone = useMemo(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return tz.split('/')[1] || tz;
    } catch {
      return 'Kolkata';
    }
  }, []);

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
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;

      // Platform filter
      if (platformFilter !== 'all') {
        const postAccs = accounts.filter((a) => p.targetAccountIds.includes(a.id));
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

  // Retrieve posts for a specific day sorted chronologically by exact time
  const getPostsForDay = (day: Date) => {
    const matched = filteredPosts.filter((p) => postMatchesDay(p, day));
    return matched.sort((a, b) => {
      const timeA = a.scheduledFor || a.publishedAt || a.createdAt;
      const timeB = b.scheduledFor || b.publishedAt || b.createdAt;
      const dateA = parseDateSafe(timeA);
      const dateB = parseDateSafe(timeB);
      const minsA = dateA ? dateA.getHours() * 60 + dateA.getMinutes() : 0;
      const minsB = dateB ? dateB.getHours() * 60 + dateB.getMinutes() : 0;
      return minsA - minsB;
    });
  };

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

    // Preserve original minutes or set target hour
    const originalDate = post.scheduledFor ? new Date(post.scheduledFor) : new Date();
    const hours = typeof targetHour === 'number' ? targetHour : originalDate.getHours();
    const minutes = originalDate.getMinutes();

    const newTarget = new Date(targetDay);
    newTarget.setHours(hours, minutes, 0, 0);
    const newScheduledIso = newTarget.toISOString();

    setIsRescheduling(true);
    try {
      await onReschedulePost(post.id, newScheduledIso);
    } finally {
      setIsRescheduling(false);
    }
  };

  // Hours array for week and day timeline (12 AM, 2 AM, ... 10 PM)
  const timeSlots = [
    { hour: 0, label: '12 AM' },
    { hour: 2, label: '2 AM' },
    { hour: 4, label: '4 AM' },
    { hour: 6, label: '6 AM' },
    { hour: 8, label: '8 AM' },
    { hour: 10, label: '10 AM' },
    { hour: 12, label: '12 PM' },
    { hour: 14, label: '2 PM' },
    { hour: 16, label: '4 PM' },
    { hour: 18, label: '6 PM' },
    { hour: 20, label: '8 PM' },
    { hour: 22, label: '10 PM' },
  ];

  // Helper for rendering post card (matches the reference image layout in our clean brand theme)
  const renderPostCard = (post: Post, options: { compact?: boolean; showDragHandle?: boolean } = {}) => {
    const postAccounts = getAccountsForPost(post);
    const primaryAccount = postAccounts[0];
    const platforms = Array.from(new Set(postAccounts.map((a) => a.platform)));
    const timeStr = formatTimeSafe(post.scheduledFor || post.publishedAt);
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
          setInspectedPost(post);
          setRescheduleDateInput(formatToDateTimeLocal(post.scheduledFor));
          setRescheduleSuccessMsg(null);
        }}
        className={`group/card bg-white border rounded-xl p-2.5 transition-all select-none relative shadow-xs hover:shadow-md hover:border-emerald-500 cursor-pointer ${
          post.status === 'published'
            ? 'border-emerald-200/90 hover:border-emerald-400'
            : post.status === 'scheduled'
            ? 'border-gray-200/90 hover:border-emerald-500'
            : post.status === 'draft'
            ? 'border-amber-200/90 hover:border-amber-400'
            : 'border-rose-200/90 hover:border-rose-400'
        }`}
      >
        {/* Top Header: Platform Icon + Time + Status Indicator */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center space-x-1.5 min-w-0">
            {/* Primary Platform Icon */}
            <div className="w-4 h-4 rounded-full bg-white border border-gray-200/80 flex items-center justify-center shrink-0 shadow-2xs p-0.5">
              <PlatformLogo platform={primaryAccount?.platform || 'facebook'} className="w-3 h-3" />
            </div>

            {/* Exact Time Display */}
            <span className="text-[11px] font-bold text-gray-900 tracking-tight shrink-0">
              {timeStr}
            </span>

            {/* Additional platform chips cleanly separated without overlapping */}
            {platforms.length > 1 && (
              <div className="flex items-center space-x-1 pl-0.5 shrink-0">
                {platforms.slice(1, 4).map((pl) => (
                  <div
                    key={pl}
                    className="w-4 h-4 rounded-full bg-white border border-gray-200/90 flex items-center justify-center p-0.5 shrink-0 shadow-2xs"
                    title={`Target platform: ${pl}`}
                  >
                    <PlatformLogo platform={pl} className="w-3 h-3" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status Dot */}
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              post.status === 'published'
                ? 'bg-emerald-500'
                : post.status === 'scheduled'
                ? 'bg-sky-500'
                : post.status === 'draft'
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
            title={`Status: ${post.status}`}
          />
        </div>

        {/* Content Body: Caption Preview on left, Thumbnail on right (matches reference image) */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-medium text-gray-800 line-clamp-2 leading-snug flex-1 break-words">
            {post.content || '(Media asset)'}
          </p>

          {/* Media thumbnail */}
          {media && (
            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-gray-950 border border-gray-200/80 relative">
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
                    <div className="w-3.5 h-3.5 rounded-full bg-black/60 flex items-center justify-center shadow-xs">
                      <Play className="w-2 h-2 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                </div>
              ) : (
                <img
                  src={media.thumbnailUrl || media.url}
                  alt={media.name || 'Asset thumbnail'}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans space-y-4">
      {/* TOP HEADER ROW: Workspace Title & Actions (matching reference layout in our white theme) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center space-x-3">
          {/* Workspace Avatar / Logo */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-xs relative">
            <span>{workspaceName.substring(0, 2).toUpperCase()}</span>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center border-2 border-white shadow-xs">
              <PlatformLogo platform="facebook" className="w-2.5 h-2.5" />
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-gray-900 tracking-tight">{workspaceName}</h2>
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

          {/* Timezone Indicator */}
          <div className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl flex items-center space-x-1.5">
            <Globe className="w-3.5 h-3.5 text-gray-400" />
            <span>{userTimezone}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: WEEK VIEW (Closest match to the reference image in our white theme) */}
      {/* ========================================================================= */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Header Row: 7 Days Columns with highlighted today */}
              <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/70 text-center text-xs">
                {weekDays.map((day) => {
                  const isCurrentDay = isToday(day);
                  const dayPosts = getPostsForDay(day);

                  return (
                    <div
                      key={day.toISOString()}
                      className={`py-3 px-2 border-r last:border-r-0 border-gray-200/80 transition-colors ${
                        isCurrentDay
                          ? 'bg-emerald-50/50 border-t-2 border-t-emerald-600'
                          : 'hover:bg-gray-100/50'
                      }`}
                    >
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
              </div>

              {/* Week Timeline Body: Time Grid & Post Cards */}
              <div className="relative min-h-[720px] max-h-[820px] overflow-y-auto">
                {/* Background Hourly Grid Lines with Time Markers on Left */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between divide-y divide-gray-100">
                  {timeSlots.map((slot) => (
                    <div key={slot.hour} className="h-16 relative flex items-start">
                      <span className="text-[10px] font-semibold text-gray-400 pl-2 pt-1 select-none w-14 shrink-0">
                        {slot.label}
                      </span>
                      <div className="w-full border-t border-gray-100/80 mt-2.5" />
                    </div>
                  ))}
                </div>

                {/* 7 Columns Container */}
                <div className="grid grid-cols-7 divide-x divide-gray-200/80 relative z-10 min-h-[720px]">
                  {weekDays.map((day) => {
                    const dayPosts = getPostsForDay(day);
                    const isCurrentDay = isToday(day);
                    const isDropTarget = dragOverDayIso === day.toISOString();

                    return (
                      <div
                        key={day.toISOString()}
                        onDragOver={(e) => handleDragOverDay(e, day)}
                        onDragLeave={() => handleDragLeaveDay(day)}
                        onDrop={(e) => handleDropOnDay(e, day)}
                        onClick={() => {
                          // Click on empty space creates post for this day
                          onCreateAtDate(day);
                        }}
                        className={`p-2 transition-all flex flex-col min-h-[720px] cursor-pointer ${
                          isDropTarget
                            ? 'bg-emerald-50/70 ring-2 ring-emerald-500 ring-inset'
                            : isCurrentDay
                            ? 'bg-emerald-50/10'
                            : 'hover:bg-gray-50/40'
                        }`}
                      >
                        {/* Posts for this day stacked chronologically */}
                        <div className="space-y-2.5 mt-auto pb-4">
                          {dayPosts.map((post) => (
                            <div
                              key={post.id}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {renderPostCard(post)}
                            </div>
                          ))}
                        </div>

                        {/* Empty Day Add Post Hint */}
                        {dayPosts.length === 0 && (
                          <div className="flex-1 flex items-center justify-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onCreateAtDate(day);
                              }}
                              className="opacity-0 hover:opacity-100 p-2 rounded-xl border border-dashed border-gray-200 text-gray-400 hover:text-emerald-600 hover:border-emerald-300 transition-all flex items-center space-x-1 text-[11px]"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Schedule</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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

          {/* Hourly Timeline */}
          <div className="divide-y divide-gray-100 max-h-[750px] overflow-y-auto">
            {Array.from({ length: 24 }).map((_, hour) => {
              const hourPosts = getPostsForDay(currentDate).filter((p) => {
                const ts = p.scheduledFor || p.publishedAt || p.createdAt;
                const d = parseDateSafe(ts);
                return d ? d.getHours() === hour : false;
              });

              const label =
                hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;

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
                  <span className="w-16 text-xs font-semibold text-gray-400 select-none shrink-0 pt-0.5">
                    {label}
                  </span>

                  <div className="flex-1 space-y-2 min-w-0">
                    {hourPosts.map((post) => (
                      <div key={post.id} onClick={(e) => e.stopPropagation()} className="w-full max-w-xl">
                        {renderPostCard(post)}
                      </div>
                    ))}

                    {hourPosts.length === 0 && (
                      <div className="opacity-0 group-hover:opacity-100 text-[11px] text-gray-400 flex items-center space-x-1 pt-1">
                        <Plus className="w-3 h-3 text-emerald-600" />
                        <span>Click to schedule at {label}</span>
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
            <div className="min-w-[620px]">
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
              <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-gray-100 min-h-[620px] sm:min-h-[720px]">
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
                      onClick={() => setSelectedDayForModal(day)}
                      className={`group relative p-2.5 flex flex-col justify-between transition-all min-h-[120px] sm:min-h-[135px] cursor-pointer ${
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
                      <div className="flex-1 space-y-2 overflow-y-auto max-h-36 scrollbar-none">
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
                onClick={() => setSelectedDayForModal(null)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700"
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
                  <div key={post.id} onClick={() => setSelectedDayForModal(null)}>
                    {renderPostCard(post)}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => {
                  const targetDay = selectedDayForModal;
                  setSelectedDayForModal(null);
                  onCreateAtDate(targetDay);
                }}
                className="w-full py-2.5 rounded-xl bg-black hover:bg-gray-800 text-white text-xs font-bold transition-colors flex items-center justify-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule New Post for this Date</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Inspected Post Details & Quick Reschedule */}
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
                  {formatDateFullSafe(inspectedPost.scheduledFor || inspectedPost.publishedAt)}
                </span>
              </div>
              <button
                onClick={() => setInspectedPost(null)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700"
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
                {getAccountsForPost(inspectedPost).map((acc) => (
                  <div
                    key={acc.id}
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-800 font-semibold"
                  >
                    <PlatformLogo platform={acc.platform} className="w-3.5 h-3.5" />
                    <span>{acc.displayName || acc.username}</span>
                  </div>
                ))}
              </div>
            </div>

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

            {/* Caption Content */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Caption
              </span>
              <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs text-gray-800 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
                {inspectedPost.content || '(No caption provided)'}
              </div>
            </div>

            {/* Quick Reschedule (for scheduled / draft posts) */}
            {inspectedPost.status !== 'published' && onReschedulePost && (
              <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-xl space-y-2">
                <span className="text-xs font-bold text-sky-950 block">
                  Quick Reschedule
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={rescheduleDateInput}
                    onChange={(e) => setRescheduleDateInput(e.target.value)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-sky-200 bg-white text-gray-900 focus:outline-hidden focus:border-sky-500 flex-1"
                  />
                  <button
                    onClick={async () => {
                      if (!rescheduleDateInput) return;
                      const newIso = new Date(rescheduleDateInput).toISOString();
                      const ok = await onReschedulePost(inspectedPost.id, newIso);
                      if (ok) {
                        setRescheduleSuccessMsg('Successfully rescheduled!');
                        setTimeout(() => setRescheduleSuccessMsg(null), 3000);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Save Time
                  </button>
                </div>
                {rescheduleSuccessMsg && (
                  <span className="text-xs text-emerald-600 font-bold block">
                    {rescheduleSuccessMsg}
                  </span>
                )}
              </div>
            )}

            {/* Footer Actions */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => {
                  const postToEdit = inspectedPost;
                  setInspectedPost(null);
                  onSelectPost(postToEdit);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-black hover:bg-gray-800 text-white transition-colors flex items-center space-x-1.5"
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>Edit in Composer</span>
              </button>

              <button
                onClick={() => setInspectedPost(null)}
                className="text-xs text-gray-500 hover:text-gray-800 font-medium"
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
