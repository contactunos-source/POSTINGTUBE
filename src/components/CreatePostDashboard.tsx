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
import { PostPreview } from './PostPreview';
import {
  Calendar,
  Clock,
  Info,
  Upload,
  FileImage,
  Video,
  X,
  Sparkles,
  Check,
  Send,
  Save,
  ArrowLeft,
  CheckCircle2,
  Crop,
  ShieldCheck,
  RotateCcw,
  Maximize2,
  Minimize2,
  Layers,
  SlidersHorizontal,
  Trash2,
  Lightbulb,
  ExternalLink,
  MessageCircle,
  Hash,
} from 'lucide-react';
import { format } from 'date-fns';
import { parseDateSafe } from '@/lib/dateUtils';

interface CreatePostDashboardProps {
  postType: 'text' | 'image' | 'video';
  accounts: SocialAccount[];
  initialPost?: Partial<Post>;
  onSave: (postData: Partial<Post>, action: 'schedule' | 'publish-now' | 'draft') => Promise<void>;
  onBack: () => void;
  onGoToConnections?: () => void;
  openAiModal: (initialPrompt: string, onGenerated: (caption: string) => void) => void;
}

interface PlatformConfig {
  id: SocialPlatform;
  name: string;
  brandColor: string;
  badgeBg: string;
  borderColor: string;
  limit: number;
  placeholder: string;
}

const SUPPORTED_PLATFORMS: PlatformConfig[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    brandColor: '#FF0000',
    badgeBg: 'bg-red-600',
    borderColor: 'border-red-400 focus-within:border-red-500',
    limit: 5000,
    placeholder: 'Write video description, timestamps, and links...',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    brandColor: '#E1306C',
    badgeBg: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600',
    borderColor: 'border-pink-400 focus-within:border-pink-500',
    limit: 2200,
    placeholder: 'Write an engaging Instagram caption with #hashtags and line breaks...',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    brandColor: '#1877F2',
    badgeBg: 'bg-blue-600',
    borderColor: 'border-blue-400 focus-within:border-blue-500',
    limit: 63206,
    placeholder: 'Write a detailed Facebook post update for your audience...',
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    brandColor: '#000000',
    badgeBg: 'bg-black',
    borderColor: 'border-gray-800 focus-within:border-black',
    limit: 280,
    placeholder: 'What is happening?! Write your tweet...',
  },
  {
    id: 'threads',
    name: 'Threads',
    brandColor: '#000000',
    badgeBg: 'bg-black',
    borderColor: 'border-gray-700',
    limit: 500,
    placeholder: 'Start a thread or share a quick thought (max 500 characters)...',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    brandColor: '#0A66C2',
    badgeBg: 'bg-[#0A66C2]',
    borderColor: 'border-blue-700',
    limit: 3000,
    placeholder: 'Share insights, industry lessons, or professional updates...',
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    brandColor: '#BD081C',
    badgeBg: 'bg-[#BD081C]',
    borderColor: 'border-red-700',
    limit: 500,
    placeholder: 'Describe your pin with keywords, tags, and link in bio...',
  },
];

