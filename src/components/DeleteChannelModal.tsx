'use client';

import React, { useState } from 'react';
import { SocialAccount } from '@/types/social';
import { AlertTriangle, Trash2, X, ShieldAlert, Loader2 } from 'lucide-react';

interface DeleteChannelModalProps {
  account: SocialAccount;
  workspaceId?: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (accountId: string) => Promise<void> | void;
}

export const DeleteChannelModal: React.FC<DeleteChannelModalProps> = ({
  account,
  workspaceId,
  isOpen,
  onClose,
  onConfirmDelete,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const REQUIRED_TEXT = 'DELETE CHANNEL';
  const isMatch = confirmationInput.trim() === REQUIRED_TEXT;

  const handleDelete = async () => {
    if (!isMatch || isDeleting) return;
    setIsDeleting(true);
    setError(null);

    try {
      // 1. Call secure channel deletion API to revoke tokens and clean up jobs
      const res = await fetch('/api/channels/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          workspaceId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to revoke channel connection on server');
      }

      // 2. Trigger parent callback to update local state and database
      await onConfirmDelete(account.id);
      onClose();
    } catch (err: any) {
      console.error('Channel deletion failed:', err);
      setError(err?.message || 'Failed to delete channel. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const platformLabel = account.platform === 'facebook'
    ? 'Facebook Page'
    : account.platform === 'instagram'
    ? 'Instagram Business Account'
    : account.platform.charAt(0).toUpperCase() + account.platform.slice(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full border border-gray-200 shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Disconnect Social Channel</h3>
              <p className="text-xs text-gray-500">Permanent channel removal & token revocation</p>
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

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Target Account Badge */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center space-x-3">
            {account.avatarUrl ? (
              <img
                src={account.avatarUrl}
                alt={account.displayName}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-2xs"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center">
                {account.displayName.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-gray-900 truncate">{account.displayName}</div>
              <div className="text-[11px] text-gray-500 flex items-center space-x-1.5">
                <span className="font-medium text-gray-700">{platformLabel}</span>
                {account.username && <span>@{account.username}</span>}
              </div>
            </div>
          </div>

          {/* Explanation Notice */}
          <div className="bg-rose-50/70 border border-rose-200/70 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center space-x-2 text-rose-800 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Consequences of Disconnecting:</span>
            </div>
            <ul className="text-[11px] text-rose-700/90 space-y-1 list-disc list-inside leading-relaxed pl-1">
              <li>Stored OAuth access tokens will be securely deleted and revoked.</li>
              <li>Pending scheduled posts targeting this channel will be paused or cancelled.</li>
              <li>Historical published posts and analytics will remain preserved in your dashboard.</li>
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
              To confirm, type <span className="font-mono font-bold text-rose-600">{REQUIRED_TEXT}</span> below:
            </label>
            <input
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder="Type DELETE CHANNEL"
              disabled={isDeleting}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-mono text-gray-900 placeholder:text-gray-400"
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
            onClick={handleDelete}
            disabled={!isMatch || isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5 shadow-xs"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Disconnecting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm & Delete Channel</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
