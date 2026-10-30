'use client';

import React from 'react';
import {
  FileText,
  Calendar,
  Grid,
  Link2,
  Settings,
  ChevronDown,
  Cpu,
  BarChart3,
  X,
  PanelLeft,
} from 'lucide-react';
import { SocialAccount } from '@/types/social';
import { UserAvatar } from './UserAvatar';
import { PlatformLogo } from './SocialIcons';
import { PostingTubeLogo } from './PostingTubeLogo';

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
  selectedInsightsAccountId?: string;
  onSelectInsightsAccount?: (accountId: string) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
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
  selectedInsightsAccountId = 'all',
  onSelectInsightsAccount,
  isMobileOpen = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const connectedAccounts = accounts.filter((a) => a.status === 'connected' || !a.status);
  const displayName =
    authUser?.user_metadata?.full_name ||
    authUser?.email?.split('@')[0] ||
    'Admin User';
  const displaySub = authUser?.email || 'Pro Plan';
  const avatarUrl = authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.picture;

  const handleTabClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    onCloseMobile?.();
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
        className={`fixed inset-y-0 left-0 z-50 w-72 sm:w-80 lg:w-64 bg-white border-r border-gray-200 flex flex-col h-screen select-none shrink-0 font-sans transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:hidden' : 'lg:flex'
        } ${
          isMobileOpen ? 'translate-x-0 shadow-2xl flex' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <PostingTubeLogo size="md" />
            <button
              type="button"
              onClick={onToggleCollapse}
              className="w-8 h-8 rounded-full bg-[#27272a] hover:bg-black text-white flex items-center justify-center shrink-0 transition-colors shadow-xs cursor-pointer"
              title="Hide sidebar"
              aria-label="Hide sidebar"
            >
              <PanelLeft className="w-4 h-4 text-white" strokeWidth={2} />
            </button>
          </div>
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
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeTab.startsWith('posts-')
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Grid className="w-4 h-4" />
                  <span>Posts</span>
                </div>
                {totalPostsCount > 0 && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
                    {totalPostsCount}
                  </span>
                )}
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
              {connectedAccounts.length > 0 && (
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded-full">
                  {connectedAccounts.length}
                </span>
              )}
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
                onClick={() => handleTabClick('worker-console')}
                className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'worker-console'
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Cpu className="w-4 h-4 text-emerald-600" />
                <span>Worker Engine</span>
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

        {/* User Profile Footer */}
        <div className="p-3 border-t border-gray-100">
          <div
            onClick={() => handleTabClick('settings')}
            className="flex items-center justify-between p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <UserAvatar
                name={displayName}
                avatarUrl={avatarUrl}
                size="md"
                className="ring-1 ring-emerald-500/20"
              />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-gray-800 leading-tight truncate">
                  {displayName}
                </div>
                <div className="text-[10px] text-emerald-600 font-medium truncate">
                  {displaySub}
                </div>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" />
          </div>
        </div>
      </aside>
    </>
  );
};
