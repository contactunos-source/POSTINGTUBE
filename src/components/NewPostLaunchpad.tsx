'use client';

import React from 'react';
import { Type, Image as ImageIcon, Video as VideoIcon, ArrowRight, Sparkles } from 'lucide-react';
import { PlatformLogo } from './SocialIcons';
import { SocialPlatform } from '@/types/social';

interface NewPostLaunchpadProps {
  onSelectType: (type: 'text' | 'image' | 'video') => void;
  onGoToConnections: () => void;
  connectedCount: number;
}

export const NewPostLaunchpad: React.FC<NewPostLaunchpadProps> = ({
  onSelectType,
  onGoToConnections,
  connectedCount,
}) => {
  const textPlatforms: SocialPlatform[] = ['bluesky', 'facebook', 'linkedin', 'threads', 'twitter'];
  const imagePlatforms: SocialPlatform[] = [
    'facebook',
    'linkedin',
    'threads',
    'twitter',
    'instagram',
    'pinterest',
    'tiktok',
  ];
  const videoPlatforms: SocialPlatform[] = [
    'facebook',
    'linkedin',
    'threads',
    'twitter',
    'instagram',
    'tiktok',
    'youtube',
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create a New Post</h1>
        <p className="text-sm text-gray-500 mt-1">
          Select post format to open the multi-platform composer with platform-specific custom rules.
        </p>
      </div>

      {/* 3 Main Choice Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Text Post */}
        <div
          onClick={() => onSelectType('text')}
          className="group relative flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed border-gray-200 rounded-2xl hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer text-center min-h-[260px]"
        >
          <div className="w-16 h-16 rounded-2xl bg-gray-50 group-hover:bg-emerald-50 flex items-center justify-center text-gray-400 group-hover:text-emerald-600 transition-colors mb-4">
            <Type className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-gray-800 group-hover:text-emerald-600 transition-colors">
            Text Post
          </h3>
          <p className="text-xs text-gray-400 mt-1 mb-6">Short updates, questions, links and thoughts</p>

          {/* Social logos strip */}
          <div className="flex items-center space-x-2 text-gray-400 group-hover:text-gray-600">
            {textPlatforms.map((p) => (
              <PlatformLogo key={p} platform={p} className="w-4 h-4" />
            ))}
          </div>
        </div>

        {/* Image Post */}
        <div
          onClick={() => onSelectType('image')}
          className="group relative flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed border-gray-200 rounded-2xl hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer text-center min-h-[260px]"
        >
          <div className="w-16 h-16 rounded-2xl bg-gray-50 group-hover:bg-emerald-50 flex items-center justify-center text-gray-400 group-hover:text-emerald-600 transition-colors mb-4">
            <ImageIcon className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-gray-800 group-hover:text-emerald-600 transition-colors">
            Image Post
          </h3>
          <p className="text-xs text-gray-400 mt-1 mb-6">Photos, graphics, infographics and carousels</p>

          <div className="flex items-center space-x-2 text-gray-400 group-hover:text-gray-600">
            {imagePlatforms.map((p) => (
              <PlatformLogo key={p} platform={p} className="w-4 h-4" />
            ))}
          </div>
        </div>

        {/* Video Post */}
        <div
          onClick={() => onSelectType('video')}
          className="group relative flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed border-gray-200 rounded-2xl hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer text-center min-h-[260px]"
        >
          <div className="w-16 h-16 rounded-2xl bg-gray-50 group-hover:bg-emerald-50 flex items-center justify-center text-gray-400 group-hover:text-emerald-600 transition-colors mb-4">
            <VideoIcon className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-gray-800 group-hover:text-emerald-600 transition-colors">
            Video Post
          </h3>
          <p className="text-xs text-gray-400 mt-1 mb-6">Reels, TikToks, Shorts and widescreen videos</p>

          <div className="flex items-center space-x-2 text-gray-400 group-hover:text-gray-600">
            {videoPlatforms.map((p) => (
              <PlatformLogo key={p} platform={p} className="w-4 h-4" />
            ))}
          </div>
        </div>
      </div>

      {/* Connection notice link */}
      <div className="mt-8 flex items-center justify-between p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
        <div className="flex items-center space-x-2 text-xs text-emerald-800">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {connectedCount === 0 ? (
              <span>No channels connected yet. Link your Facebook Page or social account to start publishing.</span>
            ) : (
              <span>
                You have <strong className="font-semibold">{connectedCount} social {connectedCount === 1 ? 'channel' : 'channels'}</strong> connected.
              </span>
            )}
          </span>
        </div>
        <button
          onClick={onGoToConnections}
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center space-x-1"
        >
          <span>{connectedCount === 0 ? 'Connect Facebook Page' : 'Manage accounts'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
