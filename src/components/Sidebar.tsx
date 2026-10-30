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
  Plus,
  Check,
  Loader2,
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
  onCreateWorkspace?: (name: string) => Promise<void> | void;
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
  onCreateWorkspace,
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
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = React.useState('');
  const [isCreatingWorkspace, setIsCreatingWorkspace] = React.useState(false);
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
          className="w-full mt-1 flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors border border-gray-200/60 cursor-pointer"
        >
          <div className="flex items-center space-x-2 truncate">
            <UserAvatar
              name={currentWorkspace.name}
              avatarUrl={currentWorkspace.avatar}
              size="xs"
              className="rounded-md! ring-1 ring-black/5 shrink-0"
            />
            <span className="truncate">{currentWorkspace.name}</span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showWorkspaceMenu ? 'rotate-180' : ''}`} />
        </button>

        {showWorkspaceMenu && (
          <div className="absolute top-full left-3 right-3 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-gray-100 animate-in fade-in-50 zoom-in-95">
            {/* Current Workspace Owner's Information */}
            <div className="p-3 bg-gray-50/80">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Current Workspace
              </div>
              <div className="flex items-center space-x-2.5">
                <UserAvatar
                  name={currentWorkspace.name}
                  avatarUrl={currentWorkspace.avatar}
                  size="sm"
                  className="rounded-lg! ring-1 ring-emerald-500/20 shadow-2xs shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-gray-900 truncate">
                    {currentWorkspace.name}
                  </div>
                  <div className="text-[10px] text-gray-500 truncate flex items-center space-x-1.5 mt-0.5">
                    <span className="truncate font-medium text-gray-700">{displayName}</span>
                    <span className="text-gray-300">•</span>
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full uppercase text-[9px]">
                      {currentWorkspace.role || 'Owner'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Create New Workspace Button (Directly below owner info) */}
            <div className="p-1.5 bg-white">
              <button
                type="button"
                onClick={() => {
                  setShowWorkspaceMenu(false);
                  setShowCreateModal(true);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer group"
              >
                <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <span>Create New Workspace</span>
              </button>
            </div>

            {/* Switch Workspace List */}
            <div className="py-1 max-h-52 overflow-y-auto">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-1.5">
                All Workspaces ({workspaces.length})
              </div>
              {workspaces.map((ws) => {
                const isActive = ws.id === currentWorkspace.id;
                return (
                  <button
                    key={ws.id}
                    onClick={() => {
                      onSelectWorkspace(ws);
                      setShowWorkspaceMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-emerald-50/60 transition-colors cursor-pointer ${
                      isActive ? 'font-bold text-emerald-700 bg-emerald-50/50' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0 truncate">
                      <UserAvatar
                        name={ws.name}
                        avatarUrl={ws.avatar}
                        size="xs"
                        className="rounded-md! shrink-0"
                      />
                      <span className="truncate">{ws.name}</span>
                    </div>
                    {isActive ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1.5" />
                    ) : (
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-normal shrink-0 ml-1">
                        {ws.role || 'owner'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
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

    {/* Create New Workspace Modal */}
    {showCreateModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xl max-w-md w-full p-6 space-y-4 font-sans animate-in zoom-in-95">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 mb-2 shadow-2xs">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Create New Workspace</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Workspaces maintain their own independent social accounts, scheduled posts, and analytics with complete multi-tenant isolation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                setNewWorkspaceName('');
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newWorkspaceName.trim() || isCreatingWorkspace) return;
              setIsCreatingWorkspace(true);
              try {
                await onCreateWorkspace?.(newWorkspaceName.trim());
                setShowCreateModal(false);
                setNewWorkspaceName('');
              } finally {
                setIsCreatingWorkspace(false);
              }
            }}
            className="space-y-4 pt-1"
          >
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                Workspace Name
              </label>
              <input
                type="text"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="e.g. Acme Marketing, YouTube Brand, Client Workspace"
                autoFocus
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-hidden transition-all text-gray-900 placeholder:text-gray-400 font-medium"
              />
            </div>

            <div className="p-3 bg-emerald-50/60 border border-emerald-200/50 rounded-xl text-[11px] text-emerald-800 flex items-start space-x-2">
              <span className="font-bold text-emerald-900">Fresh Environment:</span>
              <span>A newly created workspace starts completely empty, ready to connect brand-new social channels.</span>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewWorkspaceName('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newWorkspaceName.trim() || isCreatingWorkspace}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5 cursor-pointer"
              >
                {isCreatingWorkspace ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create Workspace</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
};
