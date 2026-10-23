'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Post,
  SocialAccount,
  SocialPlatform,
  PostType,
  PostMedia,
  PlatformCaptionOverride,
} from '@/types/social';
import { PlatformLogo } from './SocialIcons';
import { ScheduleDatePicker } from './ScheduleDatePicker';
import { ConnectedAccountSelector } from './ConnectedAccountSelector';
import {
  Calendar,
  Clock,
  Info,
  Upload,
  FileImage,
  Video,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  Send,
  Save,
  ArrowLeft,
  Search,
  Filter,
  CheckCircle2,
  FileUp,
  Smile,
  Hash,
  Link as LinkIcon,
  MessageSquare,
  Users,
  Eye,
  Crop,
  ShieldCheck,
  Zap,
  Globe,
  Share2,
  ThumbsUp,
  Bookmark,
  MoreHorizontal,
  Flame,
  Copy,
  AlertTriangle,
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

// 4 Primary Supported Social Platforms with Brand Specifications
interface PlatformConfig {
  id: SocialPlatform;
  name: string;
  brandColor: string;
  badgeBg: string;
  limit: number;
  placeholder: string;
}

const SUPPORTED_PLATFORMS: PlatformConfig[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    brandColor: '#FF0000',
    badgeBg: 'bg-red-600',
    limit: 5000,
    placeholder: 'Write video description, links, and timestamps...',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    brandColor: '#E1306C',
    badgeBg: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600',
    limit: 2200,
    placeholder: 'Write an engaging Instagram caption with line breaks and #hashtags...',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    brandColor: '#1877F2',
    badgeBg: 'bg-blue-600',
    limit: 63206,
    placeholder: 'Write a detailed Facebook post update for your audience...',
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    brandColor: '#000000',
    badgeBg: 'bg-black',
    limit: 280,
    placeholder: "What's happening? Keep it under 280 characters...",
  },
];

