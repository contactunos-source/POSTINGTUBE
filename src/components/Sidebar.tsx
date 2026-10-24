'use client';

import React, { useRef } from 'react';
import { useClickOutside } from '@/hooks/useClickOutside';
import {
  PlusCircle,
  FileText,
  Calendar,
  Grid,
  Clock,
  CheckCircle2,
  FileEdit,
  AlertTriangle,
  Link2,
  Settings,
  ChevronDown,
  Building2,
  Cpu,
  BarChart3,
  TrendingUp,
  X,
} from 'lucide-react';
import { Workspace, SocialAccount } from '@/types/social';
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
  currentWorkspace: Workspace;
  workspaces: Workspace[];
  onSelectWorkspace: (ws: Workspace) => void;
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
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentWorkspace,
  workspaces,
  onSelectWorkspace,
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
}) => {
  const connectedAccounts = accounts.filter((a) => a.status === 'connected' || !a.status);
  const displayName =
    authUser?.user_metadata?.full_name ||
    authUser?.email?.split('@')[0] ||
    'Admin User';
  const displaySub = authUser?.email || 'Pro Plan';
  const initials = authUser?.user_metadata?.full_name
    ? authUser.user_metadata.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : authUser?.email
    ? authUser.email.substring(0, 2).toUpperCase()
    : 'AD';
  const avatarUrl = authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.picture;
  const [showWorkspaceMenu, setShowWorkspaceMenu] = React.useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);

  useClickOutside(workspaceRef, () => setShowWorkspaceMenu(false), {
    enabled: showWorkspaceMenu,
  });

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
        className={`fixed inset-y-0 left-0 z-50 w-72 sm:w-80 lg:w-64 bg-white border-r border-gray-200 flex flex-col h-screen select-none shrink-0 font-sans transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <PostingTubeLogo size="md" />
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      {/* Workspace Switcher */}
      <div ref={workspaceRef} className="px-3 pt-3 pb-2 relative">
        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-2">
          Workspace
        </label>
        <button
          onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
          className="w-full mt-1 flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors border border-gray-200/60"
        >
          <div className="flex items-center space-x-2 truncate">
            <UserAvatar
              name={currentWorkspace.name}
              avatarUrl={currentWorkspace.avatar}
              size="xs"
              className="rounded-md! ring-1 ring-black/5"
            />
            <span className="truncate">{currentWorkspace.name}</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </button>

        {showWorkspaceMenu && (
          <div className="absolute top-full left-3 right-3 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
            <div className="text-[11px] font-semibold text-gray-400 px-3 py-1">SWITCH WORKSPACE</div>
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => {
                  onSelectWorkspace(ws);
                  setShowWorkspaceMenu(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-emerald-50 transition-colors ${
                  ws.id === currentWorkspace.id ? 'font-semibold text-emerald-700 bg-emerald-50/50' : 'text-gray-700'
                }`}
              >
                <span>{ws.name}</span>
                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-normal">
                  {ws.role}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4 text-sm">
        {/* Create */}
        <div>
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">
            Create
          </div>
          <nav className="space-y-0.5">
            <button
              onClick={() => handleTabClick('new-post')}
              className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
              className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
            <span>Insights</span>
            {connectedAccounts.length > 0 && (
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded-full">
                {connectedAccounts.length}
              </span>
            )}
          </div>
          <nav className="space-y-0.5">
            <button
              onClick={() => {
                handleTabClick('insights');
                if (onSelectInsightsAccount) onSelectInsightsAccount('all');
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'insights' && (!selectedInsightsAccountId || selectedInsightsAccountId === 'all')
                  ? 'bg-emerald-50 text-emerald-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>All Insights</span>
              </div>
            </button>

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
              className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
              className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
              className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
              className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
        <div className="flex items-center justify-between p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
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
