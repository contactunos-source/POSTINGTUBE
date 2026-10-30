'use client';

import React, { useState, useMemo } from 'react';
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
  User,
  Layers,
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
  onOpenUserProfile?: (userEmailOrId: string) => void;
  users?: Array<{ id: string; email: string; fullName?: string }>;
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
  onOpenUserProfile,
  users = [],
}) => {
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  const [selectedPost, setSelectedPost] = useState<any | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Derive unique customers from posts and passed users
  const customerList = useMemo(() => {
    const map = new Map<string, { email: string; name: string }>();
    for (const u of users) {
      if (u.email) {
        map.set(u.email.toLowerCase(), { email: u.email, name: u.fullName || u.email });
      }
    }
    for (const p of posts) {
      if (p.customerEmail && !map.has(p.customerEmail.toLowerCase())) {
        map.set(p.customerEmail.toLowerCase(), {
          email: p.customerEmail,
          name: p.customerName || p.customerEmail,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.email.localeCompare(b.email));
  }, [posts, users]);

  // Client-side customer filter
  const displayedPosts = useMemo(() => {
    if (selectedCustomer === 'all') return posts;
    return posts.filter(
      (p) =>
        p.customerEmail?.toLowerCase() === selectedCustomer.toLowerCase() ||
        p.userId === selectedCustomer
    );
  }, [posts, selectedCustomer]);

  // Metric counts across currently loaded posts
  const postMetrics = useMemo(() => {
    let published = 0;
    let scheduled = 0;
    let draft = 0;
    let failed = 0;

    for (const p of posts) {
      if (p.status === 'published') published++;
      else if (p.status === 'scheduled') scheduled++;
      else if (p.status === 'draft') draft++;
      else if (p.status === 'failed') failed++;
    }

    return { total, published, scheduled, draft, failed };
  }, [posts, total]);

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

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/90 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Recorded</div>
          <div className="text-xl font-black text-gray-900 mt-1">{postMetrics.total}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">All customer posts</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/90 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Published</div>
          <div className="text-xl font-black text-emerald-600 mt-1">{postMetrics.published}</div>
          <div className="text-[10px] text-emerald-600/80 mt-0.5 font-medium">Successfully live</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/90 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Scheduled</div>
          <div className="text-xl font-black text-blue-600 mt-1">{postMetrics.scheduled}</div>
          <div className="text-[10px] text-blue-600/80 mt-0.5 font-medium">Queued in scheduler</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/90 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Drafts &amp; Failed</div>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <span className="text-xl font-black text-gray-700">{postMetrics.draft} drafts</span>
            <span className="text-xs text-gray-400">/</span>
            <span className={`text-xs font-bold ${postMetrics.failed > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
              {postMetrics.failed} failed
            </span>
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">Drafts &amp; errors</div>
        </div>
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

        {/* Customer Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400 font-medium">Customer:</span>
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-hidden cursor-pointer max-w-[200px] truncate font-medium"
          >
            <option value="all">All Customers ({customerList.length})</option>
            {customerList.map((c) => (
              <option key={c.email} value={c.email}>
                {c.name !== c.email ? `${c.name} (${c.email})` : c.email}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
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

      {/* Selected Customer Filter Banner */}
      {selectedCustomer !== 'all' && (
        <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-3.5 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5">
            <User className="w-4 h-4 text-emerald-700" />
            <span className="text-emerald-950 font-medium">
              Filtering posts for customer:{' '}
              <strong className="font-mono text-emerald-900 font-bold">{selectedCustomer}</strong> (
              {displayedPosts.length} posts found)
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {onOpenUserProfile && (
              <button
                type="button"
                onClick={() => onOpenUserProfile(selectedCustomer)}
                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs inline-flex items-center space-x-1 transition-colors cursor-pointer shadow-xs"
              >
                <span>View Full Customer Profile</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedCustomer('all')}
              className="px-2.5 py-1.5 rounded-xl text-gray-600 hover:bg-emerald-100 text-xs font-semibold cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      )}

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
              ) : displayedPosts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-gray-400">
                    No posts found matching filter.
                  </td>
                </tr>
              ) : (
                displayedPosts.map((post) => {
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
                      <td
                        className="py-3 px-4"
                        onClick={(e) => {
                          if (onOpenUserProfile && (post.customerEmail || post.userId)) {
                            e.stopPropagation();
                            onOpenUserProfile(post.customerEmail || post.userId);
                          }
                        }}
                      >
                        <div className="flex items-center space-x-1.5">
                          <span className="text-gray-700 font-mono text-[11px] truncate max-w-[170px]" title={post.customerEmail}>
                            {post.customerEmail}
                          </span>
                          {onOpenUserProfile && (
                            <button
                              type="button"
                              className="text-gray-400 hover:text-emerald-700 p-0.5 rounded-sm hover:bg-gray-100 transition-colors"
                              title="View Customer Profile"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {post.customerName && post.customerName !== post.customerEmail && (
                          <span className="text-[10px] text-gray-400 block truncate">{post.customerName}</span>
                        )}
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
            Showing <strong className="text-gray-900">{displayedPosts.length}</strong> of{' '}
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
