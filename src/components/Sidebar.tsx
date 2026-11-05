'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Calendar,
  Grid,
  Link2,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  X,
  Zap,
  LogOut,
  Building2,
  ShieldCheck,
  Sparkles,
  Home,
  MessageSquare,
  Layers,
  Share2,
  Folder,
  Plus,
  Minus,
  Pin,
  Archive,
  Star,
  Check,
  Sliders,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Clock,
  AlertTriangle,
  Compass,
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

  // Sidebar Modes: 'rail' (slim icon rail ~70px) vs 'expanded' (~270px)
  const [isRailMode, setIsRailMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pb_sidebar_rail');
      return saved === 'true';
    }
    return false;
  });

  // Secondary Flyout / Sub-panel toggle (Drafts, Folders, Status categories)
  const [isSubPanelOpen, setIsSubPanelOpen] = useState<boolean>(false);

  // Channels / Tree accordion state in primary menu
  const [isChannelsTreeExpanded, setIsChannelsTreeExpanded] = useState<boolean>(true);

  // Save rail mode preference
  const toggleRailMode = () => {
    setIsRailMode((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('pb_sidebar_rail', String(next));
      }
      return next;
    });
  };

  // Profile Popover & Upgrade Modal States
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileTriggerRef = useRef<HTMLDivElement>(null);

  // Close profile menu on outside click
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

      {/* Modern Multi-Tier Sidebar System */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen select-none shrink-0 font-sans transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* TIER 1: ICON RAIL (Sleek capsule design matching reference image) */}
        {isRailMode ? (
          <div className="w-[72px] bg-[#f2f3f5] border-r border-gray-200/90 flex flex-col justify-between py-4 px-2 items-center h-full">
            {/* Top: Sparkle / Expand Menu Button */}
            <div className="flex flex-col items-center space-y-4 w-full">
              <button
                type="button"
                onClick={toggleRailMode}
                className="w-10 h-10 rounded-2xl bg-white shadow-2xs border border-gray-200/80 flex items-center justify-center text-gray-900 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
                title="Expand Full Menu (✦)"
              >
                <Sparkles className="w-4 h-4 fill-gray-900 text-gray-900 group-hover:rotate-12 transition-transform" />
              </button>

              <div className="w-8 h-px bg-gray-200" />

              {/* Navigation Rail Icons */}
              <nav className="flex flex-col items-center space-y-2 w-full">
                {/* Home / New Post */}
                <button
                  type="button"
                  onClick={() => handleTabClick('new-post')}
                  className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                    activeTab === 'new-post' || activeTab === 'create-composer'
                      ? 'bg-gray-900 text-white shadow-xs'
                      : 'text-gray-600 hover:bg-white/80 hover:text-gray-900'
                  }`}
                  title="New Post / Home"
                >
                  <Home className="w-4 h-4" />
                </button>

                {/* Posts (with pink notification dot) */}
                <button
                  type="button"
                  onClick={() => handleTabClick('posts-all')}
                  className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                    activeTab.startsWith('posts-')
                      ? 'bg-gray-900 text-white shadow-xs'
                      : 'text-gray-600 hover:bg-white/80 hover:text-gray-900'
                  }`}
                  title={`Posts (${totalPostsCount})`}
                >
                  <FileText className="w-4 h-4" />
                  {draftCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#f2f3f5]" />
                  )}
                </button>

                {/* Calendar */}
                <button
                  type="button"
                  onClick={() => handleTabClick('calendar')}
                  className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                    activeTab === 'calendar'
                      ? 'bg-gray-900 text-white shadow-xs'
                      : 'text-gray-600 hover:bg-white/80 hover:text-gray-900'
                  }`}
                  title={`Calendar (${scheduledCount} scheduled)`}
                >
                  <Calendar className="w-4 h-4" />
                </button>

                {/* Integrations / Channels */}
                <button
                  type="button"
                  onClick={() => handleTabClick('connections')}
                  className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                    activeTab === 'connections'
                      ? 'bg-gray-900 text-white shadow-xs'
                      : 'text-gray-600 hover:bg-white/80 hover:text-gray-900'
                  }`}
                  title="Connected Channels & Integrations"
                >
                  <Layers className="w-4 h-4" />
                </button>

                {/* Analytics */}
                <button
                  type="button"
                  onClick={() => handleTabClick('analytics')}
                  className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                    activeTab === 'analytics' || activeTab === 'insights'
                      ? 'bg-gray-900 text-white shadow-xs'
                      : 'text-gray-600 hover:bg-white/80 hover:text-gray-900'
                  }`}
                  title="Analytics & Insights"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>

                {/* Thin vertical tree line */}
                <div className="w-px h-6 bg-gray-300 my-1" />

                {/* Sub-panel flyout toggle (Drafts / Folders) */}
                <button
                  type="button"
                  onClick={() => setIsSubPanelOpen(!isSubPanelOpen)}
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                    isSubPanelOpen
                      ? 'bg-white text-gray-900 shadow-2xs border border-gray-200'
                      : 'text-gray-500 hover:bg-white/80 hover:text-gray-800'
                  }`}
                  title="Toggle Content & Folders Sub-Panel"
                >
                  <Folder className="w-4 h-4" />
                </button>
              </nav>
            </div>

            {/* Bottom: Settings & User Profile Avatar */}
            <div className="flex flex-col items-center space-y-2 w-full pt-2">
              <button
                type="button"
                onClick={() => handleTabClick('settings')}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-white/80 hover:text-gray-900'
                }`}
                title="Account Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={toggleRailMode}
                className="w-10 h-10 rounded-2xl hover:bg-white/80 flex items-center justify-center transition-colors cursor-pointer"
                title="Open Profile & Full Menu"
              >
                <UserAvatar
                  name={profileData.fullName || displayName}
                  avatarUrl={profileData.avatarUrl || avatarUrl}
                  size="sm"
                  className="ring-1 ring-emerald-500/20"
                />
              </button>
            </div>
          </div>
        ) : (
          /* TIER 2: PRIMARY EXPANDED MENU (Matching Middle Section of User Reference Image) */
          <div className="w-64 sm:w-72 bg-[#f4f5f7] border-r border-gray-200/90 flex flex-col justify-between h-full">
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Header: ✦ Menu + Collapse to Rail Button */}
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-xl bg-white shadow-2xs border border-gray-200/80 flex items-center justify-center text-gray-900">
                    <Sparkles className="w-3.5 h-3.5 fill-gray-900 text-gray-900" />
                  </div>
                  <span className="text-sm font-bold text-gray-900 tracking-tight">Menu</span>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={toggleRailMode}
                    className="p-1.5 rounded-xl hover:bg-white/80 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                    title="Collapse to Slim Rail"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onCloseMobile}
                    className="lg:hidden p-1.5 rounded-xl hover:bg-white/80 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                    aria-label="Close menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Navigation Items (Matching Reference Styling: clean spacing, black pills, white pills) */}
              <nav className="space-y-1">
                {/* 1. Home / New Post */}
                <button
                  type="button"
                  onClick={() => handleTabClick('new-post')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'new-post' || activeTab === 'create-composer'
                      ? 'bg-gray-900 text-white shadow-xs'
                      : 'text-gray-700 hover:bg-gray-200/70 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Home className="w-4 h-4" />
                    <span>Home</span>
                  </div>
                </button>

                {/* 2. Messages / Posts (with badge number e.g. 2) */}
                <button
                  type="button"
                  onClick={() => {
                    handleTabClick('posts-all');
                    setIsSubPanelOpen(true);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab.startsWith('posts-')
                      ? 'bg-gray-900 text-white shadow-xs'
                      : 'text-gray-700 hover:bg-gray-200/70 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <FileText className="w-4 h-4" />
                      {draftCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500" />
                      )}
                    </div>
                    <span>Messages & Posts</span>
                  </div>
                  {totalPostsCount > 0 && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        activeTab.startsWith('posts-')
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-900 text-white'
                      }`}
                    >
                      {totalPostsCount}
                    </span>
                  )}
                </button>

                {/* 3. Integrations / Connected Channels (with + button) */}
                <button
                  type="button"
                  onClick={() => handleTabClick('connections')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'connections'
                      ? 'bg-gray-900 text-white shadow-xs'
                      : 'text-gray-700 hover:bg-gray-200/70 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Layers className="w-4 h-4" />
                    <span>Integrations</span>
                  </div>
                  <span className="text-gray-400 hover:text-gray-900 font-bold text-xs p-0.5 rounded-md">
                    +
                  </span>
                </button>

                {/* 4. Calendar */}
                <button
                  type="button"
                  onClick={() => handleTabClick('calendar')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'calendar'
                      ? 'bg-gray-900 text-white shadow-xs'
                      : 'text-gray-700 hover:bg-gray-200/70 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-4 h-4" />
                    <span>Calendar</span>
                  </div>
                  {scheduledCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {scheduledCount}
                    </span>
                  )}
                </button>

                {/* 5. Analytics & Insights */}
                <button
                  type="button"
                  onClick={() => {
                    handleTabClick('analytics');
                    if (onSelectInsightsAccount) onSelectInsightsAccount('all');
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'analytics' || (activeTab === 'insights' && (!selectedInsightsAccountId || selectedInsightsAccountId === 'all'))
                      ? 'bg-gray-900 text-white shadow-xs'
                      : 'text-gray-700 hover:bg-gray-200/70 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="w-4 h-4" />
                    <span>Finance & Analytics</span>
                  </div>
                </button>

                {/* 6. EXPANDABLE TREE: Channels / Workspace (Exact Black Pill Parent + Tree branch + White Pill sub-items) */}
                <div className="pt-2">
                  <div
                    onClick={() => setIsChannelsTreeExpanded(!isChannelsTreeExpanded)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-gray-900 text-white shadow-xs cursor-pointer select-none"
                  >
                    <div className="flex items-center space-x-3">
                      <Share2 className="w-4 h-4" />
                      <span>Channels</span>
                    </div>
                    <span className="text-white/80 font-mono text-xs">
                      {isChannelsTreeExpanded ? '—' : '+'}
                    </span>
                  </div>

                  {/* Connected channels sub-tree */}
                  {isChannelsTreeExpanded && (
                    <div className="mt-1.5 ml-4 pl-3.5 border-l-2 border-gray-300 space-y-1 animate-in fade-in duration-150">
                      {connectedAccounts.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => handleTabClick('connections')}
                          className="w-full text-left py-1.5 px-3 rounded-xl text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-200/60 transition-colors"
                        >
                          + Connect your first channel
                        </button>
                      ) : (
                        connectedAccounts.map((acc) => {
                          const isSelected =
                            activeTab === 'insights' && selectedInsightsAccountId === acc.id;
                          return (
                            <button
                              key={acc.id}
                              type="button"
                              onClick={() => {
                                handleTabClick('insights');
                                if (onSelectInsightsAccount) onSelectInsightsAccount(acc.id);
                              }}
                              className={`w-full flex items-center space-x-2.5 py-2 px-3 rounded-2xl text-xs transition-all cursor-pointer truncate ${
                                isSelected
                                  ? 'bg-white text-gray-900 font-bold shadow-xs border border-gray-200/80'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 font-medium'
                              }`}
                              title={acc.displayName || acc.username}
                            >
                              <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0">
                                <PlatformLogo platform={acc.platform} className="w-3.5 h-3.5" />
                              </div>
                              <span className="truncate">{acc.displayName || acc.username}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* 7. Settings */}
                <button
                  type="button"
                  onClick={() => handleTabClick('settings')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'settings'
                      ? 'bg-gray-900 text-white shadow-xs'
                      : 'text-gray-700 hover:bg-gray-200/70 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </div>
                </button>

                {/* 8. Sub-Panel Toggle Quick Action */}
                <button
                  type="button"
                  onClick={() => setIsSubPanelOpen(!isSubPanelOpen)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                    isSubPanelOpen
                      ? 'bg-white text-gray-900 shadow-2xs border border-gray-200'
                      : 'text-gray-600 hover:bg-gray-200/70 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Folder className="w-4 h-4" />
                    <span>Content & Folders</span>
                  </div>
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
                      isSubPanelOpen ? 'rotate-90' : ''
                    }`}
                  />
                </button>
              </nav>
            </div>

            {/* Bottom User Profile Card & Organization Menu */}
            <div className="p-3 border-t border-gray-200/80 relative">
              {/* Profile Menu Popover */}
              {isProfileMenuOpen && (
                <div
                  ref={profileMenuRef}
                  className="absolute bottom-full left-2 right-2 mb-2 bg-white border border-gray-200/90 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.12)] p-4 text-gray-900 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 font-sans select-none"
                >
                  {/* User Profile Picture, Name, and Gmail */}
                  <div className="flex items-center space-x-3 pb-3 border-b border-gray-100">
                    <UserAvatar
                      name={profileData.fullName || displayName}
                      avatarUrl={profileData.avatarUrl || avatarUrl}
                      size="md"
                      className="ring-2 ring-emerald-500/20 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-gray-900 truncate">
                        {profileData.fullName || displayName}
                      </div>
                      <div className="text-[11px] text-gray-500 truncate mt-0.5">
                        {profileData.email || displaySub}
                      </div>
                    </div>
                  </div>

                  {/* Organization & Subscription Status */}
                  <div className="pt-3 pb-1">
                    <div className="text-[11px] text-gray-400 font-medium">Organization</div>
                    <div className="text-sm font-bold text-gray-900 tracking-tight truncate mt-0.5">
                      {profileData.organizationName || 'My organization'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1.5 flex items-center space-x-1.5 font-medium">
                      <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70 text-[11px]">
                        {profileData.planName}
                      </span>
                      <span>·</span>
                      <span>
                        {effectiveChannelsCount} {effectiveChannelsCount === 1 ? 'channel' : 'channels'}
                      </span>
                    </div>
                  </div>

                  {/* Upgrade Plan Button */}
                  <button
                    type="button"
                    onClick={handleOpenUpgrade}
                    className="w-full mt-3 py-2.5 px-3.5 rounded-xl bg-gray-900 hover:bg-black active:bg-gray-800 text-white text-xs font-semibold flex items-center justify-center space-x-2 shadow-xs transition-all cursor-pointer group"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 group-hover:scale-110 transition-transform" />
                    <span>Upgrade Plan</span>
                  </button>

                  {/* Secondary Links */}
                  <div className="mt-3 pt-2 border-t border-gray-100 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => handleTabClick('settings')}
                      className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-xl text-xs text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 text-gray-400" />
                      <span>Account Settings</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTabClick('connections')}
                      className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-xl text-xs text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <Link2 className="w-3.5 h-3.5 text-gray-400" />
                      <span>Connected Channels</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setIsProfileMenuOpen(false);
                        await signOutUser();
                        window.location.href = '/login';
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-xl text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Profile Card Button */}
              <div
                ref={profileTriggerRef}
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                className={`flex items-center justify-between p-2 rounded-2xl transition-all cursor-pointer ${
                  isProfileMenuOpen ? 'bg-white shadow-xs border border-gray-200' : 'hover:bg-gray-200/70'
                }`}
                title="Account & Organization settings"
              >
                <div className="flex items-center space-x-2.5 overflow-hidden">
                  <UserAvatar
                    name={profileData.fullName || displayName}
                    avatarUrl={profileData.avatarUrl || avatarUrl}
                    size="md"
                    className="ring-1 ring-emerald-500/20"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-gray-800 leading-tight truncate">
                      {profileData.fullName || displayName}
                    </div>
                    <div className="text-[10px] text-gray-500 truncate mt-0.5">
                      {profileData.email || displaySub}
                    </div>
                  </div>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-gray-400 shrink-0 ml-1 transition-transform duration-200 ${
                    isProfileMenuOpen ? 'rotate-180 text-gray-800' : ''
                  }`}
                />
              </div>
            </div>
          </div>
        )}

        {/* TIER 3: CONTEXTUAL SUB-PANEL (Right Section of User Reference Image) */}
        {isSubPanelOpen && (
          <div className="w-56 sm:w-60 bg-[#f9fafb] border-r border-gray-200/80 flex flex-col justify-between h-full animate-in fade-in slide-in-from-left-2 duration-200">
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Header: Close subpanel button */}
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Workspace Folders
                </span>
                <button
                  type="button"
                  onClick={() => setIsSubPanelOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors"
                  title="Close Sub-panel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick links: Archive, Starred */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => handleTabClick('posts-posted')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-2xl text-xs font-medium transition-colors cursor-pointer ${
                    activeTab === 'posts-posted'
                      ? 'bg-white text-gray-900 font-bold shadow-xs border border-gray-200/70'
                      : 'text-gray-600 hover:bg-gray-200/60 hover:text-gray-900'
                  }`}
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabClick('posts-all')}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-2xl text-xs font-medium text-gray-600 hover:bg-gray-200/60 hover:text-gray-900 transition-colors cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5" />
                  <span>Favourite&apos;s</span>
                </button>
              </div>

              {/* Status Section (Drafts, Scheduled, etc.) */}
              <div className="pt-2">
                <div className="flex items-center justify-between px-2 mb-1.5">
                  <span className="text-[11px] font-bold text-gray-800">
                    Drafts & Status ({scheduledCount + draftCount + failedCount})
                  </span>
                  <Pin className="w-3 h-3 text-gray-400" />
                </div>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => handleTabClick('posts-all')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-medium transition-colors cursor-pointer ${
                      activeTab === 'posts-all'
                        ? 'bg-white text-gray-900 font-bold shadow-xs border border-gray-200/70'
                        : 'text-gray-600 hover:bg-gray-200/60 hover:text-gray-900'
                    }`}
                  >
                    <span>General</span>
                    <span className="text-[10px] font-mono text-gray-400">{totalPostsCount}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabClick('posts-drafts')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-medium transition-colors cursor-pointer ${
                      activeTab === 'posts-drafts'
                        ? 'bg-white text-gray-900 font-bold shadow-xs border border-gray-200/70'
                        : 'text-gray-600 hover:bg-gray-200/60 hover:text-gray-900'
                    }`}
                  >
                    <span>Drafts</span>
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-200/80 px-2 py-0.5 rounded-full">
                      {draftCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabClick('posts-scheduled')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-medium transition-colors cursor-pointer ${
                      activeTab === 'posts-scheduled'
                        ? 'bg-white text-gray-900 font-bold shadow-xs border border-gray-200/70'
                        : 'text-gray-600 hover:bg-gray-200/60 hover:text-gray-900'
                    }`}
                  >
                    <span>Scheduled</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {scheduledCount}
                    </span>
                  </button>

                  {failedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => handleTabClick('posts-failed')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-medium transition-colors cursor-pointer ${
                        activeTab === 'posts-failed'
                          ? 'bg-white text-rose-700 font-bold shadow-xs border border-rose-200'
                          : 'text-rose-600 hover:bg-rose-50'
                      }`}
                    >
                      <span>Failed</span>
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                        {failedCount}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Folders Section: Channels & Categories */}
              <div className="pt-2">
                <div className="flex items-center justify-between px-2 mb-1.5">
                  <span className="text-[11px] font-bold text-gray-800">
                    Folders ({connectedAccounts.length})
                  </span>
                  <Folder className="w-3 h-3 text-gray-400" />
                </div>
                <div className="space-y-1">
                  {connectedAccounts.map((acc) => {
                    const isSelected =
                      activeTab === 'insights' && selectedInsightsAccountId === acc.id;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => {
                          handleTabClick('insights');
                          if (onSelectInsightsAccount) onSelectInsightsAccount(acc.id);
                        }}
                        className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-2xl text-xs font-medium transition-all cursor-pointer truncate ${
                          isSelected
                            ? 'bg-white text-gray-900 font-bold shadow-xs border border-gray-200/80'
                            : 'text-gray-600 hover:bg-gray-200/60 hover:text-gray-900'
                        }`}
                      >
                        <PlatformLogo platform={acc.platform} className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{acc.displayName || acc.username}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
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
