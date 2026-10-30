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

function getUserSuffix(userId?: string): string {
  if (!userId) return 'guest';
  return userId.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export const StorageService = {
  getAccountKey(userId?: string): string {
    return `pb_accounts_v4_${getUserSuffix(userId)}`;
  },

  getPostKey(userId?: string): string {
    return `pb_posts_v4_${getUserSuffix(userId)}`;
  },

  getMediaKey(userId?: string): string {
    return `pb_media_v4_${getUserSuffix(userId)}`;
  },

  clearAllUserCaches(): void {
    if (typeof window === 'undefined') return;
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('pb_') || k.startsWith('postingtube_'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch (e) {
      console.warn('Storage cleanup warning:', e);
    }
  },

  clearUserData(userId: string): void {
    if (typeof window === 'undefined') return;
    try {
      const suffix = getUserSuffix(userId);
      localStorage.removeItem(`pb_accounts_v4_${suffix}`);
      localStorage.removeItem(`pb_posts_v4_${suffix}`);
      localStorage.removeItem(`pb_media_v4_${suffix}`);
      localStorage.removeItem(`pb_active_tab_${suffix}`);
    } catch (e) {}
  },

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

  getAccounts(userId?: string): SocialAccount[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.getAccountKey(userId));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((a) => a.platform !== 'twitter' && a.id !== 'tw_primary_account');
    } catch {
      return [];
    }
  },

  saveAccounts(accounts: SocialAccount[], userId?: string) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.getAccountKey(userId), JSON.stringify(accounts));
      // Purge legacy non-isolated keys to eliminate data leaks
      localStorage.removeItem('pb_accounts_v3');
      localStorage.removeItem('pb_accounts');
      localStorage.removeItem('pb_accounts_v2');
    } catch (e) {
      console.error('Failed to save accounts to localStorage', e);
    }
  },

  getPosts(userId?: string): Post[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.getPostKey(userId));
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

  savePosts(posts: Post[], userId?: string) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.getPostKey(userId), JSON.stringify(posts));
      // Purge legacy non-isolated keys to eliminate data leaks
      localStorage.removeItem('pb_posts_v3');
      localStorage.removeItem('pb_posts');
      localStorage.removeItem('pb_posts_v2');
    } catch (e) {
      console.error('Failed to save posts to localStorage', e);
    }
  },

  getMedia(userId?: string): PostMedia[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(this.getMediaKey(userId));
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  saveMedia(media: PostMedia[], userId?: string) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.getMediaKey(userId), JSON.stringify(media));
      localStorage.removeItem('pb_media_v3');
    } catch (e) {
      console.error('Failed to save media to localStorage', e);
    }
  },
};
