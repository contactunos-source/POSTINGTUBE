'use client';

import React from 'react';
import Link from 'next/link';
import { Layers, ArrowLeft, FileText } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-gray-900 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white shadow-sm">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-gray-900">PostBridge</span>
          </Link>

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
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Legal Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs text-gray-500 mt-2">
            Last Updated: October 2026
          </p>
        </div>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using PostBridge, you agree to comply with and be bound by these Terms of Service and all applicable platform developer rules, including Meta&apos;s Platform Terms and Instagram Community Guidelines.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">2. Multi-Channel Publishing & Content Ownership</h2>
            <p>
              You retain 100% ownership of all text, media, images, and videos published through PostBridge. You represent and warrant that your content does not violate any copyright, trademark, or platform policies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">3. Prohibited Use</h2>
            <p>
              Users may not use PostBridge to distribute spam, malware, hate speech, or automated bot activities that violate Meta, Google, or LinkedIn API usage policies.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6 max-w-4xl mx-auto text-xs text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>&copy; 2026 PostBridge Technologies Inc. All rights reserved.</div>
        <div className="flex items-center space-x-4">
          <Link href="/privacy" className="hover:text-black">Privacy Policy</Link>
          <Link href="/data-deletion" className="hover:text-black">Data Deletion</Link>
          <Link href="/terms" className="text-gray-900 font-semibold">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
}