export const CreatePostDashboard: React.FC<CreatePostDashboardProps> = ({
  postType: initialPostType,
  accounts,
  initialPost,
  onSave,
  onBack,
  onGoToConnections,
  openAiModal,
}) => {
  // Format Switcher (text / image / video)
  const [currentPostType, setCurrentPostType] = useState<'text' | 'image' | 'video'>(initialPostType);

  // Fallback virtual accounts to ensure all 4 core platforms (YouTube, Instagram, Facebook, X) are represented
  const availableAccounts = useMemo(() => {
    const list = [...accounts];
    const corePlatforms: { platform: SocialPlatform; name: string; username: string }[] = [
      { platform: 'youtube', name: 'YouTube Channel', username: 'unosmedia' },
      { platform: 'instagram', name: 'Instagram', username: 'unosdigitalmarketing' },
      { platform: 'facebook', name: 'Facebook Page', username: 'unosdigitalmarketing' },
      { platform: 'twitter', name: 'X (Twitter)', username: 'unosagency' },
    ];
    corePlatforms.forEach((p) => {
      if (!list.some((a) => a.platform === p.platform)) {
        list.push({
          id: `preview_${p.platform}`,
          platform: p.platform,
          username: p.username,
          displayName: p.name,
          avatarUrl: '',
          status: 'connected',
        });
      }
    });
    return list;
  }, [accounts]);

  // Selected accounts state
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(() => {
    if (initialPost?.targetAccountIds && initialPost.targetAccountIds.length > 0) {
      return initialPost.targetAccountIds;
    }
    // Default to the 4 core accounts from the user's workflow sketch!
    const defaultIds = availableAccounts
      .filter((a) => ['youtube', 'instagram', 'facebook', 'twitter'].includes(a.platform))
      .map((a) => a.id);
    return defaultIds.length > 0 ? defaultIds : availableAccounts.map((a) => a.id).slice(0, 4);
  });

  // Media Sharing Mode: 'shared' (Same media for all) vs 'per-platform' (Different media for each)
  const [mediaSharingMode, setMediaSharingMode] = useState<'shared' | 'per-platform'>('shared');

  // Shared media state (used when mediaSharingMode === 'shared')
  const [mediaList, setMediaList] = useState<PostMedia[]>(initialPost?.media || []);

  // Per-platform independent media assets (used when mediaSharingMode === 'per-platform')
  const [platformMedia, setPlatformMedia] = useState<Record<SocialPlatform, PostMedia[]>>(() => {
    const initial: Record<string, PostMedia[]> = {
      youtube: [],
      instagram: [],
      facebook: [],
      twitter: [],
      threads: [],
      linkedin: [],
      pinterest: [],
      tiktok: [],
      bluesky: [],
    };
    if (initialPost?.platformOverrides) {
      Object.entries(initialPost.platformOverrides).forEach(([plat, override]) => {
        if (override?.media && override.media.length > 0) {
          initial[plat] = override.media;
        }
      });
    }
    return initial as Record<SocialPlatform, PostMedia[]>;
  });

  // Per-platform aspect ratios
  const [platformAspectRatios, setPlatformAspectRatios] = useState<
    Record<SocialPlatform, 'original' | '1:1' | '4:5' | '9:16' | '16:9'>
  >({
    youtube: '16:9',
    instagram: '1:1',
    facebook: 'original',
    twitter: '16:9',
    threads: 'original',
    linkedin: 'original',
    pinterest: '9:16',
    tiktok: '9:16',
    bluesky: 'original',
  });

  // Per-platform fit modes
  const [platformFitModes, setPlatformFitModes] = useState<Record<SocialPlatform, 'contain' | 'cover'>>({
    youtube: 'contain',
    instagram: 'contain',
    facebook: 'contain',
    twitter: 'contain',
    threads: 'contain',
    linkedin: 'contain',
    pinterest: 'contain',
    tiktok: 'contain',
    bluesky: 'contain',
  });

  // Captions state
  const [mainCaption, setMainCaption] = useState<string>(initialPost?.content || '');
  const [platformCaptions, setPlatformCaptions] = useState<
    Record<SocialPlatform, { caption: string; title?: string }>
  >(() => {
    return {
      youtube: {
        title: initialPost?.platformOverrides?.youtube?.title || '',
        caption: initialPost?.platformOverrides?.youtube?.caption || '',
      },
      instagram: {
        caption: initialPost?.platformOverrides?.instagram?.caption || '',
      },
      facebook: {
        caption: initialPost?.platformOverrides?.facebook?.caption || '',
      },
      twitter: {
        caption: initialPost?.platformOverrides?.twitter?.caption || '',
      },
      threads: { caption: '' },
      linkedin: { caption: '' },
      pinterest: { caption: '' },
      tiktok: { caption: '' },
      bluesky: { caption: '' },
    };
  });

  // Advanced configurations
  const [firstComment, setFirstComment] = useState(initialPost?.firstComment || '');
  const [destinationLink, setDestinationLink] = useState('');
  const [collaborators, setCollaborators] = useState(initialPost?.collaborators || '');
  const [isAiGenerated, setIsAiGenerated] = useState(initialPost?.isAiGenerated || false);

  // Scheduling states
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

  // General UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const sharedFileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Compute selected platforms and accounts
  const selectedPlatforms = useMemo(() => {
    const plats = new Set<SocialPlatform>();
    selectedAccountIds.forEach((id) => {
      const acc = availableAccounts.find((a) => a.id === id);
      if (acc) plats.add(acc.platform);
    });
    return Array.from(plats);
  }, [selectedAccountIds, availableAccounts]);

  const selectedAccounts = useMemo(() => {
    return availableAccounts.filter((a) => selectedAccountIds.includes(a.id));
  }, [availableAccounts, selectedAccountIds]);

  // Account selection toggle handler
  const handleToggleAccount = (id: string) => {
    setSelectedAccountIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least one account selected
        return prev.filter((accId) => accId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Safe Mode Switcher (preserves assets when switching modes)
  const handleSetSharingMode = (newMode: 'shared' | 'per-platform') => {
    if (newMode === 'per-platform' && mediaSharingMode === 'shared') {
      // If shared media exists, copy it into any platform media that is currently empty
      if (mediaList.length > 0) {
        setPlatformMedia((prev) => {
          const next = { ...prev };
          selectedPlatforms.forEach((p) => {
            if (!next[p] || next[p].length === 0) {
              next[p] = [...mediaList];
            }
          });
          return next;
        });
      }
    } else if (newMode === 'shared' && mediaSharingMode === 'per-platform') {
      // If mediaList is empty but a platform has media, copy the first available platform's media as shared
      if (mediaList.length === 0) {
        const firstAvailable = Object.values(platformMedia).find((m) => m && m.length > 0);
        if (firstAvailable && firstAvailable.length > 0) {
          setMediaList([...firstAvailable]);
        }
      }
    }
    setMediaSharingMode(newMode);
    showToast(
      newMode === 'shared'
        ? 'Switched to Same Media for All Platforms'
        : 'Switched to Different Media for Each Platform'
    );
  };

  // Shared file upload handler
  const handleSharedFiles = async (files: FileList | null) => {
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
      setMediaList([tempMedia]);

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
        if (data.url) {
          setMediaList([
            {
              ...tempMedia,
              url: data.url,
              thumbnailUrl: data.url,
            },
          ]);
        }
      } catch (err) {
        console.warn('Background upload failed, retaining blob preview', err);
      }
    }
    setIsUploading(false);
    showToast('Shared media updated!');
  };

  // Platform-specific file upload handler
  const handleUploadForPlatform = async (platform: SocialPlatform, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(file.name);
      const localBlob = URL.createObjectURL(file);
      const mediaId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const tempMedia: PostMedia = {
        id: mediaId,
        name: file.name,
        url: localBlob,
        thumbnailUrl: localBlob,
        type: isVideo ? 'video' : 'image',
        size: file.size,
        aspectRatio: isVideo ? '9:16' : '1:1',
      };

      setPlatformMedia((prev) => ({
        ...prev,
        [platform]: [tempMedia],
      }));

      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.url) {
          setPlatformMedia((prev) => ({
            ...prev,
            [platform]: [
              {
                ...tempMedia,
                url: data.url,
                thumbnailUrl: data.url,
              },
            ],
          }));
        }
      } catch (err) {
        console.warn('Platform media upload error, retaining local preview', err);
      }
    }
    setIsUploading(false);
    showToast(`${platform.toUpperCase()} media attached!`);
  };

  // Platform caption updates
  const updatePlatformCaption = (platform: SocialPlatform, text: string) => {
    setPlatformCaptions((prev) => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        caption: text,
      },
    }));
  };

  const updatePlatformTitle = (platform: SocialPlatform, title: string) => {
    setPlatformCaptions((prev) => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        title,
      },
    }));
  };

  // Execute Save / Publish / Schedule
  const handleExecute = async (action: 'schedule' | 'publish-now' | 'draft') => {
    if (selectedAccountIds.length === 0) {
      alert('Please select at least one social media account before proceeding.');
      return;
    }

    // YouTube Video validation
    const hasYouTubeTarget = selectedPlatforms.includes('youtube');
    const youtubeMedia =
      mediaSharingMode === 'per-platform'
        ? platformMedia.youtube
        : mediaList;
    const hasVideo = youtubeMedia?.some((m) => m.type === 'video');

    if (action !== 'draft' && hasYouTubeTarget && !hasVideo) {
      alert(
        'YouTube requires a video upload (MP4, MOV, WEBM). Please attach a video file to the YouTube section or deselect YouTube before publishing.'
      );
      return;
    }

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

      // Construct independent platform overrides
      const overrides: Partial<Record<SocialPlatform, PlatformCaptionOverride>> = {};
      selectedPlatforms.forEach((p) => {
        const platData = platformCaptions[p];
        const captionText = platData?.caption?.trim() ? platData.caption : mainCaption;
        const platMedia =
          mediaSharingMode === 'per-platform' && platformMedia[p]?.length > 0
            ? platformMedia[p]
            : mediaList;

        overrides[p] = {
          caption: destinationLink ? `${captionText}\n\n🔗 ${destinationLink}` : captionText,
          title:
            p === 'youtube'
              ? platData?.title?.trim() || mainCaption.split('\n')[0] || 'Scheduled Video'
              : undefined,
          firstComment: p === 'instagram' ? firstComment || undefined : undefined,
          collaborator: p === 'instagram' ? collaborators || undefined : undefined,
          media: platMedia,
          aspectRatio: platformAspectRatios[p],
        };
      });

      // Primary media: shared media if present, else first available platform media
      const primaryMedia =
        mediaList.length > 0
          ? mediaList
          : Object.values(platformMedia).find((m) => m && m.length > 0) || [];

      const payload: Partial<Post> = {
        content: destinationLink ? `${mainCaption}\n\n🔗 ${destinationLink}` : mainCaption,
        targetAccountIds: selectedAccountIds,
        media: primaryMedia,
        postType: primaryMedia.length > 0 && primaryMedia[0].type === 'video' ? 'reel' : 'post',
        platformOverrides: overrides,
        firstComment: firstComment || undefined,
        collaborators: collaborators || undefined,
        isAiGenerated,
        scheduledFor: scheduledIso,
      };

      await onSave(payload, action);
      showToast(
        action === 'schedule'
          ? 'Post successfully scheduled across all selected accounts!'
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

  return (
    <div className="min-h-full bg-[#f8fafc] text-gray-900 p-4 md:p-6 lg:p-8 font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 text-xs z-50 animate-fade-in border border-white/10">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* TOP BAR: Navigation, Page Title, Format Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-200/80">
          <div>
            <div className="flex items-center space-x-2 text-xs text-gray-400 mb-1">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onBack();
                }}
                className="hover:text-emerald-700 flex items-center space-x-1 font-semibold text-gray-600 hover:bg-gray-100/80 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <span>•</span>
              <span className="text-gray-500 font-medium">PostBridge Studio</span>
            </div>

            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                Create Social Media Post
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

          {/* Selection Counter */}
          <div className="flex items-center space-x-3 text-xs text-gray-500">
            <span className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200/80 font-bold shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {selectedPlatforms.length} {selectedPlatforms.length === 1 ? 'Platform' : 'Platforms'} Active
              </span>
            </span>
          </div>
        </div>

        {/* 1. SOCIAL MEDIA ACCOUNTS (Exact Visual Header from User Sketch) */}
        <div className="bg-white rounded-3xl border border-blue-200/80 p-6 shadow-xs relative">
          <div className="flex flex-col items-center justify-center space-y-4">
            {/* Header Box from Sketch: "Social Media Accounts" */}
            <div className="px-6 py-2 rounded-2xl border-2 border-blue-400 bg-blue-50/40 text-blue-900 font-extrabold text-base md:text-lg shadow-2xs tracking-tight">
              Social Media Accounts
            </div>

            {/* Tree Branch Line from Box down to Accounts */}
            <div className="w-0.5 h-4 bg-blue-400" />

            {/* Accounts Row with Note Bubble */}
            <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Account Selection Circles (YouTube, Instagram, Facebook, X, etc.) */}
              <div className="flex items-center justify-center gap-4 sm:gap-6 flex-wrap flex-1">
                {availableAccounts
                  .filter((a) => ['youtube', 'instagram', 'facebook', 'twitter'].includes(a.platform))
                  .map((acc) => {
                    const isSelected = selectedAccountIds.includes(acc.id);
                    const config = SUPPORTED_PLATFORMS.find((p) => p.id === acc.platform);

                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => handleToggleAccount(acc.id)}
                        className={`group flex flex-col items-center space-y-1.5 transition-all cursor-pointer relative ${
                          isSelected ? 'scale-105' : 'opacity-60 hover:opacity-100 hover:scale-102'
                        }`}
                      >
                        {/* Circle Avatar with Brand Color Border */}
                        <div
                          className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all p-1 shadow-xs ${
                            isSelected
                              ? acc.platform === 'youtube'
                                ? 'border-red-500 bg-red-50/30 ring-3 ring-red-400/20'
                                : acc.platform === 'instagram'
                                ? 'border-pink-500 bg-pink-50/30 ring-3 ring-pink-400/20'
                                : acc.platform === 'facebook'
                                ? 'border-blue-500 bg-blue-50/30 ring-3 ring-blue-400/20'
                                : 'border-gray-900 bg-gray-50 ring-3 ring-gray-400/20'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          <PlatformLogo platform={acc.platform} className="w-8 h-8" />
                        </div>

                        {/* Platform Name */}
                        <span
                          className={`text-xs font-bold capitalize transition-colors ${
                            isSelected ? 'text-gray-900' : 'text-gray-400'
                          }`}
                        >
                          {config?.name || acc.platform}
                        </span>

                        {/* Selected Check Pill */}
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
              </div>

              {/* Note Bubble from Sketch */}
              <div className="bg-purple-50/80 border border-purple-200/90 rounded-2xl p-3.5 max-w-xs text-xs text-purple-900 leading-relaxed shadow-2xs font-medium relative">
                <span className="font-bold block text-purple-800 mb-0.5">💡 Publishing Tip:</span>
                We can select one media for every platform or one can select only one media for one platform.
              </div>
            </div>
          </div>
        </div>

        {/* 2. MEDIA SHARING MODE CONTROL */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900">Media Sharing Mode</h4>
              <p className="text-[11px] text-gray-500">
                {mediaSharingMode === 'shared'
                  ? 'Mode A: One media asset shared across all selected platforms with independent framing.'
                  : 'Mode B: Independent uploads — select different images or videos for each platform.'}
              </p>
            </div>
          </div>

          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200/80">
            <button
              type="button"
              onClick={() => handleSetSharingMode('shared')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                mediaSharingMode === 'shared'
                  ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Same Media for All</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetSharingMode('per-platform')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                mediaSharingMode === 'per-platform'
                  ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Different Media per Platform</span>
            </button>
          </div>
        </div>

        {/* 3. DEDICATED SHARED MEDIA CANVAS (When in Shared Mode) */}
        {mediaSharingMode === 'shared' && currentPostType !== 'text' && (
          <div className="bg-white rounded-3xl border border-gray-200/90 p-5 shadow-xs space-y-4">
            <input
              type="file"
              ref={sharedFileInputRef}
              accept={currentPostType === 'video' ? 'video/*' : 'image/*,video/*'}
              onChange={(e) => handleSharedFiles(e.target.files)}
              className="hidden"
            />

            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-gray-900 flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span>Shared Media Asset</span>
                </span>
                <span className="text-[11px] text-gray-400">
                  {mediaList.length > 0
                    ? `${mediaList[0].name} (${(mediaList[0].size ? mediaList[0].size / 1024 / 1024 : 0).toFixed(1)} MB)`
                    : 'No media uploaded yet'}
                </span>
              </div>

              {mediaList.length > 0 && (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => sharedFileInputRef.current?.click()}
                    className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Replace Asset
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaList([])}
                    className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer ml-2"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {mediaList.length === 0 ? (
              <div
                onClick={() => sharedFileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-2xl p-8 flex flex-col items-center justify-center space-y-2 cursor-pointer transition-colors bg-gray-50/60 hover:bg-emerald-50/20"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-gray-800">Click to upload or drag and drop</p>
                  <p className="text-[11px] text-gray-400">Shared asset for all selected platforms (Images, videos)</p>
                </div>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden bg-black/90 max-h-[300px] flex items-center justify-center">
                {mediaList[0].type === 'video' ? (
                  <video src={mediaList[0].url} controls className="max-h-[300px] w-auto object-contain" />
                ) : (
                  <img src={mediaList[0].thumbnailUrl || mediaList[0].url} alt="Shared asset" className="max-h-[300px] w-auto object-contain" />
                )}
                <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-[10px] text-white font-semibold">
                  Shared across {selectedPlatforms.length} {selectedPlatforms.length === 1 ? 'platform' : 'platforms'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 4. VISUAL CONNECTOR LINES (Desktop Curved SVG Lines) */}
        <div className="w-full hidden lg:block overflow-visible h-12 pointer-events-none relative -my-2">
          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
            {selectedPlatforms.map((plat, idx) => {
              const stroke =
                plat === 'youtube'
                  ? '#EF4444'
                  : plat === 'instagram'
                  ? '#EC4899'
                  : plat === 'facebook'
                  ? '#3B82F6'
                  : '#111827';

              const total = selectedPlatforms.length;
              const accountX = 50 + (idx - (total - 1) / 2) * 12;
              const columnX = ((idx + 0.5) / total) * 100;

              return (
                <path
                  key={plat}
                  d={`M ${accountX}% 0 C ${accountX}% 24, ${columnX}% 24, ${columnX}% 48`}
                  fill="none"
                  stroke={stroke}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="transition-all duration-300 drop-shadow-2xs"
                />
              );
            })}
          </svg>
        </div>

        {/* 5. DYNAMIC PLATFORM-BY-PLATFORM CONTENT SECTIONS (Exact Sketch Order) */}
        <div
          className={`grid gap-6 items-start ${
            selectedPlatforms.length === 1
              ? 'grid-cols-1 max-w-xl mx-auto'
              : selectedPlatforms.length === 2
              ? 'grid-cols-1 md:grid-cols-2'
              : selectedPlatforms.length === 3
              ? 'grid-cols-1 md:grid-cols-3'
              : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
          }`}
        >
          {selectedPlatforms.map((platform) => {
            const config = SUPPORTED_PLATFORMS.find((p) => p.id === platform);
            const account =
              availableAccounts.find((a) => a.platform === platform && selectedAccountIds.includes(a.id)) ||
              availableAccounts.find((a) => a.platform === platform) || {
                id: `acc_${platform}`,
                platform,
                displayName: config?.name || platform,
                username: 'yourchannel',
                avatarUrl: '',
                status: 'connected',
              };

            // Current media for this platform (Shared vs Per-Platform)
            const currentMedia =
              mediaSharingMode === 'per-platform'
                ? platformMedia[platform] || []
                : mediaList;

            const currentAspect = platformAspectRatios[platform] || 'original';
            const currentFit = platformFitModes[platform] || 'contain';
            const currentCaption = platformCaptions[platform]?.caption ?? mainCaption;
            const currentTitle = platformCaptions[platform]?.title ?? '';

            // Card Post Data for Live Preview
            const cardPostData: Partial<Post> = {
              content: currentCaption,
              media: currentMedia,
              postType: currentMedia.length > 0 && currentMedia[0].type === 'video' ? 'reel' : 'post',
              platformOverrides: {
                [platform]: {
                  caption: currentCaption,
                  title: currentTitle,
                  media: currentMedia,
                  aspectRatio: currentAspect,
                  firstComment: firstComment,
                  isAiGenerated: isAiGenerated,
                },
              },
            };

            const fileInputId = `file-input-${platform}`;

            return (
              <div
                key={platform}
                className={`bg-white rounded-3xl border-2 shadow-xs overflow-hidden flex flex-col space-y-4 p-5 transition-all ${
                  platform === 'youtube'
                    ? 'border-red-500/80'
                    : platform === 'instagram'
                    ? 'border-pink-500/80'
                    : platform === 'facebook'
                    ? 'border-blue-500/80'
                    : 'border-gray-800'
                }`}
              >
                {/* 1. PLATFORM HEADER & IDENTITY */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center p-1.5 shadow-2xs ${
                        platform === 'youtube'
                          ? 'bg-red-50 text-red-600'
                          : platform === 'instagram'
                          ? 'bg-pink-50 text-pink-600'
                          : platform === 'facebook'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <PlatformLogo platform={platform} className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-gray-900">{config?.name || platform}</h3>
                      <p className="text-[11px] text-gray-400 truncate max-w-[140px]">
                        @{account.username || account.displayName}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      platform === 'youtube'
                        ? 'bg-red-100 text-red-700'
                        : platform === 'instagram'
                        ? 'bg-pink-100 text-pink-700'
                        : platform === 'facebook'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    Active
                  </span>
                </div>

                {/* STEP 1: UPLOAD MEDIA */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold shadow-2xs ${
                        platform === 'youtube'
                          ? 'bg-red-100 text-red-800'
                          : platform === 'instagram'
                          ? 'bg-pink-100 text-pink-800'
                          : platform === 'facebook'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      1. Upload Media
                    </span>

                    {currentMedia.length > 0 && (
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center space-x-1">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Attached</span>
                      </span>
                    )}
                  </div>

                  <input
                    id={fileInputId}
                    type="file"
                    accept={platform === 'youtube' ? 'video/*' : 'image/*,video/*'}
                    onChange={(e) => handleUploadForPlatform(platform, e.target.files)}
                    className="hidden"
                  />

                  {currentMedia.length === 0 ? (
                    <div
                      onClick={() => {
                        if (mediaSharingMode === 'shared') {
                          sharedFileInputRef.current?.click();
                        } else {
                          document.getElementById(fileInputId)?.click();
                        }
                      }}
                      className="border-2 border-dashed border-blue-200 hover:border-blue-400 rounded-2xl p-6 flex flex-col items-center justify-center space-y-1.5 cursor-pointer transition-colors bg-blue-50/20 hover:bg-blue-50/40 text-center"
                    >
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Upload className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-bold text-gray-800">Click to upload or drag and drop</p>
                      <p className="text-[10px] text-gray-400">
                        {platform === 'youtube' ? '(Videos only)' : '(Images, videos)'}
                      </p>
                    </div>
                  ) : (
                    /* Media Canvas with Aspect Ratio Controls */
                    <div className="space-y-2">
                      <div className="relative rounded-2xl overflow-hidden bg-black/90 aspect-video flex items-center justify-center">
                        {currentMedia[0].type === 'video' ? (
                          <video src={currentMedia[0].url} controls className={`w-full h-full ${currentFit === 'cover' ? 'object-cover' : 'object-contain'}`} />
                        ) : (
                          <img
                            src={currentMedia[0].thumbnailUrl || currentMedia[0].url}
                            alt="Media Preview"
                            className={`w-full h-full ${currentFit === 'cover' ? 'object-cover' : 'object-contain'}`}
                          />
                        )}
                      </div>

                      {/* Aspect Ratio Selector Pills */}
                      <div className="flex items-center justify-between text-[11px] font-medium text-gray-600 pt-1">
                        <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none py-0.5">
                          {(['original', '1:1', '4:5', '9:16', '16:9'] as const).map((ratio) => (
                            <button
                              key={ratio}
                              type="button"
                              onClick={() =>
                                setPlatformAspectRatios((prev) => ({
                                  ...prev,
                                  [platform]: ratio,
                                }))
                              }
                              className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer text-[10px] ${
                                currentAspect === ratio
                                  ? 'bg-gray-900 text-white font-bold'
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                              }`}
                            >
                              {ratio === 'original' ? 'Orig' : ratio}
                            </button>
                          ))}
                        </div>

                        {/* Replace / Change Media */}
                        <button
                          type="button"
                          onClick={() => {
                            if (mediaSharingMode === 'shared') {
                              sharedFileInputRef.current?.click();
                            } else {
                              document.getElementById(fileInputId)?.click();
                            }
                          }}
                          className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer ml-1"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* STEP 2: CAPTIONS & TEXT EDITOR */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold shadow-2xs ${
                        platform === 'youtube'
                          ? 'bg-red-100 text-red-800'
                          : platform === 'instagram'
                          ? 'bg-pink-100 text-pink-800'
                          : platform === 'facebook'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      2. Captions
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        openAiModal(`Write a high-converting ${config?.name || platform} post`, (generated) => {
                          updatePlatformCaption(platform, generated);
                        })
                      }
                      className="text-[11px] font-bold text-purple-600 hover:text-purple-700 flex items-center space-x-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-purple-500" />
                      <span>AI Assist</span>
                    </button>
                  </div>

                  {/* YouTube: Title Field */}
                  {platform === 'youtube' && (
                    <div>
                      <input
                        type="text"
                        value={currentTitle}
                        onChange={(e) => updatePlatformTitle(platform, e.target.value)}
                        placeholder="Add your video title (required)..."
                        maxLength={100}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-hidden focus:border-red-500"
                      />
                      <div className="text-right text-[10px] text-gray-400 mt-0.5">
                        {currentTitle.length}/100
                      </div>
                    </div>
                  )}

                  {/* Caption Textarea */}
                  <div className="relative">
                    <textarea
                      rows={platform === 'youtube' ? 4 : 5}
                      value={currentCaption}
                      onChange={(e) => updatePlatformCaption(platform, e.target.value)}
                      placeholder={config?.placeholder || `Write your ${platform} caption...`}
                      maxLength={config?.limit || 2200}
                      className={`w-full px-3 py-2.5 rounded-2xl border text-xs leading-relaxed focus:outline-hidden resize-none transition-colors ${config?.borderColor || 'border-gray-200 focus:border-emerald-500'}`}
                    />
                    <div className="text-right text-[10px] text-gray-400 mt-0.5 font-mono">
                      {currentCaption.length}/{config?.limit || 2200}
                    </div>
                  </div>
                </div>

                {/* STEP 3: PREVIEW */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold shadow-2xs ${
                        platform === 'youtube'
                          ? 'bg-red-100 text-red-800'
                          : platform === 'instagram'
                          ? 'bg-pink-100 text-pink-800'
                          : platform === 'facebook'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      3. Preview
                    </span>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Live Feed
                    </span>
                  </div>

                  {/* Authentic Platform Live Feed Preview Component */}
                  <div className="pt-1">
                    <PostPreview
                      post={cardPostData}
                      selectedPlatform={platform}
                      activeAccount={account}
                      aspectRatio={currentAspect}
                      mediaFitMode={currentFit}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 6. KEY FEATURES BANNER (Matching Exact Bottom Box from Sketch) */}
        <div className="bg-[#EFF6FF] border border-blue-200 rounded-3xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xs">
          <div className="flex items-center space-x-3 shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-lg shadow-2xs">
              💡
            </div>
            <div>
              <span className="font-extrabold text-gray-900 text-base block">Key Features</span>
              <span className="text-xs text-blue-800 font-medium">Production Publishing Workspace</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2 flex-1 font-medium text-xs text-gray-700">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>Platform-wise media upload</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>Aspect ratio selection</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>Accurate platform layouts</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>Independent captions</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>Crop & adjust (if needed)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>No cropping in main preview</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>Real-time preview</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>One or all platforms option</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>Save draft & schedule</span>
            </div>
          </div>
        </div>

        {/* 7. SCHEDULING DOCK & EXECUTION CONTROLS */}
        <div className="bg-white rounded-3xl border border-gray-200/90 p-5 md:p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs shadow-2xs">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">Publishing Timeline & Schedule</h4>
                <p className="text-xs text-gray-400">
                  Targeting {selectedPlatforms.length} {selectedPlatforms.length === 1 ? 'platform' : 'platforms'} ({selectedAccountIds.length} destination accounts)
                </p>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center bg-gray-100 p-1 rounded-2xl border border-gray-200/80">
              <button
                type="button"
                onClick={() => setScheduleMode('schedule')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  scheduleMode === 'schedule'
                    ? 'bg-white text-emerald-700 shadow-2xs font-extrabold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Schedule Post
              </button>
              <button
                type="button"
                onClick={() => setScheduleMode('instant')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  scheduleMode === 'instant'
                    ? 'bg-white text-emerald-700 shadow-2xs font-extrabold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Publish Now
              </button>
            </div>
          </div>

          {/* Schedule Date & Time Picker */}
          {scheduleMode === 'schedule' && (
            <div className="pt-1">
              <ScheduleDatePicker
                scheduledDate={scheduledDate}
                scheduledTime={scheduledTime}
                onDateChange={setScheduledDate}
                onTimeChange={setScheduledTime}
                onValidationChange={setIsScheduleValid}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleExecute('draft')}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl text-xs font-bold border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-gray-500" />
              <span>Save as Draft</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleExecute(scheduleMode === 'schedule' ? 'schedule' : 'publish-now')}
              className="w-full sm:w-auto px-7 py-3 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white flex items-center justify-center space-x-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Processing...'
                  : scheduleMode === 'schedule'
                  ? 'Confirm & Schedule Across Selected Platforms'
                  : 'Publish Live to All Selected Platforms'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
