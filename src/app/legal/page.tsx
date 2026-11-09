'use client';

import React from 'react';
import Link from 'next/link';
import { LegalLayout } from '@/components/legal/LegalLayout';
import {
  Scale,
  FileText,
  Lock,
  ShieldCheck,
  Trash2,
  ExternalLink,
  HelpCircle,
  CheckCircle2,
  Mail,
  ArrowRight,
  Globe,
  Layers,
} from 'lucide-react';

export default function LegalCenterPage() {
  const policies = [
    {
      title: 'Terms of Service',
      description: 'The master agreement governing your account, subscription plans, usage rules, and content ownership.',
      href: '/terms',
      badge: 'Binding Contract',
      icon: FileText,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      title: 'Privacy Policy',
      description: 'How we collect, store, encrypt, and handle personal data and connected social media channel credentials.',
      href: '/privacy',
      badge: 'Data Protection',
      icon: Lock,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      title: 'Security Architecture',
      description: 'Technical whitepaper detailing 256-bit AES encryption, multi-tenant Row-Level Security, and token isolation.',
      href: '/security',
      badge: 'Infrastructure',
      icon: ShieldCheck,
      color: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      title: 'User Data Deletion',
      description: 'Step-by-step instructions for revoking social permissions via Meta/Google and submitting complete database purge requests.',
      href: '/data-deletion',
      badge: 'GDPR / CCPA',
      icon: Trash2,
      color: 'bg-rose-50 text-rose-700 border-rose-200',
    },
  ];

  const faqs = [
    {
      q: 'Who owns the content I publish through Plan Poster?',
      a: 'You retain 100% full ownership of all images, videos, captions, and creative media you upload or publish. Plan Poster only holds the temporary technical license needed to deliver your posts to social networks on your behalf.',
    },
    {
      q: 'Does Plan Poster sell user data or social credentials to advertisers?',
      a: 'No. We never sell, rent, or trade your personal data, post content, or OAuth access tokens to advertisers, data brokers, or marketing intermediaries. Your data is used exclusively to operate your workspace.',
    },
    {
      q: 'How does Plan Poster handle YouTube and Google account data?',
      a: 'Plan Poster uses official YouTube API Services in strict compliance with the YouTube Terms of Service and Google Privacy Policy. You can review or revoke our app’s permissions at any time from your Google Security Settings page.',
    },
    {
      q: 'How can I completely delete my account and all associated tokens?',
      a: 'You can disconnect channels anytime from your dashboard, or visit our User Data Deletion page for instant self-service account termination and database purge.',
    },
  ];

  return (
    <LegalLayout
      title="Legal &amp; Compliance Center"
      subtitle="Access all Plan Poster policies, platform compliance guidelines, data protection standards, and legal notices in one central hub."
      badge="Transparency First"
      effectiveDate="Official Documentation • Active Version 2.5"
    >
      <div className="space-y-12 text-sm text-gray-700 leading-relaxed max-w-4xl">
        {/* Intro */}
        <section className="space-y-3">
          <p className="text-base text-gray-800 leading-relaxed">
            At Plan Poster, we believe transparency and security are the foundational pillars of trust between our platform and the creators, agencies, and brands who rely on us every day. Below you will find our complete legal framework, third-party platform disclosures, and compliance policies.
          </p>
        </section>

        {/* Policy Cards Grid */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Official Policies &amp; Documents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {policies.map((p) => {
              const Icon = p.icon;
              return (
                <Link
                  key={p.href}
                  href={p.href}
                  className="p-5 rounded-2xl border border-gray-200/90 bg-white hover:border-black hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl bg-gray-100 group-hover:bg-black group-hover:text-white transition-colors flex items-center justify-center text-gray-800">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${p.color}`}>
                        {p.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-gray-900 group-hover:text-black mb-1">
                      {p.title}
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {p.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center text-xs font-semibold text-gray-900 group-hover:translate-x-0.5 transition-transform">
                    <span>Read policy</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1 text-emerald-600" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Third-Party Developer Platform Notices */}
        <section className="space-y-4 pt-6 border-t border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Third-Party Social Platform Standards</h2>
          <p className="text-xs text-gray-600">
            Plan Poster integrates with social media networks through official developer APIs. When connecting your accounts, your activities are governed by both Plan Poster policies and the respective platform developer terms:
          </p>

          <div className="space-y-2">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-gray-900 block">YouTube API Services (Google LLC)</span>
                <span className="text-gray-600">Complies with YouTube Developer Policies and Google API Services User Data Policy.</span>
              </div>
              <div className="flex items-center space-x-3 shrink-0">
                <a
                  href="https://www.youtube.com/t/terms"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 font-semibold hover:underline inline-flex items-center space-x-1"
                >
                  <span>YouTube Terms</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 font-semibold hover:underline inline-flex items-center space-x-1"
                >
                  <span>Google Privacy</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-gray-900 block">Meta Platforms (Facebook Pages &amp; Instagram Business)</span>
                <span className="text-gray-600">Complies with Meta Platform Terms, Instagram Community Guidelines, and Developer Data Use Checkup.</span>
              </div>
              <div className="flex items-center space-x-3 shrink-0">
                <a
                  href="https://developers.facebook.com/terms"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 font-semibold hover:underline inline-flex items-center space-x-1"
                >
                  <span>Meta Terms</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-gray-900 block">X (formerly Twitter) &amp; LinkedIn</span>
                <span className="text-gray-600">Complies with X Developer Agreement and LinkedIn Marketing Developer Platform Rules.</span>
              </div>
            </div>
          </div>
        </section>

        {/* DMCA Copyright Policy */}
        <section className="space-y-3 pt-6 border-t border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">DMCA Copyright Infringement Notice</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            Plan Poster respects the intellectual property rights of creators and complies with the Digital Millennium Copyright Act (17 U.S.C. § 512). If you believe material hosted or transmitted via Plan Poster infringes your copyright, send a formal notification of claimed infringement including:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600">
            <li>Physical or electronic signature of the copyright owner or authorized agent;</li>
            <li>Identification of the copyrighted work claimed to have been infringed;</li>
            <li>Specific URL or location on the Service of the infringing material;</li>
            <li>Your contact info (name, address, telephone, email address);</li>
            <li>Statement of good-faith belief that the use is unauthorized.</li>
          </ul>
          <p className="text-xs text-gray-600">
            Submit DMCA notices to: <a href="mailto:planposter.team@gmail.com" className="text-blue-600 underline font-semibold">planposter.team@gmail.com</a> (Attn: Legal / Copyright Agent).
          </p>
        </section>

        {/* FAQ Section */}
        <section className="space-y-4 pt-6 border-t border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Frequently Asked Legal Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <h3 className="font-bold text-gray-900 text-xs mb-1.5 flex items-center space-x-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{faq.q}</span>
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed pl-5">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </LegalLayout>
  );
}
