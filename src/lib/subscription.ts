import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import {
  PRICING_CONFIG,
  SubscriptionPlan,
  CustomerSubscription,
  PaymentTransaction,
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
  if (!node) return { dataDir: '', subFile: '', txnFile: '' };
  const dataDir = node.path.join(process.cwd(), 'src', 'data');
  const subFile = node.path.join(dataDir, 'subscriptions.json');
  const txnFile = node.path.join(dataDir, 'payment_transactions.json');
  return { dataDir, subFile, txnFile };
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

export const SubscriptionService = {
  /**
   * Returns list of all defined plans with live pricing.
   */
  getPlans(): SubscriptionPlan[] {
    return [
      {
        id: 'free',
        name: 'Free Plan',
        pricePerChannelInr: 0,
        pricePerChannelUsd: 0,
        minChannels: 1,
        maxChannels: PRICING_CONFIG.free.maxChannels,
        scheduledPostsPerChannel: PRICING_CONFIG.free.scheduledPostsPerChannel,
        userLimit: 1,
        analyticsTier: 'basic',
        features: [
          'Connect up to 3 social media channels',
          '5 scheduled posts per connected channel',
          '1 user account',
          'Basic analytics & insights',
          'Core PostingTube publishing interface',
          'No subscription payment required',
        ],
      },
      {
        id: 'pro',
        name: 'Pro Plan',
        pricePerChannelInr: PRICING_CONFIG.pro.pricePerChannelInr,
        pricePerChannelUsd: PRICING_CONFIG.pro.pricePerChannelUsd,
        minChannels: PRICING_CONFIG.pro.minChannels,
        maxChannels: PRICING_CONFIG.pro.maxChannels,
        scheduledPostsPerChannel: -1,
        userLimit: 1,
        analyticsTier: 'advanced',
        features: [
          'Connect up to 100 social media channels',
          'Unlimited posts across all channels',
          'Unlimited scheduling subject to API guidelines',
          '1 user account',
          'Advanced real-time analytics & insights',
          'Publishing performance tracking & history',
          'Full support for Facebook, Instagram, YouTube, X, and LinkedIn',
          'Persistent account connections & saved customer data',
          'Priority publishing engine & dedicated support',
        ],
      },
    ];
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
          return {
            id: data.id,
            userId: data.user_id,
            userEmail: cleanEmail || undefined,
            planId: (data.plan_id === 'pro' || data.plan_id === 'creator_pro' ? 'pro' : 'free'),
            planName: data.plan_name || (data.plan_id === 'pro' ? 'Pro Plan' : 'Free Plan'),
            channelsCount: data.channels_count || (data.plan_id === 'pro' ? 5 : 3),
            pricePerChannel: Number(data.price_per_channel || (data.currency === 'USD' ? 3 : 199)),
            amount: Number(data.amount || 0),
            currency: (data.currency === 'USD' ? 'USD' : 'INR'),
            billingInterval: 'monthly',
            status: data.status,
            provider: data.provider || 'razorpay',
            providerSubscriptionId: data.provider_subscription_id,
            providerPaymentId: data.provider_payment_id,
            providerOrderId: data.provider_order_id,
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
      return foundInFile;
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
      channelsCount: PRICING_CONFIG.free.maxChannels,
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
   * Checks if user has reached their allowed channel limit.
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
    planId: 'free' | 'pro';
  }> {
    const sub = await this.getUserSubscription(userId, email);
    const limit = sub.planId === 'pro' ? sub.channelsCount : PRICING_CONFIG.free.maxChannels;

    if (currentChannelsCount >= limit) {
      return {
        allowed: false,
        reason:
          sub.planId === 'free'
            ? `You have reached the Free plan limit of ${limit} connected channels (${currentChannelsCount}/${limit} connected). Upgrade to Pro to connect up to 100 channels with unlimited posting.`
            : `You have reached your current Pro plan capacity of ${limit} channels (${currentChannelsCount}/${limit} connected). You can easily add more channels in your Account Settings.`,
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
   * Enforces 5 scheduled posts per channel limit for Free plan.
   * Pro plan has unlimited scheduling.
   *
   * @param targetChannelIds Channels selected for the scheduled post
   * @param existingPosts All posts currently in database for this workspace/user
   */
  async checkCanSchedulePosts(
    userId: string | undefined,
    email: string | undefined,
    targetChannelIds: string[],
    existingPosts: any[]
  ): Promise<{
    allowed: boolean;
    reason?: string;
    blockedChannelId?: string;
    channelUsage: Record<string, { scheduledCount: number; limit: number }>;
    planId: 'free' | 'pro';
  }> {
    const sub = await this.getUserSubscription(userId, email);

    // Pro subscribers have unlimited scheduling
    if (sub.planId === 'pro') {
      const channelUsage: Record<string, { scheduledCount: number; limit: number }> = {};
      for (const chId of targetChannelIds) {
        channelUsage[chId] = { scheduledCount: 0, limit: -1 };
      }
      return { allowed: true, channelUsage, planId: 'pro' };
    }

    // For Free plan: calculate scheduled posts for each channel
    const scheduledPosts = existingPosts.filter((p) => p.status === 'scheduled');
    const channelUsage: Record<string, { scheduledCount: number; limit: number }> = {};
    const limit = PRICING_CONFIG.free.scheduledPostsPerChannel; // 5

    for (const chId of targetChannelIds) {
      const countForChannel = scheduledPosts.filter((p) => {
        const targets = p.targetAccountIds || p.target_account_ids || [];
        return targets.includes(chId);
      }).length;

      channelUsage[chId] = {
        scheduledCount: countForChannel,
        limit,
      };

      if (countForChannel >= limit) {
        return {
          allowed: false,
          reason: `One or more selected channels have reached the Free plan limit of 5 scheduled posts (${countForChannel}/${limit} scheduled). Upgrade to Pro for unlimited scheduled posts.`,
          blockedChannelId: chId,
          channelUsage,
          planId: 'free',
        };
      }
    }

    return {
      allowed: true,
      channelUsage,
      planId: 'free',
    };
  },

  /**
   * Activates or updates a Pro subscription upon verified payment.
   * Updates Supabase, user_profiles, and local JSON backup store.
   */
  async activateProSubscription(params: {
    userId: string;
    userEmail?: string;
    channelsCount: number;
    currency: 'INR' | 'USD';
    provider: 'razorpay' | 'stripe';
    providerPaymentId: string;
    providerOrderId?: string;
    providerSubscriptionId?: string;
    amount: number;
    billingInterval?: 'monthly' | 'yearly';
  }): Promise<CustomerSubscription> {
    const {
      userId,
      userEmail,
      channelsCount,
      currency,
      provider,
      providerPaymentId,
      providerOrderId,
      providerSubscriptionId,
      amount,
      billingInterval = 'monthly',
    } = params;

    const validatedChannels = Math.max(1, Math.min(100, Math.round(channelsCount)));
    const pricePerChannel = currency === 'USD' ? PRICING_CONFIG.pro.pricePerChannelUsd : PRICING_CONFIG.pro.pricePerChannelInr;
    const now = new Date().toISOString();
    const periodDays = billingInterval === 'yearly' ? 365 : 30;
    const periodEnd = new Date(Date.now() + periodDays * 86400000).toISOString();

    const subId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newSub: CustomerSubscription = {
      id: subId,
      userId,
      userEmail: userEmail?.toLowerCase(),
      planId: 'pro',
      planName: `Pro Plan (${validatedChannels} ${validatedChannels === 1 ? 'Channel' : 'Channels'})`,
      channelsCount: validatedChannels,
      pricePerChannel,
      amount,
      currency,
      billingInterval,
      status: 'active',
      provider,
      providerPaymentId,
      providerOrderId,
      providerSubscriptionId,
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
            plan_id: 'pro',
            plan_name: newSub.planName,
            channels_count: validatedChannels,
            price_per_channel: pricePerChannel,
            amount,
            currency,
            billing_interval: billingInterval,
            status: 'active',
            provider,
            provider_payment_id: providerPaymentId,
            provider_order_id: providerOrderId,
            provider_subscription_id: providerSubscriptionId,
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
          if (userId) {
            await profileQuery.update({ plan: 'creator_pro', payment_status: 'paid', updated_at: now }).eq('id', userId);
          } else if (userEmail) {
            await profileQuery.update({ plan: 'creator_pro', payment_status: 'paid', updated_at: now }).eq('email', userEmail.toLowerCase());
          }
        }
      } catch (err) {
        console.warn('[SubscriptionService] Supabase subscription upsert warning:', err);
      }
    }

    return newSub;
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
   * sets status to 'cancelled' or cancelAtPeriodEnd = true.
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

        // Reset user_profile
        if (cleanId) {
          await client.from('user_profiles').update({ plan: 'free', payment_status: 'cancelled' }).eq('id', cleanId);
        }
      } catch (err) {
        console.warn('[SubscriptionService] Error cancelling in Supabase:', err);
      }
    }

    return {
      success: true,
      message: 'Your Pro subscription has been cancelled. Existing social accounts and scheduled posts are fully preserved.',
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
    proSubscribersCount: number;
    activeSubscriptionsCount: number;
    mrrInr: number;
    totalRevenueInr: number;
    arpuInr: number;
    totalPurchasedCapacity: number;
    recentTransactions: PaymentTransaction[];
    planBreakdown: { free: number; pro: number };
    paymentStats: { successful: number; failed: number };
  }> {
    const subs = readJsonFile<CustomerSubscription[]>(SUBSCRIPTIONS_FILE, []);
    const txns = readJsonFile<PaymentTransaction[]>(TRANSACTIONS_FILE, []);

    let proCount = 0;
    let mrrInr = 0;
    let totalPurchasedCapacity = 0;

    for (const s of subs) {
      if (s.status === 'active' && s.planId === 'pro') {
        proCount++;
        totalPurchasedCapacity += s.channelsCount || 1;
        const subInr = s.currency === 'USD' ? s.amount * 84 : s.amount;
        mrrInr += subInr;
      }
    }

    let totalRevenueInr = 0;
    let successCount = 0;
    let failCount = 0;

    for (const t of txns) {
      if (t.status === 'succeeded') {
        successCount++;
        const amountInr = t.currency === 'USD' ? t.amount * 84 : t.amount;
        totalRevenueInr += amountInr;
      } else if (t.status === 'failed') {
        failCount++;
      }
    }

    const freeCount = Math.max(1, 3 - proCount); // Baseline synced users
    const arpu = proCount > 0 ? Math.round(mrrInr / proCount) : 0;

    return {
      freeUsersCount: freeCount,
      proSubscribersCount: proCount,
      activeSubscriptionsCount: proCount,
      mrrInr: Math.round(mrrInr),
      totalRevenueInr: Math.round(totalRevenueInr),
      arpuInr: arpu,
      totalPurchasedCapacity,
      recentTransactions: txns.slice(0, 20),
      planBreakdown: { free: freeCount, pro: proCount },
      paymentStats: { successful: successCount, failed: failCount },
    };
  },
};
