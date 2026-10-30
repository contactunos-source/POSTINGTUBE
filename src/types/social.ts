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
  collaborator?: string; // For IG
  isAiGenerated?: boolean;
  // YouTube Studio specific metadata
  thumbnailUrl?: string;
  tags?: string[];
  categoryId?: string;
  madeForKids?: boolean; // COPPA compliance (selfDeclaredMadeForKids)
  privacyStatus?: 'public' | 'unlisted' | 'private';
  playlistId?: string;
  commentModeration?: 'allow_all' | 'hold_inappropriate' | 'disable';
  recordingDate?: string;
  videoLocation?: string;
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

export interface PlatformPostMetrics {
  views?: number | null;
  impressions?: number | null;
  reach?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saved?: number | null;
  clicks?: number | null;
  engagementRate?: number | null;
  lastFetchedAt: string;
  fetchStatus: 'success' | 'rate_limited' | 'permission_error' | 'not_supported' | 'failed';
  errorMessage?: string;
  externalPostId: string;
  platform: SocialPlatform;
  rawDetails?: Record<string, unknown>;
}

export interface Post {
  id: string;
  workspaceId: string;
  content: string; // Main caption
  media: PostMedia[];
  targetAccountIds: string[];
  postType: PostType;
  platformOverrides: Record<string, PlatformCaptionOverride>;
  accountOverrides?: Record<string, PlatformCaptionOverride>;
  tags: string[];
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
  analytics?: Record<string, PlatformPostMetrics>;
  results?: Record<
    string,
    {
      status: 'success' | 'failed' | 'pending';
      platform?: string;
      accountName?: string;
      externalPostId?: string;
      externalPostUrl?: string;
      errorMessage?: string;
      publishedAt?: string;
      timestamp?: string;
      analytics?: PlatformPostMetrics;
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
  supportsReels: boolean;
  supportsStories: boolean;
  aspectRatioGuidelines: string;
  apiDocsUrl: string;
}
