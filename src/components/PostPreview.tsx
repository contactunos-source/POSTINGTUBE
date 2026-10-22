'use client';

import React from 'react';
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
  Sparkles,
  Globe,
} from 'lucide-react';
import { PLATFORM_CONFIGS } from '@/lib/constants';

interface PostPreviewProps {
  post: Partial<Post>;
  selectedPlatform: SocialPlatform;
  activeAccount?: SocialAccount;
  previewType?: PostType;
}

export const PostPreview: React.FC<PostPreviewProps> = ({
  post,
  selectedPlatform,
  activeAccount,
  previewType = 'post',
}) => {
  const override = post.platformOverrides?.[selectedPlatform];
  const caption = override?.caption || post.content || 'Your post caption preview will appear here...';
  const firstComment = override?.firstComment || post.firstComment;
  const isAiGenerated = override?.isAiGenerated ?? post.isAiGenerated;
  const media = post.media && post.media.length > 0 ? post.media[0] : null;

  const username = activeAccount?.username || 'your_channel';
  const displayName = activeAccount?.displayName || 'Your Channel';
  const avatar =
    activeAccount?.avatarUrl ||
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><rect width="100%" height="100%" fill="%2310b981"/><text x="50%" y="54%" font-size="24" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">PB</text></svg>';

  return (
    <div className="w-full max-w-sm mx-auto select-none font-sans">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-gray-500">
          <PlatformLogo platform={selectedPlatform} className="w-3.5 h-3.5" />
          <span>{PLATFORM_CONFIGS[selectedPlatform]?.name} Preview</span>
        </div>
        {previewType && (
          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {previewType}
          </span>
        )}
      </div>

      {/* INSTAGRAM PREVIEW (Matching Screenshot 1) */}
      {selectedPlatform === 'instagram' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <img src={avatar} alt={username} className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-200" />
              <div>
                <div className="text-xs font-bold text-gray-900 leading-tight">{username}</div>
                <div className="text-[10px] text-gray-400">Sponsored • Audio</div>
              </div>
            </div>
            <MoreHorizontal className="w-4 h-4 text-gray-400" />
          </div>

          {/* Media View */}
          <div className="relative bg-gray-100 aspect-square flex items-center justify-center overflow-hidden">
            {media ? (
              media.type === 'video' ? (
                <div className="relative w-full h-full bg-black flex items-center justify-center">
                  <img src={media.thumbnailUrl || media.url} alt="video thumb" className="w-full h-full object-cover opacity-90" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-xs">
                      ▶
                    </div>
                  </div>
                </div>
              ) : (
                <img src={media.url} alt="Instagram Media" className="w-full h-full object-cover" />
              )
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-400 text-xs">
                <div className="w-12 h-12 rounded-xl border border-dashed border-gray-300 flex items-center justify-center mb-2">
                  📷
                </div>
                <span>No media attached</span>
              </div>
            )}
          </div>

          {/* Action Icons */}
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3 text-gray-700">
                <Heart className="w-5 h-5 hover:text-rose-500 cursor-pointer" />
                <MessageCircle className="w-5 h-5 cursor-pointer" />
                <Send className="w-5 h-5 cursor-pointer" />
              </div>
              <Bookmark className="w-5 h-5 text-gray-700 cursor-pointer" />
            </div>

            <div className="text-xs font-bold text-gray-900 mb-1">1,492 likes</div>

            {/* Caption */}
            <div className="text-xs text-gray-800 leading-snug break-words">
              <strong className="font-semibold mr-1.5">{username}</strong>
              <span className="whitespace-pre-line">{caption}</span>
            </div>

            {/* AI Generated label if enabled */}
            {isAiGenerated && (
              <div className="mt-2 flex items-center space-x-1 text-[10px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded w-max">
                <Sparkles className="w-3 h-3" />
                <span>AI-generated content disclosure</span>
              </div>
            )}

            {/* First Comment Preview */}
            {firstComment && (
              <div className="mt-2 pt-2 border-t border-gray-100 text-[11px] text-gray-600">
                <span className="font-semibold text-gray-800 mr-1.5">{username}</span>
                <span className="text-gray-500">[First Comment]</span> {firstComment}
              </div>
            )}

            <div className="text-[10px] text-gray-400 mt-2 uppercase tracking-wider">Just now</div>
          </div>
        </div>
      )}

      {/* X / TWITTER PREVIEW */}
      {selectedPlatform === 'twitter' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="flex space-x-3">
            <img src={avatar} alt={username} className="w-10 h-10 rounded-full object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1 text-xs leading-none">
                <span className="font-bold text-gray-900 truncate">{displayName}</span>
                <span className="text-blue-500 font-bold">✓</span>
                <span className="text-gray-400 truncate">@{username}</span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-400">now</span>
              </div>

              {/* Text */}
              <div className="text-xs text-gray-900 mt-2 whitespace-pre-line leading-relaxed break-words">
                {caption}
              </div>

              {/* Media */}
              {media && (
                <div className="mt-3 rounded-xl overflow-hidden border border-gray-100 aspect-video bg-black/5">
                  <img src={media.thumbnailUrl || media.url} alt="Tweet media" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between text-gray-400 text-xs mt-3 pt-2">
                <div className="flex items-center space-x-1 hover:text-blue-500 cursor-pointer">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>24</span>
                </div>
                <div className="flex items-center space-x-1 hover:text-emerald-500 cursor-pointer">
                  <Repeat2 className="w-3.5 h-3.5" />
                  <span>12</span>
                </div>
                <div className="flex items-center space-x-1 hover:text-rose-500 cursor-pointer">
                  <Heart className="w-3.5 h-3.5" />
                  <span>189</span>
                </div>
                <div className="flex items-center space-x-1 hover:text-blue-500 cursor-pointer">
                  <Share2 className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LINKEDIN PREVIEW */}
      {selectedPlatform === 'linkedin' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2.5">
              <img src={avatar} alt={username} className="w-10 h-10 rounded-full object-cover" />
              <div>
                <div className="text-xs font-bold text-gray-900">{displayName}</div>
                <div className="text-[10px] text-gray-400">Growth Marketer & Founder • 1st</div>
                <div className="text-[10px] text-gray-400">Just now • 🌐</div>
              </div>
            </div>
            <MoreHorizontal className="w-4 h-4 text-gray-400" />
          </div>

          <div className="text-xs text-gray-900 mt-3 whitespace-pre-line leading-relaxed break-words">
            {caption}
          </div>

          {media && (
            <div className="mt-3 rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
              <img src={media.thumbnailUrl || media.url} alt="LinkedIn media" className="w-full object-cover max-h-64" />
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-gray-400 mt-3 pt-2 border-t border-gray-100">
            <div className="flex items-center space-x-1">
              <span>👍💡❤️ 84</span>
            </div>
            <span>19 comments • 4 reposts</span>
          </div>

          <div className="grid grid-cols-4 gap-1 mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600 text-center font-medium">
            <div className="flex items-center justify-center space-x-1 py-1 hover:bg-gray-50 rounded">
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>Like</span>
            </div>
            <div className="flex items-center justify-center space-x-1 py-1 hover:bg-gray-50 rounded">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Comment</span>
            </div>
            <div className="flex items-center justify-center space-x-1 py-1 hover:bg-gray-50 rounded">
              <Repeat2 className="w-3.5 h-3.5" />
              <span>Repost</span>
            </div>
            <div className="flex items-center justify-center space-x-1 py-1 hover:bg-gray-50 rounded">
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </div>
          </div>
        </div>
      )}

      {/* YOUTUBE SHORTS / TIKTOK PREVIEW */}
      {(selectedPlatform === 'tiktok' || selectedPlatform === 'youtube') && (
        <div className="relative bg-black rounded-3xl overflow-hidden aspect-[9/16] text-white shadow-lg border border-gray-800">
          {media ? (
            <img src={media.thumbnailUrl || media.url} alt="Vertical Reel" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 text-xs p-4 text-center">
              <span>9:16 Vertical video preview</span>
            </div>
          )}

          {/* Right Floating Actions */}
          <div className="absolute right-3 bottom-16 flex flex-col items-center space-y-4 text-white">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center">
                <Heart className="w-5 h-5 fill-white text-white" />
              </div>
              <span className="text-[10px] font-semibold mt-1">42.8k</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-semibold mt-1">812</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center">
                <Bookmark className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-semibold mt-1">3.4k</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center">
                <Share2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-semibold mt-1">Share</span>
            </div>
          </div>

          {/* Bottom Caption Overlay */}
          <div className="absolute bottom-4 left-4 right-16 text-white text-xs space-y-1">
            <div className="font-bold flex items-center space-x-1">
              <span>@{username}</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">Follow</span>
            </div>
            <div className="line-clamp-2 text-[11px] text-gray-200">{caption}</div>
            <div className="text-[10px] text-gray-300 flex items-center space-x-1">
              <span>🎵 Original Audio - {displayName}</span>
            </div>
          </div>
        </div>
      )}

      {/* FACEBOOK PREVIEW (Exact match to uploaded design) */}
      {selectedPlatform === 'facebook' && (
        <div className="bg-[#242427] rounded-2xl border border-[#2f2f35] p-4 text-white shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2.5">
              <img
                src={avatar}
                alt={displayName}
                className="w-10 h-10 rounded-xl object-cover border border-white/10"
              />
              <div>
                <div className="text-xs font-bold text-white leading-tight">{displayName}</div>
                <div className="text-[11px] text-gray-400 flex items-center space-x-1 mt-0.5">
                  <span>Just Now</span>
                  <span>·</span>
                  <Globe className="w-3 h-3 text-gray-400" />
                </div>
              </div>
            </div>
            <MoreHorizontal className="w-4 h-4 text-gray-400 cursor-pointer hover:text-white" />
          </div>

          {caption && caption !== 'Your post caption preview will appear here...' && (
            <div className="text-xs text-gray-100 whitespace-pre-line leading-relaxed mb-3 break-words">
              {caption}
            </div>
          )}

          {media ? (
            <div className="rounded-xl overflow-hidden border border-[#33333a] bg-black/60 mb-3">
              {media.type === 'video' ? (
                <video src={media.url} className="w-full object-cover max-h-[380px]" controls />
              ) : (
                <img
                  src={media.thumbnailUrl || media.url}
                  alt="Facebook Post Media"
                  className="w-full object-cover max-h-[420px]"
                />
              )}
            </div>
          ) : (
            <div className="h-44 rounded-xl border border-dashed border-gray-700/60 bg-black/20 flex flex-col items-center justify-center text-gray-500 text-xs mb-3">
              <span>Attach an image or video to preview media</span>
            </div>
          )}

          <div className="grid grid-cols-3 pt-2.5 border-t border-[#33333a] text-xs text-gray-400 font-medium">
            <div className="flex items-center justify-center space-x-1.5 py-1.5 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>Like</span>
            </div>
            <div className="flex items-center justify-center space-x-1.5 py-1.5 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Comment</span>
            </div>
            <div className="flex items-center justify-center space-x-1.5 py-1.5 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </div>
          </div>
        </div>
      )}

      {/* THREADS / BLUESKY / PINTEREST PREVIEW */}
      {(selectedPlatform === 'threads' || selectedPlatform === 'bluesky' || selectedPlatform === 'pinterest') && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center space-x-2.5 mb-2.5">
            <img src={avatar} alt={username} className="w-9 h-9 rounded-full object-cover" />
            <div>
              <div className="text-xs font-bold text-gray-900">{displayName}</div>
              <div className="text-[10px] text-gray-400">@{username} • Just now</div>
            </div>
          </div>

          <div className="text-xs text-gray-900 whitespace-pre-line leading-relaxed mb-3">
            {caption}
          </div>

          {media && (
            <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
              <img src={media.thumbnailUrl || media.url} alt="Media" className="w-full object-cover max-h-60" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
