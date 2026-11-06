'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Check,
  ArrowLeft,
  Loader2,
  Lock,
  ShieldCheck,
  Zap,
  Sparkles,
  Users,
  CheckCircle2,
  X,
} from 'lucide-react';
import { PostingTubeLogo } from '@/components/PostingTubeLogo';
import {
  OFFICIAL_PLANS,
  PlanId,
  SubscriptionPlan,
  BillingInterval,
} from '@/lib/pricing-config';
import { supabase } from '@/lib/supabase';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [showYearlyToast, setShowYearlyToast] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState<PlanId | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [currentPlan, setCurrentPlan] = useState<PlanId>('free');
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    };
  }, []);

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
                setCurrentPlan(data.subscription.planId as PlanId);
              }
            })
            .catch(() => {});
        }
      });
    }
  }, []);

  // Handle switching to yearly
  const handleToggleInterval = (interval: BillingInterval) => {
    if (interval === billingInterval) return;
    setLoadingPlanId(null);
    setBillingInterval(interval);
    if (interval === 'yearly') {
      setShowYearlyToast(true);
      setTimeout(() => setShowYearlyToast(false), 4500);
    } else {
      setShowYearlyToast(false);
    }
  };

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

  // Launch Checkout for the selected plan
  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (plan.id === 'free') {
      window.location.href = authUser ? '/dashboard' : '/login';
      return;
    }

    setLoadingPlanId(plan.id);
    setCheckoutError(null);

    // Safety timeout in case modal is dismissed without event
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    safetyTimeoutRef.current = setTimeout(() => {
      setLoadingPlanId(null);
    }, 15000);

    const effectiveUserId = authUser?.id || 'usr_customer';
    const effectiveEmail = authUser?.email || 'customer@postingtube.com';
    const effectiveName = authUser?.user_metadata?.full_name || 'PostingTube Creator';

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load secure payment gateway. Please check your internet connection.');
      }

      // 1. Create order on backend for the selected plan and billing interval
      const orderRes = await fetch('/api/billing/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          billingInterval,
          currency: 'INR',
          userId: effectiveUserId,
          userEmail: effectiveEmail,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error || 'Failed to initialize payment order');
      }

      const { order } = orderData;
      const intervalLabel = billingInterval === 'yearly' ? 'Yearly' : 'Monthly';

      // 2. Open Razorpay Checkout Modal
      const options = {
        key: order.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_postingtube_prod',
        amount: order.amount,
        currency: 'INR',
        name: 'PostingTube',
        description: `${plan.name} Plan • ${plan.channelsLimit} Channels • ${intervalLabel}`,
        order_id: order.id && order.id.startsWith('order_') ? order.id : undefined,
        prefill: {
          name: effectiveName,
          email: effectiveEmail,
        },
        theme: {
          color: plan.id === 'growth' ? '#2563eb' : '#059669',
        },
        handler: async function (response: any) {
          if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
          try {
            // 3. Verify signature server-side
            const verifyRes = await fetch('/api/billing/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id || order.id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planId: plan.id,
                billingInterval,
                currency: 'INR',
                userId: effectiveUserId,
                userEmail: effectiveEmail,
                amount: order.totalAmount,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              window.location.href = `/dashboard?payment=success&plan=${plan.id}`;
            } else {
              setCheckoutError(verifyData.error || 'Payment signature verification failed.');
            }
          } catch (vErr: any) {
            setCheckoutError(vErr?.message || 'Verification network error.');
          } finally {
            setLoadingPlanId(null);
          }
        },
        modal: {
          ondismiss: function () {
            if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
            setLoadingPlanId(null);
          },
          escape: true,
          backdropclose: true,
          handleback: true,
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on('payment.failed', function (resp: any) {
        if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
        setCheckoutError(`Payment cancelled: ${resp.error?.description || 'Transaction declined'}`);
        setLoadingPlanId(null);
      });

      razorpayInstance.open();
    } catch (err: any) {
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
      console.error('Checkout error:', err);
      setCheckoutError(err?.message || 'Failed to initialize payment.');
      setLoadingPlanId(null);
    }
  };

  const plansList = [
    OFFICIAL_PLANS.free,
    OFFICIAL_PLANS.starter,
    OFFICIAL_PLANS.pro,
    OFFICIAL_PLANS.growth,
    OFFICIAL_PLANS.agency,
  ];

  const isYearly = billingInterval === 'yearly';

  return (
    <div className="min-h-screen bg-[#fafbfc] text-gray-900 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100 mr-2 cursor-pointer"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span>Back</span>
            </Link>
            <PostingTubeLogo />
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href={authUser ? '/dashboard' : '/login'}
              className="text-xs font-semibold text-gray-700 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              {authUser ? 'Go to Dashboard' : 'Sign in'}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20 space-y-10">
        {/* Title & Benefit-focused Headline */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Official PostingTube Plans</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-950 tracking-tight">
            Choose the right plan. <br className="hidden sm:inline" />
            <span className="text-emerald-600">Grow without limits.</span>
          </h1>

          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto font-medium">
            Designed for creators, freelancers, businesses, and marketing agencies.
            Schedule and publish across Instagram, Facebook, and YouTube with verified official Meta &amp; Google APIs.
          </p>
        </div>

        {/* Global Error Banner */}
        {checkoutError && (
          <div className="max-w-2xl mx-auto bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-xs flex items-center justify-between shadow-xs">
            <span>{checkoutError}</span>
            <button
              onClick={() => setCheckoutError(null)}
              className="text-rose-600 hover:text-rose-900 font-bold ml-3 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Interactive Controls Bar: Monthly / Yearly Toggle Only */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="inline-flex items-center bg-gray-100 p-1.5 rounded-2xl border border-gray-200/90 shadow-2xs">
            <button
              type="button"
              onClick={() => handleToggleInterval('monthly')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                billingInterval === 'monthly'
                  ? 'bg-white text-gray-950 shadow-xs'
                  : 'text-gray-600 hover:text-gray-950'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => handleToggleInterval('yearly')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                billingInterval === 'yearly'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-950'
              }`}
            >
              Yearly
            </button>
          </div>

          {/* Confirmation Toast near Billing Toggle when Yearly Selected */}
          {showYearlyToast && (
            <div className="bg-gray-900 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-1 duration-200 whitespace-nowrap">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Your yearly discount has been applied!</span>
              <button
                type="button"
                onClick={() => setShowYearlyToast(false)}
                className="text-gray-400 hover:text-white ml-1.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* 5-Plan Responsive Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 items-stretch">
          {plansList.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const isLoading = loadingPlanId === plan.id;
            const isPro = plan.isPopular;
            const isGrowth = plan.isBestValue;
            const priceFormatted = plan.id === 'free'
              ? '₹0'
              : isYearly
              ? `₹${plan.yearlyPriceInr.toLocaleString('en-IN')}`
              : `₹${plan.priceInr.toLocaleString('en-IN')}`;
            const periodLabel = plan.id === 'free' ? (isYearly ? '/year' : '/month') : (isYearly ? '/year' : '/month');

            return (
              <div
                key={plan.id}
                onClick={() => {
                  if (isLoading) setLoadingPlanId(null);
                }}
                className={`relative flex flex-col justify-between bg-white rounded-3xl transition-all duration-200 ${
                  isPro
                    ? 'border-2 border-emerald-500 shadow-xl ring-4 ring-emerald-500/10 scale-[1.02] z-10'
                    : isGrowth
                    ? 'border-2 border-blue-500 shadow-xl ring-4 ring-blue-500/10 scale-[1.01] z-10'
                    : 'border border-gray-200/90 shadow-xs hover:shadow-md hover:border-gray-300'
                } p-7`}
              >
                {/* Badges */}
                {isPro && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-black tracking-wider uppercase px-3.5 py-1 rounded-full shadow-md flex items-center space-x-1 whitespace-nowrap">
                    <Sparkles className="w-3 h-3" />
                    <span>MOST POPULAR</span>
                  </div>
                )}
                {isGrowth && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black tracking-wider uppercase px-3.5 py-1 rounded-full shadow-md flex items-center space-x-1 whitespace-nowrap">
                    <Zap className="w-3 h-3 fill-white" />
                    <span>BEST VALUE</span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Plan Header */}
                  <div>
                    <h3 className="text-xl font-black text-gray-950">{plan.name}</h3>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">{plan.tagline}</p>
                  </div>

                  {/* Price Display */}
                  <div className="pt-2 pb-2 border-b border-gray-100">
                    {/* Normal annual price strikethrough in yearly mode */}
                    {isYearly && plan.id !== 'free' && (
                      <div className="text-xs text-gray-400 font-medium line-through">
                        ₹{plan.normalAnnualPriceInr.toLocaleString('en-IN')}/year
                      </div>
                    )}

                    <div className="flex items-baseline space-x-1">
                      <span className="text-3xl sm:text-4xl font-black text-gray-950">
                        {priceFormatted}
                      </span>
                      <span className="text-xs font-semibold text-gray-500">{periodLabel}</span>
                    </div>

                    {/* Actual Yearly Savings Badge */}
                    {isYearly && plan.id !== 'free' && (
                      <div className="mt-1.5">
                        <span className="inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Save ₹{plan.yearlySavingsInr.toLocaleString('en-IN')} yearly
                        </span>
                      </div>
                    )}

                    <p className="text-[11px] text-gray-400 font-medium mt-1">
                      {plan.id === 'free'
                        ? 'Free forever'
                        : isYearly
                        ? 'Billed yearly in INR'
                        : 'Billed monthly in INR'}
                    </p>
                  </div>

                  {/* Core Capacity Highlights */}
                  <div className="bg-gray-50/80 rounded-2xl p-3.5 border border-gray-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 font-semibold">Connected Channels:</span>
                      <span className="font-bold text-gray-950">{plan.channelsLimit} channels</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 font-semibold">Monthly Posts:</span>
                      <span className={`font-bold ${plan.id === 'free' ? 'text-gray-950' : 'text-emerald-700'}`}>
                        {plan.id === 'free' ? '15 total/month (5/channel)' : 'Unlimited posts'}
                      </span>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="space-y-2.5 pt-2">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Included Benefits</p>
                    <ul className="space-y-2">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start text-xs text-gray-700 leading-snug">
                          <Check className={`w-4 h-4 mr-2 shrink-0 mt-0.5 ${
                            isPro ? 'text-emerald-600' : isGrowth ? 'text-blue-600' : 'text-gray-700'
                          }`} />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Bottom CTA Button */}
                <div className="pt-6 mt-6 border-t border-gray-100 flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={isCurrent || isLoading}
                    onClick={() => handleSelectPlan(plan)}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-default ${
                      isCurrent
                        ? 'bg-gray-100 text-gray-500 border border-gray-200'
                        : isPro
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 shadow-md'
                        : isGrowth
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 shadow-md'
                        : plan.id === 'free'
                        ? 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300'
                        : 'bg-gray-900 hover:bg-black text-white'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing Checkout...</span>
                      </>
                    ) : isCurrent ? (
                      <span>Current Plan</span>
                    ) : plan.id === 'free' ? (
                      <span>Get Started Free</span>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>Upgrade to {plan.name}</span>
                      </>
                    )}
                  </button>

                  {/* Reset option if loading */}
                  {isLoading && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
                        setLoadingPlanId(null);
                      }}
                      className="py-2.5 px-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-xs font-semibold text-gray-700 cursor-pointer shadow-2xs shrink-0"
                      title="Cancel checkout and reset"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust & Guarantee Badges */}
        <div className="max-w-4xl mx-auto pt-6 border-t border-gray-200/80">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center space-y-2 p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-gray-900">Official Platform APIs</h4>
              <p className="text-[11px] text-gray-500">
                100% compliant with Meta Graph API &amp; YouTube Data API. Your accounts remain safe.
              </p>
            </div>

            <div className="flex flex-col items-center space-y-2 p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-gray-900">100% Secure Encrypted Payments</h4>
              <p className="text-[11px] text-gray-500">
                Pay securely with UPI, Netbanking, Debit, or Credit cards. Encrypted and verified.
              </p>
            </div>

            <div className="flex flex-col items-center space-y-2 p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-gray-900">Cancel Anytime</h4>
              <p className="text-[11px] text-gray-500">
                Cancel your subscription with 1-click in account settings. All customer data and posts remain preserved.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
