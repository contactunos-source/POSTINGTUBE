'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Calendar,
  Clock,
  ShieldCheck,
  Zap,
  Globe,
  Share2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Play,
  RotateCw,
  Send,
  MessageSquare,
  ThumbsUp,
  Sliders,
  Lock,
  Eye,
  Plus,
  Minus,
  Compass,
  Video,
  FileText,
  TrendingUp,
  Users,
  Lightbulb,
  Layers,
  Heart,
  BarChart3,
  Flame,
  Radio,
  FolderPlus,
  Tv,
} from 'lucide-react';
import { PlatformLogo } from '@/components/SocialIcons';
import { supabase, getGuestUser } from '@/lib/supabase';
import { PostingTubeLogo, PostingTubeIcon } from '@/components/PostingTubeLogo';

// Supported channels for integration arc
const INTEGRATION_PLATFORMS = [
  {
    id: 'youtube',
    name: 'YouTube Studio API',
    subtitle: 'Direct 4K video uploads, custom thumbnail frame extraction, tags & official analytics',
    badge: 'Official Partner API',
    color: '#FF0000',
    capabilities: 'Shorts • Long-Form • Thumbnails • COPPA',
  },
  {
    id: 'instagram',
    name: 'Instagram Professional',
    subtitle: 'Direct feed scheduling, automatic 9:16 reels, carousels, and first-comment auto-pinning',
    badge: 'Meta Graph v20.0',
    color: '#E4405F',
    capabilities: 'Reels • Carousels • Single Photo • Insights',
  },
  {
    id: 'facebook',
    name: 'Facebook Pages API',
    subtitle: 'Multi-page publishing, HD video reels, link previews, and engagement tracking',
    badge: 'Meta Graph v20.0',
    color: '#1877F2',
    capabilities: 'Business Pages • Creator Profiles • Video Feed',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn REST API',
    subtitle: 'Company page & personal profile updates, technical articles, and rich document carousels',
    badge: 'Community Management API',
    color: '#0A66C2',
    capabilities: 'Company Updates • Article Sharing • Analytics',
  },
  {
    id: 'tiktok',
    name: 'TikTok Direct Share',
    subtitle: 'Vertical 9:16 video publishing, sound hooks, and creator analytics',
    badge: 'Direct Share API',
    color: '#000000',
    capabilities: 'Vertical Reels • Video Hooks • Reach Metrics',
  },
];

// Testimonials data for the Envelope showcase
const TESTIMONIALS = [
  {
    name: 'Sarah Mitchell',
    role: 'Head of Content at Nova Studios',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&auto=format&fit=crop&q=80',
    rating: 5.0,
    quote:
      'PostingTube has completely streamlined our video distribution. What used to take our agency 3 hours across 5 open tabs every morning now takes 3 minutes. The custom thumbnail frame extractor for YouTube alone is worth the subscription.',
  },
  {
    name: 'James Carter',
    role: 'YouTube Creator & Founder (180K Subs)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80',
    rating: 5.0,
    quote:
      'The platform is incredibly smooth and easy to use. The autonomous scheduler publishes faithfully even when my laptop is shut. Our cross-platform impressions grew by 240% in our first 60 days.',
  },
  {
    name: 'Elena Rostova',
    role: 'Growth Marketing Director at ScaleFlow',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
    rating: 5.0,
    quote:
      'The multi-tenant workspace separation is a lifesaver for managing client brand accounts. No token expiration panics, no broken aspect ratios—everything publishes deterministically.',
  },
];

