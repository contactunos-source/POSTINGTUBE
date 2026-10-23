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
    followersCount: 120,
    externalId: '868941086292404',
    pageId: '868941086292404',
    accessToken:
      'EAAc25SQTmPMBS5qCywTAtDkeRmNdEoaDKQFOrwqlVCNA1zH5VEgjv77BDWoqDZAANqqauOyi8ZBg8uyCBwe1ZCVbGy4A8dm87lPiAZCLSXvbDBBl7RuCqiZAhAdwWaDEeZC32kz1OKsptbxNjbtLkOsmsqM6CG8ftfrrZB58Giz3fT1EC1bOH0gIiX6ZAW5Ey0fCfYUMzAQi',
  },
  {
    id: 'ig_2116988269210142',
    platform: 'instagram',
    username: 'unosdigitalmarketing',
    displayName: 'U NOS Digital (Instagram)',
    avatarUrl:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
    accountType: 'business',
    status: 'connected',
    followersCount: 1420,
    externalId: '2116988269210142',
  },
  {
    id: 'yt_primary_channel',
    platform: 'youtube',
    username: 'unosmedia',
    displayName: 'U NOS Media (YouTube)',
    avatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    accountType: 'channel',
    status: 'connected',
    followersCount: 3890,
    externalId: 'yt_unos_media',
  },
  {
    id: 'tw_primary_account',
    platform: 'twitter',
    username: 'unosdigital',
    displayName: 'U NOS Digital (X)',
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    accountType: 'profile',
    status: 'connected',
    followersCount: 2450,
    externalId: 'tw_unos_digital',
  },
];

export const INITIAL_MEDIA: PostMedia[] = [
  {
    id: 'media_sample_1',
    name: 'tech_product_launch.jpg',
    url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
    type: 'image',
  },
  {
    id: 'media_sample_2',
    name: 'digital_growth_chart.jpg',
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
    type: 'image',
  },
];

