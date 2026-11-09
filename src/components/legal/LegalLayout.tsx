'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldCheck,
  FileText,
  Lock,
  Scale,
  MapPin,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Mail,
  CheckCircle2,
} from 'lucide-react';
import { PlanPosterLogo } from '@/components/PlanPosterLogo';

export interface LegalLayoutProps {
  title: string;
  subtitle: string;
  badge?: string;
  effectiveDate?: string;
  children: React.ReactNode;
}

const LEGAL_NAV = [
  { href: '/legal', label: 'Legal Center', icon: Scale },
  { href: '/terms', label: 'Terms of Service', icon: FileText },
  { href: '/privacy', label: 'Privacy Policy', icon: Lock },
  { href: '/security', label: 'Security & Trust', icon: ShieldCheck },
  { href: '/sitemap', label: 'Sitemap', icon: MapPin },
];

export const LegalLayout: React.FC<LegalLayoutProps> = ({
  title,
  subtitle,
  badge = 'Official Policy',
  effectiveDate = 'Updated November 2026 • Version 2.4',
  children,
}) => {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-900 font-sans selection:bg-gray-900 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-gray-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <PlanPosterLogo size="sm" href="/" />
            <span className="hidden sm:inline-block text-xs font-mono text-gray-400">/</span>
            <span className="hidden sm:inline-block text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Trust &amp; Legal
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-gray-600 hover:text-black transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center space-x-1 text-xs font-semibold text-white bg-black hover:bg-gray-800 transition-colors px-3.5 py-1.5 rounded-xl shadow-xs"
            >
              <span>Go to App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Subheader & Navigation Tabs */}
      <section className="bg-white border-b border-gray-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-semibold mb-3">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{badge}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-gray-600 mt-2 max-w-2xl leading-relaxed">
            {subtitle}
          </p>

          <div className="text-xs font-mono text-gray-400 mt-3">
            {effectiveDate}
          </div>

          {/* Tab Navigation */}
          <nav className="flex items-center space-x-1 sm:space-x-2 mt-8 overflow-x-auto pb-2 scrollbar-none">
            {LEGAL_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-black text-white shadow-xs'
                      : 'text-gray-600 hover:text-black hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </section>

      {/* Main Body */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-12 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          {children}
        </div>

        {/* Support & Inquiries Card */}
        <div className="mt-8 bg-gradient-to-br from-gray-900 to-black text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h3 className="text-base sm:text-lg font-bold">
              Have questions about Plan Poster&apos;s policies or compliance?
            </h3>
            <p className="text-xs sm:text-sm text-gray-300 mt-1 max-w-xl">
              Our legal, security, and developer teams respond promptly to data rights requests, API usage questions, and platform verification audits.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="mailto:planposter.team@gmail.com"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white text-gray-900 hover:bg-gray-100 text-xs font-bold transition-colors"
            >
              <Mail className="w-4 h-4 text-emerald-600" />
              <span>Contact Legal Team</span>
            </a>
            <Link
              href="/data-deletion"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors border border-white/15"
            >
              <span>User Data Deletion</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <div className="flex items-center space-x-3">
            <PlanPosterLogo size="sm" href="/" />
            <span>&copy; 2026 Plan Poster Technologies Inc. All rights reserved.</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <Link href="/privacy" className="hover:text-black transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-black transition-colors">Terms</Link>
            <Link href="/security" className="hover:text-black transition-colors">Security</Link>
            <Link href="/legal" className="hover:text-black transition-colors">Legal Hub</Link>
            <Link href="/sitemap" className="hover:text-black transition-colors">Sitemap</Link>
            <Link href="/data-deletion" className="hover:text-black transition-colors">Data Deletion</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LegalLayout;
