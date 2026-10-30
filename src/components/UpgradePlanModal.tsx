'use client';

import React, { useState } from 'react';
import {
  X,
  Zap,
  Check,
  ShieldCheck,
  ExternalLink,
  Crown,
  Sparkles,
} from 'lucide-react';
import { PostingTubeLogo } from './PostingTubeLogo';

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: string;
  channelsCount?: number;
}

export const UpgradePlanModal: React.FC<UpgradePlanModalProps> = ({
  isOpen,
  onClose,
  currentPlan = 'Free',
  channelsCount = 0,
}) => {
  const [isAnnual, setIsAnnual] = useState(false);

  if (!isOpen) return null;

  const normalizedPlan = (currentPlan || 'Free').toLowerCase();

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 select-none font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-8 shadow-2xl border border-gray-200/90 max-h-[92vh] overflow-y-auto space-y-6 animate-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-sm">
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                  Upgrade Your PostingTube Plan
                </h2>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {currentPlan} Active
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Scale your multi-channel social posting, community image publishing, and official analytics.
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

        {/* Billing Switcher */}
        <div className="flex justify-center">
          <div className="inline-flex items-center space-x-2 bg-gray-100 p-1 rounded-full border border-gray-200 text-xs">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-3.5 py-1.5 rounded-full font-semibold transition-all cursor-pointer ${
                !isAnnual ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Monthly billing
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-3.5 py-1.5 rounded-full font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                isAnnual ? 'bg-black text-white shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <span>Annual billing</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-bold">
                Save 25%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-stretch">
          {/* Plan 1: Free Starter */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gray-50/60 border border-gray-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Free Starter</h3>
                {normalizedPlan.includes('free') && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                    Active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">For testing your initial posting setup.</p>
              <div className="mt-4 flex items-baseline space-x-1">
                <span className="text-3xl font-extrabold text-gray-900">$0</span>
                <span className="text-xs text-gray-500">/ forever</span>
              </div>

              <div className="mt-6 space-y-2.5 text-xs text-gray-700">
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>3 Connected Social Channels</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>30 Scheduled Posts per month</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>YouTube Community & Meta APIs</span>
                </div>
              </div>
            </div>

            <button
              disabled={normalizedPlan.includes('free')}
              onClick={() => {
                window.location.href = '/#pricing';
              }}
              className="mt-6 w-full py-2.5 rounded-xl text-xs font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {normalizedPlan.includes('free') ? 'Current Plan' : 'Downgrade'}
            </button>
          </div>

          {/* Plan 2: Creator Pro (Featured) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white border-2 border-emerald-600 relative flex flex-col justify-between shadow-md">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-xs flex items-center space-x-1">
              <Sparkles className="w-3 h-3" />
              <span>Recommended</span>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 flex items-center space-x-1">
                  <span>Creator Pro</span>
                </h3>
                {normalizedPlan.includes('pro') && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">For active creators and fast-growing brands.</p>
              <div className="mt-4 flex items-baseline space-x-1">
                <span className="text-3xl font-extrabold text-gray-900">
                  {isAnnual ? '$22' : '$29'}
                </span>
                <span className="text-xs text-gray-500">/ month</span>
              </div>

              <div className="mt-6 space-y-2.5 text-xs text-gray-700">
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-gray-900">10 Connected Channels</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-gray-900">Unlimited Scheduled Posts</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Real-Time Official Analytics</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>AI Caption & Tag Suggestions</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                window.location.href = '/#pricing';
              }}
              className="mt-6 w-full py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-white text-white" />
              <span>{normalizedPlan.includes('pro') ? 'Current Plan' : 'Upgrade to Creator Pro'}</span>
            </button>
          </div>

          {/* Plan 3: Agency Scale */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gray-50/60 border border-gray-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Agency Scale</h3>
                {normalizedPlan.includes('agency') && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">For digital agencies and media networks.</p>
              <div className="mt-4 flex items-baseline space-x-1">
                <span className="text-3xl font-extrabold text-gray-900">
                  {isAnnual ? '$59' : '$79'}
                </span>
                <span className="text-xs text-gray-500">/ month</span>
              </div>

              <div className="mt-6 space-y-2.5 text-xs text-gray-700">
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-gray-900">25 Connected Channels</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Multi-Tenant Workspaces</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>High-Priority Publishing Engine</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Dedicated Account Manager</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                window.location.href = '/#pricing';
              }}
              className="mt-6 w-full py-2.5 rounded-xl text-xs font-semibold bg-gray-900 hover:bg-black text-white transition-colors cursor-pointer"
            >
              {normalizedPlan.includes('agency') ? 'Current Plan' : 'Upgrade to Agency Scale'}
            </button>
          </div>
        </div>

        {/* Footer info link */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Secure billing powered by Stripe & Razorpay. Cancel anytime.</span>
          </div>
          <a
            href="/#pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 hover:underline font-semibold flex items-center space-x-1"
          >
            <span>View Full Details on Web</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
