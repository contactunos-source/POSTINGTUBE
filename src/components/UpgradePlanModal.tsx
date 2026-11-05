'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  Check,
  Minus,
  Plus,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { PRICING_CONFIG } from '@/lib/pricing-config';
import { supabase } from '@/lib/supabase';

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: string;
  channelsCount?: number;
  onPlanUpdated?: () => void;
}

export const UpgradePlanModal: React.FC<UpgradePlanModalProps> = ({
  isOpen,
  onClose,
  currentPlan = 'Free',
  channelsCount: initialChannels = 1,
  onPlanUpdated,
}) => {
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [channels, setChannels] = useState<number>(() => Math.max(1, initialChannels || 1));
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialChannels && initialChannels > 0) {
      setChannels(Math.max(1, initialChannels));
    }
  }, [initialChannels]);

  if (!isOpen) return null;

  const pricePerChannel =
    currency === 'INR'
      ? PRICING_CONFIG.pro.pricePerChannelInr
      : PRICING_CONFIG.pro.pricePerChannelUsd;

  const currencySymbol = currency === 'INR' ? '₹' : '$';
  const totalMonthlyPrice = channels * pricePerChannel;
  const totalYearlyPrice = channels * pricePerChannel * 12;
  const activePrice = billingInterval === 'yearly' ? totalYearlyPrice : totalMonthlyPrice;
  const isCurrentlyPro = (currentPlan || '').toLowerCase().includes('pro');

  const handleIncrement = () => {
    if (channels < PRICING_CONFIG.pro.maxChannels) {
      setChannels((c) => c + 1);
    }
  };

  const handleDecrement = () => {
    if (channels > PRICING_CONFIG.pro.minChannels) {
      setChannels((c) => c - 1);
    }
  };

  const handleCheckout = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    let userId = 'customer';
    let userEmail = '';

    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          userId = session.user.id;
          userEmail = session.user.email || '';
        }
      } catch {}
    }

    if (currency === 'INR') {
      try {
        // Load Razorpay Script
        if (typeof window !== 'undefined' && !window.Razorpay) {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
          });
        }

        const res = await fetch('/api/billing/razorpay/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelsCount: channels,
            userId,
            userEmail,
            currency: 'INR',
            billingInterval,
          }),
        });

        const orderData = await res.json();
        if (!res.ok || !orderData.success) {
          throw new Error(orderData.error || 'Failed to initialize Razorpay order');
        }

        const { order } = orderData;

        const options = {
          key: order.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_postingtube_prod',
          amount: order.amount,
          currency: 'INR',
          name: 'PostingTube',
          description: `Pro Plan (${channels} ${channels === 1 ? 'Channel' : 'Channels'}) • ${billingInterval === 'yearly' ? 'Yearly' : 'Monthly'}`,
          order_id: order.id.startsWith('order_') ? order.id : undefined,
          prefill: {
            email: userEmail,
          },
          theme: {
            color: '#09090b',
          },
          handler: async function (response: any) {
            try {
              const verifyRes = await fetch('/api/billing/razorpay/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id || order.id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature || 'verified_sig',
                  channelsCount: channels,
                  userId,
                  userEmail,
                  amount: activePrice,
                  billingInterval,
                }),
              });

              const vData = await verifyRes.json();
              if (verifyRes.ok && vData.success) {
                if (onPlanUpdated) onPlanUpdated();
                onClose();
                window.location.href = '/dashboard?payment=success&plan=pro';
              } else {
                setErrorMsg(vData.error || 'Payment verification failed');
              }
            } catch (vErr: any) {
              setErrorMsg(vErr?.message || 'Error verifying payment');
            } finally {
              setIsLoading(false);
            }
          },
          modal: {
            ondismiss: function () {
              setIsLoading(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp: any) {
          setErrorMsg(resp?.error?.description || 'Payment was declined or cancelled.');
          setIsLoading(false);
        });
        rzp.open();
      } catch (err: any) {
        setErrorMsg(err?.message || 'Failed to initialize payment gateway.');
        setIsLoading(false);
      }
    } else {
      // Stripe USD Checkout
      try {
        const stripeRes = await fetch('/api/billing/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelsCount: channels,
            userId,
            userEmail,
            billingInterval,
          }),
        });

        const data = await stripeRes.json();
        if (data?.url) {
          window.location.href = data.url;
        } else if (data?.success) {
          if (onPlanUpdated) onPlanUpdated();
          onClose();
          window.location.href = '/dashboard?payment=success&plan=pro';
        } else {
          throw new Error(data.error || 'Failed to create Stripe checkout session');
        }
      } catch (sErr: any) {
        setErrorMsg(sErr?.message || 'Failed to initiate USD checkout');
        setIsLoading(false);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 select-none font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#f8f9fa] text-gray-900 rounded-[28px] max-w-3xl w-full p-5 sm:p-7 shadow-2xl border border-gray-200/90 max-h-[94vh] overflow-y-auto space-y-6 animate-in zoom-in-95 duration-150 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-950 hover:bg-gray-200/60 transition-colors cursor-pointer z-10"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Top Header (Matching Reference Design) */}
        <div className="text-center max-w-md mx-auto space-y-2 pt-2">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
            Choose the Plan That Fits Your Growth
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 font-normal">
            Start free, or scale your social media workflow with PostingTube Pro.
          </p>

          {/* Switchers Row (Billing Interval & Currency) */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            {/* Billing Switcher */}
            <div className="inline-flex items-center bg-white p-1 rounded-full border border-gray-200/90 shadow-2xs">
              <button
                type="button"
                onClick={() => setBillingInterval('monthly')}
                className={`px-3.5 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
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
                className={`px-3.5 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  billingInterval === 'yearly'
                    ? 'bg-gray-950 text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-950'
                }`}
              >
                Pay Yearly
              </button>
            </div>

            {/* Currency Switcher */}
            <div className="inline-flex items-center bg-white p-1 rounded-full border border-gray-200/90 shadow-2xs">
              <button
                type="button"
                onClick={() => setCurrency('INR')}
                className={`px-2.5 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  currency === 'INR'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-950'
                }`}
              >
                ₹ INR
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-2.5 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  currency === 'USD'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-950'
                }`}
              >
                $ USD
              </button>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-rose-600 hover:text-rose-950 font-bold ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 2 Plans Grid: Free vs Pro (Exact Reference Card Architecture) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          {/* CARD 1: FREE */}
          <div className="bg-white rounded-[24px] border border-gray-200/90 shadow-xs p-3 space-y-4">
            {/* Top Elevated Pod Card */}
            <div className="bg-[#f3f4f6] border border-gray-200/60 rounded-[18px] p-5 shadow-[0_8px_18px_-6px_rgba(0,0,0,0.06)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="bg-white border border-gray-200 text-gray-800 text-[10px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full shadow-2xs">
                  Starter
                </span>
                {!isCurrentlyPro && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Current Plan
                  </span>
                )}
              </div>

              <div>
                <div className="text-3xl font-extrabold text-gray-950 tracking-tight">
                  {currencySymbol}0
                  <span className="text-xs font-medium text-gray-500">/month</span>
                </div>
                <div className="text-[11px] text-gray-500 font-medium mt-0.5">
                  Everything you need to get started.
                </div>
              </div>

              {/* Action */}
              <div className="pt-1">
                <div className="w-full py-2.5 px-4 rounded-full text-xs font-bold text-gray-500 bg-white/80 border border-gray-200 text-center select-none shadow-2xs">
                  {!isCurrentlyPro ? 'Current Plan Active' : 'Free Tier'}
                </div>
              </div>
            </div>

            {/* Lower Card: Feature List */}
            <div className="px-2 pb-2 space-y-2.5">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                What&apos;s Included:
              </div>
              <ul className="space-y-2 text-xs text-gray-600">
                <li className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-gray-400 stroke-[2.2] shrink-0 mt-0.5" />
                  <span>Maximum 3 connected social accounts</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-gray-400 stroke-[2.2] shrink-0 mt-0.5" />
                  <span>5 scheduled/published posts per connected account per month</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-gray-400 stroke-[2.2] shrink-0 mt-0.5" />
                  <span>Maximum 15 posts per month across 3 connected accounts</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-gray-400 stroke-[2.2] shrink-0 mt-0.5" />
                  <span>1 user</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-gray-400 stroke-[2.2] shrink-0 mt-0.5" />
                  <span>Basic analytics</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-gray-400 stroke-[2.2] shrink-0 mt-0.5" />
                  <span>Core scheduling and publishing</span>
                </li>
              </ul>
            </div>
          </div>

          {/* CARD 2: PRO (HERO) */}
          <div className="bg-white rounded-[24px] border-2 border-gray-900 shadow-md p-3 space-y-4">
            {/* Top Elevated Pod Card (With Soft Pastel Gradient Wash) */}
            <div className="bg-gradient-to-b from-[#e8ecf8] via-[#eef2fa] to-[#f4f6fa] border border-[#d6def0] rounded-[18px] p-5 shadow-[0_10px_20px_-6px_rgba(30,41,59,0.12)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="bg-white/90 border border-indigo-200 text-indigo-950 text-[10px] font-bold tracking-wide uppercase px-2.5 py-0.5 rounded-full shadow-2xs">
                  PROFESSIONAL
                </span>
                {isCurrentlyPro && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Current Plan
                  </span>
                )}
              </div>

              <div>
                <div className="text-3xl font-extrabold text-gray-950 tracking-tight">
                  {currencySymbol}
                  {activePrice.toLocaleString()}
                  <span className="text-xs font-medium text-gray-600">
                    /{billingInterval === 'yearly' ? 'year' : 'month'}
                  </span>
                </div>
                <div className="text-[11px] text-gray-600 font-medium mt-0.5">
                  More channels. More flexibility. Unlimited posts.
                </div>
              </div>

              {/* Centered, Unified, Compact Channel Selector */}
              <div className="space-y-1 text-center pt-0.5">
                <div className="text-[10px] font-bold text-gray-700">
                  How many channels do you need?
                </div>

                <div className="flex items-center justify-center pt-0.5">
                  <div className="inline-flex items-center space-x-2 bg-white/90 border border-gray-300 rounded-full px-2 py-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={handleDecrement}
                      disabled={channels <= 1}
                      aria-label="Decrease channel quantity"
                      className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 disabled:opacity-30 text-gray-800 flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed font-bold"
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    <div className="px-2 min-w-[90px] text-center font-mono">
                      <span className="text-sm font-black text-gray-950">
                        {channels}
                      </span>{' '}
                      <span className="text-[11px] font-semibold text-gray-600 font-sans">
                        {channels === 1 ? 'channel' : 'channels'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleIncrement}
                      disabled={channels >= 100}
                      aria-label="Increase channel quantity"
                      className="w-6 h-6 rounded-full bg-gray-900 hover:bg-black active:scale-95 disabled:opacity-30 text-white flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed font-bold"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="text-[10px] text-gray-500">
                  {currencySymbol}{pricePerChannel} per channel / month
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-1">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleCheckout}
                  className="w-full py-3 px-5 rounded-full text-xs sm:text-sm font-bold text-white bg-gradient-to-b from-[#24262b] to-[#09090b] hover:from-[#18191c] hover:to-[#000000] active:scale-[0.99] transition-all cursor-pointer shadow-md flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Processing Checkout...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>Upgrade to Pro</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Lower Card: Feature List */}
            <div className="px-2 pb-2 space-y-2.5">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Everything in Free, plus:
              </div>
              <ul className="space-y-2 text-xs text-gray-700">
                <li className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.2] shrink-0 mt-0.5" />
                  <span className="font-semibold text-gray-950">Unlimited posts</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.2] shrink-0 mt-0.5" />
                  <span>Unlimited scheduling</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.2] shrink-0 mt-0.5" />
                  <span>Advanced analytics & performance tracking</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.2] shrink-0 mt-0.5" />
                  <span>Post management & publishing history</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.2] shrink-0 mt-0.5" />
                  <span>Supported social platform integrations</span>
                </li>
              </ul>

              <div className="pt-2 flex items-center justify-between text-[10px] text-gray-500 border-t border-gray-100">
                <span className="flex items-center space-x-1">
                  <Lock className="w-3 h-3 text-gray-400" />
                  <span>256-bit encryption</span>
                </span>
                <span className="flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Cancel anytime</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
