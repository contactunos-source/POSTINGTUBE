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
    if (typeof window === 'undefined') return INITIAL_WORKSPACES;
    return INITIAL_WORKSPACES;
  },

  saveWorkspaces(workspaces: Workspace[], userId?: string) {
    // No-op: workspaces removed
  },

  getActiveWorkspaceId(): string | null {
    return '00000000-0000-0000-0000-000000000001';
  },

  setActiveWorkspaceId(id: string) {
    // No-op: workspaces removed
  },

  getAccounts(workspaceId?: string): SocialAccount[] {
    if (typeof window === 'undefined') return [];
    try {
      const allAccounts: SocialAccount[] = [];
      const seenIds = new Set<string>();

      // 1. Check primary accounts storage key
      const primaryRaw = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      if (primaryRaw) {
        try {
          const parsed = JSON.parse(primaryRaw);
          if (Array.isArray(parsed)) {
            for (const a of parsed) {
              if (a && a.id && !seenIds.has(a.id)) {
                seenIds.add(a.id);
                allAccounts.push(a);
              }
            }
          }
        } catch {}
      }

      // 2. Safely scan and migrate all previous workspace-isolated account keys
      const prefix = STORAGE_KEYS.ACCOUNTS + '_';
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                for (const a of list) {
                  if (a && a.id && !seenIds.has(a.id)) {
                    seenIds.add(a.id);
                    allAccounts.push(a);
                  }
                }
              }
            }
          } catch {}
        }
      }

      // Filter out twitter permanently
      const filtered = allAccounts.filter(
        (a) => a.platform !== 'twitter' && a.id !== 'tw_primary_account'
      );

      // Persist unified accounts back to primary key
      if (filtered.length > 0) {
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(filtered));
      }

      return filtered;
    } catch {
      return [];
    }
  },

  saveAccounts(accounts: SocialAccount[], workspaceId?: string) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
      if (workspaceId) {
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS + '_' + workspaceId, JSON.stringify(accounts));
      }
    } catch (e) {
      console.error('Failed to save accounts to localStorage', e);
    }
  },

  getPosts(workspaceId?: string): Post[] {
    if (typeof window === 'undefined') return [];
    try {
      const allPosts: Post[] = [];
      const seenIds = new Set<string>();

      // 1. Primary posts key
      const primaryRaw = localStorage.getItem(STORAGE_KEYS.POSTS);
      if (primaryRaw) {
        try {
          const parsed = JSON.parse(primaryRaw);
          if (Array.isArray(parsed)) {
            for (const p of parsed) {
              if (p && p.id && !seenIds.has(p.id)) {
                seenIds.add(p.id);
                allPosts.push(p);
              }
            }
          }
        } catch {}
      }

      // 2. Safely scan and migrate all previous workspace-isolated post keys
      const prefix = STORAGE_KEYS.POSTS + '_';
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                for (const p of list) {
                  if (p && p.id && !seenIds.has(p.id)) {
                    seenIds.add(p.id);
                    allPosts.push(p);
                  }
                }
              }
            }
          } catch {}
        }
      }

      const formatted = allPosts.map((p) => ({
        ...p,
        media: (p.media || []).map((m) => ({
          ...m,
          thumbnailUrl: m.thumbnailUrl && !m.thumbnailUrl.startsWith('blob:') ? m.thumbnailUrl : m.url,
        })),
      }));

      // Persist unified posts back to primary key
      if (formatted.length > 0) {
        localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(formatted));
      }

      return formatted;
    } catch {
      return [];
    }
  },

  savePosts(posts: Post[], workspaceId?: string) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
      if (workspaceId) {
        localStorage.setItem(STORAGE_KEYS.POSTS + '_' + workspaceId, JSON.stringify(posts));
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
