'use client';

import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, KeyRound, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { PostingTubeLogo } from '@/components/PostingTubeLogo';

interface AdminLoginGateProps {
  onSuccess: (email: string) => void;
}

export const AdminLoginGate: React.FC<AdminLoginGateProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !passcode.trim()) {
      setErrorMessage('Please enter both Owner Email and Master Security Passcode.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), passcode: passcode.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onSuccess(data.email || email.trim());
      } else {
        setErrorMessage(data.error || 'Access Denied: Invalid owner authorization credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error communicating with authentication service.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 via-white to-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-3">
          <PostingTubeLogo />
        </div>

        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200/80 mb-2">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
          <span>Private Owner Super Admin Console</span>
        </div>

        <h2 className="text-2xl font-black text-gray-900 tracking-tight">
          Restricted Platform Access
        </h2>
        <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
          This administrative control center is strictly reserved for the authorized platform owner. All login attempts and IP addresses are audited.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl rounded-3xl border border-gray-200/90 space-y-6">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-start space-x-2.5 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Owner Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. onmansonu@gmail.com"
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:border-gray-900 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700">
                  Master Security Key / Passcode
                </label>
                <span className="text-[10px] text-gray-400 font-mono">HMAC SHA-256</span>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:border-gray-900 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-gray-900 hover:bg-black text-white flex items-center justify-center space-x-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Authorization...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Authenticate as Owner</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
            <span>Server Protected by RLS</span>
            <span className="font-mono">v1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
