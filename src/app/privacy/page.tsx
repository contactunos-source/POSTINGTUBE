'use client';

import React from 'react';
import Link from 'next/link';
import { LegalLayout } from '@/components/legal/LegalLayout';
import {
  Lock,
  ShieldCheck,
  Eye,
  Trash2,
  Database,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="How Plan Poster collects, secures, encrypts, and processes your personal data and social network credentials across our multi-channel social SaaS."
      badge="GDPR &amp; Meta Verified"
      effectiveDate="Last Updated: November 2026 • Version 2.5"
    >
      <div className="space-y-12 text-sm text-gray-700 leading-relaxed max-w-4xl">
        {/* Intro Plain English Notice */}
        <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="font-bold text-gray-900 block text-sm mb-1">
              Your Privacy &amp; Data Rights
            </span>
            <span>
              Plan Poster does not sell your personal data, advertising profiles, or social tokens to any third party. Data is processed exclusively to deliver your scheduled posts.
            </span>
          </div>
          <Link
            href="/security"
            className="shrink-0 text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
          >
            Review Security Architecture &rarr;
          </Link>
        </div>

        {/* 1. Information We Collect */}
        <section id="collection" className="space-y-4">
          <div className="flex items-center space-x-2 text-gray-900">
            <span className="font-mono text-xs font-bold text-emerald-600">01</span>
            <h2 className="text-xl font-bold">Information We Collect</h2>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 text-xs text-emerald-950">
            <strong className="block font-bold mb-1">Summary in Plain English:</strong>
            We collect the basic information you give us (like your email address and name) and the social channel tokens you authorize so we can schedule posts on your behalf.
          </div>

          <p>
            When you register, configure workspaces, and connect channels on Plan Poster, we collect information across three categories:
          </p>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <h3 className="font-bold text-gray-900 text-xs mb-1">A. Account Registration Information</h3>
              <p className="text-xs text-gray-600">
                When creating an account via email or Google OAuth 2.0, we collect your name, email address, password hash (salted and encrypted via bcrypt), and avatar image.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <h3 className="font-bold text-gray-900 text-xs mb-1">B. Post Content &amp; Media Assets</h3>
              <p className="text-xs text-gray-600">
                Any captions, titles, scheduled publication timestamps, hashtags, images, and videos uploaded to our composer or media library to be delivered to your channels.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <h3 className="font-bold text-gray-900 text-xs mb-1">C. Technical &amp; Operational Logs</h3>
              <p className="text-xs text-gray-600">
                Device browser type, IP address, request timestamps, and delivery receipt logs from social APIs to monitor worker execution and diagnose scheduling issues.
              </p>
            </div>
          </div>
        </section>

        {/* 2. Connected Social Media Accounts */}
        <section id="social-data" className="space-y-4">
          <div className="flex items-center space-x-2 text-gray-900">
            <span className="font-mono text-xs font-bold text-emerald-600">02</span>
            <h2 className="text-xl font-bold">Connected Social Media Accounts &amp; Platform APIs</h2>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 text-xs text-emerald-950">
            <strong className="block font-bold mb-1">Summary in Plain English:</strong>
            When you link social accounts, we only request the permissions required to publish your posts. We follow strict platform developer rules for Google/YouTube, Meta, X, and LinkedIn.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* YouTube */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-white">
              <div className="flex items-center space-x-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                <h3 className="font-bold text-gray-900 text-xs">YouTube API Services (Google)</h3>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed mb-2">
                Plan Poster uses official YouTube API Services. By connecting your YouTube channel, you agree to the{' '}
                <a
                  href="https://www.youtube.com/t/terms"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline font-semibold"
                >
                  YouTube Terms of Service
                </a>{' '}
                and acknowledge the{' '}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline font-semibold"
                >
                  Google Privacy Policy
                </a>.
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                We access channel title, thumbnail, upload playlists, and video publication endpoints strictly to schedule and upload your videos. You can revoke Plan Poster&apos;s access at any time via the{' '}
                <a
                  href="https://security.google.com/settings/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline font-semibold"
                >
                  Google Security Settings Page
                </a>.
              </p>
            </div>

            {/* Meta */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-white">
              <div className="flex items-center space-x-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <h3 className="font-bold text-gray-900 text-xs">Meta (Facebook Pages &amp; Instagram)</h3>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Through Meta Graph API v20, we access Facebook Page names, page IDs, Instagram Business account IDs, and user access tokens. Direct publishing to personal Facebook profiles is prohibited by Meta policies; we interact strictly with Pages and connected Instagram Business accounts you manage.
              </p>
            </div>

            {/* X */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-white">
              <div className="flex items-center space-x-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-black"></span>
                <h3 className="font-bold text-gray-900 text-xs">X (formerly Twitter)</h3>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Through X API v2 (OAuth 2.0 PKCE), we access your Twitter user handle, profile photo, and write permissions strictly to publish scheduled tweets and media attachments.
              </p>
            </div>

            {/* LinkedIn */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-white">
              <div className="flex items-center space-x-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-700"></span>
                <h3 className="font-bold text-gray-900 text-xs">LinkedIn Marketing API</h3>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                We collect organization URNs and author IDs to enable scheduled text, link, and photo shares to company pages and personal profiles.
              </p>
            </div>
          </div>
        </section>

        {/* 3. How We Use Data */}
        <section id="use-of-data" className="space-y-4">
          <div className="flex items-center space-x-2 text-gray-900">
            <span className="font-mono text-xs font-bold text-emerald-600">03</span>
            <h2 className="text-xl font-bold">How We Use Your Personal Data</h2>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 text-xs text-emerald-950">
            <strong className="block font-bold mb-1">Summary in Plain English:</strong>
            We use your data only to run Plan Poster: publishing your posts on time, preventing unauthorized access, and improving app performance.
          </div>

          <p>
            Plan Poster processes collected information for the following legitimate business purposes:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-600">
            <li><strong>Automated Execution:</strong> Running background queue workers to dispatch posts to authorized social channels at your chosen scheduled time.</li>
            <li><strong>Workspace Security:</strong> Enforcing PostgreSQL Row-Level Security (RLS) to ensure complete data isolation between separate customer accounts.</li>
            <li><strong>Analytics &amp; Performance:</strong> Gathering post delivery confirmation, engagement summaries, and network status reports.</li>
            <li><strong>Customer Support:</strong> Assisting you with token refreshing, API troubleshooting, and queue inquiries.</li>
            <li><strong>No Ad Targeting:</strong> We <strong>never</strong> use your social post content or tokens to build advertising profiles, nor do we sell information to data brokers.</li>
          </ul>
        </section>

        {/* 4. Security & Storage */}
        <section id="security-measures" className="space-y-4">
          <div className="flex items-center space-x-2 text-gray-900">
            <span className="font-mono text-xs font-bold text-emerald-600">04</span>
            <h2 className="text-xl font-bold">Security, Encryption &amp; Data Retention</h2>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 text-xs text-emerald-950">
            <strong className="block font-bold mb-1">Summary in Plain English:</strong>
            All social tokens and database records are encrypted with AES-256. Connections use TLS 1.3 encryption.
          </div>

          <p>
            We implement industry-standard administrative, physical, and electronic safeguards:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600">
            <li><strong>Encryption at Rest:</strong> Database records and OAuth tokens are stored in PostgreSQL managed with AES-256 encryption.</li>
            <li><strong>Encryption in Transit:</strong> All web traffic and API calls strictly enforce HTTPS/TLS 1.3.</li>
            <li><strong>Token Segregation:</strong> Access tokens are isolated by workspace ID and never exposed in client-side bundles.</li>
            <li><strong>Data Retention:</strong> We store your drafts and scheduled posts only as long as your workspace account is active.</li>
          </ul>
        </section>

        {/* 5. User Rights & Deletion */}
        <section id="user-rights" className="space-y-4">
          <div className="flex items-center space-x-2 text-gray-900">
            <span className="font-mono text-xs font-bold text-emerald-600">05</span>
            <h2 className="text-xl font-bold">Your Privacy Rights &amp; Data Deletion (GDPR / CCPA)</h2>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 text-xs text-emerald-950">
            <strong className="block font-bold mb-1">Summary in Plain English:</strong>
            You have full control over your data. You can export, update, or completely delete your account and all social tokens at any time.
          </div>

          <p>
            Under GDPR, CCPA, and global privacy standards, you have the right to:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-600">
            <li>Access and receive a copy of your personal data;</li>
            <li>Rectify inaccurate or outdated workspace details;</li>
            <li>Request permanent deletion of your account and all associated tokens;</li>
            <li>Revoke connected social channels at any moment from your Connected Accounts dashboard.</li>
          </ul>
          <p className="mt-3">
            For step-by-step instructions on removing permissions directly via Facebook, Google, or our database purge mechanism, visit our dedicated{' '}
            <Link href="/data-deletion" className="text-blue-600 underline font-bold">
              User Data Deletion Instructions
            </Link>.
          </p>
        </section>

        {/* 6. Children's Privacy */}
        <section id="children" className="space-y-3">
          <div className="flex items-center space-x-2 text-gray-900">
            <span className="font-mono text-xs font-bold text-emerald-600">06</span>
            <h2 className="text-xl font-bold">Children&apos;s Privacy</h2>
          </div>
          <p className="text-xs text-gray-600">
            Plan Poster is not directed to individuals under the age of 18. We do not knowingly collect personal data from minors. If you believe a minor has registered an account, contact us immediately and we will promptly purge the data.
          </p>
        </section>

        {/* 7. Contact Us */}
        <section id="contact" className="space-y-2 pt-6 border-t border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">7. Privacy Officer Contact</h2>
          <p>
            If you have questions, concerns, or requests regarding this Privacy Policy or our third-party social integrations, please contact our privacy officer:
          </p>
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs space-y-1 font-mono">
            <div><strong>Email:</strong> planposter.team@gmail.com</div>
            <div><strong>Support:</strong> support@planposter.com</div>
            <div><strong>Compliance:</strong> Meta Platform &amp; YouTube API Certified</div>
          </div>
        </section>
      </div>
    </LegalLayout>
  );
}
