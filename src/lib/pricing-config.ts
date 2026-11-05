// ==============================================================================
// POSTINGTUBE — PRICING & SUBSCRIPTION CONFIGURATION & TYPES
// (Client-safe: no Node.js filesystem imports)
// ==============================================================================

export const PRICING_CONFIG = {
  free: {
    id: 'free',
    name: 'Free Plan',
    pricePerChannelInr: 0,
    pricePerChannelUsd: 0,
    maxChannels: 3,
    monthlyPostsPerChannel: 5, // 5 scheduled/published posts per connected account per month
    maxMonthlyPostsTotal: 15, // Maximum 15 posts per month across 3 accounts
    scheduledPostsPerChannel: 5, // backwards compatibility
    userLimit: 1,
    analyticsTier: 'basic' as const,
  },
  pro: {
    id: 'pro',
    name: 'Pro Plan',
    pricePerChannelInr: 199,
    pricePerChannelUsd: 3.0,
    minChannels: 1,
    maxChannels: 100,
    monthlyPostsPerChannel: -1, // -1 = Unlimited
    maxMonthlyPostsTotal: -1, // -1 = Unlimited
    scheduledPostsPerChannel: -1, // -1 = Unlimited
    userLimit: 1,
    analyticsTier: 'advanced' as const,
  },
};

export interface SubscriptionPlan {
  id: 'free' | 'pro';
  name: string;
  pricePerChannelInr: number;
  pricePerChannelUsd: number;
  minChannels: number;
  maxChannels: number;
  monthlyPostsPerChannel: number;
  maxMonthlyPostsTotal: number;
  scheduledPostsPerChannel: number;
  userLimit: number;
  analyticsTier: 'basic' | 'advanced';
  features: string[];
}

export interface CustomerSubscription {
  id: string;
  userId: string;
  userEmail?: string;
  planId: 'free' | 'pro';
  planName: string;
  channelsCount: number;
  pricePerChannel: number;
  amount: number;
  currency: 'INR' | 'USD';
  billingInterval: 'monthly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  provider: 'razorpay' | 'stripe' | 'manual';
  providerSubscriptionId?: string;
  providerPaymentId?: string;
  providerOrderId?: string;
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
