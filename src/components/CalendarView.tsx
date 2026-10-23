'use client';

import React, { useState, useMemo } from 'react';
import { Post, SocialAccount, SocialPlatform } from '@/types/social';
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
  Send,
  MoreVertical,
  ImageIcon,
  Eye,
  Info,
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
} from 'date-fns';
import {
  parseDateSafe,
  isSameCalendarDay,
  postMatchesDay,
  formatTimeSafe,
  formatDateFullSafe,
} from '@/lib/dateUtils';

interface CalendarViewProps {
  posts: Post[];
  accounts: SocialAccount[];
  onSelectPost: (post: Post) => void;
  onCreateAtDate: (date: Date) => void;
}

type CalendarViewMode = 'month' | 'week' | 'day';

export const CalendarView: React.FC<CalendarViewProps> = ({
  posts,
  accounts,
  onSelectPost,
  onCreateAtDate,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [selectedDayForModal, setSelectedDayForModal] = useState<Date | null>(null);
  const [inspectedPost, setInspectedPost] = useState<Post | null>(null);

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

  // Retrieve posts for a specific day using robust timezone-resilient matching
  const getPostsForDay = (day: Date) => {
    return posts.filter((p) => postMatchesDay(p, day));
  };

  // Helper to get accounts for a post
  const getAccountsForPost = (post: Post): SocialAccount[] => {
    const matched = accounts.filter((a) => post.targetAccountIds.includes(a.id));
    return matched.length > 0 ? matched : accounts.slice(0, 1);
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
            Visual planning, multi-platform publishing schedule, and timeline pipeline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Switcher: Month | Week | Day */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl shadow-2xs">
            {(['month', 'week', 'day'] as const).map((mode) => (
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
          <span className="text-sm md:text-base font-bold text-gray-900 min-w-[150px] text-right">
            {headerTitle}
          </span>
        </div>
      </div>

      {/* VIEW 1: MONTH VIEW */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/80 text-center py-2.5 text-xs font-bold text-gray-600">
            <div>SUN</div>
            <div>MON</div>
            <div>TUE</div>
            <div>WED</div>
            <div>THU</div>
            <div>FRI</div>
            <div>SAT</div>
          </div>

          {/* Days matrix */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-gray-100 min-h-[640px]">
            {monthDays.map((day) => {
              const dayPosts = getPostsForDay(day);
              const isCurrMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDayForModal(day)}
                  className={`group relative p-2 flex flex-col justify-between transition-colors min-h-[115px] cursor-pointer ${
                    isCurrMonth ? 'bg-white hover:bg-emerald-50/15' : 'bg-gray-50/50 text-gray-400'
                  }`}
                >
                  {/* Day Number and Quick Add */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isCurrentDay
                          ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                          : isCurrMonth
                          ? 'text-gray-800'
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
                  <div className="flex-1 space-y-1.5 overflow-y-auto max-h-24 scrollbar-none">
                    {dayPosts.slice(0, 3).map((post) => {
                      const postAccounts = getAccountsForPost(post);
                      const platforms = Array.from(new Set(postAccounts.map((a) => a.platform)));
                      const timeStr = formatTimeSafe(post.scheduledFor || post.publishedAt);

                      return (
                        <div
                          key={post.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedPost(post);
                          }}
                          className={`p-1.5 rounded-lg border text-[11px] leading-tight transition-all shadow-2xs cursor-pointer hover:shadow-xs ${
                            post.status === 'published'
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 hover:border-emerald-300'
                              : post.status === 'scheduled'
                              ? 'bg-sky-50/80 border-sky-200 text-sky-950 hover:border-sky-300'
                              : post.status === 'failed'
                              ? 'bg-rose-50 border-rose-200 text-rose-950 hover:border-rose-300'
                              : 'bg-gray-50 border-gray-200 text-gray-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            {/* Platform logos */}
                            <div className="flex items-center -space-x-1">
                              {platforms.map((pl) => (
                                <div
                                  key={pl}
                                  className="w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-2xs border border-gray-100"
                                >
                                  <PlatformLogo platform={pl} className="w-2.5 h-2.5" />
                                </div>
                              ))}
                            </div>

                            {/* Time */}
                            {timeStr && (
                              <span className="text-[9px] font-semibold text-gray-500 flex items-center space-x-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{timeStr}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-1">
                            {post.media && post.media.length > 0 && (
                              <ImageIcon className="w-2.5 h-2.5 text-gray-400 shrink-0" />
                            )}
                            <p className="line-clamp-1 font-medium text-gray-800 text-[10px]">
                              {post.content}
                            </p>
                          </div>
                        </div>
                      );
                    })}

                    {dayPosts.length > 3 && (
                      <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50/80 rounded px-1.5 py-0.5 text-center">
                        +{dayPosts.length - 3} more
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
          <div className="grid grid-cols-7 divide-x divide-gray-100 min-h-[580px]">
            {weekDays.map((day) => {
              const dayPosts = getPostsForDay(day);
              const isCurrentDay = isToday(day);

              return (
                <div key={day.toISOString()} className="flex flex-col bg-white">
                  {/* Column Header */}
                  <div
                    className={`p-3 border-b text-center border-gray-200 ${
                      isCurrentDay ? 'bg-emerald-50/50' : 'bg-gray-50/60'
                    }`}
                  >
                    <div className="text-[11px] font-bold text-gray-500 uppercase">
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
                  <div className="flex-1 p-2 space-y-2.5 overflow-y-auto">
                    {dayPosts.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center p-3 text-center text-gray-400">
                        <button
                          onClick={() => onCreateAtDate(day)}
                          className="p-2 rounded-xl border border-dashed border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/30 text-gray-400 hover:text-emerald-700 transition-colors w-full flex flex-col items-center justify-center gap-1 group cursor-pointer"
                        >
                          <Plus className="w-4 h-4 text-gray-400 group-hover:text-emerald-600" />
                          <span className="text-[10px] font-medium">Add Post</span>
                        </button>
                      </div>
                    ) : (
                      dayPosts.map((post) => {
                        const postAccounts = getAccountsForPost(post);
                        const platforms = Array.from(new Set(postAccounts.map((a) => a.platform)));
                        const timeStr = formatTimeSafe(post.scheduledFor || post.publishedAt);
                        const media = post.media && post.media.length > 0 ? post.media[0] : null;

                        return (
                          <div
                            key={post.id}
                            onClick={() => setInspectedPost(post)}
                            className="bg-white border border-gray-200/90 rounded-xl p-2.5 shadow-2xs hover:shadow-xs hover:border-emerald-400 transition-all cursor-pointer space-y-2"
                          >
                            {/* Media thumbnail if exists */}
                            {media && (
                              <div className="w-full h-24 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 relative">
                                {media.type === 'video' ? (
                                  <div className="w-full h-full relative">
                                    <video src={media.url} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white">
                                      <Play className="w-5 h-5 fill-white" />
                                    </div>
                                  </div>
                                ) : (
                                  <img
                                    src={media.thumbnailUrl || media.url}
                                    alt="Preview"
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
                                    className="w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-2xs border border-gray-100"
                                  >
                                    <PlatformLogo platform={pl} className="w-2.5 h-2.5" />
                                  </div>
                                ))}
                              </div>

                              {timeStr && (
                                <span className="text-[10px] font-semibold text-gray-500">
                                  {timeStr}
                                </span>
                              )}
                            </div>

                            {/* Caption */}
                            <p className="text-xs text-gray-800 line-clamp-2 font-normal leading-relaxed">
                              {post.content}
                            </p>

                            {/* Status Pill */}
                            <div className="pt-1 border-t border-gray-100 flex items-center justify-between text-[10px]">
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold ${
                                  post.status === 'published'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : post.status === 'scheduled'
                                    ? 'bg-sky-50 text-sky-700'
                                    : post.status === 'failed'
                                    ? 'bg-rose-50 text-rose-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {post.status.toUpperCase()}
                              </span>
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

      {/* VIEW 3: DAY VIEW */}
      {viewMode === 'day' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-6">
          {/* Day summary row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                {format(currentDate, 'EEEE, MMMM d, yyyy')}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {getPostsForDay(currentDate).length} posts planned or published on this date
              </p>
            </div>

            <button
              onClick={() => onCreateAtDate(currentDate)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-xl text-xs shadow-xs transition-colors flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Post for Today</span>
            </button>
          </div>

          {/* Posts for the day */}
          <div className="space-y-4">
            {getPostsForDay(currentDate).length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl p-6">
                <CalendarIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-gray-800">No posts on this date</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  There are no scheduled or published posts for this date.
                </p>
                <button
                  onClick={() => onCreateAtDate(currentDate)}
                  className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Schedule a post now
                </button>
              </div>
            ) : (
              getPostsForDay(currentDate).map((post) => {
                const postAccounts = getAccountsForPost(post);
                const timeStr = formatTimeSafe(post.scheduledFor || post.publishedAt, '12:00 PM');
                const hasMedia = post.media && post.media.length > 0;
                const media = hasMedia ? post.media[0] : null;

                return (
                  <div
                    key={post.id}
                    onClick={() => setInspectedPost(post)}
                    className="p-5 rounded-2xl border border-gray-200/90 bg-white hover:border-emerald-400 transition-all shadow-2xs hover:shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5 cursor-pointer"
                  >
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Media preview */}
                      {media && (
                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-50 border border-gray-200 shrink-0">
                          {media.type === 'video' ? (
                            <video src={media.url} className="w-full h-full object-cover" />
                          ) : (
                            <img
                              src={media.thumbnailUrl || media.url}
                              alt="Media"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      )}

                      <div className="space-y-2 flex-1">
                        {/* Target Accounts with icons */}
                        <div className="flex flex-wrap items-center gap-2">
                          {postAccounts.map((acc) => (
                            <div
                              key={acc.id}
                              className="flex items-center space-x-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2 py-0.5 text-xs text-gray-700 font-medium"
                            >
                              <PlatformLogo platform={acc.platform} className="w-3 h-3" />
                              <span>{acc.displayName || acc.username}</span>
                            </div>
                          ))}
                        </div>

                        <p className="text-xs md:text-sm text-gray-800 line-clamp-2 leading-relaxed">
                          {post.content}
                        </p>

                        <div className="flex items-center space-x-3 text-[11px] text-gray-500">
                          <span className="flex items-center space-x-1 font-semibold text-gray-700">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span>{timeStr}</span>
                          </span>
                          <span>•</span>
                          <span
                            className={`font-bold px-2 py-0.5 rounded ${
                              post.status === 'published'
                                ? 'bg-emerald-50 text-emerald-700'
                                : post.status === 'scheduled'
                                ? 'bg-sky-50 text-sky-700'
                                : post.status === 'failed'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {post.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-end md:self-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPost(post);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 transition-colors flex items-center space-x-1"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Date Inspection Drawer / Modal (when clicking a day in Month view) */}
      {selectedDayForModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 text-gray-900 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {format(selectedDayForModal, 'EEEE, MMMM d, yyyy')}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {getPostsForDay(selectedDayForModal).length} posts on this day
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
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          post.status === 'published'
                            ? 'bg-emerald-50 text-emerald-700'
                            : post.status === 'scheduled'
                            ? 'bg-sky-50 text-sky-700'
                            : post.status === 'failed'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {post.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed font-normal">
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
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Post for this Day</span>
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

      {/* Single Post Inspection Modal */}
      {inspectedPost && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 text-gray-900 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-gray-900">Post Details</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    inspectedPost.status === 'published'
                      ? 'bg-emerald-50 text-emerald-700'
                      : inspectedPost.status === 'scheduled'
                      ? 'bg-sky-50 text-sky-700'
                      : inspectedPost.status === 'failed'
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {inspectedPost.status.toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => setInspectedPost(null)}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Media thumbnail */}
            {inspectedPost.media && inspectedPost.media.length > 0 && (
              <div className="rounded-xl overflow-hidden border border-gray-200 max-h-52 bg-gray-50 flex items-center justify-center">
                {inspectedPost.media[0].type === 'video' ? (
                  <video src={inspectedPost.media[0].url} controls className="w-full h-full object-cover" />
                ) : (
                  <img
                    src={inspectedPost.media[0].thumbnailUrl || inspectedPost.media[0].url}
                    alt="Media preview"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            )}

            {/* Target Accounts */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Target Accounts
              </label>
              <div className="flex flex-wrap gap-2">
                {getAccountsForPost(inspectedPost).map((acc) => (
                  <div
                    key={acc.id}
                    className="flex items-center space-x-2 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1 text-xs"
                  >
                    <PlatformLogo platform={acc.platform} className="w-3.5 h-3.5" />
                    <span className="font-semibold text-gray-800">{acc.displayName}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Caption */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Caption
              </label>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-800 whitespace-pre-line leading-relaxed">
                {inspectedPost.content}
              </div>
            </div>

            {/* Timing details */}
            <div className="text-xs text-gray-500 space-y-1">
              {inspectedPost.scheduledFor && (
                <div>
                  <span className="font-semibold text-gray-700">Scheduled:</span>{' '}
                  {formatDateFullSafe(inspectedPost.scheduledFor)} at{' '}
                  {formatTimeSafe(inspectedPost.scheduledFor)}
                </div>
              )}
              {inspectedPost.publishedAt && (
                <div>
                  <span className="font-semibold text-gray-700">Published:</span>{' '}
                  {formatDateFullSafe(inspectedPost.publishedAt)} at{' '}
                  {formatTimeSafe(inspectedPost.publishedAt)}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => {
                  const p = inspectedPost;
                  setInspectedPost(null);
                  onSelectPost(p);
                }}
                className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>Edit Post</span>
              </button>

              <button
                onClick={() => setInspectedPost(null)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition-colors cursor-pointer"
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
