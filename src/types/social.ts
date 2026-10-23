export type SocialPlatform =
  | 'bluesky'
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'pinterest'
  | 'threads'
  | 'tiktok'
  | 'twitter'
  | 'youtube';

export type PostType = 'post' | 'reel' | 'story' | 'video' | 'short';

export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'needs_approval';

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  username: string;
  displayName: string;
  avatarUrl: string;
  accountType?: 'page' | 'profile' | 'creator' | 'business' | 'channel';
  tokenExpiresAt?: string;
  status: 'connected' | 'expired' | 'rate_limited' | 'error';
  followersCount?: number;
  externalId?: string;
  accessToken?: string;
  refreshToken?: string;
  pageId?: string;
}

export interface PlatformCaptionOverride {
  caption: string;
  title?: string; // For YouTube
  firstComment?: string; // For IG, LinkedIn
  collaborator?: string; // For IG
  isAiGenerated?: boolean;
}

export interface PostMedia {
  id: string;
  url: string;
  name: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
  size?: number; // bytes
  aspectRatio?: string;
  duration?: number; // seconds
}

export interface Post {
  id: string;
  workspaceId: string;
  content: string; // Main caption
  media: PostMedia[];
  targetAccountIds: string[];
  postType: PostType;
  platformOverrides: Partial<Record<SocialPlatform, PlatformCaptionOverride>>;
  tags: string[];
  firstComment?: string;
  collaborators?: string;
  isAiGenerated?: boolean;
  musicTitle?: string;
  productTags?: string[];
  stickers?: string[];
  publishMode?: string;
  scheduledFor?: string; // ISO string
  publishedAt?: string;
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  results?: Record<
    string,
    {
      status: 'success' | 'failed' | 'pending';
      externalPostId?: string;
      externalPostUrl?: string;
      errorMessage?: string;
      publishedAt?: string;
    }
  >;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  connectedAccounts: SocialAccount[];
}

export interface AnalyticsMetric {
  date: string;
  impressions: number;
  engagements: number;
  clicks: number;
  followersGained: number;
}

export interface PlatformConfig {
  name: string;
  color: string;
  icon: string;
  charLimit: number;
  supportsVideo: boolean;
  supportsImages: boolean;
  supportsFirstComment: boolean;
  supportsReels: boolean;
  supportsStories: boolean;
  aspectRatioGuidelines: string;
  apiDocsUrl: string;
}
