'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useClickOutside } from '@/hooks/useClickOutside';
import { Post, SocialAccount, SocialPlatform, PostStatus } from '@/types/social';
import { PlatformLogo } from './SocialIcons';
import {
  ChevronLeft,
  ChevronRight,
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
  ArrowRight,
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isPast,
} from 'date-fns';
import {
  parseDateSafe,
  isSameCalendarDay,
  postMatchesDay,
  formatTimeSafe,
  formatDateFullSafe,
  formatToDateTimeLocal,
  formatLocalToUtcIso,
} from '@/lib/dateUtils';

interface CalendarViewProps {
  posts: Post[];
  accounts: SocialAccount[];
  onSelectPost: (post: Post) => void;
  onCreateAtDate: (date: Date) => void;
  onReschedulePost?: (postId: string, newScheduledFor: string) => Promise<boolean>;
}

type CalendarViewMode = 'month' | 'week' | 'day';

export const CalendarView: React.FC<CalendarViewProps> = ({
  posts,
  accounts,
  onSelectPost,
  onCreateAtDate,
  onReschedulePost,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'published' | 'draft' | 'failed'>('all');
  const [selectedDayForModal, setSelectedDayForModal] = useState<Date | null>(null);
  const [inspectedPost, setInspectedPost] = useState<Post | null>(null);

  const dayModalRef = useRef<HTMLDivElement>(null);
  const postModalRef = useRef<HTMLDivElement>(null);

  // Close day inspection modal on outside click or Escape key
  useClickOutside(dayModalRef, () => setSelectedDayForModal(null), {
    enabled: selectedDayForModal !== null,
  });

  // Close inspected post modal on outside click or Escape key
  useClickOutside(postModalRef, () => setInspectedPost(null), {
    enabled: inspectedPost !== null,
  });

  // Drag and drop state
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [dragOverDayIso, setDragOverDayIso] = useState<string | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Quick Reschedule state inside post details modal
  const [rescheduleDateInput, setRescheduleDateInput] = useState<string>('');
  const [rescheduleSuccessMsg, setRescheduleSuccessMsg] = useState<string | null>(null);

  // Navigation handlers
  const handleNext = () => {
    if (viewMode === 'month') setCurrentDate((d) => addMonths(d, 1));
    else if (viewMode === 'week') setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, 1));
  };

  const handlePrev = () => {
    if (viewMode === 'month') setCurrentDate((d) => subMonths(d, 1));
    else if (viewMode === 'week') setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subDays(d, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Month days interval calculation
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  // Week days interval calculation
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate]);

  // Header Title based on view mode
  const headerTitle = useMemo(() => {
    if (viewMode === 'month') {
      return format(currentDate, 'MMMM yyyy');
    } else if (viewMode === 'week') {
      const start = weekDays[0];
      const end = weekDays[6];
      if (isSameMonth(start, end)) {
        return `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`;
      }
      return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
    } else {
      return format(currentDate, 'EEEE, MMMM d, yyyy');
    }
  }, [currentDate, viewMode, weekDays]);

  // Filtered posts based on status filter
  const filteredPosts = useMemo(() => {
    if (statusFilter === 'all') return posts;
    return posts.filter((p) => p.status === statusFilter);
  }, [posts, statusFilter]);

  // Retrieve posts for a specific day using timezone-safe matching
  const getPostsForDay = (day: Date) => {
    return filteredPosts.filter((p) => postMatchesDay(p, day));
  };

  // Helper to get accounts for a post
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

  const handleDropOnDay = async (e: React.DragEvent, targetDay: Date) => {
    e.preventDefault();
    setDragOverDayIso(null);
    const postId = e.dataTransfer.getData('text/plain') || draggedPostId;
    setDraggedPostId(null);

    if (!postId || !onReschedulePost) return;

    const post = posts.find((p) => p.id === postId);
    if (!post || post.status === 'published') return;

    // Calculate new scheduled timestamp preserving original hour and minute
    const originalDate = post.scheduledFor ? new Date(post.scheduledFor) : new Date();
    const hours = originalDate.getHours();
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

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto font-sans space-y-6">
      {/* Calendar Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center space-x-2">
            <CalendarIcon className="w-6 h-6 text-emerald-600" />
            <span>Content Calendar</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Visual multi-platform scheduling workspace with drag-and-drop rescheduling.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter Pills */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: 'all', label: 'All', count: posts.length },
              { id: 'scheduled', label: 'Scheduled', count: posts.filter((p) => p.status === 'scheduled').length },
              { id: 'published', label: 'Published', count: posts.filter((p) => p.status === 'published').length },
              { id: 'draft', label: 'Drafts', count: posts.filter((p) => p.status === 'draft').length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-white shadow-xs text-gray-900 font-bold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-gray-200/80 text-gray-700">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* View Mode Switcher: Month | Week */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl shadow-2xs">
            {(['month', 'week'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  viewMode === mode
                    ? 'bg-white shadow-xs text-gray-900 font-bold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-1.5 bg-white border border-gray-200 rounded-xl p-1 shadow-2xs">
            <button
              onClick={handlePrev}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors cursor-pointer"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors cursor-pointer"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Current Date Display */}
          <span className="text-sm md:text-base font-bold text-gray-900 min-w-[140px] text-right">
            {headerTitle}
          </span>
        </div>
      </div>

      {/* Visual Status Legend & Drag Hint */}
      <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 bg-gray-50/70 border border-gray-200/80 rounded-xl px-4 py-2 gap-3">
        <div className="flex items-center space-x-4">
          <span className="font-semibold text-gray-700">Status Legend:</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Published</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <span>Scheduled</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Publishing / Processing</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Failed</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
            <span>Draft</span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 text-gray-400 text-[11px]">
          <GripVertical className="w-3.5 h-3.5 text-gray-400" />
          <span>Drag scheduled cards to any day to reschedule</span>
        </div>
      </div>

      {/* VIEW 1: MONTH VIEW */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/90 text-center py-3 text-xs font-bold text-gray-700 uppercase tracking-wider">
            <div>Sunday</div>
            <div>Monday</div>
            <div>Tuesday</div>
            <div>Wednesday</div>
            <div>Thursday</div>
            <div>Friday</div>
            <div>Saturday</div>
          </div>

          {/* Days matrix */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-gray-100 min-h-[720px]">
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
                  className={`group relative p-2.5 flex flex-col justify-between transition-all min-h-[135px] cursor-pointer ${
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
                    {dayPosts.slice(0, 3).map((post) => {
                      const postAccounts = getAccountsForPost(post);
                      const platforms = Array.from(new Set(postAccounts.map((a) => a.platform)));
                      const timeStr = formatTimeSafe(post.scheduledFor || post.publishedAt);
                      const media = post.media && post.media.length > 0 ? post.media[0] : null;
                      const isDraggable = post.status !== 'published';

                      return (
                        <div
                          key={post.id}
                          draggable={isDraggable}
                          onDragStart={(e) => handleDragStart(e, post)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedPost(post);
                          }}
                          className={`group/card p-2 rounded-xl border text-[11px] leading-tight transition-all shadow-2xs hover:shadow-xs relative select-none ${
                            isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                          } ${
                            post.status === 'published'
                              ? 'bg-emerald-50/60 border-emerald-200/90 text-emerald-950 hover:border-emerald-300'
                              : post.status === 'scheduled'
                              ? 'bg-sky-50/70 border-sky-200/90 text-sky-950 hover:border-sky-300'
                              : post.status === 'publishing'
                              ? 'bg-amber-50/70 border-amber-200/90 text-amber-950 hover:border-amber-300'
                              : post.status === 'failed'
                              ? 'bg-rose-50 border-rose-200 text-rose-950 hover:border-rose-300'
                              : 'bg-gray-50 border-gray-200 text-gray-800'
                          }`}
                        >
                          {/* Top Row: Platforms + Time + Status */}
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <div className="flex items-center -space-x-1 shrink-0">
                              {platforms.map((pl) => (
                                <div
                                  key={pl}
                                  className="w-4.5 h-4.5 rounded-full bg-white flex items-center justify-center shadow-2xs border border-gray-200 z-10"
                                >
                                  <PlatformLogo platform={pl} className="w-2.5 h-2.5" />
                                </div>
                              ))}
                              {postAccounts.length > platforms.length && (
                                <span className="text-[9px] font-bold text-gray-500 pl-1.5">
                                  +{postAccounts.length - platforms.length}
                                </span>
                              )}
                            </div>

                            {timeStr && (
                              <span className="text-[10px] font-semibold text-gray-600 flex items-center space-x-0.5">
                                <Clock className="w-2.5 h-2.5 text-gray-400" />
                                <span>{timeStr}</span>
                              </span>
                            )}
                          </div>

                          {/* Middle: Media Thumbnail + Caption */}
                          <div className="flex items-start space-x-2">
                            {media && (
                              <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shrink-0 relative">
                                {media.type === 'video' ? (
                                  <div className="w-full h-full bg-black flex items-center justify-center">
                                    <Play className="w-3 h-3 text-white fill-white" />
                                  </div>
                                ) : (
                                  <img
                                    src={media.thumbnailUrl || media.url}
                                    alt="Asset thumbnail"
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                            )}
                            <p className="line-clamp-2 font-medium text-gray-800 text-[10px] leading-snug">
                              {post.content || '(Media post)'}
                            </p>
                          </div>

                          {/* Status Pill Indicator */}
                          <div className="mt-1.5 pt-1 border-t border-gray-100/80 flex items-center justify-between">
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-md ${
                                post.status === 'published'
                                  ? 'bg-emerald-100/80 text-emerald-800'
                                  : post.status === 'scheduled'
                                  ? 'bg-sky-100/80 text-sky-800'
                                  : post.status === 'publishing'
                                  ? 'bg-amber-100 text-amber-800'
                                  : post.status === 'failed'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-gray-200/80 text-gray-700'
                              }`}
                            >
                              {post.status}
                            </span>

                            {isDraggable && (
                              <span className="opacity-0 group-hover/card:opacity-100 text-[9px] text-gray-400 flex items-center space-x-0.5">
                                <GripVertical className="w-2.5 h-2.5" />
                                <span>drag</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

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
      )}

      {/* VIEW 2: WEEK VIEW */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="grid grid-cols-7 divide-x divide-gray-100 min-h-[620px]">
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
                  className={`flex flex-col ${
                    isDropTarget ? 'bg-emerald-50/70 ring-2 ring-emerald-500 ring-inset' : 'bg-white'
                  }`}
                >
                  {/* Column Header */}
                  <div
                    className={`p-3.5 border-b text-center border-gray-200 ${
                      isCurrentDay ? 'bg-emerald-50/60' : 'bg-gray-50/70'
                    }`}
                  >
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      {format(day, 'EEE')}
                    </div>
                    <div
                      className={`text-sm font-extrabold mt-0.5 w-7 h-7 mx-auto rounded-full flex items-center justify-center ${
                        isCurrentDay ? 'bg-emerald-600 text-white shadow-2xs' : 'text-gray-900'
                      }`}
                    >
                      {format(day, 'd')}
                    </div>
                    <div className="text-[10px] text-gray-400 font-medium mt-1">
                      {dayPosts.length} {dayPosts.length === 1 ? 'post' : 'posts'}
                    </div>
                  </div>

                  {/* Column Post Items */}
                  <div className="flex-1 p-2.5 space-y-3 overflow-y-auto">
                    {dayPosts.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center p-3 text-center text-gray-400 min-h-[140px]">
                        <button
                          onClick={() => onCreateAtDate(day)}
                          className="p-3 rounded-xl border border-dashed border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/30 text-gray-400 hover:text-emerald-700 transition-colors w-full flex flex-col items-center justify-center gap-1 group cursor-pointer"
                        >
                          <Plus className="w-4 h-4 text-gray-400 group-hover:text-emerald-600" />
                          <span className="text-[11px] font-medium">Add Post</span>
                        </button>
                      </div>
                    ) : (
                      dayPosts.map((post) => {
                        const postAccounts = getAccountsForPost(post);
                        const platforms = Array.from(new Set(postAccounts.map((a) => a.platform)));
                        const timeStr = formatTimeSafe(post.scheduledFor || post.publishedAt);
                        const media = post.media && post.media.length > 0 ? post.media[0] : null;
                        const isDraggable = post.status !== 'published';

                        return (
                          <div
                            key={post.id}
                            draggable={isDraggable}
                            onDragStart={(e) => handleDragStart(e, post)}
                            onClick={() => setInspectedPost(post)}
                            className={`bg-white border border-gray-200/90 rounded-xl p-3 shadow-2xs hover:shadow-xs hover:border-emerald-400 transition-all space-y-2.5 ${
                              isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                            }`}
                          >
                            {/* Media thumbnail */}
                            {media && (
                              <div className="w-full h-28 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 relative">
                                {media.type === 'video' ? (
                                  <div className="w-full h-full relative bg-black flex items-center justify-center">
                                    <video src={media.url} className="w-full h-full object-cover opacity-80" />
                                    <div className="absolute inset-0 flex items-center justify-center text-white">
                                      <Play className="w-6 h-6 fill-white" />
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
                            )}

                            {/* Platform logos & Time */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center -space-x-1">
                                {platforms.map((pl) => (
                                  <div
                                    key={pl}
                                    className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-2xs border border-gray-200"
                                  >
                                    <PlatformLogo platform={pl} className="w-3 h-3" />
                                  </div>
                                ))}
                              </div>

                              {timeStr && (
                                <span className="text-[11px] font-semibold text-gray-500 flex items-center space-x-1">
                                  <Clock className="w-3 h-3 text-gray-400" />
                                  <span>{timeStr}</span>
                                </span>
                              )}
                            </div>

                            {/* Caption */}
                            <p className="text-xs text-gray-800 line-clamp-2 leading-relaxed">
                              {post.content || '(Media Post)'}
                            </p>

                            {/* Status Pill */}
                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px]">
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                                  post.status === 'published'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : post.status === 'scheduled'
                                    ? 'bg-sky-50 text-sky-700'
                                    : post.status === 'publishing'
                                    ? 'bg-amber-50 text-amber-700'
                                    : post.status === 'failed'
                                    ? 'bg-rose-50 text-rose-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {post.status}
                              </span>

                              {isDraggable && (
                                <span className="text-[10px] text-gray-400 flex items-center space-x-0.5">
                                  <GripVertical className="w-3 h-3" />
                                  <span>drag to move</span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Date Inspection Modal (when clicking on a day cell) */}
      {selectedDayForModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedDayForModal(null);
          }}
        >
          <div
            ref={dayModalRef}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 text-gray-900 space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {format(selectedDayForModal, 'EEEE, MMMM d, yyyy')}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {getPostsForDay(selectedDayForModal).length} posts scheduled / published on this date
                </p>
              </div>
              <button
                onClick={() => setSelectedDayForModal(null)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of posts for selected date */}
            <div className="space-y-3">
              {getPostsForDay(selectedDayForModal).length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-xs">
                  No posts scheduled or published on this date.
                </div>
              ) : (
                getPostsForDay(selectedDayForModal).map((post) => (
                  <div
                    key={post.id}
                    onClick={() => {
                      setSelectedDayForModal(null);
                      setInspectedPost(post);
                    }}
                    className="p-3.5 rounded-xl border border-gray-200 hover:border-emerald-400 bg-white transition-all shadow-2xs cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5">
                        {getAccountsForPost(post).map((acc) => (
                          <div
                            key={acc.id}
                            className="w-5 h-5 rounded-md bg-white border border-gray-200 flex items-center justify-center shadow-2xs"
                          >
                            <PlatformLogo platform={acc.platform} className="w-3 h-3" />
                          </div>
                        ))}
                        <span className="font-semibold text-gray-800">
                          {formatTimeSafe(post.scheduledFor || post.publishedAt)}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          post.status === 'published'
                            ? 'bg-emerald-50 text-emerald-700'
                            : post.status === 'scheduled'
                            ? 'bg-sky-50 text-sky-700'
                            : post.status === 'failed'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {post.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">
                      {post.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Modal actions */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => {
                  const d = selectedDayForModal;
                  setSelectedDayForModal(null);
                  onCreateAtDate(d);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Post for this Day</span>
              </button>

              <button
                onClick={() => setSelectedDayForModal(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Post Details Modal */}
      {inspectedPost && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInspectedPost(null);
          }}
        >
          <div
            ref={postModalRef}
            className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 text-gray-900 space-y-5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold text-gray-900">Post Details</span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    inspectedPost.status === 'published'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : inspectedPost.status === 'scheduled'
                      ? 'bg-sky-50 text-sky-700 border border-sky-200'
                      : inspectedPost.status === 'failed'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {inspectedPost.status}
                </span>
              </div>
              <button
                onClick={() => {
                  setInspectedPost(null);
                  setRescheduleSuccessMsg(null);
                }}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Media asset preview */}
            {inspectedPost.media && inspectedPost.media.length > 0 && (
              <div className="rounded-xl overflow-hidden border border-gray-200 max-h-64 bg-black flex items-center justify-center">
                {inspectedPost.media[0].type === 'video' ? (
                  <video src={inspectedPost.media[0].url} controls className="w-full max-h-64 object-contain" />
                ) : (
                  <img
                    src={inspectedPost.media[0].thumbnailUrl || inspectedPost.media[0].url}
                    alt="Media preview"
                    className="w-full max-h-64 object-contain bg-gray-50"
                  />
                )}
              </div>
            )}

            {/* Target Accounts with Per-Platform Status */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                Destination Accounts ({getAccountsForPost(inspectedPost).length})
              </label>
              <div className="space-y-1.5">
                {getAccountsForPost(inspectedPost).map((acc) => {
                  const res = inspectedPost.results?.[acc.id];
                  return (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between p-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-xs"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-2xs shrink-0">
                          <PlatformLogo platform={acc.platform} className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-gray-900 block truncate">{acc.displayName}</span>
                          <span className="text-[10px] text-gray-500 capitalize">{acc.platform}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {res ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              res.status === 'success'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {res.status === 'success' ? 'Published' : 'Failed'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                            {inspectedPost.status === 'scheduled' ? 'Scheduled' : 'Draft'}
                          </span>
                        )}

                        {res?.externalPostUrl && (
                          <a
                            href={res.externalPostUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-900 transition-colors"
                            title="Open live post"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Post Caption */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                Caption
              </label>
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-800 whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto">
                {inspectedPost.content || '(No text content)'}
              </div>
            </div>

            {/* Timing details */}
            <div className="text-xs text-gray-500 space-y-1 bg-gray-50/60 p-3 rounded-xl border border-gray-200/80">
              {inspectedPost.scheduledFor && (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-600">Scheduled Publishing Time:</span>
                  <span className="font-bold text-gray-900">
                    {formatDateFullSafe(inspectedPost.scheduledFor)} at {formatTimeSafe(inspectedPost.scheduledFor)}
                  </span>
                </div>
              )}
              {inspectedPost.publishedAt && (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-600">Published Live:</span>
                  <span className="font-bold text-emerald-700">
                    {formatDateFullSafe(inspectedPost.publishedAt)} at {formatTimeSafe(inspectedPost.publishedAt)}
                  </span>
                </div>
              )}
            </div>

            {/* Accessible Quick Reschedule (Alternative to Drag & Drop) */}
            {inspectedPost.status !== 'published' && onReschedulePost && (
              <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-200/80 space-y-2">
                <label className="text-xs font-bold text-emerald-950 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Reschedule this Post</span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="datetime-local"
                    value={
                      rescheduleDateInput ||
                      formatToDateTimeLocal(inspectedPost.scheduledFor)
                    }
                    onChange={(e) => setRescheduleDateInput(e.target.value)}
                    className="text-xs bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 flex-1 text-gray-800"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const inputVal = rescheduleDateInput || formatToDateTimeLocal(inspectedPost.scheduledFor);
                      if (!inputVal) return;
                      const [dPart, tPart] = inputVal.split('T');
                      const validIso = formatLocalToUtcIso(dPart, tPart || '12:00');
                      await onReschedulePost(inspectedPost.id, validIso);
                      setRescheduleSuccessMsg('Post schedule updated!');
                      setTimeout(() => setRescheduleSuccessMsg(null), 3000);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                </div>
                {rescheduleSuccessMsg && (
                  <p className="text-[11px] text-emerald-700 font-semibold">{rescheduleSuccessMsg}</p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => {
                  const p = inspectedPost;
                  setInspectedPost(null);
                  onSelectPost(p);
                }}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>Edit in Composer</span>
              </button>

              <button
                onClick={() => {
                  setInspectedPost(null);
                  setRescheduleSuccessMsg(null);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition-colors cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
