'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';

interface CalendarViewProps {
  posts: Post[];
  accounts: SocialAccount[];
  onSelectPost: (post: Post) => void;
  onCreateAtDate: (date: Date) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  posts,
  accounts,
  onSelectPost,
  onCreateAtDate,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  const getPostsForDay = (day: Date) => {
    return posts.filter((p) => {
      const dateToCompare = p.scheduledFor || p.publishedAt || p.createdAt;
      return dateToCompare && isSameDay(new Date(dateToCompare), day);
    });
  };

  const getAccount = (id: string) => accounts.find((a) => a.id === id);

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">
      {/* Calendar Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center space-x-2">
            <CalendarIcon className="w-6 h-6 text-emerald-600" />
            <span>Content Calendar</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Visual planning, scheduling pipeline, and multi-network cross-post calendar.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'month' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-500'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'week' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-500'
              }`}
            >
              Week
            </button>
          </div>

          <div className="flex items-center space-x-1.5 bg-white border border-gray-200 rounded-xl p-1 shadow-xs">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToToday}
              className="px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-base font-bold text-gray-900 min-w-[130px] text-right">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {/* Days of week */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/70 text-center py-2.5 text-xs font-bold text-gray-500">
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
          {days.map((day) => {
            const dayPosts = getPostsForDay(day);
            const isCurrMonth = isSameMonth(day, currentMonth);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toISOString()}
                onClick={() => onCreateAtDate(day)}
                className={`group relative p-2 flex flex-col justify-between transition-colors min-h-[110px] cursor-pointer ${
                  isCurrMonth ? 'bg-white hover:bg-emerald-50/20' : 'bg-gray-50/40 text-gray-300'
                }`}
              >
                {/* Day Number and Quick Add */}
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      isCurrentDay
                        ? 'bg-emerald-500 text-white'
                        : isCurrMonth
                        ? 'text-gray-700'
                        : 'text-gray-300'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateAtDate(day);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-emerald-100 text-emerald-700 transition-opacity"
                    title="Add post for this date"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Day's scheduled posts */}
                <div className="flex-1 space-y-1.5 overflow-y-auto max-h-24 scrollbar-none">
                  {dayPosts.map((post) => {
                    const postAccounts = accounts.filter((a) => post.targetAccountIds.includes(a.id));
                    const platforms = Array.from(new Set(postAccounts.map((a) => a.platform)));

                    return (
                      <div
                        key={post.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPost(post);
                        }}
                        className={`p-1.5 rounded-lg border text-[11px] leading-tight transition-all shadow-xs cursor-pointer ${
                          post.status === 'published'
                            ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                            : post.status === 'failed'
                            ? 'bg-rose-50 border-rose-200 text-rose-900'
                            : post.status === 'draft'
                            ? 'bg-gray-50 border-gray-200 text-gray-700'
                            : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          {/* Platform icons */}
                          <div className="flex items-center -space-x-1">
                            {platforms.slice(0, 3).map((pl) => (
                              <div
                                key={pl}
                                className="w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center shadow-xs border border-gray-100"
                              >
                                <PlatformLogo platform={pl} className="w-2.5 h-2.5" />
                              </div>
                            ))}
                            {platforms.length > 3 && (
                              <span className="text-[9px] font-bold text-gray-500 pl-1.5">
                                +{platforms.length - 3}
                              </span>
                            )}
                          </div>

                          {/* Time */}
                          {post.scheduledFor && (
                            <span className="text-[9px] font-medium text-gray-500 flex items-center space-x-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{format(new Date(post.scheduledFor), 'p')}</span>
                            </span>
                          )}
                        </div>

                        <p className="line-clamp-1 font-medium">{post.content}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
