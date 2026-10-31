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
    scheduledPostsPerChannel: 5,
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
  billingInterval: 'monthly';
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
