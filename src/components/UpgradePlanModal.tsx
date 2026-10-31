'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  Check,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  Minus,
  Plus,
  Loader2,
  Lock,
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
  channelsCount: initialChannels = 3,
  onPlanUpdated,
}) => {
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [channels, setChannels] = useState<number>(() => Math.max(1, initialChannels || 3));
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

  const totalMonthlyPrice = channels * pricePerChannel;
  const currencySymbol = currency === 'INR' ? '₹' : '$';
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
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to initialize order');
        }

        const { order } = data;

        const options = {
          key: order.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_postingtube_prod',
          amount: order.amount,
          currency: 'INR',
          name: 'PostingTube',
          description: `Pro Plan (${channels} Channels) - ₹${totalMonthlyPrice}/mo`,
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
                  amount: totalMonthlyPrice,
                }),
              });

              const verifyData = await verifyRes.json();
              if (verifyRes.ok && verifyData.success) {
                onPlanUpdated?.();
                onClose();
                window.location.reload();
              } else {
                setErrorMsg(verifyData.error || 'Payment verification failed');
              }
            } catch (err: any) {
              setErrorMsg(err?.message || 'Verification error');
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
        rzp.on('payment.failed', function (r: any) {
          setErrorMsg(r?.error?.description || 'Payment was declined or cancelled');
          setIsLoading(false);
        });
        rzp.open();
      } catch (err: any) {
        setErrorMsg(err?.message || 'Failed to launch checkout');
        setIsLoading(false);
      }
    } else {
      // USD checkout via Stripe
      try {
        const stripeRes = await fetch('/api/billing/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelsCount: channels,
            userId,
            userEmail,
          }),
        });
        const data = await stripeRes.json();
        if (data?.url) {
          window.location.href = data.url;
        } else if (data?.success) {
          onPlanUpdated?.();
          onClose();
          window.location.reload();
        } else {
          throw new Error(data.error || 'Failed to start USD checkout');
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Failed to launch USD checkout');
        setIsLoading(false);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 select-none font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-gray-200 max-h-[92vh] overflow-y-auto space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-xs">
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-black text-gray-950 tracking-tight">
                  Upgrade to PostingTube Pro
                </h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {currentPlan} Active
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Scale your channels with unlimited scheduled posts and official platform analytics.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Currency Switcher */}
        <div className="flex justify-center">
          <div className="bg-gray-100 p-1 rounded-full border border-gray-200 inline-flex items-center space-x-1 shadow-inner text-xs">
            <button
              type="button"
              onClick={() => setCurrency('INR')}
              className={`px-3.5 py-1 rounded-full font-bold transition-all cursor-pointer ${
                currency === 'INR' ? 'bg-white text-gray-950 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              🇮🇳 INR (₹)
            </button>
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={`px-3.5 py-1 rounded-full font-bold transition-all cursor-pointer ${
                currency === 'USD' ? 'bg-white text-gray-950 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              🇺🇸 USD ($)
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Pricing Calculation Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-slate-50 border border-emerald-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider block">
                Total Monthly Price
              </span>
              <div className="flex items-baseline space-x-1.5 mt-0.5">
                <span className="text-3xl sm:text-4xl font-black text-gray-950">
                  {currencySymbol}{totalMonthlyPrice.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-gray-500">/ month</span>
              </div>
              <span className="text-[11px] text-gray-500">
                {currencySymbol}{pricePerChannel} × {channels} {channels === 1 ? 'channel' : 'channels'}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Plan Type</span>
              <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg inline-block mt-0.5">
                Pay Per Channel
              </span>
            </div>
          </div>

          {/* Interactive Channel Selector */}
          <div className="pt-2 border-t border-emerald-200/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-800">
              <span>Select Number of Channels:</span>
              <span className="text-emerald-700 font-extrabold">{channels}</span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={channels <= PRICING_CONFIG.pro.minChannels}
                className="w-10 h-10 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 text-gray-800 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Minus className="w-4 h-4 stroke-[2.5]" />
              </button>

              <div className="flex-1 text-center font-black text-xl text-gray-950 bg-white border border-gray-300 rounded-xl py-1.5 shadow-inner">
                {channels} <span className="text-xs font-normal text-gray-400">channels</span>
              </div>

              <button
                type="button"
                onClick={handleIncrement}
                disabled={channels >= PRICING_CONFIG.pro.maxChannels}
                className="w-10 h-10 rounded-xl border border-emerald-500 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Quick buttons */}
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 pt-1 text-[11px]">
              {[1, 3, 5, 10, 25, 50].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setChannels(n)}
                  className={`px-2 py-0.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    channels === n ? 'bg-emerald-600 text-white font-bold' : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                  }`}
                >
                  {n} ch
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
          <div className="flex items-center space-x-2">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Connect up to {channels} channels</span>
          </div>
          <div className="flex items-center space-x-2">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-semibold text-gray-900">Unlimited scheduled posts</span>
          </div>
          <div className="flex items-center space-x-2">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Advanced real-time analytics</span>
          </div>
          <div className="flex items-center space-x-2">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Priority publishing engine</span>
          </div>
        </div>

        {/* Checkout Button */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={handleCheckout}
            disabled={isLoading}
            className="w-full py-3.5 rounded-2xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Opening Checkout...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-white" />
                <span>
                  {isCurrentlyPro ? 'Update Channel Capacity' : 'Upgrade to Pro'} ({currencySymbol}{totalMonthlyPrice.toLocaleString()} / mo)
                </span>
              </>
            )}
          </button>

          <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
            <div className="flex items-center space-x-1">
              <Lock className="w-3 h-3 text-gray-400" />
              <span>Secure checkout via Razorpay &amp; Stripe</span>
            </div>
            <a
              href="/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 hover:underline font-semibold flex items-center space-x-1"
            >
              <span>View Full Pricing Page</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
