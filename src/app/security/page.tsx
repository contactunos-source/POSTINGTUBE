'use client';

import React from 'react';
import Link from 'next/link';
import { LegalLayout } from '@/components/legal/LegalLayout';
import {
  ShieldCheck,
  Lock,
  Key,
  Server,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Layers,
  FileCheck,
} from 'lucide-react';

export default function SecurityPage() {
  return (
    <LegalLayout
      title="Security &amp; Trust Architecture"
      subtitle="Comprehensive overview of Plan Poster's multi-layered defense: 256-bit AES encryption, Row-Level Security, automated token isolation, and continuous monitoring."
      badge="Enterprise-Grade Protection"
      effectiveDate="Security Whitepaper • Updated November 2026"
    >
      <div className="space-y-12 text-sm text-gray-700 leading-relaxed max-w-4xl">
        {/* Top Highlight Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center mb-2 shadow-xs">
              <Lock className="w-4 h-4" />
            </div>
            <div className="font-bold text-gray-900 text-xs">AES-256 Encryption</div>
            <div className="text-[11px] text-gray-600 mt-1">
              All stored OAuth credentials, tokens, and database records encrypted at rest.
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-2 shadow-xs">
              <Database className="w-4 h-4" />
            </div>
            <div className="font-bold text-gray-900 text-xs">PostgreSQL RLS</div>
            <div className="text-[11px] text-gray-600 mt-1">
              Multi-tenant Row-Level Security guarantees strict cross-account isolation.
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-2 shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="font-bold text-gray-900 text-xs">TLS 1.3 in Transit</div>
            <div className="text-[11px] text-gray-600 mt-1">
              Strict HTTPS with HSTS and automated certificate rotation on edge.
            </div>
          </div>
        </div>

        {/* 1. Architecture */}
        <section id="architecture" className="space-y-4">
          <div className="flex items-center space-x-2 text-gray-900">
            <span className="font-mono text-xs font-bold text-emerald-600">01</span>
            <h2 className="text-xl font-bold">Cloud Infrastructure &amp; Edge Delivery</h2>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 text-xs text-emerald-950">
            <strong className="block font-bold mb-1">Summary in Plain English:</strong>
            Plan Poster runs on globally distributed, SOC-2 compliant serverless cloud networks provided by Vercel and Supabase. There are no single points of failure.
          </div>

          <p>
            Plan Poster employs a decentralized modern cloud architecture designed for high availability and zero unauthorized ingress:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-600">
            <li><strong>Edge Runtime:</strong> Application entrypoints and API routes execute on Vercel&apos;s global serverless network, providing automatic DDoS mitigation and instantaneous failover.</li>
            <li><strong>Database Cluster:</strong> Dedicated PostgreSQL managed by Supabase, featuring automated replication, connection pooling, and continuous health auditing.</li>
            <li><strong>Isolated Background Workers:</strong> Cron scheduler tasks run in dedicated isolated sandboxes, checking queue timestamps without exposing database credentials to public traffic.</li>
          </ul>
        </section>

        {/* 2. Multi-Tenant Isolation */}
        <section id="isolation" className="space-y-4">
          <div className="flex items-center space-x-2 text-gray-900">
            <span className="font-mono text-xs font-bold text-emerald-600">02</span>
            <h2 className="text-xl font-bold">Multi-Tenant Row-Level Security (RLS)</h2>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 text-xs text-emerald-950">
            <strong className="block font-bold mb-1">Summary in Plain English:</strong>
            Even though many agencies and creators use Plan Poster, your database records are mathematically locked to your workspace. No other user can ever view or query your channels or posts.
          </div>

          <p>
            Unlike legacy applications that rely only on application-level filtering, Plan Poster enforces authorization directly at the database engine level via PostgreSQL <strong>Row-Level Security (RLS)</strong> policies.
          </p>
          <div className="p-4 rounded-xl bg-gray-900 text-gray-100 font-mono text-xs overflow-x-auto">
            <code>
              CREATE POLICY workspace_isolation_policy ON scheduled_posts<br />
              &nbsp;&nbsp;FOR ALL USING (auth.uid() = user_id OR workspace_id = current_setting(&apos;app.current_workspace_id&apos;));
            </code>
          </div>
          <p className="text-xs text-gray-600">
            Every database query includes cryptographic session tokens validating workspace ownership before any records are returned.
          </p>
        </section>

        {/* 3. Token Hygiene */}
        <section id="tokens" className="space-y-4">
          <div className="flex items-center space-x-2 text-gray-900">
            <span className="font-mono text-xs font-bold text-emerald-600">03</span>
            <h2 className="text-xl font-bold">OAuth 2.0 Credential Hygiene &amp; Token Shielding</h2>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 text-xs text-emerald-950">
            <strong className="block font-bold mb-1">Summary in Plain English:</strong>
            We never store your social media passwords. We use official OAuth 2.0 tokens that are encrypted and stored server-side. They are never sent to the browser.
          </div>

          <p>
            When connecting YouTube, Facebook, Instagram, X, or LinkedIn:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600">
            <li><strong>Zero Password Access:</strong> You authenticate directly on the provider&apos;s official login dialog (e.g. Google or Facebook); Plan Poster never receives or touches your social password.</li>
            <li><strong>Encrypted Vault:</strong> Access tokens and refresh tokens are stored in encrypted columns with AES-256 Galois/Counter Mode (GCM).</li>
            <li><strong>Client Token Shielding:</strong> Raw access tokens are never transmitted to the browser client. The frontend receives only sanitized channel profiles (e.g. channel name, avatar, account ID).</li>
            <li><strong>Instant Revocation:</strong> Disconnecting a channel from Plan Poster immediately deletes the token from our database and invalidates the session.</li>
          </ul>
        </section>

        {/* 4. Authentication Security */}
        <section id="auth" className="space-y-4">
          <div className="flex items-center space-x-2 text-gray-900">
            <span className="font-mono text-xs font-bold text-emerald-600">04</span>
            <h2 className="text-xl font-bold">Authentication &amp; Session Defense</h2>
          </div>

          <p>
            Plan Poster safeguards user sessions through:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600">
            <li><strong>Secure Cookie Flags:</strong> Session tokens use <code>HttpOnly</code>, <code>Secure</code>, and <code>SameSite=Lax</code> cookies to prevent cross-site scripting (XSS) and CSRF attacks.</li>
            <li><strong>Brute Force Throttling:</strong> API rate limiting protects login and registration endpoints against dictionary and automated credential stuffing attacks.</li>
            <li><strong>Owner Multi-Factor Authentication (MFA):</strong> Administrative and super-owner dashboard operations require secondary hardware or TOTP authentication.</li>
          </ul>
        </section>

        {/* 5. Backups & Disaster Recovery */}
        <section id="backups" className="space-y-4">
          <div className="flex items-center space-x-2 text-gray-900">
            <span className="font-mono text-xs font-bold text-emerald-600">05</span>
            <h2 className="text-xl font-bold">Backups &amp; Business Continuity</h2>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Our database cluster performs continuous Write-Ahead Log (WAL) archiving with point-in-time recovery (PITR) up to 7 days, supplemented by automated daily encrypted snapshots stored in geographically redundant cloud storage. Recovery Time Objective (RTO) is under 1 hour, and Recovery Point Objective (RPO) is under 5 minutes.
          </p>
        </section>

        {/* 6. Vulnerability Disclosure */}
        <section id="responsible-disclosure" className="space-y-4">
          <div className="flex items-center space-x-2 text-gray-900">
            <span className="font-mono text-xs font-bold text-emerald-600">06</span>
            <h2 className="text-xl font-bold">Responsible Vulnerability Disclosure</h2>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950">
            <strong className="block font-bold mb-1">Found a potential security issue?</strong>
            We deeply appreciate independent security researchers. Please review our disclosure guidelines below and report findings directly to our security team.
          </div>

          <p className="text-xs text-gray-600">
            If you believe you have discovered a security vulnerability in Plan Poster:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600">
            <li>Email details to <a href="mailto:planposter.team@gmail.com" className="text-blue-600 underline font-semibold">planposter.team@gmail.com</a>.</li>
            <li>Do not publicly disclose, alter, or access data belonging to other users.</li>
            <li>Provide reproduction steps and proof-of-concept payloads.</li>
            <li>Our engineering team will acknowledge reports within 24 hours and provide continuous remediation status.</li>
          </ul>
        </section>
      </div>
    </LegalLayout>
  );
}
