'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Post,
  SocialAccount,
  SocialPlatform,
  PostType,
  PostMedia,
  PlatformCaptionOverride,
} from '@/types/social';
import { PlatformLogo } from './SocialIcons';
import { PLATFORM_CONFIGS } from '@/lib/constants';
import {
  Sparkles,
  Upload,
  Calendar,
  Clock,
  ChevronDown,
  Smile,
  Hash,
  X,
  FileImage,
  Layers,
  Zap,
  Info,
  Maximize2,
  Minimize2,
  Music,
  ShoppingBag,
  Sticker,
  Pin,
  Heart,
  MessageCircle,
  Repeat2,
  Send,
  Bookmark,
  MoreHorizontal,
  Check,
} from 'lucide-react';

interface PostComposerProps {
  accounts: SocialAccount[];
  initialPost?: Partial<Post>;
  onSave: (postData: Partial<Post>, action: 'schedule' | 'publish-now' | 'draft') => Promise<void>;
  onClose?: () => void;
  openAiModal: (initialPrompt: string, onGenerated: (caption: string) => void) => void;
}

export const PostComposer: React.FC<PostComposerProps> = ({
  accounts,
  initialPost,
  onSave,
  onClose,
  openAiModal,
}) => {
  // Target accounts
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(
    initialPost?.targetAccountIds || (accounts.length > 0 ? [accounts[0].id] : ['fb_868941086292404'])
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Post Type: 'post' | 'reel' | 'story'
  const [postType, setPostType] = useState<PostType>(initialPost?.postType || 'post');

  // Main Caption
  const [mainCaption, setMainCaption] = useState<string>(initialPost?.content || '');

  // Media List
  const [mediaList, setMediaList] = useState<PostMedia[]>(initialPost?.media || []);

  // Platform overrides
  const [platformOverrides, setPlatformOverrides] = useState<
    Partial<Record<SocialPlatform, PlatformCaptionOverride>>
  >(initialPost?.platformOverrides || {});

  // Extra settings from screenshot
  const [firstComment, setFirstComment] = useState(initialPost?.firstComment || '');
  const [collaborators, setCollaborators] = useState(initialPost?.collaborators || '');
  const [isAiGenerated, setIsAiGenerated] = useState(initialPost?.isAiGenerated || false);
  const [tags, setTags] = useState<string[]>(initialPost?.tags || ['general']);
  const [musicTitle, setMusicTitle] = useState(initialPost?.musicTitle || '');
  const [productTags, setProductTags] = useState<string[]>(initialPost?.productTags || []);
  const [stickers, setStickers] = useState<string[]>(initialPost?.stickers || []);
  const [publishMode, setPublishMode] = useState<string>(initialPost?.publishMode || 'automatic');

  // Modals / Popovers for toolbar buttons
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [showTemplatesMenu, setShowTemplatesMenu] = useState(false);
  const [showPublishModeMenu, setShowPublishModeMenu] = useState(false);
  const [showMusicPrompt, setShowMusicPrompt] = useState(false);
  const [showProductPrompt, setShowProductPrompt] = useState(false);
  const [showStickerPrompt, setShowStickerPrompt] = useState(false);
  const [showSchedulePopover, setShowSchedulePopover] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Scheduling date & time (defaults to tomorrow 8:54 PM matching screenshot format)
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [scheduledTime, setScheduledTime] = useState('20:54');

  const [activePreviewPlatform, setActivePreviewPlatform] = useState<SocialPlatform>('instagram');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const selectedAccounts = accounts.filter((a) => selectedAccountIds.includes(a.id));
  const activeAccount = selectedAccounts[0] || accounts[0] || {
    id: 'fb_868941086292404',
    username: 'image_rescaler',
    displayName: 'image_rescaler',
    platform: 'instagram',
    avatarUrl: '',
  };

  // Formatted date string for the schedule button (e.g. "Oct 13, 8:54 PM")
  const formattedScheduleString = (() => {
    try {
      const [year, month, day] = scheduledDate.split('-').map(Number);
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      const dateObj = new Date(year, month - 1, day, hours, minutes);
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return `${scheduledDate} ${scheduledTime}`;
    }
  })();

  // Character limit calculations (Instagram: 2200 chars limit)
  const maxChars = 2200;
  const charsRemaining = Math.max(0, maxChars - mainCaption.length);
  // Hashtags count (limit 30)
  const currentHashtags = (mainCaption.match(/#[a-zA-Z0-9_]+/g) || []).length;
  const hashtagsRemaining = Math.max(0, 30 - currentHashtags);

  // Handle media file upload
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingMedia(true);

    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(file.name);
      const localBlobUrl = URL.createObjectURL(file);
      const mediaId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const tempMedia: PostMedia = {
        id: mediaId,
        name: file.name,
        url: localBlobUrl,
        thumbnailUrl: localBlobUrl,
        type: isVideo ? 'video' : 'image',
        size: file.size,
        aspectRatio: isVideo ? '9:16' : '1:1',
      };
      setMediaList((prev) => [...prev, tempMedia]);

      if (isVideo && postType !== 'reel') {
        setPostType('reel');
      }

      // Upload file to server in background
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
                ? {
                    ...item,
                    url: data.url,
                    thumbnailUrl: data.thumbnailUrl || data.url,
                  }
                : item
            )
          );
        }
      } catch (err) {
        console.error('Failed to upload media to server:', err);
      }
    }
    setIsUploadingMedia(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // AI First Comment Generator
  const generateAiFirstComment = () => {
    const suggestions = [
      'Drop a ❤️ if you agree! Let us know your thoughts in the comments.',
      'Check the link in bio for more details! ✨ #viral #trending',
      'What do you think about this? Save this post for later reference! 📌',
      'Double tap if this resonates with your journey! 🚀',
    ];
    const picked = suggestions[Math.floor(Math.random() * suggestions.length)];
    setFirstComment(picked);
  };

  // Quick Templates
  const applyTemplate = (templateType: string) => {
    if (templateType === 'product') {
      setMainCaption(
        '🚀 Introducing our newest launch!\n\nDesigned to make your workflow 10x smoother and faster. Check it out and let us know your favorite feature!'
      );
    } else if (templateType === 'engagement') {
      setMainCaption(
        'Quick question for our community 👇\n\nWhat is one tool or habit you cannot start your day without? Share below!'
      );
    } else if (templateType === 'tips') {
      setMainCaption(
        '💡 Pro Tip of the Day:\n\nConsistency beats intensity. Set small, achievable goals every day to build unstoppable momentum.\n\nSave this for later!'
      );
    }
    setShowTemplatesMenu(false);
  };

  // Execute Save / Schedule / Draft
  const handleExecuteSave = async (action: 'schedule' | 'publish-now' | 'draft') => {
    setIsSubmitting(true);
    try {
      const scheduledIso =
        action === 'schedule' ? new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString() : undefined;

      const payload: Partial<Post> = {
        content: mainCaption,
        targetAccountIds: selectedAccountIds,
        media: mediaList,
        postType,
        platformOverrides,
        firstComment,
        collaborators,
        isAiGenerated,
        tags,
        musicTitle,
        productTags,
        stickers,
        publishMode,
        scheduledFor: scheduledIso,
      };

      await onSave(payload, action);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`bg-[#18191c] text-gray-100 rounded-2xl shadow-2xl border border-[#2a2d33] overflow-hidden flex flex-col font-sans transition-all duration-200 ${
        isFullscreen
          ? 'fixed inset-4 z-50 max-w-none h-[calc(100vh-2rem)]'
          : 'h-[calc(100vh-4rem)] max-w-6xl w-full mx-auto'
      }`}
    >
      {/* Top Header Bar matching exact screenshot */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#282b30] bg-[#18191c] shrink-0">
        <div className="flex items-center space-x-3">
          <h2 className="text-sm font-bold text-white tracking-tight">
            {initialPost?.id ? 'Edit Post' : 'Create Post'}
          </h2>

          {/* Tags Dropdown Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTagMenu(!showTagMenu)}
              className="flex items-center space-x-1.5 bg-[#25272c] hover:bg-[#30333a] border border-[#383b42] px-2.5 py-1 rounded-lg text-xs font-medium text-gray-300 transition-colors"
            >
              <span>🏷️ Tags ({tags.length})</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {showTagMenu && (
              <div className="absolute left-0 mt-2 w-48 bg-[#202226] border border-[#383b42] rounded-xl shadow-xl p-2 z-50 text-xs">
                <div className="font-semibold text-gray-400 mb-1.5 px-2">Select Tags</div>
                {['growth', 'product', 'reel', 'viral', 'announcement'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setTags((prev) =>
                        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                      );
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#2b2e35] flex items-center justify-between text-gray-200"
                  >
                    <span>#{tag}</span>
                    {tags.includes(tag) && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Right Controls: Templates, AI Assistant, Preview Pill, Fullscreen, Close */}
        <div className="flex items-center space-x-2">
          {/* Templates Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTemplatesMenu(!showTemplatesMenu)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white hover:bg-[#25272c] transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-gray-400" />
              <span>Templates</span>
            </button>

            {showTemplatesMenu && (
              <div className="absolute right-0 mt-2 w-44 bg-[#202226] border border-[#383b42] rounded-xl shadow-xl p-2 z-50 text-xs">
                <button
                  type="button"
                  onClick={() => applyTemplate('product')}
                  className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#2b2e35] text-gray-200"
                >
                  🚀 Product Launch
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('engagement')}
                  className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#2b2e35] text-gray-200"
                >
                  💬 Question / Poll
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('tips')}
                  className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#2b2e35] text-gray-200"
                >
                  💡 Weekly Tips
                </button>
              </div>
            )}
          </div>

          {/* AI Assistant */}
          <button
            type="button"
            onClick={() => openAiModal(mainCaption, (generated) => setMainCaption(generated))}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-white hover:bg-[#25272c] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI Assistant</span>
          </button>

          {/* Preview Pill Button matching screenshot */}
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-[#182e21] text-[#4ade80] border border-[#22c55e]/50 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
            <span>Preview</span>
          </div>

          {/* Fullscreen Expand Button */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#25272c] transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close Button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#25272c] transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Split Layout: Editor (Left) & Instagram Preview (Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Post Type, Caption, Dropzone, and Complete Settings */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 border-r border-[#282b30] bg-[#1a1b1f]">
          {/* Post Type Selector (Instagram Icon + Radio buttons for Post, Reel, Story) */}
          <div className="flex items-center space-x-4 pb-2">
            {/* Instagram Platform Badge */}
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white shadow-xs">
              <PlatformLogo platform="instagram" className="w-4 h-4 text-white" />
            </div>

            {/* Radio Options: Post, Reel, Story */}
            <div className="flex items-center space-x-4 text-xs font-semibold">
              <label
                onClick={() => setPostType('post')}
                className="flex items-center space-x-1.5 cursor-pointer select-none text-gray-200 hover:text-white"
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                    postType === 'post' ? 'border-[#22c55e]' : 'border-gray-500'
                  }`}
                >
                  {postType === 'post' && <span className="w-2 h-2 rounded-full bg-[#22c55e]" />}
                </span>
                <span>Post</span>
              </label>

              <label
                onClick={() => setPostType('reel')}
                className="flex items-center space-x-1.5 cursor-pointer select-none text-gray-400 hover:text-white"
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                    postType === 'reel' ? 'border-[#22c55e]' : 'border-gray-500'
                  }`}
                >
                  {postType === 'reel' && <span className="w-2 h-2 rounded-full bg-[#22c55e]" />}
                </span>
                <span>Reel</span>
              </label>

              <label
                onClick={() => setPostType('story')}
                className="flex items-center space-x-1.5 cursor-pointer select-none text-gray-400 hover:text-white"
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                    postType === 'story' ? 'border-[#22c55e]' : 'border-gray-500'
                  }`}
                >
                  {postType === 'story' && <span className="w-2 h-2 rounded-full bg-[#22c55e]" />}
                </span>
                <span>Story</span>
              </label>
            </div>
          </div>

          {/* Caption Textarea (seamless dark background matching screenshot) */}
          <div>
            <textarea
              value={mainCaption}
              onChange={(e) => setMainCaption(e.target.value)}
              placeholder="Write a caption..."
              className="w-full bg-transparent text-gray-100 placeholder:text-gray-500 border-none outline-none resize-none text-sm h-20 leading-relaxed font-normal"
            />
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,video/*"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />

          {/* Media Previews & Upload Dropzone Card */}
          <div className="flex items-center gap-3">
            {/* Uploaded Media Thumbnails */}
            {mediaList.map((m) => (
              <div
                key={m.id}
                className="relative w-24 h-24 rounded-xl overflow-hidden border border-[#3a3d45] group shrink-0 bg-white shadow-xs flex items-center justify-center"
              >
                {m.type === 'video' ? (
                  <video src={m.url} className="w-full h-full object-cover" />
                ) : (
                  <img src={m.thumbnailUrl || m.url} alt={m.name} className="w-full h-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => setMediaList(mediaList.filter((item) => item.id !== m.id))}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Drop Target Box matching exact screenshot (dashed outline, picture icon, green link) */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-28 h-24 border border-dashed rounded-xl flex flex-col items-center justify-center p-2 text-center cursor-pointer transition-colors shrink-0 ${
                isDragging
                  ? 'border-[#22c55e] bg-[#22c55e]/10'
                  : 'border-[#3a3d45] hover:border-[#22c55e] bg-transparent'
              }`}
            >
              <FileImage className="w-5 h-5 text-gray-400 mb-1" />
              <p className="text-[11px] text-gray-400 leading-tight">Drag & drop or</p>
              <p className="text-[11px] text-[#22c55e] font-semibold leading-tight mt-0.5">select a file</p>
            </div>
          </div>

          {isUploadingMedia && (
            <div className="p-2 bg-emerald-950/30 border border-emerald-500/30 rounded-lg flex items-center space-x-2 text-xs text-emerald-400">
              <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <span>Uploading media file to server...</span>
            </div>
          )}

          {/* Toolbar below media: (+ ⌄, 😊, #, character count, # remaining) */}
          <div className="flex items-center justify-between pt-2 border-t border-[#282b30] text-gray-400 text-xs">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setMainCaption(mainCaption + '\n\n🔗 Link: https://')}
                className="flex items-center space-x-0.5 hover:text-white transition-colors"
                title="Add link"
              >
                <span>+</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={() => setMainCaption(mainCaption + ' ✨')}
                className="hover:text-white transition-colors"
                title="Insert Emoji"
              >
                <Smile className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setMainCaption(mainCaption + ' #viral #trending #explore ')}
                className="hover:text-white transition-colors"
                title="Insert Hashtags"
              >
                <Hash className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center space-x-3 text-[11px] text-gray-500 font-mono">
              <span>{charsRemaining}</span>
              <span># Remaining: {hashtagsRemaining}</span>
            </div>
          </div>

          {/* ALL SETTINGS FROM SCREENSHOT */}
          <div className="space-y-4 pt-3 border-t border-[#282b30]">
            {/* Setting Row 1: Action Chips (Add Stickers, Music, Tag Products, Automatic ⌄) */}
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                {/* Add Stickers */}
                <button
                  type="button"
                  onClick={() => setShowStickerPrompt(!showStickerPrompt)}
                  className={`px-3 py-1.5 rounded-lg border transition-colors ${
                    stickers.length > 0
                      ? 'bg-[#202226] border-[#22c55e] text-[#22c55e]'
                      : 'bg-[#202226] border-[#2e3138] text-gray-300 hover:text-white hover:border-gray-500'
                  }`}
                >
                  <span>{stickers.length > 0 ? `Stickers (${stickers.length})` : 'Add Stickers'}</span>
                </button>

                {/* Music */}
                <button
                  type="button"
                  onClick={() => setShowMusicPrompt(!showMusicPrompt)}
                  className={`px-3 py-1.5 rounded-lg border flex items-center space-x-1.5 transition-colors ${
                    musicTitle
                      ? 'bg-[#202226] border-[#22c55e] text-[#22c55e]'
                      : 'bg-[#202226] border-[#2e3138] text-gray-300 hover:text-white hover:border-gray-500'
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>{musicTitle ? `Audio: ${musicTitle}` : 'Music'}</span>
                </button>

                {/* Tag Products */}
                <button
                  type="button"
                  onClick={() => setShowProductPrompt(!showProductPrompt)}
                  className={`px-3 py-1.5 rounded-lg border flex items-center space-x-1.5 transition-colors ${
                    productTags.length > 0
                      ? 'bg-[#202226] border-[#22c55e] text-[#22c55e]'
                      : 'bg-[#202226] border-[#2e3138] text-gray-300 hover:text-white hover:border-gray-500'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{productTags.length > 0 ? `Tagged (${productTags.length})` : 'Tag Products'}</span>
                </button>
              </div>

              {/* Automatic Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPublishModeMenu(!showPublishModeMenu)}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#202226] border border-[#2e3138] text-gray-300 hover:text-white text-xs font-medium transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-gray-400" />
                  <span className="capitalize">{publishMode}</span>
                  <ChevronDown className="w-3 h-3 text-gray-400 ml-0.5" />
                </button>

                {showPublishModeMenu && (
                  <div className="absolute right-0 mt-1.5 w-48 bg-[#202226] border border-[#383b42] rounded-xl shadow-xl p-1.5 z-50 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setPublishMode('automatic');
                        setShowPublishModeMenu(false);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#2b2e35] text-gray-200"
                    >
                      ⚡ Automatic (Direct API)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPublishMode('notification');
                        setShowPublishModeMenu(false);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#2b2e35] text-gray-200"
                    >
                      🔔 Notification Reminder
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sub-inputs if Sticker / Music / Product is active */}
            {showStickerPrompt && (
              <div className="p-3 bg-[#202226] border border-[#2e3138] rounded-xl text-xs space-y-2">
                <div className="font-semibold text-gray-300">Choose Stickers for Story/Reel:</div>
                <div className="flex flex-wrap gap-2">
                  {['Poll', 'Question', 'Link', 'Countdown', 'Location'].map((stk) => (
                    <button
                      key={stk}
                      type="button"
                      onClick={() => {
                        setStickers((prev) =>
                          prev.includes(stk) ? prev.filter((s) => s !== stk) : [...prev, stk]
                        );
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium border ${
                        stickers.includes(stk)
                          ? 'bg-[#22c55e]/20 border-[#22c55e] text-[#22c55e]'
                          : 'bg-[#282b30] border-[#383b42] text-gray-300'
                      }`}
                    >
                      {stk} {stickers.includes(stk) ? '✓' : '+'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showMusicPrompt && (
              <div className="p-3 bg-[#202226] border border-[#2e3138] rounded-xl text-xs flex items-center space-x-2">
                <Music className="w-4 h-4 text-[#22c55e]" />
                <input
                  type="text"
                  value={musicTitle}
                  onChange={(e) => setMusicTitle(e.target.value)}
                  placeholder="Enter track or artist name (e.g. Synthwave Dreams)"
                  className="flex-1 bg-transparent border-none outline-none text-gray-200 text-xs"
                />
                {musicTitle && (
                  <button type="button" onClick={() => setMusicTitle('')} className="text-gray-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {showProductPrompt && (
              <div className="p-3 bg-[#202226] border border-[#2e3138] rounded-xl text-xs flex items-center space-x-2">
                <ShoppingBag className="w-4 h-4 text-[#22c55e]" />
                <input
                  type="text"
                  placeholder="Add product catalog SKU or tag (e.g. #PROD-102)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      setProductTags([...productTags, e.currentTarget.value.trim()]);
                      e.currentTarget.value = '';
                    }
                  }}
                  className="flex-1 bg-transparent border-none outline-none text-gray-200 text-xs"
                />
              </div>
            )}

            {/* Setting Row 2: First Comment (with purple AI lightning button inside) */}
            <div className="flex items-center space-x-4 text-xs">
              <span className="w-24 shrink-0 font-medium text-gray-400">First Comment</span>
              <div className="flex-1 relative flex items-center">
                <input
                  type="text"
                  value={firstComment}
                  onChange={(e) => setFirstComment(e.target.value)}
                  placeholder="Your comment"
                  className="w-full bg-[#202226] border border-[#2e3138] rounded-xl px-3.5 py-2 pr-9 text-xs text-gray-200 placeholder:text-gray-500 focus:outline-hidden focus:border-gray-400"
                />
                <button
                  type="button"
                  onClick={generateAiFirstComment}
                  className="absolute right-2 w-6 h-6 rounded-full bg-[#6366f1] hover:bg-[#4f46e5] text-white flex items-center justify-center transition-colors shadow-2xs"
                  title="Generate engaging first comment"
                >
                  <Zap className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Setting Row 3: Collaborators (with New badge and @ input) */}
            <div className="flex items-center space-x-4 text-xs">
              <div className="w-24 shrink-0 flex items-center space-x-1.5">
                <span className="bg-[#4c1d95] text-[#c084fc] text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  New
                </span>
                <span className="font-medium text-gray-400">Collaborators</span>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={collaborators}
                  onChange={(e) => setCollaborators(e.target.value)}
                  placeholder="@ Enter an Instagram username"
                  className="w-full bg-[#202226] border border-[#2e3138] rounded-xl px-3.5 py-2 text-xs text-gray-200 placeholder:text-gray-500 focus:outline-hidden focus:border-gray-400"
                />
              </div>
            </div>

            {/* Setting Row 4: AI-Generated Toggle */}
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center space-x-1.5 text-gray-400 font-medium" title="Flags post with Meta's required AI disclosure">
                <span>AI-Generated</span>
                <Info className="w-3.5 h-3.5 text-gray-500 cursor-pointer" />
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => setIsAiGenerated(!isAiGenerated)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-hidden ${
                  isAiGenerated ? 'bg-[#22c55e]' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    isAiGenerated ? 'translate-x-4' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Instagram Preview Card matching exact screenshot */}
        <div className="w-[430px] p-6 bg-[#18191c] overflow-y-auto flex flex-col justify-start shrink-0 border-l border-[#282b30]">
          {/* Header: Instagram Preview ⓘ */}
          <div className="flex items-center space-x-1.5 text-xs font-bold text-gray-200 mb-4">
            <span>Instagram Preview</span>
            <Info className="w-3.5 h-3.5 text-gray-400 cursor-pointer" />
          </div>

          {/* Instagram Post Card matching exact screenshot */}
          <div className="bg-white text-gray-900 rounded-2xl overflow-hidden shadow-xl border border-gray-100 flex flex-col">
            {/* Author Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center bg-gray-50 text-gray-700">
                  <FileImage className="w-4 h-4 text-blue-500" />
                </div>
                <span className="text-xs font-bold text-gray-900">{activeAccount.username || 'image_rescaler'}</span>
              </div>
              <MoreHorizontal className="w-4 h-4 text-gray-400 cursor-pointer" />
            </div>

            {/* Media Area (aspect-square) */}
            <div className="relative bg-white aspect-square flex items-center justify-center overflow-hidden border-b border-gray-100">
              {mediaList.length > 0 ? (
                mediaList[0].type === 'video' ? (
                  <video src={mediaList[0].url} className="w-full h-full object-cover" autoPlay muted loop />
                ) : (
                  <img
                    src={mediaList[0].url}
                    alt="Instagram Post"
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                /* High-fidelity Vector Placeholder matching screenshot */
                <div className="flex flex-col items-center justify-center p-8 select-none">
                  <svg width="180" height="180" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="30" y="30" width="100" height="100" rx="12" fill="#F8FAFC" stroke="#0F172A" strokeWidth="4" strokeDasharray="8 8" />
                    <rect x="44" y="44" width="72" height="72" rx="10" fill="#3B82F6" />
                    <circle cx="95" cy="65" r="9" fill="#FBBF24" />
                    <path d="M44 95L65 74L95 104L116 83" stroke="#1E3A8A" strokeWidth="4" />
                    {/* Expand arrows */}
                    <path d="M120 40H140M140 40V60M140 40L105 75" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M40 120H20M20 120V100M20 120L55 85" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>

            {/* Action Bar (Heart, Comment, Repost, Send, Bookmark) */}
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between text-gray-800">
                <div className="flex items-center space-x-3.5">
                  <Heart className="w-5 h-5 hover:text-red-500 cursor-pointer transition-colors" />
                  <MessageCircle className="w-5 h-5 cursor-pointer" />
                  <Repeat2 className="w-5 h-5 cursor-pointer" />
                  <Send className="w-5 h-5 cursor-pointer" />
                </div>
                <Bookmark className="w-5 h-5 cursor-pointer" />
              </div>

              {/* Caption Line: username + caption */}
              <div className="text-xs text-gray-900 leading-snug">
                <span className="font-bold mr-1.5">{activeAccount.username || 'image_rescaler'}</span>
                <span>{mainCaption || 'HEELO'}</span>
              </div>

              {firstComment && (
                <div className="text-[11px] text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100">
                  <span className="font-semibold text-gray-700">First comment: </span>
                  {firstComment}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL FOOTER BAR matching exact screenshot */}
      <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#282b30] bg-[#18191c] shrink-0">
        {/* Left: Move to Drafts button */}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleExecuteSave('draft')}
          className="text-xs font-medium text-gray-400 hover:text-white transition-colors"
        >
          Move to Drafts
        </button>

        {/* Right: Date Picker Button + Green Save Button */}
        <div className="flex items-center space-x-3">
          {/* Schedule Date/Time Picker Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSchedulePopover(!showSchedulePopover)}
              className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-[#25272c] hover:bg-[#30333a] border border-[#383b42] text-xs font-medium text-gray-200 transition-colors"
            >
              <Pin className="w-3.5 h-3.5 text-gray-400" />
              <span>{formattedScheduleString}</span>
              <ChevronDown className="w-3 h-3 text-gray-400 ml-1" />
            </button>

            {/* Inline Schedule Popover */}
            {showSchedulePopover && (
              <div className="absolute right-0 bottom-full mb-2 w-64 bg-[#202226] border border-[#383b42] rounded-xl shadow-2xl p-3 z-50 text-xs space-y-3">
                <div className="font-bold text-gray-200">Schedule Post Timing</div>
                <div>
                  <label className="text-[10px] uppercase font-semibold text-gray-400 block mb-1">Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#282b30] border border-[#383b42] text-gray-200 text-xs focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-semibold text-gray-400 block mb-1">Time</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#282b30] border border-[#383b42] text-gray-200 text-xs focus:outline-hidden"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowSchedulePopover(false)}
                  className="w-full py-1.5 bg-[#22c55e] text-black font-semibold rounded-lg text-xs"
                >
                  Set Schedule
                </button>
              </div>
            )}
          </div>

          {/* Green Save Button matching exact screenshot */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleExecuteSave('schedule')}
            className="px-5 py-2 rounded-xl bg-[#86efac] hover:bg-[#4ade80] text-[#14532d] font-bold text-xs shadow-md transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