export default function LandingPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAnnual, setIsAnnual] = useState(true);
  const [pricingCurrency, setPricingCurrency] = useState<'INR' | 'USD'>('INR');
  const [landingChannelsCount, setLandingChannelsCount] = useState<number>(3);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Integration Arc Carousel active index
  const [activeIntegrationIndex, setActiveIntegrationIndex] = useState(0);

  // Testimonials Slider state
  const [activeTestimonialIndex, setActiveTestimonialIndex] = useState(0);

  // Check if user is already authenticated
  useEffect(() => {
    const guest = getGuestUser();
    if (guest) {
      setCurrentUser(guest);
      return;
    }
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setCurrentUser(session.user);
        }
      });
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        setCurrentUser(session?.user || null);
      });
      return () => {
        listener.subscription.unsubscribe();
      };
    }
  }, []);

  // Auto-rotate the integration carousel every 4.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIntegrationIndex((prev) => (prev + 1) % INTEGRATION_PLATFORMS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const activeIntegration = INTEGRATION_PLATFORMS[activeIntegrationIndex];

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-900 font-sans selection:bg-gray-900 selection:text-white relative overflow-x-hidden">
      {/* ================= 1. FLOATING PILL NAVBAR (Inspired by Reference Video) ================= */}
      <div className="fixed top-4 left-0 right-0 z-50 px-4 pointer-events-none">
        <nav className="max-w-4xl mx-auto bg-white/90 backdrop-blur-md border border-gray-200/80 rounded-full px-5 py-2.5 shadow-sm shadow-gray-200/50 flex items-center justify-between pointer-events-auto transition-all">
          {/* Logo */}
          <PostingTubeLogo size="sm" href="/" />

          {/* Navigation Items */}
          <div className="hidden md:flex items-center space-x-7 text-xs font-semibold text-gray-600">
            <a href="#features" className="hover:text-black transition-colors">
              Product
            </a>
            <a href="#features" className="hover:text-black transition-colors">
              Features
            </a>
            <a href="#integrations" className="hover:text-black transition-colors">
              Channels
            </a>
            <a href="#pricing" className="hover:text-black transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-black transition-colors">
              FAQ
            </a>
          </div>

          {/* Right Action Button */}
          <div className="flex items-center space-x-3">
            {currentUser ? (
              <Link
                href="/dashboard"
                className="px-4 py-1.5 rounded-full text-xs font-bold bg-black hover:bg-gray-800 text-white flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-full text-xs font-semibold text-gray-700 hover:text-black transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/login?mode=signup"
                  className="px-4 py-1.5 rounded-full text-xs font-bold bg-black hover:bg-gray-800 text-white flex items-center space-x-1.5 shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  <span>Start Free</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>

      {/* ================= 2. HERO SECTION WITH CONNECTED NODE NETWORK (Video Frame 00:00) ================= */}
      <section className="pt-32 pb-20 px-6 max-w-5xl mx-auto text-center relative">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-tr from-emerald-100/40 via-red-50/30 to-blue-50/40 rounded-full blur-3xl -z-10 pointer-events-none" />

        {/* Central Interactive Node with Bus Connection Lines (Frame 00:00 visual recreated) */}
        <div className="relative w-full max-w-xl mx-auto h-56 mb-8 flex items-center justify-center">
          {/* SVG Connection Lines / Circuit Network */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none stroke-gray-200/90"
            viewBox="0 0 576 224"
            fill="none"
          >
            {/* Left Connections */}
            <path d="M 288 112 C 220 112, 180 40, 100 40" strokeWidth="1.5" strokeDasharray="3 3" />
            <path d="M 288 112 C 200 112, 170 112, 80 112" strokeWidth="1.5" />
            <path d="M 288 112 C 210 112, 180 184, 110 184" strokeWidth="1.5" strokeDasharray="4 4" />

            {/* Right Connections */}
            <path d="M 288 112 C 356 112, 396 40, 476 40" strokeWidth="1.5" strokeDasharray="3 3" />
            <path d="M 288 112 C 376 112, 406 112, 496 112" strokeWidth="1.5" />
            <path d="M 288 112 C 366 112, 396 184, 466 184" strokeWidth="1.5" strokeDasharray="4 4" />
          </svg>

          {/* Central Main Hub Squircle Card */}
          <div className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-500 text-white shadow-xl shadow-purple-500/25 flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <Check className="w-6 h-6 sm:w-7 sm:h-7 stroke-[3] text-white" />
            </div>
          </div>

          {/* Floating Orbit Node 1: Top Left (AI Lightbulb) */}
          <div className="absolute top-2 left-16 sm:left-20 w-11 h-11 rounded-2xl bg-amber-400 text-amber-950 shadow-md shadow-amber-400/25 flex items-center justify-center animate-bounce [animation-duration:3.2s]">
            <Lightbulb className="w-5 h-5 fill-amber-950/20" />
          </div>

          {/* Floating Orbit Node 2: Mid Left (Creator Avatar) */}
          <div className="absolute top-1/2 -translate-y-1/2 left-4 sm:left-8 w-12 h-12 rounded-2xl bg-white p-0.5 shadow-md border border-gray-100">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
              alt="Creator"
              className="w-full h-full object-cover rounded-[14px]"
            />
          </div>

          {/* Floating Orbit Node 3: Bottom Left (Social Cyan Pill) */}
          <div className="absolute bottom-2 left-18 sm:left-24 w-11 h-11 rounded-2xl bg-cyan-400 text-white shadow-md shadow-cyan-400/25 flex items-center justify-center animate-bounce [animation-duration:3.8s]">
            <Share2 className="w-5 h-5" />
          </div>

          {/* Floating Orbit Node 4: Top Right (YouTube Red Bolt) */}
          <div className="absolute top-2 right-16 sm:right-20 w-11 h-11 rounded-2xl bg-red-600 text-white shadow-md shadow-red-600/25 flex items-center justify-center animate-bounce [animation-duration:3.4s]">
            <Zap className="w-5 h-5 fill-white" />
          </div>

          {/* Floating Orbit Node 5: Mid Right (Real-time Vision Glasses) */}
          <div className="absolute top-1/2 -translate-y-1/2 right-4 sm:right-8 w-12 h-12 rounded-2xl bg-white shadow-md border border-gray-100 flex items-center justify-center text-gray-800">
            <Eye className="w-6 h-6 stroke-[2]" />
          </div>

          {/* Floating Orbit Node 6: Bottom Right (Creator Portrait) */}
          <div className="absolute bottom-2 right-18 sm:right-24 w-11 h-11 rounded-2xl bg-white p-0.5 shadow-md border border-gray-100">
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80"
              alt="Creator"
              className="w-full h-full object-cover rounded-[14px]"
            />
          </div>
        </div>

        {/* Big Bold Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 leading-[1.08]">
          All-in-one social<br />
          <span className="text-gray-900">publishing platform</span>
        </h1>

        {/* Clean Subtitle */}
        <p className="mt-5 text-sm sm:text-base text-gray-600 max-w-xl mx-auto leading-relaxed">
          PostingTube is a modern, all-in-one social media publishing platform designed to perfectly schedule,
          adapt, and grow across YouTube, Instagram, Facebook, and LinkedIn.
        </p>

        {/* CTA Button Group */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login?mode=signup"
            className="w-full sm:w-auto px-7 py-3 rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white flex items-center justify-center space-x-2 shadow-md shadow-red-600/20 transition-all cursor-pointer"
          >
            <span>Request a Demo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <a
            href="#features"
            className="w-full sm:w-auto px-6 py-3 rounded-full text-xs font-bold bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-2xs"
          >
            <span>Explore Studio Features</span>
          </a>
        </div>

        {/* Trust Badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500 font-medium">
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>No credit card required</span>
          </span>
          <span className="text-gray-300">•</span>
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Official Google &amp; Meta OAuth 2.0</span>
          </span>
          <span className="text-gray-300">•</span>
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% Isolated Client Workspaces</span>
          </span>
        </div>
      </section>

      {/* ================= 3. BENTO GRID: "BUILT FOR EVERYONE" (Video Frame 00:04 - 00:06) ================= */}
      <section id="features" className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight">
            Built for everyone
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-gray-500 max-w-lg mx-auto">
            Thousands of creators, from solo podcasters to global digital agencies, use PostingTube to automate publishing.
          </p>
        </div>

        {/* Bento Grid (Exactly matching 3 top cards + 2 wide bottom cards from reference) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Card 1: Visual Bar Chart / Analytics Report */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              {/* Graphic Preview */}
              <div className="h-36 bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col justify-between mb-5">
                <div className="flex items-center justify-between text-[11px] font-bold text-gray-700">
                  <span>Reach Report</span>
                  <span className="text-emerald-600 font-mono">+38.4%</span>
                </div>
                {/* Visual bar chart columns */}
                <div className="flex items-end justify-between h-20 px-2 gap-2">
                  {[35, 60, 45, 80, 65, 95, 75].map((height, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        style={{ height: `${height}%` }}
                        className={`w-full rounded-t-md transition-all ${
                          i === 5 ? 'bg-red-500' : 'bg-red-200'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <h3 className="text-base font-bold text-gray-900">For video creators</h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Dedicated YouTube Studio composer with custom thumbnail frame extraction, tags, and COPPA settings.
              </p>
            </div>
          </div>

          {/* Card 2: Interactive Real-Time Pills */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              {/* Graphic Preview */}
              <div className="h-36 bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col items-center justify-center space-y-2 mb-5">
                <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-2xs text-xs font-bold text-gray-800">
                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>Track Performance in Real Time</span>
                </div>
                <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Scheduled for 8:00 PM</span>
                </div>
              </div>

              <h3 className="text-base font-bold text-gray-900">For managers &amp; leaders</h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Schedule multi-platform campaigns ahead of time with frame-accurate calendar queues and automatic execution.
              </p>
            </div>
          </div>

          {/* Card 3: Compliant Stacked Official APIs */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              {/* Graphic Preview */}
              <div className="h-36 bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center justify-center mb-5">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 rounded-2xl bg-purple-100 border border-purple-200 transform -rotate-6" />
                  <div className="absolute inset-0 rounded-2xl bg-white border border-gray-200 shadow-xs flex items-center justify-center transform rotate-3">
                    <ShieldCheck className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
              </div>

              <h3 className="text-base font-bold text-gray-900">For legal &amp; agency teams</h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                PostingTube adheres 100% to official platform terms of service. No scrapers, zero risk of account bans.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom 2 Bento Cards (1 Wide + 1 Circular Orbit) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 4 (Wide 2-col): All channel data at once */}
          <div className="md:col-span-2 bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-7 shadow-xs hover:shadow-md transition-shadow">
            {/* Visual Table of Connected Accounts */}
            <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 mb-5 overflow-x-auto">
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">
                Connected Social Destinations
              </div>
              <div className="space-y-2">
                {[
                  { name: 'U NOS AI', platform: 'youtube', followers: '18.4K', status: 'Connected' },
                  { name: 'U NOS Digital Marketing', platform: 'facebook', followers: '42.1K', status: 'Active' },
                  { name: '@image_rescaler', platform: 'instagram', followers: '12.8K', status: 'Active' },
                ].map((ch, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-200/70 text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <PlatformLogo platform={ch.platform as any} className="w-4 h-4" />
                      <span className="font-bold text-gray-900">{ch.name}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-[11px] text-gray-500">
                      <span>{ch.followers} subscribers</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                        {ch.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <h3 className="text-base font-bold text-gray-900">All channel data at once</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Connect accounts once via official OAuth. Secure automated token refresh keeps your scheduling uninterrupted.
            </p>
          </div>

          {/* Card 5 (1-col): Team & Orbit Wheel */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-7 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              {/* Circular Orbit Wheel (Visual from Frame 00:06) */}
              <div className="h-36 bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center justify-center relative mb-5 overflow-hidden">
                <div className="w-24 h-24 rounded-full border border-dashed border-gray-300 flex items-center justify-center relative animate-[spin_20s_linear_infinite]">
                  <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">
                    <PostingTubeIcon size={18} />
                  </div>
                  {/* Orbiting mini avatars */}
                  <div className="absolute -top-3 w-6 h-6 rounded-full overflow-hidden border border-white shadow-xs">
                    <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80" alt="team" />
                  </div>
                  <div className="absolute -bottom-3 w-6 h-6 rounded-full overflow-hidden border border-white shadow-xs">
                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&auto=format&fit=crop&q=80" alt="team" />
                  </div>
                  <div className="absolute -left-3 w-6 h-6 rounded-full overflow-hidden border border-white shadow-xs">
                    <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&auto=format&fit=crop&q=80" alt="team" />
                  </div>
                  <div className="absolute -right-3 w-6 h-6 rounded-full overflow-hidden border border-white shadow-xs">
                    <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&auto=format&fit=crop&q=80" alt="team" />
                  </div>
                </div>
              </div>

              <h3 className="text-base font-bold text-gray-900">For teams &amp; agencies</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Isolate client workspaces, collaborate on post drafts, and maintain brand approvals effortlessly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 5. CURVED ARC INTEGRATION CAROUSEL (Video Frame 00:07 - 00:10) ================= */}
      <section id="integrations" className="py-20 px-6 max-w-5xl mx-auto text-center">
        {/* Category Pill */}
        <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center mx-auto mb-3 shadow-2xs">
          <Share2 className="w-5 h-5" />
        </div>

        <h2 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight">
          Integrate with your existing<br />channels in seconds
        </h2>

        <p className="mt-2 text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
          Direct platform APIs with official OAuth authorization. No third-party scrapers, zero security risks.
        </p>

        {/* Curved Arc Layout (Exactly matching Frame 00:07 - 00:10) */}
        <div className="relative pt-16 pb-8 max-w-2xl mx-auto">
          {/* Subtle curved arc baseline */}
          <div className="flex items-center justify-center gap-3 sm:gap-6">
            {INTEGRATION_PLATFORMS.map((platform, idx) => {
              const isActive = idx === activeIntegrationIndex;
              // Calculate subtle vertical arc offset: center items are higher
              const distance = Math.abs(idx - 2);
              const translateY = distance === 0 ? '-translate-y-4 scale-110' : distance === 1 ? '-translate-y-1' : 'translate-y-3 opacity-60';

              return (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => setActiveIntegrationIndex(idx)}
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white border-2 flex items-center justify-center transition-all duration-500 cursor-pointer shadow-sm ${translateY} ${
                    isActive
                      ? 'border-gray-900 ring-4 ring-gray-100 shadow-lg'
                      : 'border-gray-200/80 hover:border-gray-400'
                  }`}
                  title={platform.name}
                >
                  <PlatformLogo platform={platform.id as any} className="w-8 h-8 sm:w-10 sm:h-10" />
                </button>
              );
            })}
          </div>

          {/* Active Platform Information Card */}
          <div className="mt-8 p-6 bg-white rounded-3xl border border-gray-200/80 shadow-xs max-w-md mx-auto transition-all animate-fade-in">
            <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-bold uppercase tracking-wider mb-2">
              <span>{activeIntegration.badge}</span>
            </div>
            <h4 className="text-base font-bold text-gray-900">{activeIntegration.name}</h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              {activeIntegration.subtitle}
            </p>
            <div className="mt-3 text-[11px] font-mono text-emerald-700 font-semibold">
              ✓ {activeIntegration.capabilities}
            </div>
          </div>
        </div>
      </section>

      {/* ================= 6. ENVELOPE TESTIMONIALS SLIDER (Video Frame 00:11 - 00:14) ================= */}
      <section className="py-20 px-6 max-w-4xl mx-auto text-center">
        <h2 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight">
          Words of Appreciation
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
          Thousands of businesses, from startups to enterprises, use PostingTube to schedule and scale social content.
        </p>

        {/* Envelope Container Visual (Frame 00:11 styling) */}
        <div className="relative mt-12 max-w-lg mx-auto">
          {/* Envelope Body / Folded Card Design */}
          <div className="relative bg-white border-2 border-gray-200 rounded-3xl p-6 sm:p-8 shadow-lg text-center transition-all">
            {/* Reviewer Avatar */}
            <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-3 border-2 border-white shadow-md">
              <img
                src={TESTIMONIALS[activeTestimonialIndex].avatar}
                alt={TESTIMONIALS[activeTestimonialIndex].name}
                className="w-full h-full object-cover"
              />
            </div>

            <h4 className="text-sm font-bold text-gray-900">
              {TESTIMONIALS[activeTestimonialIndex].name}
            </h4>
            <p className="text-[11px] text-gray-500">
              {TESTIMONIALS[activeTestimonialIndex].role}
            </p>

            {/* 5.0 Star Rating */}
            <div className="flex items-center justify-center space-x-1 mt-2 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-sm">★</span>
              ))}
              <span className="text-xs font-bold text-gray-700 ml-1">5.0</span>
            </div>

            {/* Quote */}
            <p className="mt-4 text-xs sm:text-sm text-gray-600 leading-relaxed italic">
              &ldquo;{TESTIMONIALS[activeTestimonialIndex].quote}&rdquo;
            </p>

            {/* Envelope Flap Accent Lines */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center space-x-3">
              <button
                type="button"
                onClick={() =>
                  setActiveTestimonialIndex((prev) =>
                    prev === 0 ? TESTIMONIALS.length - 1 : prev - 1
                  )
                }
                className="w-8 h-8 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                title="Previous testimonial"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Indicator dots */}
              <div className="flex items-center space-x-1.5">
                {TESTIMONIALS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTestimonialIndex(i)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      i === activeTestimonialIndex ? 'w-5 bg-gray-900' : 'w-1.5 bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  setActiveTestimonialIndex((prev) => (prev + 1) % TESTIMONIALS.length)
                }
                className="w-8 h-8 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                title="Next testimonial"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 7. TRANSPARENT PRICING SECTION ================= */}
      <section id="pricing" className="py-20 px-6 max-w-6xl mx-auto border-t border-gray-200/80">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
            Simple Pricing
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight">
            Pay only for the channels you publish to
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-2 max-w-md mx-auto">
            Start completely free, scale with Pro at just{' '}
            <strong className="text-gray-900">₹199 per channel / month</strong> with unlimited scheduling.
          </p>

          {/* Currency Switcher */}
          <div className="mt-6 inline-flex items-center space-x-1 bg-gray-100 p-1 rounded-full border border-gray-200 shadow-inner">
            <button
              onClick={() => setPricingCurrency('INR')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                pricingCurrency === 'INR' ? 'bg-white text-gray-950 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              🇮🇳 INR (₹)
            </button>
            <button
              onClick={() => setPricingCurrency('USD')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                pricingCurrency === 'USD' ? 'bg-white text-gray-950 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              🇺🇸 USD ($)
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-5xl mx-auto">
          {/* Plan 1: Free */}
          <div className="lg:col-span-5 p-8 rounded-3xl bg-white border border-gray-200 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-950">Free Plan</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  Starter
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">For creators testing their first multi-channel workflow.</p>
              
              <div className="mt-6 flex items-baseline space-x-1">
                <span className="text-4xl font-extrabold text-gray-900">
                  {pricingCurrency === 'INR' ? '₹0' : '$0'}
                </span>
                <span className="text-xs text-gray-500">/ forever</span>
              </div>

              <div className="mt-8 space-y-3.5 text-xs text-gray-700">
                <div className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-gray-950">Up to 3 connected channels</strong> (YouTube, Instagram, Facebook, X, LinkedIn)
                  </span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-gray-950">5 scheduled posts per channel</strong> (15 scheduled total)
                  </span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>1 user account login</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Basic analytics &amp; post insights</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Core multi-platform publisher</span>
                </div>
              </div>
            </div>

            <Link
              href="/login?mode=signup"
              className="mt-8 w-full py-3.5 rounded-2xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-900 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Plan 2: Pro Plan (Interactive Pay Per Channel) */}
          <div className="lg:col-span-7 p-8 rounded-3xl bg-white border-2 border-emerald-600 flex flex-col justify-between relative shadow-xl">
            <div className="absolute -top-3.5 left-8 px-3.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center space-x-1.5">
              <Sparkles className="w-3 h-3 fill-white" />
              <span>Recommended Pro Plan</span>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-gray-950 flex items-center space-x-2">
                    <span>Pro Plan</span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Pay Per Channel
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Scale from 1 to 100 channels as your reach expands.</p>
                </div>
              </div>

              {/* Price Calculation Box */}
              <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-slate-50 border border-emerald-200/80 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                    Total Monthly Investment
                  </span>
                  <div className="flex items-baseline space-x-1.5 mt-0.5">
                    <span className="text-3xl sm:text-4xl font-black text-gray-950">
                      {pricingCurrency === 'INR' ? '₹' : '$'}
                      {(landingChannelsCount * (pricingCurrency === 'INR' ? 199 : 3)).toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-gray-600">/ month</span>
                  </div>
                  <span className="text-[11px] text-gray-500 block mt-0.5">
                    {pricingCurrency === 'INR' ? '₹199' : '$3.00'} × {landingChannelsCount} {landingChannelsCount === 1 ? 'channel' : 'channels'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-gray-400 block">Billing</span>
                  <span className="text-xs font-bold text-gray-900 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs inline-block mt-0.5">
                    Monthly recurring
                  </span>
                </div>
              </div>

              {/* Interactive Channel Selector */}
              <div className="mt-5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-900">
                    Select Channels: <strong className="text-emerald-700 text-sm">{landingChannelsCount}</strong>
                  </span>
                  <span className="text-gray-400 text-[11px]">Min: 1 • Max: 100</span>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setLandingChannelsCount((c) => Math.max(1, c - 1))}
                    disabled={landingChannelsCount <= 1}
                    className="w-10 h-10 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 text-gray-800 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <Minus className="w-4 h-4 stroke-[2.5]" />
                  </button>

                  <div className="flex-1 text-center font-black text-xl text-gray-950 bg-gray-50 border border-gray-300 rounded-xl py-1.5 shadow-inner">
                    {landingChannelsCount} <span className="text-xs font-normal text-gray-400">channels</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setLandingChannelsCount((c) => Math.min(100, c + 1))}
                    disabled={landingChannelsCount >= 100}
                    className="w-10 h-10 rounded-xl border border-emerald-500 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>

                {/* Quick tiers */}
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 pt-1 text-[11px]">
                  {[1, 3, 5, 10, 25, 50, 100].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setLandingChannelsCount(n)}
                      className={`px-2 py-0.5 rounded-lg font-semibold transition-all cursor-pointer ${
                        landingChannelsCount === n
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {n} ch
                    </button>
                  ))}
                </div>
              </div>

              {/* Feature Checklist */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-gray-700">
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Connect up to {landingChannelsCount} channels</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-gray-950">Unlimited scheduled posts</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Advanced real-time analytics</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Priority publishing engine</span>
                </div>
              </div>
            </div>

            <Link
              href="/pricing"
              className="mt-8 w-full py-3.5 rounded-2xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center space-x-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <span>
                Upgrade to Pro ({pricingCurrency === 'INR' ? '₹' : '$'}
                {(landingChannelsCount * (pricingCurrency === 'INR' ? 199 : 3)).toLocaleString()} / mo)
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ================= 8. FAQ ACCORDION ================= */}
      <section id="faq" className="py-20 px-6 max-w-3xl mx-auto border-t border-gray-200/80">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
            Common Questions
          </span>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {[
            {
              q: 'Do I need to keep my laptop open or browser tab running for posts to publish?',
              a: 'No. PostingTube runs an autonomous background scheduling daemon that continuously monitors scheduled queues every 10 seconds. Once scheduled, your post dispatches deterministically to the target networks on time, even if your device is completely powered down.',
            },
            {
              q: 'How does YouTube, Instagram, and Facebook connection work?',
              a: 'We integrate with official Google YouTube Data API v3 and Meta Graph API v20.0 using OAuth 2.0. In one click, you approve access, and PostingTube discovers all verified YouTube channels, Instagram accounts, and Facebook Pages you manage with official long-lived security tokens.',
            },
            {
              q: 'Are my client workspaces isolated from other accounts?',
              a: 'Yes, 100%. Every user account is bound to a dedicated workspace ID in Supabase PostgreSQL with strict Row-Level Security. Connected credentials, drafts, media, and scheduler queues are completely isolated to guarantee zero cross-tenant leakage.',
            },
            {
              q: 'How does the YouTube custom thumbnail frame extractor work?',
              a: 'When you upload a video in the PostingTube YouTube Studio composer, our client-side video processor extracts timestamped video frames across the video and offers an interactive scrubber so you can choose any exact second of your video as the official thumbnail, or upload your own 16:9 image.',
            },
            {
              q: 'Where are my media attachments and images stored?',
              a: 'Images and videos are stored in dedicated cloud storage with permanent Content-Type headers, ensuring instant previews and flawless delivery to YouTube, Meta, and LinkedIn.',
            },
          ].map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className="rounded-2xl bg-white border border-gray-200/80 overflow-hidden transition-colors shadow-2xs"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full p-5 text-left flex items-center justify-between text-sm font-bold text-gray-900 hover:text-black transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      isOpen ? 'rotate-180 text-black' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= 9. GIANT WATERMARK BRAND FOOTER (Video Frame 00:15 - 00:17) ================= */}
      <footer className="px-6 pb-12 pt-8 max-w-6xl mx-auto">
        <div className="rounded-3xl bg-white border border-gray-200/80 p-8 sm:p-12 shadow-sm relative overflow-hidden">
          {/* Top Row: Brand Info + Nav Columns + Follow Us */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-6 relative z-10">
            {/* Column 1: Brand Statement */}
            <div className="md:col-span-1 space-y-3">
              <PostingTubeLogo size="sm" />
              <p className="text-xs text-gray-500 leading-relaxed">
                PostingTube is the all-in-one social scheduling platform that helps creators and teams build a thriving audience across YouTube, Instagram, Facebook, and LinkedIn.
              </p>
            </div>

            {/* Column 2: Product */}
            <div className="space-y-2 text-xs">
              <p className="font-bold text-gray-900">Product</p>
              <ul className="space-y-1.5 text-gray-500">
                <li><a href="#features" className="hover:text-black transition-colors">YouTube Studio</a></li>
                <li><a href="#features" className="hover:text-black transition-colors">Calendar Queue</a></li>
                <li><a href="#features" className="hover:text-black transition-colors">Frame Extractor</a></li>
                <li><a href="#features" className="hover:text-black transition-colors">Insights &amp; Analytics</a></li>
              </ul>
            </div>

            {/* Column 3: Resources & Pricing */}
            <div className="space-y-2 text-xs">
              <p className="font-bold text-gray-900">Resources</p>
              <ul className="space-y-1.5 text-gray-500">
                <li><a href="#pricing" className="hover:text-black transition-colors">Pricing Plans</a></li>
                <li><a href="#faq" className="hover:text-black transition-colors">Knowledge Base</a></li>
                <li><Link href="/privacy" className="hover:text-black transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-black transition-colors">Terms of Service</Link></li>
              </ul>
            </div>

            {/* Column 4: Follow Us */}
            <div className="space-y-2 text-xs">
              <p className="font-bold text-gray-900">Follow us</p>
              <div className="flex items-center space-x-2 pt-1">
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center transition-colors"
                  title="YouTube"
                >
                  <PlatformLogo platform="youtube" className="w-4 h-4" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center transition-colors"
                  title="Instagram"
                >
                  <PlatformLogo platform="instagram" className="w-4 h-4" />
                </a>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center transition-colors"
                  title="Facebook"
                >
                  <PlatformLogo platform="facebook" className="w-4 h-4" />
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center transition-colors"
                  title="LinkedIn"
                >
                  <PlatformLogo platform="linkedin" className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Watermark Brand Wordmark (Cleanly fitted on one line, scaled & responsive) */}
          <div className="w-full py-4 overflow-hidden pointer-events-none select-none flex items-center justify-center">
            <svg viewBox="0 0 900 110" className="w-full max-w-2xl h-auto opacity-15" aria-hidden="true">
              <text
                x="50%"
                y="50%"
                dominantBaseline="central"
                textAnchor="middle"
                className="font-black text-[84px] fill-red-600 tracking-tight select-none"
              >
                PostingTube
              </text>
            </svg>
          </div>

          {/* Copyright Bottom Bar */}
          <div className="relative z-10 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-400 gap-2">
            <span>&copy; 2026 PostingTube Technologies. All rights reserved.</span>
            <span>All official trademarks belong to their respective platforms.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
