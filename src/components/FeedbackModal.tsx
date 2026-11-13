'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useClickOutside } from '@/hooks/useClickOutside';
import {
  MessageSquareHeart,
  X,
  UploadCloud,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  authUser?: any;
  currentPageName?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  authUser,
  currentPageName,
}) => {
  const [tryingToDo, setTryingToDo] = useState('');
  const [gotInWay, setGotInWay] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useClickOutside(modalRef, () => {
    if (!isSubmitting && !isUploading) {
      handleClose();
    }
  }, { enabled: isOpen });

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting]);

  if (!isOpen) return null;

  const handleClose = () => {
    setTryingToDo('');
    setGotInWay('');
    setAttachmentUrl(null);
    setAttachmentName(null);
    setErrorMessage(null);
    setIsSuccess(false);
    onClose();
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('File size exceeds 15 MB limit. Please select a smaller file or screenshot.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload screenshot');
      }

      setAttachmentUrl(data.url);
      setAttachmentName(file.name);
    } catch (err: any) {
      console.error('[FeedbackModal] Upload failed:', err);
      setErrorMessage(err?.message || 'Could not upload attachment. You can still submit your feedback text.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tryingToDo.trim()) {
      setErrorMessage('Please tell us what you were trying to do.');
      return;
    }

    if (!gotInWay.trim()) {
      setErrorMessage('Please describe what got in your way or what might help.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const pageUrl = typeof window !== 'undefined' ? window.location.href : currentPageName || '';

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tryingToDo: tryingToDo.trim(),
          gotInWay: gotInWay.trim(),
          attachmentUrl: attachmentUrl || undefined,
          pageUrl,
          userId: authUser?.id || undefined,
          userEmail: authUser?.email || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send feedback');
      }

      setIsSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 2600);
    } catch (err: any) {
      console.error('[FeedbackModal] Submission failed:', err);
      setErrorMessage(err?.message || 'Failed to submit feedback. Please check your internet connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        ref={modalRef}
        className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-200/90 flex flex-col font-sans animate-in zoom-in-95 duration-200"
      >
        {isSuccess ? (
          /* Success Screen */
          <div className="p-8 sm:p-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
              <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">
                Thank you for your feedback!
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                Our engineering team has received your note and will review it immediately to improve PlanPoster.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Form Content */
          <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-gray-100 flex items-start justify-between">
              <div className="flex items-start space-x-3 min-w-0 pr-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-2xs">
                  <MessageSquareHeart className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
                    What would help PlanPoster work better for you?
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Found an issue, bug, or have a suggestion? Let us know below.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-2.5 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Question 1: What were you trying to do? */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-900">
                    What were you trying to do?
                  </label>
                  <span className="text-[11px] font-semibold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                    Required
                  </span>
                </div>
                <div className="relative">
                  <textarea
                    rows={3}
                    maxLength={300}
                    value={tryingToDo}
                    onChange={(e) => setTryingToDo(e.target.value)}
                    placeholder="e.g. Schedule a post for my Instagram page, create a carousel, or connect a channel..."
                    className="w-full px-3.5 py-2.5 text-xs text-gray-900 bg-gray-50/70 border border-gray-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-gray-400 transition-all resize-none"
                  />
                  <span className="absolute bottom-2 right-2.5 text-[10px] font-mono text-gray-400">
                    {tryingToDo.length}/300
                  </span>
                </div>
              </div>

              {/* Question 2: What got in your way, and what might help? */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-900">
                    What got in your way, and what might help?
                  </label>
                  <span className="text-[11px] font-semibold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                    Required
                  </span>
                </div>
                <div className="relative">
                  <textarea
                    rows={3}
                    maxLength={300}
                    value={gotInWay}
                    onChange={(e) => setGotInWay(e.target.value)}
                    placeholder="e.g. The page felt slow, the preview showed an error, or the button didn't respond..."
                    className="w-full px-3.5 py-2.5 text-xs text-gray-900 bg-gray-50/70 border border-gray-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-gray-400 transition-all resize-none"
                  />
                  <div className="flex items-center justify-between mt-1 px-0.5">
                    <span className="text-[11px] text-gray-400">Let us know what would help.</span>
                    <span className="text-[10px] font-mono text-gray-400">
                      {gotInWay.length}/300
                    </span>
                  </div>
                </div>
              </div>

              {/* Optional Screenshot / Attachment Upload Box */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                  Screenshot or File (Optional)
                </label>

                {attachmentUrl ? (
                  <div className="flex items-center justify-between p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-gray-800">
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate font-medium">{attachmentName || 'Uploaded screenshot'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachmentUrl(null);
                        setAttachmentName(null);
                      }}
                      className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove attachment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files?.[0]) {
                        handleFileUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-emerald-500 bg-emerald-50/40'
                        : 'border-gray-300 hover:border-gray-400 bg-gray-50/40 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleFileUpload(e.target.files[0]);
                          e.target.value = '';
                        }
                      }}
                      className="hidden"
                    />
                    {isUploading ? (
                      <div className="flex items-center justify-center space-x-2 text-xs text-emerald-600 font-medium">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Uploading file...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                        <UploadCloud className="w-4 h-4 text-gray-400" />
                        <span>
                          <strong className="text-emerald-600 font-semibold underline underline-offset-2">
                            Upload a file
                          </strong>{' '}
                          or drag &amp; drop
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-gray-100 bg-gray-50/40 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isUploading || !tryingToDo.trim() || !gotInWay.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white transition-all shadow-xs hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center space-x-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Send Feedback</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;
