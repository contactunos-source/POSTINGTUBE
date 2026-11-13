'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquareHeart,
  RefreshCw,
  Search,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Clock,
  User,
  AlertCircle,
  Image as ImageIcon,
  Loader2,
  Calendar,
} from 'lucide-react';

interface FeedbackItem {
  id: string;
  user_id?: string;
  user_email?: string;
  trying_to_do: string;
  got_in_way: string;
  attachment_url?: string;
  page_url?: string;
  user_agent?: string;
  status: string;
  created_at: string;
}

export const FeedbackAdminView: React.FC = () => {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchFeedback = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/feedback');
      const data = await res.json();
      if (data.success && Array.isArray(data.feedback)) {
        setFeedback(data.feedback);
      }
    } catch (err) {
      console.error('[FeedbackAdminView] Failed to fetch feedback:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feedback item?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/feedback?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setFeedback((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error('[FeedbackAdminView] Delete failed:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = feedback.filter((item) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      item.user_email?.toLowerCase().includes(query) ||
      item.trying_to_do?.toLowerCase().includes(query) ||
      item.got_in_way?.toLowerCase().includes(query) ||
      item.page_url?.toLowerCase().includes(query)
    );
  });

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/90 shadow-2xs">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs">
            <MessageSquareHeart className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
                User Feedback &amp; Issues
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {feedback.length} Submissions
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Review issues, bug reports, and UX suggestions reported directly by users across your SaaS.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchFeedback}
          disabled={isLoading}
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200/80 transition-all cursor-pointer shadow-2xs hover:shadow-xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : 'text-gray-500'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-3 bg-white p-3 rounded-2xl border border-gray-200/90 shadow-2xs">
        <Search className="w-4 h-4 text-gray-400 ml-2 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by user email, problem description, or page URL..."
          className="w-full text-xs text-gray-900 bg-transparent placeholder:text-gray-400 focus:outline-hidden"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Content list */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200/90 space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
          <p className="text-xs text-gray-500 font-medium">Loading user feedback...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200/90 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto border border-gray-200">
            <MessageSquareHeart className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">No feedback submissions found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {search ? 'No feedback matches your search query.' : 'User submissions from the Share Feedback modal will appear here in real-time.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-2xs hover:shadow-xs transition-all space-y-4"
            >
              {/* Top metadata row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-xs shrink-0 border border-emerald-100">
                    {item.user_email ? item.user_email.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-gray-900 block truncate">
                      {item.user_email || 'Anonymous User'}
                    </span>
                    <span className="text-[11px] text-gray-400 font-mono">
                      {item.user_id ? `ID: ${item.user_id.slice(0, 8)}...` : 'Guest'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs text-gray-500">
                  <div className="flex items-center space-x-1 text-gray-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-[11px]">{formatDate(item.created_at)}</span>
                  </div>

                  {item.page_url && (
                    <a
                      href={item.page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-gray-50 hover:bg-gray-100 text-[11px] font-medium text-gray-600 transition-colors"
                      title={item.page_url}
                    >
                      <span className="truncate max-w-[140px]">
                        {item.page_url.replace(/^https?:\/\/[^/]+/, '') || '/'}
                      </span>
                      <ExternalLink className="w-3 h-3 text-gray-400" />
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete feedback"
                  >
                    {deletingId === item.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Questions & Answers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Question 1: What were you trying to do? */}
                <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-3.5 space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    What were you trying to do?
                  </span>
                  <p className="text-xs text-gray-900 leading-relaxed font-medium whitespace-pre-wrap">
                    {item.trying_to_do}
                  </p>
                </div>

                {/* Question 2: What got in your way, and what might help? */}
                <div className="bg-amber-50/40 border border-amber-200/70 rounded-xl p-3.5 space-y-1.5">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                    What got in your way, and what might help?
                  </span>
                  <p className="text-xs text-gray-900 leading-relaxed font-medium whitespace-pre-wrap">
                    {item.got_in_way}
                  </p>
                </div>
              </div>

              {/* Screenshot Attachment Preview if attached */}
              {item.attachment_url && (
                <div className="pt-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                    Attached Screenshot / File:
                  </span>
                  <div className="flex items-center space-x-3">
                    <img
                      src={item.attachment_url}
                      alt="User screenshot"
                      onClick={() => setPreviewImage(item.attachment_url || null)}
                      className="h-20 w-32 object-cover rounded-xl border border-gray-200 shadow-2xs cursor-pointer hover:opacity-90 transition-opacity"
                    />
                    <a
                      href={item.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>View Full Image</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewImage(null)}
        >
          <div className="max-w-4xl max-h-[90vh] bg-white p-2 rounded-2xl overflow-hidden shadow-2xl relative">
            <img
              src={previewImage}
              alt="Full preview"
              className="max-h-[85vh] w-auto object-contain rounded-xl"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackAdminView;
