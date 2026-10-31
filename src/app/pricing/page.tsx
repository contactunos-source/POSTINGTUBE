'use client';

import React, { useState, useEffect } from 'react';
import {
  Check,
  Zap,
  ShieldCheck,
  ArrowRight,
  Minus,
  Plus,
  Sparkles,
  HelpCircle,
  CreditCard,
  Lock,
  ArrowLeft,
  Loader2,
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
  const [channelsCount, setChannelsCount] = useState<number>(3);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('free');

  const pricePerChannel =
    currency === 'INR'
      ? PRICING_CONFIG.pro.pricePerChannelInr
      : PRICING_CONFIG.pro.pricePerChannelUsd;

  const totalMonthlyPrice = channelsCount * pricePerChannel;
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  // Load current auth session
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
                if (data.subscription.channelsCount) {
                  setChannelsCount(data.subscription.channelsCount);
                }
              }
            })
            .catch(() => {});
        }
      });
    }
  }, []);

  // Dynamically load Razorpay checkout script
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

  const handleChannelDirectInput = (val: string) => {
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      setChannelsCount(Math.max(1, Math.min(100, num)));
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

        // 1. Create order on backend
        const orderRes = await fetch('/api/billing/razorpay/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelsCount,
            userId: effectiveUserId,
            userEmail: effectiveEmail,
            currency: 'INR',
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
          description: `Pro Plan (${channelsCount} ${channelsCount === 1 ? 'Channel' : 'Channels'}) - ₹${totalMonthlyPrice}/mo`,
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
                  amount: totalMonthlyPrice,
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

  const quickTierOptions = [1, 3, 5, 10, 25, 50, 100];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 text-gray-900 font-sans selection:bg-emerald-500 selection:text-white pb-24">
      {/* Navigation Header */}
      <header className="border-b border-gray-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <PostingTubeLogo size="md" href="/" />

          <div className="flex items-center space-x-3">
            <a
              href="/dashboard"
              className="text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center space-x-1 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </a>
            {!authUser && (
              <a
                href="/login"
                className="text-xs font-bold bg-black text-white px-4 py-2 rounded-xl hover:bg-gray-800 transition-all shadow-xs"
              >
                Sign In
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="pt-12 pb-6 px-4 text-center max-w-4xl mx-auto space-y-4">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Simple, Transparent Pricing</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-gray-950 tracking-tight">
          Pay only for the channels you publish to.
        </h1>

        <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
          Start 100% free with up to 3 social accounts, or scale with Pro at just{' '}
          <strong className="text-gray-900">₹199 per channel / month</strong> with unlimited scheduling.
        </p>

        {/* Currency Switcher */}
        <div className="pt-4 flex justify-center">
          <div className="bg-gray-100 p-1 rounded-full border border-gray-200 inline-flex items-center space-x-1 shadow-inner">
            <button
              type="button"
              onClick={() => setCurrency('INR')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                currency === 'INR'
                  ? 'bg-white text-gray-950 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              🇮🇳 INR (₹)
            </button>
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                currency === 'USD'
                  ? 'bg-white text-gray-950 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              🇺🇸 USD ($)
            </button>
          </div>
        </div>
      </section>

      {/* Error alert if any */}
      {checkoutError && (
        <div className="max-w-2xl mx-auto px-4 mb-6">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-medium flex items-center justify-between">
            <span>⚠️ {checkoutError}</span>
            <button
              onClick={() => setCheckoutError(null)}
              className="text-rose-500 hover:text-rose-700 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Pricing Cards Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* ================= PLAN 1: FREE PLAN ================= */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 flex flex-col justify-between shadow-xs relative">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-950">Free Plan</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Perfect for getting started and testing workflows.</p>
                </div>
                {currentPlan === 'free' && (
                  <span className="text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                    Current Plan
                  </span>
                )}
              </div>

              {/* Price display */}
              <div className="mt-6 flex items-baseline space-x-1">
                <span className="text-4xl sm:text-5xl font-black text-gray-950">
                  {currencySymbol}0
                </span>
                <span className="text-xs text-gray-500 font-medium">/ forever</span>
              </div>

              <div className="mt-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg inline-block border border-emerald-200/60">
                No credit card required
              </div>

              {/* Feature Checklist */}
              <div className="mt-8 space-y-3.5 text-xs text-gray-700">
                <div className="flex items-start space-x-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>
                    <strong className="text-gray-950">Up to 3 connected channels</strong> (YouTube, Instagram, Facebook, X, LinkedIn)
                  </span>
                </div>

                <div className="flex items-start space-x-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>
                    <strong className="text-gray-950">5 scheduled posts per channel</strong> (15 scheduled total across 3 channels)
                  </span>
                </div>

                <div className="flex items-start space-x-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>1 user account login</span>
                </div>

                <div className="flex items-start space-x-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>Basic post insights & publishing confirmation</span>
                </div>

                <div className="flex items-start space-x-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>Core PostingTube publishing and multi-platform preview</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <a
                href="/dashboard"
                className="w-full py-3.5 rounded-2xl text-xs font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
              >
                <span>{currentPlan === 'free' ? 'Continue on Free' : 'Start Free'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* ================= PLAN 2: PRO PLAN (INTERACTIVE) ================= */}
          <div className="lg:col-span-7 bg-white rounded-3xl border-2 border-emerald-600 p-6 sm:p-8 flex flex-col justify-between shadow-xl relative">
            {/* Recommended Pill */}
            <div className="absolute -top-3.5 left-8 px-3.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center space-x-1.5">
              <Sparkles className="w-3 h-3 fill-white" />
              <span>Recommended Pro Plan</span>
            </div>

            <div>
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-black text-gray-950 flex items-center space-x-2">
                    <span>Pro Plan</span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Pay Per Connected Channel
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Select the exact number of channels you need. Scale anytime up to 100 channels.
                  </p>
                </div>

                {currentPlan === 'pro' && (
                  <span className="text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Active Subscription
                  </span>
                )}
              </div>

              {/* Dynamic Price Display */}
              <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-slate-50 border border-emerald-200/80 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">
                    Total Monthly Investment
                  </span>
                  <div className="flex items-baseline space-x-1.5 mt-0.5">
                    <span className="text-3xl sm:text-5xl font-black text-gray-950 tracking-tight">
                      {currencySymbol}{totalMonthlyPrice.toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-gray-600">/ month</span>
                  </div>
                  <span className="text-[11px] text-gray-500 block mt-0.5">
                    {currencySymbol}{pricePerChannel} × {channelsCount} {channelsCount === 1 ? 'channel' : 'channels'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-gray-500 block">Billing Interval</span>
                  <span className="text-xs font-bold text-gray-900 bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-2xs inline-block mt-0.5">
                    Monthly recurring
                  </span>
                </div>
              </div>

              {/* Interactive Channel Selector */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="channel-quantity-input" className="font-bold text-gray-900 flex items-center space-x-1.5">
                    <span>Select Connected Channels:</span>
                    <span className="text-emerald-700 font-extrabold text-sm">{channelsCount}</span>
                  </label>
                  <span className="text-gray-400 text-[11px]">Min: 1 • Max: 100 channels</span>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Minus button */}
                  <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={channelsCount <= PRICING_CONFIG.pro.minChannels}
                    className="w-11 h-11 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white text-gray-800 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                    aria-label="Decrease channel count"
                  >
                    <Minus className="w-4 h-4 stroke-[2.5]" />
                  </button>

                  {/* Quantity center display with manual input */}
                  <div className="flex-1 relative">
                    <input
                      id="channel-quantity-input"
                      type="number"
                      min={1}
                      max={100}
                      value={channelsCount}
                      onChange={(e) => handleChannelDirectInput(e.target.value)}
                      className="w-full h-11 text-center font-black text-xl text-gray-950 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-inner"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-medium pointer-events-none hidden sm:inline">
                      channels
                    </span>
                  </div>

                  {/* Plus button */}
                  <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={channelsCount >= PRICING_CONFIG.pro.maxChannels}
                    className="w-11 h-11 rounded-xl border border-emerald-500 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                    aria-label="Increase channel count"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>

                {/* Quick Selection Buttons */}
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5 pt-1">
                  <span className="text-[10px] text-gray-400 font-medium mr-1">Quick choose:</span>
                  {quickTierOptions.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setChannelsCount(n)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        channelsCount === n
                          ? 'bg-emerald-600 text-white shadow-xs font-bold'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {n} {n === 1 ? 'ch' : 'channels'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pro Features Checklist */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-700">
                <div className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-gray-950">Up to {channelsCount} channels</strong> connected
                  </span>
                </div>

                <div className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-gray-950">Unlimited scheduled posts</strong>
                  </span>
                </div>

                <div className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Advanced real-time analytics</span>
                </div>

                <div className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Official Meta &amp; YouTube APIs</span>
                </div>

                <div className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Persistent customer data &amp; tokens</span>
                </div>

                <div className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Priority publishing queue</span>
                </div>
              </div>
            </div>

            {/* Upgrade CTA Button */}
            <div className="mt-8 space-y-2.5">
              <button
                type="button"
                onClick={handleUpgradeToPro}
                disabled={isLoadingCheckout}
                className="w-full py-4 rounded-2xl text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
              >
                {isLoadingCheckout ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Preparing Secure Checkout...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-white" />
                    <span>
                      Upgrade to Pro ({currencySymbol}{totalMonthlyPrice.toLocaleString()} / mo)
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center space-x-2 text-[11px] text-gray-500">
                <Lock className="w-3.5 h-3.5 text-gray-400" />
                <span>
                  {currency === 'INR'
                    ? 'Secure checkout powered by Razorpay (UPI, Cards, NetBanking)'
                    : 'Secure international checkout powered by Stripe'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Examples Pricing Table Section */}
      <section className="max-w-4xl mx-auto px-4 mt-16">
        <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-950">Channel Pricing Examples</h3>
              <p className="text-xs text-gray-500">Clear breakdown of monthly investment by channel count.</p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              {currencySymbol}{pricePerChannel} per channel / month
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Channels Connected</th>
                  <th className="py-2.5 px-3">Post Limit</th>
                  <th className="py-2.5 px-3 text-right">Monthly Total ({currency})</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800 font-medium">
                {[1, 2, 3, 5, 10, 25, 50, 100].map((count) => {
                  const price = count * pricePerChannel;
                  return (
                    <tr key={count} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-3 font-bold text-gray-950">
                        {count} {count === 1 ? 'Channel' : 'Channels'}
                      </td>
                      <td className="py-3 px-3 text-emerald-700 font-semibold">Unlimited Posts</td>
                      <td className="py-3 px-3 text-right font-black text-gray-900 text-sm">
                        {currencySymbol}{price.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setChannelsCount(count);
                            window.scrollTo({ top: 300, behavior: 'smooth' });
                          }}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-lg transition-colors cursor-pointer"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="max-w-4xl mx-auto px-4 mt-12">
        <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6">
          <h3 className="text-base font-bold text-gray-950">Plan Feature Comparison</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase">
                  <th className="py-3 px-3">Feature</th>
                  <th className="py-3 px-3 text-center">Free Plan</th>
                  <th className="py-3 px-3 text-center text-emerald-700 font-black">Pro Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                <tr>
                  <td className="py-3 px-3 font-semibold">Connected Channels</td>
                  <td className="py-3 px-3 text-center text-gray-600">Up to 3</td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-700">1 to 100 (Custom)</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold">Scheduled Posts Limit</td>
                  <td className="py-3 px-3 text-center text-gray-600">5 per channel</td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-700">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold">Analytics &amp; Engagement Tracking</td>
                  <td className="py-3 px-3 text-center text-gray-600">Basic</td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-700">Advanced Real-Time</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold">Supported Platforms</td>
                  <td className="py-3 px-3 text-center text-gray-600">FB, IG, YT, X, LinkedIn</td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-700">All Platforms</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold">Publishing Engine Queue</td>
                  <td className="py-3 px-3 text-center text-gray-600">Standard</td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-700">Priority Engine</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold">Support</td>
                  <td className="py-3 px-3 text-center text-gray-600">Community</td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-700">Priority Support</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Trust & Guarantee Banner */}
      <section className="max-w-4xl mx-auto px-4 mt-12 text-center">
        <div className="p-6 rounded-3xl bg-slate-100/70 border border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-left">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shadow-2xs shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">Zero-Lock In Guarantee</div>
              <div className="text-[11px] text-gray-500">
                Cancel or modify your channel quantity anytime. Existing accounts are always preserved.
              </div>
            </div>
          </div>

          <a
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-xs font-bold text-gray-800 transition-colors shadow-2xs shrink-0"
          >
            Go to App
          </a>
        </div>
      </section>
    </div>
  );
}
