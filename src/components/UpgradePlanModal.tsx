'use client';

import React, { useState } from 'react';
import {
  X,
  Check,
  Loader2,
  Lock,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { PostingTubeLogo } from './PostingTubeLogo';
import {
  OFFICIAL_PLANS,
  PlanId,
  SubscriptionPlan,
  BillingInterval,
  BillingCurrency,
  getPlanDisplayPrice,
} from '@/lib/pricing-config';
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
  onPlanUpdated,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>('pro');
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [currency, setCurrency] = useState<BillingCurrency>('INR');
  const [showYearlyToast, setShowYearlyToast] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentNormalized = (currentPlan || '').toLowerCase();
  const paidPlans: SubscriptionPlan[] = [
    OFFICIAL_PLANS.starter,
    OFFICIAL_PLANS.pro,
    OFFICIAL_PLANS.growth,
    OFFICIAL_PLANS.agency,
  ];

  const handleToggleInterval = (interval: BillingInterval) => {
    if (interval === billingInterval) return;
    setBillingInterval(interval);
    if (interval === 'yearly') {
      setShowYearlyToast(true);
      setTimeout(() => setShowYearlyToast(false), 4500);
    } else {
      setShowYearlyToast(false);
    }
  };

  const handleCheckout = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    let userId = 'usr_customer';
    let userEmail = 'customer@postingtube.com';
    let userName = 'PostingTube Creator';

    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          userId = session.user.id;
          userEmail = session.user.email || 'customer@postingtube.com';
          userName = session.user.user_metadata?.full_name || userEmail.split('@')[0] || 'Creator';
        }
      } catch {}
    }

    // USD Checkout with Stripe
    if (currency === 'USD') {
      try {
        const stripeRes = await fetch('/api/billing/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: selectedPlanId,
            billingInterval,
            currency: 'USD',
            userId,
            userEmail,
          }),
        });

        const stripeData = await stripeRes.json();
        if (stripeRes.ok && stripeData.success && stripeData.url) {
          window.location.href = stripeData.url;
          return;
        } else {
          throw new Error(stripeData.error || 'Failed to initialize Stripe checkout.');
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Stripe checkout unavailable.');
        setIsLoading(false);
        return;
      }
    }

    // INR Checkout with Razorpay
    try {
      // 1. Ensure Razorpay script is loaded
      if (typeof window !== 'undefined' && !window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      const planConfig = OFFICIAL_PLANS[selectedPlanId];

      // 2. Initialize Order on Backend with billingInterval
      const res = await fetch('/api/billing/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlanId,
          billingInterval,
          currency: 'INR',
          userId,
          userEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to initialize payment gateway.');
      }

      const { order } = data;
      const intervalLabel = billingInterval === 'yearly' ? 'Yearly' : 'Monthly';

      // 3. Open Razorpay Checkout Modal
      const options = {
        key: order.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_postingtube_prod',
        amount: order.amount,
        currency: 'INR',
        name: 'PostingTube',
        description: `${planConfig.name} Plan • ${planConfig.channelsLimit} Channels • ${intervalLabel}`,
        order_id: order.id.startsWith('order_') ? order.id : undefined,
        prefill: {
          name: userName,
          email: userEmail,
        },
        theme: {
          color: selectedPlanId === 'growth' ? '#2563eb' : '#059669',
        },
        handler: async function (response: any) {
          try {
            // 4. Verify signature server-side
            const verifyRes = await fetch('/api/billing/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id || order.id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planId: selectedPlanId,
                billingInterval,
                currency: 'INR',
                userId,
                userEmail,
                amount: order.totalAmount,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              if (onPlanUpdated) onPlanUpdated();
              onClose();
              window.location.reload();
            } else {
              setErrorMsg(verifyData.error || 'Payment signature verification failed.');
            }
          } catch (vErr: any) {
            setErrorMsg(vErr?.message || 'Verification network error.');
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
        setErrorMsg(`Payment failed: ${resp.error?.description || 'Transaction declined'}`);
        setIsLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error('Modal checkout error:', err);
      setErrorMsg(err?.message || 'Payment initiation failed.');
      setIsLoading(false);
    }
  };

  const activePlanConfig = OFFICIAL_PLANS[selectedPlanId];
  const activePricing = getPlanDisplayPrice(activePlanConfig, billingInterval, currency);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header with Official PostingTube Logo */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <div className="flex items-center space-x-3">
            <PostingTubeLogo size="sm" />
            <div className="border-l border-gray-200 pl-3">
              <h2 className="text-base font-black text-gray-950">Upgrade Your Plan</h2>
              <p className="text-[11px] text-gray-500">Connect more social channels with unlimited post scheduling.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-2xl text-xs flex items-center justify-between">
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="font-bold text-rose-600 ml-2 cursor-pointer">
                Dismiss
              </button>
            </div>
          )}

          {/* Interactive Controls Bar: Monthly/Yearly Toggle + Currency Switcher */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/80 p-3 rounded-2xl border border-gray-100 relative">
            <div className="relative inline-flex items-center bg-white p-1 rounded-xl border border-gray-200 shadow-2xs">
              <button
                type="button"
                onClick={() => handleToggleInterval('monthly')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  billingInterval === 'monthly'
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-950'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => handleToggleInterval('yearly')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  billingInterval === 'yearly'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-950'
                }`}
              >
                <span>Yearly</span>
                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                  billingInterval === 'yearly' ? 'bg-white text-emerald-700' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  Save up to ₹7,989
                </span>
              </button>

              {/* Toast when yearly selected */}
              {showYearlyToast && (
                <div className="absolute -top-10 left-0 z-50 bg-gray-900 text-white text-[11px] font-bold px-3 py-1 rounded-lg shadow-xl flex items-center space-x-1.5 animate-in fade-in duration-150 whitespace-nowrap">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Your yearly discount has been applied!</span>
                </div>
              )}
            </div>

            <div className="inline-flex items-center bg-white p-1 rounded-xl border border-gray-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setCurrency('INR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currency === 'INR'
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-950'
                }`}
              >
                INR (₹)
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currency === 'USD'
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-950'
                }`}
              >
                USD ($)
              </button>
            </div>
          </div>

          {/* Plan Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {paidPlans.map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              const isCurrent = currentNormalized === plan.id;
              const pricing = getPlanDisplayPrice(plan, billingInterval, currency);
              const isYearly = billingInterval === 'yearly';

              return (
                <div
                  key={plan.id}
                  onClick={() => !isCurrent && setSelectedPlanId(plan.id)}
                  className={`relative p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-gray-50 border-gray-200 opacity-60 cursor-default'
                      : isSelected
                      ? plan.id === 'growth'
                        ? 'bg-blue-50/30 border-blue-500 shadow-md ring-2 ring-blue-500/10'
                        : 'bg-emerald-50/30 border-emerald-500 shadow-md ring-2 ring-emerald-500/10'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {plan.badge && (
                    <span className={`absolute -top-2.5 right-3 text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white shadow-xs ${
                      plan.id === 'growth' ? 'bg-blue-600' : 'bg-emerald-600'
                    }`}>
                      {plan.badge}
                    </span>
                  )}

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-base font-black text-gray-950">{plan.name}</h4>
                      <p className="text-[11px] text-gray-500">{plan.tagline}</p>
                    </div>

                    <div className="pt-1">
                      {isYearly && pricing.normalAnnualFormatted && (
                        <div className="text-[11px] text-gray-400 line-through font-medium">
                          {pricing.normalAnnualFormatted}/year
                        </div>
                      )}
                      <div className="text-2xl font-black text-gray-950">
                        {pricing.priceFormatted}
                        <span className="text-xs font-semibold text-gray-500">{pricing.periodLabel}</span>
                      </div>
                      {isYearly && pricing.savingsFormatted && (
                        <div className="mt-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Save {pricing.savingsFormatted} yearly
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-100/70 rounded-xl px-2.5 py-1 text-[11px] font-bold text-gray-700">
                      {plan.channelsLimit} Connected Channels
                    </div>

                    <ul className="space-y-1.5 pt-1 text-[11px] text-gray-600">
                      <li className="flex items-center space-x-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Unlimited posts</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{plan.channelsLimit} channel slots</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{plan.analyticsTier === 'advanced' ? 'Advanced' : 'Basic'} analytics</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-3 mt-3 border-t border-gray-100">
                    <span className={`text-[11px] font-bold block text-center ${
                      isCurrent
                        ? 'text-gray-400'
                        : isSelected
                        ? 'text-emerald-700'
                        : 'text-gray-500'
                    }`}>
                      {isCurrent ? 'Current Plan' : isSelected ? 'Selected' : 'Select Plan'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Plan Summary & Checkout Action */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-black text-gray-950">{activePlanConfig.name} Plan</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {activePricing.priceFormatted} {activePricing.periodLabel}
                </span>
                {billingInterval === 'yearly' && activePricing.savingsFormatted && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                    Save {activePricing.savingsFormatted}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Includes {activePlanConfig.channelsLimit} channels and unlimited post scheduling across all accounts.
              </p>
            </div>

            <button
              type="button"
              disabled={isLoading || currentNormalized === selectedPlanId}
              onClick={handleCheckout}
              className="py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Checkout...</span>
                </>
              ) : currentNormalized === selectedPlanId ? (
                <span>Already Subscribed</span>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Pay {activePricing.priceFormatted} &amp; Upgrade</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 shrink-0">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% Secure 256-bit encrypted payment verification.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
