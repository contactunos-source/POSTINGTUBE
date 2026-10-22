'use client';

import React, { useState } from 'react';
import { Post, SocialAccount, PostStatus } from '@/types/social';
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
  BarChart2,
  Tag,
  Pin,
  ChevronDown,
  Check,
  Filter,
} from 'lucide-react';
import { format } from 'date-fns';

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
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>(initialStatusFilter);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPostForDetails, setSelectedPostForDetails] = useState<Post | null>(null);
  const [menuOpenPostId, setMenuOpenPostId] = useState<string | null>(null);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  const filterLabels: Record<PostStatus | 'all', string> = {
    all: 'All Posts',
    published: 'Published',
    scheduled: 'Scheduled',
    draft: 'Drafts',
    failed: 'Failed',
    publishing: 'Publishing',
    needs_approval: 'Needs Approval',
  };

  const filteredPosts = posts.filter((p) => {
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesSearch =
      p.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Helper to format post time
  const getPostTime = (post: Post): string => {
    const dateStr = post.publishedAt || post.scheduledFor || post.createdAt;
    try {
      return format(new Date(dateStr), 'h:mm a');
    } catch {
      return '3:00 PM';
    }
  };

  // Helper to group by date
  const getGroupDateKey = (post: Post): string => {
    const dateStr = post.publishedAt || post.scheduledFor || post.createdAt;
    try {
      const date = new Date(dateStr);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return `Today, ${format(date, 'MMMM d')}`;
      } else if (date.toDateString() === yesterday.toDateString()) {
        return `Yesterday, ${format(date, 'MMMM d')}`;
      } else {
        return format(date, 'EEEE, MMMM d');
      }
    } catch {
      return 'Today, October 22';
    }
  };

  // Helper to find live Facebook URL
  const getLivePostUrl = (post: Post): string => {
    if (post.results) {
      for (const key of Object.keys(post.results)) {
        const res = post.results[key];
        if (res.externalPostUrl) return res.externalPostUrl;
        if (res.externalPostId) return `https://www.facebook.com/${res.externalPostId}`;
      }
    }
    return 'https://www.facebook.com/868941086292404';
  };

  // Group posts by date
  const groupedPosts: { [key: string]: Post[] } = {};
  filteredPosts.forEach((post) => {
    const groupKey = getGroupDateKey(post);
    if (!groupedPosts[groupKey]) {
      groupedPosts[groupKey] = [];
    }
    groupedPosts[groupKey].push(post);
  });

  const defaultAccount = accounts[0] || {
    displayName: 'U NOS Digital marketing',
    username: 'unosdigitalmarketing',
    platform: 'facebook',
    avatarUrl:
      'https://scontent.fhyd14-1.fna.fbcdn.net/v/t39.30808-1/559110494_122093677857072386_1644291893333566859_n.jpg?stp=dst-jpg_s200x200_tt6&_nc_cat=106&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=f907e8&_nc_ohc=tZoTblvaavEQ7kNvwEoCgQP&_nc_oc=Adp-VJrC03UjJKc0eeWkndk_bQZPtDzqLtNVTu_efYErldQBYTFQrNsyYaDSJsqHagfB18iseyANs9DLPrcaiiPy&_nc_zt=24&_nc_ht=scontent.fhyd14-1.fna&edm=AJdBtusEAAAA&_nc_gid=SucoqeYkwX8jiJ9x6-GprA&_nc_tpa=Q5bMBQJ0aTi1Z9bXXMOqSGXbXOfKZ9TulrS_k4YePsv0_8e45yLFosLLewPqFETuRjLJNux4THkAfvVEgw&oh=00_AQP6T9kysTTUwD2oMayNWxc21earpv63aKQTdnT9Ts7htQ&oe=6ADF9E9C',
  };

  return (
    <div className="min-h-full bg-slate-50/60 text-gray-900 p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Top Controls: Single Unified "Posts" Filter Dropdown + Search + Create */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-4 border-b border-gray-200/80">
          <div className="flex items-center space-x-3">
            {/* Unified Single Filter Dropdown: replaces 5 separate buttons */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                className="flex items-center space-x-2 bg-white hover:bg-gray-50 border border-gray-200 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-800 shadow-2xs transition-colors"
              >
                <Filter className="w-3.5 h-3.5 text-gray-500" />
                <span>{filterLabels[statusFilter] || 'Posts'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-1" />
              </button>

              {isFilterDropdownOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-50 text-xs">
                  {(['all', 'published', 'scheduled', 'draft', 'failed'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        setStatusFilter(tab);
                        setIsFilterDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${
                        statusFilter === tab
                          ? 'bg-emerald-50 text-emerald-700 font-semibold'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span>{filterLabels[tab]}</span>
                      {statusFilter === tab && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="text-xs text-gray-400 font-medium">
              {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Search Input */}
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-800 placeholder:text-gray-400 focus:outline-hidden focus:border-emerald-500 shadow-2xs"
              />
            </div>

            {/* Create Post Button */}
            <button
              onClick={openCreateModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-xl text-xs shadow-xs transition-all flex items-center space-x-1.5"
            >
              <span>+ Create Post</span>
            </button>
          </div>
        </div>

        {/* Empty State in Original Clean Light Theme */}
        {filteredPosts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 p-8 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">No posts found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {statusFilter === 'published'
                ? 'You have not published any posts yet. Schedule or create a post to see it live here.'
                : 'There are no posts matching this filter.'}
            </p>
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Create your first post
            </button>
          </div>
        ) : (
          /* Grouped Date Sections in Original Light Theme */
          <div className="space-y-8">
            {Object.keys(groupedPosts).map((dateKey) => (
              <div key={dateKey} className="space-y-4">
                {/* Date Header: Today, October 22 */}
                <h3 className="text-sm font-bold text-gray-800 tracking-tight">
                  {dateKey}
                </h3>

                {/* Posts Timeline Items */}
                <div className="space-y-6">
                  {groupedPosts[dateKey].map((post) => {
                    const postTime = getPostTime(post);
                    const liveUrl = getLivePostUrl(post);
                    const hasMedia = post.media && post.media.length > 0;
                    const mediaItem = hasMedia ? post.media[0] : null;

                    // Match target account
                    const targetAcc =
                      accounts.find((a) => post.targetAccountIds?.includes(a.id)) || defaultAccount;

                    return (
                      <div key={post.id} className="flex items-start gap-6">
                        {/* Left Time Column */}
                        <div className="w-24 shrink-0 pt-2 text-right">
                          <div className="text-sm font-bold text-gray-900 tracking-tight">
                            {postTime}
                          </div>
                          <div className="text-xs text-gray-400 flex items-center justify-end space-x-1 mt-0.5">
                            <Pin className="w-3 h-3 text-gray-400" />
                            <span>Custom</span>
                          </div>
                        </div>

                        {/* Right Post Card in Light Theme */}
                        <div className="flex-1 bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs text-gray-900 transition-all hover:border-gray-300">
                          {/* Upper Section: Author, Text, and Right Media Thumbnail */}
                          <div className="flex items-start justify-between gap-4">
                            {/* Left Text / Info */}
                            <div className="flex-1 min-w-0">
                              {/* Author Header */}
                              <div className="flex items-center space-x-3">
                                <div className="relative">
                                  <img
                                    src={targetAcc.avatarUrl}
                                    alt={targetAcc.displayName}
                                    className="w-10 h-10 rounded-xl object-cover border border-gray-200"
                                  />
                                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#1877F2] flex items-center justify-center text-white border border-white shadow-xs">
                                    <PlatformLogo platform={targetAcc.platform} className="w-2.5 h-2.5" />
                                  </div>
                                </div>

                                <div>
                                  <h4 className="text-sm font-bold text-gray-900 leading-tight">
                                    {targetAcc.displayName}
                                  </h4>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    Hyderabad, India
                                  </p>
                                </div>
                              </div>

                              {/* Caption Text */}
                              <div className="mt-3 text-sm text-gray-800 whitespace-pre-line leading-relaxed break-words font-normal">
                                {post.content}
                              </div>

                              {/* Tag Pill at bottom-left */}
                              <div className="mt-3 flex items-center space-x-2">
                                <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors cursor-pointer">
                                  <Tag className="w-3.5 h-3.5" />
                                </div>
                                {post.tags &&
                                  post.tags.map((t) => (
                                    <span
                                      key={t}
                                      className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-medium"
                                    >
                                      #{t}
                                    </span>
                                  ))}
                              </div>
                            </div>

                            {/* Right Media Thumbnail */}
                            {mediaItem && (
                              <div className="w-36 h-36 rounded-xl overflow-hidden shrink-0 border border-gray-200 bg-gray-50">
                                {mediaItem.type === 'video' ? (
                                  <video src={mediaItem.url} className="w-full h-full object-cover" />
                                ) : (
                                  <img
                                    src={
                                      mediaItem.thumbnailUrl && !mediaItem.thumbnailUrl.startsWith('blob:')
                                        ? mediaItem.thumbnailUrl
                                        : mediaItem.url
                                    }
                                    alt="Post media preview"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      if (mediaItem.url && e.currentTarget.src !== mediaItem.url) {
                                        e.currentTarget.src = mediaItem.url;
                                      }
                                    }}
                                  />
                                )}
                              </div>
                            )}
                          </div>

                          {/* Middle Metrics / Analytics Bar in Light Theme */}
                          <div className="pt-3 mt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center space-x-6 overflow-x-auto scrollbar-none py-1">
                              <div className="flex items-center space-x-1.5 hover:text-gray-800 cursor-pointer">
                                <ThumbsUp className="w-3.5 h-3.5 text-gray-400" />
                                <span>Reactions</span>
                                <span className="text-gray-900 font-bold ml-1">0</span>
                              </div>

                              <div className="flex items-center space-x-1.5 hover:text-gray-800 cursor-pointer">
                                <MessageCircle className="w-3.5 h-3.5 text-gray-400" />
                                <span>Comments</span>
                                <span className="text-gray-900 font-bold ml-1">0</span>
                              </div>

                              <div className="flex items-center space-x-1.5 hover:text-gray-800 cursor-pointer">
                                <Activity className="w-3.5 h-3.5 text-gray-400" />
                                <span>Eng. Rate</span>
                                <span className="text-gray-900 font-bold ml-1">-</span>
                              </div>

                              <div className="flex items-center space-x-1.5 hover:text-gray-800 cursor-pointer">
                                <Eye className="w-3.5 h-3.5 text-gray-400" />
                                <span>Impressions</span>
                                <span className="text-gray-900 font-bold ml-1">-</span>
                              </div>

                              <div className="flex items-center space-x-1.5 hover:text-gray-800 cursor-pointer">
                                <Share2 className="w-3.5 h-3.5 text-gray-400" />
                                <span>Shares</span>
                                <span className="text-gray-900 font-bold ml-1">0</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                              title="Detailed Post Analytics"
                            >
                              <BarChart2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Bottom Footer Row */}
                          <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between">
                            <div className="text-xs text-gray-500 flex items-center space-x-1.5">
                              <span>Published via</span>
                              <span className="text-gray-800 font-semibold flex items-center space-x-1">
                                <PlatformLogo platform={targetAcc.platform} className="w-3.5 h-3.5 inline" />
                                <span className="capitalize">{targetAcc.platform}</span>
                              </span>
                            </div>

                            <div className="flex items-center space-x-2">
                              {post.status === 'scheduled' && (
                                <button
                                  onClick={() => onPublishNow(post)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center space-x-1 shadow-2xs transition-colors"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Publish Now</span>
                                </button>
                              )}

                              {post.status === 'failed' && (
                                <button
                                  onClick={() => onRetryPost(post)}
                                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center space-x-1 transition-colors"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Retry</span>
                                </button>
                              )}

                              {/* Go to post button linking to live Facebook post */}
                              <a
                                href={liveUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3.5 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-gray-200/80 shadow-2xs"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                                <span>Go to post</span>
                              </a>

                              {/* Actions Menu */}
                              <div className="relative">
                                <button
                                  onClick={() =>
                                    setMenuOpenPostId(menuOpenPostId === post.id ? null : post.id)
                                  }
                                  className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors border border-gray-200"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {menuOpenPostId === post.id && (
                                  <div className="absolute right-0 bottom-full mb-1 w-36 bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-50 text-xs">
                                    <button
                                      onClick={() => {
                                        onEditPost(post);
                                        setMenuOpenPostId(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-700 flex items-center space-x-1.5"
                                    >
                                      <FileEdit className="w-3.5 h-3.5 text-gray-500" />
                                      <span>Edit</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedPostForDetails(post);
                                        setMenuOpenPostId(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-700 flex items-center space-x-1.5"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                                      <span>Logs</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        onDeletePost(post.id);
                                        setMenuOpenPostId(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center space-x-1.5"
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

        {/* Execution Results Log Modal */}
        {selectedPostForDetails && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 text-gray-900">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                <h3 className="text-sm font-bold text-gray-900">Publishing Dispatch Logs</h3>
                <button
                  onClick={() => setSelectedPostForDetails(null)}
                  className="text-gray-400 hover:text-gray-700 text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto text-xs">
                <pre className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-gray-800 overflow-x-auto text-[11px] font-mono">
                  {JSON.stringify(selectedPostForDetails.results || {}, null, 2)}
                </pre>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setSelectedPostForDetails(null)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700"
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
