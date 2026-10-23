'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Workspace, SocialAccount } from '@/types/social';
import {
  Info,
  X,
  User,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  Camera,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  Bell,
  Smartphone,
  Laptop,
  LogOut,
  RefreshCw,
  Loader2,
  Check,
  Copy,
} from 'lucide-react';
import { supabase, signOutUser } from '@/lib/supabase';
import { DeleteChannelModal } from '@/components/DeleteChannelModal';
import { DeleteAccountModal } from '@/components/DeleteAccountModal';
import { TwoFactorAuthModal } from '@/components/TwoFactorAuthModal';

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
  // Banner state
  const [showBanner, setShowBanner] = useState(true);

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

  // 2FA States
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [is2FaModalOpen, setIs2FaModalOpen] = useState(false);
  const [twoFactorAction, setTwoFactorAction] = useState<'enable' | 'disable'>('enable');

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

  // Initialize and load saved profile & MFA status
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
          if (typeof parsed.twoFactorEnabled === 'boolean') {
            setTwoFactorEnabled(parsed.twoFactorEnabled);
          }
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

    // 3. Query Supabase for real MFA TOTP factors
    const queryMfaFactors = async () => {
      if (supabase && authUser && authUser.id !== 'usr_guest_demo') {
        try {
          const { data, error } = await supabase.auth.mfa.listFactors();
          if (!error && data?.totp) {
            const verified = data.totp.find((f: any) => f.status === 'verified');
            if (verified) {
              setTwoFactorEnabled(true);
              setFactorId(verified.id);
            } else {
              setTwoFactorEnabled(false);
            }
          }
        } catch (mfaErr) {
          console.warn('Failed to query Supabase MFA factors:', mfaErr);
        }
      }
    };
    queryMfaFactors();
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
    twoFactorEnabled: boolean;
  }>) => {
    const data = {
      name: overrides?.name ?? name,
      email: overrides?.email ?? email,
      backupEmail: overrides?.backupEmail ?? backupEmail,
      photoUrl: overrides?.photoUrl ?? photoUrl,
      twoFactorEnabled: overrides?.twoFactorEnabled ?? twoFactorEnabled,
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

  // 7. Toggle 2FA Modal Open
  const handleOpen2FaModal = () => {
    if (twoFactorEnabled) {
      setTwoFactorAction('disable');
    } else {
      setTwoFactorAction('enable');
    }
    setIs2FaModalOpen(true);
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

  return (
    <div className="p-8 max-w-4xl mx-auto font-sans space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2.5 text-xs z-50 animate-fade-in border border-gray-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* 2FA Recommendation Banner (matching screenshot) */}
      {showBanner && !twoFactorEnabled && (
        <div className="bg-[#1E293B] text-slate-200 border border-slate-700/80 rounded-xl px-4 py-3 flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center space-x-2.5">
            <Info className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              For added security and easier logins, we recommend setting up two-factor authentication.{' '}
              <button
                onClick={handleOpen2FaModal}
                className="text-sky-400 hover:text-sky-300 font-medium inline-flex items-center space-x-0.5 ml-1 underline cursor-pointer"
              >
                <span>Set up now</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </button>
            </span>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Settings Card */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-8 space-y-8">
        {/* Photo Section */}
        <div className="flex items-center space-x-5">
          <div
            className="relative group cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            title="Click to change photo"
          >
            <div className="w-16 h-16 rounded-xl bg-[#2563EB] text-white flex items-center justify-center overflow-hidden shadow-xs border border-blue-400/30">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="w-9 h-9 text-white/90" />
              )}
            </div>
            <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
              <Camera className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-gray-900">Photo</h3>
            <p className="text-xs text-gray-500">
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
            <div className="flex items-center space-x-3">
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
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors shrink-0 cursor-pointer disabled:opacity-50 flex items-center space-x-1"
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
            <div className="flex items-center space-x-3">
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
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors shrink-0 cursor-pointer disabled:opacity-50 flex items-center space-x-1"
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
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 block">Backup Email</label>
              <span className="text-[10px] text-gray-400">Security & Recovery notifications only</span>
            </div>
            <div className="flex items-center space-x-3">
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
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors shrink-0 cursor-pointer disabled:opacity-50 flex items-center space-x-1"
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
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 block">Password</label>
              <button
                type="button"
                onClick={handleSendResetEmail}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
              >
                Send Password Reset Email
              </button>
            </div>
            <div className="flex items-center space-x-3">
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
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors shrink-0 cursor-pointer disabled:opacity-50 flex items-center space-x-1"
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
        <div className="border-t border-gray-200/80 pt-2" id="two-factor-section" />

        {/* Two Factor Authentication Section (matching screenshot toggle) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <h3 className="text-sm font-bold text-gray-900">Two Factor Authentication</h3>
              {twoFactorEnabled ? (
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center space-x-1">
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Active & Verified</span>
                </span>
              ) : (
                <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  Inactive
                </span>
              )}
            </div>

            {/* Toggle switch matching screenshot */}
            <button
              type="button"
              onClick={handleOpen2FaModal}
              title={twoFactorEnabled ? 'Click to disable 2FA' : 'Click to enable 2FA'}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-hidden cursor-pointer ${
                twoFactorEnabled ? 'bg-emerald-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                } flex items-center justify-center shadow-xs`}
              >
                {twoFactorEnabled ? (
                  <span className="text-[9px] text-emerald-600 font-bold">✓</span>
                ) : (
                  <span className="text-[9px] text-gray-400 font-bold">✕</span>
                )}
              </span>
            </button>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed max-w-2xl">
            Two factor authentication adds an extra layer of security for your account. Whenever you
            log in to your account, after entering your username and password, you will be asked for a
            second authentication code that will be sent to you via email or generated on an
            authentication app, such as Google Authenticator or Authy.{' '}
            <a
              href="https://safety.google/authentication/"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline inline-flex items-center space-x-0.5"
            >
              <span>Learn more</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>
          </p>
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
              When you delete your account, you lose access to PostBridge services, scheduled posts, and
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

      {/* Two Factor Authentication Setup / Disable Modal */}
      <TwoFactorAuthModal
        isOpen={is2FaModalOpen}
        onClose={() => setIs2FaModalOpen(false)}
        action={twoFactorAction}
        currentFactorId={factorId}
        onSuccess={(enabled, newFactorId) => {
          setTwoFactorEnabled(enabled);
          if (newFactorId) setFactorId(newFactorId);
          persistProfileToStorage({ twoFactorEnabled: enabled });
          showToast(enabled ? 'Two-Factor Authentication is now enabled!' : 'Two-Factor Authentication disabled.');
        }}
      />

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
    </div>
  );
};
