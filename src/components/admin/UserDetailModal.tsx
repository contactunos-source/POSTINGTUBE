'use client';

import React, { useState } from 'react';
import {
  X,
  User,
  Mail,
  Calendar,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Share2,
  Send,
  CreditCard,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Lock,
  Globe,
  Smartphone,
  Ban,
  Check,
} from 'lucide-react';
import { AdminCustomerProfile } from '@/lib/admin/service';
import { PlatformLogo } from '@/components/SocialIcons';

interface UserDetailModalProps {
  user: AdminCustomerProfile | null;
  onClose: () => void;
  onUpdateStatus: (userId: string, newStatus: 'active' | 'suspended') => Promise<void>;
  onUpdatePlan?: (userId: string, newPlan: 'free' | 'creator_pro' | 'agency_scale') => Promise<void>;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  user,
  onClose,
  onUpdateStatus,
  onUpdatePlan,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'accounts' | 'posts' | 'billing'>('info');
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'creator_pro' | 'agency_scale'>(user?.plan || 'free');
  const [isPlanUpdating, setIsPlanUpdating] = useState(false);
  const [planSuccessMsg, setPlanSuccessMsg] = useState('');

  if (!user) return null;

  const handleToggleStatus = async () => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    const confirmMsg =
      nextStatus === 'suspended'
        ? `Are you sure you want to suspend access for ${user.email}? They will be blocked from logging in.`
        : `Reactivate access for ${user.email}?`;

    if (!confirm(confirmMsg)) return;

