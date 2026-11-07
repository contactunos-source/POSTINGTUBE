'use client';

import React, { useState, useMemo } from 'react';
import { Post, SocialAccount, PlatformCaptionOverride } from '@/types/social';
import {
  Sparkles,
  Copy,
  Check,
  Globe,
  Tag,
  Hash,
  Video,
  FileText,
  UserCheck,
  Shield,
  Layers,
} from 'lucide-react';
import { PlatformLogo } from './SocialIcons';

interface PostPlatformCaptionsViewProps {
  post: Post;
  accounts: SocialAccount[];
}

export const PostPlatformCaptionsView: React.FC<PostPlatformCaptionsViewProps> = ({
  post,
  accounts,
}) => {
  // Resolve accounts targeted by this post
  const targetedAccounts = useMemo(() => {
    const list: SocialAccount[] = [];
    const seen = new Set<string>();

    // 1. From targetAccountIds
    if (Array.isArray(post.targetAccountIds)) {
      post.targetAccountIds.forEach((accId) => {
        const found = accounts.find((a) => a.id === accId);
        if (found && !seen.has(found.id)) {
          seen.add(found.id);
          list.push(found);
        }
      });
    }

    // 2. From results map
    if (post.results) {
      Object.keys(post.results).forEach((accId) => {
        const found = accounts.find((a) => a.id === accId);
        if (found && !seen.has(found.id)) {
          seen.add(found.id);
          list.push(found);
        }
      });
    }

    // 3. From overrides
    if (post.accountOverrides) {
      Object.keys(post.accountOverrides).forEach((accId) => {
        const found = accounts.find((a) => a.id === accId);
        if (found && !seen.has(found.id)) {
          seen.add(found.id);
          list.push(found);
        }
      });
    }

    return list;
  }, [post, accounts]);

  // Selected tab (account ID or 'main')
  const [selectedTab, setSelectedTab] = useState<string>(() => {
    if (targetedAccounts.length > 0) return targetedAccounts[0].id;
    return 'main';
  });

  const [copied, setCopied] = useState(false);

  // Platform icon helper
  const getPlatformIcon = (platform: string, className = 'w-4 h-4') => {
    return <PlatformLogo platform={platform as any} className={className} />;
  };

  // Find active account & override
  const activeAccount = targetedAccounts.find((a) => a.id === selectedTab);
  const activeOverride: PlatformCaptionOverride | undefined = useMemo(() => {
    if (!activeAccount) return undefined;
    return (
      post.accountOverrides?.[activeAccount.id] ||
      post.platformOverrides?.[activeAccount.id] ||
      post.platformOverrides?.[activeAccount.platform]
    );
  }, [activeAccount, post]);

  // Compute effective caption for active tab
  const effectiveCaption = useMemo(() => {
    if (selectedTab === 'main') {
      return post.content?.trim() || '';
    }
    const overrideText = activeOverride?.caption?.trim();
    if (overrideText) return overrideText;
    return post.content?.trim() || '';
  }, [selectedTab, activeOverride, post.content]);

  // Compute effective YouTube title
  const effectiveTitle = useMemo(() => {
    if (!activeAccount || activeAccount.platform !== 'youtube') return null;
    return (
      activeOverride?.title?.trim() ||
      (post.content ? post.content.split('\n')[0].trim() : '') ||
      'Scheduled Video'
    );
  }, [activeAccount, activeOverride, post.content]);

  // Tags / Hashtags
  const effectiveTags = useMemo(() => {
    const list: string[] = [];
    if (Array.isArray(activeOverride?.tags) && activeOverride.tags.length > 0) {
      list.push(...activeOverride.tags);
    } else if (Array.isArray(post.tags) && post.tags.length > 0) {
      list.push(...post.tags);
    }
    return Array.from(new Set(list));
  }, [activeOverride, post.tags]);

  // AI Generated check
  const isAi = Boolean(activeOverride?.isAiGenerated ?? post.isAiGenerated);

  const handleCopy = () => {
    const textToCopy =
      activeAccount?.platform === 'youtube' && effectiveTitle
        ? `${effectiveTitle}\n\n${effectiveCaption}`
        : effectiveCaption || post.content;

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-3">
      {/* Platform Selector Tabs */}
      {targetedAccounts.length > 1 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5 text-gray-400" />
              <span>Platform-Specific Captions</span>
            </span>
            <span className="text-[11px] text-gray-400">
              {targetedAccounts.length} channels configured
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {targetedAccounts.map((acc) => {
              const isSelected = selectedTab === acc.id;
              const hasCustomOverride = Boolean(
                post.accountOverrides?.[acc.id]?.caption ||
                post.platformOverrides?.[acc.platform]?.caption ||
                post.accountOverrides?.[acc.id]?.title
              );
              const publishResult = post.results?.[acc.id];
              const isSuccess = publishResult?.status === 'success';
              const isFailed = publishResult?.status === 'failed';

              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setSelectedTab(acc.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer border ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  {getPlatformIcon(acc.platform, 'w-3.5 h-3.5')}
                  <span className="truncate max-w-[130px] font-medium">
                    {acc.displayName || acc.username}
                  </span>
                  {hasCustomOverride && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Custom caption configured" />
                  )}
                  {isSuccess && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" title="Published" />
                  )}
                  {isFailed && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" title="Failed" />
                  )}
                </button>
              );
            })}

            {/* General/Main Tab */}
            <button
              type="button"
              onClick={() => setSelectedTab('main')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer border ${
                selectedTab === 'main'
                  ? 'bg-gray-800 text-white border-gray-800 shadow-2xs'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Base Caption</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Box for Selected Channel */}
      <div className="bg-gray-50 border border-gray-200/90 rounded-2xl p-4 space-y-3 shadow-2xs">
        {/* Channel & AI Header Banner */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-200/70 gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            {activeAccount ? (
              <>
                <div className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                  {getPlatformIcon(activeAccount.platform, 'w-3.5 h-3.5')}
                </div>
                <div className="truncate">
                  <span className="text-xs font-bold text-gray-900 block truncate">
                    {activeAccount.displayName || activeAccount.username}
                  </span>
                  <span className="text-[10px] text-gray-500 capitalize">
                    {activeAccount.platform} · {activeOverride?.postType || post.postType}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-gray-600" />
                <span className="text-xs font-bold text-gray-900">Base Post Caption</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* AI Generated Tag */}
            {isAi && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center space-x-1 shadow-2xs">
                <Sparkles className="w-3 h-3 text-purple-600" />
                <span>AI Enhanced</span>
              </span>
            )}

            {/* Copy Button */}
            {(effectiveCaption || effectiveTitle) && (
              <button
                type="button"
                onClick={handleCopy}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors flex items-center space-x-1 cursor-pointer shadow-2xs"
                title="Copy caption"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-gray-500" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* 1. YouTube Specific Title Field */}
        {activeAccount?.platform === 'youtube' && effectiveTitle && (
          <div className="space-y-1 bg-white p-3 rounded-xl border border-gray-200/80">
            <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block flex items-center space-x-1">
              <PlatformLogo platform="youtube" className="w-3 h-3" />
              <span>YouTube Video Title</span>
            </span>
            <p className="text-xs font-bold text-gray-900 leading-snug">
              {effectiveTitle}
            </p>
          </div>
        )}

        {/* 2. Caption Text */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
            {activeAccount?.platform === 'youtube' ? 'Video Description' : 'Post Caption'}
          </span>
          {effectiveCaption ? (
            <div className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap font-normal max-h-48 overflow-y-auto bg-white p-3 rounded-xl border border-gray-200/80">
              {effectiveCaption}
            </div>
          ) : (
            <div className="text-xs italic text-gray-400 bg-white p-3 rounded-xl border border-dashed border-gray-200">
              (No custom caption provided for this channel)
            </div>
          )}
        </div>

        {/* 3. Platform Metadata (YouTube category, privacy, kid-safety, IG collaborator) */}
        {activeAccount?.platform === 'youtube' && activeOverride && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-gray-600">
            {activeOverride.privacyStatus && (
              <span className="px-2 py-0.5 rounded-md bg-gray-100 font-semibold capitalize flex items-center space-x-1">
                <Shield className="w-3 h-3 text-gray-500" />
                <span>{activeOverride.privacyStatus}</span>
              </span>
            )}
            {activeOverride.madeForKids !== undefined && (
              <span className="px-2 py-0.5 rounded-md bg-gray-100 font-semibold">
                {activeOverride.madeForKids ? 'Made for Kids: Yes' : 'Not Made for Kids'}
              </span>
            )}
            {activeOverride.postType && (
              <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 font-semibold uppercase">
                {activeOverride.postType}
              </span>
            )}
          </div>
        )}

        {/* Instagram Collaborator if set */}
        {activeAccount?.platform === 'instagram' && activeOverride?.collaborator && (
          <div className="flex items-center space-x-1.5 text-xs text-pink-700 bg-pink-50 p-2 rounded-lg border border-pink-100">
            <UserCheck className="w-3.5 h-3.5 text-pink-600 shrink-0" />
            <span>Collaborator: <strong>@{activeOverride.collaborator.replace(/^@/, '')}</strong></span>
          </div>
        )}

        {/* 4. Tags / Hashtags Pills */}
        {effectiveTags.length > 0 && (
          <div className="space-y-1 pt-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block flex items-center space-x-1">
              <Hash className="w-3 h-3" />
              <span>Tags & Hashtags ({effectiveTags.length})</span>
            </span>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {effectiveTags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-medium"
                >
                  #{tag.replace(/^#/, '')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
