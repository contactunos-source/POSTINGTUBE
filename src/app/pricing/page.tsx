'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Check,
  Minus,
  Plus,
  ArrowLeft,
  Loader2,
  Lock,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { PostingTubeLogo } from '@/components/PostingTubeLogo';
import { PRICING_CONFIG } from '@/lib/pricing-config';
import { supabase } from '@/lib/supabase';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PricingPage() {
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [channelsCount, setChannelsCount] = useState<number>(1);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('free');

  // Rates
  const pricePerChannel =
    currency === 'INR'
      ? PRICING_CONFIG.pro.pricePerChannelInr
      : PRICING_CONFIG.pro.pricePerChannelUsd;

  const currencySymbol = currency === 'INR' ? '₹' : '$';

  // Dynamic pricing calculations
  const totalMonthlyPrice = channelsCount * pricePerChannel;
  const totalYearlyPrice = channelsCount * pricePerChannel * 12;
  const activePrice = billingInterval === 'yearly' ? totalYearlyPrice : totalMonthlyPrice;

  // Load current session & subscription status
  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setAuthUser(session.user);
          fetch(`/api/billing/subscription?userId=${session.user.id}&email=${session.user.email || ''}`)
            .then((r) => r.json())
            .then((data) => {
              if (data?.subscription?.planId) {
                setCurrentPlan(data.subscription.planId);
                if (data.subscription.channelsCount && data.subscription.channelsCount > 0) {
                  setChannelsCount(data.subscription.channelsCount);
                }
                if (data.subscription.billingInterval) {
                  setBillingInterval(data.subscription.billingInterval);
                }
              }
            })
            .catch(() => {});
        }
      });
    }
  }, []);

  // Dynamically load Razorpay SDK
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        return resolve(true);
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleIncrement = () => {
    if (channelsCount < PRICING_CONFIG.pro.maxChannels) {
      setChannelsCount((c) => c + 1);
    }
  };

  const handleDecrement = () => {
    if (channelsCount > PRICING_CONFIG.pro.minChannels) {
      setChannelsCount((c) => c - 1);
    }
  };

  // Launch Checkout (Razorpay for INR, Stripe for USD)
  const handleUpgradeToPro = async () => {
    setIsLoadingCheckout(true);
    setCheckoutError(null);

    const effectiveUserId = authUser?.id || 'usr_customer';
    const effectiveEmail = authUser?.email || 'customer@postingtube.com';
    const effectiveName = authUser?.user_metadata?.full_name || 'PostingTube Creator';

    if (currency === 'INR') {
      try {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error('Failed to load secure Razorpay payment gateway. Please check your internet connection.');
        }

        // 1. Create order on backend with selected interval
        const orderRes = await fetch('/api/billing/razorpay/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelsCount,
            userId: effectiveUserId,
            userEmail: effectiveEmail,
            currency: 'INR',
            billingInterval,
          }),
        });

        const orderData = await orderRes.json();
        if (!orderRes.ok || !orderData.success) {
          throw new Error(orderData.error || 'Failed to initialize payment order');
        }

        const { order } = orderData;

        // 2. Open Razorpay Checkout Modal
        const options = {
          key: order.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_postingtube_prod',
          amount: order.amount,
          currency: 'INR',
          name: 'PostingTube',
          description: `Pro Plan (${channelsCount} ${channelsCount === 1 ? 'Channel' : 'Channels'}) • ${billingInterval === 'yearly' ? 'Yearly' : 'Monthly'}`,
          order_id: order.id.startsWith('order_') ? order.id : undefined,
          prefill: {
            name: effectiveName,
            email: effectiveEmail,
          },
          theme: {
            color: '#09090b', // Sleek black theme matching reference button
          },
          handler: async function (response: any) {
            try {
              // 3. Verify signature on backend
              const verifyRes = await fetch('/api/billing/razorpay/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id || order.id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature || 'verified_client_sig',
                  channelsCount,
                  userId: effectiveUserId,
                  userEmail: effectiveEmail,
                  amount: activePrice,
                  billingInterval,
                }),
              });

              const verifyData = await verifyRes.json();
              if (verifyRes.ok && verifyData.success) {
                window.location.href = '/dashboard?payment=success&plan=pro';
              } else {
                setCheckoutError(verifyData.error || 'Payment verification failed');
              }
            } catch (vErr: any) {
              setCheckoutError(vErr?.message || 'Verification error occurred');
            } finally {
              setIsLoadingCheckout(false);
            }
          },
          modal: {
            ondismiss: function () {
              setIsLoadingCheckout(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp: any) {
          setCheckoutError(resp?.error?.description || 'Payment was declined or cancelled.');
          setIsLoadingCheckout(false);
        });
        rzp.open();
      } catch (err: any) {
        setCheckoutError(err?.message || 'Failed to initiate Razorpay checkout');
        setIsLoadingCheckout(false);
      }
    } else {
      // USD Checkout via Stripe
      try {
        const stripeRes = await fetch('/api/billing/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelsCount,
            userId: effectiveUserId,
            userEmail: effectiveEmail,
            billingInterval,
          }),
        });

        const data = await stripeRes.json();
        if (data?.url) {
          window.location.href = data.url;
        } else if (data?.success) {
          window.location.href = '/dashboard?payment=success&plan=pro';
        } else {
          throw new Error(data.error || 'Failed to create Stripe checkout session');
        }
      } catch (sErr: any) {
        setCheckoutError(sErr?.message || 'Failed to initiate USD checkout');
        setIsLoadingCheckout(false);
      }
    }
  };

  const isProActive = currentPlan === 'pro';

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900 font-sans selection:bg-gray-900 selection:text-white pb-24">
      {/* Navigation Bar */}
      <header className="border-b border-gray-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <PostingTubeLogo size="md" href="/" />

          <div className="flex items-center space-x-3">
            {/* Currency Switcher */}
            <div className="inline-flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
              <button
                type="button"
                onClick={() => setCurrency('INR')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  currency === 'INR'
                    ? 'bg-white text-gray-950 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                ₹ INR
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  currency === 'USD'
                    ? 'bg-white text-gray-950 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                $ USD
              </button>
            </div>

            <Link
              href="/dashboard"
              className="text-xs font-semibold text-gray-600 hover:text-gray-950 flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-gray-500" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16">
        {/* Centered Page Header (Matching Reference Design) */}
        <div className="text-center max-w-xl mx-auto space-y-3 mb-10">
          <h1 className="text-3xl sm:text-5xl font-black text-gray-950 tracking-tight">
            Choose the Plan That Fits Your Growth
          </h1>
          <p className="text-sm sm:text-base text-gray-500 leading-relaxed font-normal">
            Start free, or scale your social media workflow with PostingTube Pro.
          </p>

          {/* Billing Switcher (Pay Monthly / Pay Yearly) */}
          <div className="pt-2 flex justify-center">
            <div className="inline-flex items-center bg-white p-1 rounded-full border border-gray-200/90 shadow-xs">
              <button
                type="button"
                onClick={() => setBillingInterval('monthly')}
                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  billingInterval === 'monthly'
                    ? 'bg-gray-950 text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-950'
                }`}
              >
                Pay Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingInterval('yearly')}
                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  billingInterval === 'yearly'
                    ? 'bg-gray-950 text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-950'
                }`}
              >
                Pay Yearly
              </button>
            </div>
          </div>
        </div>

        {/* Checkout Error Alert */}
        {checkoutError && (
          <div className="mb-8 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-2xs">
            <span>{checkoutError}</span>
            <button
              type="button"
              onClick={() => setCheckoutError(null)}
              className="text-rose-600 hover:text-rose-900 font-bold ml-3"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Pricing Cards Grid (Exact Reference Card Architecture) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start max-w-3xl mx-auto">
          {/* ================================================================ */}
          {/* CARD 1: FREE PLAN */}
          {/* ================================================================ */}
          <div className="bg-white rounded-[26px] border border-gray-200/90 shadow-sm p-3.5 space-y-6">
            {/* Top Elevated Pod Card (Matching Reference Screenshot) */}
            <div className="bg-[#f3f4f6] border border-gray-200/60 rounded-[20px] p-6 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.06)] space-y-4">
              <div className="flex items-center justify-between">
                {/* Pill Tag */}
                <span className="bg-white border border-gray-200 text-gray-800 text-[11px] font-semibold tracking-wide uppercase px-3 py-1 rounded-full shadow-2xs">
                  Starter
                </span>

                {!isProActive && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Current Plan
                  </span>
                )}
              </div>

              {/* Price */}
              <div>
                <div className="text-4xl font-extrabold text-gray-950 tracking-tight">
                  {currencySymbol}0
                  <span className="text-sm font-medium text-gray-500">/month</span>
                </div>
                <div className="text-xs text-gray-500 font-medium mt-1">
                  Everything you need to get started.
                </div>
              </div>

              {/* CTA Button (Black pill button matching reference design) */}
              <div className="pt-2">
                {!isProActive ? (
                  <div className="w-full py-3 px-5 rounded-full text-xs sm:text-sm font-bold text-gray-500 bg-white/80 border border-gray-200 text-center select-none shadow-2xs">
                    Current Plan Active
                  </div>
                ) : (
                  <Link
                    href="/dashboard?tab=settings"
                    className="block w-full py-3 px-5 rounded-full text-xs sm:text-sm font-bold text-gray-800 hover:text-black bg-white hover:bg-gray-50 border border-gray-300 text-center transition-colors shadow-2xs"
                  >
                    Downgrade to Free
                  </Link>
                )}
              </div>
            </div>

            {/* Lower Card: Feature List with Minimal Clean Checkmarks */}
            <div className="px-3 pb-4 space-y-3">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                What&apos;s Included:
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-gray-600">
                <li className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-gray-400 stroke-[2.2] shrink-0 mt-0.5" />
                  <span>Maximum 3 connected social accounts</span>
                </li>
                <li className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-gray-400 stroke-[2.2] shrink-0 mt-0.5" />
                  <span>5 scheduled/published posts per connected account per month</span>
                </li>
                <li className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-gray-400 stroke-[2.2] shrink-0 mt-0.5" />
                  <span>Maximum 15 posts per month across 3 connected accounts</span>
                </li>
                <li className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-gray-400 stroke-[2.2] shrink-0 mt-0.5" />
                  <span>1 user</span>
                </li>
                <li className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-gray-400 stroke-[2.2] shrink-0 mt-0.5" />
                  <span>Basic analytics</span>
                </li>
              </ul>

              <div className="pt-3 text-[11px] text-gray-400 border-t border-gray-100">
                Forever free • No credit card required
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* CARD 2: PRO PLAN (HERO CARD WITH FLOATING TOP POD) */}
          {/* ================================================================ */}
          <div className="bg-white rounded-[26px] border-2 border-gray-900 shadow-md p-3.5 space-y-6 relative">
            {/* Top Elevated Pod Card (With Soft Pastel Gradient Wash matching Reference Professional Card) */}
            <div className="bg-gradient-to-b from-[#e8ecf8] via-[#eef2fa] to-[#f4f6fa] border border-[#d6def0] rounded-[20px] p-6 shadow-[0_12px_24px_-8px_rgba(30,41,59,0.12)] space-y-4">
              <div className="flex items-center justify-between">
                {/* Pill Tag */}
                <span className="bg-white/90 border border-indigo-200 text-indigo-950 text-[11px] font-bold tracking-wide uppercase px-3 py-1 rounded-full shadow-2xs">
                  PROFESSIONAL
                </span>

                {isProActive && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Current Plan
                  </span>
                )}
              </div>

              {/* Price */}
              <div>
                <div className="text-4xl font-extrabold text-gray-950 tracking-tight">
                  {currencySymbol}
                  {activePrice.toLocaleString()}
                  <span className="text-sm font-medium text-gray-600">
                    /{billingInterval === 'yearly' ? 'year' : 'month'}
                  </span>
                </div>
                <div className="text-xs text-gray-600 font-medium mt-1">
                  More channels. More flexibility. Unlimited posts.
                </div>
                {billingInterval === 'yearly' && (
                  <div className="text-[11px] text-indigo-900 font-semibold mt-0.5">
                    Equivalent to {currencySymbol}{totalMonthlyPrice.toLocaleString()}/month
                  </div>
                )}
              </div>

              {/* Centered, Unified, Compact Channel Selector (Refined UX) */}
              <div className="pt-1 pb-1 space-y-1.5 text-center">
                <div className="text-[11px] font-bold text-gray-700 tracking-tight">
                  How many channels do you need?
                </div>
                <div className="text-[10px] text-gray-500">
                  Choose your channel limit. You can adjust it whenever you need.
                </div>

                {/* Compact Unified Control */}
                <div className="pt-1 flex items-center justify-center">
                  <div className="inline-flex items-center space-x-2 bg-white/90 border border-gray-300 rounded-full px-2 py-1 shadow-2xs">
                    <button
                      type="button"
                      onClick={handleDecrement}
                      disabled={channelsCount <= 1}
                      aria-label="Decrease channel quantity"
                      className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 disabled:opacity-30 disabled:hover:bg-gray-100 text-gray-800 flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed font-bold"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <div className="px-3 min-w-[100px] text-center font-mono">
                      <span className="text-base font-black text-gray-950">
                        {channelsCount}
                      </span>{' '}
                      <span className="text-xs font-semibold text-gray-600 font-sans">
                        {channelsCount === 1 ? 'channel' : 'channels'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleIncrement}
                      disabled={channelsCount >= 100}
                      aria-label="Increase channel quantity"
                      className="w-7 h-7 rounded-full bg-gray-900 hover:bg-black active:scale-95 disabled:opacity-30 disabled:hover:bg-gray-900 text-white flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-[10px] font-medium text-gray-500">
                  {currencySymbol}{pricePerChannel} per channel / month
                </div>
              </div>

              {/* Action Button (Deep Black Pill Button Matching Reference Design) */}
              <div className="pt-2">
                {isProActive ? (
                  <Link
                    href="/dashboard?tab=settings"
                    className="block w-full py-3.5 px-5 rounded-full text-xs sm:text-sm font-bold text-white bg-gray-900 hover:bg-black text-center transition-all shadow-md cursor-pointer"
                  >
                    Manage Pro Subscription
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled={isLoadingCheckout}
                    onClick={handleUpgradeToPro}
                    className="w-full py-3.5 px-5 rounded-full text-xs sm:text-sm font-bold text-white bg-gradient-to-b from-[#24262b] to-[#09090b] hover:from-[#18191c] hover:to-[#000000] active:scale-[0.99] transition-all cursor-pointer shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {isLoadingCheckout ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Preparing Checkout...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span>Upgrade to Pro</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Lower Card: Feature List with Minimal Clean Checkmarks */}
            <div className="px-3 pb-4 space-y-3">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Everything in Free, plus:
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-gray-700">
                <li className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-emerald-600 stroke-[2.2] shrink-0 mt-0.5" />
                  <span className="font-semibold text-gray-950">Unlimited posts</span>
                </li>
                <li className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-emerald-600 stroke-[2.2] shrink-0 mt-0.5" />
                  <span>
                    Unlimited scheduling{' '}
                    <span className="text-gray-400 text-xs">
                      (subject to platform/API restrictions)
                    </span>
                  </span>
                </li>
                <li className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-emerald-600 stroke-[2.2] shrink-0 mt-0.5" />
                  <span>1 user account</span>
                </li>
                <li className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-emerald-600 stroke-[2.2] shrink-0 mt-0.5" />
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-emerald-600 stroke-[2.2] shrink-0 mt-0.5" />
                  <span>Publishing performance tracking</span>
                </li>
                <li className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-emerald-600 stroke-[2.2] shrink-0 mt-0.5" />
                  <span>Post management and publishing history</span>
                </li>
                <li className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-emerald-600 stroke-[2.2] shrink-0 mt-0.5" />
                  <span>Supported social media platform integrations</span>
                </li>
              </ul>

              <div className="pt-3 flex items-center justify-between text-[11px] text-gray-500 border-t border-gray-100">
                <span className="flex items-center space-x-1">
                  <Lock className="w-3 h-3 text-gray-400" />
                  <span>256-bit encryption</span>
                </span>
                <span className="flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Cancel anytime</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