    setIsUpdating(true);
    try {
      await onUpdateStatus(user.id, nextStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border border-gray-200/90 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-gray-900 to-gray-700 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-sm">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-gray-900">{user.fullName || 'Customer Profile'}</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    user.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {user.status}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 uppercase">
                  {user.plan.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 font-mono">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleToggleStatus}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                user.status === 'active'
                  ? 'bg-white hover:bg-rose-50 text-rose-600 border-rose-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent'
              }`}
            >
              {user.status === 'active' ? 'Suspend Account' : 'Reactivate Account'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center space-x-2 px-6 pt-3 border-b border-gray-100 bg-white">
          {[
            { id: 'info', label: 'Account Information', icon: User },
            { id: 'accounts', label: `Connected Accounts (${user.connectedAccountsCount})`, icon: Share2 },
            { id: 'posts', label: `Posts Activity (${user.postsCount.total})`, icon: Send },
            { id: 'billing', label: 'Subscription & Billing', icon: CreditCard },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center space-x-1.5 py-2.5 px-3 border-b-2 text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'border-gray-900 text-gray-900 font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: Account Information */}
          {activeTab === 'info' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Account Details</span>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-gray-200/50">
                      <span className="text-gray-500">User ID</span>
                      <span className="font-mono text-gray-800 text-[11px]">{user.id}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-200/50">
                      <span className="text-gray-500">Registered</span>
                      <span className="text-gray-800">{new Date(user.registeredAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-200/50">
                      <span className="text-gray-500">Last Seen</span>
                      <span className="text-gray-800">{new Date(user.lastActiveAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-500">Account Status</span>
                      <span className="font-bold capitalize text-emerald-600">{user.status}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Telemetry & Device</span>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-gray-200/50">
                      <span className="text-gray-500">Location</span>
                      <span className="text-gray-800">{user.country || 'India'} {user.city ? `(${user.city})` : ''}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-200/50">
                      <span className="text-gray-500">Device Category</span>
                      <span className="text-gray-800 capitalize">{user.device || 'Desktop'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-200/50">
                      <span className="text-gray-500">Browser</span>
                      <span className="text-gray-800">{user.browser || 'Chrome'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-500">Operating System</span>
                      <span className="text-gray-800">{user.os || 'Windows'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Safeguard Notice */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center space-x-2.5 text-xs text-amber-900">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Cybersecurity Safeguard:</strong> Passwords, access tokens, and private refresh credentials are never exposed to any administration interface.
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: Connected Social Accounts */}
          {activeTab === 'accounts' && (
            <div className="space-y-3 animate-fade-in">
              {user.connectedAccounts.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 bg-gray-50 rounded-2xl border border-gray-200/70">
                  No social accounts connected by this customer yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {user.connectedAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="p-4 rounded-2xl border border-gray-200/90 bg-white shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <PlatformLogo platform={acc.platform as any} className="w-5 h-5" />
                          <div>
                            <div className="text-xs font-bold text-gray-900">{acc.displayName}</div>
                            <div className="text-[10px] text-gray-400">@{acc.username}</div>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            acc.status === 'connected'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {acc.status}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                        <span>Connected: {new Date(acc.connectedAt).toLocaleDateString()}</span>
                        <span className="font-semibold text-gray-700">{acc.tokenExpiry}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Posts Activity */}
          {activeTab === 'posts' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/70">
                  <div className="text-xs text-gray-500">Total</div>
                  <div className="text-lg font-black text-gray-900">{user.postsCount.total}</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="text-xs text-emerald-700">Published</div>
                  <div className="text-lg font-black text-emerald-700">{user.postsCount.published}</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="text-xs text-blue-700">Scheduled</div>
                  <div className="text-lg font-black text-blue-700">{user.postsCount.scheduled}</div>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                  <div className="text-xs text-rose-700">Failed</div>
                  <div className="text-lg font-black text-rose-700">{user.postsCount.failed}</div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-700">Recent Posts</span>
                {user.recentPosts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-xl">No posts created yet.</div>
                ) : (
                  <div className="divide-y divide-gray-100 border border-gray-200/80 rounded-2xl overflow-hidden bg-white">
                    {user.recentPosts.map((post) => (
                      <div key={post.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-gray-50/50">
                        <div className="min-w-0 pr-4">
                          <p className="font-medium text-gray-900 truncate max-w-md">{post.content || '[No text caption]'}</p>
                          <span className="text-[10px] text-gray-400 block mt-0.5">
                            Created {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                            post.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : post.status === 'scheduled'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : post.status === 'failed'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {post.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Subscription & Billing */}
          {activeTab === 'billing' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-5 rounded-2xl border border-gray-200/90 bg-linear-to-br from-gray-50 to-white shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Current Plan</span>
                    <h3 className="text-base font-black text-gray-900 capitalize">
                      {user.subscription?.planName || `${user.plan.replace('_', ' ')} Plan`}
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-gray-900">
                      {user.subscription ? `$${user.subscription.amount}` : (user.plan === 'agency_scale' ? '$79' : user.plan === 'creator_pro' ? '$29' : '$0')}
                      <span className="text-xs font-normal text-gray-500">/{user.billingCycle}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-600 capitalize">{user.paymentStatus}</span>
                  </div>
                </div>

                {user.subscription && (
                  <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>Provider: <strong className="capitalize">{user.subscription.provider}</strong></div>
                    <div>Renewal: <strong>{new Date(user.subscription.currentPeriodEnd).toLocaleDateString()}</strong></div>
                  </div>
                )}
              </div>

              {/* Manage Customer Plan & Subscription Level */}
              {onUpdatePlan && (
                <div className="p-5 rounded-2xl border border-gray-200/90 bg-white shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">Change Pricing Plan</h4>
                      <p className="text-[11px] text-gray-500">Assign or upgrade this customer's plan in Supabase.</p>
                    </div>
                    {planSuccessMsg && (
                      <span className="text-xs font-semibold text-emerald-600 animate-fade-in">{planSuccessMsg}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'free', name: 'Free', price: '$0/mo', desc: '1 social account' },
                      { id: 'creator_pro', name: 'Creator Pro', price: '$29/mo', desc: '5 social accounts' },
                      { id: 'agency_scale', name: 'Agency Scale', price: '$79/mo', desc: 'Unlimited accounts' },
                    ].map((planOption) => (
                      <button
                        key={planOption.id}
                        type="button"
                        onClick={() => setSelectedPlan(planOption.id as any)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          selectedPlan === planOption.id
                            ? 'border-gray-900 bg-gray-50/80 shadow-2xs'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-900">{planOption.name}</span>
                          <span className="text-[10px] font-mono text-gray-500">{planOption.price}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 block mt-1">{planOption.desc}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={isPlanUpdating || selectedPlan === user.plan}
                      onClick={async () => {
                        setIsPlanUpdating(true);
                        setPlanSuccessMsg('');
                        try {
                          await onUpdatePlan(user.id, selectedPlan);
                          setPlanSuccessMsg('Plan updated successfully!');
                          setTimeout(() => setPlanSuccessMsg(''), 3000);
                        } finally {
                          setIsPlanUpdating(false);
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isPlanUpdating ? 'Updating Plan...' : 'Save Plan Changes'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
