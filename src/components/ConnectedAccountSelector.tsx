'use client';

import React, { useState } from 'react';
import { SocialAccount } from '@/types/social';
import { PlatformLogo } from './SocialIcons';
import { Plus } from 'lucide-react';

export const isPlatformSupportedForPostType = (platform: string, type: 'image' | 'video' | 'text' = 'image'): boolean => {
  if (platform === 'youtube') {
    // YouTube supports Shorts only in current publishing workflow
    return type === 'video';
  }
  if (platform === 'instagram') {
    // Instagram supports image and video (posts, reels, stories), but NOT text
    return type === 'image' || type === 'video';
  }
  // Facebook, LinkedIn, Threads, Pinterest support image, video, and text
  return true;
};

export const getPlatformUnsupportedReason = (platform: string, type: 'image' | 'video' | 'text' = 'image'): string => {
  if (platform === 'youtube') {
    if (type === 'image') return 'Image posts are not supported on YouTube (Shorts only)';
    if (type === 'text') return 'Text posts are not supported on YouTube (Shorts only)';
    return 'YouTube supports Shorts only';
  }
  if (platform === 'instagram' && type === 'text') {
    return 'Text posts are not supported on Instagram';
  }
  return 'Not supported for this format';
};

interface ConnectedAccountSelectorProps {
  accounts: SocialAccount[];
  selectedAccountIds: string[];
  postType?: 'image' | 'video' | 'text';
  monthlyUsageByAccount?: Record<string, { usedCount: number; limit: number; remaining: number }>;
  onToggleAccount: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onGoToConnections?: () => void;
  onShowNotice?: (msg: string) => void;
}

export const ConnectedAccountSelector: React.FC<ConnectedAccountSelectorProps> = ({
  accounts,
  selectedAccountIds,
  postType = 'image',
  monthlyUsageByAccount,
  onToggleAccount,
  onSelectAll,
  onClearAll,
  onGoToConnections,
  onShowNotice,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const activeSelectedCount = accounts.filter(
    (a) => isPlatformSupportedForPostType(a.platform, postType) && selectedAccountIds.includes(a.id)
  ).length;

  const handleAccountClick = (account: SocialAccount) => {
    const isSupported = isPlatformSupportedForPostType(account.platform, postType);
    if (!isSupported) {
      if (onShowNotice) {
        onShowNotice(getPlatformUnsupportedReason(account.platform, postType));
      }
      return;
    }
    onToggleAccount(account.id);
  };

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-gray-900 uppercase tracking-wider block">
            Publishing to Accounts
          </span>
          <span className="text-[11px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
            {activeSelectedCount} of {accounts.length} selected
          </span>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <button
            type="button"
            onClick={onSelectAll}
            className="text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer transition-colors"
          >
            Select All
          </button>
          <span className="text-gray-300">•</span>
          <button
            type="button"
            onClick={onClearAll}
            className="text-gray-400 hover:text-gray-600 font-medium cursor-pointer transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Row of Circular Accounts */}
      <div className="flex items-center flex-wrap gap-3.5 sm:gap-4 py-2">
        {accounts.map((account) => {
          const isSupported = isPlatformSupportedForPostType(account.platform, postType);
          const isSelected = isSupported && selectedAccountIds.includes(account.id);
          const isHovered = hoveredId === account.id;
          const unsupportedReason = getPlatformUnsupportedReason(account.platform, postType);

          return (
            <div
              key={account.id}
              className="relative inline-block"
              onMouseEnter={() => setHoveredId(account.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Circular Account Avatar Button */}
              <button
                type="button"
                onClick={() => handleAccountClick(account)}
                className={`relative w-12 h-12 rounded-full transition-all duration-150 focus:outline-none select-none flex items-center justify-center ${
                  !isSupported
                    ? 'opacity-25 grayscale cursor-not-allowed ring-1 ring-gray-200'
                    : isSelected
                    ? 'ring-[2.5px] ring-emerald-400 ring-offset-2 ring-offset-white shadow-sm scale-105 cursor-pointer'
                    : 'grayscale opacity-40 hover:opacity-85 hover:grayscale-0 hover:scale-102 cursor-pointer'
                }`}
                title={!isSupported ? unsupportedReason : (account.displayName || account.username)}
              >
                {/* Platform Badge Overlay (Top-Left) */}
                <div className="absolute -top-1 -left-1 w-4.5 h-4.5 rounded-full bg-white shadow-sm border border-gray-200/90 flex items-center justify-center z-10">
                  <PlatformLogo platform={account.platform} className="w-2.5 h-2.5 text-gray-800" />
                </div>

                {/* Profile Image Avatar */}
                {account.avatarUrl ? (
                  <img
                    src={account.avatarUrl}
                    alt={account.displayName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full rounded-full object-cover bg-gray-100"
                    onError={(e) => {
                      // Fallback if image link fails or expired
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(account.displayName || account.username || 'A')}&background=059669&color=fff&size=128&bold=true`;
                    }}
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs uppercase shadow-inner">
                    {(account.displayName || account.username || 'A').slice(0, 2)}
                  </div>
                )}
              </button>

              {/* Exact Dark Tooltip on Hover */}
              {isHovered && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                  {/* Caret arrow pointing up */}
                  <div className="w-2 h-2 bg-[#222b35] rotate-45 mx-auto -mb-1 shadow-xs" />
                  {/* Tooltip Content */}
                  <div className="bg-[#222b35] text-white text-[11px] font-semibold px-3 py-2 rounded-xl shadow-xl text-center space-y-1 w-max max-w-[220px] whitespace-normal leading-snug">
                    <div className="font-bold">{account.displayName || `@${account.username}`}</div>
                    {!isSupported ? (
                      <div className="text-[10px] text-amber-300 font-medium">
                        {unsupportedReason}
                      </div>
                    ) : (
                      (() => {
                        const usage = monthlyUsageByAccount?.[account.id];
                        if (!usage || usage.limit <= 0) return null;
                        const isReached = usage.usedCount >= usage.limit;
                        return (
                          <div className={`text-[10px] font-normal ${isReached ? 'text-amber-300 font-bold' : 'text-gray-300'}`}>
                            {isReached
                              ? `Monthly limit reached (${usage.usedCount}/${usage.limit})`
                              : `${usage.usedCount}/${usage.limit} posts used this month (${usage.remaining} left)`}
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Optional Add / Connect More Channels Button */}
        {onGoToConnections && (
          <button
            type="button"
            onClick={onGoToConnections}
            className="w-12 h-12 rounded-full border-2 border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50/40 text-gray-400 hover:text-emerald-600 flex items-center justify-center transition-all cursor-pointer group shrink-0"
            title="Connect another social account"
          >
            <Plus className="w-5 h-5 transition-transform group-hover:scale-110" />
          </button>
        )}
      </div>
    </div>
  );
};
