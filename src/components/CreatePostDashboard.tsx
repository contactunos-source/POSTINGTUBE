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
import { ConnectedAccountSelector, isPlatformSupportedForPostType, getPlatformUnsupportedReason } from './ConnectedAccountSelector';
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
  ChevronLeft,
  Trash2,
  UploadCloud,
  Music2,
  ShoppingBag,
  Layers,
} from 'lucide-react';
import { format } from 'date-fns';
import { parseDateSafe, formatLocalToUtcIso, extractLocalDateAndTime, getIstDateString } from '@/lib/dateUtils';
import { UpgradePlanModal } from '@/components/UpgradePlanModal';
import { SubscriptionService, MonthlyUsageSummary } from '@/lib/subscription';
import { OFFICIAL_YOUTUBE_CATEGORIES } from '@/app/api/youtube/categories/route';

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
          { id: 'short', label: 'Shorts' },
        ],
        limit: 5000,
        placeholder: 'Write YouTube Shorts description, tags, and links...',
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
    actionType?: 'schedule' | 'publish-now';
    resetsAt?: string;
  } | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<{ planId: string; channelsCount: number } | null>(null);

  const isFreePlan = !subscriptionData || subscriptionData.planId === 'free';
  const monthlyUsage: MonthlyUsageSummary = SubscriptionService.calculateMonthlyUsage(
    allPosts || [],
    accounts,
    isFreePlan ? 'free' : 'pro',
    {
      excludePostId: initialPost?.id,
    }
  );

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

  const triggerUploadPicker = () => {
    isReplacingRef.current = false;
    fileInputRef.current?.click();
  };

  const triggerReplaceMedia = () => {
    isReplacingRef.current = true;
    fileInputRef.current?.click();
  };

  const handleRemoveMedia = (mediaId?: string) => {
    if (mediaId) {
      setMediaList((prev) => prev.filter((m) => m.id !== mediaId));
    } else {
      setMediaList([]);
    }
  };

  // Carousel Slide State & Navigation
  const [activeSlideIndices, setActiveSlideIndices] = useState<Record<string, number>>({});
  const carouselFileInputRef = useRef<HTMLInputElement>(null);
  const carouselActionRef = useRef<{ mode: 'add' | 'replace'; accId?: string; index?: number }>({ mode: 'add' });

  const triggerCreateCarousel = (accId?: string) => {
    carouselActionRef.current = { mode: 'add', accId };
    if (carouselFileInputRef.current) {
      carouselFileInputRef.current.value = '';
      carouselFileInputRef.current.click();
    }
  };

  const triggerReplaceSlide = (accId: string, slideIndex: number) => {
    carouselActionRef.current = { mode: 'replace', accId, index: slideIndex };
    if (carouselFileInputRef.current) {
      carouselFileInputRef.current.value = '';
      carouselFileInputRef.current.click();
    }
  };

  const handleCarouselMoveLeft = (accId: string) => {
    const list = customizeMediaPerPlatform ? (platformMediaMap[accId] || mediaList) : mediaList;
    const currentIdx = Math.min(activeSlideIndices[accId] || 0, Math.max(0, list.length - 1));
    if (currentIdx <= 0) return;
    const nextList = [...list];
    const temp = nextList[currentIdx];
    nextList[currentIdx] = nextList[currentIdx - 1];
    nextList[currentIdx - 1] = temp;

    if (customizeMediaPerPlatform) {
      setPlatformMediaMap((prev) => ({ ...prev, [accId]: nextList }));
    } else {
      setMediaList(nextList);
    }
    setActiveSlideIndices((prev) => ({ ...prev, [accId]: currentIdx - 1, global: currentIdx - 1 }));
  };

  const handleCarouselMoveRight = (accId: string) => {
    const list = customizeMediaPerPlatform ? (platformMediaMap[accId] || mediaList) : mediaList;
    const currentIdx = Math.min(activeSlideIndices[accId] || 0, Math.max(0, list.length - 1));
    if (currentIdx >= list.length - 1) return;
    const nextList = [...list];
    const temp = nextList[currentIdx];
    nextList[currentIdx] = nextList[currentIdx + 1];
    nextList[currentIdx + 1] = temp;

    if (customizeMediaPerPlatform) {
      setPlatformMediaMap((prev) => ({ ...prev, [accId]: nextList }));
    } else {
      setMediaList(nextList);
    }
    setActiveSlideIndices((prev) => ({ ...prev, [accId]: currentIdx + 1, global: currentIdx + 1 }));
  };

  const handleCarouselRemoveSlide = (accId: string, slideIndex: number) => {
    const list = customizeMediaPerPlatform ? (platformMediaMap[accId] || mediaList) : mediaList;
    const nextList = list.filter((_, idx) => idx !== slideIndex);

    if (customizeMediaPerPlatform) {
      setPlatformMediaMap((prev) => ({ ...prev, [accId]: nextList }));
    } else {
      setMediaList(nextList);
    }
    const newIdx = Math.max(0, Math.min(slideIndex, nextList.length - 1));
    setActiveSlideIndices((prev) => ({ ...prev, [accId]: newIdx, global: newIdx }));
  };

  const handleCarouselFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const { mode, accId, index } = carouselActionRef.current;
    const fileArray = Array.from(files).filter((f) => !f.type.startsWith('video/'));
    if (fileArray.length === 0) {
      showToast('Please select image files for carousel posts.');
      return;
    }

    const targetAccId = accId || selectedAccountIds[0] || 'default';
    const isPerPlatform = customizeMediaPerPlatform && accId;
    const currentList = isPerPlatform ? (platformMediaMap[accId] || mediaList) : mediaList;

    if (mode === 'replace' && index !== undefined && index >= 0) {
      const file = fileArray[0];
      const blobUrl = URL.createObjectURL(file);
      const tempMedia: PostMedia = {
        id: `slide_${Date.now()}`,
        name: file.name,
        url: blobUrl,
        thumbnailUrl: blobUrl,
        type: 'image',
        size: file.size,
        aspectRatio: '1:1',
      };
      const updatedList = [...currentList];
      updatedList[index] = tempMedia;
      if (isPerPlatform) {
        setPlatformMediaMap((prev) => ({ ...prev, [accId]: updatedList }));
      } else {
        setMediaList(updatedList);
      }

      showToast('Uploading replaced slide...');
      try {
        const uploadRes = await uploadFileWithProgress(file, () => {});
        if (uploadRes.success && uploadRes.url) {
          const finalMedia = {
            ...tempMedia,
            url: uploadRes.url,
            thumbnailUrl: uploadRes.thumbnailUrl || uploadRes.url,
          };
          const finalList = [...currentList];
          finalList[index] = finalMedia;
          if (isPerPlatform) {
            setPlatformMediaMap((prev) => ({ ...prev, [accId]: finalList }));
          } else {
            setMediaList(finalList);
          }
          showToast(`Slide ${index + 1} updated.`);
        }
      } catch (e) {
        console.warn('Replace slide error:', e);
      }
      return;
    }

    // Adding slides (up to 10 max official limit)
    const availableSlots = Math.max(0, 10 - currentList.length);
    if (availableSlots <= 0) {
      showToast('Maximum 10 slides limit reached for Carousel.');
      return;
    }

    const filesToAdd = fileArray.slice(0, availableSlots);
    const newItems: PostMedia[] = filesToAdd.map((file, i) => {
      const blobUrl = URL.createObjectURL(file);
      return {
        id: `slide_${Date.now()}_${i}`,
        name: file.name,
        url: blobUrl,
        thumbnailUrl: blobUrl,
        type: 'image',
        size: file.size,
        aspectRatio: '1:1',
      };
    });

    const combinedList = [...currentList, ...newItems];
    if (isPerPlatform) {
      setPlatformMediaMap((prev) => ({ ...prev, [accId]: combinedList }));
    } else {
      setMediaList(combinedList);
    }
    const targetIdx = currentList.length;
    setActiveSlideIndices((prev) => ({ ...prev, [targetAccId]: targetIdx, global: targetIdx }));

    showToast(`Uploading ${filesToAdd.length} carousel slide${filesToAdd.length > 1 ? 's' : ''}...`);

    for (let i = 0; i < filesToAdd.length; i++) {
      const file = filesToAdd[i];
      try {
        const uploadRes = await uploadFileWithProgress(file, () => {});
        if (uploadRes.success && uploadRes.url) {
          newItems[i] = {
            ...newItems[i],
            url: uploadRes.url,
            thumbnailUrl: uploadRes.thumbnailUrl || uploadRes.url,
          };
          const liveList = [...currentList, ...newItems];
          if (isPerPlatform) {
            setPlatformMediaMap((prev) => ({ ...prev, [accId]: liveList }));
          } else {
            setMediaList(liveList);
          }
        }
      } catch (err) {
        console.warn('Upload slide error:', err);
      }
    }
    showToast(`Carousel updated (${combinedList.length} slides total).`);
  };

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

  // UI state & granular submission action tracker (strictly isolates draft vs schedule vs live dispatch)
  const [submittingAction, setSubmittingAction] = useState<'schedule' | 'publish-now' | 'draft' | null>(null);
  const isSubmitting = Boolean(submittingAction);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Horizontal Sliding Workspace Ref & Smooth Drag/Scroll Navigation
  const workspaceScrollRef = useRef<HTMLDivElement>(null);
  const [isWorkspaceDragging, setIsWorkspaceDragging] = useState(false);
  const [workspaceStartX, setWorkspaceStartX] = useState(0);
  const [workspaceScrollStart, setWorkspaceScrollStart] = useState(0);

  const handleSlideLeft = () => {
    workspaceScrollRef.current?.scrollBy({ left: -440, behavior: 'smooth' });
  };

  const handleSlideRight = () => {
    workspaceScrollRef.current?.scrollBy({ left: 440, behavior: 'smooth' });
  };

  const handleWorkspaceMouseDown = (e: React.MouseEvent) => {
    if (!workspaceScrollRef.current) return;
    setIsWorkspaceDragging(true);
    setWorkspaceStartX(e.pageX - workspaceScrollRef.current.offsetLeft);
    setWorkspaceScrollStart(workspaceScrollRef.current.scrollLeft);
  };

  const handleWorkspaceMouseMove = (e: React.MouseEvent) => {
    if (!isWorkspaceDragging || !workspaceScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - workspaceScrollRef.current.offsetLeft;
    const walk = (x - workspaceStartX) * 1.5;
    workspaceScrollRef.current.scrollLeft = workspaceScrollStart - walk;
  };

  const handleWorkspaceMouseUp = () => {
    setIsWorkspaceDragging(false);
  };

  // Per-platform media helpers
  const getEffectiveMediaForAccount = (accId: string): PostMedia[] => {
    if (!customizeMediaPerPlatform) return mediaList;
    return platformMediaMap[accId] !== undefined ? platformMediaMap[accId] : mediaList;
  };

  const handlePlatformReplaceMedia = (accId: string) => {
    const input = platformFileInputRefs.current[accId];
    if (input) {
      input.value = '';
      input.click();
    }
  };

  const handlePlatformRemoveMedia = (accId: string) => {
    if (!customizeMediaPerPlatform) {
      // In shared mode, remove from global list
      if (mediaList.length > 0) handleRemoveMedia(mediaList[0].id);
      return;
    }
    setPlatformMediaMap(prev => ({ ...prev, [accId]: [] }));
  };

  const handlePlatformFilesSelected = async (accId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    let blobUrl = '';
    try {
      blobUrl = URL.createObjectURL(file);
    } catch {}

    const newMedia: PostMedia = {
      id: `platform_${accId}_${Date.now()}`,
      url: blobUrl || '',
      thumbnailUrl: blobUrl || '',
      type: file.type.startsWith('video') ? 'video' : 'image',
      name: file.name,
      size: file.size,
    };

    // Immediately display local preview
    setPlatformMediaMap((prev) => ({ ...prev, [accId]: [newMedia] }));

    // Safely upload using robust XHR-based uploadFileWithProgress (never throws 'Failed to fetch')
    try {
      const res = await uploadFileWithProgress(file, () => {});
      if (res.success && res.url) {
        const uploadedUrl: string = res.url;
        setPlatformMediaMap((prev) => ({
          ...prev,
          [accId]: [{ ...newMedia, url: uploadedUrl, thumbnailUrl: res.thumbnailUrl || uploadedUrl }],
        }));
        if (blobUrl) {
          try {
            URL.revokeObjectURL(blobUrl);
          } catch {}
        }
      } else {
        console.warn('[PlatformUpload] Notice:', res.error);
      }
    } catch (err) {
      console.warn('[PlatformUpload] Catch:', err);
    }
  };

  // Sync platformMediaMap when customizeMediaPerPlatform is first enabled
  const handleToggleCustomizeMedia = () => {
    if (!customizeMediaPerPlatform && mediaList.length > 0) {
      // Initialize each selected account with a copy of shared media
      const init: Record<string, PostMedia[]> = {};
      selectedAccountIds.forEach(id => { init[id] = [...mediaList]; });
      setPlatformMediaMap(init);
    }
    setCustomizeMediaPerPlatform(prev => !prev);
  };

  const [isPreviewPanelOpen, setIsPreviewPanelOpen] = useState<boolean>(true);
  const [isMasterCaptionOpen, setIsMasterCaptionOpen] = useState<boolean>(false);
  const [accountFormats, setAccountFormats] = useState<Record<string, string>>({});
  const [expandedCaptions, setExpandedCaptions] = useState<Record<string, boolean>>({});
  const [expandedFeatures, setExpandedFeatures] = useState<Record<string, boolean>>({});
  // Platform-specific media customization
  const [customizeMediaPerPlatform, setCustomizeMediaPerPlatform] = useState<boolean>(false);
  const [platformMediaMap, setPlatformMediaMap] = useState<Record<string, PostMedia[]>>({});
  const platformFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  // Per-platform aspect ratios (1:1, 4:5, 9:16, 16:9)
  const [accountAspectRatios, setAccountAspectRatios] = useState<Record<string, '1:1' | '4:5' | '9:16' | '16:9'>>({});
  // YouTube Studio Shorts metadata state
  const [youtubeTitles, setYoutubeTitles] = useState<Record<string, string>>({});
  const [youtubeCategories, setYoutubeCategories] = useState<Record<string, string>>({});
  const [youtubeMadeForKids, setYoutubeMadeForKids] = useState<Record<string, boolean>>({});
  const [youtubePrivacies, setYoutubePrivacies] = useState<Record<string, 'public' | 'unlisted' | 'private'>>({});

  // Autosave and Unfinished Draft state
  const [hasUnfinishedDraft, setHasUnfinishedDraft] = useState<boolean>(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  // YouTube image warning dismissals
  const [dismissedYoutubeWarnings, setDismissedYoutubeWarnings] = useState<Record<string, boolean>>({});
  // Live Feed Preview carousel index
  const [previewCarouselIndex, setPreviewCarouselIndex] = useState<number>(0);
  // Instagram 7 Functional AI Features state
  const [instagramFeatureTabs, setInstagramFeatureTabs] = useState<Record<string, 'music'|'text'|'topics'|'products'|'link'|'mention'|'tags'|null>>({});
  const [instagramMusic, setInstagramMusic] = useState<Record<string, { title: string; artist: string }>>({});
  const [instagramTextOverlay, setInstagramTextOverlay] = useState<Record<string, { text: string; position: 'top'|'center'|'bottom'; style: 'classic'|'bold'|'neon' }>>({});
  const [instagramTopicsList, setInstagramTopicsList] = useState<Record<string, string[]>>({});
  const [instagramProductsList, setInstagramProductsList] = useState<Record<string, { name: string; sku: string; url: string }[]>>({});
  const [instagramLinkSticker, setInstagramLinkSticker] = useState<Record<string, { url: string; text: string }>>({});
  const [instagramMentionsList, setInstagramMentionsList] = useState<Record<string, string[]>>({});
  const [instagramTagsList, setInstagramTagsList] = useState<Record<string, string[]>>({});
  // Temporary input buffers for adding items
  const [mentionInput, setMentionInput] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState<Record<string, string>>({});
  const [customTopicInput, setCustomTopicInput] = useState<Record<string, string>>({});
  const [newProductName, setNewProductName] = useState<Record<string, string>>({});
  const [newProductSku, setNewProductSku] = useState<Record<string, string>>({});

  // Strictly independent format selection per account - never mutates other accounts
  const handleSelectFormat = (accId: string, platform: SocialPlatform, formatId: string) => {
    setAccountFormats((prev) => ({ ...prev, [accId]: formatId }));
  };

  // Keyboard Escape listener for modals and master caption
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (scheduleLimitModal?.isOpen) {
          setScheduleLimitModal(null);
          e.stopPropagation();
        } else if (isMasterCaptionOpen) {
          setIsMasterCaptionOpen(false);
          e.stopPropagation();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scheduleLimitModal, isMasterCaptionOpen]);

  // Clamp carousel index when accounts change
  useEffect(() => {
    if (previewCarouselIndex >= selectedAccountIds.length && selectedAccountIds.length > 0) {
      setPreviewCarouselIndex(selectedAccountIds.length - 1);
    }
  }, [selectedAccountIds.length]);

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

  // Content-Type Platform Compatibility logic
  // All post types (Text, Image, Video) remain selectable and visually normal.
    // Content-Type Platform Compatibility logic
  // All post types (Text, Image, Video) remain selectable and visually normal.
  const handleSelectPostType = (type: 'text' | 'image' | 'video') => {
    setCurrentPostType(type);

    // Filter currently selected accounts to only those compatible with the newly chosen type
    const supportedIds = selectedAccountIds.filter((id) => {
      const plat = accounts.find((a) => a.id === id)?.platform;
      return plat ? isPlatformSupportedForPostType(plat, type) : false;
    });

    if (supportedIds.length !== selectedAccountIds.length) {
      if (supportedIds.length > 0) {
        setSelectedAccountIds(supportedIds);
      } else {
        const firstSupported = accounts.find((a) => isPlatformSupportedForPostType(a.platform, type));
        setSelectedAccountIds(firstSupported ? [firstSupported.id] : []);
      }
    }

    // Clear feedback notifications as required
    if (type === 'image') {
      const hasYoutube = accounts.some((a) => a.platform === 'youtube');
      if (hasYoutube) {
        showToast('Image posts are not supported on YouTube (Shorts only).');
      }
    } else if (type === 'text') {
      const hasYoutube = accounts.some((a) => a.platform === 'youtube');
      if (hasYoutube) {
        showToast('Text posts are not supported on YouTube (Shorts only).');
      }
    }
  };

  // Synchronize selection so unsupported accounts are never kept in state for the active post type
  useEffect(() => {
    setSelectedAccountIds((prev) => {
      const valid = prev.filter((id) => {
        const acc = accounts.find((a) => a.id === id);
        return acc ? isPlatformSupportedForPostType(acc.platform, currentPostType) : false;
      });
      if (valid.length !== prev.length) {
        if (valid.length > 0) return valid;
        const firstSupported = accounts.find((a) => isPlatformSupportedForPostType(a.platform, currentPostType));
        return firstSupported ? [firstSupported.id] : [];
      }
      return prev;
    });
  }, [currentPostType, accounts]);

  // Active accounts that are fully supported and visible for current post type
  const visibleAccountIds = useMemo(() => {
    return selectedAccountIds.filter((accId) => {
      const acc = accounts.find((a) => a.id === accId);
      if (!acc) return false;
      return isPlatformSupportedForPostType(acc.platform, currentPostType);
    });
  }, [selectedAccountIds, accounts, currentPostType]);

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
      postType: mediaList.length > 1 ? 'carousel' : (mediaList.length > 0 && mediaList[0].type === 'video' ? 'reel' : 'post'),
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

  // 1. Check for unfinished post draft on component mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('pb_draft_autosave');
      if (raw) {
        const d = JSON.parse(raw);
        const hasContent =
          (d.mainCaption && d.mainCaption.trim().length > 0) ||
          (Array.isArray(d.mediaList) && d.mediaList.length > 0) ||
          (d.platformMediaMap && Object.values(d.platformMediaMap).some((arr: any) => Array.isArray(arr) && arr.length > 0));
        if (hasContent) {
          setHasUnfinishedDraft(true);
          setDraftSavedAt(d.savedAt || null);
        }
      }
    } catch {}
  }, []);

  // 2. Debounced Autosave Effect: preserves full editing progress (media, captions, per-platform settings, aspect ratios, YouTube & Instagram settings)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = setTimeout(() => {
      const hasContent =
        mainCaption.trim().length > 0 ||
        mediaList.length > 0 ||
        Object.values(platformMediaMap).some((arr) => Array.isArray(arr) && arr.length > 0);

      if (!hasContent) return;

      const draftPayload = {
        mainCaption,
        accountCaptions,
        accountFormats,
        accountAspectRatios,
        selectedAccountIds,
        currentPostType,
        mediaList,
        customizeMediaPerPlatform,
        platformMediaMap,
        scheduledDate,
        scheduledTime,
        scheduleMode,
        youtubeTitles,
        youtubeCategories,
        youtubeMadeForKids,
        youtubePrivacies,
        instagramMusic,
        instagramTextOverlay,
        instagramTopicsList,
        instagramProductsList,
        instagramLinkSticker,
        instagramMentionsList,
        instagramTagsList,
        instagramAiLabel,
        facebookAiLabel,
        youtubeAiLabel,
        isInstagramCollabEnabled,
        instagramCollaborators,
        savedAt: new Date().toISOString(),
      };

      try {
        localStorage.setItem('pb_draft_autosave', JSON.stringify(draftPayload));
      } catch (err) {
        console.warn('Draft autosave warning:', err);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [
    mainCaption,
    accountCaptions,
    accountFormats,
    accountAspectRatios,
    selectedAccountIds,
    currentPostType,
    mediaList,
    customizeMediaPerPlatform,
    platformMediaMap,
    scheduledDate,
    scheduledTime,
    scheduleMode,
    youtubeTitles,
    youtubeCategories,
    youtubeMadeForKids,
    youtubePrivacies,
    instagramMusic,
    instagramTextOverlay,
    instagramTopicsList,
    instagramProductsList,
    instagramLinkSticker,
    instagramMentionsList,
    instagramTagsList,
    instagramAiLabel,
    facebookAiLabel,
    youtubeAiLabel,
    isInstagramCollabEnabled,
    instagramCollaborators,
  ]);

  const handleResumeDraft = () => {
    try {
      const raw = localStorage.getItem('pb_draft_autosave');
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.mainCaption !== undefined) setMainCaption(d.mainCaption);
      if (d.accountCaptions) setAccountCaptions(d.accountCaptions);
      if (d.accountFormats) setAccountFormats(d.accountFormats);
      if (d.accountAspectRatios) setAccountAspectRatios(d.accountAspectRatios);
      if (Array.isArray(d.selectedAccountIds) && d.selectedAccountIds.length > 0) setSelectedAccountIds(d.selectedAccountIds);
      if (d.currentPostType) setCurrentPostType(d.currentPostType);
      if (Array.isArray(d.mediaList)) setMediaList(d.mediaList);
      if (d.customizeMediaPerPlatform !== undefined) setCustomizeMediaPerPlatform(d.customizeMediaPerPlatform);
      if (d.platformMediaMap) setPlatformMediaMap(d.platformMediaMap);
      if (d.scheduledDate) setScheduledDate(d.scheduledDate);
      if (d.scheduledTime) setScheduledTime(d.scheduledTime);
      if (d.scheduleMode) setScheduleMode(d.scheduleMode);
      if (d.youtubeTitles) setYoutubeTitles(d.youtubeTitles);
      if (d.youtubeCategories) setYoutubeCategories(d.youtubeCategories);
      if (d.youtubeMadeForKids) setYoutubeMadeForKids(d.youtubeMadeForKids);
      if (d.youtubePrivacies) setYoutubePrivacies(d.youtubePrivacies);
      if (d.instagramMusic) setInstagramMusic(d.instagramMusic);
      if (d.instagramTextOverlay) setInstagramTextOverlay(d.instagramTextOverlay);
      if (d.instagramTopicsList) setInstagramTopicsList(d.instagramTopicsList);
      if (d.instagramProductsList) setInstagramProductsList(d.instagramProductsList);
      if (d.instagramLinkSticker) setInstagramLinkSticker(d.instagramLinkSticker);
      if (d.instagramMentionsList) setInstagramMentionsList(d.instagramMentionsList);
      if (d.instagramTagsList) setInstagramTagsList(d.instagramTagsList);
      if (d.instagramAiLabel !== undefined) setInstagramAiLabel(d.instagramAiLabel);
      if (d.facebookAiLabel !== undefined) setFacebookAiLabel(d.facebookAiLabel);
      if (d.youtubeAiLabel !== undefined) setYoutubeAiLabel(d.youtubeAiLabel);
      if (d.isInstagramCollabEnabled !== undefined) setIsInstagramCollabEnabled(d.isInstagramCollabEnabled);
      if (d.instagramCollaborators !== undefined) setInstagramCollaborators(d.instagramCollaborators);

      setHasUnfinishedDraft(false);
      showToast('Unfinished draft resumed successfully.');
    } catch {
      showToast('Failed to restore draft.');
    }
  };

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem('pb_draft_autosave');
    } catch {}
    setHasUnfinishedDraft(false);
    showToast('Unfinished draft discarded.');
  };

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
    const acc = accounts.find((a) => a.id === id);
    if (acc && !isPlatformSupportedForPostType(acc.platform, currentPostType)) {
      showToast(getPlatformUnsupportedReason(acc.platform, currentPostType));
      return;
    }
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
    if (!files && !fileOverride) return;
    const fileArray = fileOverride ? [fileOverride] : files ? Array.from(files) : [];
    if (fileArray.length === 0) return;

    // Multi-image selection (2 or more images) -> automatically setup carousel
    if (fileArray.length > 1 && !fileArray.some(f => f.type.startsWith('video/'))) {
      const imageFiles = fileArray.slice(0, 10);
      const initialTempItems: PostMedia[] = imageFiles.map((file, idx) => {
        const blobUrl = URL.createObjectURL(file);
        return {
          id: `carousel_${Date.now()}_${idx}`,
          name: file.name,
          url: blobUrl,
          thumbnailUrl: blobUrl,
          type: 'image',
          size: file.size,
          aspectRatio: '1:1',
        };
      });

      setMediaList(initialTempItems);
      setCurrentPostType('image');
      setActiveSlideIndices({ global: 0 });

      setUploadState({
        isUploading: true,
        progress: 1,
        loadedBytes: 0,
        totalBytes: imageFiles.reduce((acc, f) => acc + f.size, 0),
        stage: 'preparing',
        statusMessage: `Uploading carousel (1 of ${imageFiles.length} slides)...`,
        error: null,
      });
      setDisplayProgress(1);

      const finalUploadedItems: PostMedia[] = [...initialTempItems];
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const pct = Math.max(1, Math.round(((i + 1) / imageFiles.length) * 100));
        setUploadState((prev) => ({
          ...prev,
          progress: pct,
          statusMessage: `Uploading slide ${i + 1} of ${imageFiles.length}...`,
        }));
        setDisplayProgress(pct);

        try {
          const uploadRes = await uploadFileWithProgress(file, () => {});
          if (uploadRes.success && uploadRes.url) {
            finalUploadedItems[i] = {
              ...finalUploadedItems[i],
              url: uploadRes.url,
              thumbnailUrl: uploadRes.thumbnailUrl || uploadRes.url,
            };
            setMediaList([...finalUploadedItems]);
          }
        } catch (err) {
          console.warn('Carousel upload slide error:', err);
        }
      }

      setUploadState((prev) => ({
        ...prev,
        isUploading: false,
        progress: 100,
        stage: 'complete',
        statusMessage: 'Carousel uploaded successfully!',
      }));
      setDisplayProgress(100);
      showToast(`${imageFiles.length} carousel slides ready.`);
      if (uploadPromiseResolveRef.current) {
        uploadPromiseResolveRef.current(true);
        uploadPromiseResolveRef.current = null;
      }
      return;
    }

    const chosenFile = fileArray[0];

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
        setSubmittingAction(null);
        return;
      }
    }

    // Schedule validation
    if (action === 'schedule' && !isScheduleValid) {
      showToast('The selected schedule time is in the past. Please select a future date and time.');
      return;
    }

    // Monthly post limit enforcement for Free plan (5 posts per account per month)
    // Enforced on both scheduling and publishing. Drafts are exempt.
    if (action === 'schedule' || action === 'publish-now') {
      if (isFreePlan) {
        const blocked: { id: string; name: string; count: number }[] = [];

        for (const chId of selectedAccountIds) {
          const acc = accounts.find((a) => a.id === chId);
          const usage = monthlyUsage.accounts[chId];
          const count = usage ? usage.usedCount : 0;
          if (count >= 5) {
            blocked.push({
              id: chId,
              name: acc?.displayName || acc?.username || usage?.accountName || 'Channel',
              count,
            });
          }
        }

        if (blocked.length > 0) {
          setScheduleLimitModal({
            isOpen: true,
            blockedChannels: blocked,
            canScheduleRemaining: selectedAccountIds.length > blocked.length,
            actionType: action,
            resetsAt: monthlyUsage.resetsAt,
          });
          return;
        }
      }
    }

    setSubmittingAction(action);
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
                  const uploadRes = await uploadFileWithProgress(fileObj, () => {});
                  if (uploadRes.success && uploadRes.url) {
                    return {
                      ...item,
                      url: uploadRes.url,
                      thumbnailUrl: uploadRes.thumbnailUrl || uploadRes.url,
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
        setSubmittingAction(null);
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
              ? (youtubeTitles[accId]?.trim() || accData?.title?.trim() || mainCaption.split('\n')[0] || 'YouTube Short').slice(0, 100)
              : undefined,
          categoryId: acc.platform === 'youtube' ? (youtubeCategories[accId] || '22') : undefined,
          madeForKids: acc.platform === 'youtube' ? (youtubeMadeForKids[accId] ?? false) : undefined,
          privacyStatus: acc.platform === 'youtube' ? (youtubePrivacies[accId] || 'public') : undefined,
          isAiGenerated: isAi,
          collaborator: collab,
          media: getEffectiveMediaForAccount(accId),
          postType:
            acc.platform === 'youtube'
              ? 'short'
              : accountFormats[accId] ||
                (currentPostType === 'video'
                  ? 'reel'
                  : 'post'),
          aspectRatio: acc.platform === 'youtube' ? '9:16' : accountAspectRatios[accId],
          music: instagramMusic[accId],
          textOverlay: instagramTextOverlay[accId],
          topics: instagramTopicsList[accId],
          productTags: instagramProductsList[accId]?.map(p => p.name),
          linkSticker: instagramLinkSticker[accId],
          mentions: instagramMentionsList[accId],
          tags: instagramTagsList[accId],
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

      // Determine dominant postType from selected accounts' formats
      const formatCounts: Record<string, number> = {};
      selectedAccountIds.forEach(accId => {
        const acc = accounts.find(a => a.id === accId);
        if (!acc) return;
        const fmt = accountFormats[accId] || (acc.platform === 'youtube' ? 'short' : (currentPostType === 'video' ? 'reel' : 'post'));
        formatCounts[fmt] = (formatCounts[fmt] || 0) + 1;
      });
      const isCarousel = finalMediaList.length > 1;
      const dominantFormat = isCarousel ? 'carousel' : (Object.entries(formatCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || (currentPostType === 'video' ? 'reel' : 'post'));

      const payload: Partial<Post> = {
        content: mainCaption,
        targetAccountIds: action === 'draft' ? selectedAccountIds : visibleAccountIds,
        media: finalMediaList,
        postType: dominantFormat as PostType,
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

        try {
          localStorage.removeItem('pb_draft_autosave');
          setHasUnfinishedDraft(false);
        } catch {}
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
      try {
        localStorage.removeItem('pb_draft_autosave');
        setHasUnfinishedDraft(false);
      } catch {}
      showToast(
        action === 'schedule'
          ? 'Post scheduled successfully.'
          : action === 'draft'
          ? 'Draft saved successfully.'
          : 'Post published live!'
      );
      if (onBack) onBack();
    } catch (err: any) {
      showToast(`Publishing error: ${err?.message || 'Could not save post'}`);
    } finally {
      setSubmittingAction(null);
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

              {/* Content-Type Selector (Image | Video | Text) with Visual Hierarchy */}
              <div className="flex items-center gap-2.5">
                <div className="inline-flex items-center bg-gray-100/90 p-1 rounded-xl border border-gray-200/90 shadow-2xs gap-1">
                  {/* 1. Image Option */}
                  <button
                    type="button"
                    onClick={() => handleSelectPostType('image')}
                    title="Create Image Post"
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                      currentPostType === 'image'
                        ? 'bg-white text-emerald-700 border border-emerald-500/40 shadow-2xs font-bold ring-1 ring-emerald-500/20'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/70 font-semibold'
                    }`}
                  >
                    <FileImage className={`w-3.5 h-3.5 ${currentPostType === 'image' ? 'text-emerald-600' : 'text-gray-500'}`} />
                    <span>Image</span>
                  </button>

                  {/* 2. Video Option */}
                  <button
                    type="button"
                    onClick={() => handleSelectPostType('video')}
                    title="Create Video or Reel Post"
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                      currentPostType === 'video'
                        ? 'bg-white text-emerald-700 border border-emerald-500/40 shadow-2xs font-bold ring-1 ring-emerald-500/20'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/70 font-semibold'
                    }`}
                  >
                    <Video className={`w-3.5 h-3.5 ${currentPostType === 'video' ? 'text-emerald-600' : 'text-gray-500'}`} />
                    <span>Video</span>
                  </button>

                  {/* 3. Text Option */}
                  <button
                    type="button"
                    onClick={() => handleSelectPostType('text')}
                    title="Create Text Post"
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                      currentPostType === 'text'
                        ? 'bg-white text-emerald-700 border border-emerald-500/40 shadow-2xs font-bold ring-1 ring-emerald-500/20'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/70 font-semibold'
                    }`}
                  >
                    <Type className={`w-3.5 h-3.5 ${currentPostType === 'text' ? 'text-emerald-600' : 'text-gray-500'}`} />
                    <span>Text</span>
                  </button>
                </div>
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
            monthlyUsageByAccount={monthlyUsage.accounts}
            onToggleAccount={handleToggleAccount}
            onShowNotice={showToast}
            onSelectAll={() => {
              const supportedAccIds = accounts
                .filter((a) => isPlatformSupportedForPostType(a.platform, currentPostType))
                .map((a) => a.id);
              setSelectedAccountIds(supportedAccIds);
              if (rememberAccounts && typeof window !== 'undefined') {
                localStorage.setItem('pb_remembered_accounts', JSON.stringify(supportedAccIds));
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

        {/* Hidden File Input for Carousel Creation & Slide Addition / Replacement */}
        <input
          type="file"
          ref={carouselFileInputRef}
          accept="image/*"
          multiple
          onChange={(e) => {
            handleCarouselFilesSelected(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />

        {/* Unfinished Post Draft Resume / Discard Prompt */}
        {hasUnfinishedDraft && (
          <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">You have an unfinished post</h4>
                <p className="text-[11px] text-gray-600">
                  {draftSavedAt
                    ? `Saved automatically on ${new Date(draftSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
                    : 'Unsaved edits were detected from your previous session.'}{' '}
                  Would you like to resume where you left off?
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-amber-100/60 transition-colors cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleResumeDraft}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors cursor-pointer flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resume Post</span>
              </button>
            </div>
          </div>
        )}

        {/* WORKSPACE TOOLBAR WITH HORIZONTAL SLIDING CONTROLS */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-gray-200/90 p-3.5 px-5 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-gray-900 tracking-tight">Platform Workspace</span>
            </div>
            <span className="text-gray-300">•</span>
            <span className="text-xs text-gray-500 font-medium">
              {visibleAccountIds.length} {visibleAccountIds.length === 1 ? 'channel' : 'channels'} active
            </span>

            {/* Master Caption quick toggle for multi-channel workflows */}
            {visibleAccountIds.length > 1 && currentPostType !== 'text' && (
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

          {/* Same [Toggle Switch] Media for All */}
          {currentPostType !== 'text' && visibleAccountIds.length > 1 && (
            <div className="flex items-center space-x-2 bg-gray-50 border border-gray-200/90 px-3.5 py-1.5 rounded-xl shadow-2xs">
              <span className="text-xs font-semibold text-gray-800 tracking-tight">Same</span>
              <button
                type="button"
                role="switch"
                aria-checked={!customizeMediaPerPlatform}
                onClick={handleToggleCustomizeMedia}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  !customizeMediaPerPlatform ? 'bg-emerald-600' : 'bg-gray-300'
                }`}
                title={!customizeMediaPerPlatform ? 'Same Media for All is active (one file shared across all channels)' : 'Per-Platform Media is active (separate files for each channel)'}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    !customizeMediaPerPlatform ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-xs font-semibold text-gray-800 tracking-tight">Media for All</span>
            </div>
          )}

          {/* Smooth Horizontal Sliding Navigation Controls */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-gray-400 font-medium hidden sm:inline mr-1">
              Scroll channels
            </span>
            <button
              type="button"
              onClick={handleSlideLeft}
              className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-gray-200/80 transition-all cursor-pointer shadow-2xs"
              title="Slide Left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleSlideRight}
              className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-gray-200/80 transition-all cursor-pointer shadow-2xs"
              title="Slide Right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Master Caption Collapsible Editor */}
        {isMasterCaptionOpen && visibleAccountIds.length > 1 && currentPostType !== 'text' && (
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


          </div>
        )}

        {/* 1. HORIZONTAL SLIDING PLATFORM WORKSPACE (FIXED DIMENSIONS - NEVER SHRINKS) */}
        {currentPostType === 'text' ? (
          /* PART 3: REDESIGNED PREMIUM TEXT POST WORKSPACE */
          <div className="bg-white rounded-3xl border border-gray-200/90 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Type className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 tracking-tight">Text Post Composer</h3>
                  <p className="text-[11px] text-gray-400">Craft clear, formatted updates across your connected channels</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-xs font-mono text-gray-400">
                <span className="font-semibold text-gray-700">{mainCaption.length}</span>
                <span>chars</span>
              </div>
            </div>

            <textarea
              value={mainCaption}
              onChange={(e) => setMainCaption(e.target.value)}
              placeholder="What would you like to share? Write your text post, announce news, share links, or post thoughts..."
              className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-200 rounded-2xl p-4 focus:outline-hidden focus:border-emerald-500 resize-none min-h-[220px] leading-relaxed bg-white"
            />


          </div>
        ) : (
          /* PART 1: HORIZONTAL SLIDING WORKSPACE WITH FIXED-WIDTH PLATFORM CARDS */
          <div
            ref={workspaceScrollRef}
            onMouseDown={handleWorkspaceMouseDown}
            onMouseMove={handleWorkspaceMouseMove}
            onMouseUp={handleWorkspaceMouseUp}
            onMouseLeave={handleWorkspaceMouseUp}
            className="w-full overflow-x-auto scroll-smooth pb-4 pt-1 px-1 scrollbar-thin select-none"
          >
            <div className="flex items-start gap-6 w-max min-w-full">
              {visibleAccountIds.length === 0 ? (
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
                /* FIXED-SIZE PLATFORM PANELS (Exact 420px Width - Never Shrinks) */
                selectedAccountIds.map((accId) => {
                  const acc = accounts.find((a) => a.id === accId);
                  if (!acc) return null;

                  const config = getPlatformVisualConfig(acc.platform);
                  const activeFormat =
                    accountFormats[accId] ||
                    (acc.platform === 'youtube'
                      ? 'short'
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
                      className="bg-white rounded-3xl border border-gray-200/90 shadow-xs p-5 space-y-4 w-[420px] min-w-[420px] max-w-[420px] shrink-0 flex flex-col transition-all"
                    >
                      {/* 1. PLATFORM HEADER (Actual Account Profile Picture/Logo Only - No Unnecessary Text) */}
                      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <img
                              src={
                                acc.avatarUrl ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                  acc.displayName || acc.username || 'A'
                                )}&background=059669&color=fff&size=128&bold=true`
                              }
                              alt={acc.displayName || acc.username}
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                  acc.displayName || acc.username || 'A'
                                )}&background=059669&color=fff&size=128&bold=true`;
                              }}
                              className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-xs"
                            />
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white shadow-xs border border-gray-200 flex items-center justify-center">
                              <PlatformLogo platform={acc.platform} className="w-3 h-3" />
                            </div>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-gray-900 block truncate max-w-[220px]">
                              {acc.displayName || acc.username}
                            </span>
                            <span className="text-[10px] text-gray-400 capitalize font-medium">
                              {acc.platform}
                            </span>
                          </div>
                        </div>


                      </div>

                      {/* 2. PUBLISHING FORMAT SELECTORS (Post / Reel / Story - Premium Neutral Styling) */}
                      <div className={`flex items-center gap-2 ${config.supportedFormats.length === 1 ? 'justify-center' : ''}`}>
                        {config.supportedFormats.map((fmt) => {
                          const isActive = activeFormat === fmt.id;
                          const isSingle = config.supportedFormats.length === 1;
                          return (
                            <button
                              key={fmt.id}
                              type="button"
                              onClick={() => {
                                handleSelectFormat(acc.id, acc.platform, fmt.id);
                                // Default aspect ratio based on selected format
                                if (fmt.id === 'reel' || fmt.id === 'story' || fmt.id === 'short') {
                                  setAccountAspectRatios(prev => ({ ...prev, [acc.id]: '9:16' }));
                                } else if (fmt.id === 'video') {
                                  setAccountAspectRatios(prev => ({ ...prev, [acc.id]: '16:9' }));
                                }
                              }}
                              className={`${
                                isSingle
                                  ? 'py-1 px-5 rounded-full text-xs font-bold w-auto min-w-[100px] max-w-[140px] mx-auto shadow-2xs'
                                  : 'flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold'
                              } transition-all cursor-pointer text-center ${
                                isActive
                                  ? 'bg-gray-900 text-white shadow-xs'
                                  : 'bg-gray-100/80 text-gray-700 hover:bg-gray-200/80'
                              }`}
                            >
                              {fmt.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Aspect Ratio Selector for this platform & format */}
                      {(() => {
                        const availableRatios: ('1:1' | '4:5' | '9:16' | '16:9')[] =
                          activeFormat === 'reel' || activeFormat === 'story' || activeFormat === 'short'
                            ? ['9:16']
                            : activeFormat === 'video'
                            ? ['16:9', '1:1']
                            : ['1:1', '4:5', '16:9'];
                        const currentRatio =
                          accountAspectRatios[acc.id] ||
                          (activeFormat === 'reel' || activeFormat === 'story' || activeFormat === 'short'
                            ? '9:16'
                            : activeFormat === 'video'
                            ? '16:9'
                            : '1:1');

                        return (
                          <div className="flex items-center justify-between px-1 py-0.5">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                              Aspect Ratio
                            </span>
                            <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-xl border border-gray-200/60">
                              {availableRatios.map((r) => (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => setAccountAspectRatios((prev) => ({ ...prev, [acc.id]: r }))}
                                  className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                    currentRatio === r
                                      ? 'bg-gray-900 text-white shadow-xs'
                                      : 'text-gray-600 hover:text-gray-900'
                                  }`}
                                >
                                  {r}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* YouTube Image Warning matching reference image media_1793768290589_7a75e9ea.png */}
                      {(() => {
                        const effectiveMedia = getEffectiveMediaForAccount(acc.id);
                        const isImage = effectiveMedia.length > 0 && (effectiveMedia[0].type === 'image' || /\.(png|jpe?g|webp)$/i.test(effectiveMedia[0].name || ''));
                        const isVideoFormat = activeFormat === 'video' || activeFormat === 'short';
                        const isCommunityFormat = activeFormat === 'post';

                        if (acc.platform === 'youtube' && isVideoFormat && isImage && !dismissedYoutubeWarnings[acc.id]) {
                          const ext = effectiveMedia[0].name?.split('.').pop()?.toUpperCase() || 'PNG';
                          return (
                            <div className="bg-[#3f2525] border border-[#613333] text-[#fca5a5] rounded-2xl p-3.5 flex items-start justify-between gap-3 text-xs shadow-xs animate-in fade-in">
                              <div className="flex items-start space-x-2.5 min-w-0">
                                <AlertTriangle className="w-4 h-4 text-[#f87171] shrink-0 mt-0.5" />
                                <span className="leading-snug">
                                  We can&apos;t quite use that type of file ({ext}). Could you try one of the following instead: MOV, MP4, M4V, MPG, MPEG, AVI, WEBM? Or switch to <strong>Community Post</strong>.
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setDismissedYoutubeWarnings((prev) => ({ ...prev, [acc.id]: true }))}
                                className="text-[#fca5a5]/70 hover:text-white shrink-0 p-0.5 transition-colors cursor-pointer"
                                title="Dismiss warning"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        }

                        if (acc.platform === 'youtube' && isCommunityFormat) {
                          return (
                            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-900 rounded-2xl p-3 flex items-start space-x-2 text-xs animate-in fade-in">
                              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div className="space-y-0.5 min-w-0">
                                <span className="font-semibold block text-amber-950">YouTube Community Post Workflow</span>
                                <span className="text-[11px] text-amber-800 leading-tight block">
                                  YouTube Data API v3 does not permit 3rd-party automated Community Post image posting. We save your draft and provide a 1-Click launcher to publish on your Community tab.
                                </span>
                              </div>
                            </div>
                          );
                        }

                        return null;
                      })()}

                      {/* Per-platform hidden file input */}
                      <input
                        type="file"
                        ref={(el) => { platformFileInputRefs.current[accId] = el; }}
                        accept={currentPostType === 'video' ? 'video/*' : 'image/*,video/*'}
                        className="hidden"
                        onChange={(e) => {
                          handlePlatformFilesSelected(accId, e.target.files);
                          e.target.value = '';
                        }}
                      />

                      {/* 3. UPLOAD MEDIA SECTION */}
                      {(() => {
                        const effectiveMedia = getEffectiveMediaForAccount(accId);
                        const isUploading = uploadState.isUploading && !customizeMediaPerPlatform;
                        const isYouTube = acc.platform === 'youtube';
                        const isCarousel = effectiveMedia.length > 1;
                        const activeSlide = Math.min(activeSlideIndices[accId] ?? activeSlideIndices['global'] ?? 0, Math.max(0, effectiveMedia.length - 1));
                        const currentMedia = effectiveMedia[activeSlide] || effectiveMedia[0];

                        return (
                          <div className="space-y-3">
                            {effectiveMedia.length === 0 ? (
                              /* Soft Grey Dropzone */
                              <div
                                onClick={customizeMediaPerPlatform ? () => handlePlatformReplaceMedia(accId) : triggerUploadPicker}
                                className="bg-[#f0f1f3]/90 rounded-2xl p-6 min-h-[200px] flex flex-col items-center justify-center text-center cursor-pointer border border-transparent hover:border-gray-300 transition-all group"
                              >
                                <div className="w-13 h-13 rounded-2xl bg-white shadow-xs flex items-center justify-center text-gray-700 mb-3 group-hover:scale-105 transition-transform">
                                  <UploadCloud className="w-6 h-6 text-gray-700" />
                                </div>
                                <h4 className="text-xs font-bold text-gray-900">
                                  Drop your files here or browse
                                </h4>
                                <p className="text-[11px] text-gray-400 mt-1">
                                  {isYouTube
                                    ? 'Upload vertical video for YouTube Shorts (up to 500 MB)'
                                    : 'Upload images, video, or select multiple for carousel'}
                                </p>
                              </div>
                            ) : (
                              /* Media Preview with clean overlay controls */
                              <div className="space-y-2">
                                {/* Visual Thumbnail / Video Player */}
                                <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 group shadow-2xs min-h-[200px]">
                                  {(() => {
                                    const currentCardRatio =
                                      accountAspectRatios[acc.id] ||
                                      (activeFormat === 'reel' || activeFormat === 'story' || activeFormat === 'short'
                                        ? '9:16'
                                        : activeFormat === 'video'
                                        ? '16:9'
                                        : '1:1');
                                    const cardAspectClass =
                                      currentCardRatio === '1:1'
                                        ? 'aspect-square'
                                        : currentCardRatio === '4:5'
                                        ? 'aspect-[4/5]'
                                        : currentCardRatio === '9:16'
                                        ? 'aspect-[9/16]'
                                        : 'aspect-video';

                                    return (
                                      <div
                                        className={`${cardAspectClass} overflow-hidden flex items-center justify-center relative bg-gray-100 rounded-2xl max-h-[240px] w-full`}
                                      >
                                        {currentMedia?.type === 'video' ? (
                                          <video
                                            src={currentMedia.url}
                                            controls={!isUploading}
                                            playsInline
                                            preload="metadata"
                                            className={`w-full h-full relative z-10 ${mediaFitMode === 'cover' ? 'object-cover' : 'object-contain'} ${isUploading ? 'opacity-75 blur-xs' : ''} transition-all duration-300`}
                                          />
                                        ) : currentMedia ? (
                                          <img
                                            src={currentMedia.thumbnailUrl || currentMedia.url}
                                            alt={`Media Slide ${activeSlide + 1}`}
                                            className={`w-full h-full ${mediaFitMode === 'cover' ? 'object-cover' : 'object-contain'} ${isUploading ? 'opacity-75 blur-xs' : ''} transition-all duration-300`}
                                          />
                                        ) : null}

                                        {/* Carousel Overlay Badges & Controls */}
                                        {isCarousel && (
                                          <>
                                            <div className="absolute top-2.5 left-2.5 z-20 bg-black/65 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs shadow-xs pointer-events-none">
                                              Slide {activeSlide + 1} of {effectiveMedia.length}
                                            </div>
                                            <div className="absolute top-2.5 right-2.5 z-20 bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs pointer-events-none">
                                              Carousel ({effectiveMedia.length}/10)
                                            </div>

                                            {/* Left Navigation Arrow */}
                                            {activeSlide > 0 && (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setActiveSlideIndices((prev) => ({ ...prev, [accId]: activeSlide - 1, global: activeSlide - 1 }));
                                                }}
                                                className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs shadow-md transition-all cursor-pointer"
                                                title="Previous slide"
                                              >
                                                <ChevronLeft className="w-4 h-4" />
                                              </button>
                                            )}

                                            {/* Right Navigation Arrow */}
                                            {activeSlide < effectiveMedia.length - 1 && (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setActiveSlideIndices((prev) => ({ ...prev, [accId]: activeSlide + 1, global: activeSlide + 1 }));
                                                }}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs shadow-md transition-all cursor-pointer"
                                                title="Next slide"
                                              >
                                                <ChevronRight className="w-4 h-4" />
                                              </button>
                                            )}

                                            {/* Slide Pagination Dots */}
                                            <div className="absolute bottom-2.5 inset-x-0 z-20 flex justify-center items-center gap-1.5 pointer-events-auto">
                                              {effectiveMedia.map((_, dotIdx) => (
                                                <button
                                                  key={dotIdx}
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveSlideIndices((prev) => ({ ...prev, [accId]: dotIdx, global: dotIdx }));
                                                  }}
                                                  className={`rounded-full transition-all cursor-pointer ${
                                                    dotIdx === activeSlide
                                                      ? 'w-2.5 h-1.5 bg-emerald-500 ring-2 ring-white/50'
                                                      : 'w-1.5 h-1.5 bg-white/70 hover:bg-white'
                                                  }`}
                                                  title={`Slide ${dotIdx + 1}`}
                                                />
                                              ))}
                                            </div>
                                          </>
                                        )}

                                        {/* Visual Text Overlay if configured for Instagram */}
                                        {acc.platform === 'instagram' && instagramTextOverlay[acc.id]?.text && (
                                          <div
                                            className={`absolute z-20 left-3 right-3 ${
                                              instagramTextOverlay[acc.id]?.position === 'top'
                                                ? 'top-3'
                                                : instagramTextOverlay[acc.id]?.position === 'bottom'
                                                ? 'bottom-3'
                                                : 'top-1/2 -translate-y-1/2'
                                            } text-center pointer-events-none select-none`}
                                          >
                                            <span className="inline-block bg-black/75 text-white font-bold text-xs px-3 py-1.5 rounded-xl backdrop-blur-xs shadow-md border border-white/10 max-w-full truncate">
                                              {instagramTextOverlay[acc.id].text}
                                            </span>
                                          </div>
                                        )}

                                        {/* Upload Progress Overlay */}
                                        {(isUploading || uploadState.stage === 'error') && !customizeMediaPerPlatform && (
                                          <div className="absolute inset-0 bg-white/85 backdrop-blur-xs z-30 flex items-center justify-center p-3 select-none">
                                            {uploadState.stage === 'error' ? (
                                              <div className="bg-white rounded-xl border border-rose-200 p-3 max-w-[240px] text-center space-y-2 shadow-lg">
                                                <AlertCircle className="w-5 h-5 text-rose-600 mx-auto" />
                                                <p className="text-[11px] text-rose-600 leading-tight">{uploadState.error || 'Upload failed.'}</p>
                                              </div>
                                            ) : (
                                              <div className="bg-white rounded-2xl border border-gray-200/90 p-4 w-full max-w-[240px] shadow-lg text-center space-y-3 animate-in fade-in zoom-in-95 duration-150">
                                                <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
                                                <div className="space-y-1">
                                                  <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                                                    <span>Uploading...</span>
                                                    <span className="font-mono text-emerald-600">{displayProgress}%</span>
                                                  </div>
                                                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                    <div className="bg-emerald-600 h-1.5 rounded-full transition-all duration-200 ease-out" style={{ width: `${displayProgress}%` }} />
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Carousel or Single Media Actions Row */}
                                {isCarousel ? (
                                  <div className="bg-white rounded-xl border border-gray-200 px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                                    <div className="flex items-center space-x-2 min-w-0">
                                      <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700 shrink-0">
                                        {activeSlide + 1}/{effectiveMedia.length}
                                      </div>
                                      <span className="text-[11px] text-gray-500 font-medium truncate">
                                        {currentMedia?.size ? `${(currentMedia.size / (1024 * 1024)).toFixed(1)} MB` : 'Slide'} • Slide {activeSlide + 1}
                                      </span>
                                      {customizeMediaPerPlatform && (
                                        <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-full shrink-0">Custom</span>
                                      )}
                                    </div>

                                    <div className="flex items-center flex-wrap gap-1.5 shrink-0">
                                      {/* Reorder Left */}
                                      <button
                                        type="button"
                                        disabled={activeSlide === 0}
                                        onClick={() => handleCarouselMoveLeft(accId)}
                                        className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 text-xs font-semibold transition-colors border border-gray-200/80 shadow-2xs cursor-pointer"
                                        title="Move slide left"
                                      >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                      </button>

                                      {/* Reorder Right */}
                                      <button
                                        type="button"
                                        disabled={activeSlide === effectiveMedia.length - 1}
                                        onClick={() => handleCarouselMoveRight(accId)}
                                        className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 text-xs font-semibold transition-colors border border-gray-200/80 shadow-2xs cursor-pointer"
                                        title="Move slide right"
                                      >
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      </button>

                                      {/* Replace Slide */}
                                      <button
                                        type="button"
                                        onClick={() => triggerReplaceSlide(accId, activeSlide)}
                                        className="px-2.5 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-gray-900 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 border border-gray-200/80 shadow-2xs"
                                        title="Replace this slide"
                                      >
                                        <RotateCcw className="w-3 h-3 text-gray-500" />
                                        <span>Replace</span>
                                      </button>

                                      {/* Remove Slide */}
                                      <button
                                        type="button"
                                        onClick={() => handleCarouselRemoveSlide(accId, activeSlide)}
                                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 border border-rose-200/80 shadow-2xs"
                                        title="Remove this slide"
                                      >
                                        <Trash2 className="w-3 h-3 text-rose-500" />
                                        <span>Remove</span>
                                      </button>

                                      {/* Add Slide (up to 10 max) */}
                                      {effectiveMedia.length < 10 && (
                                        <button
                                          type="button"
                                          onClick={() => triggerCreateCarousel(accId)}
                                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 border border-emerald-200/80 shadow-2xs"
                                          title="Add another slide (up to 10 max)"
                                        >
                                          <Plus className="w-3 h-3 text-emerald-600" />
                                          <span>Add Slide</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  /* Single Media row */
                                  <div className="bg-white rounded-xl border border-gray-200 px-3 py-2 flex items-center justify-between shadow-2xs">
                                    <div className="flex items-center space-x-2 min-w-0">
                                      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-600 shrink-0 uppercase">
                                        {effectiveMedia[0]?.type === 'video' ? 'VID' : 'IMG'}
                                      </div>
                                      <span className="text-[11px] text-gray-500 font-medium truncate">
                                        {effectiveMedia[0]?.size ? `${(effectiveMedia[0].size / (1024 * 1024)).toFixed(1)} MB` : 'Uploaded'}
                                      </span>
                                      {customizeMediaPerPlatform && (
                                        <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-full shrink-0">Custom</span>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-1.5 shrink-0">
                                      {/* Create Carousel button (Only for images on non-YouTube accounts) */}
                                      {currentMedia?.type !== 'video' && !isYouTube && (
                                        <button
                                          type="button"
                                          onClick={() => triggerCreateCarousel(accId)}
                                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 border border-emerald-200/80 shadow-2xs"
                                          title="Add images to create a multi-image carousel"
                                        >
                                          <Layers className="w-3.5 h-3.5 text-emerald-600" />
                                          <span>Create Carousel</span>
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={customizeMediaPerPlatform ? () => handlePlatformReplaceMedia(accId) : triggerReplaceMedia}
                                        className="px-2.5 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-gray-900 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 border border-gray-200/80 shadow-2xs"
                                        title="Replace media with a different file"
                                      >
                                        <RotateCcw className="w-3 h-3 text-gray-500" />
                                        <span>Replace</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handlePlatformRemoveMedia(accId)}
                                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 border border-rose-200/80 shadow-2xs"
                                        title="Remove media from post"
                                      >
                                        <Trash2 className="w-3 h-3 text-rose-500" />
                                        <span>Remove</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* YouTube Shorts Title Field (Separate Input) */}
                      {acc.platform === 'youtube' && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-800">Shorts Title</label>
                            <span className="text-[10px] font-mono text-gray-400">
                              {(youtubeTitles[acc.id] || '').length}/100
                            </span>
                          </div>
                          <input
                            type="text"
                            maxLength={100}
                            value={youtubeTitles[acc.id] || ''}
                            onChange={(e) => setYoutubeTitles(prev => ({ ...prev, [acc.id]: e.target.value }))}
                            placeholder="Add a title that describes your Short (required)"
                            className="w-full text-xs text-gray-900 border border-gray-200 rounded-xl p-3 focus:outline-hidden focus:border-red-500 bg-white shadow-2xs font-medium"
                          />
                        </div>
                      )}

                      {/* 4. EXPANDABLE CAPTIONS ROW (Directly Below Upload Media) */}
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCaptions((prev) => ({
                              ...prev,
                              [acc.id]: !isCaptionOpen,
                            }))
                          }
                          className="w-full border border-gray-200/90 rounded-2xl p-3 px-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/70 transition-all bg-white shadow-2xs"
                        >
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 font-bold">
                              <Type className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-bold text-gray-800">{acc.platform === 'youtube' ? 'Description & #Shorts' : 'Captions'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-[11px] font-mono text-gray-400">
                              {charCount}/{config.limit || 2200}
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
                                  Exceeds limit ({charCount}/{config.limit}).
                                </span>
                              </div>
                            )}


                          </div>
                        )}
                      </div>

                      {/* 5. EXPANDABLE AI FEATURES ROW (Directly Below Captions) */}
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedFeatures((prev) => ({
                              ...prev,
                              [acc.id]: !isFeaturesOpen,
                            }))
                          }
                          className="w-full border border-gray-200/90 rounded-2xl p-3 px-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/70 transition-all bg-white shadow-2xs"
                        >
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                              <Sparkles className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-bold text-gray-800">AI Features</span>
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
                              <div className="space-y-3">
                                {/* AI-Generated Content Toggle */}
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

                                {/* Instagram 7 Functional AI Features */}
                                <div className="space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                      Instagram Features & Overlays
                                    </p>
                                    <span className="text-[10px] text-emerald-600 font-semibold">Active & Persistent</span>
                                  </div>

                                  {/* Format-Specific Instagram AI Features (Neutral Light Grey Styling) */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {(() => {
                                      // Dynamic feature set:
                                      // Instagram Post: Music, Tagged Products, Text
                                      // Instagram Reel: Music, Text, Topics, Tagged Products
                                      // Instagram Story: Text, Link, Music
                                      const featureList =
                                        activeFormat === 'story'
                                          ? [
                                              { id: 'text' as const, label: 'Text', icon: <span className="font-bold text-xs shrink-0">Aa</span> },
                                              { id: 'link' as const, label: 'Link', icon: <LinkIcon className="w-3.5 h-3.5 shrink-0" /> },
                                              { id: 'music' as const, label: 'Music', icon: <Music2 className="w-3.5 h-3.5 shrink-0" /> },
                                            ]
                                          : activeFormat === 'reel'
                                          ? [
                                              { id: 'music' as const, label: 'Music', icon: <Music2 className="w-3.5 h-3.5 shrink-0" /> },
                                              { id: 'text' as const, label: 'Text', icon: <span className="font-bold text-xs shrink-0">Aa</span> },
                                              { id: 'topics' as const, label: 'Topics', icon: <span className="font-bold text-xs shrink-0">#</span> },
                                              { id: 'products' as const, label: 'Tagged Products', icon: <ShoppingBag className="w-3.5 h-3.5 shrink-0" /> },
                                            ]
                                          : [
                                              { id: 'music' as const, label: 'Music', icon: <Music2 className="w-3.5 h-3.5 shrink-0" /> },
                                              { id: 'text' as const, label: 'Text', icon: <span className="font-bold text-xs shrink-0">Aa</span> },
                                              { id: 'products' as const, label: 'Tagged Products', icon: <ShoppingBag className="w-3.5 h-3.5 shrink-0" /> },
                                            ];

                                      return featureList.map((feat) => {
                                        const isActive = instagramFeatureTabs[acc.id] === feat.id;
                                        return (
                                          <button
                                            key={feat.id}
                                            type="button"
                                            onClick={() =>
                                              setInstagramFeatureTabs((prev) => ({
                                                ...prev,
                                                [acc.id]: prev[acc.id] === feat.id ? null : feat.id,
                                              }))
                                            }
                                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                              isActive
                                                ? 'bg-gray-900 text-white shadow-xs'
                                                : 'bg-[#f0f1f3] hover:bg-[#e4e6ea] text-gray-700 border border-gray-200/80'
                                            }`}
                                          >
                                            <span className={isActive ? 'text-white' : 'text-gray-600'}>{feat.icon}</span>
                                            <span>{feat.label}</span>
                                          </button>
                                        );
                                      });
                                    })()}
                                  </div>

                                  {/* 1. MUSIC FUNCTIONAL EDITOR */}
                                  {instagramFeatureTabs[acc.id] === 'music' && (
                                    <div className="p-3.5 bg-white rounded-2xl border border-gray-200/90 shadow-xs space-y-2.5 animate-in fade-in duration-150">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-1.5">
                                          <Music2 className="w-4 h-4 text-gray-700" />
                                          <span className="text-xs font-bold text-gray-900">Audio Track Selection</span>
                                        </div>
                                        {instagramMusic[acc.id]?.title && (
                                          <button
                                            type="button"
                                            onClick={() => setInstagramMusic(prev => ({ ...prev, [acc.id]: { title: '', artist: '' } }))}
                                            className="text-[10px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                                          >
                                            Clear
                                          </button>
                                        )}
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <input
                                          type="text"
                                          value={instagramMusic[acc.id]?.title || ''}
                                          onChange={(e) => setInstagramMusic(prev => ({ ...prev, [acc.id]: { title: e.target.value, artist: prev[acc.id]?.artist || '' } }))}
                                          placeholder="Track Title (e.g. Blinding Lights)"
                                          className="text-xs border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:border-gray-900 bg-gray-50/50"
                                        />
                                        <input
                                          type="text"
                                          value={instagramMusic[acc.id]?.artist || ''}
                                          onChange={(e) => setInstagramMusic(prev => ({ ...prev, [acc.id]: { title: prev[acc.id]?.title || '', artist: e.target.value } }))}
                                          placeholder="Artist Name (e.g. The Weeknd)"
                                          className="text-xs border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:border-gray-900 bg-gray-50/50"
                                        />
                                      </div>
                                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                        <span className="text-[10px] text-gray-400 font-semibold">Suggested:</span>
                                        {[
                                          { title: 'Flowers', artist: 'Miley Cyrus' },
                                          { title: 'As It Was', artist: 'Harry Styles' },
                                          { title: 'Starboy', artist: 'The Weeknd' },
                                        ].map(s => (
                                          <button
                                            key={s.title}
                                            type="button"
                                            onClick={() => setInstagramMusic(prev => ({ ...prev, [acc.id]: s }))}
                                            className="px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-gray-200 hover:text-gray-900 text-[10px] text-gray-600 transition-colors cursor-pointer"
                                          >
                                            {s.title}
                                          </button>
                                        ))}
                                      </div>
                                      <p className="text-[10px] text-gray-400 leading-tight">
                                        Note: Instagram Reels API embeds audio metadata into your publishing envelope. Native copyright clearance occurs on upload.
                                      </p>
                                    </div>
                                  )}

                                  {/* 2. TEXT OVERLAY FUNCTIONAL EDITOR */}
                                  {instagramFeatureTabs[acc.id] === 'text' && (
                                    <div className="p-3.5 bg-white rounded-2xl border border-gray-200/90 shadow-xs space-y-2.5 animate-in fade-in duration-150">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-1.5">
                                          <Type className="w-4 h-4 text-gray-700" />
                                          <span className="text-xs font-bold text-gray-900">Visual Text Overlay</span>
                                        </div>
                                        {instagramTextOverlay[acc.id]?.text && (
                                          <button
                                            type="button"
                                            onClick={() => setInstagramTextOverlay(prev => ({ ...prev, [acc.id]: { text: '', position: 'center', style: 'classic' } }))}
                                            className="text-[10px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                                          >
                                            Clear
                                          </button>
                                        )}
                                      </div>
                                      <input
                                        type="text"
                                        value={instagramTextOverlay[acc.id]?.text || ''}
                                        onChange={(e) => setInstagramTextOverlay(prev => ({
                                          ...prev,
                                          [acc.id]: {
                                            text: e.target.value,
                                            position: prev[acc.id]?.position || 'center',
                                            style: prev[acc.id]?.style || 'classic',
                                          },
                                        }))}
                                        placeholder="Type overlay text (e.g. NEW DROP 🔥 Available Now)"
                                        className="w-full text-xs border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:border-gray-900 bg-gray-50/50"
                                      />
                                      <div className="flex items-center justify-between gap-2 pt-1">
                                        <div className="flex items-center space-x-1 text-[11px]">
                                          <span className="text-gray-400 font-semibold mr-1">Position:</span>
                                          {(['top', 'center', 'bottom'] as const).map(pos => (
                                            <button
                                              key={pos}
                                              type="button"
                                              onClick={() => setInstagramTextOverlay(prev => ({
                                                ...prev,
                                                [acc.id]: { text: prev[acc.id]?.text || '', position: pos, style: prev[acc.id]?.style || 'classic' },
                                              }))}
                                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold capitalize transition-colors cursor-pointer ${
                                                (instagramTextOverlay[acc.id]?.position || 'center') === pos
                                                  ? 'bg-gray-900 text-white'
                                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                              }`}
                                            >
                                              {pos}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* 3. TOPICS FUNCTIONAL EDITOR */}
                                  {instagramFeatureTabs[acc.id] === 'topics' && (
                                    <div className="p-3.5 bg-white rounded-2xl border border-gray-200/90 shadow-xs space-y-2.5 animate-in fade-in duration-150">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-900">Instagram Topic Tags (Up to 3)</span>
                                        <span className="text-[10px] text-gray-400">
                                          {(instagramTopicsList[acc.id] || []).length}/3 selected
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {['Travel', 'Technology', 'Fitness', 'Fashion', 'Business', 'Food & Drink', 'Art & Design', 'Music'].map(topic => {
                                          const current = instagramTopicsList[acc.id] || [];
                                          const isSelected = current.includes(topic);
                                          return (
                                            <button
                                              key={topic}
                                              type="button"
                                              onClick={() => {
                                                if (isSelected) {
                                                  setInstagramTopicsList(prev => ({ ...prev, [acc.id]: current.filter(t => t !== topic) }));
                                                } else if (current.length < 3) {
                                                  setInstagramTopicsList(prev => ({ ...prev, [acc.id]: [...current, topic] }));
                                                }
                                              }}
                                              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                                                isSelected
                                                  ? 'bg-emerald-600 text-white shadow-xs'
                                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                              }`}
                                            >
                                              {topic} {isSelected ? '✓' : '+'}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* 4. TAGGED PRODUCTS FUNCTIONAL EDITOR */}
                                  {instagramFeatureTabs[acc.id] === 'products' && (
                                    <div className="p-3.5 bg-white rounded-2xl border border-gray-200/90 shadow-xs space-y-2.5 animate-in fade-in duration-150">
                                      <span className="text-xs font-bold text-gray-900 block">Product Tagging (Instagram Shop)</span>
                                      <div className="grid grid-cols-2 gap-2">
                                        <input
                                          type="text"
                                          value={newProductName[acc.id] || ''}
                                          onChange={(e) => setNewProductName(prev => ({ ...prev, [acc.id]: e.target.value }))}
                                          placeholder="Product Name"
                                          className="text-xs border border-gray-200 rounded-xl p-2 bg-gray-50/50"
                                        />
                                        <input
                                          type="text"
                                          value={newProductSku[acc.id] || ''}
                                          onChange={(e) => setNewProductSku(prev => ({ ...prev, [acc.id]: e.target.value }))}
                                          placeholder="SKU or Catalog ID"
                                          className="text-xs border border-gray-200 rounded-xl p-2 bg-gray-50/50"
                                        />
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const name = newProductName[acc.id]?.trim();
                                          if (!name) return;
                                          const sku = newProductSku[acc.id]?.trim() || `SKU-${Date.now().toString().slice(-4)}`;
                                          setInstagramProductsList(prev => ({
                                            ...prev,
                                            [acc.id]: [...(prev[acc.id] || []), { name, sku, url: '' }],
                                          }));
                                          setNewProductName(prev => ({ ...prev, [acc.id]: '' }));
                                          setNewProductSku(prev => ({ ...prev, [acc.id]: '' }));
                                        }}
                                        className="w-full py-1.5 px-3 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                                      >
                                        + Add Product Tag
                                      </button>
                                      {/* Product list */}
                                      {(instagramProductsList[acc.id] || []).map((p, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                                          <div>
                                            <span className="font-bold text-gray-900 block">{p.name}</span>
                                            <span className="text-[10px] text-gray-400 font-mono">{p.sku}</span>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => setInstagramProductsList(prev => ({
                                              ...prev,
                                              [acc.id]: prev[acc.id].filter((_, i) => i !== idx),
                                            }))}
                                            className="text-gray-400 hover:text-rose-600 p-1"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* 5. LINK STICKER FUNCTIONAL EDITOR */}
                                  {instagramFeatureTabs[acc.id] === 'link' && (
                                    <div className="p-3.5 bg-white rounded-2xl border border-gray-200/90 shadow-xs space-y-2.5 animate-in fade-in duration-150">
                                      <div className="flex items-center space-x-1.5">
                                        <LinkIcon className="w-4 h-4 text-blue-600" />
                                        <span className="text-xs font-bold text-gray-900">Story & Reel Link Sticker</span>
                                      </div>
                                      <input
                                        type="url"
                                        value={instagramLinkSticker[acc.id]?.url || ''}
                                        onChange={(e) => setInstagramLinkSticker(prev => ({
                                          ...prev,
                                          [acc.id]: { url: e.target.value, text: prev[acc.id]?.text || '' },
                                        }))}
                                        placeholder="https://example.com/collection"
                                        className="w-full text-xs border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:border-blue-500 bg-gray-50/50"
                                      />
                                      <input
                                        type="text"
                                        value={instagramLinkSticker[acc.id]?.text || ''}
                                        onChange={(e) => setInstagramLinkSticker(prev => ({
                                          ...prev,
                                          [acc.id]: { url: prev[acc.id]?.url || '', text: e.target.value },
                                        }))}
                                        placeholder="Custom sticker text (e.g. Shop The Drop)"
                                        className="w-full text-xs border border-gray-200 rounded-xl p-2 bg-gray-50/50"
                                      />
                                    </div>
                                  )}

                                  {/* 6. MENTIONS FUNCTIONAL EDITOR */}
                                  {instagramFeatureTabs[acc.id] === 'mention' && (
                                    <div className="p-3.5 bg-white rounded-2xl border border-gray-200/90 shadow-xs space-y-2.5 animate-in fade-in duration-150">
                                      <span className="text-xs font-bold text-gray-900 block">User Mentions</span>
                                      <div className="flex items-center space-x-2">
                                        <input
                                          type="text"
                                          value={mentionInput[acc.id] || ''}
                                          onChange={(e) => setMentionInput(prev => ({ ...prev, [acc.id]: e.target.value }))}
                                          placeholder="@username"
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              const u = (mentionInput[acc.id] || '').trim().replace(/^@/, '');
                                              if (u) {
                                                setInstagramMentionsList(prev => ({ ...prev, [acc.id]: [...(prev[acc.id] || []), `@${u}`] }));
                                                setMentionInput(prev => ({ ...prev, [acc.id]: '' }));
                                              }
                                            }
                                          }}
                                          className="flex-1 text-xs border border-gray-200 rounded-xl p-2 bg-gray-50/50"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const u = (mentionInput[acc.id] || '').trim().replace(/^@/, '');
                                            if (u) {
                                              setInstagramMentionsList(prev => ({ ...prev, [acc.id]: [...(prev[acc.id] || []), `@${u}`] }));
                                              setMentionInput(prev => ({ ...prev, [acc.id]: '' }));
                                            }
                                          }}
                                          className="px-3 py-2 bg-gray-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
                                        >
                                          Add
                                        </button>
                                      </div>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {(instagramMentionsList[acc.id] || []).map((m, idx) => (
                                          <span key={idx} className="bg-emerald-50 text-emerald-800 text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center space-x-1">
                                            <span>{m}</span>
                                            <button
                                              type="button"
                                              onClick={() => setInstagramMentionsList(prev => ({
                                                ...prev,
                                                [acc.id]: prev[acc.id].filter((_, i) => i !== idx),
                                              }))}
                                              className="hover:text-rose-600 cursor-pointer ml-1"
                                            >
                                              ×
                                            </button>
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* 7. TAGS / HASHTAGS FUNCTIONAL EDITOR */}
                                  {instagramFeatureTabs[acc.id] === 'tags' && (
                                    <div className="p-3.5 bg-white rounded-2xl border border-gray-200/90 shadow-xs space-y-2.5 animate-in fade-in duration-150">
                                      <span className="text-xs font-bold text-gray-900 block">Hashtags & Tags</span>
                                      <div className="flex items-center space-x-2">
                                        <input
                                          type="text"
                                          value={tagInput[acc.id] || ''}
                                          onChange={(e) => setTagInput(prev => ({ ...prev, [acc.id]: e.target.value }))}
                                          placeholder="#hashtag"
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              const t = (tagInput[acc.id] || '').trim().replace(/^#/, '');
                                              if (t) {
                                                setInstagramTagsList(prev => ({ ...prev, [acc.id]: [...(prev[acc.id] || []), `#${t}`] }));
                                                setTagInput(prev => ({ ...prev, [acc.id]: '' }));
                                              }
                                            }
                                          }}
                                          className="flex-1 text-xs border border-gray-200 rounded-xl p-2 bg-gray-50/50"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const t = (tagInput[acc.id] || '').trim().replace(/^#/, '');
                                            if (t) {
                                              setInstagramTagsList(prev => ({ ...prev, [acc.id]: [...(prev[acc.id] || []), `#${t}`] }));
                                              setTagInput(prev => ({ ...prev, [acc.id]: '' }));
                                            }
                                          }}
                                          className="px-3 py-2 bg-gray-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
                                        >
                                          Add
                                        </button>
                                      </div>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {['#reels', '#viral', '#explore', '#contentcreator', '#fyp'].map(sug => (
                                          <button
                                            key={sug}
                                            type="button"
                                            onClick={() => {
                                              const cur = instagramTagsList[acc.id] || [];
                                              if (!cur.includes(sug)) {
                                                setInstagramTagsList(prev => ({ ...prev, [acc.id]: [...cur, sug] }));
                                              }
                                            }}
                                            className="px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-semibold cursor-pointer"
                                          >
                                            {sug}
                                          </button>
                                        ))}
                                      </div>
                                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                        {(instagramTagsList[acc.id] || []).map((t, idx) => (
                                          <span key={idx} className="bg-purple-50 text-purple-800 text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center space-x-1">
                                            <span>{t}</span>
                                            <button
                                              type="button"
                                              onClick={() => setInstagramTagsList(prev => ({
                                                ...prev,
                                                [acc.id]: prev[acc.id].filter((_, i) => i !== idx),
                                              }))}
                                              className="hover:text-rose-600 cursor-pointer ml-1"
                                            >
                                              ×
                                            </button>
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Instagram Collaborators */}
                                <div className="p-2 rounded-xl bg-white border border-gray-200 shadow-2xs space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                                      <span className="text-xs font-semibold text-gray-800">Instagram Collaborators</span>
                                    </div>
                                    <button
                                      type="button"
                                      role="switch"
                                      aria-checked={isInstagramCollabEnabled}
                                      onClick={() => setIsInstagramCollabEnabled(!isInstagramCollabEnabled)}
                                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                                        isInstagramCollabEnabled ? 'bg-emerald-600' : 'bg-gray-200'
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
                                    <input
                                      type="text"
                                      value={instagramCollaborators}
                                      onChange={(e) => setInstagramCollaborators(e.target.value)}
                                      placeholder="@username to invite as collaborator"
                                      className="w-full text-xs border border-gray-200 rounded-lg p-2 focus:outline-hidden focus:border-emerald-500 bg-gray-50/50"
                                    />
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
                              <div className="space-y-3">
                                {/* AI-Generated Content Toggle */}
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

                                {/* Made for Kids (COPPA Compliance) */}
                                <div className="p-3 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-2">
                                  <div>
                                    <span className="text-xs font-bold text-gray-800 block">Audience (Made for Kids)</span>
                                    <span className="text-[10px] text-gray-400 block">Is this Short made for kids? (Required by COPPA)</span>
                                  </div>
                                  <div className="flex items-center gap-2 pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => setYoutubeMadeForKids(prev => ({ ...prev, [acc.id]: false }))}
                                      className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center ${
                                        !(youtubeMadeForKids[acc.id] ?? false)
                                          ? 'bg-gray-900 text-white font-bold shadow-xs'
                                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                      }`}
                                    >
                                      No, not for kids
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setYoutubeMadeForKids(prev => ({ ...prev, [acc.id]: true }))}
                                      className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center ${
                                        youtubeMadeForKids[acc.id] === true
                                          ? 'bg-gray-900 text-white font-bold shadow-xs'
                                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                      }`}
                                    >
                                      Yes, made for kids
                                    </button>
                                  </div>
                                </div>

                                {/* Visibility */}
                                <div className="p-3 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-800">Visibility</span>
                                    <span className="text-[10px] text-gray-400 capitalize font-medium">{youtubePrivacies[acc.id] || 'public'}</span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-1.5">
                                    {(['public', 'unlisted', 'private'] as const).map(vis => (
                                      <button
                                        key={vis}
                                        type="button"
                                        onClick={() => setYoutubePrivacies(prev => ({ ...prev, [acc.id]: vis }))}
                                        className={`py-1.5 px-2 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer text-center ${
                                          (youtubePrivacies[acc.id] || 'public') === vis
                                            ? 'bg-gray-900 text-white font-bold shadow-xs'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                      >
                                        {vis}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Category */}
                                <div className="p-3 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-800">Category</span>
                                    <span className="text-[10px] text-gray-400">Official YouTube Category</span>
                                  </div>
                                  <select
                                    value={youtubeCategories[acc.id] || '22'}
                                    onChange={(e) => setYoutubeCategories(prev => ({ ...prev, [acc.id]: e.target.value }))}
                                    className="w-full text-xs text-gray-800 bg-gray-50 border border-gray-200 rounded-xl p-2.5 focus:outline-hidden focus:border-red-500 cursor-pointer font-medium"
                                  >
                                    {OFFICIAL_YOUTUBE_CATEGORIES.map(cat => (
                                      <option key={cat.id} value={cat.id}>
                                        {cat.title}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}

                            {acc.platform !== 'instagram' && acc.platform !== 'facebook' && acc.platform !== 'youtube' && (
                              <div className="text-xs text-gray-500 py-1">
                                Standard publishing settings active.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* PART 2: LIVE FEED PREVIEW & PUBLISHING MODE (MOVED BELOW PLATFORM WORKSPACE) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-6 border-t border-gray-100">
          {/* LEFT: DEDICATED LIVE FEED PREVIEW */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-gray-900 tracking-tight">Live Feed Preview</h3>
                </div>
                <span className="text-[11px] text-gray-400 font-medium">
                  {visibleAccountIds.length} {visibleAccountIds.length === 1 ? 'channel' : 'channels'} active
                </span>
              </div>

              {/* Synchronized Platform Preview Selector Bar */}
              <div className="bg-gray-50/70 p-2.5 rounded-xl border border-gray-200/70">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                  {selectedAccountIds.length > 1 ? (
                    selectedAccountIds.map((accId, idx) => {
                      const acc = accounts.find((a) => a.id === accId);
                      if (!acc) return null;
                      const isActive = previewCarouselIndex === idx;
                      const accFmt = accountFormats[accId] || (acc.platform === 'youtube' ? 'short' : (currentPostType === 'video' ? 'reel' : 'post'));

                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => {
                            setPreviewCarouselIndex(idx);
                            setActivePreviewAccountId(acc.id);
                            setActivePreviewPlatform(acc.platform);
                          }}
                          className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                            isActive
                              ? 'bg-gray-900 text-white shadow-xs'
                              : 'bg-white text-gray-600 border border-gray-200/80 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                        >
                          <PlatformLogo platform={acc.platform} className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[120px]">{acc.displayName || acc.username}</span>
                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                            {accFmt}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    (selectedPlatforms.length > 0
                      ? selectedPlatforms
                      : (['instagram', 'facebook', 'youtube', 'threads'] as SocialPlatform[])
                    ).map((platform) => {
                      const isActive = activePreviewPlatform === platform;
                      const config = SUPPORTED_PLATFORMS.find((p) => p.id === platform);
                      const platformName = config?.name || platform;

                      return (
                        <button
                          key={platform}
                          type="button"
                          onClick={() => setActivePreviewPlatform(platform)}
                          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                            isActive
                              ? 'bg-gray-900 text-white shadow-xs'
                              : 'bg-white text-gray-600 border border-gray-200/80 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                        >
                          <PlatformLogo platform={platform} className="w-3.5 h-3.5" />
                          <span className="capitalize">{platformName}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Carousel: prev/next navigation */}
              {selectedAccountIds.length > 0 && (() => {
                const carouselAccId = selectedAccountIds[previewCarouselIndex] || selectedAccountIds[0];
                const carouselAcc = accounts.find(a => a.id === carouselAccId);
                const carouselFormat = carouselAcc
                  ? (accountFormats[carouselAccId] || (carouselAcc.platform === 'youtube' ? 'short' : (currentPostType === 'video' ? 'reel' : 'post')))
                  : 'post';
                const isVertical = ['reel', 'story', 'short'].includes(carouselFormat);
                const previewPlatform = carouselAcc?.platform || activePreviewPlatform;
                const effectivePreviewMedia = getEffectiveMediaForAccount(carouselAccId);
                const carouselPostData = {
                  ...previewPostData,
                  media: effectivePreviewMedia,
                  content: (accountCaptions[carouselAccId]?.caption?.trim() ? accountCaptions[carouselAccId].caption : mainCaption) || '',
                };
                const formatLabel: Record<string, string> = {
                  post: 'Post', reel: 'Reel', story: 'Story', video: 'Video', short: 'Shorts', article: 'Article',
                };
                const communityPostWarning = previewPlatform === 'youtube' && carouselFormat === 'post' && currentPostType === 'image';
                return (
                  <div className="space-y-3">
                    {/* Platform + format badge + nav arrows */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {carouselAcc && (
                          <img
                            src={carouselAcc.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(carouselAcc.displayName || carouselAcc.username || 'A')}&background=059669&color=fff&size=64&bold=true`}
                            alt={carouselAcc.displayName || carouselAcc.username}
                            referrerPolicy="no-referrer"
                            className="w-6 h-6 rounded-full object-cover border border-gray-200"
                          />
                        )}
                        <span className="text-xs font-bold text-gray-900 capitalize truncate max-w-[120px]">
                          {carouselAcc?.displayName || carouselAcc?.username || previewPlatform}
                        </span>
                        <span className="text-[10px] text-gray-400 capitalize">·</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isVertical ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                          {formatLabel[carouselFormat] || carouselFormat}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => setPreviewCarouselIndex(prev => Math.max(0, prev - 1))}
                          disabled={previewCarouselIndex === 0}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-not-allowed"
                          title="Previous"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[11px] text-gray-400 font-mono min-w-[36px] text-center">
                          {previewCarouselIndex + 1}/{visibleAccountIds.length}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPreviewCarouselIndex(prev => Math.min(visibleAccountIds.length - 1, prev + 1))}
                          disabled={previewCarouselIndex >= visibleAccountIds.length - 1}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-not-allowed"
                          title="Next"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* YouTube Community Post honest warning */}
                    {communityPostWarning && (
                      <div className="flex items-start space-x-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-semibold">YouTube Community Post Limitation</strong>
                          <span>The YouTube Data API does not support automated Community Post publishing for third-party applications. Your post will be saved as a draft. Please publish it manually from YouTube Studio.</span>
                        </div>
                      </div>
                    )}

                    <PostPreview
                      post={carouselPostData}
                      selectedPlatform={previewPlatform}
                      activeAccount={carouselAcc}
                      previewType={carouselFormat as PostType}
                      aspectRatio={accountAspectRatios[carouselAccId] || (isVertical ? '9:16' : '1:1')}
                      mediaFitMode={mediaFitMode}
                    />
                  </div>
                );
              })()}
              {selectedAccountIds.length === 0 && (
                <PostPreview
                  post={previewPostData}
                  selectedPlatform={activePreviewPlatform}
                  activeAccount={previewAccount}
                  previewType={mediaList.length > 0 && mediaList[0].type === 'video' ? 'reel' : 'post'}
                  aspectRatio={aspectRatio}
                  mediaFitMode={mediaFitMode}
                />
              )}
            </div>
          </div>

          {/* RIGHT: PUBLISHING MODE SECTION (PRESERVED UNCHANGED) */}
          <div className="lg:col-span-5 space-y-5">
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
                    {submittingAction === 'schedule' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Scheduling post...</span>
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4" />
                        <span>
                          {uploadState.isUploading
                            ? `Uploading media (${displayProgress}%)...`
                            : 'Schedule Post'}
                        </span>
                      </>
                    )}
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
                        Your post will be published immediately to all {visibleAccountIds.length} selected accounts using official APIs.
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleExecute('publish-now')}
                    className="w-full py-3.5 px-4 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white flex items-center justify-center space-x-2 text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submittingAction === 'publish-now' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Publishing live...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>
                          {uploadState.isUploading
                            ? `Uploading media (${displayProgress}%)...`
                            : 'Publish Live Now'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Status Bar */}
              <div className="text-[11px] text-gray-400 flex items-center justify-between pt-1">
                <span className="flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {visibleAccountIds.length} {visibleAccountIds.length === 1 ? 'account' : 'accounts'} targeted
                  </span>
                </span>
                <span>Publishing queue active</span>
              </div>

              {/* Action Buttons: Save to Draft & Exit */}
              <div className="space-y-2 pt-1 border-t border-gray-100">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleExecute('draft')}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingAction === 'draft' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 text-gray-500 animate-spin" />
                      <span>Saving draft...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 text-gray-500" />
                      <span>Save as Draft</span>
                    </>
                  )}
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
                Monthly Post Limit Reached (Free Plan)
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                The Free plan allows up to <span className="font-semibold text-white">5 scheduled or published posts per connected account per month</span> (max 15 posts total across 3 accounts). The following channel(s) have reached capacity for this month:
              </p>
              <div className="space-y-1.5 pt-1">
                {scheduleLimitModal.blockedChannels.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-black/40 border border-white/5 text-xs">
                    <span className="font-medium text-gray-200">{c.name}</span>
                    <span className="text-amber-400 font-bold font-mono">5 / 5 used this month</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 pt-1">
                Usage automatically resets on the 1st of every month ({scheduleLimitModal.resetsAt ? new Date(scheduleLimitModal.resetsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'next month'}). Upgrade to Pro for unlimited scheduling and publishing.
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
