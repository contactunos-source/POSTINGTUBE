'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useClickOutside } from '@/hooks/useClickOutside';
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
import { PostPreview } from './PostPreview';
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
  ChevronRight,
  Check,
  Send,
  Save,
  ArrowLeft,
  Search,
  Filter,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileUp,
  Hash,
  Link as LinkIcon,
  MessageSquare,
  Users,
  Eye,
  EyeOff,
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
  RotateCcw,
  Sparkles,
  Shield,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Type,
  Settings,
  Sliders,
} from 'lucide-react';
import { format } from 'date-fns';
import { parseDateSafe, formatLocalToUtcIso, extractLocalDateAndTime, getIstDateString } from '@/lib/dateUtils';
import { UpgradePlanModal } from '@/components/UpgradePlanModal';

interface CreatePostDashboardProps {
  postType: 'text' | 'image' | 'video';
  accounts: SocialAccount[];
  allPosts?: Post[];
  initialPost?: Partial<Post>;
  onSave: (
    postData: Partial<Post>,
    action: 'schedule' | 'publish-now' | 'draft',
    onProgress?: (update: any) => void
  ) => Promise<any>;
  onBack: () => void;
  onGoToConnections?: () => void;
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
    id: 'linkedin',
    name: 'LinkedIn',
    brandColor: '#0A66C2',
    badgeBg: 'bg-[#0A66C2]',
    limit: 3000,
    placeholder: 'Share insights, industry lessons, or professional updates with your network...',
  },
  {
    id: 'threads',
    name: 'Threads',
    brandColor: '#000000',
    badgeBg: 'bg-black',
    limit: 500,
    placeholder: 'Start a thread or share a quick thought (max 500 characters)...',
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    brandColor: '#BD081C',
    badgeBg: 'bg-[#BD081C]',
    limit: 500,
    placeholder: 'Describe your pin with descriptive keywords, tags, and link in bio...',
  },
];

interface PlatformVisualConfig {
  name: string;
  brandColor: string;
  headerBg: string;
  cardBorder: string;
  activeTabBg: string;
  cloudIconClass: string;
  supportedFormats: { id: string; label: string }[];
  limit: number;
  placeholder: string;
}

const getPlatformVisualConfig = (platform: SocialPlatform): PlatformVisualConfig => {
  switch (platform) {
    case 'instagram':
      return {
        name: 'Instagram',
        brandColor: '#E1306C',
        headerBg: 'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500',
        cardBorder: 'border-[#E1306C]/70 shadow-sm',
        activeTabBg: 'bg-[#E1306C] text-white shadow-xs',
        cloudIconClass: 'text-[#E1306C]',
        supportedFormats: [
          { id: 'post', label: 'Post' },
          { id: 'reel', label: 'Reel' },
          { id: 'story', label: 'Story' },
        ],
        limit: 2200,
        placeholder: 'Write an engaging Instagram caption with line breaks and #hashtags...',
      };
    case 'facebook':
      return {
        name: 'Facebook Account',
        brandColor: '#1877F2',
        headerBg: 'bg-[#1877F2]',
        cardBorder: 'border-[#1877F2]/70 shadow-sm',
        activeTabBg: 'bg-[#1877F2] text-white shadow-xs',
        cloudIconClass: 'text-[#1877F2]',
        supportedFormats: [
          { id: 'post', label: 'Post' },
          { id: 'reel', label: 'Reel' },
          { id: 'story', label: 'Story' },
        ],
        limit: 63206,
        placeholder: 'Write a detailed Facebook post update for your audience...',
      };
    case 'youtube':
      return {
        name: 'YouTube Channel',
        brandColor: '#FF0000',
        headerBg: 'bg-red-600',
        cardBorder: 'border-red-500/70 shadow-sm',
        activeTabBg: 'bg-red-600 text-white shadow-xs',
        cloudIconClass: 'text-red-600',
        supportedFormats: [
          { id: 'video', label: 'Video' },
          { id: 'short', label: 'Short' },
          { id: 'post', label: 'Community Post' },
        ],
        limit: 5000,
        placeholder: 'Write video description, links, and timestamps...',
      };
    case 'linkedin':
      return {
        name: 'LinkedIn Page',
        brandColor: '#0A66C2',
        headerBg: 'bg-[#0A66C2]',
        cardBorder: 'border-[#0A66C2]/70 shadow-sm',
        activeTabBg: 'bg-[#0A66C2] text-white shadow-xs',
        cloudIconClass: 'text-[#0A66C2]',
        supportedFormats: [
          { id: 'post', label: 'Post' },
          { id: 'article', label: 'Article' },
        ],
        limit: 3000,
        placeholder: 'Share insights, industry lessons, or professional updates with your network...',
      };
    default:
      return {
        name: platform,
        brandColor: '#4F46E5',
        headerBg: 'bg-indigo-600',
        cardBorder: 'border-indigo-400/70 shadow-sm',
        activeTabBg: 'bg-indigo-600 text-white shadow-xs',
        cloudIconClass: 'text-indigo-600',
        supportedFormats: [
          { id: 'post', label: 'Post' },
        ],
        limit: 2200,
        placeholder: 'Write post caption...',
      };
  }
};

export interface MediaUploadState {
  isUploading: boolean;
  progress: number;
  loadedBytes: number;
  totalBytes: number;
  stage: 'idle' | 'preparing' | 'uploading' | 'processing' | 'complete' | 'error';
  statusMessage: string;
  error: string | null;
  lastUploadedFile?: File;
}

export interface PublishingModalState {
  isOpen: boolean;
  total: number;
  completed: number;
  failed: number;
  currentStep: number;
  statusText: string;
  isFinished: boolean;
  destinations: {
    accountId: string;
    accountName: string;
    platform: SocialPlatform;
    status: 'waiting' | 'publishing' | 'success' | 'failed';
    message?: string;
  }[];
}

/**
 * Real-time byte-level upload progress tracking using XMLHttpRequest.
 * Reports actual progress events (1% to 88%) during byte streaming,
 * transitions to 'processing' ("Finalizing upload...") once bytes are transferred,
 * and reaches 100% only upon confirmed HTTP 200 server completion.
 */
const uploadFileWithProgress = (
  file: File,
  onProgress: (percent: number, loaded: number, total: number, stage: MediaUploadState['stage']) => void
): Promise<{ success: boolean; url?: string; thumbnailUrl?: string; error?: string }> => {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    let finalizingTimer: any = null;

    // Stage 1: Initial preparing
    onProgress(1, 0, file.size, 'preparing');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        const ratio = event.loaded / event.total;
        if (ratio < 0.999) {
          // Stream byte progress smoothly from 1% up to 88%
          const pct = Math.max(1, Math.min(88, Math.round(ratio * 88)));
          const stage: MediaUploadState['stage'] = pct < 5 ? 'preparing' : 'uploading';
          onProgress(pct, event.loaded, event.total, stage);
        } else {
          // Bytes completely sent to server. Transition to "Finalizing upload..."
          onProgress(90, event.loaded, event.total, 'processing');
          if (!finalizingTimer) {
            let currentPct = 90;
            finalizingTimer = setInterval(() => {
              if (currentPct < 98) {
                currentPct += 1;
                onProgress(currentPct, event.loaded, event.total, 'processing');
              }
            }, 250);
          }
        }
      }
    };

    xhr.onload = () => {
      if (finalizingTimer) {
        clearInterval(finalizingTimer);
        finalizingTimer = null;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.success && data.url) {
            onProgress(100, file.size, file.size, 'complete');
            resolve(data);
          } else {
            resolve({ success: false, error: data.error || 'Server processing failed' });
          }
        } catch {
          resolve({ success: false, error: 'Invalid response from media server' });
        }
      } else {
        resolve({ success: false, error: `Upload failed (HTTP ${xhr.status})` });
      }
    };

    xhr.onerror = () => {
      if (finalizingTimer) clearInterval(finalizingTimer);
      resolve({ success: false, error: 'Network error during media upload. Check your connection.' });
    };

    xhr.ontimeout = () => {
      if (finalizingTimer) clearInterval(finalizingTimer);
      resolve({ success: false, error: 'Upload timed out. Please try again.' });
    };

    xhr.timeout = 180000; // 3 minute timeout
    xhr.open('POST', '/api/media/upload');
    xhr.send(formData);
  });
};

