'use client';

import React, { useState } from 'react';
import {
  Send,
  Search,
  Filter,
  Calendar,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import { PostDetailModal } from './PostDetailModal';

interface PostsViewProps {
  posts: any[];
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  onPageChange: (newPage: number) => void;
  onStatusFilter: (status: string) => void;
  onSearch: (query: string) => void;
  onRetryPost: (postId: string) => Promise<void>;
}

export const PostsView: React.FC<PostsViewProps> = ({
  posts,
  total,
  page,
  limit,
  isLoading,
  onPageChange,
  onStatusFilter,
  onSearch,
  onRetryPost,
}) => {
  const [search, setSearch] = useState('');
  const [selectedPost, setSelectedPost] = useState<any | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Posts &amp; Publishing Monitoring</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time feed of all content scheduled, drafted, and published across customer accounts.
          </p>
        </div>

        <a
          href="/api/admin/export?type=posts"
          download
          className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs w-fit"
        >
          <Download className="w-3.5 h-3.5 text-gray-500" />
          <span>Export Posts CSV</span>
        </a>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/90 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                onSearch(e.target.value);
              }}
              placeholder="Search post captions or ID..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-hidden focus:border-gray-900 transition-all text-gray-800 placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400 font-medium">Status:</span>
          <select
            onChange={(e) => onStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Posts</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
            <option value="draft">Drafts</option>
            <option value="failed">Failed Attempts</option>
          </select>
        </div>
      </div>

      {/* Posts Table */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Post &amp; Media</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Destinations</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Schedule / Publish Time</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-gray-400 animate-pulse">
                    Loading posts telemetry...
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-gray-400">
                    No posts found matching filter.
                  </td>
                </tr>
              ) : (
                posts.map((post) => {
                  const media = post.media && post.media.length > 0 ? post.media[0] : null;
                  return (
                    <tr
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className="hover:bg-gray-50/70 transition-colors cursor-pointer group"
                    >
                      {/* Caption & Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3 max-w-sm">
                          {media ? (
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                              <img src={media.url} alt="Media" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                              <Send className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate group-hover:text-emerald-700 transition-colors">
                              {post.content || '[No text caption]'}
                            </p>
                            <span className="text-[10px] text-gray-400 block font-mono">
                              #{post.id.substring(0, 14)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4 text-gray-600 font-mono text-[11px]">
                        {post.customerEmail}
                      </td>

                      {/* Destinations count */}
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        {post.targetAccountIds?.length || 0} channels
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            post.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : post.status === 'scheduled'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : post.status === 'failed'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {post.status}
                        </span>
                      </td>

                      {/* Scheduled / Published Date */}
                      <td className="py-3 px-4 text-gray-700 text-[11px]">
                        {post.publishedAt ? (
                          <span className="text-emerald-700 font-medium">
                            {new Date(post.publishedAt).toLocaleString()}
                          </span>
                        ) : post.scheduledFor ? (
                          <span className="text-blue-700 font-medium">
                            {new Date(post.scheduledFor).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-400">Unscheduled Draft</span>
                        )}
                      </td>

                      {/* Created */}
                      <td className="py-3 px-4 text-gray-400 text-[11px]">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          className="text-xs font-bold text-gray-400 group-hover:text-gray-900 transition-colors"
                        >
                          Inspect →
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div>
            Showing <strong className="text-gray-900">{posts.length}</strong> of{' '}
            <strong className="text-gray-900">{total}</strong> total posts
          </div>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-bold text-gray-700">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onRetry={onRetryPost}
        />
      )}
    </div>
  );
};
