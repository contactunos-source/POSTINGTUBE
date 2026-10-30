import { supabase } from '@/lib/supabase';
import { StorageService, INITIAL_ACCOUNTS, INITIAL_POSTS, INITIAL_WORKSPACES } from '@/lib/storage';
import { Post, SocialAccount, Workspace, PostMedia, PlatformPostMetrics } from '@/types/social';

// Default Workspace ID matching the seeded row in Supabase
export const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Maps Supabase PostgreSQL snake_case post row to Post TypeScript model
 */
export function mapDbPostToPost(row: any): Post {
  return {
    id: row.id,
    workspaceId: (row.workspace_id && UUID_REGEX.test(row.workspace_id)) ? row.workspace_id : DEFAULT_WORKSPACE_ID,
    content: row.content || '',
    media: (row.media || []).map((m: any) => ({
      ...m,
      thumbnailUrl: (m.thumbnailUrl && !m.thumbnailUrl.startsWith('blob:')) ? m.thumbnailUrl : m.url,
    })),
    targetAccountIds: row.target_account_ids || [],
    postType: row.post_type || 'post',
    platformOverrides: row.platform_overrides || {},
    tags: row.tags || [],
    firstComment: row.first_comment || undefined,
    collaborators: row.collaborators || undefined,
    isAiGenerated: Boolean(row.is_ai_generated),
    musicTitle: row.platform_overrides?.music_title || row.music_title || undefined,
    productTags: row.platform_overrides?.product_tags || row.product_tags || [],
    stickers: row.platform_overrides?.stickers || row.stickers || [],
    publishMode: row.platform_overrides?.publish_mode || row.publish_mode || 'automatic',
    scheduledFor: row.scheduled_for || undefined,
    publishedAt: row.published_at || undefined,
    status: row.status || 'draft',
    results: row.results || {},
    analytics: row.analytics || (row.results ? Object.fromEntries(
      Object.entries(row.results)
        .filter(([, r]: any) => r?.analytics)
        .map(([k, r]: any) => [k, r.analytics])
    ) : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: {
      id: 'usr_admin',
      name: 'Workspace Admin',
      avatar: '',
    },
  };
}

/**
 * Maps Post model to Supabase PostgreSQL row
 */
export function mapPostToDbPost(post: Post): any {
  const validWorkspaceId = (post.workspaceId && UUID_REGEX.test(post.workspaceId))
    ? post.workspaceId
    : DEFAULT_WORKSPACE_ID;

  return {
    id: post.id,
    workspace_id: validWorkspaceId,
    content: post.content,
    media: (post.media || []).map((m: any) => ({
      ...m,
      thumbnailUrl: (m.thumbnailUrl && !m.thumbnailUrl.startsWith('blob:')) ? m.thumbnailUrl : m.url,
    })),
    target_account_ids: post.targetAccountIds || [],
    post_type: post.postType || 'post',
    platform_overrides: {
      ...(post.platformOverrides || {}),
      music_title: post.musicTitle || null,
      product_tags: post.productTags || [],
      stickers: post.stickers || [],
      publish_mode: post.publishMode || 'automatic',
    },
    tags: post.tags || [],
    first_comment: post.firstComment || null,
    collaborators: post.collaborators || null,
    is_ai_generated: Boolean(post.isAiGenerated),
    scheduled_for: post.scheduledFor || null,
    published_at: post.publishedAt || null,
    status: post.status,
    results: post.results || {},
    created_at: post.createdAt,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Maps Supabase account row to SocialAccount model
 */
export function mapDbAccountToAccount(row: any): SocialAccount {
  let accessToken = row.access_token;
  let refreshToken = row.refresh_token;
  let tokenExpiresAt = row.token_expires_at;

  // Support packed JSON token bundles
  if (accessToken && accessToken.startsWith('{') && accessToken.includes('access_token')) {
    try {
      const parsed = JSON.parse(accessToken);
      accessToken = parsed.access_token || accessToken;
      if (!refreshToken && parsed.refresh_token) {
        refreshToken = parsed.refresh_token;
      }
      if (!tokenExpiresAt && parsed.expires_at) {
        tokenExpiresAt = parsed.expires_at;
      }
    } catch {}
  }

  return {
    id: row.id,
    platform: row.platform,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url || '',
    accountType: row.account_type || (row.platform === 'youtube' ? 'channel' : 'page'),
    accessToken,
    refreshToken,
    tokenExpiresAt,
    pageId: row.page_id || undefined,
    status: row.status || 'connected',
    followersCount: row.followers_count || 0,
    externalId: row.page_id || row.id,
  };
}

/**
 * Maps SocialAccount to Supabase row
 */
export function mapAccountToDbAccount(account: SocialAccount, workspaceId: string = DEFAULT_WORKSPACE_ID): any {
  // If we have a refresh token or expiry, bundle them securely into access_token string as fallback
  let tokenPayload = account.accessToken || '';
  if (account.refreshToken || account.tokenExpiresAt) {
    tokenPayload = JSON.stringify({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
      expires_at: account.tokenExpiresAt,
    });
  }

  const row: any = {
    id: account.id,
    workspace_id: workspaceId || DEFAULT_WORKSPACE_ID,
    platform: account.platform,
    username: account.username,
    display_name: account.displayName,
    avatar_url: account.avatarUrl || null,
    account_type: account.accountType || (account.platform === 'youtube' ? 'channel' : 'page'),
    access_token: tokenPayload,
    page_id: account.pageId || account.id,
    status: account.status || 'connected',
    followers_count: account.followersCount || 0,
    updated_at: new Date().toISOString(),
  };

  if (account.refreshToken) {
    row.refresh_token = account.refreshToken;
  }
  if (account.tokenExpiresAt) {
    row.token_expires_at = account.tokenExpiresAt;
  }

  return row;
}

export const DatabaseService = {
  /**
   * Ensures the root default workspace exists in Supabase so foreign keys never fail.
   */
  async ensureDefaultWorkspace(): Promise<void> {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('id')
        .eq('id', DEFAULT_WORKSPACE_ID)
        .maybeSingle();

      if (!data || error) {
        await supabase.from('workspaces').upsert({
          id: DEFAULT_WORKSPACE_ID,
          name: 'PostingTube',
          slug: 'postingtube',
          role: 'owner',
          created_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn('[DatabaseService] ensureDefaultWorkspace warning:', e);
    }
  },

  async getUserWorkspaces(user?: any): Promise<Workspace[]> {
    return INITIAL_WORKSPACES;
  },

  async getUserWorkspace(user: any): Promise<Workspace> {
    return INITIAL_WORKSPACES[0];
  },

  async createWorkspace(user: any, name: string): Promise<Workspace> {
    return INITIAL_WORKSPACES[0];
  },

  async updateWorkspace(workspace: Workspace, user?: any): Promise<void> {
    // No-op
  },

  /**
   * Fetch posts directly from Supabase (single source of truth).
   */
  async getPosts(workspaceId: string = DEFAULT_WORKSPACE_ID): Promise<Post[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const loadedPosts = data.map(mapDbPostToPost);
          // Supabase is the single source of truth.
          // Save directly to cache; if Supabase was cleared, cache clears too.
          StorageService.savePosts(loadedPosts);
          return loadedPosts;
        } else if (error) {
          console.warn('[DatabaseService] Supabase getPosts error:', error.message);
        }
      } catch (e) {
        console.warn('Could not fetch posts from Supabase, falling back to cache:', e);
      }
    }
    return StorageService.getPosts();
  },

  /**
   * Persist a post directly to Supabase and cache.
   */
  async savePost(post: Post): Promise<void> {
    await this.ensureDefaultWorkspace();

    // 1. Persist directly to Supabase
    if (supabase) {
      try {
        const dbPost = mapPostToDbPost(post);
        const { error: postErr } = await supabase.from('posts').upsert(dbPost);
        if (postErr) {
          console.error('Failed to upsert post to Supabase:', postErr);
        } else {
          console.log('[Supabase] Post successfully persisted:', post.id);
        }

        // If scheduled, also upsert background job queue for all target destinations
        if (post.status === 'scheduled' && post.scheduledFor) {
          const targetIds = post.targetAccountIds && post.targetAccountIds.length > 0
            ? post.targetAccountIds
            : [];
          const scheduledTimestamp = new Date(post.scheduledFor).getTime();

          for (const accId of targetIds) {
            const idempotencyKey = `job_${post.id}_${accId}_${scheduledTimestamp}`;
            const { error: jobErr } = await supabase.from('scheduled_jobs').upsert(
              {
                post_id: post.id,
                account_id: accId,
                scheduled_for: post.scheduledFor,
                status: 'pending',
                idempotency_key: idempotencyKey,
              },
              { onConflict: 'idempotency_key' }
            );
            if (jobErr) {
              console.error(`Failed to upsert scheduled_job (${idempotencyKey}) to Supabase:`, jobErr);
            }
          }
        }
      } catch (err) {
        console.error('Failed to sync post to Supabase:', err);
      }
    }

    // 2. Safely update local cache
    try {
      const currentPosts = StorageService.getPosts();
      const index = currentPosts.findIndex((p) => p.id === post.id);
      let updatedPosts: Post[];
      if (index >= 0) {
        updatedPosts = currentPosts.map((p) => (p.id === post.id ? post : p));
      } else {
        updatedPosts = [post, ...currentPosts];
      }
      StorageService.savePosts(updatedPosts);
    } catch (cacheErr) {
      console.warn('Cache write warning:', cacheErr);
    }
  },

  /**
   * Delete a post from Supabase and cache.
   */
  async deletePost(id: string, workspaceId: string = DEFAULT_WORKSPACE_ID): Promise<void> {
    if (supabase) {
      try {
        const { error: jErr } = await supabase.from('scheduled_jobs').delete().eq('post_id', id);
        if (jErr) console.error('Failed to delete scheduled_jobs from Supabase:', jErr);
        const { error: pErr } = await supabase.from('posts').delete().eq('id', id);
        if (pErr) console.error('Failed to delete post from Supabase:', pErr);
      } catch (err) {
        console.error('Failed to delete post from Supabase:', err);
      }
    }

    const currentPosts = StorageService.getPosts().filter((p) => p.id !== id);
    StorageService.savePosts(currentPosts);
  },

  /**
   * Fetch accounts directly from Supabase (single source of truth).
   */
  async getAccounts(workspaceId: string = DEFAULT_WORKSPACE_ID): Promise<SocialAccount[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('connected_accounts')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const loadedAccounts = data.map(mapDbAccountToAccount);
          // Supabase is the single source of truth.
          // Save directly to cache; if Supabase was cleared, cache clears too.
          StorageService.saveAccounts(loadedAccounts);
          return loadedAccounts;
        } else if (error) {
          console.warn('[DatabaseService] Supabase getAccounts error:', error.message);
        }
      } catch (e) {
        console.warn('Could not fetch accounts from Supabase:', e);
      }
    }
    return StorageService.getAccounts();
  },

  /**
   * Persist a connected account to Supabase with strict duplicate prevention.
   */
  async saveAccount(
    account: SocialAccount,
    workspaceId: string = DEFAULT_WORKSPACE_ID
  ): Promise<{ success: boolean; isDuplicate?: boolean; message?: string }> {
    await this.ensureDefaultWorkspace();

    // 1. Backend duplicate prevention: query database for existing matching account
    if (supabase) {
      try {
        const { data: existingRows, error: checkErr } = await supabase
          .from('connected_accounts')
          .select('id, platform, username, page_id')
          .eq('platform', account.platform);

        if (!checkErr && Array.isArray(existingRows)) {
          const isDbDuplicate = existingRows.some((row) => {
            const sameId = row.id === account.id;
            const samePageId = Boolean(row.page_id && account.pageId && row.page_id === account.pageId);
            const sameUsername = Boolean(
              row.username &&
              account.username &&
              row.username.trim().toLowerCase() === account.username.trim().toLowerCase()
            );
            return sameId || samePageId || sameUsername;
          });

          if (isDbDuplicate) {
            console.warn(`[Duplicate Prevention] ${account.platform} account "${account.username}" is already connected.`);
            return {
              success: false,
              isDuplicate: true,
              message: 'This account is already connected.',
            };
          }
        }
      } catch (err) {
        console.error('Database duplicate check error:', err);
      }
    }

    // 2. Storage cache duplicate check
    const currentAccounts = StorageService.getAccounts();
    const isCacheDuplicate = currentAccounts.some((existing) => {
      if (existing.platform !== account.platform) return false;
      const sameId = existing.id === account.id;
      const samePageId = Boolean(existing.pageId && account.pageId && existing.pageId === account.pageId);
      const sameUsername = Boolean(
        existing.username &&
        account.username &&
        existing.username.trim().toLowerCase() === account.username.trim().toLowerCase()
      );
      return sameId || samePageId || sameUsername;
    });

    if (isCacheDuplicate) {
      return {
        success: false,
        isDuplicate: true,
        message: 'This account is already connected.',
      };
    }

    // 3. Save new account to Supabase
    if (supabase) {
      try {
        const dbAcc = mapAccountToDbAccount(account, DEFAULT_WORKSPACE_ID);
        const { error: upsertErr } = await supabase.from('connected_accounts').upsert(dbAcc);
        if (upsertErr) {
          console.warn('[Supabase] Initial account upsert warning:', upsertErr.message);
          delete dbAcc.refresh_token;
          delete dbAcc.token_expires_at;
          const { error: retryErr } = await supabase.from('connected_accounts').upsert(dbAcc);
          if (retryErr) {
            console.error('[Supabase] Account upsert error:', retryErr);
            return {
              success: false,
              message: `Database error: ${retryErr.message}`,
            };
          }
        }
      } catch (err) {
        console.error('Failed to sync account to Supabase:', err);
        return {
          success: false,
          message: 'Network error saving account to database.',
        };
      }
    }

    // 4. Save new account to cache
    const updatedAccounts = [...currentAccounts.filter((a) => a.id !== account.id), account];
    StorageService.saveAccounts(updatedAccounts);

    return {
      success: true,
      isDuplicate: false,
      message: 'Account connected successfully!',
    };
  },

  /**
   * Delete an account from Supabase and cache.
   */
  async deleteAccount(id: string, workspaceId: string = DEFAULT_WORKSPACE_ID): Promise<void> {
    if (supabase) {
      try {
        const { error } = await supabase.from('connected_accounts').delete().eq('id', id);
        if (error) console.error('Failed to delete account from Supabase:', error);
      } catch (err) {
        console.error('Failed to delete account from Supabase:', err);
      }
    }

    const current = StorageService.getAccounts().filter((a) => a.id !== id);
    StorageService.saveAccounts(current);
  },

  /**
   * Persist fresh post analytics into Supabase and local cache.
   */
  async savePostAnalytics(
    postId: string,
    metricsMap: Record<string, PlatformPostMetrics>,
    workspaceId: string = DEFAULT_WORKSPACE_ID
  ): Promise<Post | null> {
    let currentPost: Post | null = null;
    if (supabase) {
      try {
        const { data: row, error: selErr } = await supabase
          .from('posts')
          .select('*')
          .eq('id', postId)
          .single();
        if (!selErr && row) {
          currentPost = mapDbPostToPost(row);
        }
      } catch (err) {
        console.warn('[Analytics DB] Supabase post lookup warning:', err);
      }
    }

    if (!currentPost) {
      const posts = StorageService.getPosts();
      currentPost = posts.find((p) => p.id === postId) || null;
    }

    if (!currentPost) {
      console.warn(`[Analytics DB] Post #${postId} not found in DB or cache.`);
      return null;
    }

    const updatedResults = { ...(currentPost.results || {}) };
    for (const [accId, metrics] of Object.entries(metricsMap)) {
      if (updatedResults[accId]) {
        updatedResults[accId] = {
          ...updatedResults[accId],
          analytics: metrics,
        };
      } else {
        updatedResults[accId] = {
          status: 'success',
          platform: metrics.platform,
          externalPostId: metrics.externalPostId,
          analytics: metrics,
        };
      }
    }

    const updatedPost: Post = {
      ...currentPost,
      results: updatedResults,
      analytics: metricsMap,
      updatedAt: new Date().toISOString(),
    };

    if (supabase) {
      try {
        const { error: updErr } = await supabase
          .from('posts')
          .update({
            results: updatedResults,
            updated_at: new Date().toISOString(),
          })
          .eq('id', postId);

        if (updErr) {
          console.error('[Analytics DB] Failed to update post results in Supabase:', updErr);
        }
      } catch (err) {
        console.error('[Analytics DB] Error updating post results in Supabase:', err);
      }
    }

    try {
      const curPosts = StorageService.getPosts();
      const idx = curPosts.findIndex((p) => p.id === postId);
      if (idx >= 0) {
        curPosts[idx] = updatedPost;
      } else {
        curPosts.unshift(updatedPost);
      }
      StorageService.savePosts(curPosts);
    } catch (cacheErr) {
      console.warn('[Analytics DB] StorageService update warning:', cacheErr);
    }

    return updatedPost;
  },
};
