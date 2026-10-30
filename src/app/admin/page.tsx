'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminSidebar, AdminTab } from '@/components/admin/AdminSidebar';
import { AdminLoginGate } from '@/components/admin/AdminLoginGate';
import { OverviewView } from '@/components/admin/OverviewView';
import { UsersView } from '@/components/admin/UsersView';
import { ConnectedAccountsView } from '@/components/admin/ConnectedAccountsView';
import { PostsView } from '@/components/admin/PostsView';
import { BillingView } from '@/components/admin/BillingView';
import { DevicesView } from '@/components/admin/DevicesView';
import { ActivityLogsView } from '@/components/admin/ActivityLogsView';
import { SystemHealthView } from '@/components/admin/SystemHealthView';
import { SecuritySettingsView } from '@/components/admin/SecuritySettingsView';
import { UserDetailModal } from '@/components/admin/UserDetailModal';
import { AdminOverviewStats, AdminCustomerProfile } from '@/lib/admin/service';
import { Loader2 } from 'lucide-react';

export default function AdminPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [ownerEmail, setOwnerEmail] = useState<string>('onmansonu@gmail.com');

  // Navigation state with URL & localStorage persistence across page refresh
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') as AdminTab;
      const valid: AdminTab[] = [
        'overview',
        'users',
        'accounts',
        'posts',
        'billing',
        'devices',
        'activity',
        'system',
        'security',
      ];
      if (tab && valid.includes(tab)) return tab;
      try {
        const stored = (sessionStorage.getItem('postingtube_admin_tab') || localStorage.getItem('postingtube_admin_tab')) as AdminTab;
        if (stored && valid.includes(stored)) return stored;
      } catch (e) {}
    }
    return 'overview';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleAdminTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    try {
      localStorage.setItem('postingtube_admin_tab', tab);
      sessionStorage.setItem('postingtube_admin_tab', tab);
    } catch (e) {}
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (tab === 'overview') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', tab);
      }
      window.history.pushState(null, '', url.pathname + (url.search ? url.search : ''));
    }
  };

  // Browser history listener
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') as AdminTab;
      const valid: AdminTab[] = [
        'overview',
        'users',
        'accounts',
        'posts',
        'billing',
        'devices',
        'activity',
        'system',
        'security',
      ];
      if (tab && valid.includes(tab)) {
        setActiveTab(tab);
      } else {
        setActiveTab('overview');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Data states
  const [overviewStats, setOverviewStats] = useState<AdminOverviewStats | null>(null);
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);

  // Users state
  const [users, setUsers] = useState<AdminCustomerProfile[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userPlanFilter, setUserPlanFilter] = useState('all');

  // Connected accounts state
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isAccountsLoading, setIsAccountsLoading] = useState(false);
  const [accountPlatformFilter, setAccountPlatformFilter] = useState('all');
  const [accountStatusFilter, setAccountStatusFilter] = useState('all');
  const [accountSearch, setAccountSearch] = useState('');

  // Selected user profile for modal view across tabs
  const [selectedUserForModal, setSelectedUserForModal] = useState<AdminCustomerProfile | null>(null);

  const handleOpenUserProfile = (userEmailOrId: string) => {
    if (!userEmailOrId) return;
    const lower = userEmailOrId.toLowerCase();
    const found = users.find((u) => u.id === userEmailOrId || u.email.toLowerCase() === lower);
    if (found) {
      setSelectedUserForModal(found);
      return;
    }
    const userAccs = accounts.filter(
      (a) => a.user_id === userEmailOrId || a.ownerEmail?.toLowerCase() === lower
    );
    const userPosts = posts.filter(
      (p) => p.user_id === userEmailOrId || p.customerEmail?.toLowerCase() === lower
    );
    const displayName =
      userAccs[0]?.ownerName ||
      userAccs[0]?.displayName ||
      (userEmailOrId.includes('@') ? userEmailOrId.split('@')[0] : 'Customer');

    setSelectedUserForModal({
      id: userEmailOrId,
      email: userEmailOrId.includes('@') ? userEmailOrId : `${userEmailOrId}@customer.com`,
      fullName: displayName,
      status: 'active',
      plan: 'free',
      billingCycle: 'monthly',
      paymentStatus: 'free',
      registeredAt: userAccs[0]?.createdAt || new Date().toISOString(),
      lastActiveAt: userAccs[0]?.updatedAt || new Date().toISOString(),
      connectedAccountsCount: userAccs.length,
      connectedAccounts: userAccs.map((a) => ({
        id: a.id,
        platform: a.platform,
        displayName: a.displayName || a.username,
        username: a.username,
        avatarUrl: a.avatarUrl,
        status: a.status || 'connected',
        connectedAt: a.createdAt,
        tokenExpiry: a.status === 'expired' ? 'Expired' : 'Valid (Auto-Refreshed)',
        hasErrors: a.status === 'expired' || a.status === 'error',
      })),
      postsCount: {
        total: userPosts.length,
        published: userPosts.filter((p) => p.status === 'published').length,
        scheduled: userPosts.filter((p) => p.status === 'scheduled').length,
        drafts: userPosts.filter((p) => p.status === 'draft').length,
        failed: userPosts.filter((p) => p.status === 'failed').length,
      },
      recentPosts: userPosts.slice(0, 10).map((post) => ({
        id: post.id,
        content: post.content || '',
        mediaUrl: post.media?.[0]?.url,
        status: post.status,
        scheduledFor: post.scheduledFor,
        publishedAt: post.publishedAt,
        createdAt: post.createdAt,
        destinations: post.targetAccountIds || [],
      })),
      billingHistory: [],
    });
  };

  // Posts state
  const [posts, setPosts] = useState<any[]>([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [postsPage, setPostsPage] = useState(1);
  const [isPostsLoading, setIsPostsLoading] = useState(false);
  const [postStatusFilter, setPostStatusFilter] = useState('all');
  const [postSearch, setPostSearch] = useState('');

  // Billing state
  const [billingData, setBillingData] = useState<any | null>(null);
  const [isBillingLoading, setIsBillingLoading] = useState(false);

  // Devices state
  const [devicesData, setDevicesData] = useState<any | null>(null);
  const [isDevicesLoading, setIsDevicesLoading] = useState(false);

  // Activity logs state
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [activityEventFilter, setActivityEventFilter] = useState('all');
  const [activitySearch, setActivitySearch] = useState('');

  // System health state
  const [systemHealth, setSystemHealth] = useState<any | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(false);

  // 1. Check session upon initial mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/admin/auth/me');
        const data = await res.json();
        if (res.ok && data.authenticated) {
          setIsAuthenticated(true);
          if (data.email) setOwnerEmail(data.email);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      }
    }
    checkAuth();
  }, []);

  // 2. Fetchers
  const fetchOverview = useCallback(async () => {
    setIsOverviewLoading(true);
    try {
      const res = await fetch('/api/admin/overview');
      const json = await res.json();
      if (json.success && json.data) setOverviewStats(json.data);
    } catch (e) {
      console.warn('Overview fetch error:', e);
    } finally {
      setIsOverviewLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setIsUsersLoading(true);
    try {
      const params = new URLSearchParams({
        page: usersPage.toString(),
        limit: '20',
        ...(userSearch ? { search: userSearch } : {}),
        ...(userStatusFilter !== 'all' ? { status: userStatusFilter } : {}),
        ...(userPlanFilter !== 'all' ? { plan: userPlanFilter } : {}),
      });
      const res = await fetch(`/api/admin/users?${params}`);
      const json = await res.json();
      if (json.success) {
        setUsers(json.users || []);
        setUsersTotal(json.total || 0);
      }
    } catch (e) {
      console.warn('Users fetch error:', e);
    } finally {
      setIsUsersLoading(false);
    }
  }, [usersPage, userSearch, userStatusFilter, userPlanFilter]);

  const fetchAccounts = useCallback(async () => {
    setIsAccountsLoading(true);
    try {
      const params = new URLSearchParams({
        ...(accountPlatformFilter !== 'all' ? { platform: accountPlatformFilter } : {}),
        ...(accountStatusFilter !== 'all' ? { status: accountStatusFilter } : {}),
        ...(accountSearch ? { search: accountSearch } : {}),
      });
      const res = await fetch(`/api/admin/accounts?${params}`);
      const json = await res.json();
      if (json.success) setAccounts(json.accounts || []);
    } catch (e) {
      console.warn('Accounts fetch error:', e);
    } finally {
      setIsAccountsLoading(false);
    }
  }, [accountPlatformFilter, accountStatusFilter, accountSearch]);

  const fetchPosts = useCallback(async () => {
    setIsPostsLoading(true);
    try {
      const params = new URLSearchParams({
        page: postsPage.toString(),
        limit: '20',
        ...(postStatusFilter !== 'all' ? { status: postStatusFilter } : {}),
        ...(postSearch ? { search: postSearch } : {}),
      });
      const res = await fetch(`/api/admin/posts?${params}`);
      const json = await res.json();
      if (json.success) {
        setPosts(json.posts || []);
        setPostsTotal(json.total || 0);
      }
    } catch (e) {
      console.warn('Posts fetch error:', e);
    } finally {
      setIsPostsLoading(false);
    }
  }, [postsPage, postStatusFilter, postSearch]);

  const fetchBilling = useCallback(async () => {
    setIsBillingLoading(true);
    try {
      const res = await fetch('/api/admin/billing');
      const json = await res.json();
      if (json.success) setBillingData(json);
    } catch (e) {
      console.warn('Billing fetch error:', e);
    } finally {
      setIsBillingLoading(false);
    }
  }, []);

  const fetchDevices = useCallback(async () => {
    setIsDevicesLoading(true);
    try {
      const res = await fetch('/api/admin/devices');
      const json = await res.json();
      if (json.success) setDevicesData(json);
    } catch (e) {
      console.warn('Devices fetch error:', e);
    } finally {
      setIsDevicesLoading(false);
    }
  }, []);

  const fetchActivity = useCallback(async () => {
    setIsActivityLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '50',
        ...(activityEventFilter !== 'all' ? { eventType: activityEventFilter } : {}),
        ...(activitySearch ? { search: activitySearch } : {}),
      });
      const res = await fetch(`/api/admin/activity?${params}`);
      const json = await res.json();
      if (json.success) setActivityLogs(json.logs || []);
    } catch (e) {
      console.warn('Activity fetch error:', e);
    } finally {
      setIsActivityLoading(false);
    }
  }, [activityEventFilter, activitySearch]);

  const fetchSystemHealth = useCallback(async () => {
    setIsHealthLoading(true);
    try {
      const res = await fetch('/api/admin/system');
      const json = await res.json();
      if (json.success) setSystemHealth(json.health);
    } catch (e) {
      console.warn('Health fetch error:', e);
    } finally {
      setIsHealthLoading(false);
    }
  }, []);

  // 3. Tab-based data trigger
  useEffect(() => {
    if (!isAuthenticated) return;

    if (activeTab === 'overview') fetchOverview();
    else if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'accounts') fetchAccounts();
    else if (activeTab === 'posts') fetchPosts();
    else if (activeTab === 'billing') fetchBilling();
    else if (activeTab === 'devices') fetchDevices();
    else if (activeTab === 'activity') fetchActivity();
    else if (activeTab === 'system') fetchSystemHealth();
  }, [
    isAuthenticated,
    activeTab,
    fetchOverview,
    fetchUsers,
    fetchAccounts,
    fetchPosts,
    fetchBilling,
    fetchDevices,
    fetchActivity,
    fetchSystemHealth,
  ]);

  // Actions
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } finally {
      setIsAuthenticated(false);
    }
  };

  const handleUpdateUserStatus = async (userId: string, newStatus: 'active' | 'suspended') => {
    const res = await fetch(`/api/admin/users/${userId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      fetchUsers();
    }
  };

  const handleDisconnectAccount = async (accountId: string) => {
    const res = await fetch(`/api/admin/accounts/${accountId}/disconnect`, {
      method: 'POST',
    });
    if (res.ok) {
      fetchAccounts();
    }
  };

  const handleRetryPost = async (postId: string) => {
    const res = await fetch(`/api/admin/posts/${postId}/retry`, {
      method: 'POST',
    });
    if (res.ok) {
      fetchPosts();
    }
  };

  // Initial loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-xs text-gray-500 space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-gray-900" />
        <span>Verifying Owner Authorization...</span>
      </div>
    );
  }

  // If unauthenticated: Render Private Owner Login Gate
  if (!isAuthenticated) {
    return (
      <AdminLoginGate
        onSuccess={(email) => {
          setOwnerEmail(email);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  // Authenticated Owner Super Admin Dashboard
  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans">
      {/* Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={handleAdminTabChange}
        ownerEmail={ownerEmail}
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Pane */}
      <main className="flex-1 h-screen overflow-y-auto">
        <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
          {activeTab === 'overview' && (
            <OverviewView
              stats={overviewStats}
              isLoading={isOverviewLoading}
              onRefresh={fetchOverview}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'users' && (
            <UsersView
              users={users}
              total={usersTotal}
              page={usersPage}
              limit={20}
              isLoading={isUsersLoading}
              onPageChange={setUsersPage}
              onSearchChange={setUserSearch}
              onStatusFilterChange={setUserStatusFilter}
              onPlanFilterChange={setUserPlanFilter}
              onUpdateUserStatus={handleUpdateUserStatus}
            />
          )}

          {activeTab === 'accounts' && (
            <ConnectedAccountsView
              accounts={accounts}
              isLoading={isAccountsLoading}
              onRefresh={fetchAccounts}
              onPlatformFilter={setAccountPlatformFilter}
              onStatusFilter={setAccountStatusFilter}
              onSearch={setAccountSearch}
              onDisconnectAccount={handleDisconnectAccount}
              onOpenUserProfile={handleOpenUserProfile}
              users={users}
            />
          )}

          {activeTab === 'posts' && (
            <PostsView
              posts={posts}
              total={postsTotal}
              page={postsPage}
              limit={20}
              isLoading={isPostsLoading}
              onPageChange={setPostsPage}
              onStatusFilter={setPostStatusFilter}
              onSearch={setPostSearch}
              onRetryPost={handleRetryPost}
              onOpenUserProfile={handleOpenUserProfile}
              users={users}
            />
          )}

          {activeTab === 'billing' && (
            <BillingView
              billingData={billingData}
              isLoading={isBillingLoading}
              onRefresh={fetchBilling}
            />
          )}

          {activeTab === 'devices' && (
            <DevicesView
              deviceData={devicesData}
              isLoading={isDevicesLoading}
              onRefresh={fetchDevices}
            />
          )}

          {activeTab === 'activity' && (
            <ActivityLogsView
              logs={activityLogs}
              isLoading={isActivityLoading}
              onRefresh={fetchActivity}
              onEventTypeFilter={setActivityEventFilter}
              onSearch={setActivitySearch}
            />
          )}

          {activeTab === 'system' && (
            <SystemHealthView
              health={systemHealth}
              isLoading={isHealthLoading}
              onRefresh={fetchSystemHealth}
            />
          )}

          {activeTab === 'security' && (
            <SecuritySettingsView
              ownerEmail={ownerEmail}
              onLogout={handleLogout}
            />
          )}
        </div>
      </main>

      {/* Global Customer Profile Detail Modal */}
      {selectedUserForModal && (
        <UserDetailModal
          user={selectedUserForModal}
          onClose={() => setSelectedUserForModal(null)}
          onUpdateStatus={handleUpdateUserStatus}
        />
      )}
    </div>
  );
}
