'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  FileCode,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';

interface SecuritySettingsViewProps {
  ownerEmail: string;
  onLogout: () => void;
}

export const SecuritySettingsView: React.FC<SecuritySettingsViewProps> = ({
  ownerEmail,
  onLogout,
}) => {
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  const envSample = `# Owner Super Admin Credentials (in .env.local)
OWNER_EMAIL=${ownerEmail}
OWNER_ADMIN_KEY=PostingTubeOwner2026!#
ADMIN_SESSION_SECRET=pt_sec_d870f5bb547efd0ab96464c9fb6db2cd868941086292404
OWNER_MFA_ENABLED=true`;

  const sqlSample = `-- PostingTube Private Owner Super Admin Migration
-- Tables: user_profiles, subscriptions, payment_transactions, admin_audit_logs, activity_logs, user_device_sessions
-- Check supabase/migrations/20261030_owner_admin_system.sql for full schema.`;

  const copyToClipboard = (text: string, type: 'sql' | 'env') => {
    navigator.clipboard.writeText(text);
    if (type === 'sql') {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } else {
      setCopiedEnv(true);
      setTimeout(() => setCopiedEnv(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">Security &amp; Owner Settings</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Owner access controls, cryptographic parameters, Supabase RLS security, and database migrations.
        </p>
      </div>

      {/* Security Status Card */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Owner Access Controls</h3>
            <p className="text-[11px] text-gray-400">Strict server-side authorization active</p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/60 flex items-center justify-between">
            <div>
              <span className="font-bold text-gray-900 block">Authorized Owner Account</span>
              <span className="text-gray-500 font-mono text-[11px]">{ownerEmail}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              Verified Owner
            </span>
          </div>

          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/60 flex items-center justify-between">
            <div>
              <span className="font-bold text-gray-900 block">Session Encryption</span>
              <span className="text-gray-500 text-[11px]">HMAC SHA-256 with 4-hour sliding TTL</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200 font-mono">
              HttpOnly; SameSite=Lax
            </span>
          </div>

          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/60 flex items-center justify-between">
            <div>
              <span className="font-bold text-gray-900 block">Brute-Force Rate Limiting</span>
              <span className="text-gray-500 text-[11px]">Max 5 attempts with 15-minute IP lockout</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              Active Protection
            </span>
          </div>
        </div>
      </div>

      {/* Environment Config Helper */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Environment Variables</h3>
            <p className="text-[11px] text-gray-400">Configured in `.env.local` for server-side authorization</p>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(envSample, 'env')}
            className="px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center space-x-1 cursor-pointer"
          >
            {copiedEnv ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedEnv ? 'Copied' : 'Copy Config'}</span>
          </button>
        </div>

        <pre className="p-3.5 rounded-xl bg-gray-950 text-emerald-400 font-mono text-[11px] overflow-x-auto">
          {envSample}
        </pre>
      </div>

      {/* Database Schema Migration */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Database Schema Migration</h3>
            <p className="text-[11px] text-gray-400">
              `supabase/migrations/20261030_owner_admin_system.sql`
            </p>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard('cat supabase/migrations/20261030_owner_admin_system.sql', 'sql')}
            className="px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center space-x-1 cursor-pointer"
          >
            {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSql ? 'Copied Command' : 'Copy Migration Command'}</span>
          </button>
        </div>

        <p className="text-xs text-gray-600 leading-relaxed">
          The migration file creates the required tables (`user_profiles`, `subscriptions`, `payment_transactions`, `admin_audit_logs`, `activity_logs`, and `user_device_sessions`) with strict RLS policies. It is safe and idempotent.
        </p>
      </div>

      {/* Emergency Session Termination */}
      <div className="bg-rose-50/50 p-5 rounded-2xl border border-rose-200/80 shadow-xs space-y-3">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <h3 className="text-sm font-bold text-rose-900">Owner Session Termination</h3>
        </div>
        <p className="text-xs text-rose-700">
          Immediately clear your administrative session cookie and invalidate admin tokens.
        </p>
        <button
          type="button"
          onClick={onLogout}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
        >
          Terminate Admin Session
        </button>
      </div>
    </div>
  );
};
