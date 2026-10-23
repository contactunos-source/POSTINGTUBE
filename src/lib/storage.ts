import { Post, SocialAccount, Workspace, PostMedia } from '@/types/social';

export const INITIAL_ACCOUNTS: SocialAccount[] = [];

export const INITIAL_MEDIA: PostMedia[] = [];

export const INITIAL_POSTS: Post[] = [];

export const INITIAL_WORKSPACES: Workspace[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'My Workspace',
    slug: 'my-workspace',
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
};

export const StorageService = {
  getAccounts(workspaceId?: string): SocialAccount[] {
    if (typeof window === 'undefined') return [];
    const key = workspaceId ? `${STORAGE_KEYS.ACCOUNTS}_${workspaceId}` : STORAGE_KEYS.ACCOUNTS;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Permanently filter out any Twitter accounts
          const filtered = parsed.filter(
            (a) => a.platform !== 'twitter' && a.id !== 'tw_primary_account'
          );
          if (filtered.length !== parsed.length) {
            localStorage.setItem(key, JSON.stringify(filtered));
          }
          return filtered;
        }
      }
      return [];
    } catch {
      return [];
    }
  },
  saveAccounts(accounts: SocialAccount[], workspaceId?: string) {
    if (typeof window === 'undefined') return;
    const key = workspaceId ? `${STORAGE_KEYS.ACCOUNTS}_${workspaceId}` : STORAGE_KEYS.ACCOUNTS;
    try {
      localStorage.setItem(key, JSON.stringify(accounts));
    } catch (e) {
      console.error('Failed to save accounts to localStorage', e);
    }
  },

  getPosts(workspaceId?: string): Post[] {
    if (typeof window === 'undefined') return [];
    const key = workspaceId ? `${STORAGE_KEYS.POSTS}_${workspaceId}` : STORAGE_KEYS.POSTS;
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return [];
      const parsed: Post[] = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((p) => ({
        ...p,
        media: (p.media || []).map((m) => ({
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
    const key = workspaceId ? `${STORAGE_KEYS.POSTS}_${workspaceId}` : STORAGE_KEYS.POSTS;
    try {
      localStorage.setItem(key, JSON.stringify(posts));
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
