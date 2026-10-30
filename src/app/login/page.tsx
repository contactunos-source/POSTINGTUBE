'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signInAsGuest,
  getGuestUser,
  supabase,
} from '@/lib/supabase';
import { syncUserProfile } from '@/lib/userSync';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Mail,
  KeyRound,
  Loader2,
  Layers,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import { PostingTubeLogo } from '@/components/PostingTubeLogo';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get('redirectTo') || '/dashboard';
  const urlMode = searchParams?.get('mode');

  const [mode, setMode] = useState<'signin' | 'signup'>(
    urlMode === 'signup' ? 'signup' : 'signin'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // If mode param changes in URL
  useEffect(() => {
    if (urlMode === 'signup') {
      setMode('signup');
    } else if (urlMode === 'signin') {
      setMode('signin');
    }
  }, [urlMode]);

  // If already logged in, redirect to destination
  useEffect(() => {
    const guest = getGuestUser();
    if (guest) {
      router.push(redirectTo);
      return;
    }

    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          syncUserProfile(session.user);
          router.push(redirectTo);
        }
      });
    }
  }, [redirectTo, router]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await signInWithGoogle(redirectTo);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Google sign in failed');
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (mode === 'signin') {
        const { data, error } = await signInWithEmail(email.trim(), password);
        if (error) throw error;
        if (data.session?.user) {
          await syncUserProfile(data.session.user);
          router.push(redirectTo);
        }
      } else {
        const { data, error } = await signUpWithEmail(email.trim(), password);
        if (error) throw error;
        if (data.user) {
          await syncUserProfile({
            ...data.user,
            fullName: fullName.trim() || data.user.email?.split('@')[0],
          });
        }
        if (data.session) {
          router.push(redirectTo);
        } else {
          setSuccessMsg('Account created! Please check your email inbox to confirm your account or sign in directly.');
          setMode('signin');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestDemo = () => {
    signInAsGuest();
    router.push(redirectTo);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-gray-900 selection:text-white">
      {/* Top Header */}
      <header className="px-6 py-6 max-w-6xl w-full mx-auto flex items-center justify-between border-b border-gray-100">
        <Link
          href="/"
          className="flex items-center space-x-2 text-xs font-medium text-gray-600 hover:text-black transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to PostingTube</span>
        </Link>

        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[11px] font-semibold text-gray-600">
            System Online • Meta Graph v20
          </span>
        </div>
      </header>

      {/* Center Auth Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white border border-gray-200/90 rounded-3xl p-8 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.06)] relative">
          {/* Logo & Headline */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <PostingTubeLogo size="lg" href="/" />
            </div>

            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {mode === 'signin' ? 'Sign in to your workspace' : 'Create your PostingTube account'}
            </h1>
            <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
              {mode === 'signin'
                ? 'Access your scheduled queue, automated worker, and multi-tenant channels.'
                : 'Start publishing to Facebook, Instagram, LinkedIn, and X simultaneously.'}
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="leading-relaxed flex-1">{errorMsg}</div>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div className="leading-relaxed flex-1">{successMsg}</div>
            </div>
          )}

          {/* Google 1-Click Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl font-semibold bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-800 border border-gray-300 flex items-center justify-center space-x-3 text-xs shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="flex items-center my-6 text-gray-400 text-xs">
            <div className="flex-1 border-t border-gray-200" />
            <span className="px-3 uppercase font-mono text-[10px] text-gray-600 tracking-wider">
              or with work email
            </span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-300 bg-gray-50/50 hover:bg-gray-50 text-gray-900 placeholder:text-gray-600 focus:outline-hidden focus:border-black focus:ring-1 focus:ring-black transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@company.com"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-300 bg-gray-50/50 hover:bg-gray-50 text-gray-900 placeholder:text-gray-600 focus:outline-hidden focus:border-black focus:ring-1 focus:ring-black transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Password
                </label>
                {mode === 'signin' && (
                  <span className="text-[11px] text-gray-600 hover:text-black font-medium cursor-pointer">
                    Forgot password?
                  </span>
                )}
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-300 bg-gray-50/50 hover:bg-gray-50 text-gray-900 placeholder:text-gray-600 focus:outline-hidden focus:border-black focus:ring-1 focus:ring-black transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl font-bold bg-black hover:bg-gray-800 active:bg-gray-900 text-white flex items-center justify-center space-x-2 text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
              <span>{mode === 'signin' ? 'Sign In to Workspace' : 'Create Free Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Mode Switcher */}
          <div className="text-center mt-6 pt-5 border-t border-gray-100 text-xs text-gray-600">
            {mode === 'signin' ? (
              <span>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg(null);
                  }}
                  className="text-black font-bold hover:underline cursor-pointer ml-1"
                >
                  Create one now
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMsg(null);
                  }}
                  className="text-black font-bold hover:underline cursor-pointer ml-1"
                >
                  Sign in instead
                </button>
              </span>
            )}
          </div>

          {/* Instant Evaluation Demo Button */}
          <div className="mt-5 p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-gray-600">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Evaluating without credentials?</span>
            </div>
            <button
              type="button"
              onClick={handleGuestDemo}
              className="text-xs text-black font-bold hover:underline flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <span>Instant Demo</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="px-6 py-6 max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-gray-600 border-t border-gray-100 gap-3">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>256-Bit Workspace Isolation</span>
          </span>
          <span>•</span>
          <span>SOC-2 & GDPR Compliant</span>
        </div>

        <div>
          &copy; 2026 PostingTube Technologies Inc. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-900" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
