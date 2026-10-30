'use client';

import React from 'react';
import {
  X,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Users,
} from 'lucide-react';
import { PlatformLogo } from '@/components/SocialIcons';

interface PostDetailModalProps {
  post: any | null;
  onClose: () => void;
  onRetry: (postId: string) => Promise<void>;
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({
  post,
  onClose,
  onRetry,
}) => {
  if (!post) return null;

  const resultsList = Object.entries(post.results || {}).map(([key, val]: any) => ({
    destinationId: key,
    ...val,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border border-gray-200/90 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-gray-900">Post Diagnostics</h2>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
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
            </div>
            <p className="text-[11px] text-gray-400 font-mono mt-0.5">ID: {post.id}</p>
          </div>

          <div className="flex items-center space-x-2">
            {post.status === 'failed' && (
              <button
                type="button"
                onClick={() => onRetry(post.id)}
                className="px-3 py-1.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Dispatch</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Post Content */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Content & Caption</span>
            <p className="text-gray-800 whitespace-pre-line leading-relaxed">
              {post.content || '[No text caption]'}
            </p>

            {/* Media thumbnail if present */}
            {post.media && post.media.length > 0 && (
              <div className="pt-2 flex items-center space-x-2 overflow-x-auto">
                {post.media.map((m: any, i: number) => (
                  <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 bg-black shrink-0">
                    {m.type === 'video' ? (
                      <video src={m.url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={m.url} alt="Attachment" className="w-full h-full object-cover" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/70">
              <span className="text-[10px] text-gray-400 block">Created</span>
              <span className="font-semibold text-gray-800 text-[11px]">
                {new Date(post.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/70">
              <span className="text-[10px] text-gray-400 block">Scheduled For</span>
              <span className="font-semibold text-gray-800 text-[11px]">
                {post.scheduledFor ? new Date(post.scheduledFor).toLocaleString() : 'N/A'}
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/70">
              <span className="text-[10px] text-gray-400 block">Published At</span>
              <span className="font-semibold text-gray-800 text-[11px]">
                {post.publishedAt ? new Date(post.publishedAt).toLocaleString() : 'N/A'}
              </span>
            </div>
          </div>

          {/* Platform API Results & Response */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Multi-Platform Dispatch Results ({resultsList.length} destinations)
            </span>

            {resultsList.length === 0 ? (
              <div className="p-4 text-center text-gray-400 bg-gray-50 rounded-xl">
                No dispatch results recorded yet (Draft or Pending queue).
              </div>
            ) : (
              <div className="space-y-2">
                {resultsList.map((res: any, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border space-y-1.5 ${
                      res.status === 'success'
                        ? 'bg-emerald-50/50 border-emerald-200/80'
                        : 'bg-rose-50/50 border-rose-200/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-gray-900 capitalize">
                          {res.platform || 'Destination'}
                        </span>
                        <span className="text-gray-400 text-[11px] font-mono">({res.destinationId})</span>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          res.status === 'success'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {res.status}
                      </span>
                    </div>

                    {res.externalPostId && (
                      <div className="text-[11px] text-gray-600">
                        Platform Post ID: <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono">{res.externalPostId}</code>
                      </div>
                    )}

                    {res.externalPostUrl && (
                      <a
                        href={res.externalPostUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-semibold text-emerald-700 hover:underline inline-flex items-center space-x-1"
                      >
                        <span>View Live Post</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {res.errorMessage && (
                      <div className="p-2 bg-rose-100/70 border border-rose-200 text-rose-800 rounded-lg text-[11px]">
                        <strong>API Error:</strong> {res.errorMessage}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
