'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Check,
  Zap,
  Minus,
  Plus,
  ArrowLeft,
  Loader2,
  Lock,
  ShieldCheck,
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

  // Calculations
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
            color: '#059669', // Emerald brand theme
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
    <div className="min-h-screen bg-[#121316] text-gray-100 font-sans selection:bg-emerald-500 selection:text-white pb-20">
      {/* Top Navbar */}
      <header className="border-b border-[#22242a] bg-[#16171a]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <PostingTubeLogo size="md" href="/" />

          <div className="flex items-center space-x-3">
            {/* Currency Switcher */}
            <div className="inline-flex items-center bg-[#202227] p-1 rounded-xl border border-[#2b2e35]">
              <button
                type="button"
                onClick={() => setCurrency('INR')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  currency === 'INR'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                ₹ INR
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  currency === 'USD'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                $ USD
              </button>
            </div>

            <Link
              href="/dashboard"
              className="text-xs font-semibold text-gray-300 hover:text-white flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#202227] hover:bg-[#2b2e35] border border-[#2b2e35] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-gray-400" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Centered Pricing Card (Matching Buffer-style Reference Layout) */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        <div className="bg-[#18191c] border border-[#282a2e] rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          {/* Header & Controls Row */}
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 pb-8 border-b border-[#25272c]">
            {/* Left: Heading & Status Text */}
            <div className="space-y-1.5 max-w-lg">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Change your Plan
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                You&apos;re on the{' '}
                <strong className="text-white font-bold">
                  {isProActive ? 'Pro' : 'Free'}
                </strong>{' '}
                plan with {isProActive ? `${channelsCount} channels` : 'up to 3 channels'}. Add
                or remove channels to customize your plan.
              </p>
            </div>

            {/* Right: Channel Counter & Billing Switcher */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {/* Channel Quantity Selector Badge */}
              <div className="inline-flex items-center space-x-2 bg-[#202227] border border-[#2f323a] rounded-xl px-2.5 py-1.5">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={channelsCount <= 1}
                  aria-label="Decrease channel quantity"
                  className="w-6 h-6 rounded-md bg-[#2b2e36] hover:bg-[#353942] active:scale-95 disabled:opacity-30 disabled:hover:bg-[#2b2e36] text-gray-200 flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed text-xs font-bold"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold text-gray-200 min-w-[85px] text-center font-mono">
                  {channelsCount} {channelsCount === 1 ? 'channel' : 'channels'}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={channelsCount >= 100}
                  aria-label="Increase channel quantity"
                  className="w-6 h-6 rounded-md bg-[#2b2e36] hover:bg-[#353942] active:scale-95 disabled:opacity-30 disabled:hover:bg-[#2b2e36] text-gray-200 flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Billing Switcher (Pay Monthly / Pay Yearly) */}
              <div className="inline-flex items-center bg-[#202227] p-1 rounded-xl border border-[#2f323a]">
                <button
                  type="button"
                  onClick={() => setBillingInterval('monthly')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    billingInterval === 'monthly'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Pay Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingInterval('yearly')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    billingInterval === 'yearly'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Pay Yearly
                </button>
              </div>
            </div>
          </div>

          {/* Checkout Error Alert */}
          {checkoutError && (
            <div className="mt-6 p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-center justify-between">
              <span>{checkoutError}</span>
              <button
                type="button"
                onClick={() => setCheckoutError(null)}
                className="text-rose-400 hover:text-white font-bold ml-3"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* The Two Plans: Free and Pro (Side-by-Side Responsive Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch mt-8">
            {/* ============================================================== */}
            {/* PLAN 1: FREE PLAN CARD */}
            {/* ============================================================== */}
            <div
              className={`bg-[#1c1d22] border rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all ${
                !isProActive
                  ? 'border-emerald-500/40 shadow-md shadow-emerald-950/20'
                  : 'border-[#292c33]'
              }`}
            >
              <div className="space-y-6">
                {/* Header Row */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Free</h2>
                    <div className="text-3xl font-black text-white mt-2">
                      {currencySymbol}0{' '}
                      <span className="text-xs font-normal text-gray-400">/ forever</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Connect up to 3 channels
                    </div>
                  </div>

                  {!isProActive && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 shrink-0">
                      Current Plan
                    </span>
                  )}
                </div>

                {/* Free Plan Action Button */}
                <div className="pt-2">
                  {!isProActive ? (
                    <div className="w-full py-3 px-4 rounded-xl text-xs font-bold text-gray-400 bg-white/5 border border-white/10 text-center select-none">
                      Current Plan Active
                    </div>
                  ) : (
                    <Link
                      href="/dashboard?tab=settings"
                      className="block w-full py-3 px-4 rounded-xl text-xs font-bold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 text-center transition-colors"
                    >
                      Downgrade to Free
                    </Link>
                  )}
                </div>

                {/* Divider */}
                <div className="border-t border-[#2a2c33]" />

                {/* Features Checkmarks List */}
                <div className="space-y-3">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Included in Free:
                  </div>
                  <ul className="space-y-2.5 text-xs text-gray-300">
                    <li className="flex items-start space-x-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Up to 3 connected social channels</span>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>5 scheduled posts per connected channel</span>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>1 user account</span>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Basic analytics</span>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Core scheduling and publishing access</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-6 text-[11px] text-gray-500">
                Forever free • No credit card required
              </div>
            </div>

            {/* ============================================================== */}
            {/* PLAN 2: PRO PLAN CARD (PROMINENT & HIGHLIGHTED) */}
            {/* ============================================================== */}
            <div
              className={`bg-[#1c1d22] border-2 rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all relative ${
                isProActive
                  ? 'border-emerald-500 shadow-xl shadow-emerald-950/40'
                  : 'border-emerald-500/70 shadow-xl shadow-emerald-950/30'
              }`}
            >
              <div className="space-y-6">
                {/* Header Row */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-xl font-bold text-white tracking-tight">Pro</h2>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Recommended
                      </span>
                    </div>

                    {/* Price Display */}
                    <div className="text-3xl font-black text-white mt-2">
                      {currencySymbol}
                      {activePrice.toLocaleString()}{' '}
                      <span className="text-xs font-normal text-gray-400">
                        / {billingInterval === 'yearly' ? 'year' : 'month'}
                      </span>
                    </div>

                    <div className="text-xs text-gray-400 mt-1">
                      {channelsCount} {channelsCount === 1 ? 'channel' : 'channels'} • billed{' '}
                      {billingInterval}
                      {billingInterval === 'yearly' && (
                        <span className="text-emerald-400 ml-1.5 font-medium">
                          ({currencySymbol}{totalMonthlyPrice.toLocaleString()}/mo)
                        </span>
                      )}
                    </div>
                  </div>

                  {isProActive && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 shrink-0">
                      Current Plan
                    </span>
                  )}
                </div>

                {/* Centralized Pro Channel Selector (Matching Reference Design) */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex flex-col items-center justify-center space-y-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Select Channels to Connect
                  </span>

                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
                      onClick={handleDecrement}
                      disabled={channelsCount <= 1}
                      aria-label="Decrease channel quantity"
                      className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 disabled:opacity-30 disabled:hover:bg-white/10 text-white flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed font-bold"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <div className="min-w-[130px] text-center">
                      <div className="text-2xl font-black text-white tracking-tight font-mono">
                        {channelsCount}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {channelsCount === 1 ? 'Social Channel' : 'Social Channels'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleIncrement}
                      disabled={channelsCount >= 100}
                      aria-label="Increase channel quantity"
                      className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 disabled:opacity-30 disabled:hover:bg-white/10 text-white flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed font-bold"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <span className="text-[11px] text-emerald-400/90 font-medium">
                    {currencySymbol}{pricePerChannel} per channel / month
                  </span>
                </div>

                {/* Pro Plan CTA Button */}
                <div>
                  {isProActive ? (
                    <Link
                      href="/dashboard?tab=settings"
                      className="w-full py-3.5 px-6 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md text-center"
                    >
                      <span>Manage Pro Subscription</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled={isLoadingCheckout}
                      onClick={handleUpgradeToPro}
                      className="w-full py-3.5 px-6 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/50 disabled:opacity-50"
                    >
                      {isLoadingCheckout ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Preparing Secure Checkout...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 fill-white" />
                          <span>Upgrade to Pro</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Divider */}
                <div className="border-t border-[#2a2c33]" />

                {/* Features Checkmarks List */}
                <div className="space-y-3">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Everything in Free, plus:
                  </div>
                  <ul className="space-y-2.5 text-xs text-gray-200">
                    <li className="flex items-start space-x-2.5">
                      <span className="text-emerald-400 font-bold text-sm leading-none mt-0.5">
                        ∞
                      </span>
                      <span className="font-medium text-white">Unlimited posts</span>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <span className="text-emerald-400 font-bold text-sm leading-none mt-0.5">
                        ∞
                      </span>
                      <span>
                        Unlimited scheduling{' '}
                        <span className="text-gray-400 text-[11px]">
                          (subject to platform/API restrictions)
                        </span>
                      </span>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>1 user account</span>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Advanced analytics</span>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Publishing performance tracking</span>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Post management and publishing history</span>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Supported social platform integrations</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Footer Trust Note */}
              <div className="pt-6 flex items-center justify-between text-[11px] text-gray-500 border-t border-white/5 mt-6">
                <span className="flex items-center space-x-1">
                  <Lock className="w-3 h-3 text-emerald-500" />
                  <span>Secure 256-bit encryption</span>
                </span>
                <span className="flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
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
