'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Workspace, SocialAccount } from '@/types/social';
import {
  User,
  AlertTriangle,
  CheckCircle2,
  Camera,
  Trash2,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  Bell,
  Laptop,
  LogOut,
  Loader2,
  CreditCard,
  Zap,
  Sparkles,
  Check,
  Minus,
  Plus,
  RefreshCw,
  Calendar,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { supabase, signOutUser } from '@/lib/supabase';
import { DeleteChannelModal } from '@/components/DeleteChannelModal';
import { DeleteAccountModal } from '@/components/DeleteAccountModal';
import { UpgradePlanModal } from '@/components/UpgradePlanModal';
import { PRICING_CONFIG } from '@/lib/pricing-config';

interface SettingsViewProps {
  currentWorkspace: Workspace;
  onUpdateWorkspace: (updated: Workspace) => void;
  authUser?: any;
  accounts?: SocialAccount[];
  onRemoveAccount?: (id: string) => Promise<void> | void;
}

const PROFILE_STORAGE_KEY = 'pb_user_profile_v1';
const NOTIFICATIONS_STORAGE_KEY = 'pb_notification_prefs_v1';

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentWorkspace,
  onUpdateWorkspace,
  authUser,
  accounts = [],
  onRemoveAccount,
}) => {
  // Profile Form States
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [backupEmail, setBackupEmail] = useState<string>('');
  const [emailPendingVerification, setEmailPendingVerification] = useState(false);

  // Password States
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [passwordLoading, setPasswordLoading] = useState<boolean>(false);

  // Deletion Modals State
  const [channelToDelete, setChannelToDelete] = useState<SocialAccount | null>(null);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);

  // Notifications preferences
  const [notifyOnPublish, setNotifyOnPublish] = useState(true);
  const [notifyOnFailure, setNotifyOnFailure] = useState(true);
  const [notifyWeeklyDigest, setNotifyWeeklyDigest] = useState(false);

  // UI state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings Navigation Tab
  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'billing'>('profile');

  // Subscription & Billing States
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [usageData, setUsageData] = useState<any>(null);
  const [billingTransactions, setBillingTransactions] = useState<any[]>([]);
  const [isLoadingBilling, setIsLoadingBilling] = useState<boolean>(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);
  const [channelsAdjustCount, setChannelsAdjustCount] = useState<number>(3);
  const [isUpdatingChannels, setIsUpdatingChannels] = useState<boolean>(false);
  const [isCancellingSub, setIsCancellingSub] = useState<boolean>(false);

  // Fetch verified subscription & usage
  const loadBillingDetails = async () => {
    setIsLoadingBilling(true);
    try {
      const uId = authUser?.id || '';
      const uEmail = authUser?.email || email || '';
      const wsId = currentWorkspace?.id || '';
      const res = await fetch(`/api/billing/subscription?userId=${encodeURIComponent(uId)}&email=${encodeURIComponent(uEmail)}&workspaceId=${encodeURIComponent(wsId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSubscriptionData(data.subscription);
          setUsageData(data.usage);
          if (data.subscription?.channelsCount) {
            setChannelsAdjustCount(data.subscription.channelsCount);
          }
        }
      }
    } catch (err) {
      console.warn('Error fetching billing details:', err);
    } finally {
      setIsLoadingBilling(false);
    }
  };

  useEffect(() => {
    loadBillingDetails();
  }, [authUser?.id, authUser?.email, currentWorkspace?.id]);

  // Initialize and load saved profile
  useEffect(() => {
    // 1. Set from authUser if provided
    if (authUser) {
      if (authUser.email) setEmail(authUser.email);
      const metaName = authUser.user_metadata?.full_name || authUser.user_metadata?.name;
      if (metaName) {
        setName(metaName);
      } else if (authUser.email) {
        setName(authUser.email.split('@')[0]);
      }
      if (authUser.user_metadata?.avatar_url) {
        setPhotoUrl(authUser.user_metadata.avatar_url);
      }
      if (authUser.user_metadata?.backup_email) {
        setBackupEmail(authUser.user_metadata.backup_email);
      }
    }

    // 2. Load from localStorage if present
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.name && !name) setName(parsed.name);
          if (parsed.email && !email) setEmail(parsed.email);
          if (parsed.backupEmail && !backupEmail) setBackupEmail(parsed.backupEmail);
          if (parsed.photoUrl && !photoUrl) setPhotoUrl(parsed.photoUrl);
        }

        const storedNotifs = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
        if (storedNotifs) {
          const parsedNotifs = JSON.parse(storedNotifs);
          if (typeof parsedNotifs.notifyOnPublish === 'boolean') setNotifyOnPublish(parsedNotifs.notifyOnPublish);
          if (typeof parsedNotifs.notifyOnFailure === 'boolean') setNotifyOnFailure(parsedNotifs.notifyOnFailure);
          if (typeof parsedNotifs.notifyWeeklyDigest === 'boolean') setNotifyWeeklyDigest(parsedNotifs.notifyWeeklyDigest);
        }
      } catch (e) {
        console.error('Error loading stored settings:', e);
      }
    }
  }, [authUser]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const persistProfileToStorage = (overrides?: Partial<{
    name: string;
    email: string;
    backupEmail: string;
    photoUrl: string;
  }>) => {
    const data = {
      name: overrides?.name ?? name,
      email: overrides?.email ?? email,
      backupEmail: overrides?.backupEmail ?? backupEmail,
      photoUrl: overrides?.photoUrl ?? photoUrl,
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data));
    }
  };

  // 1. Profile Name Save
  const handleSaveName = async () => {
    if (!name.trim()) {
      setFieldErrors((prev) => ({ ...prev, name: 'Name cannot be blank' }));
      return;
    }
    setFieldErrors((prev) => ({ ...prev, name: '' }));
    setSavingField('name');

    try {
      if (supabase && authUser && authUser.id !== 'usr_guest_demo') {
        const { error } = await supabase.auth.updateUser({
          data: { full_name: name.trim() },
        });
        if (error) throw error;
      }

      persistProfileToStorage({ name: name.trim() });
      onUpdateWorkspace({
        ...currentWorkspace,
        name: name.trim(),
      });
      showToast('Name updated successfully');
    } catch (err: any) {
      console.error('Failed to update name:', err);
      showToast(err?.message || 'Failed to update name');
    } finally {
      setSavingField(null);
    }
  };

  // 2. Email Change (Supabase Auth Email Verification Flow)
  const handleSaveEmail = async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setFieldErrors((prev) => ({ ...prev, email: 'Please enter a valid email address' }));
      return;
    }
    setFieldErrors((prev) => ({ ...prev, email: '' }));
    setSavingField('email');

    try {
      if (supabase && authUser && authUser.id !== 'usr_guest_demo') {
        const { error } = await supabase.auth.updateUser({
          email: trimmed,
        });
        if (error) throw error;
        setEmailPendingVerification(true);
        showToast('Confirmation email sent! Check your inbox to confirm the change.');
      } else {
        persistProfileToStorage({ email: trimmed });
        showToast('Primary email updated in local profile.');
      }
    } catch (err: any) {
      console.error('Failed to update email:', err);
      showToast(err?.message || 'Failed to update email address.');
    } finally {
      setSavingField(null);
    }
  };

  // 3. Backup Email Save
  const handleSaveBackupEmail = async () => {
    const trimmed = backupEmail.trim();
    if (trimmed && !trimmed.includes('@')) {
      setFieldErrors((prev) => ({ ...prev, backupEmail: 'Please enter a valid backup email' }));
      return;
    }
    setFieldErrors((prev) => ({ ...prev, backupEmail: '' }));
    setSavingField('backupEmail');

    try {
      if (supabase && authUser && authUser.id !== 'usr_guest_demo') {
        const { error } = await supabase.auth.updateUser({
          data: { backup_email: trimmed },
        });
        if (error) throw error;
      }
      persistProfileToStorage({ backupEmail: trimmed });
      showToast('Backup recovery email updated');
    } catch (err: any) {
      console.error('Failed to update backup email:', err);
      showToast(err?.message || 'Failed to save backup email');
    } finally {
      setSavingField(null);
    }
  };

  // 4. Password Change Flow
  const handleChangePassword = async () => {
    if (!password) {
      setFieldErrors((prev) => ({ ...prev, password: 'Enter a new password' }));
      return;
    }
    if (password.length < 8) {
      setFieldErrors((prev) => ({ ...prev, password: 'Password must be at least 8 characters long' }));
      return;
    }
    if (confirmPassword && password !== confirmPassword) {
      setFieldErrors((prev) => ({ ...prev, password: 'Passwords do not match' }));
      return;
    }
    setFieldErrors((prev) => ({ ...prev, password: '' }));
    setPasswordLoading(true);

    try {
      if (supabase && authUser && authUser.id !== 'usr_guest_demo') {
        const { error } = await supabase.auth.updateUser({
          password: password,
        });
        if (error) throw error;
      }
      setPassword('');
      setConfirmPassword('');
      showToast('Password updated securely.');
    } catch (err: any) {
      console.error('Failed to update password:', err);
      showToast(err?.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // 5. Send Password Reset Link
  const handleSendResetEmail = async () => {
    const targetEmail = authUser?.email || email;
    if (!targetEmail) {
      showToast('No email address found to send reset link.');
      return;
    }
    try {
      if (supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined,
        });
        if (error) throw error;
        showToast(`Password reset link sent to ${targetEmail}`);
      } else {
        showToast('Password reset link dispatched.');
      }
    } catch (err: any) {
      console.error('Reset password email error:', err);
      showToast(err?.message || 'Failed to dispatch reset email.');
    }
  };

  // 6. Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Please choose an image under 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        setPhotoUrl(base64);
        persistProfileToStorage({ photoUrl: base64 });

        if (supabase && authUser && authUser.id !== 'usr_guest_demo') {
          await supabase.auth.updateUser({
            data: { avatar_url: base64 },
          }).catch((err) => console.warn('Avatar cloud sync warning:', err));
        }

        showToast('Profile photo updated successfully');
      };
      reader.readAsDataURL(file);
    }
  };

  // Notification Preferences Persistence
  const handleToggleNotification = (key: 'publish' | 'failure' | 'digest') => {
    let nextPublish = notifyOnPublish;
    let nextFailure = notifyOnFailure;
    let nextDigest = notifyWeeklyDigest;

    if (key === 'publish') nextPublish = !notifyOnPublish;
    if (key === 'failure') nextFailure = !notifyOnFailure;
    if (key === 'digest') nextDigest = !notifyWeeklyDigest;

    setNotifyOnPublish(nextPublish);
    setNotifyOnFailure(nextFailure);
    setNotifyWeeklyDigest(nextDigest);

    if (typeof window !== 'undefined') {
      localStorage.setItem(
        NOTIFICATIONS_STORAGE_KEY,
        JSON.stringify({
          notifyOnPublish: nextPublish,
          notifyOnFailure: nextFailure,
          notifyWeeklyDigest: nextDigest,
        })
      );
    }
    showToast('Notification preference updated');
  };

  // Calculate password strength
  const getPasswordStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  };
  const passwordStrength = getPasswordStrength();

  const handleUpdateChannelCapacity = async () => {
    setIsUpdatingChannels(true);
    try {
      const res = await fetch('/api/billing/change-channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: authUser?.id || subscriptionData?.userId,
          email: authUser?.email || email,
          newChannelsCount: channelsAdjustCount,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Channel capacity updated');
        loadBillingDetails();
      } else {
        alert(data.error || 'Failed to update channel capacity');
      }
    } catch (err: any) {
      alert(err?.message || 'Error updating capacity');
    } finally {
      setIsUpdatingChannels(false);
    }
  };

  const handleCancelPlan = async () => {
    if (
      !confirm(
        'Are you sure you want to cancel your Pro plan? Your existing social channels and published posts will NOT be deleted, but your future capacity will return to the Free plan limits.'
      )
    ) {
      return;
    }
    setIsCancellingSub(true);
    try {
      const res = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: authUser?.id || subscriptionData?.userId,
          email: authUser?.email || email,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Subscription cancelled');
        loadBillingDetails();
      } else {
        alert(data.error || 'Failed to cancel subscription');
      }
    } catch (err: any) {
      alert(err?.message || 'Cancellation error');
    } finally {
      setIsCancellingSub(false);
    }
  };

  const isProPlan = subscriptionData?.planId === 'pro' && subscriptionData?.status === 'active';
  const currencySymbol = subscriptionData?.currency === 'USD' ? '$' : '₹';
  const pricePerChannel = subscriptionData?.pricePerChannel || (subscriptionData?.currency === 'USD' ? 3 : 199);
  const totalAmount = subscriptionData?.amount || (subscriptionData?.channelsCount || 3) * pricePerChannel;

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-4xl mx-auto font-sans space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2.5 text-xs z-50 animate-fade-in border border-gray-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Settings Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveSettingsTab('profile')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSettingsTab === 'profile'
              ? 'bg-gray-900 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>General Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSettingsTab('billing')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSettingsTab === 'billing'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Subscription &amp; Billing</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase ${
              isProPlan
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {isProPlan ? 'Pro Active' : 'Free Plan'}
          </span>
        </button>
      </div>

      {/* TAB 1: SUBSCRIPTION & BILLING MANAGEMENT */}
      {activeSettingsTab === 'billing' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Plan Overview Card */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-6 space-y-6">
            <div className="flex items-start justify-between flex-wrap gap-4 border-b border-gray-100 pb-5">
              <div className="space-y-1">
                <div className="flex items-center space-x-2.5">
                  <h2 className="text-xl font-black text-gray-950">
                    {isProPlan ? 'Pro Plan' : 'Free Plan'}
                  </h2>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      isProPlan
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {isProPlan ? 'Active Subscription' : 'Free Active'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {isProPlan
                    ? `Configured for up to ${subscriptionData?.channelsCount || 3} connected social channels with unlimited scheduling.`
                    : 'Free starter tier with 3 social accounts and 5 scheduled posts per channel.'}
                </p>
              </div>

              <div>
                {!isProPlan ? (
                  <button
                    type="button"
                    onClick={() => setIsUpgradeModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span>Upgrade to Pro</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCancelPlan}
                    disabled={isCancellingSub}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isCancellingSub ? 'Cancelling...' : 'Cancel Subscription'}
                  </button>
                )}
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Channel Capacity */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                  Channels Connected
                </span>
                <div className="text-2xl font-black text-gray-900">
                  {usageData?.channels?.connected || accounts.length} /{' '}
                  <span className="text-gray-500 text-base">
                    {usageData?.channels?.limit || (isProPlan ? subscriptionData?.channelsCount : 3)}
                  </span>
                </div>
                <span className="text-[11px] text-gray-500 block">
                  {isProPlan ? 'Purchased capacity' : 'Max 3 channels on Free'}
                </span>
              </div>

              {/* Scheduled Posts */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                  Scheduled Posts
                </span>
                <div className="text-2xl font-black text-gray-900">
                  {isProPlan ? 'Unlimited' : `${usageData?.scheduledPosts?.total || 0} active`}
                </div>
                <span className="text-[11px] text-gray-500 block">
                  {isProPlan ? 'No scheduled post limits' : 'Max 5 per channel'}
                </span>
              </div>

              {/* Price Per Channel */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                  Price Per Channel
                </span>
                <div className="text-2xl font-black text-gray-900">
                  {isProPlan ? `${currencySymbol}${pricePerChannel}` : `${currencySymbol}0`}
                  <span className="text-xs text-gray-400 font-normal"> / mo</span>
                </div>
                <span className="text-[11px] text-gray-500 block">
                  {isProPlan ? 'Monthly recurring' : 'Free forever'}
                </span>
              </div>

              {/* Monthly Total */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                  Monthly Total
                </span>
                <div className="text-2xl font-black text-emerald-700">
                  {isProPlan ? `${currencySymbol}${totalAmount}` : `${currencySymbol}0`}
                  <span className="text-xs text-gray-400 font-normal"> / mo</span>
                </div>
                <span className="text-[11px] text-gray-500 block">
                  {subscriptionData?.currentPeriodEnd
                    ? `Next renewal: ${new Date(subscriptionData.currentPeriodEnd).toLocaleDateString()}`
                    : 'Active'}
                </span>
              </div>
            </div>

            {/* Scheduled Posts per channel usage (for Free users) */}
            {!isProPlan && usageData?.scheduledPosts?.byChannel && Object.keys(usageData.scheduledPosts.byChannel).length > 0 && (
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                <span className="text-xs font-bold text-amber-950 block">
                  Scheduled Posts Usage (5 Posts Limit Per Channel):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {Object.entries(usageData.scheduledPosts.byChannel).map(([accId, item]: any) => (
                    <div key={accId} className="p-2.5 bg-white rounded-lg border border-amber-200 text-xs flex items-center justify-between">
                      <span className="font-semibold text-gray-800 truncate mr-2">{item.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${item.scheduledCount >= 5 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'}`}>
                        {item.scheduledCount} / 5
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Channel Quantity Adjuster for Pro Plan Users */}
            {isProPlan && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-950">Modify Channel Quantity</h3>
                    <p className="text-xs text-gray-500">
                      Add or remove connected channels anytime. Your total updates automatically.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-white px-3 py-1 rounded-lg border border-gray-200">
                    {currencySymbol}{pricePerChannel} × {channelsAdjustCount} = {currencySymbol}{channelsAdjustCount * pricePerChannel}/mo
                  </span>
                </div>

                <div className="flex items-center space-x-3 max-w-sm">
                  <button
                    type="button"
                    onClick={() => setChannelsAdjustCount((c) => Math.max(1, c - 1))}
                    disabled={channelsAdjustCount <= 1}
                    className="w-10 h-10 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 text-gray-800 flex items-center justify-center transition-all cursor-pointer shadow-xs"
                  >
                    <Minus className="w-4 h-4 stroke-[2.5]" />
                  </button>

                  <div className="flex-1 text-center font-black text-lg text-gray-950 bg-white border border-gray-300 rounded-xl py-1.5 shadow-inner">
                    {channelsAdjustCount} <span className="text-xs font-normal text-gray-400">channels</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setChannelsAdjustCount((c) => Math.min(100, c + 1))}
                    disabled={channelsAdjustCount >= 100}
                    className="w-10 h-10 rounded-xl border border-emerald-500 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </button>

                  <button
                    type="button"
                    onClick={handleUpdateChannelCapacity}
                    disabled={isUpdatingChannels || channelsAdjustCount === subscriptionData?.channelsCount}
                    className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isUpdatingChannels ? 'Saving...' : 'Apply Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Payment & Invoicing History */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-950">Payment &amp; Invoicing History</h3>
                <p className="text-xs text-gray-500">Verified transaction receipts and automated renewals.</p>
              </div>
              <button
                type="button"
                onClick={loadBillingDetails}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                title="Refresh history"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {billingTransactions.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200/80 text-xs text-gray-500">
                {isProPlan
                  ? 'Your initial payment transaction has been processed. Official invoices will appear here upon next cycle.'
                  : 'No payment transactions yet. Free plan does not incur any charges.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Provider</th>
                      <th className="py-2.5 px-3">Payment ID</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-800">
                    {billingTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="py-3 px-3">{new Date(t.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-3 font-bold">
                          {t.currency === 'USD' ? '$' : '₹'}{t.amount}
                        </td>
                        <td className="py-3 px-3 capitalize">{t.provider}</td>
                        <td className="py-3 px-3 font-mono text-[11px] text-gray-500">{t.providerPaymentId}</td>
                        <td className="py-3 px-3 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {t.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GENERAL PROFILE (ORIGINAL SETTINGS CONTENT) */}
      {activeSettingsTab === 'profile' && (
      /* Main Settings Card */
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-4 sm:p-8 space-y-8 animate-in fade-in duration-150">
        {/* Photo Section */}
        <div className="flex items-center space-x-4 sm:space-x-5">
          <div
            className="relative group cursor-pointer shrink-0"
            onClick={() => fileInputRef.current?.click()}
            title="Click to change photo"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[#2563EB] text-white flex items-center justify-center overflow-hidden shadow-xs border border-blue-400/30">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="w-8 h-8 sm:w-9 sm:h-9 text-white/90" />
              )}
            </div>
            <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
              <Camera className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-0.5 min-w-0">
            <h3 className="text-sm font-bold text-gray-900">Photo</h3>
            <p className="text-xs text-gray-500 line-clamp-2 sm:line-clamp-none">
              Please choose a photo that is at least 180×180 pixels in size.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium pt-1 inline-block cursor-pointer"
            >
              Upload new photo
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>

        {/* Form Fields: Name, Email, Backup Email, Password */}
        <div className="space-y-5 max-w-2xl">
          {/* Name Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 block">Name</label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-hidden focus:border-blue-500 text-gray-800 bg-white shadow-2xs font-medium"
              />
              <button
                type="button"
                onClick={handleSaveName}
                disabled={savingField === 'name'}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors shrink-0 cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1 w-full sm:w-auto"
              >
                {savingField === 'name' ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
            {fieldErrors.name && (
              <p className="text-[11px] text-red-500 font-medium">{fieldErrors.name}</p>
            )}
          </div>

          {/* Email Field with Alert icon & Supabase Verification */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 block">Email</label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <div className="flex-1 relative flex items-center">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-3.5 py-2 pr-9 text-xs rounded-xl border border-gray-200 focus:outline-hidden focus:border-blue-500 text-gray-800 bg-white shadow-2xs font-medium"
                />
                <AlertTriangle className="w-4 h-4 text-amber-500 absolute right-3 shrink-0 pointer-events-none" />
              </div>
              <button
                type="button"
                onClick={handleSaveEmail}
                disabled={savingField === 'email'}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors shrink-0 cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1 w-full sm:w-auto"
              >
                {savingField === 'email' ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
            {emailPendingVerification && (
              <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2 leading-relaxed">
                Verification email dispatched. Please check both your current and new inbox to confirm this change before it takes effect.
              </p>
            )}
            {fieldErrors.email && (
              <p className="text-[11px] text-red-500 font-medium">{fieldErrors.email}</p>
            )}
          </div>

          {/* Backup Email Field */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <label className="text-xs font-bold text-gray-800 block">Backup Email</label>
              <span className="text-[10px] text-gray-400">Security & Recovery notifications only</span>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <input
                type="email"
                value={backupEmail}
                onChange={(e) => setBackupEmail(e.target.value)}
                placeholder="backup.recovery@example.com"
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-hidden focus:border-blue-500 text-gray-800 bg-white shadow-2xs font-medium"
              />
              <button
                type="button"
                onClick={handleSaveBackupEmail}
                disabled={savingField === 'backupEmail'}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors shrink-0 cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1 w-full sm:w-auto"
              >
                {savingField === 'backupEmail' ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
            {fieldErrors.backupEmail && (
              <p className="text-[11px] text-red-500 font-medium">{fieldErrors.backupEmail}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <label className="text-xs font-bold text-gray-800 block">Password</label>
              <button
                type="button"
                onClick={handleSendResetEmail}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
              >
                Send Password Reset Email
              </button>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <div className="flex-1 relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password (min 8 characters)"
                  className="w-full px-3.5 py-2 pr-9 text-xs rounded-xl border border-gray-200 focus:outline-hidden focus:border-blue-500 text-gray-800 bg-white shadow-2xs font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={passwordLoading || !password}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors shrink-0 cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1 w-full sm:w-auto"
              >
                {passwordLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Change Password</span>
                )}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="flex items-center space-x-1.5 h-1.5 w-full max-w-xs">
                  <div
                    className={`h-full flex-1 rounded-full ${
                      passwordStrength >= 1 ? 'bg-red-500' : 'bg-gray-200'
                    }`}
                  />
                  <div
                    className={`h-full flex-1 rounded-full ${
                      passwordStrength >= 2 ? 'bg-amber-500' : 'bg-gray-200'
                    }`}
                  />
                  <div
                    className={`h-full flex-1 rounded-full ${
                      passwordStrength >= 3 ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                  />
                  <div
                    className={`h-full flex-1 rounded-full ${
                      passwordStrength >= 4 ? 'bg-emerald-500' : 'bg-gray-200'
                    }`}
                  />
                </div>
                <div className="text-[10px] text-gray-400 font-medium">
                  {passwordStrength <= 1 && 'Weak password'}
                  {passwordStrength === 2 && 'Fair password'}
                  {passwordStrength === 3 && 'Good password'}
                  {passwordStrength >= 4 && 'Strong password'}
                </div>
              </div>
            )}

            {fieldErrors.password && (
              <p className="text-[11px] text-red-500 font-medium">{fieldErrors.password}</p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200/80 pt-2" />

        {/* Connected Social Channels Management Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Connected Channels</h3>
              <p className="text-xs text-gray-500">
                Manage and disconnect your active Facebook Pages and Instagram Business destinations.
              </p>
            </div>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
              {accounts.length} {accounts.length === 1 ? 'channel' : 'channels'} active
            </span>
          </div>

          {accounts.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-xs text-gray-500">
              No social channels connected yet. Go to the Channels page to link your Facebook or Instagram account.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {accounts.map((acc) => {
                const isFb = acc.platform === 'facebook';
                const isIg = acc.platform === 'instagram';

                return (
                  <div
                    key={acc.id}
                    className="p-3.5 bg-gray-50 border border-gray-200/90 rounded-xl flex items-center justify-between shadow-2xs hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      {acc.avatarUrl ? (
                        <img
                          src={acc.avatarUrl}
                          alt={acc.displayName}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-2xs shrink-0"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(acc.displayName || acc.username)}&background=059669&color=fff&size=128&bold=true`;
                          }}
                        />
                      ) : (
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 ${
                            isFb ? 'bg-[#1877F2]' : isIg ? 'bg-pink-600' : 'bg-gray-700'
                          }`}
                        >
                          {acc.displayName.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-900 truncate">
                          {acc.displayName}
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center space-x-1.5">
                          <span className="capitalize font-medium text-gray-700">
                            {acc.platform}
                          </span>
                          <span>•</span>
                          <span className="text-emerald-600 font-medium">Connected</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setChannelToDelete(acc)}
                      title={`Disconnect ${acc.displayName}`}
                      className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-white hover:bg-rose-600 rounded-lg border border-rose-200 hover:border-rose-600 transition-colors flex items-center space-x-1 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="font-medium">Delete</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200/80 pt-2" />

        {/* Notification Preferences Section */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4 text-gray-700" />
            <h3 className="text-sm font-bold text-gray-900">Email & Alert Preferences</h3>
          </div>
          <div className="space-y-2.5 max-w-2xl text-xs">
            <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:bg-gray-50/60 transition-colors cursor-pointer">
              <div className="space-y-0.5">
                <span className="font-semibold text-gray-800 block">Post Publication Confirmations</span>
                <span className="text-gray-500 text-[11px] block">Receive an email receipt whenever a post is published successfully.</span>
              </div>
              <input
                type="checkbox"
                checked={notifyOnPublish}
                onChange={() => handleToggleNotification('publish')}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:bg-gray-50/60 transition-colors cursor-pointer">
              <div className="space-y-0.5">
                <span className="font-semibold text-gray-800 block">Publication Failure & Token Alerts</span>
                <span className="text-gray-500 text-[11px] block">Immediate alerts if an API token expires or an Instagram/Facebook upload fails.</span>
              </div>
              <input
                type="checkbox"
                checked={notifyOnFailure}
                onChange={() => handleToggleNotification('failure')}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:bg-gray-50/60 transition-colors cursor-pointer">
              <div className="space-y-0.5">
                <span className="font-semibold text-gray-800 block">Weekly Performance Summary</span>
                <span className="text-gray-500 text-[11px] block">A weekly analytics digest of reach, impressions, and scheduled queue health.</span>
              </div>
              <input
                type="checkbox"
                checked={notifyWeeklyDigest}
                onChange={() => handleToggleNotification('digest')}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200/80 pt-2" />

        {/* Active Session & Security Section */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Laptop className="w-4 h-4 text-gray-700" />
            <h3 className="text-sm font-bold text-gray-900">Active Session & Security</h3>
          </div>
          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between text-xs max-w-2xl">
            <div className="space-y-1">
              <div className="font-semibold text-gray-800 flex items-center space-x-2">
                <span>Current Web Session</span>
                <span className="px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 rounded font-bold">
                  Active
                </span>
              </div>
              <div className="text-[11px] text-gray-500">
                Authenticated as: <span className="font-mono text-gray-700">{authUser?.email || email}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                await signOutUser();
                window.location.href = '/';
              }}
              className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-semibold text-xs transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200/80 pt-2" />

        {/* Delete Your Account Section (matching screenshot) */}
        <div className="flex items-start justify-between space-x-6">
          <div className="space-y-1 max-w-xl">
            <h3 className="text-sm font-bold text-gray-900">Delete your account</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              When you delete your account, you lose access to PostingTube services, scheduled posts, and
              connected social channels. This action is irreversible.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsDeleteAccountModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#E5484D] hover:bg-[#d63940] text-white transition-colors shrink-0 shadow-2xs cursor-pointer flex items-center space-x-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Account</span>
          </button>
        </div>
      </div>
      )}

      {/* Delete Connected Channel Modal (Requires typing DELETE CHANNEL) */}
      {channelToDelete && (
        <DeleteChannelModal
          isOpen={Boolean(channelToDelete)}
          account={channelToDelete}
          workspaceId={currentWorkspace.id}
          onClose={() => setChannelToDelete(null)}
          onConfirmDelete={async (accountId) => {
            if (onRemoveAccount) {
              await onRemoveAccount(accountId);
            }
            showToast('Channel disconnected and access tokens purged.');
          }}
        />
      )}

      {/* Delete Account Modal (Requires typing DELETE MY ACCOUNT) */}
      <DeleteAccountModal
        isOpen={isDeleteAccountModalOpen}
        onClose={() => setIsDeleteAccountModalOpen(false)}
        authUser={authUser}
      />

      {/* Upgrade Plan Modal */}
      <UpgradePlanModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        currentPlan={isProPlan ? 'Pro' : 'Free'}
        channelsCount={subscriptionData?.channelsCount || 3}
        onPlanUpdated={loadBillingDetails}
      />
    </div>
  );
};
