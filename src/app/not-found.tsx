'use client';

import Link from 'next/link';
import { PostingTubeLogo } from '@/components/PostingTubeLogo';
import { ArrowLeft, LayoutDashboard, HelpCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col justify-between font-sans selection:bg-rose-100 selection:text-rose-900">
      {/* Top Header */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        <PostingTubeLogo size="sm" href="/" />
        <Link
          href="/dashboard"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-gray-600 hover:text-black transition-colors"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
      </header>

      {/* Main 404 Content Matching User's Clean Style */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="max-w-md w-full text-center flex flex-col items-center">
          {/* Warm Amber Badge with Circular Question Mark Icon */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-50/80 border border-amber-200/60 flex items-center justify-center mb-6 shadow-xs">
            <HelpCircle className="w-8 h-8 sm:w-10 sm:h-10 text-amber-500 stroke-[1.75]" />
          </div>

          {/* 404 Headline */}
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-950 mb-2">
            404
          </h1>

          {/* Page not found subhead */}
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
            Page not found
          </h2>

          {/* Description */}
          <p className="text-sm text-gray-500 mb-8 max-w-xs sm:max-w-sm leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>

          {/* Primary & Secondary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-full bg-gray-950 text-white text-sm font-semibold hover:bg-black transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>

            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-full bg-gray-100 hover:bg-gray-200/80 text-gray-900 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Go to Dashboard</span>
            </Link>
          </div>

          {/* Quick Helpful Links */}
          <div className="mt-12 pt-8 border-t border-gray-100 w-full flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-gray-500">
            <Link href="/login" className="hover:text-gray-900 transition-colors">
              Sign In
            </Link>
            <span className="text-gray-300">•</span>
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">
              Privacy Policy
            </Link>
            <span className="text-gray-300">•</span>
            <Link href="/terms" className="hover:text-gray-900 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-gray-400">
        © 2026 PostingTube. All rights reserved.
      </footer>
    </div>
  );
}