export const CreatePostDashboard: React.FC<CreatePostDashboardProps> = ({
  postType: initialPostType,
  accounts,
  allPosts,
  initialPost,
  onSave,
  onBack,
  onGoToConnections,
}) => {
  // Subscription and scheduling limit states
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [scheduleLimitModal, setScheduleLimitModal] = useState<{
    isOpen: boolean;
    blockedChannels: { id: string; name: string; count: number }[];
    canScheduleRemaining: boolean;
  } | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<{ planId: string; channelsCount: number } | null>(null);

  const fetchSubscription = () => {
    fetch('/api/billing/subscription')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.subscription) {
          setSubscriptionData(d.subscription);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchSubscription();
  }, []);
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

  // Separate account-specific captions state (dynamically shown for every selected account)
  const [accountCaptions, setAccountCaptions] = useState<
    Record<string, PlatformCaptionOverride>
  >(() => {
    const initial: Record<string, PlatformCaptionOverride> = {};
    if (accounts && accounts.length > 0) {
      accounts.forEach((acc) => {
        const fromAcc =
          initialPost?.accountOverrides?.[acc.id] ||
          (initialPost?.platformOverrides as any)?.[acc.id];
        const fromPlat = initialPost?.platformOverrides?.[acc.platform];
        initial[acc.id] = {
          caption: fromAcc?.caption ?? fromPlat?.caption ?? '',
          title: fromAcc?.title ?? fromPlat?.title ?? '',
                  };
      });
    }
    return initial;
  });

  const [collapsedPlatforms, setCollapsedPlatforms] = useState<Record<string, boolean>>({});

  // Media state
  const [mediaList, setMediaList] = useState<PostMedia[]>(initialPost?.media || []);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isReplacingRef = useRef(false);

  // Real Numerical Media Upload Progress state (1% - 100%)
  const [uploadState, setUploadState] = useState<MediaUploadState>({
    isUploading: false,
    progress: 0,
    loadedBytes: 0,
    totalBytes: 0,
    stage: 'idle',
    statusMessage: '',
    error: null,
  });
  const [displayProgress, setDisplayProgress] = useState(0);
  const uploadPromiseResolveRef = useRef<((value: boolean) => void) | null>(null);

  // Smooth, continuous display progress animation without abrupt jumps
  useEffect(() => {
    if (!uploadState.isUploading) {
      if (uploadState.stage === 'complete') {
        setDisplayProgress(100);
      } else if (uploadState.stage === 'idle') {
        setDisplayProgress(0);
      }
      return;
    }

    const target = uploadState.progress;
    if (displayProgress < target) {
      const diff = target - displayProgress;
      const step = diff > 20 ? 3 : diff > 5 ? 2 : 1;
      const timer = setTimeout(() => {
        setDisplayProgress((prev) => Math.min(target, prev + step));
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [uploadState.isUploading, uploadState.progress, uploadState.stage, displayProgress]);

  // Helper to await in-flight upload before publishing/scheduling without crude alerts
  const waitForUploadToComplete = (): Promise<boolean> => {
    if (!uploadState.isUploading) return Promise.resolve(true);
    return new Promise((resolve) => {
      uploadPromiseResolveRef.current = resolve;
    });
  };

  // Centralized Publishing Progress Modal state
  const [publishingModalState, setPublishingModalState] = useState<PublishingModalState | null>(null);

  // Platform-Specific Feature Options
  const [instagramAiLabel, setInstagramAiLabel] = useState<boolean>(
    initialPost?.platformOverrides?.instagram?.isAiGenerated ?? initialPost?.isAiGenerated ?? false
  );
  const [isInstagramCollabEnabled, setIsInstagramCollabEnabled] = useState<boolean>(
    Boolean(initialPost?.platformOverrides?.instagram?.collaborator || initialPost?.collaborators)
  );
  const [instagramCollaborators, setInstagramCollaborators] = useState<string>(
    initialPost?.platformOverrides?.instagram?.collaborator ?? initialPost?.collaborators ?? ''
  );
  const [facebookAiLabel, setFacebookAiLabel] = useState<boolean>(
    initialPost?.platformOverrides?.facebook?.isAiGenerated ?? initialPost?.isAiGenerated ?? false
  );
  const [youtubeAiLabel, setYoutubeAiLabel] = useState<boolean>(
    initialPost?.platformOverrides?.youtube?.isAiGenerated ?? initialPost?.isAiGenerated ?? false
  );

  // Aspect ratio crop simulator (original, 1:1, 4:5, 9:16, 16:9)
  const [aspectRatio, setAspectRatio] = useState<'original' | '1:1' | '4:5' | '9:16' | '16:9'>('original');
  const [mediaFitMode, setMediaFitMode] = useState<'contain' | 'cover'>('contain');
  const [showSafeAreaGuide, setShowSafeAreaGuide] = useState<boolean>(false);

  // Active Platform for Live Feed Preview
  const [activePreviewPlatform, setActivePreviewPlatform] = useState<SocialPlatform>('instagram');

  // Scheduling states (Mode: 'schedule' vs 'instant')
  const [scheduleMode, setScheduleMode] = useState<'schedule' | 'instant'>('schedule');
  const [scheduledDate, setScheduledDate] = useState(() => {
    if (initialPost?.scheduledFor) {
      const { date } = extractLocalDateAndTime(initialPost.scheduledFor);
      if (date) return date;
    }
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return getIstDateString(d);
  });
  const [scheduledTime, setScheduledTime] = useState(() => {
    if (initialPost?.scheduledFor) {
      const { time } = extractLocalDateAndTime(initialPost.scheduledFor);
      if (time) return time;
    }
    return '14:00';
  });
  const [isScheduleValid, setIsScheduleValid] = useState(true);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Canva-style Workspace Zoom Controls & Platform Panels State
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isPreviewPanelOpen, setIsPreviewPanelOpen] = useState<boolean>(true);
  const [isMasterCaptionOpen, setIsMasterCaptionOpen] = useState<boolean>(false);
  const [accountFormats, setAccountFormats] = useState<Record<string, string>>({});
  const [expandedCaptions, setExpandedCaptions] = useState<Record<string, boolean>>({});
  const [expandedFeatures, setExpandedFeatures] = useState<Record<string, boolean>>({});

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(140, prev + 10));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(60, prev - 10));
  const handleZoomReset = () => setZoomLevel(100);
  const handleFitToScreen = () => {
    if (selectedAccountIds.length >= 3) {
      setZoomLevel(75);
    } else if (selectedAccountIds.length === 2) {
      setZoomLevel(90);
    } else {
      setZoomLevel(100);
    }
  };

  const handleSelectFormat = (accId: string, platform: SocialPlatform, formatId: string) => {
    setAccountFormats((prev) => ({ ...prev, [accId]: formatId }));
    if (formatId === 'reel' || formatId === 'short' || formatId === 'story') {
      setAspectRatio('9:16');
      if (currentPostType !== 'video') setCurrentPostType('video');
    } else if (formatId === 'video') {
      setAspectRatio('16:9');
      if (currentPostType !== 'video') setCurrentPostType('video');
    } else {
      setAspectRatio('original');
    }
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
      displayName: 'PostingTube Studio',
      username: 'postingtube',
      platform: 'facebook' as SocialPlatform,
      avatarUrl: '',
    };
  }, [accounts, selectedAccountIds]);

  // Active preview account ID
  const [activePreviewAccountId, setActivePreviewAccountId] = useState<string>(() => {
    return initialPost?.targetAccountIds?.[0] || accounts?.[0]?.id || '';
  });

  // Keep activePreviewAccountId synced when selectedAccountIds change
  useEffect(() => {
    if (selectedAccountIds.length > 0) {
      if (!selectedAccountIds.includes(activePreviewAccountId)) {
        setActivePreviewAccountId(selectedAccountIds[0]);
      }
    } else if (accounts.length > 0) {
      setActivePreviewAccountId(accounts[0].id);
    }
  }, [selectedAccountIds, activePreviewAccountId, accounts]);

  const previewAccount = useMemo(() => {
    if (activePreviewAccountId) {
      const match = accounts.find((a) => a.id === activePreviewAccountId);
      if (match) return match;
    }
    return (
      accounts.find((a) => selectedAccountIds.includes(a.id) && a.platform === activePreviewPlatform) ||
      accounts.find((a) => selectedAccountIds.includes(a.id)) ||
      accounts.find((a) => a.platform === activePreviewPlatform) ||
      activeAccount
    );
  }, [accounts, activePreviewAccountId, selectedAccountIds, activePreviewPlatform, activeAccount]);

  // Keep activePreviewPlatform synced with previewAccount
  useEffect(() => {
    if (previewAccount?.platform && previewAccount.platform !== activePreviewPlatform) {
      setActivePreviewPlatform(previewAccount.platform);
    }
  }, [previewAccount, activePreviewPlatform]);

  const previewPostData: Partial<Post> = useMemo(() => {
    const overrides: Record<string, PlatformCaptionOverride> = {};

    selectedAccountIds.forEach((accId) => {
      const acc = accounts.find((a) => a.id === accId);
      const cap = accountCaptions[accId];
      if (cap) {
        const isAi =
          acc?.platform === 'instagram'
            ? instagramAiLabel
            : acc?.platform === 'facebook'
            ? facebookAiLabel
            : acc?.platform === 'youtube'
            ? youtubeAiLabel
            : false;
        const collab =
          acc?.platform === 'instagram' && isInstagramCollabEnabled
            ? instagramCollaborators.trim() || undefined
            : undefined;

        overrides[accId] = {
          ...cap,
          caption: cap.caption,
          title: cap.title,
          isAiGenerated: isAi,
          collaborator: collab,
        };
        if (acc && !overrides[acc.platform]) {
          overrides[acc.platform] = {
            ...cap,
            caption: cap.caption,
            title: cap.title,
            isAiGenerated: isAi,
            collaborator: collab,
          };
        }
      }
    });

    const isAnyAi =
      (selectedPlatforms.includes('instagram') && instagramAiLabel) ||
      (selectedPlatforms.includes('facebook') && facebookAiLabel) ||
      (selectedPlatforms.includes('youtube') && youtubeAiLabel);

    return {
      content: mainCaption,
      media: mediaList,
      platformOverrides: overrides,
      accountOverrides: overrides,
      collaborators:
        selectedPlatforms.includes('instagram') && isInstagramCollabEnabled
          ? instagramCollaborators.trim() || undefined
          : undefined,
      isAiGenerated: isAnyAi,
      postType: mediaList.length > 0 && mediaList[0].type === 'video' ? 'reel' : 'post',
    };
  }, [
    mainCaption,
    mediaList,
    accountCaptions,
    selectedAccountIds,
    accounts,
    selectedPlatforms,
    instagramAiLabel,
    isInstagramCollabEnabled,
    instagramCollaborators,
    facebookAiLabel,
    youtubeAiLabel,
  ]);

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

  // File Upload Handler with Real Numerical Byte Progress (1% to 100%)
  const handleFiles = async (files: FileList | null, fileOverride?: File) => {
    const chosenFile = fileOverride || (files && files.length > 0 ? files[0] : null);
    if (!chosenFile) return;

    const isReplacing = isReplacingRef.current;
    isReplacingRef.current = false;

    const isVideoFile = chosenFile.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(chosenFile.name);
    const localBlobUrl = URL.createObjectURL(chosenFile);
    const mediaId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const tempMedia: PostMedia = {
      id: mediaId,
      name: chosenFile.name,
      url: localBlobUrl,
      thumbnailUrl: localBlobUrl,
      type: isVideoFile ? 'video' : 'image',
      size: chosenFile.size,
      aspectRatio: isVideoFile ? '9:16' : '1:1',
    };

    setMediaList([tempMedia]);
    if (isVideoFile && currentPostType !== 'video') {
      setCurrentPostType('video');
    }

    setUploadState({
      isUploading: true,
      progress: 1,
      loadedBytes: 0,
      totalBytes: chosenFile.size,
      stage: 'preparing',
      statusMessage: 'Preparing media...',
      error: null,
      lastUploadedFile: chosenFile,
    });
    setDisplayProgress(1);

    const uploadRes = await uploadFileWithProgress(chosenFile, (percent, loaded, total, stage) => {
      let statusMessage = `Uploading your media... (${percent}%)`;
      if (stage === 'preparing') {
        statusMessage = 'Preparing media...';
      } else if (stage === 'processing') {
        statusMessage = 'Finalizing upload...';
      } else if (stage === 'complete') {
        statusMessage = 'Upload completed!';
      }

      setUploadState((prev) => ({
        ...prev,
        isUploading: true,
        progress: percent,
        loadedBytes: loaded,
        totalBytes: total,
        stage,
        statusMessage,
      }));
    });

    if (uploadRes.success && uploadRes.url) {
      setUploadState((prev) => ({
        ...prev,
        isUploading: true,
        progress: 100,
        stage: 'complete',
        statusMessage: 'Upload completed!',
        error: null,
      }));
      setDisplayProgress(100);

      // Brief moment to visually confirm 100% completion before overlay dismisses
      await new Promise((r) => setTimeout(r, 400));

      setUploadState((prev) => ({
        ...prev,
        isUploading: false,
        stage: 'complete',
      }));

      setMediaList([
        {
          ...tempMedia,
          url: uploadRes.url,
          thumbnailUrl: uploadRes.thumbnailUrl || uploadRes.url,
        },
      ]);
      showToast('Media uploaded successfully.');
      if (uploadPromiseResolveRef.current) {
        uploadPromiseResolveRef.current(true);
        uploadPromiseResolveRef.current = null;
      }
    } else {
      setUploadState((prev) => ({
        ...prev,
        isUploading: false,
        stage: 'error',
        statusMessage: 'Upload failed',
        error: uploadRes.error || 'Failed to upload media to server.',
      }));
      if (uploadPromiseResolveRef.current) {
        uploadPromiseResolveRef.current(false);
        uploadPromiseResolveRef.current = null;
      }
    }
  };

  // AI Quick Writing Helpers
  const applyAiEnhancement = (
    mode: 'improve' | 'punchy' | 'cta' | 'hashtags',
    targetAccountId?: string
  ) => {
    const currentText = targetAccountId
      ? accountCaptions[targetAccountId]?.caption || mainCaption
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

    if (targetAccountId) {
      setAccountCaptions((prev) => ({
        ...prev,
        [targetAccountId]: {
          ...prev[targetAccountId],
          caption: enhanced,
        },
      }));
      const acc = accounts.find((a) => a.id === targetAccountId);
      showToast(`Enhanced ${acc?.displayName || acc?.username || 'account'} caption!`);
    } else {
      setMainCaption(enhanced);
      showToast('Main caption enhanced!');
    }
  };

  // Apply Approved Caption to All Selected Accounts with Intelligent Field Mapping
  const applyCaptionToAllPlatforms = (captionToApply: string, optionalTitle?: string) => {
    const trimmed = captionToApply.trim();
    if (!trimmed) return;

    // 1. Update Master Caption
    setMainCaption(trimmed);

    // 2. Map caption across all selected accounts
    setAccountCaptions((prev) => {
      const next = { ...prev };
      for (const accId of selectedAccountIds) {
        next[accId] = {
          ...next[accId],
          caption: trimmed,
          ...(optionalTitle ? { title: optionalTitle } : {}),
        };
      }
      return next;
    });

    showToast('Caption applied to all selected accounts.');
  };

  // Copy Main Caption into specific Account Caption
  const copyFromMainCaption = (targetId: string) => {
    setAccountCaptions((prev) => ({
      ...prev,
      [targetId]: {
        ...prev[targetId],
        caption: mainCaption,
      },
    }));
    const acc = accounts.find((a) => a.id === targetId);
    showToast(`Copied main caption to ${acc?.displayName || acc?.username || targetId}`);
  };

  // Handle Save / Publish execution
  const handleExecute = async (action: 'schedule' | 'publish-now' | 'draft') => {
    // Idempotency: prevent double-clicks or repeated submissions while in progress
    if (isSubmitting) return;

    if (action !== 'draft' && selectedAccountIds.length === 0) {
      showToast('Please select at least one social platform to publish to.');
      return;
    }

    // If media is still streaming to server, seamlessly await completion instead of blocking alerts
    if (uploadState.isUploading) {
      showToast(`Uploading media (${uploadState.progress}%). Operation will proceed automatically once upload completes.`);
      const uploadSuccess = await waitForUploadToComplete();
      if (!uploadSuccess) {
        showToast('Operation cancelled: media upload failed. Please retry.');
        setIsSubmitting(false);
        return;
      }
    }

    // Schedule validation
    if (action === 'schedule' && !isScheduleValid) {
      showToast('The selected schedule time is in the past. Please select a future date and time.');
      return;
    }

    // Per-channel scheduled post limit enforcement for Free plan (max 5 scheduled posts per channel)
    if (action === 'schedule') {
      const isFreePlan = !subscriptionData || subscriptionData.planId === 'free';
      if (isFreePlan) {
        const scheduledList = (allPosts || []).filter((p) => p.status === 'scheduled' && p.id !== initialPost?.id);
        const blocked: { id: string; name: string; count: number }[] = [];

        for (const chId of selectedAccountIds) {
          const acc = accounts.find((a) => a.id === chId);
          const count = scheduledList.filter((p) => (p.targetAccountIds || []).includes(chId)).length;
          if (count >= 5) {
            blocked.push({
              id: chId,
              name: acc?.displayName || acc?.username || 'Channel',
              count,
            });
          }
        }

        if (blocked.length > 0) {
          setScheduleLimitModal({
            isOpen: true,
            blockedChannels: blocked,
            canScheduleRemaining: selectedAccountIds.length > blocked.length,
          });
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      // Safety check: resolve any temporary local blob: URLs so Facebook/Instagram APIs receive real server URLs
      let finalMediaList = [...mediaList];
      const hasBlobUrls = finalMediaList.some((m) => m.url && m.url.startsWith('blob:'));
      if (hasBlobUrls) {
        try {
          finalMediaList = await Promise.all(
            finalMediaList.map(async (item) => {
              if (item.url && item.url.startsWith('blob:')) {
                try {
                  const blobRes = await fetch(item.url);
                  const blobData = await blobRes.blob();
                  const fileObj = new File([blobData], item.name || 'upload.jpg', {
                    type: blobData.type || (item.type === 'video' ? 'video/mp4' : 'image/jpeg'),
                  });
                  const formData = new FormData();
                  formData.append('file', fileObj);
                  const uploadRes = await fetch('/api/media/upload', {
                    method: 'POST',
                    body: formData,
                  });
                  const uploadJson = await uploadRes.json();
                  if (uploadJson.success && uploadJson.url) {
                    return {
                      ...item,
                      url: uploadJson.url,
                      thumbnailUrl: uploadJson.thumbnailUrl || uploadJson.url,
                    };
                  }
                } catch (uploadErr) {
                  console.error('Pre-submit blob upload error:', uploadErr);
                }
              }
              return item;
            })
          );
          setMediaList(finalMediaList);
        } catch (err) {
          console.error('Error resolving blob URLs:', err);
        }
      }

      const stillHasBlob = finalMediaList.some((m) => m.url && m.url.startsWith('blob:'));
      if (stillHasBlob && action !== 'draft') {
        setIsSubmitting(false);
        showToast('Media upload could not be completed. Please wait a moment or replace the image.');
        return;
      }

      const scheduledIso =
        action === 'schedule'
          ? formatLocalToUtcIso(scheduledDate, scheduledTime)
          : undefined;

      // Build account-specific and platform-level overrides
      const accountOverrides: Record<string, PlatformCaptionOverride> = {};
      const platformOverrides: Record<string, PlatformCaptionOverride> = {};

      selectedAccountIds.forEach((accId) => {
        const acc = accounts.find((a) => a.id === accId);
        if (!acc) return;

        const accData = accountCaptions[accId] || ({} as PlatformCaptionOverride);
        const captionText = accData?.caption?.trim() ? accData.caption : mainCaption;

        const isAi =
          acc.platform === 'instagram'
            ? instagramAiLabel
            : acc.platform === 'facebook'
            ? facebookAiLabel
            : acc.platform === 'youtube'
            ? youtubeAiLabel
            : false;

        const collab =
          acc.platform === 'instagram' && isInstagramCollabEnabled
            ? instagramCollaborators.trim() || undefined
            : undefined;

        const overrideObj: PlatformCaptionOverride = {
          ...accData,
          caption: captionText,
          title:
            acc.platform === 'youtube'
              ? accData?.title?.trim() || mainCaption.split('\n')[0] || 'Post'
              : undefined,
          isAiGenerated: isAi,
          collaborator: collab,
        };

        // Key by account ID for per-account precision
        accountOverrides[accId] = overrideObj;
        platformOverrides[accId] = overrideObj;

        // Key by platform as fallback
        if (!platformOverrides[acc.platform]) {
          platformOverrides[acc.platform] = overrideObj;
        }
      });

      const isAnyAi =
        (selectedPlatforms.includes('instagram') && instagramAiLabel) ||
        (selectedPlatforms.includes('facebook') && facebookAiLabel) ||
        (selectedPlatforms.includes('youtube') && youtubeAiLabel);

      const payload: Partial<Post> = {
        content: mainCaption,
        targetAccountIds: selectedAccountIds,
        media: finalMediaList,
        postType: currentPostType === 'video' ? 'reel' : 'post',
        platformOverrides: platformOverrides,
        accountOverrides: accountOverrides,
        tags: initialPost?.tags || [],
        collaborators:
          selectedPlatforms.includes('instagram') && isInstagramCollabEnabled
            ? instagramCollaborators.trim() || undefined
            : undefined,
        isAiGenerated: isAnyAi,
        scheduledFor: scheduledIso,
      };

      // Real-Time Centralized Publishing Progress Loader for Immediate Dispatch
      if (action === 'publish-now') {
        const initialDestinations = selectedAccountIds.map((accId) => {
          const acc = accounts.find((a) => a.id === accId);
          return {
            accountId: accId,
            accountName: acc?.displayName || acc?.username || 'Channel',
            platform: (acc?.platform || 'facebook') as SocialPlatform,
            status: 'waiting' as const,
            message: 'Waiting in queue...',
          };
        });

        setPublishingModalState({
          isOpen: true,
          total: initialDestinations.length,
          completed: 0,
          failed: 0,
          currentStep: 0,
          statusText: `Publishing across ${initialDestinations.length} destination${initialDestinations.length > 1 ? 's' : ''}...`,
          isFinished: false,
          destinations: initialDestinations,
        });

        const onProgressHandler = (update: any) => {
          setPublishingModalState((prev) => {
            if (!prev) return null;
            const nextDestinations = prev.destinations.map((d) => {
              if (d.accountId === update.accountId) {
                return {
                  ...d,
                  status: update.status,
                  message: update.statusMessage,
                };
              }
              return d;
            });

            return {
              ...prev,
              completed: update.publishedCount,
              failed: update.failedCount,
              currentStep: update.currentStep,
              statusText: update.statusMessage,
              destinations: nextDestinations,
            };
          });
        };

        const publishSummary = await onSave(payload, action, onProgressHandler);

        setPublishingModalState((prev) => {
          if (!prev) return null;
          const totalSuccess = publishSummary?.publishedCount ?? prev.completed;
          const totalFailed = publishSummary?.failedCount ?? prev.failed;
          return {
            ...prev,
            isFinished: true,
            completed: totalSuccess,
            failed: totalFailed,
            statusText:
              totalFailed === 0
                ? 'All destinations published successfully!'
                : `${totalSuccess} published successfully, ${totalFailed} failed`,
          };
        });

        if (initialDestinations.length > 0) {
          showToast(
            initialDestinations.length === 1
              ? 'Post published live!'
              : 'Publishing complete.'
          );
        }
        return;
      }

      await onSave(payload, action);
      showToast(
        action === 'schedule'
          ? 'Post successfully scheduled!'
          : 'Post saved to drafts!'
      );
      if (onBack) onBack();
    } catch (err: any) {
      showToast(`Publishing error: ${err?.message || 'Could not save post'}`);
    } finally {
      setIsSubmitting(false);
    }
  };



  // Helper for aspect ratio container styles
  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case '1:1':
        return 'aspect-square max-w-[380px] w-full mx-auto';
      case '4:5':
        return 'aspect-[4/5] max-w-[340px] w-full mx-auto';
      case '9:16':
        return 'aspect-[9/16] max-w-[280px] w-full mx-auto';
      case '16:9':
        return 'aspect-video max-w-xl w-full mx-auto';
      case 'original':
      default:
        return 'max-h-[460px] w-auto max-w-full mx-auto';
    }
  };

  // Live character stats for main caption
  const mainCharsRemaining = Math.max(0, 2200 - mainCaption.length);
  const mainHashtagsCount = (mainCaption.match(/#[a-zA-Z0-9_]+/g) || []).length;

  return (
    <div className="min-h-full bg-[#f8fafc] text-gray-900 p-3 sm:p-6 md:p-8 font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 text-xs z-50 animate-fade-in border border-white/10">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200/80">
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
              <span className="text-gray-500 font-medium">PostingTube Studio</span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
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
        </div>

        {/* 1. EXACT BUFFER-STYLE CIRCULAR SOCIAL ACCOUNT SELECTOR (from User Image) */}
        <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs">
          <ConnectedAccountSelector
            accounts={accounts}
            selectedAccountIds={selectedAccountIds}
            postType={currentPostType}
            onToggleAccount={handleToggleAccount}
            onShowNotice={showToast}
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
            onGoToConnections={onGoToConnections || onBack}
          />
        </div>

{/* Hidden File Input for Workspace Upload & Replacement */}
        <input
          type="file"
          ref={fileInputRef}
          accept={currentPostType === 'video' ? 'video/*' : 'image/*,video/*'}
          multiple
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />

        {/* WORKSPACE TOOLBAR & CANVA-STYLE ZOOM CONTROLS */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-gray-200/90 p-3.5 px-5 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-gray-900 tracking-tight">Platform Workspace</span>
            </div>
            <span className="text-gray-300">•</span>
            <span className="text-xs text-gray-500 font-medium">
              {selectedAccountIds.length} {selectedAccountIds.length === 1 ? 'channel' : 'channels'} active
            </span>

            {/* Master Caption quick toggle for multi-channel workflows */}
            {selectedAccountIds.length > 1 && (
              <button
                type="button"
                onClick={() => setIsMasterCaptionOpen(!isMasterCaptionOpen)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  isMasterCaptionOpen
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Master Caption</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMasterCaptionOpen ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>

          {/* Canva-Style Zoom Controls */}
          <div className="flex items-center space-x-1.5">
            <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200/80">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 60}
                className="p-1.5 hover:bg-white rounded-lg text-gray-600 hover:text-gray-900 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Zoom Out (-10%)"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleZoomReset}
                className="px-2.5 py-1 text-xs font-mono font-bold text-gray-800 hover:text-emerald-700 transition-colors cursor-pointer"
                title="Click to Reset Zoom (100%)"
              >
                {zoomLevel}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 140}
                className="p-1.5 hover:bg-white rounded-lg text-gray-600 hover:text-gray-900 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Zoom In (+10%)"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleFitToScreen}
              className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 hover:text-gray-800 transition-colors cursor-pointer border border-transparent hover:border-gray-200"
              title="Fit to Screen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleZoomReset}
              className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 hover:text-gray-800 transition-colors cursor-pointer border border-transparent hover:border-gray-200"
              title="Reset Zoom to 100%"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-gray-200 mx-1" />

            {/* Toggle Live Preview & Publishing Column */}
            <button
              type="button"
              onClick={() => setIsPreviewPanelOpen(!isPreviewPanelOpen)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer border ${
                isPreviewPanelOpen
                  ? 'bg-gray-900 text-white border-gray-900 shadow-xs'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
              title={isPreviewPanelOpen ? 'Collapse Preview & Publishing Panel' : 'Open Preview & Publishing Panel'}
            >
              {isPreviewPanelOpen ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Preview & Schedule</span>
            </button>
          </div>
        </div>

        {/* Master Caption Collapsible Editor */}
        {isMasterCaptionOpen && selectedAccountIds.length > 1 && (
          <div className="bg-white rounded-2xl border border-emerald-200/90 p-5 shadow-xs space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
              <div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-gray-900">Master Caption (Applies to all channels)</h3>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Channels set to &quot;Sync with Master&quot; update automatically as you type.
                </p>
              </div>
              <div className="flex items-center space-x-2 text-xs font-medium text-gray-400">
                <span className="flex items-center space-x-1">
                  <Hash className="w-3 h-3 text-gray-400" />
                  <span>{mainHashtagsCount}/30</span>
                </span>
                <span>•</span>
                <span className="font-mono">{mainCaption.length} chars</span>
              </div>
            </div>

            <textarea
              value={mainCaption}
              onChange={(e) => setMainCaption(e.target.value)}
              placeholder="Write master caption to apply across all connected platforms..."
              className="w-full text-xs text-gray-800 placeholder:text-gray-400 border border-gray-200 rounded-xl p-3 focus:outline-hidden focus:border-emerald-500 resize-none h-24 leading-relaxed bg-gray-50/30"
            />

            {/* Quick AI buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-gray-400 font-semibold uppercase mr-1">AI Polish:</span>
              {(['improve', 'punchy', 'cta', 'hashtags'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => applyAiEnhancement(mode)}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-600 text-[11px] font-semibold transition-colors cursor-pointer capitalize"
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* MAIN WORKSPACE GRID: PLATFORM PANELS + DEDICATED PREVIEW & PUBLISHING */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* LEFT: ZOOMABLE PLATFORM WORKSPACE CANVAS */}
          <div className={`${isPreviewPanelOpen ? 'xl:col-span-8' : 'xl:col-span-12'} space-y-6 transition-all`}>
            <div className="w-full overflow-x-auto overflow-y-visible pb-6 scrollbar-thin">
              <div
                style={{
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                className="w-full flex justify-center"
              >
                {selectedAccountIds.length === 0 ? (
                  /* Empty state when no channel checked */
                  <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center max-w-lg mx-auto shadow-xs space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                      <Globe className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">No Channels Selected</h3>
                      <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed">
                        Select one or more connected social accounts in the &quot;Publishing to Accounts&quot; bar above to open their custom publishing workspace.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Distinctive Platform Cards Grid inspired by Reference Design */
                  <div
                    className={`grid gap-6 w-full ${
                      selectedAccountIds.length === 1
                        ? 'max-w-md mx-auto grid-cols-1'
                        : selectedAccountIds.length === 2
                        ? 'max-w-4xl mx-auto grid-cols-1 md:grid-cols-2'
                        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                    }`}
                  >
                    {selectedAccountIds.map((accId) => {
                      const acc = accounts.find((a) => a.id === accId);
                      if (!acc) return null;

                      const config = getPlatformVisualConfig(acc.platform);
                      const activeFormat =
                        accountFormats[accId] ||
                        (acc.platform === 'youtube'
                          ? currentPostType === 'video'
                            ? 'video'
                            : 'post'
                          : currentPostType === 'video'
                          ? 'reel'
                          : 'post');
                      const isCaptionOpen = expandedCaptions[accId] ?? true;
                      const isFeaturesOpen = expandedFeatures[accId] ?? false;
                      const accCaption = accountCaptions[accId]?.caption ?? '';
                      const isCustomized = accCaption.trim().length > 0;
                      const effectiveCaption = isCustomized ? accCaption : mainCaption;
                      const charCount = effectiveCaption.length;
                      const isOverLimit = config.limit && charCount > config.limit;

                      return (
                        <div
                          key={acc.id}
                          className={`bg-white rounded-3xl border-2 ${config.cardBorder} shadow-sm overflow-hidden flex flex-col w-full transition-all`}
                        >
                          {/* 1. PLATFORM HEADER (Brand Color / Gradient + Logo + Account Name) */}
                          <div className={`px-5 py-3.5 ${config.headerBg} text-white flex items-center justify-between`}>
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30 shadow-2xs">
                                <PlatformLogo platform={acc.platform} className="w-4 h-4 text-white" />
                              </div>
                              <span className="text-white/60 font-light select-none">|</span>
                              <span className="text-sm font-bold text-white tracking-tight truncate max-w-[200px]">
                                {acc.displayName || acc.username || config.name}
                              </span>
                            </div>
                            {acc.avatarUrl && (
                              <img
                                src={acc.avatarUrl}
                                alt={acc.displayName || acc.username}
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.onerror = null;
                                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    acc.displayName || acc.username || 'A'
                                  )}&background=059669&color=fff&size=128&bold=true`;
                                }}
                                className="w-7 h-7 rounded-full object-cover border border-white/40 shrink-0 shadow-2xs"
                              />
                            )}
                          </div>

                          {/* 2. PUBLISHING FORMAT TABS (Post / Reel / Story) */}
                          <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                            {config.supportedFormats.map((fmt) => {
                              const isActive = activeFormat === fmt.id;
                              return (
                                <button
                                  key={fmt.id}
                                  type="button"
                                  onClick={() => handleSelectFormat(acc.id, acc.platform, fmt.id)}
                                  className={`flex-1 py-2 px-3 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    isActive
                                      ? config.activeTabBg
                                      : 'bg-white text-gray-700 border border-gray-200/90 hover:bg-gray-50'
                                  }`}
                                >
                                  {fmt.label}
                                </button>
                              );
                            })}
                          </div>

                          {/* 3. UPLOAD MEDIA AREA (Dashed Border + Cloud Icon / Attached Media Preview) */}
                          <div className="p-5 pt-2 space-y-3">
                            {mediaList.length === 0 ? (
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
                                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[175px] bg-white group ${
                                  isDragging
                                    ? 'border-emerald-500 bg-emerald-50/40'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/30'
                                }`}
                              >
                                <div className="transition-transform duration-200 group-hover:scale-110">
                                  <svg
                                    className={`w-12 h-12 ${config.cloudIconClass}`}
                                    viewBox="0 0 48 48"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M14 36H11C7.134 36 4 32.866 4 29C4 25.364 6.773 22.377 10.338 22.044C11.393 14.87 17.552 9.5 25 9.5C33.168 9.5 39.866 15.932 40.003 24.086C43.376 24.873 45.8 27.916 45.8 31.5C45.8 35.642 42.442 39 38.3 39H34"
                                      stroke="currentColor"
                                      strokeWidth="2.8"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                    <path
                                      d="M24 23V40"
                                      stroke="currentColor"
                                      strokeWidth="2.8"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                    <path
                                      d="M18 29L24 23L30 29"
                                      stroke="currentColor"
                                      strokeWidth="2.8"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </div>
                                <h4 className="text-sm font-bold text-gray-800 mt-2.5">Upload Media</h4>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  Click or drag &amp; drop (JPG, PNG, MP4 up to 500 MB)
                                </p>
                              </div>
                            ) : (
                              /* Attached Media Preview Box */
                              <div className="space-y-2">
                                <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center p-2 group shadow-2xs min-h-[220px]">
                                  <div
                                    className={`${getAspectRatioClass()} transition-all duration-200 overflow-hidden flex items-center justify-center relative bg-gray-100 rounded-xl shadow-xs max-h-[260px]`}
                                  >
                                    {mediaList[0].type === 'video' ? (
                                      <video
                                        src={mediaList[0].url}
                                        controls={!uploadState.isUploading}
                                        className={`w-full h-full ${
                                          mediaFitMode === 'cover' ? 'object-cover' : 'object-contain'
                                        } ${uploadState.isUploading ? 'opacity-75 blur-xs scale-[1.01]' : ''} transition-all duration-300`}
                                      />
                                    ) : (
                                      <img
                                        src={mediaList[0].thumbnailUrl || mediaList[0].url}
                                        alt="Media Preview"
                                        className={`w-full h-full ${
                                          mediaFitMode === 'cover' ? 'object-cover' : 'object-contain'
                                        } ${uploadState.isUploading ? 'opacity-75 blur-xs scale-[1.01]' : ''} transition-all duration-300`}
                                      />
                                    )}

                                    {/* Real-Time Upload Progress Overlay */}
                                    {(uploadState.isUploading || uploadState.stage === 'error') && (
                                      <div className="absolute inset-0 bg-white/80 backdrop-blur-xs z-30 flex items-center justify-center p-3 select-none">
                                        {uploadState.stage === 'error' ? (
                                          <div className="bg-white rounded-xl border border-rose-200 p-3 max-w-[240px] text-center space-y-2 shadow-lg">
                                            <AlertCircle className="w-5 h-5 text-rose-600 mx-auto" />
                                            <p className="text-[11px] text-rose-600 leading-tight">
                                              {uploadState.error || 'Upload failed.'}
                                            </p>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                isReplacingRef.current = true;
                                                fileInputRef.current?.click();
                                              }}
                                              className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold cursor-pointer"
                                            >
                                              Retry
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="bg-white/95 rounded-2xl border border-gray-200 shadow-xl p-4 max-w-[220px] w-full text-center space-y-2">
                                            <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
                                              <svg className="w-14 h-14 -rotate-90">
                                                <circle cx="28" cy="28" r="22" className="stroke-gray-100" strokeWidth="4" fill="transparent" />
                                                <circle
                                                  cx="28"
                                                  cy="28"
                                                  r="22"
                                                  className="stroke-emerald-500 transition-all duration-150"
                                                  strokeWidth="4"
                                                  strokeDasharray={138.23}
                                                  strokeDashoffset={138.23 - (138.23 * displayProgress) / 100}
                                                  strokeLinecap="round"
                                                  fill="transparent"
                                                />
                                              </svg>
                                              <span className="absolute text-xs font-extrabold font-mono text-gray-900">
                                                {displayProgress}%
                                              </span>
                                            </div>
                                            <p className="text-[11px] font-bold text-gray-800">
                                              {uploadState.stage === 'complete' ? 'Upload complete!' : 'Uploading media...'}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Hover Actions: Replace & Remove */}
                                  {!uploadState.isUploading && (
                                    <div className="absolute top-3 right-3 flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          isReplacingRef.current = true;
                                          if (fileInputRef.current) {
                                            fileInputRef.current.value = '';
                                            fileInputRef.current.click();
                                          }
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-black/80 hover:bg-black text-white text-xs font-semibold backdrop-blur-xs flex items-center space-x-1 shadow-md cursor-pointer border border-white/20 active:scale-95 transition-all"
                                      >
                                        <Upload className="w-3 h-3" />
                                        <span>Replace</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setMediaList([]);
                                          setUploadState({
                                            isUploading: false,
                                            progress: 0,
                                            loadedBytes: 0,
                                            totalBytes: 0,
                                            stage: 'idle',
                                            statusMessage: '',
                                            error: null,
                                          });
                                        }}
                                        className="p-1 rounded-lg bg-rose-600/90 hover:bg-rose-700 text-white shadow-md cursor-pointer"
                                        title="Remove media"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Framing & Aspect Controls Bar */}
                                <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 px-1 text-[11px] text-gray-500">
                                  <div className="flex items-center space-x-1">
                                    <span className="font-semibold text-gray-700">Aspect:</span>
                                    {(['original', '1:1', '4:5', '9:16', '16:9'] as const).map((r) => (
                                      <button
                                        key={r}
                                        type="button"
                                        onClick={() => setAspectRatio(r)}
                                        className={`px-1.5 py-0.5 rounded-md text-[10px] transition-colors cursor-pointer ${
                                          aspectRatio === r ? 'bg-gray-900 text-white font-bold' : 'hover:bg-gray-100'
                                        }`}
                                      >
                                        {r === 'original' ? 'Orig' : r}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <button
                                      type="button"
                                      onClick={() => setMediaFitMode(mediaFitMode === 'contain' ? 'cover' : 'contain')}
                                      className="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200 text-[10px] font-semibold text-gray-700 cursor-pointer"
                                    >
                                      {mediaFitMode === 'contain' ? 'Fit' : 'Fill'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 4. EXPANDABLE CAPTION ROW */}
                            <div className="space-y-2 pt-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedCaptions((prev) => ({
                                    ...prev,
                                    [acc.id]: !(prev[acc.id] ?? true),
                                  }))
                                }
                                className="w-full border border-gray-200/90 rounded-2xl p-3 px-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/70 transition-all bg-white shadow-2xs"
                              >
                                <div className="flex items-center space-x-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-gray-700 text-sm select-none">
                                    T
                                  </div>
                                  <span className="text-xs font-bold text-gray-800">Caption</span>
                                  {isCustomized ? (
                                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                                      Custom
                                    </span>
                                  ) : (
                                    <span className="text-[10px] bg-gray-100 text-gray-500 font-medium px-2 py-0.5 rounded-full">
                                      Inheriting Master
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span
                                    className={`text-[11px] font-mono ${
                                      isOverLimit ? 'text-rose-600 font-bold' : 'text-gray-400'
                                    }`}
                                  >
                                    {charCount}/{config.limit}
                                  </span>
                                  <ChevronRight
                                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                                      isCaptionOpen ? 'rotate-90' : ''
                                    }`}
                                  />
                                </div>
                              </button>

                              {/* Expanded Caption Editor */}
                              {isCaptionOpen && (
                                <div className="p-3.5 bg-gray-50/50 rounded-2xl border border-gray-200/80 space-y-2.5 animate-in fade-in duration-150">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-gray-400">
                                      {isCustomized ? 'Unique caption for this channel' : 'Synced with master caption'}
                                    </span>
                                    <div className="flex items-center space-x-1.5">
                                      {isCustomized ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setAccountCaptions((prev) => ({
                                              ...prev,
                                              [acc.id]: { ...prev[acc.id], caption: '' },
                                            }));
                                            showToast(`Reset ${acc.displayName || acc.username} to master caption`);
                                          }}
                                          className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 px-2 py-0.5 rounded-md hover:bg-rose-50 cursor-pointer"
                                        >
                                          Inherit Master
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => copyFromMainCaption(acc.id)}
                                          className="text-[11px] font-semibold text-gray-600 hover:text-gray-900 px-2 py-0.5 rounded-md hover:bg-gray-200/70 cursor-pointer"
                                        >
                                          Copy Master
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <textarea
                                    value={accountCaptions[acc.id]?.caption ?? ''}
                                    onChange={(e) =>
                                      setAccountCaptions((prev) => ({
                                        ...prev,
                                        [acc.id]: {
                                          ...prev[acc.id],
                                          caption: e.target.value,
                                        },
                                      }))
                                    }
                                    placeholder={
                                      accountCaptions[acc.id]?.caption?.trim()
                                        ? config.placeholder
                                        : mainCaption.trim()
                                        ? `(Inheriting: "${mainCaption.slice(0, 40)}...")`
                                        : config.placeholder
                                    }
                                    className="w-full text-xs text-gray-800 placeholder:text-gray-400 border border-gray-200 rounded-xl p-3 focus:outline-hidden focus:border-emerald-500 resize-none h-24 leading-relaxed bg-white"
                                  />

                                  {/* Over-limit Alert */}
                                  {isOverLimit && (
                                    <div className="flex items-center space-x-1.5 text-xs text-rose-700 bg-rose-50 p-2 rounded-xl border border-rose-200">
                                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                      <span>
                                        Exceeds {config.name} limit ({charCount}/{config.limit}). Please trim text.
                                      </span>
                                    </div>
                                  )}

                                  {/* YouTube Notice */}
                                  {acc.platform === 'youtube' && (
                                    <div className="text-[10px] text-gray-500 bg-white p-2 rounded-xl border border-gray-200/60 flex items-center space-x-1.5">
                                      <Info className="w-3 h-3 text-gray-400 shrink-0" />
                                      <span>Publishes as YouTube video description.</span>
                                    </div>
                                  )}

                                  {/* AI polish shortcuts */}
                                  <div className="flex items-center space-x-1 pt-0.5">
                                    <span className="text-[10px] font-semibold text-gray-400 mr-1">AI Polish:</span>
                                    {(['improve', 'punchy', 'cta', 'hashtags'] as const).map((mode) => (
                                      <button
                                        key={mode}
                                        type="button"
                                        onClick={() => applyAiEnhancement(mode, acc.id)}
                                        className="px-2 py-0.5 rounded-md bg-white hover:bg-emerald-50 hover:text-emerald-700 text-gray-600 text-[10px] font-semibold border border-gray-200 transition-colors cursor-pointer capitalize"
                                      >
                                        {mode}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* 5. EXPANDABLE FEATURES ROW */}
                            <div className="space-y-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedFeatures((prev) => ({
                                    ...prev,
                                    [acc.id]: !prev[acc.id],
                                  }))
                                }
                                className="w-full border border-gray-200/90 rounded-2xl p-3 px-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/70 transition-all bg-white shadow-2xs"
                              >
                                <div className="flex items-center space-x-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                                    <Settings className="w-4 h-4" />
                                  </div>
                                  <span className="text-xs font-bold text-gray-800">Features</span>
                                </div>
                                <ChevronRight
                                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                                    isFeaturesOpen ? 'rotate-90' : ''
                                  }`}
                                />
                              </button>

                              {/* Expanded Features Panel */}
                              {isFeaturesOpen && (
                                <div className="p-3.5 bg-gray-50/50 rounded-2xl border border-gray-200/80 space-y-3 animate-in fade-in duration-150">
                                  {acc.platform === 'instagram' && (
                                    <div className="space-y-2.5">
                                      {/* AI Content */}
                                      <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-200 shadow-2xs">
                                        <div className="flex items-center space-x-2">
                                          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                          <span className="text-xs font-semibold text-gray-800">AI-Generated Content</span>
                                        </div>
                                        <button
                                          type="button"
                                          role="switch"
                                          aria-checked={instagramAiLabel}
                                          onClick={() => setInstagramAiLabel(!instagramAiLabel)}
                                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                                            instagramAiLabel ? 'bg-purple-600' : 'bg-gray-200'
                                          }`}
                                        >
                                          <span
                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ${
                                              instagramAiLabel ? 'translate-x-4' : 'translate-x-0'
                                            }`}
                                          />
                                        </button>
                                      </div>

                                      {/* Collaboration Settings */}
                                      <div className="space-y-1.5">
                                        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-200 shadow-2xs">
                                          <div className="flex items-center space-x-2">
                                            <Users className="w-3.5 h-3.5 text-rose-600" />
                                            <span className="text-xs font-semibold text-gray-800">Collaboration Settings</span>
                                          </div>
                                          <button
                                            type="button"
                                            role="switch"
                                            aria-checked={isInstagramCollabEnabled}
                                            onClick={() => setIsInstagramCollabEnabled(!isInstagramCollabEnabled)}
                                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                                              isInstagramCollabEnabled ? 'bg-rose-600' : 'bg-gray-200'
                                            }`}
                                          >
                                            <span
                                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ${
                                                isInstagramCollabEnabled ? 'translate-x-4' : 'translate-x-0'
                                              }`}
                                            />
                                          </button>
                                        </div>
                                        {isInstagramCollabEnabled && (
                                          <div className="relative">
                                            <span className="absolute left-2.5 top-2 text-xs font-bold text-rose-400 select-none">@</span>
                                            <input
                                              type="text"
                                              value={instagramCollaborators}
                                              onChange={(e) => setInstagramCollaborators(e.target.value)}
                                              placeholder="handles (comma-separated)"
                                              className="w-full pl-6 pr-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-hidden focus:border-rose-400 text-gray-800 placeholder:text-gray-400"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {acc.platform === 'facebook' && (
                                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-200 shadow-2xs">
                                      <div className="flex items-center space-x-2">
                                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                                        <span className="text-xs font-semibold text-gray-800">AI-Generated Content</span>
                                      </div>
                                      <button
                                        type="button"
                                        role="switch"
                                        aria-checked={facebookAiLabel}
                                        onClick={() => setFacebookAiLabel(!facebookAiLabel)}
                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                                          facebookAiLabel ? 'bg-blue-600' : 'bg-gray-200'
                                        }`}
                                      >
                                        <span
                                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ${
                                            facebookAiLabel ? 'translate-x-4' : 'translate-x-0'
                                          }`}
                                        />
                                      </button>
                                    </div>
                                  )}

                                  {acc.platform === 'youtube' && (
                                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-200 shadow-2xs">
                                      <div className="flex items-center space-x-2">
                                        <Sparkles className="w-3.5 h-3.5 text-red-600" />
                                        <span className="text-xs font-semibold text-gray-800">AI-Generated Content</span>
                                      </div>
                                      <button
                                        type="button"
                                        role="switch"
                                        aria-checked={youtubeAiLabel}
                                        onClick={() => setYoutubeAiLabel(!youtubeAiLabel)}
                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                                          youtubeAiLabel ? 'bg-red-600' : 'bg-gray-200'
                                        }`}
                                      >
                                        <span
                                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ${
                                            youtubeAiLabel ? 'translate-x-4' : 'translate-x-0'
                                          }`}
                                        />
                                      </button>
                                    </div>
                                  )}

                                  {acc.platform !== 'instagram' && acc.platform !== 'facebook' && acc.platform !== 'youtube' && (
                                    <div className="text-xs text-gray-500 py-1">
                                      Standard publishing settings active for {config.name}.
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: DEDICATED LIVE FEED PREVIEW & PUBLISHING MODE (Fully Functional) */}
          {isPreviewPanelOpen && (
            <div className="xl:col-span-4 space-y-6 animate-in fade-in duration-200">
              {/* 1. DEDICATED LIVE FEED PREVIEW */}
              <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-gray-900 tracking-tight">Live Feed Preview</h3>
                  </div>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {selectedAccountIds.length} {selectedAccountIds.length === 1 ? 'channel' : 'channels'} selected
                  </span>
                </div>

                {/* Platform Preview Selector Bar */}
                <div className="bg-gray-50/70 p-2.5 rounded-xl border border-gray-200/70">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                    {selectedAccountIds.length > 1 ? (
                      selectedAccountIds.map((accId) => {
                        const acc = accounts.find((a) => a.id === accId);
                        if (!acc) return null;
                        const isActive = previewAccount?.id === acc.id;
                        const hasCustomCaption = Boolean(
                          accountCaptions[acc.id]?.caption?.trim() || accountCaptions[acc.id]?.title?.trim()
                        );
                        return (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => {
                              setActivePreviewAccountId(acc.id);
                              setActivePreviewPlatform(acc.platform);
                            }}
                            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                              isActive
                                ? 'bg-gray-900 text-white shadow-xs'
                                : 'bg-white text-gray-600 border border-gray-200/80 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                          >
                            <PlatformLogo platform={acc.platform} className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[100px]">{acc.displayName || acc.username}</span>
                            {hasCustomCaption && (
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-emerald-400 ring-2 ring-white/20 shrink-0"
                                title="Customized caption"
                              />
                            )}
                          </button>
                        );
                      })
                    ) : (
                      (selectedPlatforms.length > 0
                        ? selectedPlatforms
                        : (['instagram', 'facebook', 'youtube', 'threads'] as SocialPlatform[])
                      ).map((platform) => {
                        const isActive = activePreviewPlatform === platform;
                        const hasCustomCaption = Boolean(
                          previewAccount &&
                            (accountCaptions[previewAccount.id]?.caption?.trim() ||
                              accountCaptions[previewAccount.id]?.title?.trim())
                        );
                        const config = SUPPORTED_PLATFORMS.find((p) => p.id === platform);
                        const platformName = config?.name || platform;

                        return (
                          <button
                            key={platform}
                            type="button"
                            onClick={() => setActivePreviewPlatform(platform)}
                            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                              isActive
                                ? 'bg-gray-900 text-white shadow-xs'
                                : 'bg-white text-gray-600 border border-gray-200/80 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                          >
                            <PlatformLogo platform={platform} className="w-3.5 h-3.5" />
                            <span className="capitalize">{platformName}</span>
                            {hasCustomCaption && (
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-emerald-400 ring-2 ring-white/20"
                                title="Customized caption"
                              />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Real-time Post Preview */}
                <PostPreview
                  post={previewPostData}
                  selectedPlatform={activePreviewPlatform}
                  activeAccount={previewAccount}
                  previewType={mediaList.length > 0 && mediaList[0].type === 'video' ? 'reel' : 'post'}
                  aspectRatio={aspectRatio}
                  mediaFitMode={mediaFitMode}
                />
              </div>

              {/* 2. PUBLISHING MODE SECTION */}
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
                    {/* Professional Date & Time Picker */}
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
                      <span>
                        {uploadState.isUploading
                          ? `Uploading media (${displayProgress}%)...`
                          : isSubmitting
                          ? 'Queueing in Supabase...'
                          : 'Schedule Post'}
                      </span>
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
                          Your post will be published immediately to all {selectedAccountIds.length} selected accounts using official APIs.
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
                      <span>
                        {uploadState.isUploading
                          ? `Uploading media (${displayProgress}%)...`
                          : isSubmitting
                          ? 'Publishing live...'
                          : 'Publish Live Now'}
                      </span>
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

                {/* Action Buttons: Save to Draft & Exit */}
                <div className="space-y-2 pt-1 border-t border-gray-100">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleExecute('draft')}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-gray-500" />
                    <span>Save as Draft</span>
                  </button>

                  <button
                    type="button"
                    onClick={onBack}
                    className="w-full py-2 px-4 rounded-xl text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                    title="Exit to Dashboard"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-gray-400" />
                    <span>Exit to Dashboard</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scheduled Post Limit Modal for Free Plan */}
      {scheduleLimitModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1c1d22] text-gray-100 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-700/80 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-white">
                Scheduled Post Limit Reached (Free Plan)
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                The Free plan allows up to <span className="font-semibold text-white">5 scheduled posts per connected channel</span>. The following channel(s) have reached capacity:
              </p>
              <div className="space-y-1.5 pt-1">
                {scheduleLimitModal.blockedChannels.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-black/40 border border-white/5 text-xs">
                    <span className="font-medium text-gray-200">{c.name}</span>
                    <span className="text-amber-400 font-bold font-mono">5 / 5 scheduled</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 pt-1">
                Upgrade to Pro for unlimited scheduled posts, or uncheck these channels to continue scheduling for your other channels.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setScheduleLimitModal(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              {scheduleLimitModal.canScheduleRemaining && (
                <button
                  type="button"
                  onClick={() => {
                    const blockedIds = scheduleLimitModal.blockedChannels.map((b) => b.id);
                    setSelectedAccountIds((prev) => prev.filter((id) => !blockedIds.includes(id)));
                    setScheduleLimitModal(null);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-200 bg-white/10 hover:bg-white/15 transition-colors cursor-pointer"
                >
                  Uncheck & Continue
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setScheduleLimitModal(null);
                  setIsUpgradeModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>Upgrade to Pro</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Plan Modal */}
      <UpgradePlanModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        currentPlan={subscriptionData?.planId === 'pro' ? 'Pro' : 'Free'}
        channelsCount={subscriptionData?.channelsCount || Math.max(1, accounts.length)}
        onPlanUpdated={fetchSubscription}
      />

      {/* Centralized Publishing Progress Modal for Multi-Destination Live Dispatch */}
      {publishingModalState && publishingModalState.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-2xs ${
                    publishingModalState.isFinished
                      ? publishingModalState.failed === 0
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                        : publishingModalState.completed > 0
                        ? 'bg-amber-50 border-amber-200 text-amber-600'
                        : 'bg-rose-50 border-rose-200 text-rose-600'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  }`}
                >
                  {publishingModalState.isFinished ? (
                    publishingModalState.failed === 0 ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )
                  ) : (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 leading-tight">
                    {publishingModalState.isFinished
                      ? publishingModalState.failed === 0
                        ? 'Published Successfully'
                        : publishingModalState.completed > 0
                        ? 'Partially Published'
                        : 'Publishing Failed'
                      : 'Publishing Your Posts'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {publishingModalState.isFinished
                      ? `${publishingModalState.completed} of ${publishingModalState.total} destination${publishingModalState.total > 1 ? 's' : ''} published`
                      : `${publishingModalState.completed} / ${publishingModalState.total} completed`}
                  </p>
                </div>
              </div>

              {publishingModalState.isFinished && (
                <button
                  type="button"
                  onClick={() => {
                    setPublishingModalState(null);
                    onBack();
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Numerical Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-gray-600 truncate max-w-[260px]">
                  {publishingModalState.statusText}
                </span>
                <span className="text-emerald-700 font-mono font-bold">
                  {Math.round(
                    ((publishingModalState.completed + publishingModalState.failed) /
                      Math.max(publishingModalState.total, 1)) *
                      100
                  )}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    publishingModalState.failed > 0 && publishingModalState.completed === 0
                      ? 'bg-rose-500'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  }`}
                  style={{
                    width: `${Math.round(
                      ((publishingModalState.completed + publishingModalState.failed) /
                        Math.max(publishingModalState.total, 1)) *
                        100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Destinations List */}
            <div className="space-y-2 max-h-56 overflow-y-auto divide-y divide-gray-100 pr-1">
              {publishingModalState.destinations.map((dest) => (
                <div key={dest.accountId} className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center p-1 shrink-0 shadow-2xs">
                      <PlatformLogo platform={dest.platform} className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate leading-tight">
                        {dest.accountName}
                      </p>
                      <p
                        className={`text-[10px] truncate ${
                          dest.status === 'failed' ? 'text-rose-600 font-medium' : 'text-gray-400'
                        }`}
                      >
                        {dest.message || dest.platform}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {dest.status === 'waiting' && (
                      <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                        Waiting
                      </span>
                    )}
                    {dest.status === 'publishing' && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center space-x-1 animate-pulse">
                        <div className="w-2 h-2 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
                        <span>Publishing</span>
                      </span>
                    )}
                    {dest.status === 'success' && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                        <span>Published</span>
                      </span>
                    )}
                    {dest.status === 'failed' && (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-300 px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <X className="w-2.5 h-2.5 text-rose-600" />
                        <span>Failed</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom summary and action */}
            {publishingModalState.isFinished && (
              <div className="pt-2 flex flex-col space-y-2 border-t border-gray-100">
                {publishingModalState.failed > 0 && publishingModalState.completed > 0 && (
                  <p className="text-[11px] text-gray-500 text-center">
                    {publishingModalState.completed} platform{publishingModalState.completed > 1 ? 's' : ''} published live. Check failed items above for platform API restrictions.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPublishingModalState(null);
                    onBack();
                  }}
                  className="w-full py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Done & View in Posts
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
