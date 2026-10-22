'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Workspace } from '@/types/social';
import {
  Info,
  X,
  User,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  Camera,
  Trash2,
} from 'lucide-react';

interface SettingsViewProps {
  currentWorkspace: Workspace;
  onUpdateWorkspace: (updated: Workspace) => void;
  authUser?: any;
}

const PROFILE_STORAGE_KEY = 'pb_user_profile_v1';

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentWorkspace,
  onUpdateWorkspace,
  authUser,
}) => {
  // Alert banner state
  const [showBanner, setShowBanner] = useState(true);

  // Profile Form States
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [name, setName] = useState<string>('noobsonu001');
  const [email, setEmail] = useState<string>('noobsonu001@gmail.com');
  const [backupEmail, setBackupEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // 2FA & Account delete states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved profile data on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.name) setName(parsed.name);
          if (parsed.email) setEmail(parsed.email);
          if (parsed.backupEmail) setBackupEmail(parsed.backupEmail);
          if (parsed.photoUrl) setPhotoUrl(parsed.photoUrl);
          if (typeof parsed.twoFactorEnabled === 'boolean') {
            setTwoFactorEnabled(parsed.twoFactorEnabled);
          }
        } else if (authUser?.email) {
          setEmail(authUser.email);
          setName(authUser.user_metadata?.full_name || authUser.email.split('@')[0] || 'noobsonu001');
          if (authUser.user_metadata?.avatar_url) {
            setPhotoUrl(authUser.user_metadata.avatar_url);
          }
        }
      } catch (e) {
        console.error('Failed to load user profile:', e);
      }
    }
  }, [authUser]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const persistProfile = (overrides?: Partial<{
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
    // Also synchronize name to workspace
    if (overrides?.name || name) {
      onUpdateWorkspace({
        ...currentWorkspace,
        name: overrides?.name ?? name,
      });
    }
  };

  const handleSaveName = () => {
    persistProfile({ name });
    showToast('Name updated successfully');
  };

  const handleSaveEmail = () => {
    persistProfile({ email });
    showToast('Primary email updated');
  };

  const handleSaveBackupEmail = () => {
    persistProfile({ backupEmail });
    showToast('Backup email updated');
  };

  const handleChangePassword = () => {
    if (!password) {
      alert('Please enter a new password.');
      return;
    }
    setPassword('');
    showToast('Password changed successfully');
  };

  const handleToggle2FA = () => {
    const nextState = !twoFactorEnabled;
    setTwoFactorEnabled(nextState);
    persistProfile({ twoFactorEnabled: nextState });
    showToast(nextState ? 'Two-Factor Authentication enabled' : 'Two-Factor Authentication disabled');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setPhotoUrl(previewUrl);
      persistProfile({ photoUrl: previewUrl });
      showToast('Profile photo updated');
    }
  };

  const handleDeleteAccount = () => {
    const confirmed = confirm(
      'Are you sure you want to delete your account? All connected social accounts, scheduled posts, and media will be permanently removed.'
    );
    if (confirmed) {
      if (typeof window !== 'undefined') {
        localStorage.clear();
        alert('Your account and local data have been reset.');
        window.location.reload();
      }
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto font-sans space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center space-x-2 text-xs z-50 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2FA Recommendation Banner (matching top alert of 2nd screenshot) */}
      {showBanner && (
        <div className="bg-[#1E293B] text-slate-200 border border-slate-700/80 rounded-xl px-4 py-3 flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center space-x-2.5">
            <Info className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              For added security and easier logins, we recommend setting up two-factor authentication.{' '}
              <a
                href="#two-factor-section"
                className="text-sky-400 hover:text-sky-300 font-medium inline-flex items-center space-x-0.5 ml-1"
              >
                <span>Learn more</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
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
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-16 h-16 rounded-xl bg-[#2563EB] text-white flex items-center justify-center overflow-hidden shadow-xs border border-blue-400/30">
              {photoUrl ? (
                <img src={photoUrl} alt="Avatar" className="w-full h-full object-cover" />
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
              className="text-xs text-blue-600 hover:text-blue-700 font-medium pt-1 inline-block"
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
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors shrink-0"
              >
                Save Changes
              </button>
            </div>
          </div>

          {/* Email Field */}
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
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors shrink-0"
              >
                Save Changes
              </button>
            </div>
          </div>

          {/* Backup Email Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 block">Backup Email</label>
            <div className="flex items-center space-x-3">
              <input
                type="email"
                value={backupEmail}
                onChange={(e) => setBackupEmail(e.target.value)}
                placeholder=""
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-hidden focus:border-blue-500 text-gray-800 bg-white shadow-2xs font-medium"
              />
              <button
                type="button"
                onClick={handleSaveBackupEmail}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors shrink-0"
              >
                Save Changes
              </button>
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 block">Password</label>
            <div className="flex items-center space-x-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-hidden focus:border-blue-500 text-gray-800 bg-white shadow-2xs font-medium"
              />
              <button
                type="button"
                onClick={handleChangePassword}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors shrink-0"
              >
                Change Password
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200/80 pt-2" id="two-factor-section" />

        {/* Two Factor Authentication Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Two Factor Authentication</h3>
            {/* Toggle switch matching screenshot */}
            <button
              type="button"
              onClick={handleToggle2FA}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-hidden ${
                twoFactorEnabled ? 'bg-emerald-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                } flex items-center justify-center`}
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

        {/* Delete Your Account Section */}
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
            onClick={handleDeleteAccount}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#E5484D] hover:bg-[#d63940] text-white transition-colors shrink-0 shadow-2xs"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
};
