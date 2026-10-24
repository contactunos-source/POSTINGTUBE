'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Video,
  Image as ImageIcon,
  Upload,
  Sparkles,
  Info,
  Check,
  AlertCircle,
  HelpCircle,
  X,
  Play,
  Film,
  Globe,
  Lock,
  EyeOff,
  FolderPlus,
  Clock,
  Calendar as CalendarIcon,
  MapPin,
  ChevronDown,
  ChevronUp,
  Sliders,
  Smile,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { PostMedia, SocialAccount, PlatformCaptionOverride, SocialPlatform } from '@/types/social';
import { OFFICIAL_YOUTUBE_CATEGORIES } from '@/app/api/youtube/categories/route';

interface YouTubeStudioComposerProps {
  channelAccount?: SocialAccount;
  mediaList: PostMedia[];
  onMediaChange: (media: PostMedia[]) => void;
  title: string;
  onTitleChange: (title: string) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  youtubeOverride: PlatformCaptionOverride;
  onOverrideChange: (override: PlatformCaptionOverride) => void;
  openAiModal?: (
    currentText: string,
    onApply: (res: any) => void,
    meta?: { platform?: SocialPlatform; initialTitle?: string; existingCaption?: string }
  ) => void;
  isUploading?: boolean;
}

export const YouTubeStudioComposer: React.FC<YouTubeStudioComposerProps> = ({
  channelAccount,
  mediaList,
  onMediaChange,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  youtubeOverride,
  onOverrideChange,
  openAiModal,
  isUploading = false,
}) => {
  // State for YouTube metadata
  const currentVideo = mediaList.find((m) => m.type === 'video') || mediaList[0];
  const hasVideo = !!currentVideo && currentVideo.type === 'video';

  // Thumbnail management state
  const [thumbnailTab, setThumbnailTab] = useState<'upload' | 'frames' | 'preview'>('upload');
  const [extractedFrames, setExtractedFrames] = useState<{ time: number; timeStr: string; dataUrl: string }[]>([]);
  const [isExtractingFrames, setIsExtractingFrames] = useState(false);
  const [customThumbUploading, setCustomThumbUploading] = useState(false);
  const [thumbError, setThumbError] = useState<string | null>(null);
  const [videoScrubTime, setVideoScrubTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  // Hidden video element for frame extraction
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const thumbFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // Tags state
  const tags: string[] = useMemo(() => youtubeOverride.tags || [], [youtubeOverride.tags]);
  const [tagInput, setTagInput] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);

  // Total tags character calculation (YouTube 500 chars limit)
  const totalTagsChars = useMemo(() => {
    return tags.reduce((acc, t) => acc + t.length, 0) + (tags.length > 1 ? tags.length - 1 : 0);
  }, [tags]);

  // Categories state
  const [categories, setCategories] = useState(OFFICIAL_YOUTUBE_CATEGORIES);
  const [categorySearch, setCategorySearch] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const selectedCategory = useMemo(() => {
    const catId = youtubeOverride.categoryId || '22';
    return categories.find((c) => c.id === catId) || categories.find((c) => c.id === '22') || categories[0];
  }, [youtubeOverride.categoryId, categories]);

  // Playlists state
  const [playlists, setPlaylists] = useState<{ id: string; title: string; itemCount: number }[]>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);

  // Advanced section collapsible
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Made for Kids selection (default to false if not set, or explicit)
  const madeForKidsValue = typeof youtubeOverride.madeForKids === 'boolean' ? youtubeOverride.madeForKids : false;

  // Visibility selection (default 'public')
  const privacyStatus = youtubeOverride.privacyStatus || 'public';

  // Active thumbnail URL
  const activeThumbnail = youtubeOverride.thumbnailUrl || (currentVideo?.thumbnailUrl !== currentVideo?.url ? currentVideo?.thumbnailUrl : undefined);

  // Fetch channel playlists on mount if account connected
  useEffect(() => {
    let mounted = true;
    if (channelAccount?.accessToken || channelAccount?.refreshToken) {
      setIsLoadingPlaylists(true);
      fetch('/api/youtube/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: channelAccount.accessToken,
          refreshToken: channelAccount.refreshToken,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (mounted && data.success && Array.isArray(data.playlists)) {
            setPlaylists(data.playlists);
          }
        })
        .catch((err) => console.warn('Could not load playlists:', err))
        .finally(() => {
          if (mounted) setIsLoadingPlaylists(false);
        });
    }
    return () => {
      mounted = false;
    };
  }, [channelAccount]);

  // Video file upload handler
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/') && !/\.(mp4|mov|webm|m4v|avi|mkv)$/i.test(file.name)) {
      alert('Please upload a valid video file (MP4, MOV, WEBM). YouTube requires video content.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        const newMediaItem: PostMedia = {
          id: `vid_${Date.now()}`,
          url: data.url,
          name: file.name,
          type: 'video',
          size: file.size,
          aspectRatio: '16:9',
        };
        onMediaChange([newMediaItem]);
        // Also auto-suggest title if blank
        if (!title.trim()) {
          const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
          onTitleChange(cleanName.slice(0, 100));
        }
      } else {
        alert(data.error || 'Failed to upload video');
      }
    } catch (err: any) {
      alert(err.message || 'Error uploading video');
    }
  };

  // Extract frames from uploaded video
  const handleExtractFrames = () => {
    if (!currentVideo?.url) return;
    setIsExtractingFrames(true);
    setThumbError(null);

    const video = hiddenVideoRef.current;
    if (!video) {
      setIsExtractingFrames(false);
      return;
    }

    video.src = currentVideo.url;
    video.crossOrigin = 'anonymous';
    video.currentTime = 1;

    video.onloadedmetadata = () => {
      const duration = video.duration || 10;
      setVideoDuration(duration);

      // Extract 4 representative frames
      const timestamps = [
        Math.max(1, duration * 0.05),
        duration * 0.25,
        duration * 0.5,
        duration * 0.75,
      ];

      const frames: { time: number; timeStr: string; dataUrl: string }[] = [];
      let currentIndex = 0;

      const captureFrame = () => {
        if (currentIndex >= timestamps.length) {
          setExtractedFrames(frames);
          setIsExtractingFrames(false);
          setThumbnailTab('frames');
          return;
        }

        const t = timestamps[currentIndex];
        video.currentTime = t;
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 1280;
          canvas.height = video.videoHeight || 720;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            const minutes = Math.floor(video.currentTime / 60);
            const seconds = Math.floor(video.currentTime % 60);
            const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            frames.push({ time: video.currentTime, timeStr, dataUrl });
          }
        } catch (canvasErr) {
          console.warn('Canvas frame capture notice:', canvasErr);
        }
        currentIndex++;
        captureFrame();
      };

      captureFrame();
    };

    video.onerror = () => {
      setIsExtractingFrames(false);
      setThumbError('Unable to extract frames directly from video stream. Please upload a custom thumbnail image.');
    };
  };

  // Capture current scrubbed frame as thumbnail
  const handleCaptureScrubbedFrame = async () => {
    const video = hiddenVideoRef.current;
    if (!video) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        
        // Convert to Blob and upload to media endpoint to persist
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `thumb_frame_${Math.floor(video.currentTime)}s.jpg`, { type: 'image/jpeg' });
        
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/media/upload', { method: 'POST', body: fd });
        const data = await res.json();
        
        const uploadedUrl = data.url || dataUrl;
        onOverrideChange({ ...youtubeOverride, thumbnailUrl: uploadedUrl });
        setThumbnailTab('preview');
      }
    } catch (err) {
      console.warn('Scrub frame capture warning:', err);
    }
  };

  // Select an extracted frame as thumbnail
  const handleSelectFrame = async (frame: { time: number; timeStr: string; dataUrl: string }) => {
    try {
      setCustomThumbUploading(true);
      // Upload frame dataUrl as permanent file
      const blob = await (await fetch(frame.dataUrl)).blob();
      const file = new File([blob], `thumbnail_frame_${frame.timeStr.replace(':', '_')}.jpg`, { type: 'image/jpeg' });
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/media/upload', { method: 'POST', body: fd });
      const data = await res.json();

      const finalUrl = data.url || frame.dataUrl;
      onOverrideChange({ ...youtubeOverride, thumbnailUrl: finalUrl });
      setThumbnailTab('preview');
    } catch (err: any) {
      setThumbError('Failed to save extracted frame as thumbnail: ' + err.message);
    } finally {
      setCustomThumbUploading(false);
    }
  };

  // Custom Thumbnail File Upload with YouTube validation
  const handleCustomThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbError(null);

    // 1. Format validation: JPG, PNG, GIF, WebP
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setThumbError('Invalid format. YouTube supports JPG, PNG, GIF, and WebP thumbnail files.');
      return;
    }

    // 2. Size validation: max 2MB (2,097,152 bytes)
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setThumbError(
        `File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). YouTube requires thumbnails to be under 2MB.`
      );
      return;
    }

    setCustomThumbUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/media/upload', { method: 'POST', body: fd });
      const data = await res.json();

      if (data.success) {
        onOverrideChange({ ...youtubeOverride, thumbnailUrl: data.url });
        setThumbnailTab('preview');
      } else {
        setThumbError(data.error || 'Failed to upload thumbnail');
      }
    } catch (err: any) {
      setThumbError(err.message || 'Network error uploading thumbnail');
    } finally {
      setCustomThumbUploading(false);
    }
  };

  // Remove thumbnail
  const handleRemoveThumbnail = () => {
    onOverrideChange({ ...youtubeOverride, thumbnailUrl: undefined });
    setThumbnailTab('upload');
  };

  // Tag addition
  const handleAddTag = () => {
    const clean = tagInput.trim().replace(/^#/, '');
    if (!clean) return;

    if (tags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setTagError(`Tag "${clean}" has already been added.`);
      return;
    }

    const projectedLength = totalTagsChars + clean.length + (tags.length > 0 ? 1 : 0);
    if (projectedLength > 500) {
      setTagError(`Adding "${clean}" would exceed YouTube's 500 characters tags limit.`);
      return;
    }

    setTagError(null);
    const updatedTags = [...tags, clean];
    onOverrideChange({ ...youtubeOverride, tags: updatedTags });
    setTagInput('');
  };

  // Tag removal
  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = tags.filter((t) => t !== tagToRemove);
    onOverrideChange({ ...youtubeOverride, tags: updatedTags });
  };

  // Clear all tags
  const handleClearAllTags = () => {
    onOverrideChange({ ...youtubeOverride, tags: [] });
  };

  return (
    <div className="space-y-6">
      {/* Hidden video element for canvas frame capture */}
      <video ref={hiddenVideoRef} className="hidden" muted playsInline preload="metadata" />

      {/* 1. YOUTUBE CHANNEL HEADER & BANNER */}
      <div className="bg-gradient-to-r from-red-50 via-white to-gray-50 border border-red-200/70 rounded-2xl p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs shrink-0 font-bold">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                  YouTube Publishing Studio
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 uppercase tracking-wider">
                  YouTube Only
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Publishing to{' '}
                <span className="text-gray-800 font-semibold">
                  {channelAccount?.displayName || 'Connected YouTube Channel'}
                </span>{' '}
                ({channelAccount?.username || 'YouTube Data API v3'})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto text-xs text-gray-500 font-medium bg-white/90 border border-gray-200/80 px-3 py-1.5 rounded-xl shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>OAuth 2.0 Resumable Protocol</span>
          </div>
        </div>
      </div>

      {/* 2. VIDEO ASSET ATTACHMENT / REPLACEMENT */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Video className="w-4 h-4 text-red-600" />
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              1. Video Asset (Required)
            </h4>
          </div>
          {hasVideo && (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center space-x-1">
              <Check className="w-3 h-3" />
              <span>Video Ready</span>
            </span>
          )}
        </div>

        {hasVideo ? (
          <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-14 h-10 rounded-lg bg-black flex items-center justify-center shrink-0 overflow-hidden relative shadow-2xs">
                <video src={currentVideo.url} className="w-full h-full object-cover" />
                <Play className="w-4 h-4 text-white absolute fill-white opacity-80" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">{currentVideo.name || 'Uploaded Video'}</p>
                <p className="text-[11px] text-gray-500">
                  {currentVideo.size ? `${(currentVideo.size / (1024 * 1024)).toFixed(1)} MB` : 'MP4/MOV'} • 16:9 Standard
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                ref={videoFileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                className="hidden"
                onChange={handleVideoUpload}
              />
              <button
                type="button"
                onClick={() => videoFileInputRef.current?.click()}
                className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                Replace Video
              </button>
              <button
                type="button"
                onClick={() => onMediaChange([])}
                className="p-1.5 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                title="Remove video"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => videoFileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 hover:border-red-500 rounded-2xl p-8 text-center cursor-pointer bg-gray-50/40 hover:bg-red-50/20 transition-all group"
          >
            <input
              ref={videoFileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={handleVideoUpload}
            />
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 group-hover:scale-110 flex items-center justify-center mx-auto mb-3 transition-transform shadow-2xs">
              <Upload className="w-6 h-6" />
            </div>
            <h5 className="text-sm font-bold text-gray-900">Upload Video to YouTube</h5>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Drag and drop video file, or browse from device (MP4, MOV, or WEBM up to 16:9 HD/4K).
            </p>
          </div>
        )}
      </div>

      {/* 3. TITLE & DESCRIPTION SECTION */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              2. Details & Metadata
            </h4>
          </div>

          {openAiModal && (
            <button
              type="button"
              onClick={() =>
                openAiModal(
                  description,
                  (res) => {
                    if (res.title) onTitleChange(res.title.slice(0, 100));
                    if (res.caption) onDescriptionChange(res.caption);
                  },
                  { platform: 'youtube', initialTitle: title, existingCaption: description }
                )
              }
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-2xs flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Studio Assistant</span>
            </button>
          )}
        </div>

        {/* Video Title (Required, max 100 chars) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700 flex items-center space-x-1.5">
              <span>Title (Required)</span>
              <span className="text-red-500">*</span>
            </label>
            <span
              className={`text-[11px] font-mono ${
                title.length > 95 ? 'text-amber-600 font-bold' : 'text-gray-400'
              }`}
            >
              {title.length}/100
            </span>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Add a title that describes your video (e.g. Next.js 16 Full Stack Guide)"
            maxLength={100}
            className="w-full text-sm font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50/40 focus:outline-hidden focus:border-red-500 focus:bg-white transition-colors"
          />
          <p className="text-[11px] text-gray-400">
            A captivating title helps viewers discover your video in search and recommendations.
          </p>
        </div>

        {/* Video Description (max 5000 chars) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700">
              Description
            </label>
            <span className="text-[11px] font-mono text-gray-400">
              {description.length}/5000
            </span>
          </div>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Tell viewers about your video, include timestamps, links, and hashtags..."
            maxLength={5000}
            className="w-full text-xs text-gray-800 placeholder:text-gray-400 p-3.5 rounded-xl border border-gray-200 bg-gray-50/40 focus:outline-hidden focus:border-red-500 focus:bg-white resize-none h-32 leading-relaxed transition-colors"
          />
        </div>
      </div>

      {/* 4. CUSTOM THUMBNAIL MANAGEMENT */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <ImageIcon className="w-4 h-4 text-red-600" />
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                3. Video Thumbnail
              </h4>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Select or upload a picture that shows what&#39;s in your video. 16:9 ratio, max 2MB (JPG, PNG, GIF, WebP).
            </p>
          </div>

          {/* Active Thumbnail Badge */}
          {activeThumbnail && (
            <div className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200 self-start sm:self-auto">
              <Check className="w-3.5 h-3.5" />
              <span>Custom Thumbnail Set</span>
            </div>
          )}
        </div>

        {/* Error notification */}
        {thumbError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{thumbError}</span>
          </div>
        )}

        {/* 3 Thumbnail Options: Upload, Select from Video, or Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Option A: Upload Custom File */}
          <div
            onClick={() => thumbFileInputRef.current?.click()}
            className="border border-gray-200 hover:border-red-400 bg-gray-50/50 hover:bg-white rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 group"
          >
            <input
              ref={thumbFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleCustomThumbnailUpload}
            />
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 group-hover:scale-110 flex items-center justify-center transition-transform shadow-2xs">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">Upload Image</p>
              <p className="text-[10px] text-gray-400">JPG, PNG, WebP &lt; 2MB</p>
            </div>
          </div>

          {/* Option B: Extract Frames from Video */}
          <div
            onClick={hasVideo ? handleExtractFrames : undefined}
            className={`border border-gray-200 rounded-xl p-4 text-center transition-all flex flex-col items-center justify-center space-y-2 ${
              hasVideo
                ? 'hover:border-red-400 bg-gray-50/50 hover:bg-white cursor-pointer group'
                : 'opacity-50 cursor-not-allowed bg-gray-50'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-110 flex items-center justify-center transition-transform shadow-2xs">
              {isExtractingFrames ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Film className="w-4 h-4" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">
                {isExtractingFrames ? 'Extracting...' : 'Select from Video'}
              </p>
              <p className="text-[10px] text-gray-400">
                {hasVideo ? 'Auto-capture video frames' : 'Upload video first'}
              </p>
            </div>
          </div>

          {/* Option C: Current Active Thumbnail Preview & Reset */}
          <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Selected Preview
            </span>
            {activeThumbnail ? (
              <div className="relative aspect-video rounded-lg overflow-hidden border border-gray-300 mt-1 shadow-2xs group">
                <img
                  src={activeThumbnail}
                  alt="Selected Thumbnail"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveThumbnail}
                  className="absolute top-1 right-1 p-1 rounded-md bg-black/70 hover:bg-red-600 text-white transition-colors cursor-pointer"
                  title="Remove custom thumbnail"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="aspect-video rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-[11px] text-gray-400 mt-1 bg-white">
                No custom thumbnail
              </div>
            )}
            {activeThumbnail && (
              <button
                type="button"
                onClick={handleRemoveThumbnail}
                className="text-[11px] text-red-600 hover:underline font-semibold mt-1 text-left cursor-pointer"
              >
                Reset to default
              </button>
            )}
          </div>
        </div>

        {/* Frame Extraction Gallery (when extracted) */}
        {extractedFrames.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800">
                Extracted Video Frames (Click to Apply):
              </span>
              <span className="text-[11px] text-gray-400">{extractedFrames.length} frames</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {extractedFrames.map((frame, idx) => {
                const isSelected = activeThumbnail === frame.dataUrl;
                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectFrame(frame)}
                    className={`relative aspect-video rounded-xl overflow-hidden cursor-pointer border-2 transition-all hover:scale-[1.02] shadow-2xs group ${
                      isSelected
                        ? 'border-red-600 ring-2 ring-red-200'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <img src={frame.dataUrl} alt={`Frame at ${frame.timeStr}`} className="w-full h-full object-cover" />
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/80 text-white text-[10px] font-mono">
                      {frame.timeStr}
                    </div>
                    {isSelected && (
                      <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Interactive Frame Scrub Slider */}
            {videoDuration > 0 && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-gray-700">
                  <span>Custom Scrub Capture:</span>
                  <span className="font-mono text-gray-500">
                    {Math.floor(videoScrubTime / 60)}:{String(Math.floor(videoScrubTime % 60)).padStart(2, '0')} / {Math.floor(videoDuration / 60)}:{String(Math.floor(videoDuration % 60)).padStart(2, '0')}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min={0}
                    max={videoDuration}
                    step={0.5}
                    value={videoScrubTime}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setVideoScrubTime(val);
                      if (hiddenVideoRef.current) hiddenVideoRef.current.currentTime = val;
                    }}
                    className="flex-1 accent-red-600 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={handleCaptureScrubbedFrame}
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors cursor-pointer shrink-0"
                  >
                    Capture this Frame
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. AUDIENCE: MADE FOR KIDS (COPPA COMPLIANCE) */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs space-y-3">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            4. Audience — Made for Kids
          </h4>
        </div>

        <p className="text-xs text-gray-600 leading-relaxed">
          Regardless of your location, you&#39;re legally required to comply with the Children&#39;s Online
          Privacy Protection Act (COPPA) and/or other laws. You are required to tell us whether your videos
          are made for kids.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Option: Yes, it's made for kids */}
          <div
            onClick={() => onOverrideChange({ ...youtubeOverride, madeForKids: true })}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              madeForKidsValue === true
                ? 'border-red-600 bg-red-50/30 ring-2 ring-red-100 shadow-xs'
                : 'border-gray-200 hover:border-gray-300 bg-gray-50/30'
            }`}
          >
            <div className="flex items-start space-x-3">
              <input
                type="radio"
                name="madeForKids"
                checked={madeForKidsValue === true}
                onChange={() => onOverrideChange({ ...youtubeOverride, madeForKids: true })}
                className="mt-0.5 accent-red-600 cursor-pointer"
              />
              <div className="space-y-1">
                <span className="text-xs font-bold text-gray-900 block">
                  Yes, it&#39;s made for kids
                </span>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Content directed to children. Features like personalized ads, comments, and notifications
                  will be disabled.
                </p>
              </div>
            </div>
          </div>

          {/* Option: No, it's not made for kids */}
          <div
            onClick={() => onOverrideChange({ ...youtubeOverride, madeForKids: false })}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              madeForKidsValue === false
                ? 'border-red-600 bg-red-50/30 ring-2 ring-red-100 shadow-xs'
                : 'border-gray-200 hover:border-gray-300 bg-gray-50/30'
            }`}
          >
            <div className="flex items-start space-x-3">
              <input
                type="radio"
                name="madeForKids"
                checked={madeForKidsValue === false}
                onChange={() => onOverrideChange({ ...youtubeOverride, madeForKids: false })}
                className="mt-0.5 accent-red-600 cursor-pointer"
              />
              <div className="space-y-1">
                <span className="text-xs font-bold text-gray-900 block">
                  No, it&#39;s not made for kids
                </span>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  General audience content. Standard features like comments, end screens, and personalized
                  advertising remain active.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. YOUTUBE TAGS (CHIP INTERFACE) */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              5. YouTube Tags
            </h4>
            <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">
              {tags.length} {tags.length === 1 ? 'tag' : 'tags'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span
              className={`text-[11px] font-mono font-bold ${
                totalTagsChars > 450 ? 'text-amber-600' : 'text-gray-400'
              }`}
            >
              {totalTagsChars}/500 chars
            </span>
            {tags.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllTags}
                className="text-[11px] text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Tags help viewers find your video when search terms contain common misspellings or synonyms.
          Type and press Enter or comma.
        </p>

        {/* Tag Input Box */}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            placeholder="Add a tag (e.g. tech, coding, saas) and press Enter..."
            className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50/40 focus:outline-hidden focus:border-red-500 focus:bg-white"
          />
          <button
            type="button"
            onClick={handleAddTag}
            disabled={!tagInput.trim()}
            className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            Add Tag
          </button>
        </div>

        {tagError && (
          <p className="text-[11px] text-rose-600 font-medium">{tagError}</p>
        )}

        {/* Tags Chips Display */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-medium transition-colors"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="text-gray-400 hover:text-red-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 7. CATEGORY & VISIBILITY & PLAYLIST */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs space-y-4">
        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
          6. Publishing Controls
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Category Dropdown */}
          <div className="space-y-1.5 relative">
            <label className="text-xs font-bold text-gray-700 block">
              Video Category
            </label>
            <button
              type="button"
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              className="w-full text-left px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50/40 hover:bg-gray-100/50 flex items-center justify-between text-xs font-medium text-gray-800 cursor-pointer"
            >
              <span>{selectedCategory.title} (ID: {selectedCategory.id})</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {isCategoryDropdownOpen && (
              <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-2 max-h-60 overflow-y-auto space-y-1">
                <input
                  type="text"
                  placeholder="Filter categories..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg mb-1 focus:outline-hidden focus:border-red-500"
                />
                {categories
                  .filter((c) => c.title.toLowerCase().includes(categorySearch.toLowerCase()))
                  .map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        onOverrideChange({ ...youtubeOverride, categoryId: cat.id });
                        setIsCategoryDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer ${
                        cat.id === selectedCategory.id
                          ? 'bg-red-50 text-red-700 font-bold'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span>{cat.title}</span>
                      <span className="text-[10px] text-gray-400">ID: {cat.id}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Visibility / Privacy Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 block">
              Visibility
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'public', label: 'Public', icon: Globe },
                { id: 'unlisted', label: 'Unlisted', icon: EyeOff },
                { id: 'private', label: 'Private', icon: Lock },
              ].map((item) => {
                const Icon = item.icon;
                const isSel = privacyStatus === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onOverrideChange({ ...youtubeOverride, privacyStatus: item.id as any })}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                      isSel
                        ? 'border-red-600 bg-red-50 text-red-700 shadow-2xs'
                        : 'border-gray-200 bg-gray-50/50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Playlist Selection (if playlists available or connected) */}
        {playlists.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-gray-100">
            <label className="text-xs font-bold text-gray-700 flex items-center space-x-1.5">
              <FolderPlus className="w-3.5 h-3.5 text-gray-500" />
              <span>Add to Playlist (Optional)</span>
            </label>
            <select
              value={youtubeOverride.playlistId || ''}
              onChange={(e) => onOverrideChange({ ...youtubeOverride, playlistId: e.target.value || undefined })}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50/40 focus:outline-hidden focus:border-red-500"
            >
              <option value="">None (Upload as standalone video)</option>
              {playlists.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.title} ({pl.itemCount} items)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 8. COLLAPSIBLE ADVANCED SETTINGS */}
      <div className="bg-white rounded-2xl border border-gray-200/90 overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-gray-500" />
            <span>Advanced YouTube Settings (Recording Date, Location, Moderation)</span>
          </div>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <div className="p-5 pt-2 border-t border-gray-100 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Recording Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 flex items-center space-x-1">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>Recording Date</span>
                </label>
                <input
                  type="date"
                  value={youtubeOverride.recordingDate || ''}
                  onChange={(e) => onOverrideChange({ ...youtubeOverride, recordingDate: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 bg-gray-50"
                />
              </div>

              {/* Video Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Video Location</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. San Francisco, California"
                  value={youtubeOverride.videoLocation || ''}
                  onChange={(e) => onOverrideChange({ ...youtubeOverride, videoLocation: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 bg-gray-50"
                />
              </div>
            </div>

            {/* Comment Moderation Settings */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 block">
                Comments and Ratings
              </label>
              <select
                value={youtubeOverride.commentModeration || 'hold_inappropriate'}
                onChange={(e) => onOverrideChange({ ...youtubeOverride, commentModeration: e.target.value as any })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 bg-gray-50"
              >
                <option value="hold_inappropriate">Hold potentially inappropriate comments for review</option>
                <option value="allow_all">Allow all comments</option>
                <option value="disable">Disable comments</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
