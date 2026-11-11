'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  sendPasswordResetEmail,
  updatePassword,
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
  Key,
  ShieldAlert,
  Check,
  X,
} from 'lucide-react';
import { PlanPosterLogo } from '@/components/PlanPosterLogo';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get('redirectTo') || '/dashboard';
  const urlMode = searchParams?.get('mode');
  const oauthError = searchParams?.get('error');
  const oauthErrorDesc = searchParams?.get('error_description');

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'reset-password'>(
    urlMode === 'signup'
      ? 'signup'
      : urlMode === 'reset-password'
      ? 'reset-password'
      : urlMode === 'forgot'
      ? 'forgot'
      : 'signin'
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [hasValidSession, setHasValidSession] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const code = searchParams?.get('code');

  // Check URL hash and query params on mount for Supabase password recovery
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash;
    if (hash) {
      const cleanHash = hash.replace(/^#/, '');
      const params = new URLSearchParams(cleanHash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const hashError = params.get('error');
      const hashErrorDesc = params.get('error_description');

      if (hashError) {
        setMode('reset-password');
        setHasValidSession(false);
        let decoded = 'This recovery link is invalid or has expired.';
        if (hashErrorDesc) {
          try {
            decoded = decodeURIComponent(hashErrorDesc.replace(/\+/g, ' '));
          } catch {
            decoded = hashErrorDesc;
          }
        }
        setErrorMsg(decoded);
        return;
      }

      if (accessToken && refreshToken && supabase) {
        setMode('reset-password');
        setIsResetLoading(true);
        supabase.auth
          .setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          .then(({ data, error }) => {
            setIsResetLoading(false);
            if (error) {
              console.warn('[Auth] Failed to set recovery session from hash:', error);
              setHasValidSession(false);
              setErrorMsg('Your recovery link has expired or is invalid. Please request a new one.');
            } else if (data?.session) {
              setHasValidSession(true);
              setErrorMsg(null);
              setSuccessMsg('Recovery session verified! Please choose your new password.');
              if (window.history?.replaceState) {
                window.history.replaceState(null, '', window.location.pathname + '?mode=reset-password');
              }
            }
          });
        return;
      }

      if (hash.includes('type=recovery') || hash.includes('type=magiclink')) {
        setMode('reset-password');
        setHasValidSession(true);
        setErrorMsg(null);
        setSuccessMsg('Recovery session verified! Please choose your new password.');
      }
    }
  }, []);

  // Handle PKCE code exchange if present in URL
  useEffect(() => {
    if (!code || !supabase) return;

    let isMounted = true;
    setIsResetLoading(true);

    supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
      if (!isMounted) return;
      setIsResetLoading(false);

      if (error) {
        console.warn('[Auth] Code exchange error:', error);
        if (mode === 'reset-password' || urlMode === 'reset-password') {
          setErrorMsg('This recovery link has expired or was already used. Please request a new one.');
          setHasValidSession(false);
        }
      } else if (data?.session) {
        setHasValidSession(true);
        if (mode === 'reset-password' || urlMode === 'reset-password') {
          setErrorMsg(null);
          setSuccessMsg('Recovery session confirmed! Please choose your new password.');
          if (typeof window !== 'undefined' && window.history?.replaceState) {
            window.history.replaceState(null, '', window.location.pathname + '?mode=reset-password');
          }
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [code, mode, urlMode]);

  // Check active session status when entering reset-password mode
  useEffect(() => {
    if (mode !== 'reset-password' || !supabase) return;

    // If hash has tokens or code is being exchanged, let the handlers finish
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (code || (hash && hash.includes('access_token'))) {
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setHasValidSession(true);
      } else {
        setHasValidSession(false);
      }
    });
  }, [mode, code]);

  // If mode param changes in URL
  useEffect(() => {
    if (urlMode === 'signup') {
      setMode('signup');
    } else if (urlMode === 'signin') {
      setMode('signin');
    } else if (urlMode === 'forgot') {
      setMode('forgot');
    } else if (urlMode === 'reset-password') {
      setMode('reset-password');
    }
  }, [urlMode]);

  // Listen for Supabase PASSWORD_RECOVERY event
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset-password');
        setErrorMsg(null);
        setSuccessMsg('You are in password recovery mode. Please choose your new password.');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle OAuth error or cancellation from redirect
  useEffect(() => {
    if (oauthError) {
      if (oauthError === 'access_denied') {
        setErrorMsg('Google sign in was cancelled.');
      } else {
        setErrorMsg(oauthErrorDesc || `Authentication error: ${oauthError}`);
      }
      setIsGoogleLoading(false);
      setIsEmailLoading(false);
      setIsResetLoading(false);
    }
  }, [oauthError, oauthErrorDesc]);

  // Reset any loading spinners if the user cancels, hits back, or returns to this tab
  useEffect(() => {
    const handleReset = () => {
      setIsGoogleLoading(false);
      setIsEmailLoading(false);
      setIsResetLoading(false);
    };

    window.addEventListener('focus', handleReset);
    window.addEventListener('pageshow', handleReset);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleReset();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleReset);
      window.removeEventListener('pageshow', handleReset);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // If already logged in, redirect to destination UNLESS in password reset mode
  useEffect(() => {
    const isRecovery =
      mode === 'reset-password' ||
      urlMode === 'reset-password' ||
      (typeof window !== 'undefined' && window.location.hash.includes('type=recovery'));

    if (isRecovery) return;

    const guest = getGuestUser();
    if (guest) {
      router.push(redirectTo);
      return;
    }

    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user && !isRecovery) {
          syncUserProfile(session.user).catch(() => {});
          router.push(redirectTo);
        }
      });
    }
  }, [redirectTo, router, mode, urlMode]);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMsg(null);

    const timer = setTimeout(() => {
      setIsGoogleLoading(false);
    }, 8000);

    try {
      await signInWithGoogle(redirectTo);
    } catch (err: any) {
      clearTimeout(timer);
      setErrorMsg(err?.message || 'Google sign in failed');
      setIsGoogleLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsEmailLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (mode === 'signin') {
        const { data, error } = await signInWithEmail(email.trim(), password);
        if (error) throw error;
        if (data.session?.user) {
          syncUserProfile(data.session.user).catch(() => {});
          router.push(redirectTo);
          return;
        }
      } else {
        const { data, error } = await signUpWithEmail(email.trim(), password);
        if (error) throw error;
        if (data.user) {
          syncUserProfile({
            ...data.user,
            fullName: fullName.trim() || data.user.email?.split('@')[0],
          }).catch(() => {});
        }
        if (data.session) {
          router.push(redirectTo);
          return;
        } else {
          setSuccessMsg('Account created! Please check your email inbox to confirm your account or sign in directly.');
          setMode('signin');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your account email address.');
      return;
    }

    setIsResetLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await sendPasswordResetEmail(email.trim());
      if (error) throw error;
      setSuccessMsg(
        `We have sent a secure password recovery link to ${email.trim()}. Please check your email inbox and spam folder.`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send recovery email. Please check the address and try again.');
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setErrorMsg('Please enter your new password.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setIsResetLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (!supabase) {
        throw new Error('Authentication client unavailable.');
      }

      // Verify active session before attempting updateUser
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        setHasValidSession(false);
        setErrorMsg('Active recovery session missing or expired. Please click the reset link in your email or request a new one.');
        setIsResetLoading(false);
        return;
      }

      const { data, error } = await updatePassword(newPassword);
      if (error) {
        if (error.message?.toLowerCase().includes('auth session missing')) {
          setHasValidSession(false);
          setErrorMsg('Your recovery link has expired or was already used. Please request a fresh reset link.');
          return;
        }
        throw error;
      }

      setSuccessMsg('Your password has been successfully updated! Redirecting to workspace...');
      if (data?.user) {
        syncUserProfile(data.user).catch(() => {});
      }
      setTimeout(() => {
        router.push(redirectTo);
      }, 1500);
    } catch (err: any) {
      const msg = err?.message || 'Failed to update password.';
      if (msg.toLowerCase().includes('auth session missing')) {
        setHasValidSession(false);
        setErrorMsg('Your recovery link has expired or was already used. Please request a fresh reset link.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setIsResetLoading(false);
    }
  };

  const titles: Record<string, string> = {
    signin: 'Sign in to your workspace',
    signup: 'Create your Plan Poster account',
    forgot: 'Reset your password',
    'reset-password':
      hasValidSession === false
        ? 'Recovery Link Required'
        : 'Set your new password',
  };

  const subtitles: Record<string, string> = {
    signin: 'Access your scheduled queue, automated worker, and multi-tenant channels.',
    signup: 'Start publishing to Facebook, Instagram, LinkedIn, and X simultaneously.',
    forgot: 'Enter your registered email address and we will send you a secure recovery link.',
    'reset-password':
      hasValidSession === false
        ? 'Password changes require a verified one-time link sent to your email.'
        : 'Choose a strong new password with at least 6 characters.',
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
          <span>Back to Plan Poster</span>
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
              <PlanPosterLogo size="lg" href="/" />
            </div>

            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {titles[mode] || titles.signin}
            </h1>
            <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
              {subtitles[mode] || subtitles.signin}
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

          {/* MODE: FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Your Account Email
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

              <button
                type="submit"
                disabled={isResetLoading}
                className="w-full py-3.5 px-4 rounded-xl font-bold bg-black hover:bg-gray-800 active:bg-gray-900 text-white flex items-center justify-center space-x-2 text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 mt-2"
              >
                {isResetLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Sending Recovery Link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Password Reset Link</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center mt-6 pt-5 border-t border-gray-100 text-xs text-gray-600">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="inline-flex items-center space-x-1.5 text-gray-700 hover:text-black font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </form>
          )}

          {/* MODE: RESET PASSWORD */}
          {mode === 'reset-password' && (
            <>
              {/* State A: Loading / Exchanging code or hash session */}
              {hasValidSession === null && isResetLoading && (
                <div className="py-10 text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-900 mx-auto" />
                  <p className="text-xs font-medium text-gray-600">
                    Verifying secure recovery session...
                  </p>
                </div>
              )}

              {/* State B: Missing or Expired Session */}
              {hasValidSession === false && (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl text-left space-y-2">
                    <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs">
                      <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Recovery Link Required</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      For your security, setting a new password requires an active one-time link from your email inbox. If you have not opened the email link yet or if it has expired, request a fresh recovery link below.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="w-full py-3.5 px-4 rounded-xl font-bold bg-black hover:bg-gray-800 active:bg-gray-900 text-white flex items-center justify-center space-x-2 text-xs shadow-sm transition-all cursor-pointer"
                  >
                    <span>Request New Reset Link</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="text-center pt-3 border-t border-gray-100 text-xs text-gray-600">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signin');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="inline-flex items-center space-x-1.5 text-gray-700 hover:text-black font-semibold cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Return to Sign In</span>
                    </button>
                  </div>
                </div>
              )}

              {/* State C: Active Session Established -> Ready to Set Password */}
              {(hasValidSession === true || (hasValidSession === null && !isResetLoading)) && (
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      New Password (min 6 characters)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-300 bg-gray-50/50 hover:bg-gray-50 text-gray-900 placeholder:text-gray-600 focus:outline-hidden focus:border-black focus:ring-1 focus:ring-black transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-300 bg-gray-50/50 hover:bg-gray-50 text-gray-900 placeholder:text-gray-600 focus:outline-hidden focus:border-black focus:ring-1 focus:ring-black transition-all"
                    />
                  </div>

                  {/* Requirements Helper */}
                  <div className="flex flex-wrap gap-2 text-[10px] text-gray-500 pt-1">
                    <span
                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md ${
                        newPassword.length >= 6
                          ? 'bg-emerald-50 text-emerald-700 font-semibold'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {newPassword.length >= 6 ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      )}
                      <span>6+ characters</span>
                    </span>

                    <span
                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md ${
                        confirmPassword.length > 0 && newPassword === confirmPassword
                          ? 'bg-emerald-50 text-emerald-700 font-semibold'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {confirmPassword.length > 0 && newPassword === confirmPassword ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      )}
                      <span>Passwords match</span>
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isResetLoading}
                    className="w-full py-3.5 px-4 rounded-xl font-bold bg-black hover:bg-gray-800 active:bg-gray-900 text-white flex items-center justify-center space-x-2 text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {isResetLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Saving New Password...</span>
                      </>
                    ) : (
                      <>
                        <span>Save Password &amp; Enter Workspace</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center mt-6 pt-5 border-t border-gray-100 text-xs text-gray-600">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signin');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="inline-flex items-center space-x-1.5 text-gray-700 hover:text-black font-semibold cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Return to Sign In</span>
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* MODE: SIGNIN & SIGNUP */}
          {(mode === 'signin' || mode === 'signup') && (
            <>
              {/* Google 1-Click Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isEmailLoading}
                className="w-full py-3 px-4 rounded-xl font-semibold bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-800 border border-gray-300 flex items-center justify-center space-x-3 text-xs shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-gray-700" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
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
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setErrorMsg(null);
                          setSuccessMsg(null);
                        }}
                        className="text-[11px] text-gray-600 hover:text-black font-medium cursor-pointer"
                      >
                        Forgot password?
                      </button>
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
                  disabled={isEmailLoading || isGoogleLoading}
                  className="w-full py-3.5 px-4 rounded-xl font-bold bg-black hover:bg-gray-800 active:bg-gray-900 text-white flex items-center justify-center space-x-2 text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 mt-2"
                >
                  {isEmailLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>{mode === 'signin' ? 'Signing in...' : 'Creating Account...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{mode === 'signin' ? 'Sign In to Workspace' : 'Create Free Account'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
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
                        setSuccessMsg(null);
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
                        setSuccessMsg(null);
                      }}
                      className="text-black font-bold hover:underline cursor-pointer ml-1"
                    >
                      Sign in instead
                    </button>
                  </span>
                )}
              </div>
            </>
          )}
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
          &copy; 2026 Plan Poster Technologies Inc. All rights reserved.
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
