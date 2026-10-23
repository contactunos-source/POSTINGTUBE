'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Post,
  SocialAccount,
  SocialPlatform,
  PostType,
  PostMedia,
} from '@/types/social';
import { PlatformLogo } from './SocialIcons';
import {
  Calendar,
  Clock,
  Info,
  Upload,
  FileImage,
  Video,
  X,
  ChevronDown,
  Sparkles,
  Check,
  Send,
  Save,
  ArrowLeft,
  Search,
  Filter,
  CheckCircle2,
  Layers,
  FileUp,
  Smile,
  Hash,
  Link as LinkIcon,
  MessageSquare,
  Users,
  Eye,
  RotateCcw,
  Crop,
  ShieldCheck,
  Zap,
  Globe,
  Share2,
  ThumbsUp,
  Bookmark,
  MoreHorizontal,
  Flame,
  CheckCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { parseDateSafe } from '@/lib/dateUtils';

interface CreatePostDashboardProps {
  postType: 'text' | 'image' | 'video';
  accounts: SocialAccount[];
  initialPost?: Partial<Post>;
  onSave: (postData: Partial<Post>, action: 'schedule' | 'publish-now' | 'draft') => Promise<void>;
  onBack: () => void;
  openAiModal: (initialPrompt: string, onGenerated: (caption: string) => void) => void;
}

export const CreatePostDashboard: React.FC<CreatePostDashboardProps> = ({
  postType: initialPostType,
  accounts,
  initialPost,
  onSave,
  onBack,
  openAiModal,
}) => {
  // Allow user to switch post type directly in this dashboard
  const [currentPostType, setCurrentPostType] = useState<'text' | 'image' | 'video'>(initialPostType);

  // Accounts state
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pb_remembered_accounts');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
    }
    return initialPost?.targetAccountIds || (accounts.length > 0 ? [accounts[0].id] : []);
  });

  const [rememberAccounts, setRememberAccounts] = useState(true);
  const [accountSearch, setAccountSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [showPlatformFilterMenu, setShowPlatformFilterMenu] = useState(false);

  // Content states
  const [mainCaption, setMainCaption] = useState<string>(initialPost?.content || '');
  const [mediaList, setMediaList] = useState<PostMedia[]>(initialPost?.media || []);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Advanced configurations
  const [firstComment, setFirstComment] = useState(initialPost?.firstComment || '');
  const [destinationLink, setDestinationLink] = useState('');
  const [collaborators, setCollaborators] = useState(initialPost?.collaborators || '');
  const [isAiGenerated, setIsAiGenerated] = useState(initialPost?.isAiGenerated || false);
  const [activeConfigTab, setActiveConfigTab] = useState<'none' | 'comment' | 'link' | 'collab' | 'overrides'>('none');

  // Aspect ratio crop simulator (1:1, 4:5, 9:16, 16:9, original)
  const [aspectRatio, setAspectRatio] = useState<'original' | '1:1' | '4:5' | '9:16' | '16:9'>('original');

  // Scheduling states (Mode: 'schedule' vs 'instant')
  const [scheduleMode, setScheduleMode] = useState<'schedule' | 'instant'>('schedule');
  const [scheduledDate, setScheduledDate] = useState(() => {
    if (initialPost?.scheduledFor) {
      const d = parseDateSafe(initialPost.scheduledFor);
      if (d) {
        return format(d, 'yyyy-MM-dd');
      }
    }
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [scheduledTime, setScheduledTime] = useState(() => {
    if (initialPost?.scheduledFor) {
      const d = parseDateSafe(initialPost.scheduledFor);
      if (d) {
        return format(d, 'HH:mm');
      }
    }
    return '14:00';
  });

  // Preview tab on the right
  const [activeRightTab, setActiveRightTab] = useState<'schedule' | 'preview'>('schedule');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Listen for clipboard paste (Ctrl+V) anywhere on the page to paste images directly!
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
        handleFiles(e.clipboardData.files);
        showToast('Image pasted from clipboard!');
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Filter accounts by search & platform
  const displayedAccounts = useMemo(() => {
    return accounts.filter((a) => {
      const matchSearch =
        a.displayName.toLowerCase().includes(accountSearch.toLowerCase()) ||
        a.username.toLowerCase().includes(accountSearch.toLowerCase());
      const matchPlatform = platformFilter === 'all' || a.platform === platformFilter;
      return matchSearch && matchPlatform;
    });
  }, [accounts, accountSearch, platformFilter]);

  const activeAccount = accounts.find((a) => selectedAccountIds.includes(a.id)) || accounts[0] || {
    id: 'fb_default',
    displayName: 'U NOS Digital marketing',
    username: 'unosdigitalmarketing',
    platform: 'facebook' as SocialPlatform,
    avatarUrl: '',
  };

  // Toggle account
  const handleToggleAccount = (id: string) => {
    let next: string[];
    if (selectedAccountIds.includes(id)) {
      if (selectedAccountIds.length === 1) return; // Keep at least one
      next = selectedAccountIds.filter((accId) => accId !== id);
    } else {
      next = [...selectedAccountIds, id];
    }
    setSelectedAccountIds(next);
    if (rememberAccounts && typeof window !== 'undefined') {
      localStorage.setItem('pb_remembered_accounts', JSON.stringify(next));
    }
  };

  const selectAllAccounts = () => {
    const allIds = accounts.map((a) => a.id);
    setSelectedAccountIds(allIds);
    if (rememberAccounts && typeof window !== 'undefined') {
      localStorage.setItem('pb_remembered_accounts', JSON.stringify(allIds));
    }
  };

  // File upload handler
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    for (const file of Array.from(files)) {
      const isVideoFile = file.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(file.name);
      const localBlobUrl = URL.createObjectURL(file);
      const mediaId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const tempMedia: PostMedia = {
        id: mediaId,
        name: file.name,
        url: localBlobUrl,
        thumbnailUrl: localBlobUrl,
        type: isVideoFile ? 'video' : 'image',
        size: file.size,
        aspectRatio: isVideoFile ? '9:16' : '1:1',
      };
      setMediaList((prev) => [...prev, tempMedia]);

      if (isVideoFile && currentPostType !== 'video') {
        setCurrentPostType('video');
      }

      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.success && data.url) {
          setMediaList((prev) =>
            prev.map((item) =>
              item.id === mediaId
                ? { ...item, url: data.url, thumbnailUrl: data.thumbnailUrl || data.url }
                : item
            )
          );
        }
      } catch (err) {
        console.error('Media upload error:', err);
      }
    }
    setIsUploading(false);
  };

  // Preset Timing helper
  const applyPresetTime = (type: 'tonight' | 'tomorrow_morning' | 'tomorrow_afternoon' | 'primetime') => {
    const now = new Date();
    const d = new Date();

    if (type === 'tonight') {
      d.setHours(18, 0, 0);
      setScheduledDate(d.toISOString().split('T')[0]);
      setScheduledTime('18:00');
    } else if (type === 'tomorrow_morning') {
      d.setDate(now.getDate() + 1);
      setScheduledDate(d.toISOString().split('T')[0]);
      setScheduledTime('09:00');
    } else if (type === 'tomorrow_afternoon') {
      d.setDate(now.getDate() + 1);
      setScheduledDate(d.toISOString().split('T')[0]);
      setScheduledTime('14:00');
    } else if (type === 'primetime') {
      d.setDate(now.getDate() + 1);
      setScheduledDate(d.toISOString().split('T')[0]);
      setScheduledTime('20:00');
    }
    setScheduleMode('schedule');
    showToast('Schedule timing updated');
  };

  // AI Quick Writing helpers
  const applyAiEnhancement = (mode: 'improve' | 'punchy' | 'cta' | 'hashtags') => {
    if (mode === 'improve') {
      if (!mainCaption.trim()) {
        setMainCaption(
          '🚀 We are excited to announce our newest breakthrough feature!\n\nDesigned to make multi-channel publishing seamless and fast. Let us know what you think below! 👇'
        );
      } else {
        setMainCaption(
          `✨ ${mainCaption.trim()}\n\nDrop a comment below with your thoughts and share with someone who needs this!`
        );
      }
    } else if (mode === 'punchy') {
      setMainCaption(
        `⚡ Quick realization:\n\n${mainCaption.trim() || 'Consistency beats intensity every single time.'}\n\nAgree or disagree?`
      );
    } else if (mode === 'cta') {
      setMainCaption(
        `${mainCaption.trim()}\n\n👉 Save this post for later and click the link in bio to learn more!`
      );
    } else if (mode === 'hashtags') {
      setMainCaption(
        `${mainCaption.trim()}\n\n#marketing #growth #socialmedia #business #productivity #tech`
      );
    }
    showToast('Caption enhanced!');
  };

  // Formatted date string
  const formattedDateString = (() => {
    try {
      const [year, month, day] = scheduledDate.split('-').map(Number);
      return new Date(year, month - 1, day).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return scheduledDate;
    }
  })();

  const formattedTimeString = (() => {
    try {
      const [h, m] = scheduledTime.split(':').map(Number);
      const date = new Date();
      date.setHours(h, m, 0);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return scheduledTime;
    }
  })();

  // Character limit calculations
  const platformLimit = activeAccount.platform === 'twitter' ? 280 : 2200;
  const charsRemaining = Math.max(0, platformLimit - mainCaption.length);
  const hashtagsCount = (mainCaption.match(/#[a-zA-Z0-9_]+/g) || []).length;

  // Execute Save / Publish
  const handleExecute = async (action: 'schedule' | 'publish-now' | 'draft') => {
    if (action !== 'draft' && selectedAccountIds.length === 0) {
      alert('Please select at least one social account to post to.');
      return;
    }

    setIsSubmitting(true);
    try {
      const scheduledIso =
        action === 'schedule'
          ? new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString()
          : undefined;

      const payload: Partial<Post> = {
        content: destinationLink ? `${mainCaption}\n\n🔗 ${destinationLink}` : mainCaption,
        targetAccountIds: selectedAccountIds,
        media: mediaList,
        postType: currentPostType === 'video' ? 'reel' : 'post',
        firstComment: firstComment || undefined,
        collaborators: collaborators || undefined,
        isAiGenerated,
        scheduledFor: scheduledIso,
      };

      await onSave(payload, action);
      showToast(
        action === 'schedule'
          ? 'Post successfully scheduled!'
          : action === 'publish-now'
          ? 'Post published live!'
          : 'Post saved to drafts!'
      );
    } catch (err: any) {
      alert(`Publishing error: ${err?.message || 'Could not save post'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for aspect ratio container styles
  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case '1:1':
        return 'aspect-square max-w-md mx-auto';
      case '4:5':
        return 'aspect-[4/5] max-w-sm mx-auto';
      case '9:16':
        return 'aspect-[9/16] max-w-xs mx-auto';
      case '16:9':
        return 'aspect-video w-full';
      default:
        return 'aspect-video w-full';
    }
  };

  return (
    <div className="min-h-full bg-[#f8fafc] text-gray-900 p-6 md:p-8 font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 text-xs z-50 animate-fade-in border border-white/10">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200/80">
          <div>
            <div className="flex items-center space-x-2 text-xs text-gray-400 mb-1">
              <button
                onClick={onBack}
                className="hover:text-gray-800 flex items-center space-x-1 font-semibold transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <span>•</span>
              <span className="text-gray-500 font-medium">PostBridge Studio</span>
            </div>

            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                {currentPostType === 'video'
                  ? 'Create Video & Reel'
                  : currentPostType === 'image'
                  ? 'Create Image Post'
                  : 'Create Text Post'}
              </h1>

              {/* Format Switcher Pills */}
              <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200/80">
                <button
                  type="button"
                  onClick={() => setCurrentPostType('image')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    currentPostType === 'image'
                      ? 'bg-white text-emerald-700 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Image
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPostType('video')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    currentPostType === 'video'
                      ? 'bg-white text-emerald-700 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Video
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPostType('text')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    currentPostType === 'text'
                      ? 'bg-white text-emerald-700 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Text
                </button>
              </div>
            </div>
          </div>

          {/* Quick status & keyboard shortcut info */}
          <div className="flex items-center space-x-3 text-xs text-gray-400">
            <span className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Ready to dispatch</span>
            </span>
          </div>
        </div>

        {/* Channel Selection Bar */}
        <div className="bg-white rounded-2xl border border-gray-200/90 p-3.5 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search & Platform Filter */}
            <div className="flex items-center space-x-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter channels..."
                  value={accountSearch}
                  onChange={(e) => setAccountSearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-800 placeholder:text-gray-400 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Platform Filter Dropdown */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPlatformFilterMenu(!showPlatformFilterMenu)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 shadow-2xs"
                >
                  <Filter className="w-3 h-3 text-gray-500" />
                  <span className="capitalize">{platformFilter === 'all' ? 'All Platforms' : platformFilter}</span>
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>

                {showPlatformFilterMenu && (
                  <div className="absolute left-0 mt-1.5 w-44 bg-white border border-gray-200 rounded-xl shadow-xl p-1 z-50 text-xs">
                    {['all', 'facebook', 'instagram', 'twitter', 'linkedin'].map((plat) => (
                      <button
                        key={plat}
                        type="button"
                        onClick={() => {
                          setPlatformFilter(plat);
                          setShowPlatformFilterMenu(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-gray-100 capitalize text-gray-700 flex items-center justify-between"
                      >
                        <span>{plat === 'all' ? 'All Platforms' : plat}</span>
                        {platformFilter === plat && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions & Remember toggle */}
            <div className="flex items-center space-x-3 text-xs">
              <button
                type="button"
                onClick={selectAllAccounts}
                className="text-emerald-600 hover:text-emerald-700 font-semibold"
              >
                Select All
              </button>

              <label className="flex items-center space-x-1.5 text-gray-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberAccounts}
                  onChange={(e) => setRememberAccounts(e.target.checked)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                />
                <span className="font-medium">Remember</span>
              </label>
            </div>
          </div>

          {/* Connected Channels List */}
          <div className="flex items-center gap-2.5 overflow-x-auto py-1 scrollbar-thin">
            {displayedAccounts.map((account) => {
              const isSelected = selectedAccountIds.includes(account.id);
              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => handleToggleAccount(account.id)}
                  className={`flex items-center space-x-2.5 px-3 py-1.5 rounded-xl border transition-all shrink-0 ${
                    isSelected
                      ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950 font-semibold shadow-xs ring-1 ring-emerald-400/50'
                      : 'bg-white border-gray-200 hover:border-gray-300 text-gray-600 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="relative">
                    <img
                      src={account.avatarUrl}
                      alt={account.username}
                      className="w-6 h-6 rounded-full object-cover border border-gray-200"
                    />
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center shadow-xs">
                      <PlatformLogo platform={account.platform} className="w-2.5 h-2.5" />
                    </div>
                  </div>

                  <span className="text-xs truncate max-w-[130px]">{account.displayName}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2-Column Main Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* LEFT 2 COLUMNS: Media + Caption + Advanced Configurations */}
          <div className="lg:col-span-2 space-y-6">
            {/* Media Dropzone (when postType is image or video) */}
            {currentPostType !== 'text' && (
              <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs space-y-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept={currentPostType === 'video' ? 'video/*' : 'image/*,video/*'}
                  multiple
                  onChange={(e) => handleFiles(e.target.files)}
                  className="hidden"
                />

                {mediaList.length > 0 ? (
                  /* Attached Media Preview Card */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-gray-900 flex items-center space-x-1.5">
                          {currentPostType === 'video' ? <Video className="w-4 h-4 text-emerald-600" /> : <FileImage className="w-4 h-4 text-emerald-600" />}
                          <span>Attached Media ({mediaList.length})</span>
                        </span>
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-mono">
                          {mediaList[0].size ? `${(mediaList[0].size / 1024 / 1024).toFixed(1)} MB` : 'Ready'}
                        </span>
                      </div>

                      {/* Aspect Ratio Resizer Selector */}
                      <div className="flex items-center space-x-1 bg-gray-50 border border-gray-200 p-0.5 rounded-lg text-[11px] font-semibold text-gray-600">
                        <Crop className="w-3 h-3 text-gray-400 ml-1.5" />
                        {(['original', '1:1', '4:5', '9:16', '16:9'] as const).map((ratio) => (
                          <button
                            key={ratio}
                            type="button"
                            onClick={() => setAspectRatio(ratio)}
                            className={`px-2 py-0.5 rounded-md transition-colors ${
                              aspectRatio === ratio
                                ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                                : 'hover:text-gray-900'
                            }`}
                          >
                            {ratio}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Preview Box */}
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-950 flex items-center justify-center group shadow-xs">
                      <div className={`${getAspectRatioClass()} transition-all duration-200 overflow-hidden flex items-center justify-center`}>
                        {mediaList[0].type === 'video' ? (
                          <video src={mediaList[0].url} controls className="w-full h-full object-contain" />
                        ) : (
                          <img
                            src={mediaList[0].thumbnailUrl || mediaList[0].url}
                            alt="Media Preview"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      {/* Hover Actions */}
                      <div className="absolute top-3 right-3 flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1.5 rounded-xl bg-black/75 hover:bg-black text-white text-xs font-semibold backdrop-blur-xs flex items-center space-x-1 shadow-md"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Replace</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMediaList([])}
                          className="p-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-700 text-white text-xs backdrop-blur-xs shadow-md"
                          title="Remove media"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Big High-Converting Dropzone */
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[200px] ${
                      isDragging
                        ? 'border-emerald-500 bg-emerald-50/60 scale-[0.99]'
                        : 'border-gray-300 hover:border-emerald-500 bg-gray-50/40 hover:bg-emerald-50/20'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5 border border-emerald-100 shadow-2xs">
                      <FileUp className="w-6 h-6" />
                    </div>

                    <h3 className="text-sm font-bold text-gray-800">
                      Click to upload or drag & drop media
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Or press <kbd className="bg-gray-200/80 px-1.5 py-0.5 rounded font-mono text-[10px] text-gray-700">Ctrl + V</kbd> anywhere to paste from clipboard
                    </p>

                    <div className="flex items-center space-x-2 text-[11px] text-gray-400 mt-3">
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 font-semibold uppercase">
                        {currentPostType === 'video' ? 'MP4, MOV, WEBM' : 'JPG, PNG, WEBP, GIF'}
                      </span>
                      <span>•</span>
                      <span>Up to 500 MB</span>
                    </div>
                  </div>
                )}

                {isUploading && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2 animate-pulse">
                    <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    <span>Uploading and syncing media to durable server & Supabase storage...</span>
                  </div>
                )}
              </div>
            )}

            {/* Main Caption Editor */}
            <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs space-y-3 focus-within:border-emerald-500 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 flex items-center space-x-1.5">
                  <span>Main Caption</span>
                  <Info className="w-3.5 h-3.5 text-gray-400" />
                </span>

                {/* Live Character & Hashtag Counter */}
                <div className="flex items-center space-x-3 text-xs text-gray-400 font-medium">
                  <span className="flex items-center space-x-1">
                    <Hash className="w-3 h-3 text-gray-400" />
                    <span>{hashtagsCount}/30</span>
                  </span>
                  <span>•</span>
                  <span className={`font-mono ${charsRemaining < 50 ? 'text-rose-600 font-bold' : ''}`}>
                    {mainCaption.length} / {platformLimit}
                  </span>
                </div>
              </div>

              {/* Textarea */}
              <textarea
                value={mainCaption}
                onChange={(e) => setMainCaption(e.target.value)}
                placeholder="What would you like to share? Write your post or generate ideas with AI..."
                className="w-full text-sm text-gray-800 placeholder:text-gray-400 border-none outline-none resize-none h-36 leading-relaxed bg-transparent"
              />

              {/* Emoji Picker Bar */}
              {showEmojiPicker && (
                <div className="p-2 bg-gray-50 border border-gray-200 rounded-xl flex items-center space-x-2 overflow-x-auto text-base">
                  {['🚀', '💡', '🔥', '✨', '📈', '🎯', '🙌', '❤️', '👀', '⚡', '👏', '🎉', '👇', '💬', '🌟'].map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setMainCaption(mainCaption + ' ' + em)}
                      className="hover:scale-125 transition-transform p-1"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}

              {/* Quick AI Writing Pills */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                  <span className="text-[11px] font-semibold text-gray-400 mr-1">AI Enhancers:</span>
                  <button
                    type="button"
                    onClick={() => applyAiEnhancement('improve')}
                    className="px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 border border-gray-200 font-medium flex items-center space-x-1 transition-colors"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span>Engage</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAiEnhancement('punchy')}
                    className="px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 border border-gray-200 font-medium flex items-center space-x-1 transition-colors"
                  >
                    <Flame className="w-3 h-3 text-amber-500" />
                    <span>Punchy Hook</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAiEnhancement('cta')}
                    className="px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 border border-gray-200 font-medium flex items-center space-x-1 transition-colors"
                  >
                    <span>+ CTA</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAiEnhancement('hashtags')}
                    className="px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 border border-gray-200 font-medium flex items-center space-x-1 transition-colors"
                  >
                    <span># Viral Tags</span>
                  </button>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Insert Emoji"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openAiModal(mainCaption, (gen) => setMainCaption(gen))}
                    className="text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold px-2.5 py-1 rounded-lg transition-colors flex items-center space-x-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Full AI Generator</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Advanced Configurations Tabbed Strip */}
            <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 border-b border-gray-100 pb-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Post Features:
                </span>
                <button
                  type="button"
                  onClick={() => setActiveConfigTab(activeConfigTab === 'comment' ? 'none' : 'comment')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors ${
                    activeConfigTab === 'comment' || firstComment
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>First Comment {firstComment && '✓'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveConfigTab(activeConfigTab === 'link' ? 'none' : 'link')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors ${
                    activeConfigTab === 'link' || destinationLink
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Destination Link {destinationLink && '✓'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveConfigTab(activeConfigTab === 'collab' ? 'none' : 'collab')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors ${
                    activeConfigTab === 'collab' || collaborators
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Collaborators</span>
                </button>
              </div>

              {/* Active Tab Panel */}
              {activeConfigTab === 'comment' && (
                <div className="pt-1 space-y-2 text-xs animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">First Comment (Published automatically with post)</span>
                    <button
                      type="button"
                      onClick={() => setFirstComment('Drop your thoughts below! Check the link in bio for more details. 🚀 #viral')}
                      className="text-emerald-600 hover:underline font-semibold"
                    >
                      Insert Suggested
                    </button>
                  </div>
                  <input
                    type="text"
                    value={firstComment}
                    onChange={(e) => setFirstComment(e.target.value)}
                    placeholder="e.g. Leave a comment or link in bio for full story..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:outline-hidden focus:border-emerald-500 text-xs"
                  />
                </div>
              )}

              {activeConfigTab === 'link' && (
                <div className="pt-1 space-y-2 text-xs animate-fade-in">
                  <span className="font-semibold text-gray-700">Destination URL / Call to Action</span>
                  <input
                    type="url"
                    value={destinationLink}
                    onChange={(e) => setDestinationLink(e.target.value)}
                    placeholder="https://yourwebsite.com/product"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:outline-hidden focus:border-emerald-500 text-xs"
                  />
                </div>
              )}

              {activeConfigTab === 'collab' && (
                <div className="pt-1 space-y-2 text-xs animate-fade-in">
                  <span className="font-semibold text-gray-700">Instagram / Facebook Collaborators</span>
                  <input
                    type="text"
                    value={collaborators}
                    onChange={(e) => setCollaborators(e.target.value)}
                    placeholder="@ Enter an account username"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:outline-hidden focus:border-emerald-500 text-xs"
                  />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Scheduling Engine & Live Feed Preview */}
          <div className="space-y-4">
            {/* Tab switch between Schedule Settings and Live Preview */}
            <div className="bg-gray-100 p-1 rounded-xl flex items-center border border-gray-200/80">
              <button
                type="button"
                onClick={() => setActiveRightTab('schedule')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                  activeRightTab === 'schedule'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Scheduling</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveRightTab('preview')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                  activeRightTab === 'preview'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Live Feed Preview</span>
              </button>
            </div>

            {activeRightTab === 'schedule' ? (
              /* Scheduling Card */
              <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs space-y-5">
                {/* Schedule Mode Switcher */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <span className="text-sm font-bold text-gray-900">Publishing Mode</span>
                  <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setScheduleMode('schedule')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                        scheduleMode === 'schedule'
                          ? 'bg-white text-emerald-700 shadow-2xs'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Schedule
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleMode('instant')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                        scheduleMode === 'instant'
                          ? 'bg-white text-emerald-700 shadow-2xs'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Instant
                    </button>
                  </div>
                </div>

                {scheduleMode === 'schedule' ? (
                  <div className="space-y-4">
                    {/* Quick Timing Presets */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                        Quick Timings
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => applyPresetTime('tonight')}
                          className="px-2.5 py-1.5 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-gray-700 text-left font-medium transition-colors"
                        >
                          Today 6:00 PM
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPresetTime('tomorrow_morning')}
                          className="px-2.5 py-1.5 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-gray-700 text-left font-medium transition-colors"
                        >
                          Tomorrow 9:00 AM
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPresetTime('tomorrow_afternoon')}
                          className="px-2.5 py-1.5 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-gray-700 text-left font-medium transition-colors"
                        >
                          Tomorrow 2:00 PM
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPresetTime('primetime')}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-emerald-800 text-left font-bold transition-colors"
                        >
                          🔥 Prime 8:00 PM
                        </button>
                      </div>
                    </div>

                    {/* Date & Time Input Boxes */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <label className="text-[10px] font-semibold text-gray-400 block mb-1">DATE</label>
                          <input
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            className="w-full text-xs font-semibold text-gray-800 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-hidden focus:border-emerald-500"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-semibold text-gray-400 block mb-1">TIME</label>
                          <input
                            type="time"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            className="w-full text-xs font-semibold text-gray-800 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-hidden focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <p className="text-xs text-gray-500">
                        Will publish on <strong className="text-gray-800">{formattedDateString}</strong> at <strong className="text-gray-800">{formattedTimeString}</strong> (local time).
                      </p>
                    </div>

                    {/* Big Action Button */}
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleExecute('schedule')}
                      className="w-full py-3.5 px-4 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white flex items-center justify-center space-x-2 text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>{isSubmitting ? 'Queueing in Supabase...' : 'Schedule Post'}</span>
                    </button>
                  </div>
                ) : (
                  /* Instant Publishing Mode */
                  <div className="space-y-4">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start space-x-2">
                      <Zap className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-semibold">Immediate Live Dispatch</strong>
                        <span>Your post will be dispatched directly to your connected Meta channels via Graph API v20.0 right now.</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleExecute('publish-now')}
                      className="w-full py-3.5 px-4 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white flex items-center justify-center space-x-2 text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSubmitting ? 'Publishing to Meta...' : 'Publish Live Now'}</span>
                    </button>
                  </div>
                )}

                {/* Subtext info */}
                <div className="text-[11px] text-gray-400 flex items-center justify-between pt-1">
                  <span className="flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{selectedAccountIds.length} {selectedAccountIds.length === 1 ? 'account' : 'accounts'} selected</span>
                  </span>
                  <span>Supabase Queue Active</span>
                </div>

                {/* Secondary: Save to Drafts */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleExecute('draft')}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5 text-gray-500" />
                  <span>Save as Draft</span>
                </button>
              </div>
            ) : (
              /* Live Feed Preview Card */
              <div className="bg-white rounded-2xl border border-gray-200/90 overflow-hidden shadow-xs text-gray-900">
                <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-600">
                  <div className="flex items-center space-x-1.5">
                    <PlatformLogo platform={activeAccount.platform} className="w-3.5 h-3.5" />
                    <span className="capitalize">{activeAccount.platform} Feed Preview</span>
                  </div>
                  <MoreHorizontal className="w-4 h-4 text-gray-400" />
                </div>

                {/* Post Header */}
                <div className="p-3 flex items-center space-x-2.5">
                  <img
                    src={activeAccount.avatarUrl}
                    alt={activeAccount.displayName}
                    className="w-9 h-9 rounded-full object-cover border border-gray-200"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 leading-tight">
                      {activeAccount.displayName}
                    </h4>
                    <p className="text-[10px] text-gray-400 flex items-center space-x-1">
                      <span>Just now</span>
                      <span>•</span>
                      <Globe className="w-2.5 h-2.5 text-gray-400" />
                    </p>
                  </div>
                </div>

                {/* Caption in Preview */}
                <div className="px-3 pb-2 text-xs text-gray-800 leading-relaxed whitespace-pre-line break-words">
                  {mainCaption || 'Your post caption preview will appear here in real-time...'}
                </div>

                {/* Media Preview in Card */}
                {mediaList.length > 0 && (
                  <div className="bg-black/90 aspect-video flex items-center justify-center overflow-hidden">
                    {mediaList[0].type === 'video' ? (
                      <video src={mediaList[0].url} className="w-full h-full object-cover" />
                    ) : (
                      <img
                        src={mediaList[0].thumbnailUrl || mediaList[0].url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                )}

                {/* Mock Actions Bar */}
                <div className="p-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center space-x-1">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>Like</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Comment</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </span>
                  </div>
                  <Bookmark className="w-3.5 h-3.5 text-gray-400" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
