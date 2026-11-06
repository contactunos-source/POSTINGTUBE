// ==============================================================================
// POSTINGTUBE — OFFICIAL PRICING & SUBSCRIPTION CONFIGURATION & TYPES
// (Client-safe: no Node.js filesystem imports)
// ==============================================================================

export type PlanId = 'free' | 'starter' | 'pro' | 'growth' | 'agency';

export type BillingInterval = 'monthly' | 'yearly';
export type BillingCurrency = 'INR' | 'USD';

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
  yearlyPriceInr: number;
  normalAnnualPriceInr: number;
  yearlySavingsInr: number;
  priceUsd: number;
  yearlyPriceUsd: number;
  normalAnnualPriceUsd: number;
  yearlySavingsUsd: number;
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
 * 1. OFFICIAL POSTINGTUBE PRICING MATRIX
 * Monthly & Yearly Plans:
 * Free: 3 channels, ₹0/mo, 15 posts total/month
 * Starter: 5 channels, ₹999/mo, ₹9,999/yr (Normal: ₹11,988, Save: ₹1,989)
 * Pro: 10 channels, ₹1,999/mo, ₹19,999/yr (Normal: ₹23,988, Save: ₹3,989) [Most Popular]
 * Growth: 15 channels, ₹2,999/mo, ₹29,999/yr (Normal: ₹35,988, Save: ₹5,989) [Best Value]
 * Agency: 30 channels, ₹5,999/mo, ₹63,999/yr (Normal: ₹71,988, Save: ₹7,989)
 */
export const OFFICIAL_PLANS: Record<PlanId, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    tagline: 'Get Started',
    priceInr: 0,
    yearlyPriceInr: 0,
    normalAnnualPriceInr: 0,
    yearlySavingsInr: 0,
    priceUsd: 0,
    yearlyPriceUsd: 0,
    normalAnnualPriceUsd: 0,
    yearlySavingsUsd: 0,
    channelsLimit: 3,
    monthlyPostsLimit: 15,
    userLimit: 1,
    analyticsTier: 'basic',
    features: [
      '3 connected social accounts',
      '5 scheduled posts per channel (15 total/month)',
      'Core scheduling and publishing',
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
    yearlyPriceInr: 9999,
    normalAnnualPriceInr: 11988,
    yearlySavingsInr: 1989,
    priceUsd: 19,
    yearlyPriceUsd: 199,
    normalAnnualPriceUsd: 228,
    yearlySavingsUsd: 29,
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
    yearlyPriceInr: 19999,
    normalAnnualPriceInr: 23988,
    yearlySavingsInr: 3989,
    priceUsd: 39,
    yearlyPriceUsd: 399,
    normalAnnualPriceUsd: 468,
    yearlySavingsUsd: 69,
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
    yearlyPriceInr: 29999,
    normalAnnualPriceInr: 35988,
    yearlySavingsInr: 5989,
    priceUsd: 59,
    yearlyPriceUsd: 599,
    normalAnnualPriceUsd: 708,
    yearlySavingsUsd: 109,
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
    priceInr: 5999,
    yearlyPriceInr: 63999,
    normalAnnualPriceInr: 71988,
    yearlySavingsInr: 7989,
    priceUsd: 119,
    yearlyPriceUsd: 1199,
    normalAnnualPriceUsd: 1428,
    yearlySavingsUsd: 229,
    channelsLimit: 30,
    monthlyPostsLimit: -1,
    userLimit: 1,
    analyticsTier: 'advanced',
    badge: 'Agency Scale',
    features: [
      '30 connected channels',
      'Unlimited posts',
      'Agency-level account management',
      'Advanced analytics and reporting',
      'Client/account organization',
      'Complete post scheduling and management',
      'Priority support',
      '1 user',
    ],
    maxChannels: 30,
    pricePerChannelInr: 5999 / 30,
    pricePerChannelUsd: 120,
    monthlyPostsPerChannel: -1,
    maxMonthlyPostsTotal: -1,
    scheduledPostsPerChannel: -1,
  },
};

/**
 * Format plan price helper
 */
export function getPlanDisplayPrice(
  plan: SubscriptionPlan,
  interval: BillingInterval,
  currency: BillingCurrency
): {
  price: number;
  priceFormatted: string;
  normalAnnualPrice?: number;
  normalAnnualFormatted?: string;
  savings?: number;
  savingsFormatted?: string;
  periodLabel: string;
} {
  const isYearly = interval === 'yearly';
  const isUsd = currency === 'USD';
  const symbol = isUsd ? '$' : '₹';

  if (plan.id === 'free') {
    return {
      price: 0,
      priceFormatted: `${symbol}0`,
      periodLabel: isYearly ? '/year' : '/month',
    };
  }

  if (isYearly) {
    const price = isUsd ? plan.yearlyPriceUsd : plan.yearlyPriceInr;
    const normal = isUsd ? plan.normalAnnualPriceUsd : plan.normalAnnualPriceInr;
    const savings = isUsd ? plan.yearlySavingsUsd : plan.yearlySavingsInr;

    return {
      price,
      priceFormatted: isUsd ? `$${price.toLocaleString()}` : `₹${price.toLocaleString('en-IN')}`,
      normalAnnualPrice: normal,
      normalAnnualFormatted: isUsd ? `$${normal.toLocaleString()}` : `₹${normal.toLocaleString('en-IN')}`,
      savings,
      savingsFormatted: isUsd ? `$${savings.toLocaleString()}` : `₹${savings.toLocaleString('en-IN')}`,
      periodLabel: '/year',
    };
  }

  const price = isUsd ? plan.priceUsd : plan.priceInr;
  return {
    price,
    priceFormatted: isUsd ? `$${price.toLocaleString()}` : `₹${price.toLocaleString('en-IN')}`,
    periodLabel: '/month',
  };
}

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
    pricePerChannelInr: 5999,
    pricePerChannelUsd: 119,
    maxChannels: 30,
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
  billingInterval: BillingInterval;
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
