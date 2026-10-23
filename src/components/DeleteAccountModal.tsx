'use client';

import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert, Loader2 } from 'lucide-react';
import { supabase, signOutUser } from '@/lib/supabase';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  authUser?: any;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  authUser,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const REQUIRED_TEXT = 'DELETE MY ACCOUNT';
  const isMatch = confirmationInput.trim() === REQUIRED_TEXT;

  const handleDeleteAccount = async () => {
    if (!isMatch || isDeleting) return;
    setIsDeleting(true);
    setError(null);

    try {
      // 1. Get current session token from Supabase if logged in
      let token: string | undefined;
      const isGuest = !authUser || authUser.id === 'usr_guest_demo';

      if (!isGuest && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token;
      }

      // 2. Call backend deletion API
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          isGuest,
          email: authUser?.email,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Server failed to delete account. Please try again.');
      }

      // 3. Clear all client storage, auth session, and redirect to home
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      await signOutUser();
      window.location.href = '/?account_deleted=1';
    } catch (err: any) {
      console.error('Account deletion error:', err);
      setError(err?.message || 'Failed to complete account deletion.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-200 shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Delete Your Account</h3>
              <p className="text-xs text-gray-500">Irreversible action & data erasure</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="bg-red-50/80 border border-red-200/90 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center space-x-2 text-red-800 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Warning: This cannot be undone</span>
            </div>
            <p className="text-xs text-red-700/90 leading-relaxed">
              You are about to permanently delete your PostingTube account ({authUser?.email || 'Current Account'}).
            </p>
            <ul className="text-[11px] text-red-700/90 space-y-1 list-disc list-inside leading-relaxed pl-1">
              <li>All connected Facebook Pages & Instagram accounts will be revoked and disconnected.</li>
              <li>All scheduled posts and draft queues will be permanently purged.</li>
              <li>Your isolated workspace, media files, and analytics will be permanently destroyed.</li>
              <li>Your login credentials and Supabase authentication identity will be deleted.</li>
            </ul>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
              {error}
            </div>
          )}

          {/* Confirmation Input */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700">
              To proceed with permanent deletion, type{' '}
              <span className="font-mono font-bold text-red-600">{REQUIRED_TEXT}</span> below:
            </label>
            <input
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder="Type DELETE MY ACCOUNT"
              disabled={isDeleting}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 font-mono text-gray-900 placeholder:text-gray-400"
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={!isMatch || isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5 shadow-xs"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting Account...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Permanently Delete Account</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
