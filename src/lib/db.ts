import { supabase } from '@/lib/supabase';
import { StorageService, INITIAL_ACCOUNTS, INITIAL_POSTS, INITIAL_WORKSPACES } from '@/lib/storage';
import { Post, SocialAccount, Workspace, PostMedia } from '@/types/social';

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
  return {
    id: row.id,
    platform: row.platform,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url || '',
    accountType: row.account_type || 'page',
    accessToken: row.access_token,
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
  return {
    id: account.id,
    workspace_id: workspaceId || DEFAULT_WORKSPACE_ID,
    platform: account.platform,
    username: account.username,
    display_name: account.displayName,
    avatar_url: account.avatarUrl || null,
    account_type: account.accountType || 'page',
    access_token: account.accessToken,
    page_id: account.pageId || account.id,
    status: account.status || 'connected',
    followers_count: account.followersCount || 0,
    updated_at: new Date().toISOString(),
  };
}

export const DatabaseService = {
  /**
   * Provision or fetch the workspace belonging to the authenticated user.
   * If user has no workspace, creates a brand new one isolated to them.
   */
  async getUserWorkspace(user: any): Promise<Workspace> {
    if (!user || !user.id) {
      return INITIAL_WORKSPACES[0];
    }

    if (supabase) {
      try {
        // 1. Try to find an existing workspace for this user
        const { data: existing, error } = await supabase
          .from('workspaces')
          .select('*')
          .eq('user_id', user.id)
          .limit(1);

        if (!error && existing && existing.length > 0) {
          const wsRow = existing[0];
          return {
            id: wsRow.id,
            name: wsRow.name,
            slug: wsRow.slug,
            role: wsRow.role || 'owner',
            connectedAccounts: [],
          };
        }

        // 2. If no workspace exists for this user, create a brand new one!
        const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'My';
        const userSlug = `${(user.email?.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Math.random().toString(36).substring(2, 7)}`;
        const workspaceName = `${userName}'s Workspace`;

        const { data: created, error: createErr } = await supabase
          .from('workspaces')
          .insert({
            user_id: user.id,
            name: workspaceName,
            slug: userSlug,
            role: 'owner',
          })
          .select()
          .single();

        if (!createErr && created) {
          console.log('[Supabase] Created isolated workspace for user:', created.id);
          return {
            id: created.id,
            name: created.name,
            slug: created.slug,
            role: created.role || 'owner',
            connectedAccounts: [],
          };
        }
      } catch (err) {
        console.error('Error provisioning user workspace:', err);
      }
    }

    return INITIAL_WORKSPACES[0];
  },

  /**
   * Fetch posts isolated to the active workspace
   */
  async getPosts(workspaceId: string = DEFAULT_WORKSPACE_ID): Promise<Post[]> {
    const cachedPosts = StorageService.getPosts(workspaceId);

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const loadedPosts = data.map(mapDbPostToPost);
          StorageService.savePosts(loadedPosts, workspaceId);
          return loadedPosts;
        }
      } catch (e) {
        console.warn('Could not fetch posts from Supabase, falling back to cache:', e);
      }
    }
    return cachedPosts;
  },

  /**
   * Persist a post directly to Supabase and cache
   */
  async savePost(post: Post): Promise<void> {
    const targetWsId = post.workspaceId || DEFAULT_WORKSPACE_ID;

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

        // If scheduled, also upsert background job queue
        if (post.status === 'scheduled' && post.scheduledFor) {
          const idempotencyKey = `job_${post.id}_${new Date(post.scheduledFor).getTime()}`;
          const { error: jobErr } = await supabase.from('scheduled_jobs').upsert(
            {
              post_id: post.id,
              account_id: post.targetAccountIds[0] || 'fb_868941086292404',
              scheduled_for: post.scheduledFor,
              status: 'pending',
              idempotency_key: idempotencyKey,
            },
            { onConflict: 'idempotency_key' }
          );
          if (jobErr) {
            console.error('Failed to upsert scheduled_job to Supabase:', jobErr);
          } else {
            console.log('[Supabase] Scheduled job persisted:', idempotencyKey);
          }
        }
      } catch (err) {
        console.error('Failed to sync post to Supabase:', err);
      }
    }

    // 2. Safely update local cache scoped to this workspace
    try {
      const currentPosts = StorageService.getPosts(targetWsId);
      const index = currentPosts.findIndex((p) => p.id === post.id);
      let updatedPosts: Post[];
      if (index >= 0) {
        updatedPosts = currentPosts.map((p) => (p.id === post.id ? post : p));
      } else {
        updatedPosts = [post, ...currentPosts];
      }
      StorageService.savePosts(updatedPosts, targetWsId);
    } catch (cacheErr) {
      console.warn('Cache write warning:', cacheErr);
    }
  },

  /**
   * Delete a post from Supabase and cache
   */
  async deletePost(id: string, workspaceId: string = DEFAULT_WORKSPACE_ID): Promise<void> {
    const currentPosts = StorageService.getPosts(workspaceId).filter((p) => p.id !== id);
    StorageService.savePosts(currentPosts, workspaceId);

    if (supabase) {
      try {
        const { error: pErr } = await supabase.from('posts').delete().eq('id', id);
        if (pErr) console.error('Failed to delete post from Supabase:', pErr);
        const { error: jErr } = await supabase.from('scheduled_jobs').delete().eq('post_id', id);
        if (jErr) console.error('Failed to delete scheduled_jobs from Supabase:', jErr);
      } catch (err) {
        console.error('Failed to delete post from Supabase:', err);
      }
    }
  },

  /**
   * Fetch accounts isolated to the active workspace
   */
  async getAccounts(workspaceId: string = DEFAULT_WORKSPACE_ID): Promise<SocialAccount[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('connected_accounts')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const loadedAccounts = data.map(mapDbAccountToAccount);
          StorageService.saveAccounts(loadedAccounts, workspaceId);
          return loadedAccounts;
        }
      } catch (e) {
        console.warn('Could not fetch accounts from Supabase:', e);
      }
    }
    return StorageService.getAccounts(workspaceId);
  },

  /**
   * Persist a connected account to Supabase
   */
  async saveAccount(account: SocialAccount, workspaceId: string = DEFAULT_WORKSPACE_ID): Promise<void> {
    const currentAccounts = StorageService.getAccounts(workspaceId);
    const existingIndex = currentAccounts.findIndex((a) => a.id === account.id);
    let updatedAccounts: SocialAccount[];
    if (existingIndex >= 0) {
      updatedAccounts = currentAccounts.map((a) => (a.id === account.id ? account : a));
    } else {
      updatedAccounts = [...currentAccounts, account];
    }
    StorageService.saveAccounts(updatedAccounts, workspaceId);

    if (supabase) {
      try {
        const dbAcc = mapAccountToDbAccount(account, workspaceId);
        await supabase.from('connected_accounts').upsert(dbAcc);
      } catch (err) {
        console.error('Failed to sync account to Supabase:', err);
      }
    }
  },

  /**
   * Delete an account from Supabase
   */
  async deleteAccount(id: string, workspaceId: string = DEFAULT_WORKSPACE_ID): Promise<void> {
    const current = StorageService.getAccounts(workspaceId).filter((a) => a.id !== id);
    StorageService.saveAccounts(current, workspaceId);

    if (supabase) {
      try {
        await supabase.from('connected_accounts').delete().eq('id', id);
      } catch (err) {
        console.error('Failed to delete account from Supabase:', err);
      }
    }
  },
};
