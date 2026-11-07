import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import {
  PRICING_CONFIG,
  OFFICIAL_PLANS,
  PlanId,
  SubscriptionPlan,
  CustomerSubscription,
  PaymentTransaction,
  SubscriptionStatus,
} from './pricing-config';

export * from './pricing-config';

// Safe Node.js modules resolver that does not get bundled into browser client
function getNodeModules() {
  if (typeof window === 'undefined') {
    try {
      const fs = eval('require')('fs');
      const path = eval('require')('path');
      return { fs, path };
    } catch {}
  }
  return null;
}

function getDataPaths() {
  const node = getNodeModules();
  if (!node) return { dataDir: '', subFile: '', txnFile: '', usageFile: '' };
  const dataDir = node.path.join(process.cwd(), 'src', 'data');
  const subFile = node.path.join(dataDir, 'subscriptions.json');
  const txnFile = node.path.join(dataDir, 'payment_transactions.json');
  const usageFile = node.path.join(dataDir, 'monthly_usage.json');
  return { dataDir, subFile, txnFile, usageFile };
}

function ensureDataDir() {
  const node = getNodeModules();
  if (!node) return;
  const { dataDir } = getDataPaths();
  try {
    if (!node.fs.existsSync(dataDir)) {
      node.fs.mkdirSync(dataDir, { recursive: true });
    }
  } catch {}
}

