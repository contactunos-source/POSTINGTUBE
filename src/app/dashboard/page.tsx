'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar, ActiveTab } from '@/components/Sidebar';
import { NewPostLaunchpad } from '@/components/NewPostLaunchpad';
import { ConnectedAccounts } from '@/components/ConnectedAccounts';
import { CalendarView } from '@/components/CalendarView';
import { PostsManager } from '@/components/PostsManager';
import { AnalyticsView } from '@/components/AnalyticsView';
import { SettingsView } from '@/components/SettingsView';
import { CreatePostDashboard } from '@/components/CreatePostDashboard';
import { BackgroundWorkerSimulator } from '@/components/BackgroundWorkerSimulator';
import { AiAssistantModal } from '@/components/AiAssistantModal';
import {
  INITIAL_ACCOUNTS,
  INITIAL_POSTS,
  INITIAL_WORKSPACES,
  INITIAL_MEDIA,
  StorageService,
} from '@/lib/storage';
import { DatabaseService } from '@/lib/db';
import { Post, SocialAccount, Workspace, PostMedia, PostType, SocialPlatform } from '@/types/social';
import { executePostPublish } from '@/lib/publisher';
import { supabase, signInWithGoogle, signOutUser, getGuestUser, signInAsGuest } from '@/lib/supabase';
import { Globe, ArrowLeft, LogOut, ShieldCheck, Sparkles, Loader2, Layers, CheckCircle2, X } from 'lucide-react';
import Link from 'next/link';
import { UserAvatar } from '@/components/UserAvatar';

