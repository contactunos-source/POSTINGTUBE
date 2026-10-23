'use client';

import React, { useState } from 'react';
import { SocialAccount } from '@/types/social';
import { PlatformLogo } from './SocialIcons';
import { Plus } from 'lucide-react';

interface ConnectedAccountSelectorProps {
  accounts: SocialAccount[];
  selectedAccountIds: string[];
  onToggleAccount: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onGoToConnections?: () => void;
}

export const ConnectedAccountSelector: React.FC<ConnectedAccountSelectorProps> = ({
  accounts,
  selectedAccountIds,
  onToggleAccount,
  onSelectAll,
  onClearAll,
  onGoToConnections,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-gray-900 uppercase tracking-wider block">
            Publishing to Accounts
          </span>
          <span className="text-[11px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
            {selectedAccountIds.length} of {accounts.length} selected
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

      {/* Row of Circular Accounts (matching exact UI screenshot) */}
      <div className="flex items-center flex-wrap gap-3.5 sm:gap-4 py-2">
        {accounts.map((account) => {
          const isSelected = selectedAccountIds.includes(account.id);
          const isHovered = hoveredId === account.id;

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
                onClick={() => onToggleAccount(account.id)}
                className={`relative w-12 h-12 rounded-full transition-all duration-150 cursor-pointer focus:outline-none select-none flex items-center justify-center ${
                  isSelected
                    ? 'ring-[2.5px] ring-emerald-400 ring-offset-2 ring-offset-white shadow-sm scale-105'
                    : 'grayscale opacity-40 hover:opacity-85 hover:grayscale-0 hover:scale-102'
                }`}
                title={account.displayName || account.username}
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
                    className="w-full h-full rounded-full object-cover bg-gray-100"
                    onError={(e) => {
                      // Fallback if image link fails
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-xs uppercase">
                    {(account.displayName || account.username || 'A').slice(0, 1)}
                  </div>
                )}
              </button>

              {/* Exact Dark Tooltip on Hover (like 'Jack Fox' in the screenshot) */}
              {isHovered && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                  {/* Caret arrow pointing up */}
                  <div className="w-2 h-2 bg-[#222b35] rotate-45 mx-auto -mb-1 shadow-xs" />
                  {/* Tooltip Content */}
                  <div className="bg-[#222b35] text-white text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-xl whitespace-nowrap">
                    {account.displayName || `@${account.username}`}
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
