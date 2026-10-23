'use client';

import React from 'react';
import Link from 'next/link';
import { Layers, ArrowLeft, ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';
import { PostingTubeLogo } from '@/components/PostingTubeLogo';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-gray-900 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <PostingTubeLogo size="sm" href="/" />

          <Link
            href="/"
            className="flex items-center space-x-1.5 text-xs font-semibold text-gray-600 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="border-b border-gray-200 pb-8 mb-8">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold mb-4">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Meta & GDPR Compliant</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-gray-500 mt-2">
            Last Updated: October 2026 • Effective Immediately
          </p>
        </div>

        <div className="space-y-8 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">1. Overview</h2>
            <p>
              PostingTube (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the multi-channel social publishing and scheduling platform. This Privacy Policy outlines our practices regarding the collection, use, and disclosure of information when you connect social media platforms, including Meta (Facebook Pages and Instagram Business), YouTube, LinkedIn, X, and others.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">2. Information We Collect from Meta & Social Platforms</h2>
            <p className="mb-2">
              When you authenticate using Facebook Login or Meta Graph API, we access only the data you explicitly permit to enable publishing and scheduling:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600">
              <li><strong>Basic Profile:</strong> Your public name and profile picture to identify your workspace.</li>
              <li><strong>Page & Account Access:</strong> Names, IDs, and avatars of Facebook Pages and Instagram Business accounts you manage so you can select where to publish.</li>
              <li><strong>Access Tokens:</strong> Secure OAuth tokens used strictly to execute scheduled posts on your behalf.</li>
              <li><strong>Media & Post Content:</strong> Captions, images, and videos you draft in PostingTube to be published to connected networks.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">3. How We Use Your Data</h2>
            <p>
              We process your data exclusively to provide our service:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600 mt-2">
              <li>Publishing and scheduling posts to Facebook Pages, Instagram, and other connected networks.</li>
              <li>Displaying analytics, post delivery status, and verification confirmation.</li>
              <li>Maintaining isolated workspace sessions to prevent cross-tenant data access.</li>
              <li>We <strong>never sell</strong> your personal data or social media tokens to third parties or advertising brokers.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">4. Data Retention & Storage</h2>
            <p>
              OAuth access tokens and workspace configurations are encrypted and stored in PostgreSQL with strict Row-Level Security. We retain your scheduled drafts and logs only as long as your workspace account is active.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">5. User Data Deletion</h2>
            <p>
              You have the right to request deletion of your account and all associated social tokens at any time. For detailed instructions on removing permissions via Facebook or requesting full database purge, please visit our{' '}
              <Link href="/data-deletion" className="text-blue-600 underline font-semibold">
                User Data Deletion Instructions
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">6. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or our compliance with Meta Platform Policies, please contact us at:
            </p>
            <p className="mt-1 font-semibold text-gray-900 text-xs">
              Email: privacy@postingtube.com • support@postingtube.com
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6 max-w-4xl mx-auto text-xs text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>&copy; 2026 PostingTube Technologies Inc. All rights reserved.</div>
        <div className="flex items-center space-x-4">
          <Link href="/privacy" className="text-gray-900 font-semibold">Privacy Policy</Link>
          <Link href="/data-deletion" className="hover:text-black">Data Deletion</Link>
          <Link href="/terms" className="hover:text-black">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
}
