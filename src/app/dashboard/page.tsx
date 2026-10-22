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
import { Post, SocialAccount, Workspace, PostMedia, PostType } from '@/types/social';
import { executePostPublish } from '@/lib/publisher';
import { supabase, signInWithGoogle, signOutUser, getGuestUser } from '@/lib/supabase';
import { Globe, ArrowLeft, LogOut, ShieldCheck, Sparkles, Loader2, Layers } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(INITIAL_WORKSPACES);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(INITIAL_WORKSPACES[0]);
  const [accounts, setAccounts] = useState<SocialAccount[]>(INITIAL_ACCOUNTS);
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [mediaItems, setMediaItems] = useState<PostMedia[]>(INITIAL_MEDIA);
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

  // Auth State Guard: Redirects unauthenticated users to /login
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      // 1. Check guest demo session first
      const guest = getGuestUser();
      if (guest) {
        if (isMounted) {
          setAuthUser(guest);
          setAuthChecking(false);
          initUserData(guest);
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
              setAuthChecking(false);
              initUserData(session.user);
            }
            return;
          }
        } catch (e) {
          console.warn('Session check warning:', e);
        }

        // Listen for auth change
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!isMounted) return;
          if (session?.user) {
            setAuthUser(session.user);
            setAuthChecking(false);
            initUserData(session.user);
          } else {
            // Not authenticated -> redirect
            window.location.href = '/login?redirectTo=/dashboard';
          }
        });

        // If no session found right now, enforce protected route redirect
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!currentSession && !getGuestUser()) {
          window.location.href = '/login?redirectTo=/dashboard';
          return;
        }

        return () => {
          listener.subscription.unsubscribe();
        };
      } else {
        // Fallback demo mode if supabase client not loaded
        const fallbackGuest = {
          id: 'usr_guest_demo',
          email: 'demo@postbridge.ai',
          user_metadata: { full_name: 'Demo Creator' },
        };
        if (isMounted) {
          setAuthUser(fallbackGuest);
          setAuthChecking(false);
          initUserData(fallbackGuest);
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
      if (
        params.get('tab') === 'connections' ||
        params.get('fb_connect_success') === 'true' ||
        params.get('error')
      ) {
        setActiveTab('connections');
      }
    }
  }, []);

  // Active Publishing Daemon for Scheduled Posts
  // Automatically monitors and publishes due posts every 10 seconds
  useEffect(() => {
    if (!isLoaded || accounts.length === 0) return;

    const schedulerTimer = setInterval(async () => {
      const now = new Date();
      const duePosts = posts.filter(
        (p) => p.status === 'scheduled' && p.scheduledFor && new Date(p.scheduledFor) <= now
      );

      for (const duePost of duePosts) {
        await handlePublishNow(duePost);
      }
    }, 10000);

    return () => clearInterval(schedulerTimer);
  }, [isLoaded, posts, accounts]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('new-post');
  const [createDashboardType, setCreateDashboardType] = useState<'text' | 'image' | 'video'>('text');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Partial<Post> | null>(null);

  // AI Assistant modal state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiInitialPrompt, setAiInitialPrompt] = useState('');
  const [onAiInsertCallback, setOnAiInsertCallback] = useState<((text: string) => void) | null>(null);

  // Counts
  const scheduledCount = posts.filter((p) => p.status === 'scheduled').length;
  const draftCount = posts.filter((p) => p.status === 'draft').length;
  const failedCount = posts.filter((p) => p.status === 'failed').length;

  const handleOpenAiModal = (prompt: string, onGenerated: (caption: string) => void) => {
    setAiInitialPrompt(prompt);
    setOnAiInsertCallback(() => onGenerated);
    setIsAiModalOpen(true);
  };

  const handleCreateTypeSelected = (type: 'text' | 'image' | 'video') => {
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
    setEditingPost(post);
    setCreateDashboardType(post.postType === 'reel' ? 'video' : post.media && post.media.length > 0 ? 'image' : 'text');
    setActiveTab('create-composer');
  };

  const handleDeletePost = async (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    await DatabaseService.deletePost(id, currentWorkspace.id);
  };

  const handlePublishNow = async (post: Post) => {
    const summary = await executePostPublish(post, accounts);
    const updated: Post = {
      ...post,
      status: summary.overallStatus,
      publishedAt: summary.overallStatus === 'published' ? new Date().toISOString() : undefined,
      results: summary.results,
    };
    setPosts((prev) => prev.map((p) => (p.id === post.id ? updated : p)));
    await DatabaseService.savePost(updated);
  };

  const handleRetryPost = async (post: Post) => {
    await handlePublishNow(post);
  };

  const handleAddAccount = async (account: SocialAccount) => {
    setAccounts([...accounts, account]);
    await DatabaseService.saveAccount(account, currentWorkspace.id);
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

  // Clean Apple auth checking screen
  if (authChecking) {
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
        setActiveTab={setActiveTab}
        currentWorkspace={currentWorkspace}
        workspaces={workspaces}
        onSelectWorkspace={setCurrentWorkspace}
        openCreateModal={() => {
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
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Top Header Bar with Workspace, Scheduler status, and Supabase Google Login */}
        <div className="bg-white border-b border-gray-200/80 px-6 py-2.5 flex items-center justify-between shrink-0 font-sans">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-gray-800">{currentWorkspace.name}</span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-100 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Publishing Scheduler Active</span>
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Link back to public landing page */}
            <Link
              href="/"
              className="text-xs text-gray-500 hover:text-gray-900 flex items-center space-x-1 font-medium transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-gray-400" />
              <span>Landing Page</span>
            </Link>

            <div className="h-4 w-px bg-gray-200"></div>

            {authUser ? (
              <div className="flex items-center space-x-2.5 text-xs">
                {authUser.user_metadata?.avatar_url ? (
                  <img
                    src={authUser.user_metadata.avatar_url}
                    alt="avatar"
                    className="w-5 h-5 rounded-full object-cover ring-1 ring-emerald-500/30"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                    {authUser.email?.substring(0, 2).toUpperCase() || 'US'}
                  </div>
                )}
                <span className="text-gray-700 font-semibold max-w-[150px] truncate">
                  {authUser.user_metadata?.full_name || authUser.email}
                </span>
                <button
                  onClick={() => signOutUser().then(() => { window.location.href = '/'; })}
                  className="text-gray-400 hover:text-rose-600 text-[11px] font-medium flex items-center space-x-1 ml-1 cursor-pointer transition-colors"
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
            onBack={() => {
              setEditingPost(null);
              setActiveTab('posts-all');
            }}
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
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            posts={posts}
            accounts={accounts}
            onSelectPost={handleEditExistingPost}
            onCreateAtDate={(d) => {
              setEditingPost({
                scheduledFor: d.toISOString(),
                targetAccountIds: accounts.slice(0, 4).map((a) => a.id),
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
          onInsert={(caption) => {
            if (onAiInsertCallback) {
              onAiInsertCallback(caption);
            }
            setIsAiModalOpen(false);
          }}
          onClose={() => setIsAiModalOpen(false)}
        />
      )}
    </div>
  );
}
