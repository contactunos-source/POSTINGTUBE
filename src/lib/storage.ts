import { Post, SocialAccount, Workspace, PostMedia } from '@/types/social';

export const INITIAL_ACCOUNTS: SocialAccount[] = [
  {
    id: 'fb_868941086292404',
    platform: 'facebook',
    username: 'unosdigitalmarketing',
    displayName: 'U NOS Digital marketing',
    avatarUrl:
      'https://scontent.fhyd14-1.fna.fbcdn.net/v/t39.30808-1/559110494_122093677857072386_1644291893333566859_n.jpg?stp=dst-jpg_s200x200_tt6&_nc_cat=106&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=f907e8&_nc_ohc=tZoTblvaavEQ7kNvwEoCgQP&_nc_oc=Adp-VJrC03UjJKc0eeWkndk_bQZPtDzqLtNVTu_efYErldQBYTFQrNsyYaDSJsqHagfB18iseyANs9DLPrcaiiPy&_nc_zt=24&_nc_ht=scontent.fhyd14-1.fna&edm=AJdBtusEAAAA&_nc_gid=SucoqeYkwX8jiJ9x6-GprA&_nc_tpa=Q5bMBQJ0aTi1Z9bXXMOqSGXbXOfKZ9TulrS_k4YePsv0_8e45yLFosLLewPqFETuRjLJNux4THkAfvVEgw&oh=00_AQP6T9kysTTUwD2oMayNWxc21earpv63aKQTdnT9Ts7htQ&oe=6ADF9E9C',
    accountType: 'page',
    status: 'connected',
    followersCount: 0,
    externalId: '868941086292404',
    pageId: '868941086292404',
    accessToken:
      'EAAc25SQTmPMBS5qCywTAtDkeRmNdEoaDKQFOrwqlVCNA1zH5VEgjv77BDWoqDZAANqqauOyi8ZBg8uyCBwe1ZCVbGy4A8dm87lPiAZCLSXvbDBBl7RuCqiZAhAdwWaDEeZC32kz1OKsptbxNjbtLkOsmsqM6CG8ftfrrZB58Giz3fT1EC1bOH0gIiX6ZAW5Ey0fCfYUMzAQi',
  },
];

export const INITIAL_MEDIA: PostMedia[] = [];

export const INITIAL_POSTS: Post[] = [];

export const INITIAL_WORKSPACES: Workspace[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'U NOS Digital Marketing',
    slug: 'unos-digital-marketing',
    role: 'owner',
    connectedAccounts: INITIAL_ACCOUNTS,
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
    const isDefault = !workspaceId || workspaceId === '00000000-0000-0000-0000-000000000001';
    if (typeof window === 'undefined') return isDefault ? INITIAL_ACCOUNTS : [];
    const key = workspaceId ? `${STORAGE_KEYS.ACCOUNTS}_${workspaceId}` : STORAGE_KEYS.ACCOUNTS;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
      return isDefault ? INITIAL_ACCOUNTS : [];
    } catch {
      return isDefault ? INITIAL_ACCOUNTS : [];
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
    if (typeof window === 'undefined') return INITIAL_POSTS;
    const key = workspaceId ? `${STORAGE_KEYS.POSTS}_${workspaceId}` : STORAGE_KEYS.POSTS;
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return INITIAL_POSTS;
      const parsed: Post[] = JSON.parse(stored);
      return parsed.map((p) => ({
        ...p,
        media: (p.media || []).map((m) => ({
          ...m,
          thumbnailUrl: m.thumbnailUrl && !m.thumbnailUrl.startsWith('blob:') ? m.thumbnailUrl : m.url,
        })),
      }));
    } catch {
      return INITIAL_POSTS;
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
    if (typeof window === 'undefined') return INITIAL_MEDIA;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MEDIA);
      return stored ? JSON.parse(stored) : INITIAL_MEDIA;
    } catch {
      return INITIAL_MEDIA;
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
