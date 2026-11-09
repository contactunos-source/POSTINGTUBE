'use client';

import React from 'react';
import Link from 'next/link';
import { LegalLayout } from '@/components/legal/LegalLayout';
import {
  MapPin,
  Home,
  LayoutDashboard,
  Calendar,
  Layers,
  BarChart3,
  Settings,
  Scale,
  FileText,
  Lock,
  ShieldCheck,
  Trash2,
  Cpu,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export default function SitemapPage() {
  const sections = [
    {
      category: 'Public Product & Marketing',
      description: 'Explore our platform features, pricing tiers, and client authentication.',
      links: [
        { href: '/', title: 'Home Landing Page', desc: 'Main product presentation, feature highlights, and interactive orbit wheel.', icon: Home },
        { href: '/pricing', title: 'Pricing & Plans', desc: 'Detailed comparison of Free, Creator, Growth, and Agency subscription tiers.', icon: Layers },
        { href: '/login', title: 'Sign In to Workspace', desc: 'Secure Google OAuth 2.0 and password login gate for workspace members.', icon: Lock },
        { href: '/login?mode=signup', title: 'Create Free Account', desc: '1-click onboarding to connect Facebook, Instagram, YouTube, X, and LinkedIn.', icon: ArrowRight },
      ],
    },
    {
      category: 'Creator Studio & Dashboard (App)',
      description: 'Tools for multi-channel composition, scheduled queue automation, and channel management.',
      links: [
        { href: '/dashboard', title: 'Social Command Center', desc: 'Unified view of scheduled posts, active channels, and queue status.', icon: LayoutDashboard },
        { href: '/dashboard?tab=calendar', title: 'Content Calendar & Schedule', desc: 'Interactive day, week, and month view with drag-and-drop scheduling.', icon: Calendar },
        { href: '/dashboard?tab=new-post', title: 'Multi-Channel Composer', desc: 'Single-draft composer with platform-specific character counters and media studio.', icon: Layers },
        { href: '/dashboard?tab=connections', title: 'Connected Channels', desc: 'OAuth token manager for Facebook Pages, Instagram Business, YouTube, X, and LinkedIn.', icon: Settings },
        { href: '/dashboard?tab=analytics', title: 'Insights & Performance', desc: 'Post delivery analytics, engagement breakdowns, and sync metrics.', icon: BarChart3 },
        { href: '/dashboard?tab=worker-console', title: 'Automated Worker Console', desc: 'Real-time telemetry and simulator for cron queue dispatching.', icon: Cpu },
      ],
    },
    {
      category: 'Trust, Compliance & Legal Hub',
      description: 'Our complete legal framework, third-party platform API rules, and data protection standards.',
      links: [
        { href: '/legal', title: 'Legal & Compliance Center', desc: 'Central directory of all policies, platform disclaimers, and legal FAQs.', icon: Scale },
        { href: '/terms', title: 'Terms of Service', desc: 'The binding user agreement, content ownership terms, and liability limits.', icon: FileText },
        { href: '/privacy', title: 'Privacy Policy', desc: 'Detailed policy explaining personal data handling and social API token usage.', icon: Lock },
        { href: '/security', title: 'Security Architecture', desc: 'Enterprise whitepaper on 256-bit encryption, Row-Level Security, and token isolation.', icon: ShieldCheck },
        { href: '/data-deletion', title: 'User Data Deletion Instructions', desc: 'Self-service and manual steps for permanent data erasure and permission revocation.', icon: Trash2 },
      ],
    },
  ];

  return (
    <LegalLayout
      title="Plan Poster Sitemap"
      subtitle="Complete overview of all public landing pages, studio features, workspace utilities, and legal documentation."
      badge="Site Directory"
      effectiveDate="All Live Routes • Active Production Index"
    >
      <div className="space-y-12 max-w-4xl">
        <p className="text-sm text-gray-700 leading-relaxed">
          Below is a structured index of all available pages, workspace utilities, and compliance documentation hosted across <strong>planposter.vercel.app</strong>.
        </p>

        {sections.map((section, idx) => (
          <div key={idx} className="space-y-4 pt-6 border-t border-gray-100 first:border-t-0 first:pt-0">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                {section.category}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                {section.description}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {section.links.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="p-4 rounded-2xl border border-gray-200/80 bg-white hover:border-black hover:shadow-xs transition-all group flex items-start space-x-3.5"
                  >
                    <div className="w-8 h-8 rounded-xl bg-gray-100 group-hover:bg-black group-hover:text-white transition-colors flex items-center justify-center text-gray-800 shrink-0 mt-0.5">
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-gray-900 text-xs group-hover:text-black truncate">
                          {link.title}
                        </span>
                        <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-black group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed mt-1 line-clamp-2">
                        {link.desc}
                      </p>
                      <span className="font-mono text-[10px] text-emerald-700 mt-1.5 block">
                        {link.href}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </LegalLayout>
  );
}