export const CreatePostDashboard: React.FC<CreatePostDashboardProps> = ({
  postType: initialPostType,
  accounts,
  initialPost,
  onSave,
  onBack,
  openAiModal,
}) => {
  // Format Switcher (text / image / video)
  const [currentPostType, setCurrentPostType] = useState<'text' | 'image' | 'video'>(initialPostType);

  // Accounts state
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(() => {
    if (initialPost?.targetAccountIds && initialPost.targetAccountIds.length > 0) {
      return initialPost.targetAccountIds;
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pb_remembered_accounts');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
    }
    return accounts.length > 0 ? [accounts[0].id] : [];
  });

  const [rememberAccounts, setRememberAccounts] = useState(true);

  // Main Caption state
  const [mainCaption, setMainCaption] = useState<string>(initialPost?.content || '');

  // Separate platform-specific captions state (dynamically shown when multiple platforms are selected)
  const [platformCaptions, setPlatformCaptions] = useState<
    Record<SocialPlatform, { caption: string; title?: string }>
  >(() => {
    return {
      facebook: {
        caption: initialPost?.platformOverrides?.facebook?.caption || '',
      },
      instagram: {
        caption: initialPost?.platformOverrides?.instagram?.caption || '',
      },
      youtube: {
        caption: initialPost?.platformOverrides?.youtube?.caption || '',
        title: initialPost?.platformOverrides?.youtube?.title || '',
      },
      twitter: {
        caption: initialPost?.platformOverrides?.twitter?.caption || '',
      },
      linkedin: { caption: '' },
      tiktok: { caption: '' },
      pinterest: { caption: '' },
      threads: { caption: '' },
      bluesky: { caption: '' },
    };
  });

  // Collapsed / Expanded state for platform-specific caption cards
  const [collapsedPlatforms, setCollapsedPlatforms] = useState<Record<string, boolean>>({});

  // Media state
  const [mediaList, setMediaList] = useState<PostMedia[]>(initialPost?.media || []);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Advanced configurations
  const [firstComment, setFirstComment] = useState(initialPost?.firstComment || '');
  const [destinationLink, setDestinationLink] = useState('');
  const [collaborators, setCollaborators] = useState(initialPost?.collaborators || '');
  const [isAiGenerated, setIsAiGenerated] = useState(initialPost?.isAiGenerated || false);
  const [activeConfigTab, setActiveConfigTab] = useState<'none' | 'comment' | 'link' | 'collab'>('none');

  // Aspect ratio crop simulator (original, 1:1, 4:5, 9:16, 16:9)
  const [aspectRatio, setAspectRatio] = useState<'original' | '1:1' | '4:5' | '9:16' | '16:9'>('original');

  // Scheduling states (Mode: 'schedule' vs 'instant')
  const [scheduleMode, setScheduleMode] = useState<'schedule' | 'instant'>('schedule');
  const [scheduledDate, setScheduledDate] = useState(() => {
    if (initialPost?.scheduledFor) {
      const d = parseDateSafe(initialPost.scheduledFor);
      if (d) return format(d, 'yyyy-MM-dd');
    }
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return format(d, 'yyyy-MM-dd');
  });
  const [scheduledTime, setScheduledTime] = useState(() => {
    if (initialPost?.scheduledFor) {
      const d = parseDateSafe(initialPost.scheduledFor);
      if (d) return format(d, 'HH:mm');
    }
    return '14:00';
  });
  const [isScheduleValid, setIsScheduleValid] = useState(true);

  // Right column tab: 'schedule' or 'preview'
  const [activeRightTab, setActiveRightTab] = useState<'schedule' | 'preview'>('schedule');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Clipboard Paste (Ctrl+V) listener
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

  // Compute selected platforms from selectedAccountIds
  const selectedPlatforms = useMemo(() => {
    const plats = new Set<SocialPlatform>();
    selectedAccountIds.forEach((id) => {
      const acc = accounts.find((a) => a.id === id);
      if (acc) plats.add(acc.platform);
    });
    return Array.from(plats);
  }, [selectedAccountIds, accounts]);

  // Active account for live preview
  const activeAccount = useMemo(() => {
    return accounts.find((a) => selectedAccountIds.includes(a.id)) || accounts[0] || {
      id: 'fb_default',
      displayName: 'PostBridge Studio',
      username: 'postbridge',
      platform: 'facebook' as SocialPlatform,
      avatarUrl: '',
    };
  }, [accounts, selectedAccountIds]);

  // Circular Platform Selection Handler
  const handleTogglePlatform = (platformId: SocialPlatform) => {
    const platformAccounts = accounts.filter((a) => a.platform === platformId);

    if (platformAccounts.length === 0) {
      showToast(`No ${platformId} account connected yet. Add one in Connections.`);
      return;
    }

    const platformAccountIds = platformAccounts.map((a) => a.id);
    const isCurrentlySelected = platformAccountIds.some((id) => selectedAccountIds.includes(id));

    let nextAccountIds: string[];
    if (isCurrentlySelected) {
      // Deselect platform accounts (keep at least one account overall if possible)
      const remaining = selectedAccountIds.filter((id) => !platformAccountIds.includes(id));
      nextAccountIds = remaining.length > 0 ? remaining : selectedAccountIds;
    } else {
      // Select all accounts for this platform
      nextAccountIds = Array.from(new Set([...selectedAccountIds, ...platformAccountIds]));
    }

    setSelectedAccountIds(nextAccountIds);
    if (rememberAccounts && typeof window !== 'undefined') {
      localStorage.setItem('pb_remembered_accounts', JSON.stringify(nextAccountIds));
    }
  };

  // Specific account toggler
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

  // File Upload Handler
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

  // AI Quick Writing Helpers
  const applyAiEnhancement = (
    mode: 'improve' | 'punchy' | 'cta' | 'hashtags',
    targetPlatform?: SocialPlatform
  ) => {
    const currentText = targetPlatform
      ? platformCaptions[targetPlatform]?.caption || mainCaption
      : mainCaption;

    let enhanced = currentText;

    if (mode === 'improve') {
      if (!currentText.trim()) {
        enhanced =
          '🚀 We are excited to announce our newest breakthrough feature!\n\nDesigned to make multi-channel publishing seamless and fast. Let us know what you think below! 👇';
      } else {
        enhanced = `✨ ${currentText.trim()}\n\nDrop a comment below with your thoughts and share with someone who needs this!`;
      }
    } else if (mode === 'punchy') {
      enhanced = `⚡ Quick realization:\n\n${
        currentText.trim() || 'Consistency beats intensity every single time.'
      }\n\nAgree or disagree?`;
    } else if (mode === 'cta') {
      enhanced = `${currentText.trim()}\n\n👉 Save this post for later and click the link in bio to learn more!`;
    } else if (mode === 'hashtags') {
      enhanced = `${currentText.trim()}\n\n#marketing #growth #socialmedia #business #productivity #tech`;
    }

    if (targetPlatform) {
      setPlatformCaptions((prev) => ({
        ...prev,
        [targetPlatform]: {
          ...prev[targetPlatform],
          caption: enhanced,
        },
      }));
      showToast(`Enhanced ${targetPlatform} caption!`);
    } else {
      setMainCaption(enhanced);
      showToast('Main caption enhanced!');
    }
  };

  // Copy Main Caption into specific Platform Caption
  const copyFromMainCaption = (platformId: SocialPlatform) => {
    setPlatformCaptions((prev) => ({
      ...prev,
      [platformId]: {
        ...prev[platformId],
        caption: mainCaption,
        title:
          platformId === 'youtube' && !prev[platformId]?.title
            ? mainCaption.split('\n')[0] || ''
            : prev[platformId]?.title,
      },
    }));
    showToast(`Copied main caption to ${platformId}`);
  };

  // Handle Save / Publish execution
  const handleExecute = async (action: 'schedule' | 'publish-now' | 'draft') => {
    if (action !== 'draft' && selectedAccountIds.length === 0) {
      alert('Please select at least one social platform to publish to.');
      return;
    }

    // Platform validation: YouTube requires video media
    const hasYouTubeTarget = selectedAccountIds.some(
      (id) => accounts.find((a) => a.id === id)?.platform === 'youtube'
    );
    const hasVideo = mediaList.some((m) => m.type === 'video');
    if (action !== 'draft' && hasYouTubeTarget && !hasVideo) {
      alert(
        'YouTube requires a video upload (MP4, MOV, WEBM). Please attach a video file or deselect YouTube before continuing.'
      );
      return;
    }

    // X (Twitter) 280-character limit validation
    const hasTwitterTarget = selectedAccountIds.some(
      (id) => accounts.find((a) => a.id === id)?.platform === 'twitter'
    );
    if (action !== 'draft' && hasTwitterTarget) {
      const twitterText =
        platformCaptions.twitter?.caption?.trim() || mainCaption.trim();
      if (twitterText.length > 280) {
        alert(
          `X (Twitter) posts cannot exceed 280 characters (Current length: ${twitterText.length}). Please shorten your tweet or edit the X caption.`
        );
        return;
      }
    }

    // Schedule validation
    if (action === 'schedule' && !isScheduleValid) {
      alert('The selected schedule time is in the past. Please select a future date and time.');
      return;
    }

    setIsSubmitting(true);
    try {
      const scheduledIso =
        action === 'schedule'
          ? new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString()
          : undefined;

      // Build platformOverrides for each selected platform
      const overrides: Partial<Record<SocialPlatform, PlatformCaptionOverride>> = {};
      selectedPlatforms.forEach((p) => {
        const platData = platformCaptions[p];
        const captionText = platData?.caption?.trim() ? platData.caption : mainCaption;
        overrides[p] = {
          caption: destinationLink ? `${captionText}\n\n🔗 ${destinationLink}` : captionText,
          title:
            p === 'youtube'
              ? platData?.title?.trim() || mainCaption.split('\n')[0] || 'Scheduled Video'
              : undefined,
          firstComment: p === 'instagram' ? firstComment || undefined : undefined,
          collaborator: p === 'instagram' ? collaborators || undefined : undefined,
        };
      });

      const payload: Partial<Post> = {
        content: destinationLink ? `${mainCaption}\n\n🔗 ${destinationLink}` : mainCaption,
        targetAccountIds: selectedAccountIds,
        media: mediaList,
        postType: currentPostType === 'video' ? 'reel' : 'post',
        platformOverrides: overrides,
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

  // Live character stats for main caption
  const mainCharsRemaining = Math.max(0, 2200 - mainCaption.length);
  const mainHashtagsCount = (mainCaption.match(/#[a-zA-Z0-9_]+/g) || []).length;

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
                type="button"
                onClick={onBack}
                className="hover:text-gray-800 flex items-center space-x-1 font-semibold transition-colors cursor-pointer"
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    currentPostType === 'image'
                      ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Image
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPostType('video')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    currentPostType === 'video'
                      ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Video
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPostType('text')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    currentPostType === 'text'
                      ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Text
                </button>
              </div>
            </div>
          </div>

          {/* Publishing Ready Status */}
          <div className="flex items-center space-x-3 text-xs text-gray-500">
            <span className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200/80 font-bold shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {selectedPlatforms.length} {selectedPlatforms.length === 1 ? 'Platform' : 'Platforms'} Selected
              </span>
            </span>
          </div>
        </div>

        {/* 1. EXACT BUFFER-STYLE CIRCULAR SOCIAL ACCOUNT SELECTOR (from User Image) */}
        <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs">
          <ConnectedAccountSelector
            accounts={accounts}
            selectedAccountIds={selectedAccountIds}
            onToggleAccount={handleToggleAccount}
            onSelectAll={() => {
              const allAccIds = accounts.map((a) => a.id);
              setSelectedAccountIds(allAccIds);
              if (rememberAccounts && typeof window !== 'undefined') {
                localStorage.setItem('pb_remembered_accounts', JSON.stringify(allAccIds));
              }
            }}
            onClearAll={() => {
              setSelectedAccountIds([]);
              if (rememberAccounts && typeof window !== 'undefined') {
                localStorage.setItem('pb_remembered_accounts', JSON.stringify([]));
              }
            }}
            onGoToConnections={onBack}
          />
        </div>

        {/* 2-Column Main Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* LEFT 2 COLUMNS: Media + Captions + Customizations */}
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
                          {currentPostType === 'video' ? (
                            <Video className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <FileImage className="w-4 h-4 text-emerald-600" />
                          )}
                          <span>Attached Media ({mediaList.length})</span>
                        </span>
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-mono">
                          {mediaList[0].size
                            ? `${(mediaList[0].size / 1024 / 1024).toFixed(1)} MB`
                            : 'Ready'}
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
                            className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
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
                      <div
                        className={`${getAspectRatioClass()} transition-all duration-200 overflow-hidden flex items-center justify-center`}
                      >
                        {mediaList[0].type === 'video' ? (
                          <video
                            src={mediaList[0].url}
                            controls
                            className="w-full h-full object-contain"
                          />
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
                          className="px-2.5 py-1.5 rounded-xl bg-black/75 hover:bg-black text-white text-xs font-semibold backdrop-blur-xs flex items-center space-x-1 shadow-md cursor-pointer"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Replace</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMediaList([])}
                          className="p-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-700 text-white text-xs backdrop-blur-xs shadow-md cursor-pointer"
                          title="Remove media"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* High-Converting Dropzone */
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
                    className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[180px] ${
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
                    <span>Uploading and syncing media securely...</span>
                  </div>
                )}
              </div>
            )}

            {/* 2. MAIN / DEFAULT CAPTION EDITOR */}
            <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs space-y-3 focus-within:border-emerald-500 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-900 flex items-center space-x-1.5">
                    <span>
                      {selectedPlatforms.length > 1
                        ? 'Main Caption (Master / Default)'
                        : selectedPlatforms[0] === 'youtube'
                        ? 'YouTube Video Description'
                        : selectedPlatforms[0] === 'twitter'
                        ? 'X (Twitter) Tweet Content'
                        : selectedPlatforms[0] === 'instagram'
                        ? 'Instagram Caption'
                        : 'Post Caption'}
                    </span>
                    <Info className="w-3.5 h-3.5 text-gray-400" />
                  </span>
                  {selectedPlatforms.length > 1 && (
                    <span className="text-[11px] text-gray-400 block mt-0.5">
                      Applies automatically across all selected platforms unless customized below.
                    </span>
                  )}
                </div>

                {/* Live Character & Hashtag Counter */}
                <div className="flex items-center space-x-3 text-xs text-gray-400 font-medium">
                  <span className="flex items-center space-x-1">
                    <Hash className="w-3 h-3 text-gray-400" />
                    <span>{mainHashtagsCount}/30</span>
                  </span>
                  <span>•</span>
                  <span
                    className={`font-mono ${
                      selectedPlatforms.includes('twitter') && mainCaption.length > 280
                        ? 'text-rose-600 font-bold'
                        : mainCharsRemaining < 50
                        ? 'text-amber-600 font-bold'
                        : ''
                    }`}
                  >
                    {mainCaption.length} chars
                  </span>
                </div>
              </div>

              {/* YouTube Title field (shown when only YouTube is selected) */}
              {selectedPlatforms.length === 1 && selectedPlatforms[0] === 'youtube' && (
                <div className="space-y-1 pb-1 border-b border-gray-100">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                    YouTube Video Title (Required)
                  </label>
                  <input
                    type="text"
                    value={platformCaptions.youtube?.title || ''}
                    onChange={(e) =>
                      setPlatformCaptions((prev) => ({
                        ...prev,
                        youtube: { ...prev.youtube, title: e.target.value },
                      }))
                    }
                    placeholder="Enter an engaging video title (max 100 characters)..."
                    maxLength={100}
                    className="w-full text-sm font-semibold px-3 py-2 rounded-xl border border-gray-200 bg-gray-50/50 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Textarea */}
              <textarea
                value={mainCaption}
                onChange={(e) => setMainCaption(e.target.value)}
                placeholder="What would you like to share? Write your post or use AI to craft engaging copy..."
                className="w-full text-sm text-gray-800 placeholder:text-gray-400 border-none outline-none resize-none h-32 leading-relaxed bg-transparent"
              />

              {/* Emoji Picker Bar */}
              {showEmojiPicker && (
                <div className="p-2 bg-gray-50 border border-gray-200 rounded-xl flex items-center space-x-2 overflow-x-auto text-base">
                  {['🚀', '💡', '🔥', '✨', '📈', '🎯', '🙌', '❤️', '👀', '⚡', '👏', '🎉', '👇', '💬', '🌟'].map(
                    (em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setMainCaption(mainCaption + ' ' + em)}
                        className="hover:scale-125 transition-transform p-1 cursor-pointer"
                      >
                        {em}
                      </button>
                    )
                  )}
                </div>
              )}

              {/* Quick AI Writing Pills */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                  <span className="text-[11px] font-semibold text-gray-400 mr-1">AI Enhancers:</span>
                  <button
                    type="button"
                    onClick={() => applyAiEnhancement('improve')}
                    className="px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 border border-gray-200 font-medium flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span>Engage</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAiEnhancement('punchy')}
                    className="px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 border border-gray-200 font-medium flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <Flame className="w-3 h-3 text-amber-500" />
                    <span>Punchy Hook</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAiEnhancement('cta')}
                    className="px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 border border-gray-200 font-medium flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <span>+ CTA</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAiEnhancement('hashtags')}
                    className="px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 border border-gray-200 font-medium flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <span># Viral Tags</span>
                  </button>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    title="Insert Emoji"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openAiModal(mainCaption, (gen) => setMainCaption(gen))}
                    className="text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold px-2.5 py-1 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Full AI Generator</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 3. DYNAMIC SEPARATE CAPTIONS FOR EACH SELECTED PLATFORM (Shown when >1 platform selected) */}
            {selectedPlatforms.length > 1 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                      <span>Platform-Specific Captions</span>
                      <span className="text-[11px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                        {selectedPlatforms.length} active
                      </span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Customize independent captions for each platform, or leave blank to inherit the main caption.
                    </p>
                  </div>
                </div>

                {/* Stack of Platform Caption Editors */}
                <div className="space-y-3">
                  {selectedPlatforms.map((platId) => {
                    const platConfig =
                      SUPPORTED_PLATFORMS.find((p) => p.id === platId) || {
                        id: platId,
                        name: platId,
                        brandColor: '#4F46E5',
                        badgeBg: 'bg-indigo-600',
                        limit: 2200,
                        placeholder: 'Write platform caption...',
                      };

                    const platData = platformCaptions[platId] || { caption: '' };
                    const currentCaptionText = platData.caption;
                    const charCount = currentCaptionText.length;
                    const isOverLimit = platConfig.limit && charCount > platConfig.limit;
                    const isCollapsed = collapsedPlatforms[platId];

                    return (
                      <div
                        key={platId}
                        className={`bg-white rounded-2xl border transition-all ${
                          isOverLimit
                            ? 'border-rose-400 ring-2 ring-rose-400/20 shadow-xs'
                            : 'border-gray-200/90 hover:border-gray-300 shadow-xs'
                        }`}
                      >
                        {/* Platform Caption Header */}
                        <div className="p-4 flex items-center justify-between border-b border-gray-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-7 h-7 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                              <PlatformLogo platform={platId} className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-gray-900 block leading-tight">
                                {platConfig.name} Caption
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {platData.caption.trim() ? 'Customized' : 'Inheriting main caption'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {/* Live Char Limit Counter */}
                            <span
                              className={`text-xs font-mono px-2 py-0.5 rounded-md ${
                                isOverLimit
                                  ? 'bg-rose-50 text-rose-700 font-bold border border-rose-200'
                                  : 'bg-gray-50 text-gray-500 font-medium'
                              }`}
                            >
                              {charCount} / {platConfig.limit}
                            </span>

                            {/* Copy from Main Caption Button */}
                            <button
                              type="button"
                              onClick={() => copyFromMainCaption(platId)}
                              className="px-2 py-1 rounded-lg hover:bg-gray-100 text-gray-600 text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                              title="Copy main caption into this field"
                            >
                              <Copy className="w-3 h-3 text-gray-400" />
                              <span className="hidden sm:inline">Copy Main</span>
                            </button>

                            {/* Collapse/Expand Toggle */}
                            <button
                              type="button"
                              onClick={() =>
                                setCollapsedPlatforms((prev) => ({
                                  ...prev,
                                  [platId]: !prev[platId],
                                }))
                              }
                              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                            >
                              {isCollapsed ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronUp className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Caption Input Area */}
                        {!isCollapsed && (
                          <div className="p-4 space-y-3">
                            {/* Special YouTube Title Field */}
                            {platId === 'youtube' && (
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                                  YouTube Video Title (Required)
                                </label>
                                <input
                                  type="text"
                                  value={platData.title || ''}
                                  onChange={(e) =>
                                    setPlatformCaptions((prev) => ({
                                      ...prev,
                                      youtube: { ...prev.youtube, title: e.target.value },
                                    }))
                                  }
                                  placeholder="Enter YouTube title (e.g., How to Build a SaaS in 2026)..."
                                  maxLength={100}
                                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-gray-200 bg-gray-50/50 focus:outline-hidden focus:border-emerald-500"
                                />
                              </div>
                            )}

                            {/* Specific Caption Textarea */}
                            <textarea
                              value={platData.caption}
                              onChange={(e) =>
                                setPlatformCaptions((prev) => ({
                                  ...prev,
                                  [platId]: {
                                    ...prev[platId],
                                    caption: e.target.value,
                                  },
                                }))
                              }
                              placeholder={
                                platData.caption.trim()
                                  ? platConfig.placeholder
                                  : `${platConfig.placeholder} (Leave blank to use main caption)`
                              }
                              className="w-full text-xs text-gray-800 placeholder:text-gray-400 border border-gray-200/80 rounded-xl p-3 focus:outline-hidden focus:border-emerald-500 resize-none h-24 leading-relaxed bg-gray-50/30"
                            />

                            {/* Platform Validation Warning if exceeded */}
                            {isOverLimit && (
                              <div className="flex items-center space-x-1.5 text-xs text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  Exceeds {platConfig.name} character limit ({charCount} / {platConfig.limit}). Please trim text.
                                </span>
                              </div>
                            )}

                            {/* Platform AI Quick Actions */}
                            <div className="flex items-center justify-between text-xs pt-1">
                              <div className="flex items-center space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => applyAiEnhancement('punchy', platId)}
                                  className="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-medium text-[11px] transition-colors cursor-pointer"
                                >
                                  ⚡ Punchy
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyAiEnhancement('hashtags', platId)}
                                  className="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-medium text-[11px] transition-colors cursor-pointer"
                                >
                                  # Tags
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  openAiModal(platData.caption || mainCaption, (gen) => {
                                    setPlatformCaptions((prev) => ({
                                      ...prev,
                                      [platId]: { ...prev[platId], caption: gen },
                                    }));
                                  })
                                }
                                className="text-emerald-700 hover:text-emerald-800 font-bold text-[11px] flex items-center space-x-1 cursor-pointer"
                              >
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                <span>AI Generator for {platConfig.name}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Advanced Configurations Tabbed Strip */}
            <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 border-b border-gray-100 pb-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Post Features:
                </span>
                <button
                  type="button"
                  onClick={() => setActiveConfigTab(activeConfigTab === 'comment' ? 'none' : 'comment')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
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
                    <span className="font-semibold text-gray-700">
                      First Comment (Published automatically with post)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setFirstComment(
                          'Drop your thoughts below! Check the link in bio for more details. 🚀 #viral'
                        )
                      }
                      className="text-emerald-600 hover:underline font-semibold cursor-pointer"
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

          {/* RIGHT COLUMN: Redesigned Scheduling Engine & Live Feed Preview */}
          <div className="space-y-4">
            {/* Tab switch between Schedule Settings and Live Preview */}
            <div className="bg-gray-100 p-1 rounded-xl flex items-center border border-gray-200/80">
              <button
                type="button"
                onClick={() => setActiveRightTab('schedule')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  activeRightTab === 'schedule'
                    ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Scheduling</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveRightTab('preview')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  activeRightTab === 'preview'
                    ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Live Feed Preview</span>
              </button>
            </div>

            {activeRightTab === 'schedule' ? (
              /* Redesigned Scheduling Engine Card */
              <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs space-y-5">
                {/* Publishing Mode Switcher (Schedule vs Instant) */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <span className="text-sm font-bold text-gray-900">Publishing Mode</span>
                  <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setScheduleMode('schedule')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                        scheduleMode === 'schedule'
                          ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Schedule
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleMode('instant')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                        scheduleMode === 'instant'
                          ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Instant
                    </button>
                  </div>
                </div>

                {scheduleMode === 'schedule' ? (
                  <div className="space-y-5">
                    {/* Professional Date & Time Picker Component */}
                    <ScheduleDatePicker
                      scheduledDate={scheduledDate}
                      scheduledTime={scheduledTime}
                      onDateChange={(d) => setScheduledDate(d)}
                      onTimeChange={(t) => setScheduledTime(t)}
                      onValidationChange={(valid) => setIsScheduleValid(valid)}
                    />

                    {/* Schedule Post Action Button */}
                    <button
                      type="button"
                      disabled={isSubmitting || !isScheduleValid}
                      onClick={() => handleExecute('schedule')}
                      className="w-full py-3.5 px-4 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white flex items-center justify-center space-x-2 text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>{isSubmitting ? 'Queueing in Supabase...' : 'Schedule Post'}</span>
                    </button>
                  </div>
                ) : (
                  /* Instant Live Dispatch Mode */
                  <div className="space-y-4">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start space-x-2">
                      <Zap className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-semibold">Immediate Live Dispatch</strong>
                        <span>
                          Your post will be published immediately to all {selectedPlatforms.length} selected platforms using official APIs.
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleExecute('publish-now')}
                      className="w-full py-3.5 px-4 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white flex items-center justify-center space-x-2 text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSubmitting ? 'Publishing live...' : 'Publish Live Now'}</span>
                    </button>
                  </div>
                )}

                {/* Status Bar */}
                <div className="text-[11px] text-gray-400 flex items-center justify-between pt-1">
                  <span className="flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {selectedAccountIds.length} {selectedAccountIds.length === 1 ? 'account' : 'accounts'} targeted
                    </span>
                  </span>
                  <span>Supabase Queue Active</span>
                </div>

                {/* Secondary Save to Draft */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleExecute('draft')}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
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
                    src={activeAccount.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
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

                {/* Video Title (if YouTube) */}
                {activeAccount.platform === 'youtube' && (
                  <div className="px-3 pb-1 font-bold text-xs text-gray-900">
                    {platformCaptions.youtube?.title || mainCaption.split('\n')[0] || 'Scheduled Video Title'}
                  </div>
                )}

                {/* Caption in Preview (uses platform-specific caption if customized, else mainCaption) */}
                <div className="px-3 pb-2 text-xs text-gray-800 leading-relaxed whitespace-pre-line break-words">
                  {platformCaptions[activeAccount.platform]?.caption ||
                    mainCaption ||
                    'Your post caption preview will appear here in real-time...'}
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