// Realistic seeded posts spanning dates: 21st, 22nd, 23rd, 24th, 25th
export const INITIAL_POSTS: Post[] = [
  {
    id: 'post_seed_21',
    workspaceId: '00000000-0000-0000-0000-000000000001',
    content: '5 game-changing social media marketing strategies to scale your agency this quarter. Swipe to read all insights! 🚀📈',
    targetAccountIds: ['fb_868941086292404', 'ig_2116988269210142'],
    postType: 'post',
    platformOverrides: {},
    tags: ['socialmediamarketing', 'growthhacking', 'digitalstrategy'],
    status: 'published',
    scheduledFor: '2026-10-21T09:30:00.000Z',
    publishedAt: '2026-10-21T09:30:00.000Z',
    createdAt: '2026-10-21T08:00:00.000Z',
    updatedAt: '2026-10-21T09:30:00.000Z',
    author: {
      id: 'usr_admin',
      name: 'U NOS Admin',
      avatar: '',
    },
    media: [
      {
        id: 'med_21',
        url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80',
        name: 'agency_strategy.jpg',
        type: 'image',
      },
    ],
    results: {
      fb_868941086292404: {
        status: 'success',
        externalPostId: '868941086292404_21001',
        externalPostUrl: 'https://www.facebook.com/868941086292404',
        publishedAt: '2026-10-21T09:30:00.000Z',
      },
      ig_2116988269210142: {
        status: 'success',
        externalPostId: '17992817291129381',
        externalPostUrl: 'https://instagram.com/p/DBY_sample21',
        publishedAt: '2026-10-21T09:30:00.000Z',
      },
    },
  },
  {
    id: 'post_seed_22',
    workspaceId: '00000000-0000-0000-0000-000000000001',
    content: 'Client breakthrough! Consistent multi-platform scheduling generated a 340% increase in inbound leads. Learn our exact workflow.',
    targetAccountIds: ['fb_868941086292404', 'ig_2116988269210142'],
    postType: 'post',
    platformOverrides: {},
    tags: ['casestudy', 'leadgen', 'b2bmarketing'],
    status: 'published',
    scheduledFor: '2026-10-22T14:15:00.000Z',
    publishedAt: '2026-10-22T14:15:00.000Z',
    createdAt: '2026-10-22T12:00:00.000Z',
    updatedAt: '2026-10-22T14:15:00.000Z',
    author: {
      id: 'usr_admin',
      name: 'U NOS Admin',
      avatar: '',
    },
    media: [
      {
        id: 'med_22',
        url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
        name: 'client_growth.jpg',
        type: 'image',
      },
    ],
    results: {
      fb_868941086292404: {
        status: 'success',
        externalPostId: '868941086292404_22002',
        externalPostUrl: 'https://www.facebook.com/868941086292404',
        publishedAt: '2026-10-22T14:15:00.000Z',
      },
      ig_2116988269210142: {
        status: 'success',
        externalPostId: '17992817291129382',
        externalPostUrl: 'https://instagram.com/p/DBZ_sample22',
        publishedAt: '2026-10-22T14:15:00.000Z',
      },
    },
  },
  {
    id: 'post_seed_23',
    workspaceId: '00000000-0000-0000-0000-000000000001',
    content: 'Live product showcase: How automated AI scheduling transforms your daily content pipeline into pure engagement ⚡️',
    targetAccountIds: ['fb_868941086292404', 'ig_2116988269210142'],
    postType: 'post',
    platformOverrides: {},
    tags: ['automation', 'contentcreation', 'productivity'],
    status: 'published',
    scheduledFor: '2026-10-23T10:00:00.000Z',
    publishedAt: '2026-10-23T10:00:00.000Z',
    createdAt: '2026-10-23T08:30:00.000Z',
    updatedAt: '2026-10-23T10:00:00.000Z',
    author: {
      id: 'usr_admin',
      name: 'U NOS Admin',
      avatar: '',
    },
    media: [
      {
        id: 'med_23',
        url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
        name: 'automation_dashboard.jpg',
        type: 'image',
      },
    ],
    results: {
      fb_868941086292404: {
        status: 'success',
        externalPostId: '868941086292404_23003',
        externalPostUrl: 'https://www.facebook.com/868941086292404',
        publishedAt: '2026-10-23T10:00:00.000Z',
      },
      ig_2116988269210142: {
        status: 'success',
        externalPostId: '17992817291129383',
        externalPostUrl: 'https://instagram.com/p/DBa_sample23',
        publishedAt: '2026-10-23T10:00:00.000Z',
      },
    },
  },
  {
    id: 'post_seed_24',
    workspaceId: '00000000-0000-0000-0000-000000000001',
    content: 'Weekend deep dive: The anatomy of high-converting social copy. Save this checklist for your next campaign! 📋✍️',
    targetAccountIds: ['fb_868941086292404', 'ig_2116988269210142'],
    postType: 'post',
    platformOverrides: {},
    tags: ['copywriting', 'conversion', 'marketingtips'],
    status: 'scheduled',
    scheduledFor: '2026-10-24T14:00:00.000Z',
    createdAt: '2026-10-23T11:00:00.000Z',
    updatedAt: '2026-10-23T11:00:00.000Z',
    author: {
      id: 'usr_admin',
      name: 'U NOS Admin',
      avatar: '',
    },
    media: [
      {
        id: 'med_24',
        url: 'https://images.unsplash.com/photo-1542744094-24638eff58bb?w=800&auto=format&fit=crop&q=80',
        name: 'copywriting_guide.jpg',
        type: 'image',
      },
    ],
    results: {},
  },
  {
    id: 'post_seed_25',
    workspaceId: '00000000-0000-0000-0000-000000000001',
    content: 'Sunday Strategy session: Plan your upcoming week in under 15 minutes with unified cross-posting. 🗓️✨',
    targetAccountIds: ['fb_868941086292404', 'ig_2116988269210142'],
    postType: 'post',
    platformOverrides: {},
    tags: ['sundayprep', 'productivity', 'agencylife'],
    status: 'scheduled',
    scheduledFor: '2026-10-25T10:30:00.000Z',
    createdAt: '2026-10-23T11:15:00.000Z',
    updatedAt: '2026-10-23T11:15:00.000Z',
    author: {
      id: 'usr_admin',
      name: 'U NOS Admin',
      avatar: '',
    },
    media: [
      {
        id: 'med_25',
        url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80',
        name: 'weekly_planning.jpg',
        type: 'image',
      },
    ],
    results: {},
  },
];

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
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
      if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_POSTS;
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
