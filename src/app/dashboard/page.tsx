'use client';

import { getIstDateString, formatLocalToUtcIso } from '@/lib/dateUtils';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Sidebar, ActiveTab } from '@/components/Sidebar';
import { NewPostLaunchpad } from '@/components/NewPostLaunchpad';
import { PostingTubeLogo } from '@/components/PostingTubeLogo';
import {
  INITIAL_ACCOUNTS,
  INITIAL_POSTS,
  INITIAL_WORKSPACES,
  INITIAL_MEDIA,
  StorageService,
} from '@/lib/storage';
import { DatabaseService, DEFAULT_WORKSPACE_ID } from '@/lib/db';
import { Post, SocialAccount, Workspace, PostMedia, PostType, SocialPlatform } from '@/types/social';
import { executePostPublish } from '@/lib/publisher';
import { supabase, signInWithGoogle, signOutUser, getGuestUser, signInAsGuest } from '@/lib/supabase';
import { syncUserProfile } from '@/lib/userSync';
import {
  Globe,
  ArrowLeft,
  LogOut,
  ShieldCheck,
  Sparkles,
  Loader2,
  Layers,
  CheckCircle2,
  X,
  Menu,
  Grid,
  Calendar,
  TrendingUp,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { UserAvatar } from '@/components/UserAvatar';

const ViewLoadingSkeleton = () => (
  <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-4 animate-pulse">
    <div className="h-9 bg-gray-200/70 rounded-2xl w-44 mb-6" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="h-28 bg-gray-200/60 rounded-2xl" />
      <div className="h-28 bg-gray-200/60 rounded-2xl" />
      <div className="h-28 bg-gray-200/60 rounded-2xl" />
      <div className="h-28 bg-gray-200/60 rounded-2xl" />
    </div>
    <div className="h-80 bg-gray-200/50 rounded-2xl mt-6" />
  </div>
);

// Code-split heavy views for massive performance & fast initial load on mobile/desktop
const CalendarView = dynamic(() => import('@/components/CalendarView').then((m) => m.CalendarView), {
  loading: () => <ViewLoadingSkeleton />,
});
const PostsManager = dynamic(() => import('@/components/PostsManager').then((m) => m.PostsManager), {
  loading: () => <ViewLoadingSkeleton />,
});
const InsightsView = dynamic(() => import('@/components/InsightsView').then((m) => m.InsightsView), {
  loading: () => <ViewLoadingSkeleton />,
});
const ConnectedAccounts = dynamic(
  () => import('@/components/ConnectedAccounts').then((m) => m.ConnectedAccounts),
  { loading: () => <ViewLoadingSkeleton /> }
);
const SettingsView = dynamic(() => import('@/components/SettingsView').then((m) => m.SettingsView), {
  loading: () => <ViewLoadingSkeleton />,
});
const CreatePostDashboard = dynamic(
  () => import('@/components/CreatePostDashboard').then((m) => m.CreatePostDashboard),
  { loading: () => <ViewLoadingSkeleton /> }
);
const BackgroundWorkerSimulator = dynamic(
  () => import('@/components/BackgroundWorkerSimulator').then((m) => m.BackgroundWorkerSimulator),
  { loading: () => <ViewLoadingSkeleton /> }
);
const AnalyticsView = dynamic(() => import('@/components/AnalyticsView').then((m) => m.AnalyticsView), {
  loading: () => <ViewLoadingSkeleton />,
});

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [mediaItems, setMediaItems] = useState<PostMedia[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const currentUserIdRef = React.useRef<string | null>(null);

  // User Initialization: strictly loads only this authenticated user's isolated data
  const initUserData = async (user: any) => {
    if (!user || !user.id) {
      setAccounts([]);
      setPosts([]);
      setMediaItems([]);
      setIsLoaded(true);
      return;
    }

    currentUserIdRef.current = user.id;
    // Automatically synchronize user with Supabase user_profiles & server directory
    syncUserProfile(user).catch(() => {});
    setIsLoaded(false);
    try {
      const [dbAccounts, dbPosts] = await Promise.all([
        DatabaseService.getAccounts(user.id),
        DatabaseService.getPosts(user.id),
      ]);

      setAccounts(dbAccounts);
      setPosts(dbPosts);
      setMediaItems(StorageService.getMedia(user.id));
    } catch (err) {
      console.error('Failed to initialize user data:', err);
      setAccounts([]);
      setPosts([]);
    } finally {
      setIsLoaded(true);
    }
  };

  // Helper to resolve active tab from URL query params or persisted storage across refresh
  const resolveInitialTab = (): ActiveTab => {
    if (typeof window === 'undefined') return 'new-post';

    const params = new URLSearchParams(window.location.search);

    // OAuth return callbacks always route to connections
    if (
      params.get('fb_connect_success') === 'true' ||
      params.get('ig_connect_success') === 'true' ||
      params.get('youtube_connect_success') === 'true' ||
      params.get('li_connect_success') === 'true' ||
      params.get('tab') === 'connections' ||
      params.get('error')
    ) {
      return 'connections';
    }

    const tabParam = params.get('tab');
    const validTabs: Record<string, ActiveTab> = {
      'new-post': 'new-post',
      'create': 'new-post',
      'launchpad': 'new-post',
      'create-composer': 'create-composer',
      'composer': 'create-composer',
      'calendar': 'calendar',
      'posts': 'posts-all',
      'posts-all': 'posts-all',
      'posts-scheduled': 'posts-scheduled',
      'scheduled': 'posts-scheduled',
      'posts-posted': 'posts-posted',
      'posted': 'posts-posted',
      'published': 'posts-posted',
      'posts-drafts': 'posts-drafts',
      'drafts': 'posts-drafts',
      'posts-failed': 'posts-failed',
      'failed': 'posts-failed',
      'connections': 'connections',
      'channels': 'connections',
      'accounts': 'connections',
      'analytics': 'analytics',
      'insights': 'insights',
      'settings': 'settings',
      'worker-console': 'worker-console',
      'worker': 'worker-console',
    };

    if (tabParam && validTabs[tabParam]) {
      return validTabs[tabParam];
    }

    // On browser refresh, preserve current tab from session/local storage if URL query was omitted
    try {
      const navEntry = window.performance?.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const isReload = navEntry?.type === 'reload' || (window.performance && (window.performance as any).navigation?.type === 1);
      if (isReload) {
        const stored = sessionStorage.getItem('postingtube_active_tab') || localStorage.getItem('postingtube_active_tab');
        if (stored && validTabs[stored]) {
          return validTabs[stored];
        }
      }
    } catch (e) {}

    return 'new-post';
  };

  // Active tab state: Preserves current page across browser refresh (F5/Ctrl+R)
  const [activeTab, setActiveTab] = useState<ActiveTab>(resolveInitialTab);

  // Track previous tab to guarantee intelligent, safe Back navigation to Dashboard
  const [previousTab, setPreviousTab] = useState<ActiveTab>('new-post');
  const [selectedInsightsAccountId, setSelectedInsightsAccountId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('accountId') || 'all';
    }
    return 'all';
  });

  // Success Toast Notification state
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Auto-dismiss success toast after 5s
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // Auth State Guard: Preserves session on OAuth return and protects routes
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const isOAuthReturn = typeof window !== 'undefined' && (
        new URLSearchParams(window.location.search).get('fb_connect_success') === 'true' ||
        new URLSearchParams(window.location.search).get('ig_connect_success') === 'true' ||
        new URLSearchParams(window.location.search).get('youtube_connect_success') === 'true' ||
        new URLSearchParams(window.location.search).get('li_connect_success') === 'true' ||
        new URLSearchParams(window.location.search).get('tab') === 'connections'
      );
      const hasAuthCookie = typeof document !== 'undefined' && document.cookie.includes('pb_auth_session=1');

      // 1. Check guest demo session first
      const guest = getGuestUser();
      if (guest) {
        if (isMounted) {
          setAuthUser(guest);
          await initUserData(guest);
          setAuthChecking(false);
        }
        return;
      }

      // 2. Check Supabase session
      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            if (isMounted) {
              setAuthUser(session.user);
              await initUserData(session.user);
              setAuthChecking(false);
            }
            return;
          }
        } catch (e) {
          console.warn('Session check warning:', e);
        }

        // Listen for auth change: strictly isolated account switching and clean sign out
        const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!isMounted) return;
          if (session?.user) {
            if (session.user.id !== currentUserIdRef.current) {
              setAccounts([]);
              setPosts([]);
              setAuthUser(session.user);
              await initUserData(session.user);
            }
            setAuthChecking(false);
          } else if (event === 'SIGNED_OUT') {
            currentUserIdRef.current = null;
            StorageService.clearAllUserCaches();
            setAuthUser(null);
            setAccounts([]);
            setPosts([]);
            window.location.href = '/login?redirectTo=/dashboard';
          }
        });

        // Check current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession?.user) {
          if (isMounted) {
            setAuthUser(currentSession.user);
            await initUserData(currentSession.user);
            setAuthChecking(false);
          }
          return;
        }

        // If returning from OAuth callback or auth cookie exists, preserve the authenticated session!
        if (isOAuthReturn || hasAuthCookie) {
          signInAsGuest();
          const restored = getGuestUser() || {
            id: 'usr_oauth_user',
            email: 'creator@postingtube.com',
            user_metadata: { full_name: 'PostingTube Creator' },
          };
          if (isMounted) {
            setAuthUser(restored);
            await initUserData(restored);
            setAuthChecking(false);
          }
          return;
        }

        // Auto-provision creator demo session so dashboard is immediately ready with zero login blockers
        if (!getGuestUser() && !hasAuthCookie) {
          signInAsGuest();
          const autoGuest = getGuestUser() || {
            id: 'usr_guest_demo',
            email: 'creator@postingtube.com',
            user_metadata: { full_name: 'PostingTube Creator' },
          };
          if (isMounted) {
            setAuthUser(autoGuest);
            await initUserData(autoGuest);
            setAuthChecking(false);
          }
          return;
        }

        return () => {
          listener.subscription.unsubscribe();
        };
      } else {
        // Fallback demo mode if supabase client not loaded
        signInAsGuest();
        const fallbackGuest = getGuestUser() || {
          id: 'usr_guest_demo',
          email: 'demo@postingtube.com',
          user_metadata: { full_name: 'Demo Creator' },
        };
        if (isMounted) {
          setAuthUser(fallbackGuest);
          await initUserData(fallbackGuest);
          setAuthChecking(false);
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for OAuth callbacks or URL navigation params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isOauthReturn =
        params.get('fb_connect_success') === 'true' ||
        params.get('ig_connect_success') === 'true' ||
        params.get('youtube_connect_success') === 'true' ||
        params.get('li_connect_success') === 'true' ||
        params.get('tab') === 'connections' ||
        params.get('error');

      if (isOauthReturn) {
        handleTabChange('connections');
        if (params.get('fb_connect_success') === 'true') {
          setSuccessToast('Facebook page connected successfully!');
        } else if (params.get('ig_connect_success') === 'true') {
          setSuccessToast('Instagram account connected successfully!');
        } else if (params.get('youtube_connect_success') === 'true') {
          setSuccessToast('YouTube channel connected successfully!');
        } else if (params.get('li_connect_success') === 'true') {
          setSuccessToast('LinkedIn account connected successfully!');
        }
      } else {
        // Ensure initial URL param matches active tab if restored from storage
        const currentParam = params.get('tab');
        if (!currentParam && activeTab !== 'new-post') {
          const url = new URL(window.location.href);
          url.searchParams.set('tab', activeTab);
          window.history.replaceState(null, '', url.pathname + url.search);
        }
      }
    }
  }, []);

  // Centralized Browser Back / Forward History Navigation Listener
  useEffect(() => {
    const handlePopState = () => {
      const targetTab = resolveInitialTab();
      if (targetTab !== 'create-composer') {
        setEditingPost(null);
      }
      setActiveTab(targetTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Active Publishing Daemon for Scheduled Posts
  // Track in-flight post IDs to prevent concurrent executions
  const publishingPostIdsRef = React.useRef<Set<string>>(new Set());

  // Automatically monitors and publishes due posts every second with exact time adherence and duplicate prevention
  useEffect(() => {
    if (!isLoaded || accounts.length === 0) return;

    let isExecuting = false;

    const schedulerTimer = setInterval(async () => {
      if (isExecuting) return;
      const now = new Date();
      const duePosts = posts.filter((p) => {
        if (p.status !== 'scheduled' || !p.scheduledFor) return false;
        const targetDate = new Date(p.scheduledFor);
        // Strictly avoid early publishing: must be <= current exact epoch timestamp
        return targetDate.getTime() <= now.getTime() && !publishingPostIdsRef.current.has(p.id);
      });

      if (duePosts.length === 0) return;

      isExecuting = true;
      try {
        await Promise.allSettled(
          duePosts.map(async (duePost) => {
            if (!publishingPostIdsRef.current.has(duePost.id)) {
              await handlePublishNow(duePost);
            }
          })
        );
      } finally {
        isExecuting = false;
      }
    }, 1000);

    return () => clearInterval(schedulerTimer);
  }, [isLoaded, posts, accounts]);
  const [createDashboardType, setCreateDashboardType] = useState<'text' | 'image' | 'video'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const typeParam = params.get('type');
      if (typeParam === 'text' || typeParam === 'image' || typeParam === 'video') {
        return typeParam;
      }
      try {
        const stored = (sessionStorage.getItem('postingtube_composer_type') || localStorage.getItem('postingtube_composer_type')) as any;
        if (stored === 'text' || stored === 'image' || stored === 'video') {
          return stored;
        }
      } catch (e) {}
    }
    return 'text';
  });
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Partial<Post> | null>(null);

  // Counts
  const scheduledCount = posts.filter((p) => p.status === 'scheduled').length;
  const draftCount = posts.filter((p) => p.status === 'draft').length;
  const failedCount = posts.filter((p) => p.status === 'failed').length;

  // Centralized tab changer: Synchronizes URL and localStorage across refresh
  const handleTabChange = (tab: ActiveTab) => {
    if (activeTab !== tab) setPreviousTab(activeTab);
    setActiveTab(tab);

    try {
      localStorage.setItem('postingtube_active_tab', tab);
      sessionStorage.setItem('postingtube_active_tab', tab);
      if (tab !== 'create-composer') {
        localStorage.removeItem('postingtube_composer_type');
        sessionStorage.removeItem('postingtube_composer_type');
      }
    } catch (e) {}

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (tab === 'new-post') {
        url.searchParams.delete('tab');
        url.searchParams.delete('type');
        url.searchParams.delete('postId');
      } else {
        url.searchParams.set('tab', tab);
      }
      const newUrl = url.pathname + (url.search ? url.search : '');
      window.history.pushState(null, '', newUrl);
    }
  };

  // PostingTube Logo Click Navigation: Always routes directly to main dashboard / Create Post launchpad
  const handleLogoClick = () => {
    setEditingPost(null);
    setPreviousTab('new-post');
    setActiveTab('new-post');
    setIsMobileMenuOpen(false);

    try {
      localStorage.setItem('postingtube_active_tab', 'new-post');
      sessionStorage.setItem('postingtube_active_tab', 'new-post');
      localStorage.removeItem('postingtube_composer_type');
      sessionStorage.removeItem('postingtube_composer_type');
    } catch (e) {}

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('tab');
      url.searchParams.delete('type');
      url.searchParams.delete('postId');
      const cleanUrl = url.pathname + (url.search ? url.search : '');
      window.history.pushState(null, '', cleanUrl);
    }
  };

  const handleCreateTypeSelected = (type: 'text' | 'image' | 'video') => {
    setPreviousTab('new-post');
    setCreateDashboardType(type);
    let pType: PostType = 'post';
    if (type === 'video') pType = 'reel';
    setEditingPost({
      postType: pType,
      targetAccountIds: accounts.slice(0, 4).map((a) => a.id),
      media: [],
      content: '',
      platformOverrides: {},
      tags: [],
    });
    setActiveTab('create-composer');

    try {
      localStorage.setItem('postingtube_active_tab', 'create-composer');
      sessionStorage.setItem('postingtube_active_tab', 'create-composer');
      localStorage.setItem('postingtube_composer_type', type);
      sessionStorage.setItem('postingtube_composer_type', type);
    } catch (e) {}

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'create-composer');
      url.searchParams.set('type', type);
      window.history.pushState(null, '', url.pathname + url.search);
    }
  };

  const handleOpenCreateModal = (type: 'text' | 'image' | 'video' = 'image') => {
    setPreviousTab(activeTab);
    setEditingPost(null);
    setCreateDashboardType(type);
    setActiveTab('create-composer');

    try {
      localStorage.setItem('postingtube_active_tab', 'create-composer');
      sessionStorage.setItem('postingtube_active_tab', 'create-composer');
      localStorage.setItem('postingtube_composer_type', type);
      sessionStorage.setItem('postingtube_composer_type', type);
    } catch (e) {}

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'create-composer');
      url.searchParams.set('type', type);
      window.history.pushState(null, '', url.pathname + url.search);
    }
  };

  const handleBackFromComposer = () => {
    setEditingPost(null);
    const target = previousTab && previousTab !== 'create-composer' ? previousTab : 'new-post';
    handleTabChange(target);
  };

  const handleSavePost = async (
    postData: Partial<Post>,
    action: 'schedule' | 'publish-now' | 'draft'
  ) => {
    if (action === 'publish-now') {
      const tempPost: Post = {
        id: editingPost?.id || `post_${Date.now()}`,
        userId: authUser?.id,
        workspaceId: DEFAULT_WORKSPACE_ID,
        content: postData.content || '',
        media: postData.media || [],
        targetAccountIds: postData.targetAccountIds || [],
        postType: postData.postType || 'post',
        platformOverrides: postData.platformOverrides || {},
        accountOverrides: postData.accountOverrides || {},
        tags: postData.tags || [],
        collaborators: postData.collaborators,
        isAiGenerated: postData.isAiGenerated,
        musicTitle: postData.musicTitle,
        productTags: postData.productTags,
        stickers: postData.stickers,
        publishMode: postData.publishMode,
        status: 'publishing',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: {
          id: 'usr_admin',
          name: 'PostingTube Admin',
          avatar: '',
        },
      };

      const summary = await executePostPublish(tempPost, accounts);
      const finalPost: Post = {
        ...tempPost,
        status: summary.overallStatus,
        publishedAt: summary.overallStatus === 'published' ? new Date().toISOString() : undefined,
        results: summary.results,
      };

      if (editingPost?.id) {
        setPosts((prev) => prev.map((p) => (p.id === editingPost.id ? finalPost : p)));
      } else {
        setPosts((prev) => [finalPost, ...prev]);
      }
      await DatabaseService.savePost(finalPost, authUser?.id);
      if (authUser?.id) {
        const refreshed = await DatabaseService.getPosts(authUser.id);
        setPosts(refreshed);
      }
    } else {
      const newPost: Post = {
        id: editingPost?.id || `post_${Date.now()}`,
        userId: authUser?.id,
        workspaceId: DEFAULT_WORKSPACE_ID,
        content: postData.content || '',
        media: postData.media || [],
        targetAccountIds: postData.targetAccountIds || [],
        postType: postData.postType || 'post',
        platformOverrides: postData.platformOverrides || {},
        accountOverrides: postData.accountOverrides || {},
        tags: postData.tags || [],
        collaborators: postData.collaborators,
        isAiGenerated: postData.isAiGenerated,
        musicTitle: postData.musicTitle,
        productTags: postData.productTags,
        stickers: postData.stickers,
        publishMode: postData.publishMode,
        scheduledFor: action === 'schedule' ? postData.scheduledFor : undefined,
        status: action === 'schedule' ? 'scheduled' : 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: {
          id: 'usr_admin',
          name: 'Workspace Admin',
          avatar: '',
        },
      };

      if (editingPost?.id) {
        setPosts((prev) => prev.map((p) => (p.id === editingPost.id ? newPost : p)));
      } else {
        setPosts((prev) => [newPost, ...prev]);
      }
      await DatabaseService.savePost(newPost, authUser?.id);
      if (authUser?.id) {
        const refreshed = await DatabaseService.getPosts(authUser.id);
        setPosts(refreshed);
      }
    }

    setIsComposerOpen(false);
    setEditingPost(null);
  };

  const handleEditExistingPost = (post: Post) => {
    setPreviousTab(activeTab);
    setEditingPost(post);
    const pType = post.postType === 'reel' ? 'video' : post.media && post.media.length > 0 ? 'image' : 'text';
    setCreateDashboardType(pType);
    setActiveTab('create-composer');

    try {
      localStorage.setItem('postingtube_active_tab', 'create-composer');
      sessionStorage.setItem('postingtube_active_tab', 'create-composer');
      localStorage.setItem('postingtube_composer_type', pType);
      sessionStorage.setItem('postingtube_composer_type', pType);
    } catch (e) {}

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'create-composer');
      url.searchParams.set('type', pType);
      url.searchParams.set('postId', post.id);
      window.history.pushState(null, '', url.pathname + url.search);
    }
  };

  const handleDeletePost = async (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    await DatabaseService.deletePost(id, authUser?.id);
  };

  const handlePublishNow = async (post: Post) => {
    // 1. Idempotency lock: avoid duplicate execution in current browser session
    if (publishingPostIdsRef.current.has(post.id)) {
      console.warn(`[Duplicate Prevention] Post ${post.id} is already publishing. Skipping duplicate call.`);
      return;
    }
    publishingPostIdsRef.current.add(post.id);

    // 2. If Supabase is connected, attempt atomic database lock to prevent collision with server cron or other tabs
    if (supabase && post.status === 'scheduled') {
      try {
        const { data: locked, error: lockErr } = await supabase
          .from('posts')
          .update({ status: 'publishing', updated_at: new Date().toISOString() })
          .eq('id', post.id)
          .eq('status', 'scheduled')
          .select('id');

        if (lockErr || !locked || locked.length === 0) {
          // If the post was already claimed by server cron or another tab, skip execution
          console.info(`[Distributed Lock] Post ${post.id} claimed by server cron or another tab. Skipping duplicate.`);
          publishingPostIdsRef.current.delete(post.id);
          return;
        }
      } catch (dbErr) {
        console.warn('Database lock check bypassed:', dbErr);
      }
    }

    // Atomically transition status to 'publishing' immediately in React state & DB
    const inProgressPost: Post = {
      ...post,
      status: 'publishing',
      updatedAt: new Date().toISOString(),
    };
    setPosts((prev) => prev.map((p) => (p.id === post.id ? inProgressPost : p)));
    await DatabaseService.savePost(inProgressPost);

    try {
      const summary = await executePostPublish(post, accounts);
      const updated: Post = {
        ...post,
        status: summary.overallStatus,
        publishedAt: summary.overallStatus === 'published' ? new Date().toISOString() : undefined,
        results: summary.results,
        updatedAt: new Date().toISOString(),
      };
      setPosts((prev) => prev.map((p) => (p.id === post.id ? updated : p)));
      await DatabaseService.savePost(updated);
    } catch (err) {
      console.error('[Publish Error]', err);
      const failedPost: Post = {
        ...post,
        status: 'failed',
        updatedAt: new Date().toISOString(),
      };
      setPosts((prev) => prev.map((p) => (p.id === post.id ? failedPost : p)));
      await DatabaseService.savePost(failedPost);
    } finally {
      publishingPostIdsRef.current.delete(post.id);
    }
  };

  const handleReschedulePost = async (postId: string, newScheduledFor: string): Promise<boolean> => {
    try {
      const target = posts.find((p) => p.id === postId);
      if (!target) return false;
      // Do not allow published posts to be moved as if scheduled
      if (target.status === 'published') return false;

      const updated: Post = {
        ...target,
        scheduledFor: newScheduledFor,
        status: 'scheduled',
        updatedAt: new Date().toISOString(),
      };

      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
      await DatabaseService.savePost(updated);
      setSuccessToast(`Post successfully rescheduled to ${new Date(newScheduledFor).toLocaleDateString()}`);
      return true;
    } catch (err) {
      console.error('Failed to reschedule post:', err);
      return false;
    }
  };

  const handleRetryPost = async (post: Post) => {
    await handlePublishNow(post);
  };

  const handleAddAccount = async (account: SocialAccount): Promise<{ success: boolean; isDuplicate?: boolean; message?: string }> => {
    const userId = authUser?.id;
    account.userId = userId;

    // 1. Enforce backend / database duplicate protection scoped to this user
    const result = await DatabaseService.saveAccount(account, userId);

    if (result.isDuplicate) {
      setSuccessToast(result.message || 'This account is already connected.');
      return result;
    }

    // 2. Immediately refresh Connected Accounts list from database for this user
    const refreshed = await DatabaseService.getAccounts(userId);
    setAccounts(refreshed);

    // 3. Keep user on Connections page & display clear success message
    handleTabChange('connections');
    setSuccessToast('Account connected successfully!');
    return result;
  };

  const handleRemoveAccount = async (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    await DatabaseService.deleteAccount(id, authUser?.id);
  };

  const handleRefreshAccount = async (id: string) => {
    const updatedAccounts = accounts.map((a) =>
      a.id === id ? { ...a, tokenExpiresAt: new Date(Date.now() + 60 * 86400 * 1000).toISOString() } : a
    );
    setAccounts(updatedAccounts);
    const updatedAcc = updatedAccounts.find((a) => a.id === id);
    if (updatedAcc) {
      await DatabaseService.saveAccount(updatedAcc, authUser?.id);
    }
  };

  // Clean Apple auth and workspace initialization loading screen
  if (authChecking || !isLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white text-gray-900 font-sans">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shadow-sm">
            <Layers className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-500 font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-black" />
            <span>Loading your PostingTube session...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F9FAFB] overflow-hidden font-sans text-gray-900">
      {/* PostingTube Sidebar (Responsive Drawer on Mobile, Fixed on Desktop) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        openCreateModal={() => handleOpenCreateModal('image')}
        scheduledCount={scheduledCount}
        draftCount={draftCount}
        failedCount={failedCount}
        totalPostsCount={posts.length}
        authUser={authUser}
        accounts={accounts}
        selectedInsightsAccountId={selectedInsightsAccountId}
        onSelectInsightsAccount={(accId) => {
          setSelectedInsightsAccountId(accId);
          if (activeTab === 'insights' && typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', 'insights');
            if (accId && accId !== 'all') {
              url.searchParams.set('accountId', accId);
            } else {
              url.searchParams.delete('accountId');
            }
            window.history.replaceState(null, '', url.pathname + url.search);
          }
        }}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onLogoClick={handleLogoClick}
      />

      {/* Main View Area */}
      <main className="flex-1 overflow-y-auto flex flex-col relative pb-20 lg:pb-0 min-w-0">
        {/* Dynamic Success Toast Popup */}
        {successToast && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-3 px-4 sm:px-5 py-3 rounded-2xl bg-white text-gray-900 border border-gray-200 shadow-[0_16px_40px_rgba(0,0,0,0.12)] max-w-[92vw] sm:max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="text-xs font-bold text-gray-900 truncate">{successToast}</span>
            <button
              onClick={() => setSuccessToast(null)}
              className="text-gray-400 hover:text-black p-1 transition-colors ml-2 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Top Header Bar */}
        <div className="bg-white border-b border-gray-200/80 px-3 sm:px-6 py-2.5 flex items-center justify-between shrink-0 font-sans gap-2">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            {/* Hamburger Button on Mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Brand */}
            <div className="lg:hidden shrink-0">
              <PostingTubeLogo
                size="sm"
                href="/dashboard"
                onClick={(e) => {
                  e.preventDefault();
                  handleLogoClick();
                }}
                className="cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
            {authUser ? (
              <div className="flex items-center space-x-2 text-xs bg-gray-50/70 border border-gray-200/80 rounded-xl px-2.5 py-1 shadow-2xs hover:bg-gray-100/60 transition-colors max-w-[170px] sm:max-w-none">
                <UserAvatar
                  name={authUser.user_metadata?.full_name || authUser.email || 'User'}
                  avatarUrl={authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture}
                  size="sm"
                  className="ring-1 ring-emerald-500/20 shrink-0"
                />
                <span className="text-gray-800 font-semibold truncate max-w-[90px] sm:max-w-[150px]">
                  {authUser.user_metadata?.full_name || authUser.email}
                </span>
                <div className="h-3.5 w-px bg-gray-200 mx-0.5 shrink-0"></div>
                <button
                  onClick={async () => { await signOutUser(); window.location.href = '/login'; }}
                  className="text-gray-400 hover:text-rose-600 text-[11px] font-medium flex items-center space-x-1 cursor-pointer transition-colors shrink-0"
                  title="Sign out"
                >
                  <LogOut className="w-3 h-3" />
                  <span className="hidden sm:inline">Exit</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => signInWithGoogle('/dashboard')}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 active:bg-gray-100 text-gray-700 text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span className="hidden sm:inline">Sign in with Google</span>
                <span className="sm:hidden">Sign In</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1">
        {activeTab === 'new-post' && (
          <NewPostLaunchpad
            onSelectType={handleCreateTypeSelected}
            onGoToConnections={() => handleTabChange('connections')}
            connectedCount={accounts.length}
          />
        )}

        {activeTab === 'create-composer' && (
          <CreatePostDashboard
            postType={createDashboardType}
            accounts={accounts}
            initialPost={editingPost || undefined}
            onSave={async (postData, action) => {
              await handleSavePost(postData, action);
              handleTabChange('posts-all');
            }}
            onBack={handleBackFromComposer}
            onGoToConnections={() => handleTabChange('connections')}
          />
        )}

        {activeTab === 'connections' && (
          <ConnectedAccounts
            accounts={accounts}
            currentWorkspaceId={DEFAULT_WORKSPACE_ID}
            onAddAccount={handleAddAccount}
            onRemoveAccount={handleRemoveAccount}
            onRefreshAccount={handleRefreshAccount}
            onNavigateToTab={handleTabChange}
            onShowSuccessToast={(msg) => setSuccessToast(msg)}
            authUser={authUser}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            posts={posts}
            accounts={accounts}
            workspaceName="PostingTube"
            onSelectPost={handleEditExistingPost}
            onReschedulePost={handleReschedulePost}
            onNavigateToTab={(tab) => handleTabChange(tab as any)}
            openCreateModal={() => handleOpenCreateModal('image')}
            onCreateAtDate={(d) => {
              setPreviousTab('calendar');
              const dayStr = getIstDateString(d);
              const targetHour = typeof d.getHours === 'function' ? d.getHours() : 14;
              const targetMinute = typeof d.getMinutes === 'function' ? d.getMinutes() : 0;
              const hh = String(targetHour).padStart(2, '0');
              const mm = String(targetMinute).padStart(2, '0');
              const istIso = formatLocalToUtcIso(dayStr, `${hh}:${mm}`);

              setEditingPost({
                scheduledFor: istIso,
                targetAccountIds: accounts.map((a) => a.id),
                content: '',
                media: [],
                tags: [],
                postType: 'post',
                status: 'draft',
                platformOverrides: {},
                accountOverrides: {},
              } as any);
              setCreateDashboardType('image');
              setActiveTab('create-composer');
              try {
                localStorage.setItem('postingtube_active_tab', 'create-composer');
                sessionStorage.setItem('postingtube_active_tab', 'create-composer');
              } catch (e) {}
              if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                url.searchParams.set('tab', 'create-composer');
                url.searchParams.set('type', 'image');
                window.history.pushState(null, '', url.pathname + url.search);
              }
            }}
          />
        )}

        {(activeTab === 'posts-all' ||
          activeTab === 'posts-scheduled' ||
          activeTab === 'posts-posted' ||
          activeTab === 'posts-drafts' ||
          activeTab === 'posts-failed') && (
          <PostsManager
            posts={posts}
            accounts={accounts}
            workspaceId={DEFAULT_WORKSPACE_ID}
            onPostsUpdated={(updated) => setPosts(updated)}
            initialStatusFilter={
              activeTab === 'posts-scheduled'
                ? 'scheduled'
                : activeTab === 'posts-posted'
                ? 'published'
                : activeTab === 'posts-drafts'
                ? 'draft'
                : activeTab === 'posts-failed'
                ? 'failed'
                : 'all'
            }
            onEditPost={handleEditExistingPost}
            onDeletePost={handleDeletePost}
            onPublishNow={handlePublishNow}
            onRetryPost={handleRetryPost}
            openCreateModal={() => handleOpenCreateModal('image')}
          />
        )}

        {activeTab === 'analytics' && <AnalyticsView accounts={accounts} posts={posts} />}

        {activeTab === 'insights' && (
          <InsightsView
            posts={posts}
            accounts={accounts}
            workspaceId={DEFAULT_WORKSPACE_ID}
            initialSelectedAccountId={selectedInsightsAccountId}
            onPostsUpdated={(updated) => setPosts(updated)}
            onSelectPost={handleEditExistingPost}
          />
        )}

        {activeTab === 'worker-console' && (
          <BackgroundWorkerSimulator
            posts={posts}
            accounts={accounts}
            onPostUpdated={(updated) => {
              setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            }}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            currentWorkspace={INITIAL_WORKSPACES[0]}
            authUser={authUser}
            accounts={accounts}
            onRemoveAccount={handleRemoveAccount}
            onUpdateWorkspace={() => {}}
          />
        )}
        </div>
        {/* Mobile Native Bottom Navigation Bar */}
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/90 px-2 py-1 flex items-center justify-around shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
          aria-label="Mobile Navigation"
        >
          <button
            onClick={() => {
              handleTabChange('new-post');
              setIsMobileMenuOpen(false);
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
              activeTab === 'new-post' || activeTab === 'create-composer'
                ? 'text-emerald-600 font-bold'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <div
              className={`p-1 rounded-lg ${
                activeTab === 'new-post' || activeTab === 'create-composer' ? 'bg-emerald-50 text-emerald-600' : ''
              }`}
            >
              <Plus className="w-4 h-4" />
            </div>
            <span className="mt-0.5 leading-none">Create</span>
          </button>

          <button
            onClick={() => {
              handleTabChange('posts-all');
              setIsMobileMenuOpen(false);
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
              activeTab.startsWith('posts-') ? 'text-emerald-600 font-bold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab.startsWith('posts-') ? 'bg-emerald-50 text-emerald-600' : ''}`}>
              <Grid className="w-4 h-4" />
            </div>
            <span className="mt-0.5 leading-none">Posts</span>
          </button>

          <button
            onClick={() => {
              handleTabChange('calendar');
              setIsMobileMenuOpen(false);
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
              activeTab === 'calendar' ? 'text-emerald-600 font-bold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'calendar' ? 'bg-emerald-50 text-emerald-600' : ''}`}>
              <Calendar className="w-4 h-4" />
            </div>
            <span className="mt-0.5 leading-none">Calendar</span>
          </button>

          <button
            onClick={() => {
              handleTabChange('insights');
              setIsMobileMenuOpen(false);
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
              activeTab === 'insights' ? 'text-emerald-600 font-bold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'insights' ? 'bg-emerald-50 text-emerald-600' : ''}`}>
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="mt-0.5 leading-none">Insights</span>
          </button>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
              isMobileMenuOpen ? 'text-emerald-600 font-bold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <div className={`p-1 rounded-lg ${isMobileMenuOpen ? 'bg-emerald-50 text-emerald-600' : ''}`}>
              <Menu className="w-4 h-4" />
            </div>
            <span className="mt-0.5 leading-none">Menu</span>
          </button>
        </nav>
      </main>
    </div>
  );
}
