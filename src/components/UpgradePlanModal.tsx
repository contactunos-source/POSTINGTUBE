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
            color: '#059669',
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
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 select-none font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#18191c] text-gray-100 rounded-3xl max-w-4xl w-full p-5 sm:p-8 shadow-2xl border border-[#282a2e] max-h-[94vh] overflow-y-auto space-y-6 animate-in zoom-in-95 duration-150">
        {/* Header & Controls Row (Buffer Layout Inspired) */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5 pb-6 border-b border-[#25272c] relative">
          <button
            onClick={onClose}
            className="absolute -top-1 -right-1 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="space-y-1 max-w-md pr-8">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Change your Plan
            </h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              You&apos;re on the <strong className="text-white font-bold">{currentPlan}</strong> plan with {isCurrentlyPro ? `${channels} channels` : 'up to 3 channels'}. Add or remove channels to customize your plan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 pr-6">
            {/* Currency Switcher */}
            <div className="inline-flex items-center bg-[#202227] p-1 rounded-xl border border-[#2f323a]">
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

            {/* Top Quantity Badge */}
            <div className="inline-flex items-center space-x-1.5 bg-[#202227] border border-[#2f323a] rounded-xl px-2 py-1">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={channels <= 1}
                className="w-6 h-6 rounded-md bg-[#2b2e36] hover:bg-[#353942] disabled:opacity-30 text-gray-200 flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed text-xs font-bold"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-bold text-gray-200 min-w-[75px] text-center font-mono">
                {channels} {channels === 1 ? 'ch' : 'chs'}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={channels >= 100}
                className="w-6 h-6 rounded-md bg-[#2b2e36] hover:bg-[#353942] disabled:opacity-30 text-gray-200 flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Billing Switcher (Pay Monthly / Pay Yearly) */}
            <div className="inline-flex items-center bg-[#202227] p-1 rounded-xl border border-[#2f323a]">
              <button
                type="button"
                onClick={() => setBillingInterval('monthly')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
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
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
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

        {errorMsg && (
          <div className="p-3 bg-rose-950/70 border border-rose-800/80 rounded-xl text-xs text-rose-200 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-rose-400 hover:text-white font-bold ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 2 Plans Side-by-Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
          {/* Card 1: Free */}
          <div
            className={`bg-[#1c1d22] border rounded-2xl p-5 sm:p-6 flex flex-col justify-between ${
              !isCurrentlyPro ? 'border-emerald-500/40' : 'border-[#292c33]'
            }`}
          >
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Free</h3>
                  <div className="text-2xl font-black text-white mt-1.5">
                    {currencySymbol}0 <span className="text-xs font-normal text-gray-400">/ forever</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Connect up to 3 channels
                  </div>
                </div>

                {!isCurrentlyPro && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                    Current Plan
                  </span>
                )}
              </div>

              <div className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-gray-400 bg-white/5 border border-white/10 text-center select-none">
                {!isCurrentlyPro ? 'Current Plan Active' : 'Free Tier'}
              </div>

              <div className="border-t border-[#2a2c33]" />

              <div className="space-y-2.5">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Included in Free:
                </div>
                <ul className="space-y-2 text-xs text-gray-300">
                  <li className="flex items-start space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Up to 3 connected social channels</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>5 scheduled posts per connected channel</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>1 user account</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Basic analytics</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Core scheduling & publishing access</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-4 text-[11px] text-gray-500">
              Forever free • No credit card required
            </div>
          </div>

          {/* Card 2: Pro */}
          <div
            className={`bg-[#1c1d22] border-2 rounded-2xl p-5 sm:p-6 flex flex-col justify-between ${
              isCurrentlyPro ? 'border-emerald-500' : 'border-emerald-500/70 shadow-lg shadow-emerald-950/30'
            }`}
          >
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-white">Pro</h3>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Recommended
                    </span>
                  </div>
                  <div className="text-2xl font-black text-white mt-1.5">
                    {currencySymbol}
                    {activePrice.toLocaleString()}{' '}
                    <span className="text-xs font-normal text-gray-400">
                      / {billingInterval === 'yearly' ? 'year' : 'month'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {channels} {channels === 1 ? 'channel' : 'channels'} • billed {billingInterval}
                    {billingInterval === 'yearly' && (
                      <span className="text-emerald-400 ml-1 font-medium">
                        ({currencySymbol}{totalMonthlyPrice.toLocaleString()}/mo)
                      </span>
                    )}
                  </div>
                </div>

                {isCurrentlyPro && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                    Current Plan
                  </span>
                )}
              </div>

              {/* Centralized Pro Channel Selector */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 flex flex-col items-center justify-center space-y-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Select Channels to Connect
                </span>

                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={channels <= 1}
                    aria-label="Decrease channel quantity"
                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 disabled:opacity-30 text-white flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed font-bold"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="min-w-[110px] text-center">
                    <div className="text-xl font-black text-white tracking-tight font-mono">
                      {channels}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {channels === 1 ? 'Social Channel' : 'Social Channels'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={channels >= 100}
                    aria-label="Increase channel quantity"
                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 disabled:opacity-30 text-white flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed font-bold"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <span className="text-[10px] text-emerald-400/90 font-medium">
                  {currencySymbol}{pricePerChannel} per channel / month
                </span>
              </div>

              {/* Pro Plan CTA */}
              <button
                type="button"
                disabled={isLoading}
                onClick={handleCheckout}
                className="w-full py-3 px-5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md shadow-emerald-950/40 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Secure Checkout...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-white" />
                    <span>Upgrade to Pro</span>
                  </>
                )}
              </button>

              <div className="border-t border-[#2a2c33]" />

              <div className="space-y-2.5">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Everything in Free, plus:
                </div>
                <ul className="space-y-2 text-xs text-gray-200">
                  <li className="flex items-start space-x-2">
                    <span className="text-emerald-400 font-bold text-sm leading-none mt-0.5">∞</span>
                    <span className="font-medium text-white">Unlimited posts</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-emerald-400 font-bold text-sm leading-none mt-0.5">∞</span>
                    <span>Unlimited scheduling <span className="text-gray-400 text-[10px]">(subject to platform/API restrictions)</span></span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>1 user account</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Advanced analytics & performance tracking</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Post management & publishing history</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Supported social platform integrations</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between text-[10px] text-gray-500 border-t border-white/5 mt-4">
              <span className="flex items-center space-x-1">
                <Lock className="w-3 h-3 text-emerald-500" />
                <span>256-bit encryption</span>
              </span>
              <span className="flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span>Cancel anytime</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
