// ==============================================================================
// POSTINGTUBE — OFFICIAL PRICING & SUBSCRIPTION CONFIGURATION & TYPES
// (Client-safe: no Node.js filesystem imports)
// ==============================================================================

export type PlanId = 'free' | 'starter' | 'pro' | 'growth' | 'agency';

export type SubscriptionStatus =
  | 'free'
  | 'pending'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'expired'
  | 'failed';

export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  tagline: string;
  priceInr: number;
  channelsLimit: number;
  monthlyPostsLimit: number; // 15 for free, -1 for unlimited
  userLimit: number;
  analyticsTier: 'basic' | 'advanced';
  isPopular?: boolean;
  isBestValue?: boolean;
  badge?: string;
  features: string[];
  // Backwards compatibility fields
  maxChannels: number;
  pricePerChannelInr: number;
  pricePerChannelUsd: number;
  monthlyPostsPerChannel: number;
  maxMonthlyPostsTotal: number;
  scheduledPostsPerChannel: number;
}

/**
 * 1. OFFICIAL POSTINGTUBE MONTHLY PRICING
 * Exactly as specified by business requirements:
 * Free: 3 channels, ₹0, 15 posts total/month
 * Starter: 5 channels, ₹999, Unlimited posts
 * Pro: 10 channels, ₹1,999, Unlimited posts (Most Popular)
 * Growth: 15 channels, ₹2,999, Unlimited posts (Best Value)
 * Agency: 50 channels, ₹9,999, Unlimited posts
 */
export const OFFICIAL_PLANS: Record<PlanId, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    tagline: 'Get Started',
    priceInr: 0,
    channelsLimit: 3,
    monthlyPostsLimit: 15,
    userLimit: 1,
    analyticsTier: 'basic',
    features: [
      '3 connected social accounts',
      '15 scheduled posts per month in total',
      'Basic scheduling',
      'Basic analytics',
      '1 user',
      'Access to core supported publishing features',
    ],
    maxChannels: 3,
    pricePerChannelInr: 0,
    pricePerChannelUsd: 0,
    monthlyPostsPerChannel: 15,
    maxMonthlyPostsTotal: 15,
    scheduledPostsPerChannel: 15,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    tagline: 'Start Growing',
    priceInr: 999,
    channelsLimit: 5,
    monthlyPostsLimit: -1,
    userLimit: 1,
    analyticsTier: 'basic',
    features: [
      '5 connected channels',
      'Unlimited posts',
      'Core scheduling and publishing',
      'Social account management',
      'Post calendar',
      'Basic publishing insights',
      '1 user',
    ],
    maxChannels: 5,
    pricePerChannelInr: 999 / 5,
    pricePerChannelUsd: 15,
    monthlyPostsPerChannel: -1,
    maxMonthlyPostsTotal: -1,
    scheduledPostsPerChannel: -1,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'Most Popular',
    priceInr: 1999,
    channelsLimit: 10,
    monthlyPostsLimit: -1,
    userLimit: 1,
    analyticsTier: 'advanced',
    isPopular: true,
    badge: 'MOST POPULAR',
    features: [
      '10 connected channels',
      'Unlimited posts',
      'Advanced analytics',
      'Publishing performance insights',
      'Post history and management',
      'Supported platform integrations',
      '1 user',
    ],
    maxChannels: 10,
    pricePerChannelInr: 1999 / 10,
    pricePerChannelUsd: 25,
    monthlyPostsPerChannel: -1,
    maxMonthlyPostsTotal: -1,
    scheduledPostsPerChannel: -1,
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    tagline: 'Scale Your Business',
    priceInr: 2999,
    channelsLimit: 15,
    monthlyPostsLimit: -1,
    userLimit: 1,
    analyticsTier: 'advanced',
    isBestValue: true,
    badge: 'BEST VALUE',
    features: [
      '15 connected channels',
      'Unlimited posts',
      'Advanced analytics and reporting',
      'Multi-account management',
      'Publishing performance tracking',
      'Complete scheduling workflow',
      'Priority support',
      '1 user',
    ],
    maxChannels: 15,
    pricePerChannelInr: 2999 / 15,
    pricePerChannelUsd: 40,
    monthlyPostsPerChannel: -1,
    maxMonthlyPostsTotal: -1,
    scheduledPostsPerChannel: -1,
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    tagline: 'Manage at Scale',
    priceInr: 9999,
    channelsLimit: 50,
    monthlyPostsLimit: -1,
    userLimit: 1,
    analyticsTier: 'advanced',
    features: [
      '50 connected channels',
      'Unlimited posts',
      'Agency-level account management',
      'Advanced analytics and reporting',
      'Client/account organization',
      'Complete post scheduling and management',
      'Priority support',
      '1 user',
    ],
    maxChannels: 50,
    pricePerChannelInr: 9999 / 50,
    pricePerChannelUsd: 120,
    monthlyPostsPerChannel: -1,
    maxMonthlyPostsTotal: -1,
    scheduledPostsPerChannel: -1,
  },
};

