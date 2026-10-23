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

  const override = post.platformOverrides?.[selectedPlatform];
  const caption = override?.caption || post.content || '';
  const firstComment = override?.firstComment || post.firstComment;
  const isAiGenerated = override?.isAiGenerated ?? post.isAiGenerated;
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
                <span className="text-xs font-bold text-white">@{username}</span>
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
                  <div className="text-xs font-bold text-gray-900 leading-tight">{username}</div>
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

              {firstComment && (
                <div className="mt-2 pt-2 border-t border-gray-100 text-[11px] text-gray-600">
                  <span className="font-semibold text-gray-800 mr-1.5">{username}</span>
                  <span className="text-gray-400">[First Comment]</span> {firstComment}
                </div>
              )}

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
                <div className="text-xs font-bold text-gray-900 leading-tight">{displayName}</div>
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
              <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">
                {override?.title || post.platformOverrides?.youtube?.title || caption.split('\n')[0] || 'Shorts Video Title'}
              </h4>
            </div>
          </div>
        ) : (
          /* YouTube Standard Video Watch Preview */
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            {/* 16:9 Video Player */}
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden group">
              {media ? (
                media.type === 'video' ? (
                  <video src={media.url} className="w-full h-full object-contain" controls />
                ) : (
                  <img src={media.thumbnailUrl || media.url} alt="YouTube thumbnail" className="w-full h-full object-cover" />
                )
              ) : (
                <div className="text-gray-500 text-xs">Video media required</div>
              )}
              {/* Seekbar visual */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600" />
            </div>

            {/* Video Metadata */}
            <div className="p-3.5 space-y-2.5">
              <h3 className="text-sm font-bold text-gray-900 leading-snug">
                {override?.title || post.platformOverrides?.youtube?.title || caption.split('\n')[0] || 'Scheduled YouTube Video Title'}
              </h3>

              {/* Channel Row */}
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center space-x-2">
                  <img src={avatar} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
                  <div>
                    <h5 className="text-xs font-bold text-gray-900 leading-none">{displayName}</h5>
                    <span className="text-[10px] text-gray-500">18.4K subscribers</span>
                  </div>
                </div>
                <button type="button" className="px-3 py-1 rounded-full bg-black text-white text-xs font-bold cursor-pointer">
                  Subscribe
                </button>
              </div>

              {/* YouTube Action Buttons */}
              <div className="flex items-center space-x-2 text-xs text-gray-700 overflow-x-auto scrollbar-none py-1">
                <div className="flex items-center bg-gray-100 rounded-full px-3 py-1 font-semibold space-x-1.5 shrink-0">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>3.2K</span>
                  <span className="text-gray-300">|</span>
                  <ThumbsDown className="w-3.5 h-3.5" />
                </div>
                <div className="flex items-center bg-gray-100 rounded-full px-3 py-1 font-semibold space-x-1 shrink-0">
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </div>
                <div className="flex items-center bg-gray-100 rounded-full px-3 py-1 font-semibold space-x-1 shrink-0">
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </div>
              </div>

              {/* Video Description Card */}
              <div className="bg-gray-50 rounded-xl p-2.5 text-xs text-gray-800 space-y-1">
                <div className="text-[11px] font-bold text-gray-600">
                  <span>4.1K views</span> • <span>Just now</span>
                </div>
                <p className={`whitespace-pre-line text-gray-700 leading-relaxed ${isDescExpanded ? '' : 'line-clamp-2'}`}>
                  {caption || 'Add your YouTube video description in the composer...'}
                </p>
                {caption.length > 80 && (
                  <button
                    type="button"
                    onClick={() => setIsDescExpanded(!isDescExpanded)}
                    className="text-[11px] font-bold text-gray-900 hover:underline cursor-pointer"
                  >
                    {isDescExpanded ? 'Show less' : '...more'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      )}

      {/* 4. X (TWITTER) PREVIEW */}
      {selectedPlatform === 'twitter' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm text-gray-900 space-y-3">
          <div className="flex items-start space-x-3">
            <img src={avatar} alt={username} className="w-10 h-10 rounded-full object-cover shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-1 text-xs">
                <span className="font-bold text-gray-900 truncate">{displayName}</span>
                <span className="text-blue-500 font-bold">✓</span>
                <span className="text-gray-400 truncate">@{username}</span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-400">now</span>
              </div>

              {/* Post Text */}
              <p className="text-xs text-gray-900 mt-2 whitespace-pre-line leading-relaxed break-words">
                {caption || "What's happening? Add your X post caption in the editor..."}
              </p>

              {/* Media Card */}
              {media && (
                <div className={`mt-3 rounded-2xl overflow-hidden border border-gray-200 bg-neutral-950 ${getMediaAspectClass()} flex items-center justify-center`}>
                  {media.type === 'video' ? (
                    <video src={media.url} className={`w-full h-full ${fitClass}`} controls />
                  ) : (
                    <img src={media.thumbnailUrl || media.url} alt="X media" className={`w-full h-full ${fitClass}`} />
                  )}
                </div>
              )}

              {/* Metrics */}
              <div className="flex items-center justify-between text-gray-400 text-xs mt-3 pt-2 border-t border-gray-100">
                <div className="flex items-center space-x-1 hover:text-blue-500 cursor-pointer">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>38</span>
                </div>
                <div className="flex items-center space-x-1 hover:text-emerald-500 cursor-pointer">
                  <Repeat2 className="w-3.5 h-3.5" />
                  <span>14</span>
                </div>
                <div className="flex items-center space-x-1 hover:text-rose-500 cursor-pointer">
                  <Heart className="w-3.5 h-3.5" />
                  <span>294</span>
                </div>
                <div className="flex items-center space-x-1 hover:text-blue-500 cursor-pointer">
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>62</span>
                </div>
                <div className="flex items-center space-x-1 hover:text-blue-500 cursor-pointer">
                  <Share2 className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        </div>
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
