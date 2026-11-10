'use client';

import React from 'react';
import Link from 'next/link';
import { LegalLayout } from '@/components/legal/LegalLayout';
import {
  FileText,
  ShieldCheck,
  CreditCard,
  Layers,
  AlertCircle,
  ExternalLink,
  Lock,
  Sparkles,
} from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <LegalLayout
      title="Terms of Service"
      subtitle="The binding legal agreement governing your use of Plan Poster's multi-channel social publishing platform, queue automation, and APIs."
      badge="Legal Contract"
      effectiveDate="Last Updated: November 2026 • Version 3.1"
    >
      <div className="space-y-12 text-sm text-gray-700 leading-relaxed max-w-4xl">
        {/* Intro Banner */}
        <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="font-bold text-gray-900 block text-sm mb-1">
              Plain-English Summary Provided
            </span>
            <span>
              Each section below includes a summary box explaining what the clause means for you as a creator or team using Plan Poster.
            </span>
          </div>
          <Link
            href="/privacy"
            className="shrink-0 text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
          >
            Read Privacy Policy &rarr;
          </Link>
        </div>

        {/* 1. Service and Account */}
        <section id="service-overview" className="space-y-4">
          <div className="flex items-center space-x-2 text-gray-900">
            <span className="font-mono text-xs font-bold text-emerald-600">01</span>
            <h2 className="text-xl font-bold">Service &amp; Account Overview</h2>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 text-xs text-emerald-950">
            <strong className="block font-bold mb-1">Summary in Plain English:</strong>
            Plan Poster gives you tools to schedule, compose, adapt, and automatically publish posts across YouTube, Facebook Pages, Instagram Business, X (Twitter), and LinkedIn. We work continuously to keep the service fast, secure, and compatible with social network APIs.
          </div>

          <p>
            Welcome to Plan Poster (&quot;Plan Poster&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). Plan Poster provides a cloud-hosted software-as-a-service (SaaS) application accessible at <strong>planposter.com</strong> and associated domains that enables individual creators, social managers, agencies, and brands to compose, schedule, manage, and dispatch social media publications.
          </p>
          <p>
            By registering an account, connecting third-party social media profiles, or accessing any part of our platform, you confirm that you have read, understood, and agreed to be bound by these Terms of Service and our incorporated Privacy Policy. If you do not agree to these terms, you must not use our Service.
          </p>
        </section>

        {/* 2. Eligibility */}
        <section id="eligibility" className="space-y-4">
          <div className="flex items-center space-x-2 text-gray-900">
            <span className="font-mono text-xs font-bold text-emerald-600">02</span>
            <h2 className="text-xl font-bold">Eligibility &amp; Authority</h2>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 text-xs text-emerald-950">
            <strong className="block font-bold mb-1">Summary in Plain English:</strong>
            You must be at least 18 years old. If you represent an agency or business, you must have the legal authority to connect its social accounts.
          </div>

          <p>
            You must be at least 18 years of age (or the age of legal majority in your jurisdiction) to create an account or use Plan Poster. By agreeing to these Terms, you represent and warrant that:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600">
            <li>You have the legal capacity to enter into a binding contract;</li>
            <li>You have not been previously suspended or permanently removed from Plan Poster;</li>
            <li>If you are registering on behalf of a company, agency, or other legal entity, you possess full authority to bind that entity to these Terms.</li>
          </ul>
        </section>

        {/* 3. Account Registration & Security */}
        <section id="accounts" className="space-y-4">
          <div className="flex items-center space-x-2 text-gray-900">
            <span className="font-mono text-xs font-bold text-emerald-600">03</span>
            <h2 className="text-xl font-bold">Accounts &amp; Security</h2>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 text-xs text-emerald-950">
            <strong className="block font-bold mb-1">Summary in Plain English:</strong>
            You are responsible for keeping your login credentials confidential and for all actions taken under your account. Notify us immediately if you suspect unauthorized access.
          </div>

          <p>
            To access our publishing queue and channel connection tools, you must register using email and password or Google OAuth 2.0. You agree to provide true, accurate, and current information. You are solely responsible for maintaining the confidentiality of your credentials and for all activities that occur under your workspace.
          </p>
          <p>
            If you discover or suspect any unauthorized use of your account or security compromise, you must notify our team immediately at <a href="mailto:planposter.team@gmail.com" className="text-blue-600 underline">planposter.team@gmail.com</a>.
          </p>
        </section>

        {/* 4. Payment & Subscriptions */}
        <section id="payments" className="space-y-4">
          <div className="flex items-center space-x-2 text-gray-900">
            <span className="font-mono text-xs font-bold text-emerald-600">04</span>
            <h2 className="text-xl font-bold">Subscription &amp; Payment Terms</h2>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 text-xs text-emerald-950">
            <strong className="block font-bold mb-1">Summary in Plain English:</strong>
            Paid tiers renew automatically every month or year. You can cancel anytime from your billing settings to prevent future renewals. Payments are handled securely via licensed processors (Stripe or Razorpay).
          </div>

          <p>
            <strong>Subscription Billing:</strong> Plan Poster offers both free tiers and paid subscription plans (such as Creator, Growth, and Agency). Paid plans are billed on a recurring subscription basis (monthly or annually). By selecting a paid tier, you authorize Plan Poster and our third-party payment gateways (Stripe or Razorpay) to charge your payment method on file at each renewal date.
          </p>
          <p>
            <strong>Cancellation:</strong> You may cancel your subscription at any time via your Account Settings or Billing Portal. When canceled, your subscription remains active until the end of your prepaid billing period, and no further renewal charges will be made.
          </p>
          <p>
            <strong>Refunds:</strong> Except where required by applicable consumer law, all paid fees are non-refundable. If you experience an exceptional service issue, contact support for case-by-case review.
          </p>
        </section>

        {/* 5. Content Ownership & License */}
        <section id="user-content" className="space-y-4">
          <div className="flex items-center space-x-2 text-gray-900">
            <span className="font-mono text-xs font-bold text-emerald-600">05</span>
            <h2 className="text-xl font-bold">Content Ownership &amp; Licenses</h2>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 text-xs text-emerald-950">
            <strong className="block font-bold mb-1">Summary in Plain English:</strong>
            You own 100% of your posts, media, captions, and creative assets. You grant Plan Poster only the limited technical license needed to deliver your posts to the social networks you choose.
          </div>

          <p>
            <strong>Your Ownership:</strong> You retain complete ownership and intellectual property rights in all text, photos, graphics, audio, video files, tags, and data you upload, create, or schedule through Plan Poster (&quot;User Content&quot;).
          </p>
          <p>
            <strong>Limited License to Plan Poster:</strong> Solely to provide the Service, you grant Plan Poster a worldwide, royalty-free license to host, transcode, format, display, and transmit your User Content to the third-party platforms you have authorized (e.g. YouTube, Meta, X, LinkedIn). This license exists strictly to execute your publishing instructions and expires when content is removed or your account is deleted.
          </p>
        </section>

        {/* 6. Third-Party Platform Rules */}
        <section id="third-party" className="space-y-4">
          <div className="flex items-center space-x-2 text-gray-900">
            <span className="font-mono text-xs font-bold text-emerald-600">06</span>
            <h2 className="text-xl font-bold">Third-Party Social Platform Compliance</h2>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 text-xs text-emerald-950">
            <strong className="block font-bold mb-1">Summary in Plain English:</strong>
            Because Plan Poster integrates with YouTube, Meta, X, and LinkedIn, your posts must also respect each platform&apos;s community rules and developer terms.
          </div>

          <p>
            When connecting channels, you acknowledge that Plan Poster operates through official partner APIs and you agree to abide by the respective platform terms:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-600">
            <li>
              <strong>YouTube API Services:</strong> By connecting YouTube channels, you agree to be bound by the{' '}
              <a
                href="https://www.youtube.com/t/terms"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline font-semibold"
              >
                YouTube Terms of Service
              </a>{' '}
              and acknowledge Google&apos;s Privacy Policy. You can revoke Plan Poster&apos;s access at any time via your{' '}
              <a
                href="https://security.google.com/settings/"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline font-semibold"
              >
                Google Security Settings
              </a>.
            </li>
            <li>
              <strong>Meta Platforms (Facebook Pages &amp; Instagram Business):</strong> You must comply with Meta Platform Terms, Instagram Community Guidelines, and Commercial Terms.
            </li>
            <li>
              <strong>X (Twitter) Developer Agreement:</strong> All automated tweets must comply with X Rules and automation guidelines.
            </li>
            <li>
              <strong>LinkedIn API Terms:</strong> Posts must adhere to LinkedIn Professional Community Policies.
            </li>
          </ul>
        </section>

        {/* 7. Prohibited Conduct */}
        <section id="prohibited-conduct" className="space-y-4">
          <div className="flex items-center space-x-2 text-gray-900">
            <span className="font-mono text-xs font-bold text-emerald-600">07</span>
            <h2 className="text-xl font-bold">Prohibited Conduct &amp; Safety Standards</h2>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 text-xs text-emerald-950">
            <strong className="block font-bold mb-1">Summary in Plain English:</strong>
            Do not use Plan Poster for spam, harassment, malware, copyright infringement, or unlawful activities. We strictly enforce zero tolerance for harm or exploitation.
          </div>

          <p>
            You agree that you will <strong>NOT</strong>:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600">
            <li>Post or distribute malicious software, viruses, worms, or trojans;</li>
            <li>Engage in abusive spamming, astroturfing, or unauthorized artificial engagement;</li>
            <li>Transmit hateful content, harassment, threats of physical violence, or doxxing;</li>
            <li>Violate child safety standards or engage in child sexual abuse material (CSAE) — any detection results in immediate permanent ban and law enforcement escalation;</li>
            <li>Reverse engineer, decompile, or attempt to extract source code of Plan Poster;</li>
            <li>Bypass rate limits, multi-tenant boundaries, or security sandboxes.</li>
          </ul>
        </section>

        {/* 8. Disclaimers & Limitation of Liability */}
        <section id="disclaimers" className="space-y-4">
          <div className="flex items-center space-x-2 text-gray-900">
            <span className="font-mono text-xs font-bold text-emerald-600">08</span>
            <h2 className="text-xl font-bold">Disclaimers &amp; Limitation of Liability</h2>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 text-xs text-emerald-950">
            <strong className="block font-bold mb-1">Summary in Plain English:</strong>
            Plan Poster is provided &quot;as-is&quot;. While we strive for 99.9% uptime, we are not liable for third-party social network downtime or indirect damages. Our liability is capped at what you paid us in the past 12 months.
          </div>

          <p>
            THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. PLAN POSTER DOES NOT WARRANT THAT SOCIAL NETWORK APIS WILL BE PERPETUALLY ERROR-FREE OR THAT THIRD-PARTY NETWORKS WILL NOT ALTER THEIR POLICIES OR RATE LIMITS.
          </p>
          <p>
            TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT SHALL PLAN POSTER OR ITS DIRECTORS, EMPLOYEES, OR SUPPLIERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES (INCLUDING LOSS OF PROFITS, DATA, OR REPUTATION). TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS SHALL NOT EXCEED THE GREATER OF (A) THE TOTAL AMOUNT PAID BY YOU TO PLAN POSTER IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) US $100.
          </p>
        </section>

        {/* 9. Termination */}
        <section id="termination" className="space-y-4">
          <div className="flex items-center space-x-2 text-gray-900">
            <span className="font-mono text-xs font-bold text-emerald-600">09</span>
            <h2 className="text-xl font-bold">Term &amp; Termination</h2>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 text-xs text-emerald-950">
            <strong className="block font-bold mb-1">Summary in Plain English:</strong>
            You can close your account at any time. We can suspend or terminate accounts that breach these terms.
          </div>

          <p>
            These Terms remain effective until terminated by either you or Plan Poster. You may terminate your account at any time via Settings or by submitting a deletion request at <Link href="/data-deletion" className="text-blue-600 underline">User Data Deletion</Link>.
          </p>
          <p>
            We reserve the right to suspend or terminate accounts that breach these Terms, violate platform API guidelines, or fail to pay applicable subscription fees.
          </p>
        </section>

        {/* 10. Contact */}
        <section id="contact" className="space-y-2 pt-6 border-t border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">10. Contact Information</h2>
          <p>
            For questions regarding these Terms of Service or legal inquiries, reach out to:
          </p>
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs space-y-1 font-mono">
            <div><strong>Entity:</strong> Plan Poster Technologies Inc.</div>
            <div><strong>Email:</strong> planposter.team@gmail.com</div>
            <div><strong>Website:</strong> https://planposter.com</div>
          </div>
        </section>
      </div>
    </LegalLayout>
  );
}