/**
 * Backwards compatibility proxy for existing references to PRICING_CONFIG
 */
export const PRICING_CONFIG = {
  free: {
    id: 'free',
    name: 'Free',
    pricePerChannelInr: 0,
    pricePerChannelUsd: 0,
    maxChannels: 3,
    monthlyPostsPerChannel: 15,
    maxMonthlyPostsTotal: 15, // 15 total scheduled posts per month across all accounts
    scheduledPostsPerChannel: 15,
    userLimit: 1,
    analyticsTier: 'basic' as const,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    pricePerChannelInr: 999,
    pricePerChannelUsd: 15,
    maxChannels: 5,
    monthlyPostsPerChannel: -1,
    maxMonthlyPostsTotal: -1,
    scheduledPostsPerChannel: -1,
    userLimit: 1,
    analyticsTier: 'basic' as const,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    pricePerChannelInr: 1999,
    pricePerChannelUsd: 25,
    minChannels: 1,
    maxChannels: 10,
    monthlyPostsPerChannel: -1,
    maxMonthlyPostsTotal: -1,
    scheduledPostsPerChannel: -1,
    userLimit: 1,
    analyticsTier: 'advanced' as const,
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    pricePerChannelInr: 2999,
    pricePerChannelUsd: 40,
    maxChannels: 15,
    monthlyPostsPerChannel: -1,
    maxMonthlyPostsTotal: -1,
    scheduledPostsPerChannel: -1,
    userLimit: 1,
    analyticsTier: 'advanced' as const,
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    pricePerChannelInr: 9999,
    pricePerChannelUsd: 120,
    maxChannels: 50,
    monthlyPostsPerChannel: -1,
    maxMonthlyPostsTotal: -1,
    scheduledPostsPerChannel: -1,
    userLimit: 1,
    analyticsTier: 'advanced' as const,
  },
};

export interface CustomerSubscription {
  id: string;
  userId: string;
  userEmail?: string;
  planId: PlanId;
  planName: string;
  channelsCount: number; // channel capacity entitlement
  channelsLimit?: number;
  monthlyPostsLimit?: number;
  pricePerChannel?: number;
  amount: number;
  currency: 'INR' | 'USD';
  billingInterval: 'monthly';
  status: SubscriptionStatus;
  provider: 'razorpay' | 'stripe' | 'manual';
  providerSubscriptionId?: string;
  providerPaymentId?: string;
  providerOrderId?: string;
  customerId?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd?: boolean;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTransaction {
  id: string;
  userId: string;
  userEmail?: string;
  subscriptionId?: string;
  planId?: PlanId;
  amount: number;
  currency: 'INR' | 'USD';
  provider: 'razorpay' | 'stripe' | 'manual';
  providerPaymentId: string;
  providerOrderId?: string;
  status: 'succeeded' | 'failed' | 'refunded' | 'pending';
  paymentMethod?: string;
  receiptUrl?: string;
  errorCode?: string;
  errorDescription?: string;
  createdAt: string;
}

export interface MonthlyUsageRecord {
  id: string;
  userId: string;
  monthKey: string; // e.g. '2026-11'
  postsUsed: number;
  postsLimit: number;
  resetAt: string;
  createdAt: string;
  updatedAt: string;
}
