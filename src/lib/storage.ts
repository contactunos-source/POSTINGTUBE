import { Post, SocialAccount, Workspace, PostMedia } from '@/types/social';

export const INITIAL_ACCOUNTS: SocialAccount[] = [];

export const INITIAL_MEDIA: PostMedia[] = [];

export const INITIAL_POSTS: Post[] = [];

export const INITIAL_WORKSPACES: Workspace[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'PostingTube',
    slug: 'postingtube',
    role: 'owner',
    connectedAccounts: [],
  },
];

// Local storage keys for persistent browser session
const STORAGE_KEYS = {
  ACCOUNTS: 'pb_accounts_v3',
  POSTS: 'pb_posts_v3',
  MEDIA: 'pb_media_v3',
  WORKSPACES: 'pb_workspaces_v3',
  ACTIVE_WORKSPACE: 'pb_active_workspace_id',
};

export const StorageService = {
  getWorkspaces(userId?: string): Workspace[] {
    return INITIAL_WORKSPACES;
  },

  saveWorkspaces(workspaces: Workspace[], userId?: string) {
    // No-op
  },

  getActiveWorkspaceId(): string | null {
    return '00000000-0000-0000-0000-000000000001';
  },

  setActiveWorkspaceId(id: string) {
    // No-op
  },

  getAccounts(workspaceId?: string): SocialAccount[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((a) => a.platform !== 'twitter' && a.id !== 'tw_primary_account');
    } catch {
      return [];
    }
  },

  saveAccounts(accounts: SocialAccount[], workspaceId?: string) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
      // Clean up legacy workspace-specific account keys so stale deleted accounts never resurface
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith(STORAGE_KEYS.ACCOUNTS + '_') || key === 'pb_accounts' || key === 'pb_accounts_v2')) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.error('Failed to save accounts to localStorage', e);
    }
  },

  getPosts(workspaceId?: string): Post[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.POSTS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((p: any) => ({
        ...p,
        media: (p.media || []).map((m: PostMedia) => ({
          ...m,
          thumbnailUrl: m.thumbnailUrl && !m.thumbnailUrl.startsWith('blob:') ? m.thumbnailUrl : m.url,
        })),
      }));
    } catch {
      return [];
    }
  },

  savePosts(posts: Post[], workspaceId?: string) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
      // Clean up legacy workspace-specific post keys so stale deleted posts never resurface
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith(STORAGE_KEYS.POSTS + '_') || key === 'pb_posts' || key === 'pb_posts_v2')) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.error('Failed to save posts to localStorage', e);
    }
  },

  getMedia(): PostMedia[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MEDIA);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  saveMedia(media: PostMedia[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(media));
    } catch (e) {
      console.error('Failed to save media to localStorage', e);
    }
  },
};
