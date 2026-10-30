'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { HorizontalComparisonBar } from './AdminCharts';

interface BillingViewProps {
  billingData: {
    subscriptions: any[];
    transactions: any[];
    stats: {
      mrr: number;
      totalRevenue: number;
      activeCount: number;
      cancelledCount: number;
      successfulPayments: number;
      failedPayments: number;
      providers: {
        razorpay: { active: number; revenue: number };
        stripe: { active: number; revenue: number };
      };
    };
  } | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const BillingView: React.FC<BillingViewProps> = ({
  billingData,
  isLoading,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'transactions'>('subscriptions');

  if (isLoading || !billingData) {
    return (
      <div className="space-y-6 animate-pulse p-6">
        <div className="h-8 w-48 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const { stats, subscriptions, transactions } = billingData;

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Subscriptions &amp; Revenue</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Verified payment provider records and MRR breakdown for Razorpay and Stripe.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <a
            href="/api/admin/export?type=billing"
            download
            className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Export Billing CSV</span>
          </a>

          <button
            type="button"
            onClick={onRefresh}
            className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer shadow-2xs"
            title="Refresh billing records"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
          <span className="text-[11px] text-gray-500 block">Monthly Recurring Revenue</span>
          <div className="text-2xl font-black text-gray-900">${stats.mrr.toLocaleString()}</div>
          <span className="text-[10px] text-emerald-600 font-semibold block">
            ${Math.round(stats.mrr * 12).toLocaleString()} Annual ARR
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <CreditCard className="w-4 h-4" />
          </div>
          <span className="text-[11px] text-gray-500 block">Active Subscriptions</span>
          <div className="text-2xl font-black text-gray-900">{stats.activeCount}</div>
          <span className="text-[10px] text-gray-400 block">{stats.cancelledCount} cancelled total</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span className="text-[11px] text-gray-500 block">Total Lifetime Revenue</span>
          <div className="text-2xl font-black text-gray-900">${stats.totalRevenue.toLocaleString()}</div>
          <span className="text-[10px] text-gray-400 block">Verified merchant webhooks</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Building className="w-4 h-4" />
          </div>
          <span className="text-[11px] text-gray-500 block">Payment Success Rate</span>
          <div className="text-2xl font-black text-gray-900">
            {stats.successfulPayments + stats.failedPayments > 0
              ? `${Math.round((stats.successfulPayments / (stats.successfulPayments + stats.failedPayments)) * 100)}%`
              : '100%'}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold block">
            {stats.successfulPayments} successful payments
          </span>
        </div>
      </div>

      {/* Gateway Providers Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Razorpay Gateway */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 font-mono">
                Razorpay
              </span>
              <span className="text-xs font-bold text-gray-900">India &amp; Global Cards / UPI</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              Active Gateway
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-400 block text-[10px]">Active Subscriptions</span>
              <span className="text-base font-black text-gray-900">{stats.providers.razorpay.active}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-400 block text-[10px]">Settled Revenue</span>
              <span className="text-base font-black text-gray-900">${stats.providers.razorpay.revenue.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Stripe Gateway */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black text-purple-900 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 font-mono">
                Stripe
              </span>
              <span className="text-xs font-bold text-gray-900">International Credit Cards</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              Active Gateway
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-400 block text-[10px]">Active Subscriptions</span>
              <span className="text-base font-black text-gray-900">{stats.providers.stripe.active}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-400 block text-[10px]">Settled Revenue</span>
              <span className="text-base font-black text-gray-900">${stats.providers.stripe.revenue.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Switch between Subscriptions & Transactions */}
      <div className="flex items-center space-x-2 border-b border-gray-200/80 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('subscriptions')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'subscriptions'
              ? 'bg-gray-900 text-white shadow-2xs'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          Customer Subscriptions ({subscriptions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('transactions')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'transactions'
              ? 'bg-gray-900 text-white shadow-2xs'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          Payment Transactions ({transactions.length})
        </button>
      </div>

      {/* Subscriptions Table */}
      {activeTab === 'subscriptions' && (
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Plan &amp; ID</th>
                  <th className="py-3 px-4">Customer ID</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Interval</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Gateway</th>
                  <th className="py-3 px-4">Next Renewal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-gray-400">
                      No active subscription records in database. Free Starter tier active.
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-gray-900">
                        {sub.plan_name}
                        <span className="text-[10px] text-gray-400 block font-mono">{sub.id}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-gray-600">{sub.user_id}</td>
                      <td className="py-3 px-4 font-black text-gray-900">
                        ${sub.amount} {sub.currency}
                      </td>
                      <td className="py-3 px-4 capitalize text-gray-600">{sub.billing_interval}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold uppercase text-gray-700">{sub.provider}</td>
                      <td className="py-3 px-4 text-gray-500">
                        {new Date(sub.current_period_end).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Payment ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Gateway</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-gray-400">
                      No payment transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-gray-900">{txn.provider_payment_id || txn.id}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-gray-600">{txn.user_id}</td>
                      <td className="py-3 px-4 font-black text-gray-900">${txn.amount} {txn.currency}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {txn.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 uppercase text-gray-700 font-semibold">{txn.provider}</td>
                      <td className="py-3 px-4 text-gray-500">{new Date(txn.created_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
