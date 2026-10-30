'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Calendar,
  Grid,
  Link2,
  Settings,
  ChevronDown,
  BarChart3,
  X,
  Zap,
  LogOut,
  Building2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { SocialAccount } from '@/types/social';
import { UserAvatar } from './UserAvatar';
import { PlatformLogo } from './SocialIcons';
import { PostingTubeLogo } from './PostingTubeLogo';
import { useClickOutside } from '@/hooks/useClickOutside';
import { signOutUser } from '@/lib/supabase';
import { UpgradePlanModal } from './UpgradePlanModal';

export type ActiveTab =
  | 'new-post'
  | 'create-composer'
  | 'calendar'
  | 'posts-all'
  | 'posts-scheduled'
  | 'posts-posted'
  | 'posts-drafts'
  | 'posts-failed'
  | 'connections'
  | 'analytics'
  | 'insights'
  | 'settings'
  | 'worker-console';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  openCreateModal: () => void;
  scheduledCount: number;
  draftCount: number;
  failedCount: number;
  totalPostsCount?: number;
  authUser?: any;
  accounts?: SocialAccount[];
  workspaceId?: string;
  selectedInsightsAccountId?: string;
  onSelectInsightsAccount?: (accountId: string) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onLogoClick?: () => void;
  onUpgradeClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  openCreateModal,
  scheduledCount,
  draftCount,
  failedCount,
  totalPostsCount = 0,
  authUser,
  accounts = [],
  workspaceId,
  selectedInsightsAccountId = 'all',
  onSelectInsightsAccount,
  isMobileOpen = false,
  onCloseMobile,
  onLogoClick,
  onUpgradeClick,
}) => {
  const connectedAccounts = accounts.filter((a) => a.status === 'connected' || !a.status);
  const displayName =
    authUser?.user_metadata?.full_name ||
    authUser?.user_metadata?.name ||
    authUser?.email?.split('@')[0] ||
    'Creator';
  const displaySub = authUser?.email || 'Creator Account';
  const avatarUrl = authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.picture;

  // Profile Popover & Upgrade Modal States
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileTriggerRef = useRef<HTMLDivElement>(null);

  // Close profile menu on outside click or Escape key
  useClickOutside(profileMenuRef, () => setIsProfileMenuOpen(false), {
    enabled: isProfileMenuOpen,
    ignoreRefs: [profileTriggerRef],
  });

  // Dynamic user profile & subscription data from Supabase
  const [profileData, setProfileData] = useState({
    fullName: displayName,
    email: authUser?.email || '',
    avatarUrl: avatarUrl || '',
    organizationName: 'My organization',
    planName: 'Free plan',
    planTier: 'Free',
    planStatus: 'active',
    channelsCount: connectedAccounts.length,
  });

  // Fetch verified profile, organization & subscription details from Supabase
  useEffect(() => {
    if (!authUser?.id && !authUser?.email) return;

    const email = authUser.email || '';
    const userId = authUser.id || '';

    fetch(
      `/api/user/profile-menu?userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(
        email
      )}&workspaceId=${encodeURIComponent(workspaceId || '')}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.profile) {
          setProfileData((prev) => ({
            ...prev,
            ...data.profile,
            channelsCount:
              connectedAccounts.length > 0
                ? connectedAccounts.length
                : data.profile.channelsCount || 0,
          }));
        }
      })
      .catch((e) => console.warn('[ProfileMenu] Notice fetching dynamic profile:', e));
  }, [authUser?.id, authUser?.email, workspaceId, connectedAccounts.length]);

  const effectiveChannelsCount =
    connectedAccounts.length > 0 ? connectedAccounts.length : profileData.channelsCount || 0;

  const handleTabClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsProfileMenuOpen(false);
    onCloseMobile?.();
  };

  const handleOpenUpgrade = () => {
    setIsProfileMenuOpen(false);
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      setIsUpgradeModalOpen(true);
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs transition-opacity animate-in fade-in"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 sm:w-80 lg:w-64 bg-white border-r border-gray-200 flex flex-col h-screen select-none shrink-0 font-sans transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <PostingTubeLogo
            size="md"
            href="/dashboard"
            onClick={(e) => {
              if (onLogoClick) {
                e.preventDefault();
                onLogoClick();
                onCloseMobile?.();
              }
            }}
            className="cursor-pointer"
          />
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer shrink-0 ml-1"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 text-sm">
          {/* Create */}
          <div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">
              Create
            </div>
            <nav className="space-y-0.5">
              <button
                onClick={() => handleTabClick('new-post')}
                className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'new-post' || activeTab === 'create-composer'
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>New post</span>
              </button>
            </nav>
          </div>

          {/* Posts */}
          <div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">
              Publishing
            </div>
            <nav className="space-y-0.5">
              <button
                onClick={() => handleTabClick('posts-all')}
                className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeTab.startsWith('posts-')
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Grid className="w-4 h-4" />
                <span>Posts</span>
              </button>
              <button
                onClick={() => handleTabClick('calendar')}
                className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'calendar'
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Calendar</span>
              </button>
            </nav>
          </div>

          {/* Insights Section */}
          <div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  handleTabClick('insights');
                  if (onSelectInsightsAccount) onSelectInsightsAccount('all');
                }}
                className={`text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer text-left ${
                  activeTab === 'insights' && (!selectedInsightsAccountId || selectedInsightsAccountId === 'all')
                    ? 'text-emerald-700 font-bold'
                    : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                Insights
              </button>
            </div>
            <nav className="space-y-0.5">
              {/* List of Connected Social Accounts */}
              {connectedAccounts.map((acc) => {
                const isSelected = activeTab === 'insights' && selectedInsightsAccountId === acc.id;
                return (
                  <button
                    key={acc.id}
                    onClick={() => {
                      handleTabClick('insights');
                      if (onSelectInsightsAccount) onSelectInsightsAccount(acc.id);
                    }}
                    className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 pl-4 rounded-lg text-xs font-medium transition-colors truncate cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-700 font-semibold'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                    title={acc.displayName || acc.username}
                  >
                    <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0">
                      <PlatformLogo platform={acc.platform} className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">{acc.displayName || acc.username}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Configuration */}
          <div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">
              Configuration
            </div>
            <nav className="space-y-0.5">
              <button
                onClick={() => handleTabClick('connections')}
                className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'connections'
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Link2 className="w-4 h-4" />
                <span>Connections</span>
              </button>
              <button
                onClick={() => handleTabClick('analytics')}
                className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Analytics</span>
              </button>
              <button
                onClick={() => handleTabClick('settings')}
                className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
            </nav>
          </div>
        </div>

        {/* User Profile & Organization Footer */}
        <div className="p-3 border-t border-gray-100 relative">
          {/* Smooth Profile Popover Menu (Matching Reference Image) */}
          {isProfileMenuOpen && (
            <div
              ref={profileMenuRef}
              className="absolute bottom-full left-2 right-2 mb-2 bg-[#18191b] border border-zinc-800 rounded-2xl shadow-2xl p-4 text-white z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 font-sans select-none"
            >
              {/* User Profile Picture, Name, and Gmail */}
              <div className="flex items-center space-x-3 pb-3 border-b border-zinc-800/80">
                <UserAvatar
                  name={profileData.fullName || displayName}
                  avatarUrl={profileData.avatarUrl || avatarUrl}
                  size="md"
                  className="ring-2 ring-emerald-500/30 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">
                    {profileData.fullName || displayName}
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                    {profileData.email || displaySub}
                  </div>
                </div>
              </div>

              {/* Organization & Subscription Status */}
              <div className="pt-3 pb-1">
                <div className="text-[11px] text-zinc-400 font-medium">Organization</div>
                <div className="text-sm font-bold text-white tracking-tight truncate mt-0.5">
                  {profileData.organizationName || 'My organization'}
                </div>
                <div className="text-xs text-zinc-400 mt-1 flex items-center space-x-1.5 font-medium">
                  <span className="text-zinc-300">{profileData.planName}</span>
                  <span>·</span>
                  <span>
                    {effectiveChannelsCount} {effectiveChannelsCount === 1 ? 'channel' : 'channels'}
                  </span>
                </div>
              </div>

              {/* Upgrade Plan Button (Matching Reference Design) */}
              <button
                type="button"
                onClick={handleOpenUpgrade}
                className="w-full mt-3 py-2.5 px-3.5 rounded-xl bg-[#2a2b2e] hover:bg-[#343539] active:bg-[#202123] text-white text-xs font-semibold flex items-center justify-center space-x-2 border border-[#3e4046] shadow-xs transition-all cursor-pointer group"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 group-hover:scale-110 transition-transform" />
                <span>Upgrade Plan</span>
              </button>

              {/* Secondary Navigation Links */}
              <div className="mt-3 pt-2 border-t border-zinc-800/80 space-y-0.5">
                <button
                  type="button"
                  onClick={() => handleTabClick('settings')}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Account Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTabClick('connections')}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Connected Channels</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setIsProfileMenuOpen(false);
                    await signOutUser();
                    window.location.href = '/login';
                  }}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}

          {/* User Profile Card Button */}
          <div
            ref={profileTriggerRef}
            onClick={() => setIsProfileMenuOpen((prev) => !prev)}
            className={`flex items-center justify-between p-1.5 rounded-lg transition-colors cursor-pointer ${
              isProfileMenuOpen ? 'bg-gray-100 ring-1 ring-gray-200' : 'hover:bg-gray-100'
            }`}
            title="Open Profile & Organization menu"
          >
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <UserAvatar
                name={profileData.fullName || displayName}
                avatarUrl={profileData.avatarUrl || avatarUrl}
                size="md"
                className="ring-1 ring-emerald-500/20"
              />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-gray-800 leading-tight truncate">
                  {profileData.fullName || displayName}
                </div>
                <div className="text-[10px] text-emerald-600 font-medium truncate">
                  {profileData.email || displaySub}
                </div>
              </div>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-gray-400 shrink-0 ml-1 transition-transform duration-200 ${
                isProfileMenuOpen ? 'rotate-180 text-emerald-600' : ''
              }`}
            />
          </div>
        </div>
      </aside>

      {/* Upgrade Plan In-App Modal */}
      <UpgradePlanModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        currentPlan={profileData.planTier}
        channelsCount={effectiveChannelsCount}
      />
    </>
  );
};