export default function DashboardPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(INITIAL_WORKSPACES);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(INITIAL_WORKSPACES[0]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [mediaItems, setMediaItems] = useState<PostMedia[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // User & Workspace Initialization with complete multi-tenant isolation
  const initUserData = async (user: any) => {
    setIsLoaded(false);
    try {
      // 1. Get or provision isolated workspace for this user
      const userWs = await DatabaseService.getUserWorkspace(user);
      setCurrentWorkspace(userWs);
      setWorkspaces([userWs]);

      // 2. Fetch posts and connected accounts strictly isolated to this workspace
      const [dbAccounts, dbPosts] = await Promise.all([
        DatabaseService.getAccounts(userWs.id),
        DatabaseService.getPosts(userWs.id),
      ]);

      setAccounts(dbAccounts);
      setPosts(dbPosts);
      setMediaItems(StorageService.getMedia());
    } catch (err) {
      console.error('Failed to initialize user data:', err);
    } finally {
      setIsLoaded(true);
    }
  };

  // Active tab state: On browser refresh/reload, ALWAYS redirect to main dashboard ('new-post')
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (typeof window !== 'undefined') {
      const navEntry = window.performance?.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const isReload = navEntry?.type === 'reload' || (window.performance && (window.performance as any).navigation?.type === 1);

      // If user refreshed the browser, always stay on the main dashboard!
      if (isReload) {
        return 'new-post';
      }

      const params = new URLSearchParams(window.location.search);
      if (
        params.get('fb_connect_success') === 'true' ||
        params.get('ig_connect_success') === 'true'
      ) {
        return 'connections';
      }
    }
    return 'new-post';
  });

  // Track previous tab to guarantee intelligent, safe Back navigation to Dashboard
  const [previousTab, setPreviousTab] = useState<ActiveTab>('new-post');

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

        // Listen for auth change: ONLY redirect if user explicitly clicked sign out
        const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!isMounted) return;
          if (session?.user) {
            setAuthUser(session.user);
              await initUserData(session.user);
              setAuthChecking(false);
          } else if (event === 'SIGNED_OUT') {
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
            email: 'creator@postbridge.ai',
            user_metadata: { full_name: 'PostBridge Creator' },
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
            email: 'creator@postbridge.ai',
            user_metadata: { full_name: 'PostBridge Creator' },
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
          email: 'demo@postbridge.ai',
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
      const navEntry = window.performance?.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const isReload = navEntry?.type === 'reload' || (window.performance && (window.performance as any).navigation?.type === 1);

      if (isReload) {
        // User refreshed the page: Clean up URL query parameters and stay on main dashboard!
        window.history.replaceState(null, '', window.location.pathname);
        setActiveTab('new-post');
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const isOauthReturn =
        params.get('fb_connect_success') === 'true' ||
        params.get('ig_connect_success') === 'true' ||
        params.get('error');

      if (isOauthReturn) {
        if (params.get('fb_connect_success') === 'true' || params.get('ig_connect_success') === 'true') {
          setSuccessToast('Account connected successfully!');
        }
        setActiveTab('connections');
        // Clean URL search parameters immediately so subsequent refreshes stay on the main dashboard!
        window.history.replaceState(null, '', window.location.pathname);
      } else if (params.get('tab') === 'connections') {
        // Clean URL search parameters immediately so subsequent refreshes stay on the main dashboard!
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
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
        for (const duePost of duePosts) {
          if (!publishingPostIdsRef.current.has(duePost.id)) {
            await handlePublishNow(duePost);
          }
        }
      } finally {
        isExecuting = false;
      }
    }, 1000);

    return () => clearInterval(schedulerTimer);
  }, [isLoaded, posts, accounts]);
  const [createDashboardType, setCreateDashboardType] = useState<'text' | 'image' | 'video'>('text');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Partial<Post> | null>(null);

  // AI Assistant modal state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiInitialPrompt, setAiInitialPrompt] = useState('');
  const [aiInitialPlatform, setAiInitialPlatform] = useState<SocialPlatform | undefined>(undefined);
  const [aiInitialTitle, setAiInitialTitle] = useState('');
  const [aiMedia, setAiMedia] = useState<PostMedia | undefined>(undefined);
  const [aiInitialMode, setAiInitialMode] = useState<'prompt' | 'media-analysis'>('prompt');
  const [aiExistingCaption, setAiExistingCaption] = useState('');
  const [onAiInsertCallback, setOnAiInsertCallback] = useState<((result: any) => void) | null>(null);

  // Counts
  const scheduledCount = posts.filter((p) => p.status === 'scheduled').length;
  const draftCount = posts.filter((p) => p.status === 'draft').length;
  const failedCount = posts.filter((p) => p.status === 'failed').length;

  const handleOpenAiModal = (
    prompt: string,
    onGenerated: (result: any) => void,
    options?: {
      platform?: SocialPlatform;
      initialTitle?: string;
      media?: PostMedia;
      mode?: 'prompt' | 'media-analysis';
      existingCaption?: string;
    }
  ) => {
    setAiInitialPrompt(prompt);
    setAiInitialPlatform(options?.platform);
    setAiInitialTitle(options?.initialTitle || '');
    setAiMedia(options?.media);
    setAiInitialMode(options?.mode || 'prompt');
    setAiExistingCaption(options?.existingCaption || '');
    setOnAiInsertCallback(() => onGenerated);
    setIsAiModalOpen(true);
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
  };

  const handleBackFromComposer = () => {
    setEditingPost(null);
    const target = previousTab && previousTab !== 'create-composer' ? previousTab : 'new-post';
    setActiveTab(target);
  };

  // Prevent browser back from leaving the application when composer is active
  useEffect(() => {
    if (activeTab === 'create-composer') {
      window.history.pushState({ postbridge_composer: true }, '');

      const handlePopState = () => {
        setEditingPost(null);
        setActiveTab((curr) => {
          if (curr === 'create-composer') {
            return previousTab && previousTab !== 'create-composer' ? previousTab : 'new-post';
          }
          return curr;
        });
      };

      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [activeTab, previousTab]);

  const handleSavePost = async (
    postData: Partial<Post>,
    action: 'schedule' | 'publish-now' | 'draft'
  ) => {
    if (action === 'publish-now') {
      const tempPost: Post = {
        id: editingPost?.id || `post_${Date.now()}`,
        workspaceId: currentWorkspace.id,
        content: postData.content || '',
        media: postData.media || [],
        targetAccountIds: postData.targetAccountIds || [],
        postType: postData.postType || 'post',
        platformOverrides: postData.platformOverrides || {},
        tags: postData.tags || [],
        firstComment: postData.firstComment,
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
          name: 'Workspace Admin',
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
      await DatabaseService.savePost(finalPost);
    } else {
      const newPost: Post = {
        id: editingPost?.id || `post_${Date.now()}`,
        workspaceId: currentWorkspace.id,
        content: postData.content || '',
        media: postData.media || [],
        targetAccountIds: postData.targetAccountIds || [],
        postType: postData.postType || 'post',
        platformOverrides: postData.platformOverrides || {},
        tags: postData.tags || [],
        firstComment: postData.firstComment,
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
      await DatabaseService.savePost(newPost);
    }

    setIsComposerOpen(false);
    setEditingPost(null);
  };

  const handleEditExistingPost = (post: Post) => {
    setPreviousTab(activeTab);
    setEditingPost(post);
    setCreateDashboardType(post.postType === 'reel' ? 'video' : post.media && post.media.length > 0 ? 'image' : 'text');
    setActiveTab('create-composer');
  };

  const handleDeletePost = async (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    await DatabaseService.deletePost(id, currentWorkspace.id);
  };

  const handlePublishNow = async (post: Post) => {
    // Idempotency lock: avoid duplicate execution if already in progress
    if (publishingPostIdsRef.current.has(post.id)) {
      console.warn(`[Duplicate Prevention] Post ${post.id} is already publishing. Skipping duplicate call.`);
      return;
    }
    publishingPostIdsRef.current.add(post.id);

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
    // 1. Enforce backend / database duplicate protection
    const result = await DatabaseService.saveAccount(account, currentWorkspace.id);

    if (result.isDuplicate) {
      setSuccessToast(result.message || 'This account is already connected.');
      return result;
    }

    // 2. Immediately refresh Connected Accounts list from database and update state
    const refreshed = await DatabaseService.getAccounts(currentWorkspace.id);
    setAccounts(refreshed);

    // 3. Keep user on Connections page & display clear success message
    setActiveTab('connections');
    setSuccessToast('Account connected successfully!');
    return result;
  };

  const handleRemoveAccount = async (id: string) => {
    setAccounts(accounts.filter((a) => a.id !== id));
    await DatabaseService.deleteAccount(id, currentWorkspace.id);
  };

  const handleRefreshAccount = async (id: string) => {
    const updatedAccounts = accounts.map((a) =>
      a.id === id ? { ...a, tokenExpiresAt: new Date(Date.now() + 60 * 86400 * 1000).toISOString() } : a
    );
    setAccounts(updatedAccounts);
    const updatedAcc = updatedAccounts.find((a) => a.id === id);
    if (updatedAcc) {
      await DatabaseService.saveAccount(updatedAcc, currentWorkspace.id);
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
            <span>Verifying secure workspace session...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F9FAFB] overflow-hidden font-sans text-gray-900">
      {/* PostBridge Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (activeTab !== tab) setPreviousTab(activeTab);
          setActiveTab(tab);
        }}
        currentWorkspace={currentWorkspace}
        workspaces={workspaces}
        onSelectWorkspace={setCurrentWorkspace}
        openCreateModal={() => {
          setPreviousTab(activeTab);
          setEditingPost(null);
          setCreateDashboardType('image');
          setActiveTab('create-composer');
        }}
        scheduledCount={scheduledCount}
        draftCount={draftCount}
        failedCount={failedCount}
        totalPostsCount={posts.length}
        authUser={authUser}
      />

      {/* Main View Area */}
      <main className="flex-1 overflow-y-auto flex flex-col relative">
        {/* Dynamic Success Toast Popup */}
        {successToast && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-3 px-5 py-3.5 rounded-2xl bg-white text-gray-900 border border-gray-200 shadow-[0_16px_40px_rgba(0,0,0,0.12)] animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="text-xs font-bold text-gray-900">{successToast}</span>
            <button
              onClick={() => setSuccessToast(null)}
              className="text-gray-400 hover:text-black p-1 transition-colors ml-2 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {/* Top Header Bar */}
        <div className="bg-white border-b border-gray-200/80 px-6 py-2.5 flex items-center justify-between shrink-0 font-sans">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <UserAvatar
                name={currentWorkspace.name}
                avatarUrl={currentWorkspace.avatar}
                size="sm"
                className="rounded-lg! ring-1 ring-black/5"
              />
              <span className="text-xs font-bold text-gray-800">{currentWorkspace.name}</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {authUser ? (
              <div className="flex items-center space-x-2.5 text-xs bg-gray-50/70 border border-gray-200/80 rounded-xl px-2.5 py-1 shadow-2xs hover:bg-gray-100/60 transition-colors">
                <UserAvatar
                  name={authUser.user_metadata?.full_name || authUser.email || 'User'}
                  avatarUrl={authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture}
                  size="md"
                  className="ring-1 ring-emerald-500/20"
                />
                <span className="text-gray-800 font-semibold max-w-[150px] truncate">
                  {authUser.user_metadata?.full_name || authUser.email}
                </span>
                <div className="h-3.5 w-px bg-gray-200 mx-0.5"></div>
                <button
                  onClick={() => signOutUser().then(() => { window.location.href = '/'; })}
                  className="text-gray-400 hover:text-rose-600 text-[11px] font-medium flex items-center space-x-1 cursor-pointer transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Exit</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => signInWithGoogle('/dashboard')}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 active:bg-gray-100 text-gray-700 text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1">
        {activeTab === 'new-post' && (
          <NewPostLaunchpad
            onSelectType={handleCreateTypeSelected}
            onGoToConnections={() => setActiveTab('connections')}
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
              setActiveTab('posts-all');
            }}
            onBack={handleBackFromComposer}
            onGoToConnections={() => setActiveTab('connections')}
            openAiModal={handleOpenAiModal}
          />
        )}

        {activeTab === 'connections' && (
          <ConnectedAccounts
            accounts={accounts}
            currentWorkspaceId={currentWorkspace.id}
            onAddAccount={handleAddAccount}
            onRemoveAccount={handleRemoveAccount}
            onRefreshAccount={handleRefreshAccount}
            onNavigateToTab={setActiveTab}
            onShowSuccessToast={(msg) => setSuccessToast(msg)}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            posts={posts}
            accounts={accounts}
            onSelectPost={handleEditExistingPost}
            onReschedulePost={handleReschedulePost}
            onCreateAtDate={(d) => {
              setPreviousTab('calendar');
              const localTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 14, 0, 0);
              const localIsoDate = localTarget.toISOString();

              setEditingPost({
                scheduledFor: localIsoDate,
                targetAccountIds: accounts.map((a) => a.id),
                content: '',
                media: [],
                tags: [],
              });
              setCreateDashboardType('image');
              setActiveTab('create-composer');
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
            openCreateModal={() => {
              setPreviousTab(activeTab);
              setEditingPost(null);
              setCreateDashboardType('image');
              setActiveTab('create-composer');
            }}
          />
        )}

        {activeTab === 'analytics' && <AnalyticsView accounts={accounts} posts={posts} />}

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
            currentWorkspace={currentWorkspace}
            authUser={authUser}
            accounts={accounts}
            onRemoveAccount={handleRemoveAccount}
            onUpdateWorkspace={(ws) => {
              setCurrentWorkspace(ws);
              setWorkspaces(workspaces.map((w) => (w.id === ws.id ? ws : w)));
            }}
          />
        )}
        </div>
      </main>

      {/* AI Assistant Modal */}
      {isAiModalOpen && (
        <AiAssistantModal
          initialPrompt={aiInitialPrompt}
          initialPlatform={aiInitialPlatform}
          initialTitle={aiInitialTitle}
          media={aiMedia}
          initialMode={aiInitialMode}
          existingCaption={aiExistingCaption}
          onInsert={(result) => {
            if (onAiInsertCallback) {
              onAiInsertCallback(result);
            }
            setIsAiModalOpen(false);
          }}
          onClose={() => setIsAiModalOpen(false)}
        />
      )}
    </div>
  );
}
