'use client';

import React, { useState } from 'react';
import { Post, SocialAccount, SocialPlatform, PostType } from '@/types/social';
import { PlatformLogo } from './SocialIcons';
import {
  Heart,
  MessageCircle,
  Repeat2,
  Send,
  Bookmark,
  MoreHorizontal,
  Share2,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Globe,
  Play,
  Volume2,
  Music2,
  Check,
  ExternalLink,
  Info,
  Download,
} from 'lucide-react';
import { PLATFORM_CONFIGS } from '@/lib/constants';

interface PostPreviewProps {
  post: Partial<Post>;
  selectedPlatform: SocialPlatform;
  activeAccount?: SocialAccount;
  previewType?: PostType;
  aspectRatio?: 'original' | '1:1' | '4:5' | '9:16' | '16:9';
  mediaFitMode?: 'contain' | 'cover';
}

export const PostPreview: React.FC<PostPreviewProps> = ({
  post,
  selectedPlatform,
  activeAccount,
  previewType = 'post',
  aspectRatio = 'original',
  mediaFitMode = 'contain',
}) => {
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  const override =
    (activeAccount && post.accountOverrides?.[activeAccount.id]) ||
    (activeAccount && post.platformOverrides?.[activeAccount.id]) ||
    post.platformOverrides?.[selectedPlatform];
  const caption = override?.caption || post.content || '';
  const isAiGenerated = Boolean(override?.isAiGenerated ?? post.isAiGenerated);
  const collaborator = override?.collaborator || post.collaborators;
  const media = post.media && post.media.length > 0 ? post.media[0] : null;

  const username = activeAccount?.username || 'your_channel';
  const displayName = activeAccount?.displayName || 'Your Channel';
  const avatar =
    activeAccount?.avatarUrl ||
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80';

  // Compute container aspect ratio class based on user choice
  const getMediaAspectClass = () => {
    switch (aspectRatio) {
      case '1:1':
        return 'aspect-square';
      case '4:5':
        return 'aspect-[4/5]';
      case '9:16':
        return 'aspect-[9/16]';
      case '16:9':
        return 'aspect-video';
      case 'original':
      default:
        return media?.type === 'video' ? 'aspect-video' : 'aspect-square';
    }
  };

  const isReelOrShort =
    previewType === 'reel' ||
    aspectRatio === '9:16' ||
    (media?.type === 'video' && aspectRatio !== '16:9');

  const fitClass = mediaFitMode === 'cover' ? 'object-cover' : 'object-contain';

  return (
    <div className="w-full max-w-sm mx-auto select-none font-sans space-y-3">
      {/* 1. INSTAGRAM PREVIEW */}
      {selectedPlatform === 'instagram' && (
        isReelOrShort ? (
          /* Instagram Reels Preview */
          <div className="relative bg-black rounded-3xl overflow-hidden aspect-[9/16] text-white shadow-xl border border-gray-800 flex flex-col justify-between">
            {/* Background Media */}
            <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
              {media ? (
                media.type === 'video' ? (
                  <video
                    src={media.url}
                    className={`w-full h-full ${fitClass}`}
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                ) : (
                  <img src={media.thumbnailUrl || media.url} alt="Reel media" className={`w-full h-full ${fitClass}`} />
                )
              ) : (
                <div className="text-gray-500 text-xs text-center p-4">No media attached</div>
              )}
              {/* Subtle gradient overlay for readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />
            </div>

            {/* Top Reel Bar */}
            <div className="relative z-10 p-3.5 flex items-center justify-between text-xs font-bold">
              <span>Reels</span>
              <div className="w-6 h-6 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center">
                <Volume2 className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Right Action Icons Column */}
            <div className="relative z-10 self-end p-3 flex flex-col items-center space-y-4 mb-2">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center hover:scale-110 transition-transform">
                  <Heart className="w-5 h-5 fill-white text-white" />
                </div>
                <span className="text-[10px] font-bold mt-1">14.2K</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-[10px] font-bold mt-1">386</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center">
                  <Send className="w-4 h-4 text-white" />
                </div>
                <span className="text-[10px] font-bold mt-1">Share</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center">
                <MoreHorizontal className="w-4 h-4 text-white" />
              </div>
              {/* Audio Disc */}
              <div className="w-7 h-7 rounded-full border-2 border-white/60 bg-gray-900 flex items-center justify-center animate-spin">
                <div className="w-2.5 h-2.5 rounded-full bg-white" />
              </div>
            </div>

            {/* Bottom Caption & Profile Overlay */}
            <div className="relative z-10 p-3.5 space-y-2">
              <div className="flex items-center space-x-2">
                <img src={avatar} alt={username} className="w-7 h-7 rounded-full object-cover ring-2 ring-white/60" />
                <span className="text-xs font-bold text-white">@{username}{collaborator ? ` & @${collaborator.replace(/^@/, '')}` : ''}</span>{isAiGenerated && (<span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-white bg-black/50 border border-white/20 px-1.5 py-0.5 rounded-full backdrop-blur-xs"><Sparkles className="w-2.5 h-2.5 text-purple-300" />AI info</span>)}
                <button type="button" className="text-[10px] font-bold bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-full backdrop-blur-xs">
                  Follow
                </button>
              </div>
              <p className="text-xs text-white/90 line-clamp-2 leading-relaxed">
                {caption || 'Add your Instagram Reel caption in the editor...'}
              </p>
              <div className="flex items-center space-x-1.5 text-[10px] text-white/80">
                <Music2 className="w-3 h-3" />
                <span className="truncate">Original audio • {displayName}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Instagram Feed Post Preview */
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-100">
              <div className="flex items-center space-x-2.5">
                <img src={avatar} alt={username} className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-200" />
                <div>
                  <div className="flex items-center space-x-1.5"><div className="text-xs font-bold text-gray-900 leading-tight">{collaborator ? `${username} and @${collaborator.replace(/^@/, '')}` : username}</div>{isAiGenerated && (<span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-purple-700 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded-full"><Sparkles className="w-2.5 h-2.5 text-purple-600" />AI info</span>)}</div>
                  <div className="text-[10px] text-gray-400">Sponsored • Original Audio</div>
                </div>
              </div>
              <MoreHorizontal className="w-4 h-4 text-gray-400 cursor-pointer" />
            </div>

            {/* Media Canvas */}
            <div className={`relative bg-neutral-950 ${getMediaAspectClass()} flex items-center justify-center overflow-hidden`}>
              {media ? (
                media.type === 'video' ? (
                  <video
                    src={media.url}
                    className={`w-full h-full ${fitClass}`}
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                ) : (
                  <img src={media.thumbnailUrl || media.url} alt="Instagram Media" className={`w-full h-full ${fitClass}`} />
                )
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-400 text-xs">
                  <span>No media attached</span>
                </div>
              )}
            </div>

            {/* Actions Bar */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3.5 text-gray-700">
                  <Heart className="w-5 h-5 hover:text-rose-500 cursor-pointer transition-colors" />
                  <MessageCircle className="w-5 h-5 cursor-pointer" />
                  <Send className="w-5 h-5 cursor-pointer" />
                </div>
                <Bookmark className="w-5 h-5 text-gray-700 cursor-pointer" />
              </div>

              <div className="text-xs font-bold text-gray-900 mb-1">Liked by social_creator and 1,842 others</div>

              {/* Caption */}
              <div className="text-xs text-gray-800 leading-snug break-words">
                <strong className="font-bold mr-1.5">{username}</strong>
                <span className="whitespace-pre-line">{caption || 'Write your Instagram caption in the composer...'}</span>
              </div>

              

              <div className="text-[10px] text-gray-400 mt-2 uppercase tracking-wider">Just now</div>
            </div>
          </div>
        )
      )}

      {/* 2. FACEBOOK PAGE PREVIEW */}
      {selectedPlatform === 'facebook' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Header */}
          <div className="p-3.5 flex items-center justify-between border-b border-gray-100">
            <div className="flex items-center space-x-2.5">
              <img src={avatar} alt={displayName} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
              <div>
                <div className="flex items-center space-x-1.5"><div className="text-xs font-bold text-gray-900 leading-tight">{displayName}</div>{isAiGenerated && (<span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-purple-700 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded-full"><Sparkles className="w-2.5 h-2.5 text-purple-600" />AI info</span>)}</div>
                <div className="text-[11px] text-gray-500 flex items-center space-x-1 mt-0.5">
                  <span>Just now</span>
                  <span>·</span>
                  <Globe className="w-3 h-3 text-gray-400" />
                </div>
              </div>
            </div>
            <MoreHorizontal className="w-4 h-4 text-gray-400 cursor-pointer" />
          </div>

          {/* Caption text */}
          <div className="px-3.5 py-2.5 text-xs text-gray-900 whitespace-pre-line leading-relaxed break-words">
            {caption || 'Add your Facebook post description here...'}
          </div>

          {/* Media Asset */}
          {media && (
            <div className={`bg-neutral-950 ${getMediaAspectClass()} flex items-center justify-center overflow-hidden border-y border-gray-100`}>
              {media.type === 'video' ? (
                <video
                  src={media.url}
                  className={`w-full h-full ${fitClass}`}
                  controls
                  playsInline
                />
              ) : (
                <img
                  src={media.thumbnailUrl || media.url}
                  alt="Facebook Post Media"
                  className={`w-full h-full ${fitClass}`}
                />
              )}
            </div>
          )}

          {/* Social Stats Summary */}
          <div className="px-3.5 py-2 flex items-center justify-between text-[11px] text-gray-500 border-b border-gray-100">
            <div className="flex items-center space-x-1">
              <span className="text-sm">👍💙</span>
              <span className="font-semibold text-gray-700">482</span>
            </div>
            <span>34 comments • 12 shares</span>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 p-1 text-xs text-gray-600 font-semibold text-center">
            <button type="button" className="flex items-center justify-center space-x-1.5 py-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
              <ThumbsUp className="w-4 h-4 text-gray-500" />
              <span>Like</span>
            </button>
            <button type="button" className="flex items-center justify-center space-x-1.5 py-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
              <MessageCircle className="w-4 h-4 text-gray-500" />
              <span>Comment</span>
            </button>
            <button type="button" className="flex items-center justify-center space-x-1.5 py-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
              <Share2 className="w-4 h-4 text-gray-500" />
              <span>Share</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. YOUTUBE PREVIEW (Watch Card or Shorts) */}
      {selectedPlatform === 'youtube' && (
        isReelOrShort ? (
          /* YouTube Shorts Preview */
          <div className="relative bg-black rounded-3xl overflow-hidden aspect-[9/16] text-white shadow-xl border border-gray-800 flex flex-col justify-between">
            {/* Background Video */}
            <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
              {media ? (
                media.type === 'video' ? (
                  <video
                    src={media.url}
                    className={`w-full h-full ${fitClass}`}
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                ) : (
                  <img src={media.thumbnailUrl || media.url} alt="Shorts frame" className={`w-full h-full ${fitClass}`} />
                )
              ) : (
                <div className="text-gray-500 text-xs">Attach video for Shorts</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />
            </div>

            {/* Top Shorts Logo */}
            <div className="relative z-10 p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-1 bg-red-600 px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase">
                <span>Shorts</span>
              </div>
              <div className="flex items-center space-x-3 text-white">
                <Volume2 className="w-4 h-4" />
                <MoreHorizontal className="w-4 h-4" />
              </div>
            </div>

            {/* Right Action Icons Column */}
            <div className="relative z-10 self-end p-3 flex flex-col items-center space-y-4 mb-2">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center">
                  <ThumbsUp className="w-5 h-5 text-white" />
                </div>
                <span className="text-[10px] font-bold mt-1">28K</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center">
                  <ThumbsDown className="w-5 h-5 text-white" />
                </div>
                <span className="text-[10px] font-bold mt-1">Dislike</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-[10px] font-bold mt-1">1.2K</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center">
                  <Share2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-[10px] font-bold mt-1">Share</span>
              </div>
              {/* Sound Square */}
              <div className="w-8 h-8 rounded-lg bg-gray-900 border border-white/40 flex items-center justify-center">
                <Music2 className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Bottom Channel Info & Title */}
            <div className="relative z-10 p-3.5 space-y-2">
              <div className="flex items-center space-x-2">
                <img src={avatar} alt={displayName} className="w-7 h-7 rounded-full object-cover" />
                <span className="text-xs font-bold text-white">@{username}</span>
                <span className="bg-red-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  Subscribe
                </span>
              </div>
              {isAiGenerated && (<div className="mb-1 inline-flex items-center gap-1 text-[9px] font-semibold text-white bg-black/60 border border-white/20 px-2 py-0.5 rounded-full backdrop-blur-xs"><Sparkles className="w-2.5 h-2.5 text-blue-300" />Altered content</div>)}
              <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">
                {override?.title || post.platformOverrides?.youtube?.title || caption.split('\n')[0] || 'Shorts Video Title'}
              </h4>
            </div>
          </div>
        ) : (
          /* YouTube Standard Post Preview */
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Channel Header Row */}
            <div className="p-3.5 pb-2.5 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center space-x-2.5 min-w-0">
                <img src={avatar} alt={displayName} className="w-8 h-8 rounded-full object-cover shrink-0" />
                <div className="min-w-0">
                  <h5 className="text-xs font-bold text-gray-900 truncate">{displayName}</h5>
                  <span className="text-[10px] text-gray-400 block">YouTube Channel</span>
                </div>
              </div>
              <button type="button" className="px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold shrink-0">
                Subscribe
              </button>
            </div>

            {/* Post Caption */}
            {isAiGenerated && (<div className="mx-3.5 mt-2.5 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200/80 flex items-center space-x-1.5 text-[11px] text-gray-600"><Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" /><span>Altered or synthetic content disclosed</span></div>)}
            <div className="px-3.5 pt-3 pb-2 text-xs text-gray-800 leading-relaxed whitespace-pre-line">
              {caption || 'Enter your post caption in the composer...'}
            </div>

            {/* Attached Media Preview */}
            {media && (
              <div className="px-3.5 pb-3">
                {media.type === 'video' ? (
                  <div className="relative aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center">
                    <video
                      src={media.url}
                      className="w-full h-full object-contain"
                      controls
                    />
                  </div>
                ) : (
                  <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50 max-h-[380px] flex items-center justify-center">
                    <img
                      src={media.url}
                      alt="YouTube post media"
                      className="w-full h-auto max-h-[380px] object-cover"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Action Bar (Like, Dislike, Share) */}
            <div className="px-3.5 py-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="flex items-center bg-gray-100 rounded-full px-3 py-1 font-semibold space-x-1.5">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Like</span>
                  <span className="text-gray-300">|</span>
                  <ThumbsDown className="w-3.5 h-3.5" />
                </div>
                <div className="flex items-center bg-gray-100 rounded-full px-3 py-1 font-semibold space-x-1">
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </div>
              </div>
              <span className="text-[10px] text-gray-400">Public</span>
            </div>
          </div>
        )
      )}

      {/* 5. THREADS PREVIEW */}
      {selectedPlatform === 'threads' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm text-gray-900 space-y-3">
          <div className="flex items-start space-x-3">
            <div className="relative">
              <img src={avatar} alt={username} className="w-9 h-9 rounded-full object-cover" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-black text-white text-[10px] flex items-center justify-center font-bold">
                +
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-gray-900">{username}</span>
                <span className="text-[11px] text-gray-400">3m</span>
              </div>
              <p className="text-xs text-gray-900 mt-1.5 whitespace-pre-line leading-relaxed">
                {caption || 'Start a thread...'}
              </p>

              {media && (
                <div className={`mt-3 rounded-2xl overflow-hidden border border-gray-200 bg-neutral-950 ${getMediaAspectClass()} flex items-center justify-center`}>
                  {media.type === 'video' ? (
                    <video src={media.url} className={`w-full h-full ${fitClass}`} controls />
                  ) : (
                    <img src={media.thumbnailUrl || media.url} alt="Threads media" className={`w-full h-full ${fitClass}`} />
                  )}
                </div>
              )}

              {/* Action Icons */}
              <div className="flex items-center space-x-4 text-gray-700 text-xs mt-3 pt-1">
                <Heart className="w-4 h-4 hover:text-rose-500 cursor-pointer" />
                <MessageCircle className="w-4 h-4 cursor-pointer" />
                <Repeat2 className="w-4 h-4 cursor-pointer" />
                <Send className="w-4 h-4 cursor-pointer" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. LINKEDIN PREVIEW */}
      {selectedPlatform === 'linkedin' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm text-gray-900 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2.5">
              <img src={avatar} alt={displayName} className="w-10 h-10 rounded-full object-cover" />
              <div>
                <h4 className="text-xs font-bold text-gray-900">{displayName}</h4>
                <p className="text-[10px] text-gray-500">Creator & Agency Lead • 1st</p>
                <p className="text-[10px] text-gray-400">Just now • 🌐</p>
              </div>
            </div>
            <button type="button" className="text-xs font-bold text-[#0A66C2] hover:bg-blue-50 px-2 py-1 rounded-lg">
              + Follow
            </button>
          </div>

          <p className="text-xs text-gray-800 whitespace-pre-line leading-relaxed">
            {caption || 'Share your insights with your professional network...'}
          </p>

          {media && (
            <div className={`rounded-xl overflow-hidden border border-gray-200 bg-neutral-950 ${getMediaAspectClass()} flex items-center justify-center`}>
              {media.type === 'video' ? (
                <video src={media.url} className={`w-full h-full ${fitClass}`} controls />
              ) : (
                <img src={media.thumbnailUrl || media.url} alt="LinkedIn media" className={`w-full h-full ${fitClass}`} />
              )}
            </div>
          )}

          {/* Social Counts */}
          <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-b border-gray-100 pb-2">
            <span>👍💡❤️ 128</span>
            <span>24 comments • 6 reposts</span>
          </div>

          {/* Action Row */}
          <div className="grid grid-cols-4 gap-1 text-xs font-semibold text-gray-600 text-center">
            <div className="flex items-center justify-center space-x-1 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>Like</span>
            </div>
            <div className="flex items-center justify-center space-x-1 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Comment</span>
            </div>
            <div className="flex items-center justify-center space-x-1 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
              <Repeat2 className="w-3.5 h-3.5" />
              <span>Repost</span>
            </div>
            <div className="flex items-center justify-center space-x-1 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </div>
          </div>
        </div>
      )}

      {/* 7. PINTEREST PREVIEW */}
      {selectedPlatform === 'pinterest' && (
        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm max-w-[280px] mx-auto text-gray-900">
          <div className="relative">
            {media ? (
              <div className={`bg-neutral-950 ${getMediaAspectClass()} flex items-center justify-center overflow-hidden`}>
                {media.type === 'video' ? (
                  <video src={media.url} className={`w-full h-full ${fitClass}`} autoPlay loop muted />
                ) : (
                  <img src={media.thumbnailUrl || media.url} alt="Pin media" className={`w-full h-full ${fitClass}`} />
                )}
              </div>
            ) : (
              <div className="h-64 bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                Pin image required
              </div>
            )}
            <button
              type="button"
              className="absolute top-3 right-3 bg-[#BD081C] hover:bg-[#a00718] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md cursor-pointer"
            >
              Save
            </button>
          </div>

          <div className="p-3.5 space-y-1.5">
            <h4 className="text-xs font-bold text-gray-900 leading-snug line-clamp-2">
              {caption.split('\n')[0] || 'Pin Title Preview'}
            </h4>
            <div className="flex items-center space-x-2 pt-1">
              <img src={avatar} alt={displayName} className="w-5 h-5 rounded-full object-cover" />
              <span className="text-[11px] font-semibold text-gray-700">{displayName}</span>
            </div>
          </div>
        </div>
      )}

      {/* Preview Accuracy Disclaimer */}
      <div className="text-[10px] text-gray-400 text-center leading-relaxed px-2 flex items-center justify-center space-x-1">
        <Info className="w-3 h-3 text-gray-400 shrink-0" />
        <span>Simulated layout preview. Real presentation may adapt by device and platform app version.</span>
      </div>
    </div>
  );
};
