'use client';

import React from 'react';
import Link from 'next/link';
import { Layers, ArrowLeft, Trash2, CheckCircle2 } from 'lucide-react';
import { PostingTubeLogo } from '@/components/PostingTubeLogo';

export default function DataDeletionPage() {
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
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Meta Compliance Requirement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            User Data Deletion Instructions
          </h1>
          <p className="text-xs text-gray-500 mt-2">
            In compliance with Meta Platform Terms, this page outlines how users can delete their data.
          </p>
        </div>

        <div className="space-y-8 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Option 1: Remove PostingTube Access from Facebook</h2>
            <p className="mb-3">
              You can instantly revoke PostingTube&apos;s access to your Facebook and Instagram accounts at any time:
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-xs text-gray-600">
              <li>Log in to your Facebook account.</li>
              <li>Go to <strong>Settings & Privacy</strong> &gt; <strong>Settings</strong>.</li>
              <li>In the left sidebar, click <strong>Apps and Websites</strong>.</li>
              <li>Find <strong>PostingTube</strong> (or your app name) in the list of active apps.</li>
              <li>Click <strong>Remove</strong> and confirm.</li>
            </ol>
            <p className="mt-3 text-xs text-gray-500">
              Once removed, PostingTube can no longer access your Pages, Instagram accounts, or publish any posts on your behalf.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Option 2: Request Full Database Deletion</h2>
            <p>
              If you want all your stored tokens, workspace drafts, media attachments, and history permanently purged from our database:
            </p>
            <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs space-y-2">
              <p>
                <strong>Send an email to:</strong> <span className="font-mono text-black">privacy@postingtube.com</span>
              </p>
              <p>
                <strong>Subject line:</strong> User Data Deletion Request
              </p>
              <p>
                Include your workspace email or Facebook Page ID. Our automated compliance daemon will purge all records within 48 business hours and send you a confirmation report.
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6 max-w-4xl mx-auto text-xs text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>&copy; 2026 PostingTube Technologies Inc. All rights reserved.</div>
        <div className="flex items-center space-x-4">
          <Link href="/privacy" className="hover:text-black">Privacy Policy</Link>
          <Link href="/data-deletion" className="text-gray-900 font-semibold">Data Deletion</Link>
          <Link href="/terms" className="hover:text-black">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
}