function readJsonFile<T>(filePathOrGetter: string | (() => string), fallback: T): T {
  const node = getNodeModules();
  const filePath = typeof filePathOrGetter === 'function' ? filePathOrGetter() : filePathOrGetter;
  if (!node || !filePath) return fallback;
  try {
    ensureDataDir();
    if (!node.fs.existsSync(filePath)) {
      node.fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf-8');
      return fallback;
    }
    const raw = node.fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[SubscriptionService] Error reading ${filePath}:`, err);
    return fallback;
  }
}

function writeJsonFile<T>(filePathOrGetter: string | (() => string), data: T): void {
  const node = getNodeModules();
  const filePath = typeof filePathOrGetter === 'function' ? filePathOrGetter() : filePathOrGetter;
  if (!node || !filePath) return;
  try {
    ensureDataDir();
    node.fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn(`[SubscriptionService] Error writing ${filePath}:`, err);
  }
}

// File paths for resilient fallback persistence
const SUBSCRIPTIONS_FILE = () => getDataPaths().subFile;
const TRANSACTIONS_FILE = () => getDataPaths().txnFile;
const USAGE_FILE = () => getDataPaths().usageFile;

// Helper to get Supabase client (service role if available, anon otherwise)
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (serviceKey && url) {
    return createClient(url, serviceKey, { auth: { persistSession: false } });
  }
  if (anonKey && url) {
    return createClient(url, anonKey, { auth: { persistSession: false } });
  }
  return supabase;
}

// ==============================================================================
// SUBSCRIPTION SERVICE
// ==============================================================================

export interface AccountMonthlyUsage {
  accountId: string;
  accountName: string;
  platform: string;
  usedCount: number;
  limit: number;
  remaining: number;
  monthKey: string;
  monthLabel: string;
  periodStart: string;
  periodEnd: string;
  resetsAt: string;
}

export interface MonthlyUsageSummary {
  planId: PlanId;
  monthLabel: string;
  monthKey?: string;
  resetsAt: string;
  totalPostsUsed: number;
  totalPostsLimit: number;
  perAccountLimit: number;
  remainingPosts?: number;
  isLimitReached?: boolean;
  accounts: Record<string, AccountMonthlyUsage>;
}

export const SubscriptionService = {
  /**
   * Returns list of all defined official PostingTube plans.
   */
  getPlans(): SubscriptionPlan[] {
    return [
      OFFICIAL_PLANS.free,
      OFFICIAL_PLANS.starter,
      OFFICIAL_PLANS.pro,
      OFFICIAL_PLANS.growth,
      OFFICIAL_PLANS.agency,
    ];
  },

  /**
   * Returns a specific plan config by ID.
   */
  getPlan(planId: string): SubscriptionPlan {
    const key = (planId || 'free').toLowerCase() as PlanId;
    return OFFICIAL_PLANS[key] || OFFICIAL_PLANS.free;
  },

  /**
   * Normalizes raw plan ID into an official PlanId.
   */
  normalizePlanId(rawPlanId?: string): PlanId {
    if (!rawPlanId) return 'free';
    const clean = rawPlanId.toLowerCase().trim();
    if (clean === 'starter') return 'starter';
    if (clean === 'pro' || clean === 'creator_pro') return 'pro';
    if (clean === 'growth') return 'growth';
    if (clean === 'agency' || clean === 'agency_scale') return 'agency';
    return 'free';
  },

  /**
   * Retrieves active subscription for a user from Supabase with resilient fallback.
   * If no paid subscription exists, returns the default Free plan.
   */
  async getUserSubscription(userId?: string, email?: string): Promise<CustomerSubscription> {
    const cleanId = (userId || '').trim();
    const cleanEmail = (email || '').toLowerCase().trim();

    // 1. Try Supabase
    const client = getSupabaseClient();
    if (client && (cleanId || cleanEmail)) {
      try {
        let query = client.from('subscriptions').select('*');
        if (cleanId && cleanEmail) {
          query = query.or(`user_id.eq.${cleanId},user_id.eq.${cleanEmail}`);
        } else if (cleanId) {
          query = query.eq('user_id', cleanId);
        } else if (cleanEmail) {
          query = query.eq('user_id', cleanEmail);
        }

        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data && data.status === 'active') {
          const planId = this.normalizePlanId(data.plan_id);
          const planConfig = OFFICIAL_PLANS[planId];
          const channelsLimit = data.channels_limit || data.channels_count || planConfig.channelsLimit;

          return {
            id: data.id,
            userId: data.user_id,
            userEmail: cleanEmail || undefined,
            planId,
            planName: data.plan_name || `${planConfig.name} Plan`,
            channelsCount: channelsLimit,
            channelsLimit,
            monthlyPostsLimit: planConfig.monthlyPostsLimit,
            pricePerChannel: Number(data.price_per_channel || planConfig.priceInr / planConfig.channelsLimit),
            amount: Number(data.amount ?? planConfig.priceInr),
            currency: (data.currency === 'USD' ? 'USD' : 'INR'),
            billingInterval: 'monthly',
            status: data.status as SubscriptionStatus,
            provider: data.provider || 'razorpay',
            providerSubscriptionId: data.provider_subscription_id,
            providerPaymentId: data.provider_payment_id,
            providerOrderId: data.provider_order_id,
            customerId: data.customer_id,
            currentPeriodStart: data.current_period_start || data.created_at,
            currentPeriodEnd: data.current_period_end || new Date(Date.now() + 30 * 86400000).toISOString(),
            cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
            cancelledAt: data.cancelled_at,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      } catch (err) {
        console.warn('[SubscriptionService] Supabase query warning:', err);
      }
    }

    // 2. Try JSON persistent file fallback
    const fileSubs = readJsonFile<CustomerSubscription[]>(SUBSCRIPTIONS_FILE, []);
    const foundInFile = fileSubs.find(
      (s) =>
        s.status === 'active' &&
        ((cleanId && s.userId === cleanId) ||
          (cleanEmail && s.userEmail?.toLowerCase() === cleanEmail) ||
          (cleanEmail && s.userId.toLowerCase() === cleanEmail))
    );

    if (foundInFile) {
      const planId = this.normalizePlanId(foundInFile.planId);
      const planConfig = OFFICIAL_PLANS[planId];
      return {
        ...foundInFile,
        planId,
        channelsCount: foundInFile.channelsCount || planConfig.channelsLimit,
        channelsLimit: foundInFile.channelsLimit || planConfig.channelsLimit,
        monthlyPostsLimit: planConfig.monthlyPostsLimit,
      };
    }

    // 3. Default Free Plan
    const now = new Date().toISOString();
    const periodEnd = new Date(Date.now() + 365 * 86400000).toISOString();

    return {
      id: `sub_free_${cleanId || 'default'}`,
      userId: cleanId || cleanEmail || 'guest',
      userEmail: cleanEmail || undefined,
      planId: 'free',
      planName: 'Free Plan',
      channelsCount: OFFICIAL_PLANS.free.channelsLimit,
      channelsLimit: OFFICIAL_PLANS.free.channelsLimit,
      monthlyPostsLimit: OFFICIAL_PLANS.free.monthlyPostsLimit,
      pricePerChannel: 0,
      amount: 0,
      currency: 'INR',
      billingInterval: 'monthly',
      status: 'active',
      provider: 'manual',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now,
    };
  },

  /**
   * Enforces channel connection limit.
   * Free = 3, Starter = 5, Pro = 10, Growth = 15, Agency = 30.
   */
  async checkCanConnectChannel(
    userId?: string,
    email?: string,
    currentChannelsCount: number = 0
  ): Promise<{
    allowed: boolean;
    reason?: string;
    limit: number;
    current: number;
    planId: PlanId;
  }> {
    const sub = await this.getUserSubscription(userId, email);
    const planConfig = OFFICIAL_PLANS[sub.planId] || OFFICIAL_PLANS.free;
    const limit = sub.channelsLimit || sub.channelsCount || planConfig.channelsLimit;

    if (currentChannelsCount >= limit) {
      return {
        allowed: false,
        reason:
          sub.planId === 'free'
            ? `You have reached the Free plan limit of ${limit} connected channels (${currentChannelsCount}/${limit} connected). Upgrade to Starter (5 channels), Pro (10 channels), Growth (15 channels), or Agency (30 channels) for more channels and unlimited posting.`
            : `You have reached the ${planConfig.name} plan limit of ${limit} connected channels (${currentChannelsCount}/${limit} connected). Upgrade to a higher plan to connect more channels.`,
        limit,
        current: currentChannelsCount,
        planId: sub.planId,
      };
    }

    return {
      allowed: true,
      limit,
      current: currentChannelsCount,
      planId: sub.planId,
    };
  },

  /**
   * Computes the calendar month window for monthly post usage calculation.
   * Automatically resets at 00:00:00 UTC on the 1st of every month.
   */
  getMonthWindow(date: Date = new Date()): {
    start: Date;
    end: Date;
    resetsAt: Date;
    monthKey: string;
    monthLabel: string;
    resetsAtLabel: string;
  } {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth(); // 0-indexed (0 = Jan, 11 = Dec)
    const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
    const resetsAt = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthLabel = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const resetsAtLabel = resetsAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    return { start, end, resetsAt, monthKey, monthLabel, resetsAtLabel };
  },

  /**
   * Retrieves unique post IDs from local post_usage_ledger cache/file.
   */
  getLocalLedgerPostIds(monthKey: string, userId?: string): Set<string> {
    const postIds = new Set<string>();
    if (typeof window !== 'undefined') return postIds;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = eval("require('fs')");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = eval("require('path')");
      const filePath = path.join(process.cwd(), 'src', 'data', 'usage_ledger.json');
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (const item of list) {
            if (item.monthKey === monthKey) {
              if (!userId || item.userId === userId || !item.userId || item.userId === 'customer') {
                if (item.postId) postIds.add(item.postId);
              }
            }
          }
        }
      }
    } catch {}
    return postIds;
  },

  /**
   * Backward-compatible helper for per-account ledger check.
   * With shared monthly usage, returns the shared post count for the month.
   */
  getLocalLedgerUsage(accountId: string, monthKey: string): number {
    return this.getLocalLedgerPostIds(monthKey).size;
  },

  /**
   * Records ledger entry for a unique committed scheduled or published post.
   * Consumes exactly 1 slot per post, regardless of how many channels are targeted.
   * Transaction-safe, idempotent, and persists to both Supabase and local JSON cache.
   */
  async recordUsageEvent(params: {
    postId: string;
    accountIds?: string[];
    userId?: string;
    workspaceId?: string;
    actionType: 'schedule' | 'publish';
    targetDate?: Date | string;
    idempotencyKey?: string;
  }): Promise<void> {
    const { postId, accountIds = [], userId, workspaceId, actionType, targetDate, idempotencyKey } = params;
    if (!postId) return;

    const dateObj = targetDate ? new Date(targetDate) : new Date();
    const { monthKey } = this.getMonthWindow(isNaN(dateObj.getTime()) ? new Date() : dateObj);
    const key = idempotencyKey || `ledger_${monthKey}_${postId}`;

    // 1. Write to local JSON file for instant access (server-side only)
    if (typeof window === 'undefined') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = eval("require('fs')");
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = eval("require('path')");
        const filePath = path.join(process.cwd(), 'src', 'data', 'usage_ledger.json');
        let current: any[] = [];
        if (fs.existsSync(filePath)) {
          try {
            current = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            if (!Array.isArray(current)) current = [];
          } catch {}
        }

        const exists = current.some((item: any) => item.postId === postId && item.monthKey === monthKey);
        if (!exists) {
          current.push({
            id: `ledger_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            postId,
            accountId: accountIds[0] || 'shared',
            userId: userId || 'customer',
            workspaceId: workspaceId || null,
            monthKey,
            actionType,
            status: 'committed',
            idempotencyKey: key,
            createdAt: new Date().toISOString(),
          });
          fs.writeFileSync(filePath, JSON.stringify(current, null, 2), 'utf-8');
        }
      } catch (e) {
        console.warn('[UsageLedger] Failed to write local ledger:', e);
      }
    }

    // 2. Persist to Supabase public.post_usage_ledger via RPC or upsert
    const client = getSupabaseClient();
    if (client) {
      try {
        const { error: rpcErr } = await client.rpc('check_and_reserve_monthly_usage', {
          p_user_id: userId || 'customer',
          p_workspace_id: workspaceId || null,
          p_post_id: postId,
          p_month_key: monthKey,
          p_action_type: actionType,
          p_idempotency_key: key,
        });

        if (rpcErr) {
          // Fallback direct upsert
          await client.from('post_usage_ledger').upsert(
            [
              {
                post_id: postId,
                account_id: accountIds[0] || 'shared',
                user_id: userId || 'customer',
                workspace_id: workspaceId || null,
                month_key: monthKey,
                action_type: actionType,
                status: 'committed',
                idempotency_key: key,
              },
            ],
            { onConflict: 'post_id,account_id', ignoreDuplicates: true }
          );
        }
      } catch (err) {
        console.warn('[UsageLedger] Failed to upsert to Supabase post_usage_ledger:', err);
      }
    }
  },

  /**
   * Calculates monthly post usage.
   * New official Free plan rule:
   * - Maximum 3 connected social accounts.
   * - Exactly 30 scheduled posts per calendar month in total, shared across all connected accounts.
   * - No per-account quota; users can distribute their 30 posts however they want.
   * - 1 multi-platform post counts as ONE post towards the 30-post allowance.
   * - Deleting a scheduled or published post NEVER restores allowance (ledger preserved).
   * - Editing an existing scheduled post does not consume another slot.
   * - Retrying a publishing job does not consume another slot.
   * - Paid plans (Starter, Pro, Growth, Agency): Unlimited posts.
   */
  calculateMonthlyUsage(
    posts: any[],
    accounts: any[],
    planId: PlanId,
    options?: {
      targetDate?: Date;
      excludePostId?: string;
      userId?: string;
    }
  ): MonthlyUsageSummary {
    const { start, end, resetsAt, monthKey, monthLabel } = this.getMonthWindow(options?.targetDate || new Date());
    const isPaid = planId !== 'free';
    const totalMaxPosts = isPaid ? -1 : 30; // Exactly 30 shared posts for Free plan

    // Filter valid posts for this calendar month window
    // Ignore drafts, failed (without partial results), and exclude current post if editing/retrying
    const countedPosts = (posts || []).filter((p) => {
      if (!p) return false;
      if (options?.excludePostId && p.id === options.excludePostId) return false;
      // Only count active committed posts: scheduled, published, partially_published, or publishing
      if (p.status !== 'scheduled' && p.status !== 'published' && p.status !== 'partially_published' && p.status !== 'publishing') {
        return false;
      }

      const ts = p.publishedAt || p.scheduledFor || p.createdAt || p.updatedAt;
      if (!ts) return false;
      const postDate = new Date(ts);
      if (isNaN(postDate.getTime())) return false;

      return postDate >= start && postDate <= end;
    });

    // Compute distinct post IDs from both live posts and immutable ledger
    const uniquePostIds = new Set<string>();
    for (const p of countedPosts) {
      if (p.id) uniquePostIds.add(p.id);
    }

    // Add unique posts from local ledger cache (guarantees deleting posts does NOT restore allowance)
    const ledgerPostIds = this.getLocalLedgerPostIds(monthKey, options?.userId);
    for (const pid of ledgerPostIds) {
      if (options?.excludePostId && pid === options.excludePostId) continue;
      uniquePostIds.add(pid);
    }

    const totalPostsUsed = uniquePostIds.size;
    const remainingPosts = isPaid ? 999999 : Math.max(0, totalMaxPosts - totalPostsUsed);
    const isLimitReached = isPaid ? false : totalPostsUsed >= totalMaxPosts;

    const accountUsageMap: Record<string, AccountMonthlyUsage> = {};
    for (const acc of accounts || []) {
      const accId = acc.id;
      // Per-account stats represent the shared 30-post quota
      accountUsageMap[accId] = {
        accountId: accId,
        accountName: acc.displayName || acc.username || 'Channel',
        platform: acc.platform || 'social',
        usedCount: totalPostsUsed,
        limit: isPaid ? -1 : 30,
        remaining: remainingPosts,
        monthKey,
        monthLabel,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        resetsAt: resetsAt.toISOString(),
      };
    }

    return {
      planId,
      monthLabel,
      monthKey,
      resetsAt: resetsAt.toISOString(),
      totalPostsUsed,
      totalPostsLimit: totalMaxPosts,
      perAccountLimit: isPaid ? -1 : 30,
      remainingPosts,
      isLimitReached,
      accounts: accountUsageMap,
    };
  },

  /**
   * Enforces plan limits on scheduling and publishing:
   * Free plan:
   * - Exactly 30 scheduled posts per calendar month in total, shared across all connected accounts.
   * - No per-channel 5-post limit.
   * Paid plans (Starter, Pro, Growth, Agency): Unlimited posts.
   */
  async checkCanPublishOrSchedulePosts(params: {
    userId?: string;
    email?: string;
    targetAccountIds: string[];
    existingPosts: any[];
    accounts?: any[];
    excludePostId?: string;
    scheduledFor?: string;
  }): Promise<{
    allowed: boolean;
    reason?: string;
    blockedAccounts: { id: string; name: string; platform: string; count: number; limit: number }[];
    allowedAccountIds: string[];
    usageSummary: MonthlyUsageSummary;
    planId: PlanId;
  }> {
    const { userId, email, targetAccountIds, existingPosts, accounts = [], excludePostId, scheduledFor } = params;
    const sub = await this.getUserSubscription(userId, email);

    const targetDate = scheduledFor ? new Date(scheduledFor) : new Date();
    const usageSummary = this.calculateMonthlyUsage(existingPosts, accounts, sub.planId, {
      targetDate: isNaN(targetDate.getTime()) ? new Date() : targetDate,
      excludePostId,
      userId,
    });

    // All paid subscribers have unlimited publishing & scheduling
    if (sub.planId !== 'free') {
      return {
        allowed: true,
        blockedAccounts: [],
        allowedAccountIds: targetAccountIds,
        usageSummary,
        planId: sub.planId,
      };
    }

    const resetsDate = new Date(usageSummary.resetsAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    // Check shared 30 posts limit for Free plan
    const totalLimit = 30;
    const currentTotalUsed = usageSummary.totalPostsUsed;

    if (currentTotalUsed >= totalLimit) {
      const blockedList = targetAccountIds.map((chId) => {
        const acc = accounts.find((a) => a.id === chId);
        return {
          id: chId,
          name: acc?.displayName || acc?.username || 'Channel',
          platform: acc?.platform || 'social',
          count: currentTotalUsed,
          limit: totalLimit,
        };
      });

      return {
        allowed: false,
        reason: `You have reached the Free plan monthly limit of 30 posts total (${currentTotalUsed}/${totalLimit} posts used this month across all channels). Usage automatically resets on ${resetsDate}. Upgrade to Starter, Pro, Growth, or Agency for unlimited scheduled posts.`,
        blockedAccounts: blockedList,
        allowedAccountIds: [],
        usageSummary,
        planId: 'free',
      };
    }

    return {
      allowed: true,
      blockedAccounts: [],
      allowedAccountIds: targetAccountIds,
      usageSummary,
      planId: 'free',
    };
  },

  /**
   * Backward-compatible checkCanSchedulePosts wrapper.
   */
  async checkCanSchedulePosts(
    userId: string | undefined,
    email: string | undefined,
    targetChannelIds: string[],
    existingPosts: any[],
    accounts: any[] = []
  ): Promise<{
    allowed: boolean;
    reason?: string;
    blockedChannelId?: string;
    channelUsage: Record<string, { scheduledCount: number; limit: number }>;
    planId: PlanId;
  }> {
    const res = await this.checkCanPublishOrSchedulePosts({
      userId,
      email,
      targetAccountIds: targetChannelIds,
      existingPosts,
      accounts,
    });

    const channelUsage: Record<string, { scheduledCount: number; limit: number }> = {};
    for (const chId of targetChannelIds) {
      const u = res.usageSummary.accounts[chId];
      channelUsage[chId] = {
        scheduledCount: u?.usedCount || res.usageSummary.totalPostsUsed,
        limit: u?.limit || OFFICIAL_PLANS.free.monthlyPostsLimit,
      };
    }

    return {
      allowed: res.allowed,
      reason: res.reason,
      blockedChannelId: res.blockedAccounts[0]?.id,
      channelUsage,
      planId: res.planId,
    };
  },

  /**
   * Activates or updates a verified paid subscription (Starter, Pro, Growth, Agency).
   * Updates Supabase subscriptions, user_profiles, and local JSON backup store.
   */
  async activateSubscription(params: {
    userId: string;
    userEmail?: string;
    planId: PlanId;
    provider: 'razorpay' | 'stripe';
    providerPaymentId: string;
    providerOrderId?: string;
    providerSubscriptionId?: string;
    customerId?: string;
    amount?: number;
    currency?: 'INR' | 'USD';
    billingInterval?: 'monthly' | 'yearly';
  }): Promise<CustomerSubscription> {
    const {
      userId,
      userEmail,
      planId: requestedPlanId,
      provider,
      providerPaymentId,
      providerOrderId,
      providerSubscriptionId,
      customerId,
      amount: customAmount,
      currency = 'INR',
      billingInterval = 'monthly',
    } = params;

    const planId = this.normalizePlanId(requestedPlanId === 'free' ? 'pro' : requestedPlanId);
    const planConfig = OFFICIAL_PLANS[planId];
    const isYearly = billingInterval === 'yearly';
    const isUsd = currency === 'USD';
    const defaultAmount = isYearly
      ? (isUsd ? planConfig.yearlyPriceUsd : planConfig.yearlyPriceInr)
      : (isUsd ? planConfig.priceUsd : planConfig.priceInr);
    const finalAmount = customAmount !== undefined ? customAmount : defaultAmount;
    const now = new Date().toISOString();
    const periodDurationMs = isYearly ? 365 * 86400000 : 30 * 86400000;
    const periodEnd = new Date(Date.now() + periodDurationMs).toISOString();

    const subId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newSub: CustomerSubscription = {
      id: subId,
      userId,
      userEmail: userEmail?.toLowerCase(),
      planId,
      planName: `${planConfig.name} Plan`,
      channelsCount: planConfig.channelsLimit,
      channelsLimit: planConfig.channelsLimit,
      monthlyPostsLimit: planConfig.monthlyPostsLimit,
      pricePerChannel: Math.round(finalAmount / planConfig.channelsLimit),
      amount: finalAmount,
      currency,
      billingInterval,
      status: 'active',
      provider,
      providerPaymentId,
      providerOrderId,
      providerSubscriptionId,
      customerId,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now,
    };

    // 1. Persist to local JSON file
    const fileSubs = readJsonFile<CustomerSubscription[]>(SUBSCRIPTIONS_FILE, []);
    const updatedSubs = [newSub, ...fileSubs.filter((s) => s.userId !== userId && (!userEmail || s.userEmail !== userEmail.toLowerCase()))];
    writeJsonFile(SUBSCRIPTIONS_FILE, updatedSubs);

    // 2. Persist to Supabase subscriptions table
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('subscriptions').upsert(
          {
            id: subId,
            user_id: userId,
            plan_id: planId,
            plan_name: newSub.planName,
            channels_count: planConfig.channelsLimit,
            channels_limit: planConfig.channelsLimit,
            monthly_posts_limit: planConfig.monthlyPostsLimit,
            price_per_channel: Math.round(finalAmount / planConfig.channelsLimit),
            amount: finalAmount,
            currency,
            billing_interval: billingInterval,
            status: 'active',
            provider,
            provider_payment_id: providerPaymentId,
            provider_order_id: providerOrderId,
            provider_subscription_id: providerSubscriptionId,
            customer_id: customerId,
            current_period_start: now,
            current_period_end: periodEnd,
            cancel_at_period_end: false,
            created_at: now,
            updated_at: now,
          },
          { onConflict: 'id' }
        );

        // Update user_profiles plan
        if (userId || userEmail) {
          const profileQuery = client.from('user_profiles');
          const updatePayload = { plan: planId, payment_status: 'paid', updated_at: now };
          if (userId) {
            await profileQuery.update(updatePayload).eq('id', userId);
          } else if (userEmail) {
            await profileQuery.update(updatePayload).eq('email', userEmail.toLowerCase());
          }
        }
      } catch (err) {
        console.warn('[SubscriptionService] Supabase subscription upsert warning:', err);
      }
    }

    return newSub;
  },

  /**
   * Backwards-compatible alias for activateSubscription.
   */
  async activateProSubscription(params: {
    userId: string;
    userEmail?: string;
    channelsCount?: number;
    planId?: PlanId;
    currency?: 'INR' | 'USD';
    provider: 'razorpay' | 'stripe';
    providerPaymentId: string;
    providerOrderId?: string;
    providerSubscriptionId?: string;
    amount: number;
    billingInterval?: 'monthly' | 'yearly';
  }): Promise<CustomerSubscription> {
    const planId = params.planId || 'pro';
    return this.activateSubscription({
      userId: params.userId,
      userEmail: params.userEmail,
      planId,
      provider: params.provider,
      providerPaymentId: params.providerPaymentId,
      providerOrderId: params.providerOrderId,
      providerSubscriptionId: params.providerSubscriptionId,
      amount: params.amount,
      currency: params.currency || 'INR',
    });
  },

  /**
   * Records a verified payment transaction.
   */
  async recordTransaction(txn: Omit<PaymentTransaction, 'id' | 'createdAt'>): Promise<PaymentTransaction> {
    const id = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const fullTxn: PaymentTransaction = {
      ...txn,
      id,
      createdAt: new Date().toISOString(),
    };

    // 1. File persistence
    const fileTxns = readJsonFile<PaymentTransaction[]>(TRANSACTIONS_FILE, []);
    writeJsonFile(TRANSACTIONS_FILE, [fullTxn, ...fileTxns]);

    // 2. Supabase persistence
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('payment_transactions').insert({
          id,
          user_id: txn.userId,
          subscription_id: txn.subscriptionId || null,
          plan_id: txn.planId || null,
          amount: txn.amount,
          currency: txn.currency,
          provider: txn.provider,
          provider_payment_id: txn.providerPaymentId,
          provider_order_id: txn.providerOrderId || null,
          status: txn.status,
          payment_method: txn.paymentMethod || 'card',
          receipt_url: txn.receiptUrl || null,
          created_at: fullTxn.createdAt,
        });
      } catch (err) {
        console.warn('[SubscriptionService] Supabase txn insert warning:', err);
      }
    }

    return fullTxn;
  },

  /**
   * Cancels a subscription safely: preserves existing connected accounts,
   * sets status to 'cancelled'.
   */
  async cancelSubscription(userId: string, email?: string): Promise<{ success: boolean; message: string }> {
    const cleanId = userId.trim();
    const cleanEmail = (email || '').toLowerCase().trim();
    const now = new Date().toISOString();

    // 1. File store
    const fileSubs = readJsonFile<CustomerSubscription[]>(SUBSCRIPTIONS_FILE, []);
    let found = false;
    for (const s of fileSubs) {
      if ((cleanId && s.userId === cleanId) || (cleanEmail && s.userEmail === cleanEmail)) {
        s.status = 'cancelled';
        s.cancelledAt = now;
        s.updatedAt = now;
        found = true;
      }
    }
    if (found) {
      writeJsonFile(SUBSCRIPTIONS_FILE, fileSubs);
    }

    // 2. Supabase
    const client = getSupabaseClient();
    if (client) {
      try {
        let q = client.from('subscriptions').update({
          status: 'cancelled',
          cancelled_at: now,
          updated_at: now,
        });
        if (cleanId) q = q.eq('user_id', cleanId);
        else if (cleanEmail) q = q.eq('user_id', cleanEmail);
        await q;

        // Reset user_profile to free
        if (cleanId) {
          await client.from('user_profiles').update({ plan: 'free', payment_status: 'cancelled' }).eq('id', cleanId);
        }
      } catch (err) {
        console.warn('[SubscriptionService] Error cancelling in Supabase:', err);
      }
    }

    return {
      success: true,
      message: 'Your subscription has been cancelled. All connected social accounts and scheduled posts are fully preserved.',
    };
  },

  /**
   * Retrieves payment transaction history for a user.
   */
  async getUserTransactions(userId: string, email?: string): Promise<PaymentTransaction[]> {
    const cleanId = userId.trim();
    const cleanEmail = (email || '').toLowerCase().trim();

    // 1. Supabase
    const client = getSupabaseClient();
    if (client && (cleanId || cleanEmail)) {
      try {
        let q = client.from('payment_transactions').select('*');
        if (cleanId && cleanEmail) {
          q = q.or(`user_id.eq.${cleanId},user_id.eq.${cleanEmail}`);
        } else if (cleanId) {
          q = q.eq('user_id', cleanId);
        } else if (cleanEmail) {
          q = q.eq('user_id', cleanEmail);
        }
        const { data, error } = await q.order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          return data.map((d) => ({
            id: d.id,
            userId: d.user_id,
            subscriptionId: d.subscription_id,
            planId: d.plan_id,
            amount: Number(d.amount),
            currency: d.currency || 'INR',
            provider: d.provider,
            providerPaymentId: d.provider_payment_id,
            providerOrderId: d.provider_order_id,
            status: d.status,
            paymentMethod: d.payment_method,
            receiptUrl: d.receipt_url,
            createdAt: d.created_at,
          }));
        }
      } catch {}
    }

    // 2. File fallback
    const fileTxns = readJsonFile<PaymentTransaction[]>(TRANSACTIONS_FILE, []);
    return fileTxns.filter(
      (t) =>
        (cleanId && t.userId === cleanId) ||
        (cleanEmail && t.userEmail?.toLowerCase() === cleanEmail) ||
        (cleanEmail && t.userId.toLowerCase() === cleanEmail)
    );
  },

  /**
   * Aggregates billing & subscription statistics for Owner Admin Dashboard.
   */
  async getAdminBillingStats(): Promise<{
    freeUsersCount: number;
    paidSubscribersCount: number;
    activeSubscriptionsCount: number;
    cancelledSubscriptionsCount: number;
    mrrInr: number;
    totalRevenueInr: number;
    arpuInr: number;
    planBreakdown: Record<PlanId, number>;
    paymentStats: { successful: number; failed: number };
    recentTransactions: PaymentTransaction[];
  }> {
    let subs = readJsonFile<CustomerSubscription[]>(SUBSCRIPTIONS_FILE, []);
    let txns = readJsonFile<PaymentTransaction[]>(TRANSACTIONS_FILE, []);

    // Try live Supabase data
    const client = getSupabaseClient();
    if (client) {
      try {
        const [{ data: sData }, { data: tData }] = await Promise.all([
          client.from('subscriptions').select('*').order('created_at', { ascending: false }),
          client.from('payment_transactions').select('*').order('created_at', { ascending: false }),
        ]);
        if (sData && sData.length > 0) {
          subs = sData.map((d: any) => ({
            id: d.id,
            userId: d.user_id,
            planId: (d.plan_id || 'free') as PlanId,
            planName: d.plan_name || 'Plan',
            channelsCount: d.channels_limit || d.channels_count || 3,
            amount: Number(d.amount || 0),
            currency: d.currency || 'INR',
            billingInterval: 'monthly',
            status: d.status,
            provider: d.provider,
            currentPeriodStart: d.current_period_start,
            currentPeriodEnd: d.current_period_end,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));
        }
        if (tData && tData.length > 0) {
          txns = tData.map((d: any) => ({
            id: d.id,
            userId: d.user_id,
            subscriptionId: d.subscription_id,
            planId: d.plan_id,
            amount: Number(d.amount),
            currency: d.currency || 'INR',
            provider: d.provider,
            providerPaymentId: d.provider_payment_id,
            providerOrderId: d.provider_order_id,
            status: d.status,
            paymentMethod: d.payment_method,
            receiptUrl: d.receipt_url,
            createdAt: d.created_at,
          }));
        }
      } catch (err) {
        console.warn('[SubscriptionService] Supabase stats query warning:', err);
      }
    }

    let mrrInr = 0;
    let paidCount = 0;
    let cancelledCount = 0;
    const planBreakdown: Record<PlanId, number> = {
      free: 0,
      starter: 0,
      pro: 0,
      growth: 0,
      agency: 0,
    };

    for (const s of subs) {
      const pid = this.normalizePlanId(s.planId);
      if (s.status === 'active') {
        if (pid !== 'free') {
          paidCount++;
          mrrInr += s.amount || OFFICIAL_PLANS[pid].priceInr;
        }
        planBreakdown[pid] = (planBreakdown[pid] || 0) + 1;
      } else if (s.status === 'cancelled') {
        cancelledCount++;
      }
    }

    let totalRevenueInr = 0;
    let successCount = 0;
    let failCount = 0;

    for (const t of txns) {
      if (t.status === 'succeeded') {
        successCount++;
        totalRevenueInr += Number(t.amount || 0);
      } else if (t.status === 'failed') {
        failCount++;
      }
    }

    const freeCount = Math.max(1, (planBreakdown.free || 0));
    const arpu = paidCount > 0 ? Math.round(mrrInr / paidCount) : 0;

    return {
      freeUsersCount: freeCount,
      paidSubscribersCount: paidCount,
      activeSubscriptionsCount: paidCount,
      cancelledSubscriptionsCount: cancelledCount,
      mrrInr: Math.round(mrrInr),
      totalRevenueInr: Math.round(totalRevenueInr),
      arpuInr: arpu,
      planBreakdown,
      paymentStats: { successful: successCount, failed: failCount },
      recentTransactions: txns.slice(0, 20),
    };
  },
};
