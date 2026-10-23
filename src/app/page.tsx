'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Layers,
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
  Check,
  Play,
  RotateCw,
  Send,
  MessageSquare,
  ThumbsUp,
  Sliders,
  Lock,
  Workflow,
  CheckCircle,
  Eye,
  Plus,
  Compass,
  Video,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { PlatformLogo } from '@/components/SocialIcons';
import { supabase, getGuestUser } from '@/lib/supabase';

// Supported channels for showcase
const SUPPORTED_NETWORKS = [
  { id: 'facebook', name: 'Facebook Pages', badge: 'Meta v20', color: '#1877F2', capabilities: 'Pages • Video Reels • Photos' },
  { id: 'instagram', name: 'Instagram', badge: 'Business & Creator', color: '#E4405F', capabilities: 'Feed • Reels • Stories' },
  { id: 'youtube', name: 'YouTube', badge: 'Shorts API', color: '#FF0000', capabilities: 'Shorts • Long-Form • Thumbnails' },
  { id: 'linkedin', name: 'LinkedIn', badge: 'Company & Profile', color: '#0A66C2', capabilities: 'Articles • Documents • Polls' },
  { id: 'threads', name: 'Threads', badge: 'Official API', color: '#000000', capabilities: 'Carousels • Text • Media' },
  { id: 'pinterest', name: 'Pinterest', badge: 'Pins API', color: '#E60023', capabilities: 'Idea Pins • Rich Pins' },
  { id: 'tiktok', name: 'TikTok', badge: 'Official API', color: '#000000', capabilities: 'Reels • Sounds • Direct Share' },
  { id: 'bluesky', name: 'Bluesky', badge: 'AT Protocol', color: '#0285FF', capabilities: 'Decentralized Feed' },
];

// Mock scheduled calendar items for the interactive showcase
const CALENDAR_EVENTS = [
  { day: 'Mon', time: '09:00 AM', platform: 'instagram', title: 'Product launch reel & story tease', status: 'Published' },
  { day: 'Mon', time: '02:30 PM', platform: 'linkedin', title: 'Deep dive: How we scaled to 10k users', status: 'Published' },
  { day: 'Tue', time: '11:15 AM', platform: 'youtube', title: 'YouTube Short: 3 workflow shortcuts', status: 'Scheduled' },
  { day: 'Wed', time: '10:00 AM', platform: 'facebook', title: 'Community update & customer spotlight', status: 'Scheduled' },
  { day: 'Thu', time: '04:00 PM', platform: 'threads', title: 'Weekly feature breakdown thread (1/6)', status: 'Queued' },
  { day: 'Fri', time: '01:00 PM', platform: 'tiktok', title: 'Behind the scenes: Studio setup tour', status: 'Queued' },
];

export default function LandingPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAnnual, setIsAnnual] = useState(true);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<'composer' | 'calendar' | 'channels'>('composer');

  // Interactive Live Composer Simulator State
  const [simPlatform, setSimPlatform] = useState<'facebook' | 'instagram' | 'youtube' | 'linkedin' | 'threads'>('facebook');
  const [simCaption, setSimCaption] = useState(
    '🚀 Announcing our breakthrough background publishing worker for multi-channel creators. Write once, adapt automatically, and dispatch with sub-second accuracy.'
  );
  const [simAiTone, setSimAiTone] = useState<'punchy' | 'story' | 'bullets'>('punchy');
  const [simIncludeFirstComment, setSimIncludeFirstComment] = useState(true);
  const [simScheduledMinutes, setSimScheduledMinutes] = useState(15);
  const [simSimulatingPublish, setSimSimulatingPublish] = useState(false);
  const [simPublishedSuccess, setSimPublishedSuccess] = useState(false);

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

  const handleSimAiTransform = (tone: 'punchy' | 'story' | 'bullets') => {
    setSimAiTone(tone);
    if (tone === 'punchy') {
      setSimCaption('⚡ The fastest way to publish across 10+ social platforms simultaneously. Zero token headaches. 100% Meta Graph v20 compliant.');
    } else if (tone === 'story') {
      setSimCaption('✨ 3 months ago, our social workflow was fragmented across 6 open tabs. Every morning felt like copy-paste chaos.\n\nToday, everything publishes through a single autonomous bridge with sub-second accuracy.');
    } else {
      setSimCaption('🎯 Why modern creator teams choose PostBridge:\n\n• Sub-second autonomous background scheduler\n• 100% isolated workspaces per client\n• Automatic 9:16 video aspect conversion\n• Smart first-comment hashtag auto-drop');
    }
  };

  const handleTriggerSimPublish = () => {
    setSimSimulatingPublish(true);
    setSimPublishedSuccess(false);
    setTimeout(() => {
      setSimSimulatingPublish(false);
      setSimPublishedSuccess(true);
      setTimeout(() => setSimPublishedSuccess(false), 5000);
    }, 1100);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-gray-900 selection:text-white relative overflow-x-hidden">
      {/* ================= 1. SLEEK ANNOUNCEMENT BANNER ================= */}
      <div className="bg-gray-50 border-b border-gray-100 py-2.5 px-4 text-center">
        <div className="inline-flex items-center space-x-2 text-xs font-medium text-gray-700">
          <span className="px-2 py-0.5 rounded-full bg-black text-white text-[10px] font-bold tracking-wide uppercase">
            New
          </span>
          <span>PostBridge v2.4 released: YouTube Shorts API & Meta Graph v20 support</span>
          <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
        </div>
      </div>

      {/* ================= 2. APPLE-STYLE FROSTED GLASS NAVBAR ================= */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2.5 group cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-base font-bold tracking-tight text-gray-900">
                PostBridge
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                v2.4
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-600">
            <a href="#preview" className="hover:text-black transition-colors">
              Product
            </a>
            <a href="#channels" className="hover:text-black transition-colors">
              Channels
            </a>
            <a href="#features" className="hover:text-black transition-colors">
              Features
            </a>
            <a href="#workflow" className="hover:text-black transition-colors">
              How it works
            </a>
            <a href="#pricing" className="hover:text-black transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-black transition-colors">
              FAQ
            </a>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-3">
            {currentUser ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-full text-xs font-semibold bg-black hover:bg-gray-800 text-white flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 rounded-full text-xs font-medium text-gray-600 hover:text-black transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/login?mode=signup"
                  className="px-4 py-2 rounded-full text-xs font-semibold bg-black hover:bg-gray-800 text-white flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <span>Start Free</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ================= 3. HERO SECTION (APPLE STYLE CLEAN WHITE) ================= */}
      <section className="pt-20 pb-16 px-6 max-w-5xl mx-auto text-center">
        {/* Subtle Pill Badge */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-gray-800 text-xs font-medium mb-6 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Cross-posting & Social Scheduling Engine</span>
          <span className="text-gray-300">•</span>
          <span className="text-gray-500 font-mono text-[11px]">Official APIs Only</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 leading-[1.08]">
          Post once.<br />
          <span className="text-gray-900">Reach everywhere.</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          The all-in-one cross-posting platform built for founders, creators, and agencies.
          Schedule and adapt your posts for Instagram, YouTube, Facebook, LinkedIn, TikTok, and X in seconds.
        </p>

        {/* CTA Group */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Link
            href="/login"
            className="w-full sm:w-auto px-7 py-3.5 rounded-full text-sm font-semibold bg-black hover:bg-gray-800 text-white flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all cursor-pointer group"
          >
            <span>Start for free</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>

          <a
            href="#preview"
            className="w-full sm:w-auto px-6 py-3.5 rounded-full text-sm font-medium bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-2xs"
          >
            <Play className="w-3.5 h-3.5 text-gray-900 fill-gray-900" />
            <span>Try the interactive demo</span>
          </a>
        </div>

        {/* Trust Badges */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>No credit card required</span>
          </span>
          <span className="hidden sm:inline text-gray-300">•</span>
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>1-Click Meta & YouTube OAuth</span>
          </span>
          <span className="hidden sm:inline text-gray-300">•</span>
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% Isolated client workspaces</span>
          </span>
        </div>
      </section>

      {/* ================= 4. CONNECTED PLATFORMS STRIP ================= */}
      <section className="py-6 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-4">
          <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
            Directly integrates with the world&apos;s leading platforms
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          {SUPPORTED_NETWORKS.map((network) => (
            <div
              key={network.id}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gray-50/80 hover:bg-gray-100 border border-gray-200/80 transition-colors cursor-default"
            >
              <PlatformLogo platform={network.id as any} className="w-4 h-4" />
              <span className="text-xs font-semibold text-gray-800">{network.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ================= 5. INTERACTIVE PRODUCT SHOWCASE (MOCKUP WINDOW) ================= */}
      <section id="preview" className="py-16 px-6 max-w-6xl mx-auto">
        {/* Apple Style Window Frame */}
        <div className="rounded-3xl border border-gray-200/90 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-hidden">
          {/* macOS Title Bar */}
          <div className="bg-gray-50/90 border-b border-gray-200/80 px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-red-400"></span>
              <span className="w-3 h-3 rounded-full bg-amber-400"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
              <span className="text-xs font-mono text-gray-400 ml-3 hidden sm:inline">
                https://app.postbridge.ai
              </span>
            </div>

            {/* Window Mode Switcher Tabs */}
            <div className="flex items-center space-x-1 bg-gray-200/60 p-1 rounded-xl">
              <button
                onClick={() => setActiveShowcaseTab('composer')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeShowcaseTab === 'composer'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Interactive Composer
              </button>
              <button
                onClick={() => setActiveShowcaseTab('calendar')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeShowcaseTab === 'calendar'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Calendar View
              </button>
              <button
                onClick={() => setActiveShowcaseTab('channels')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeShowcaseTab === 'channels'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Channel Hub
              </button>
            </div>
          </div>

          {/* TAB 1: INTERACTIVE COMPOSER */}
          {activeShowcaseTab === 'composer' && (
            <div className="p-6 sm:p-8 bg-white">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Composer Controls */}
                <div className="lg:col-span-7 space-y-5">
                  {/* Channel Target Selector */}
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-2">
                      Select Target Preview Network:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(['facebook', 'instagram', 'youtube', 'linkedin', 'threads'] as const).map((plat) => (
                        <button
                          key={plat}
                          onClick={() => setSimPlatform(plat)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize flex items-center space-x-1.5 transition-all cursor-pointer border ${
                            simPlatform === plat
                              ? 'bg-black text-white border-black shadow-xs'
                              : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          <PlatformLogo platform={plat} className="w-3.5 h-3.5" />
                          <span>{plat}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Caption & AI Tone */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-gray-700">Master Caption</label>
                      <div className="flex items-center space-x-1 text-xs">
                        <span className="text-gray-600 mr-1 flex items-center space-x-1">
                          <Sparkles className="w-3 h-3 text-blue-600" />
                          <span>AI Tone:</span>
                        </span>
                        {(['punchy', 'story', 'bullets'] as const).map((tone) => (
                          <button
                            key={tone}
                            onClick={() => handleSimAiTransform(tone)}
                            className={`px-2 py-0.5 rounded-md capitalize text-[11px] font-medium transition-colors cursor-pointer ${
                              simAiTone === tone
                                ? 'bg-gray-900 text-white font-semibold'
                                : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            {tone}
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      rows={5}
                      value={simCaption}
                      onChange={(e) => setSimCaption(e.target.value)}
                      className="w-full text-xs sm:text-sm p-4 rounded-2xl bg-gray-50/50 border border-gray-200 text-gray-900 focus:outline-hidden focus:border-black focus:ring-1 focus:ring-black leading-relaxed font-sans resize-none transition-colors"
                      placeholder="Draft your post..."
                    />
                    <div className="flex justify-between items-center text-[11px] text-gray-600 mt-1">
                      <span>Syncs across all selected channels automatically</span>
                      <span>{simCaption.length} chars</span>
                    </div>
                  </div>

                  {/* Automation & Scheduler Toggles */}
                  <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-200/80">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                        <div>
                          <span className="font-semibold text-gray-900">Auto First-Comment Drop</span>
                          <p className="text-[11px] text-gray-500">Separates links and hashtags into comment #1 for maximum organic reach.</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={simIncludeFirstComment}
                        onChange={(e) => setSimIncludeFirstComment(e.target.checked)}
                        className="accent-black w-4 h-4 cursor-pointer"
                      />
                    </div>

                    <div className="pt-3 border-t border-gray-200/60 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-emerald-600" />
                        <div>
                          <span className="font-semibold text-gray-900">Queue & Dispatch Time</span>
                          <p className="text-[11px] text-gray-500">Autonomous background worker executes deterministically.</p>
                        </div>
                      </div>
                      <select
                        value={simScheduledMinutes}
                        onChange={(e) => setSimScheduledMinutes(Number(e.target.value))}
                        className="bg-white border border-gray-200 text-gray-800 text-xs px-2.5 py-1 rounded-lg cursor-pointer"
                      >
                        <option value={0}>Publish Right Now</option>
                        <option value={15}>In 15 minutes</option>
                        <option value={60}>In 1 hour</option>
                        <option value={1440}>Tomorrow morning (9:00 AM)</option>
                      </select>
                    </div>
                  </div>

                  {/* Dispatch Action */}
                  <div className="pt-1">
                    <button
                      onClick={handleTriggerSimPublish}
                      disabled={simSimulatingPublish}
                      className="w-full py-3.5 px-4 rounded-xl font-bold bg-black hover:bg-gray-800 active:bg-gray-900 text-white flex items-center justify-center space-x-2 text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      {simSimulatingPublish ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin text-white" />
                          <span>Dispatching to {simPlatform.toUpperCase()} API...</span>
                        </>
                      ) : simPublishedSuccess ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 stroke-[3]" />
                          <span>Published Successfully! (HTTP 200 via Official API)</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Schedule Across Connected Channels</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Right Column: Platform-Accurate Live Preview Card */}
                <div className="lg:col-span-5 flex flex-col justify-center">
                  <div className="bg-gray-50/80 border border-gray-200 rounded-2xl p-5 shadow-xs">
                    {/* Channel Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-200/80">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 rounded-full bg-black text-white font-bold flex items-center justify-center text-xs">
                          PB
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900 flex items-center space-x-1">
                            <span>Acme Studio</span>
                            <PlatformLogo platform={simPlatform} className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-[10px] text-gray-600">Just now • Published via PostBridge</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Live Preview
                      </span>
                    </div>

                    {/* Preview Text */}
                    <div className="py-4 text-xs text-gray-800 whitespace-pre-line leading-relaxed min-h-[90px]">
                      {simCaption || 'Drafting post...'}
                    </div>

                    {/* Auto First Comment Preview */}
                    {simIncludeFirstComment && (
                      <div className="mt-2 p-2.5 rounded-xl bg-white border border-gray-200 text-[11px] text-gray-600">
                        <span className="font-bold text-gray-900 mr-1.5">First Comment (Auto):</span>
                        <span>🔗 https://postbridge.ai/launch #marketing #creators #saas</span>
                      </div>
                    )}

                    {/* Channel Footer Actions */}
                    <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-600">
                      <span className="flex items-center space-x-1">
                        <ThumbsUp className="w-3 h-3" />
                        <span>0 Likes</span>
                      </span>
                      <span>0 Comments</span>
                      <span>0 Shares</span>
                    </div>
                  </div>

                  <div className="mt-3 text-center">
                    <span className="text-[11px] text-gray-600">
                      Format rules, character limitations, and aspect ratios adapt automatically.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CALENDAR VIEW */}
          {activeShowcaseTab === 'calendar' && (
            <div className="p-6 sm:p-8 bg-white">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Weekly Scheduled Queue</h3>
                  <p className="text-xs text-gray-500">Autonomous worker dispatches posts even when your computer is off.</p>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                    6 Posts in Queue
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {CALENDAR_EVENTS.map((event, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <PlatformLogo platform={event.platform as any} className="w-4 h-4" />
                        <span className="text-xs font-bold text-gray-800 capitalize">{event.platform}</span>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          event.status === 'Published'
                            ? 'bg-emerald-100 text-emerald-800'
                            : event.status === 'Scheduled'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        {event.status}
                      </span>
                    </div>

                    <p className="text-xs text-gray-700 font-medium mb-3 line-clamp-2">{event.title}</p>

                    <div className="flex items-center space-x-2 text-[11px] text-gray-600 pt-2 border-t border-gray-200/60">
                      <Calendar className="w-3 h-3 text-gray-600" />
                      <span>{event.day}</span>
                      <span>•</span>
                      <Clock className="w-3 h-3 text-gray-600" />
                      <span>{event.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: CONNECTED CHANNELS HUB */}
          {activeShowcaseTab === 'channels' && (
            <div className="p-6 sm:p-8 bg-white">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Connected Social Accounts</h3>
                  <p className="text-xs text-gray-500">Official OAuth credentials with automatic token refreshes.</p>
                </div>
                <button className="px-3 py-1.5 rounded-xl bg-black text-white text-xs font-semibold flex items-center space-x-1">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Connect Account</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <PlatformLogo platform="facebook" className="w-6 h-6" />
                    <div>
                      <div className="text-xs font-bold text-gray-900">Acme Corporation (Facebook Page)</div>
                      <div className="text-[11px] text-gray-500">Meta Graph API v20.0 • Verified Page</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Connected
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <PlatformLogo platform="instagram" className="w-6 h-6" />
                    <div>
                      <div className="text-xs font-bold text-gray-900">@acmestudio (Instagram Creator)</div>
                      <div className="text-[11px] text-gray-500">Reels & Carousels Enabled</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Connected
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <PlatformLogo platform="youtube" className="w-6 h-6" />
                    <div>
                      <div className="text-xs font-bold text-gray-900">Acme Tech (YouTube Shorts)</div>
                      <div className="text-[11px] text-gray-500">Google OAuth 2.0 • 1080p Support</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Connected
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <PlatformLogo platform="linkedin" className="w-6 h-6" />
                    <div>
                      <div className="text-xs font-bold text-gray-900">Acme Global (LinkedIn Organization)</div>
                      <div className="text-[11px] text-gray-500">Official Community Management API</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Connected
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ================= 6. THE 4 BENTO GRID PILLARS (APPLE STYLE) ================= */}
      <section id="features" className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-2">
            Engineered for Creators & Agencies
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Everything you need to automate your social footprint
          </h2>
          <p className="text-sm text-gray-600 mt-2 max-w-xl mx-auto">
            Zero third-party scrapers. Zero token headaches. 100% compliant with official platform policies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1 */}
          <div className="p-8 rounded-3xl bg-gray-50 border border-gray-200/80 hover:border-gray-300 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center mb-6">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Autonomous 10-Second Scheduler Daemon</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
                Never worry about keeping your browser tab open. The PostBridge background worker checks queue status continuously, dispatches due posts directly to official APIs, and records delivery audits.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200/80 flex items-center space-x-2 text-xs font-semibold text-emerald-700">
              <CheckCircle className="w-4 h-4" />
              <span>Runs 24/7 even with laptop shut</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-8 rounded-3xl bg-gray-50 border border-gray-200/80 hover:border-gray-300 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center mb-6">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Deep Multi-Tenant Isolation</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
                Every user gets a dedicated workspace in Supabase PostgreSQL with strict Row-Level Security. Connected accounts, scheduled posts, and media are partition-scoped to guarantee zero cross-client leakage.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200/80 flex items-center space-x-2 text-xs font-semibold text-blue-700">
              <Lock className="w-4 h-4" />
              <span>100% Agency workspace separation</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-8 rounded-3xl bg-gray-50 border border-gray-200/80 hover:border-gray-300 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center mb-6">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Platform-Adaptive Formatting</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
                Say goodbye to broken video aspect ratios or failed image uploads. PostBridge validates file constraints, conforms 9:16 reels for Facebook and Instagram, and formats caption breaks for maximum organic readability.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200/80 flex items-center space-x-2 text-xs font-semibold text-gray-900">
              <CheckCircle className="w-4 h-4" />
              <span>Auto 9:16 Video & 1:1 Image conformation</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-8 rounded-3xl bg-gray-50 border border-gray-200/80 hover:border-gray-300 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center mb-6">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Smart First-Comment Link Pinning</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
                Keep your post copy clean and uncluttered. PostBridge automatically posts your promotional links and hashtag clusters into the very first comment as soon as the main post publishes.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200/80 flex items-center space-x-2 text-xs font-semibold text-gray-900">
              <CheckCircle className="w-4 h-4" />
              <span>Increases organic social reach by up to 35%</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 7. THREE-STEP WORKFLOW ================= */}
      <section id="workflow" className="py-20 px-6 max-w-6xl mx-auto border-t border-gray-100">
        <div className="text-center mb-16">
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-2">
            Streamlined Setup
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Publishing made effortless in 3 steps
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-7 rounded-3xl bg-gray-50 border border-gray-200/80 relative">
            <div className="text-4xl font-black text-gray-300 font-mono mb-4">
              01
            </div>
            <h3 className="text-base font-bold text-gray-900">Connect Your Social Channels</h3>
            <p className="text-xs text-gray-600 mt-2 leading-relaxed">
              Authenticate directly via official OAuth. PostBridge automatically discovers all Facebook Pages, Instagram, and YouTube channels you manage with zero manual token handling.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-gray-50 border border-gray-200/80 relative">
            <div className="text-4xl font-black text-gray-300 font-mono mb-4">
              02
            </div>
            <h3 className="text-base font-bold text-gray-900">Compose & AI Transform</h3>
            <p className="text-xs text-gray-600 mt-2 leading-relaxed">
              Draft your main post in the unified composer. Use one-click AI tones to tailor hooks, bullet lists, and auto-format media for each target network.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-gray-50 border border-gray-200/80 relative">
            <div className="text-4xl font-black text-gray-300 font-mono mb-4">
              03
            </div>
            <h3 className="text-base font-bold text-gray-900">Schedule & Relax</h3>
            <p className="text-xs text-gray-600 mt-2 leading-relaxed">
              Hit Schedule or Publish Now. The PostBridge autonomous background worker handles timing, retry queues, idempotency, and live delivery validation automatically.
            </p>
          </div>
        </div>
      </section>

      {/* ================= 8. TRANSPARENT PRICING ================= */}
      <section id="pricing" className="py-20 px-6 max-w-6xl mx-auto border-t border-gray-100">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-2">
            Simple Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Fair, predictable plans for creators and brands
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-2 max-w-md mx-auto">
            Start completely free, upgrade as your social channels grow.
          </p>

          {/* Billing Switch */}
          <div className="mt-8 inline-flex items-center space-x-2 bg-gray-100 p-1 rounded-full border border-gray-200">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                !isAnnual ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Monthly billing
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                isAnnual ? 'bg-black text-white shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <span>Annual</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-bold">Save 25%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Tier 1: Free */}
          <div className="p-8 rounded-3xl bg-gray-50 border border-gray-200/80 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">Free Starter</h3>
              <p className="text-xs text-gray-500 mt-1">For creators testing their first multi-channel workflow.</p>
              <div className="mt-6 flex items-baseline space-x-1">
                <span className="text-4xl font-extrabold text-gray-900">$0</span>
                <span className="text-xs text-gray-500">/ forever</span>
              </div>

              <div className="mt-8 space-y-3 text-xs text-gray-700">
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>3 Connected Social Accounts</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>30 Scheduled Posts per month</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Direct Facebook Page Publishing</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Multi-Tenant Isolated Workspace</span>
                </div>
              </div>
            </div>

            <Link
              href="/login?mode=signup"
              className="mt-8 w-full py-3 rounded-full text-xs font-semibold bg-white hover:bg-gray-100 text-gray-900 border border-gray-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              Get Started Free
            </Link>
          </div>

          {/* Tier 2: Creator Pro (Featured) */}
          <div className="p-8 rounded-3xl bg-white border-2 border-black flex flex-col justify-between relative shadow-lg">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-black text-white text-[10px] font-bold uppercase tracking-wider">
              Most Popular
            </div>

            <div>
              <h3 className="text-base font-bold text-gray-900">Creator Pro</h3>
              <p className="text-xs text-gray-500 mt-1">For active creators, podcasts, and digital businesses.</p>
              <div className="mt-6 flex items-baseline space-x-1">
                <span className="text-4xl font-extrabold text-gray-900">
                  {isAnnual ? '$22' : '$29'}
                </span>
                <span className="text-xs text-gray-500">/ month</span>
              </div>

              <div className="mt-8 space-y-3 text-xs text-gray-700">
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>10 Connected Social Accounts</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Unlimited Scheduled Posts</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Autonomous 10s Scheduler Daemon</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>AI Hook & Tone Assistant</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Auto First-Comment Link Drop</span>
                </div>
              </div>
            </div>

            <Link
              href="/login?mode=signup"
              className="mt-8 w-full py-3 rounded-full text-xs font-semibold bg-black hover:bg-gray-800 text-white flex items-center justify-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            >
              <span>Start 14-Day Free Trial</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Tier 3: Agency Scale */}
          <div className="p-8 rounded-3xl bg-gray-50 border border-gray-200/80 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">Agency Scale</h3>
              <p className="text-xs text-gray-500 mt-1">For marketing agencies managing multiple brands.</p>
              <div className="mt-6 flex items-baseline space-x-1">
                <span className="text-4xl font-extrabold text-gray-900">
                  {isAnnual ? '$59' : '$79'}
                </span>
                <span className="text-xs text-gray-500">/ month</span>
              </div>

              <div className="mt-8 space-y-3 text-xs text-gray-700">
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Unlimited Accounts & Workspaces</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Client-Level Data Partitioning</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Custom Webhooks & REST API</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Priority 24/7 SLA Support</span>
                </div>
              </div>
            </div>

            <Link
              href="/login?mode=signup"
              className="mt-8 w-full py-3 rounded-full text-xs font-semibold bg-white hover:bg-gray-100 text-gray-900 border border-gray-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* ================= 9. FAQ ACCORDION ================= */}
      <section id="faq" className="py-20 px-6 max-w-3xl mx-auto border-t border-gray-100">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-2">
            Common Questions
          </span>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {[
            {
              q: 'Do I need to keep my laptop open or browser tab running for posts to publish?',
              a: 'No. PostBridge runs an autonomous background scheduling daemon that continuously monitors scheduled queues every 10 seconds. Once scheduled, your post dispatches deterministically to the target networks on time, even if your device is completely powered down.',
            },
            {
              q: 'How does Facebook and Instagram connection work?',
              a: 'We integrate with the official Meta Graph API v20.0 using OAuth 2.0. In one click, you approve access, and PostBridge discovers all verified Facebook Pages and Instagram accounts you manage with official long-lived security tokens.',
            },
            {
              q: 'Are my client workspaces isolated from other accounts?',
              a: 'Yes, 100%. Every user account is bound to a dedicated workspace ID in Supabase PostgreSQL with strict Row-Level Security. Connected credentials, drafts, media, and scheduler queues are completely isolated to guarantee zero cross-tenant leakage.',
            },
            {
              q: 'Can I publish to Facebook Groups?',
              a: 'Meta deprecated direct third-party API posting to Facebook Groups in Graph API v19+. In compliance with official Meta developer policies, PostBridge focuses exclusively on Facebook Pages (businesses, creators, public figures) where full automated posting is supported.',
            },
            {
              q: 'Where are my media attachments and images stored?',
              a: 'Images and videos are stored in dedicated cloud storage with permanent Content-Type headers, ensuring instant previews and flawless delivery to Meta and other social platforms.',
            },
          ].map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className="rounded-2xl bg-gray-50 border border-gray-200/80 overflow-hidden transition-colors"
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
                  <div className="px-5 pb-5 text-xs text-gray-600 leading-relaxed border-t border-gray-200/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= 10. CONVERSION CTA BANNER ================= */}
      <section className="py-20 px-6 max-w-6xl mx-auto border-t border-gray-100">
        <div className="p-10 sm:p-16 rounded-3xl bg-gray-900 text-white text-center shadow-xl">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-gray-800 text-gray-300 text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Launch Your Workspace in 30 Seconds</span>
          </span>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight max-w-2xl mx-auto leading-tight">
            Ready to automate your cross-posting workflow?
          </h2>

          <p className="mt-4 text-xs sm:text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">
            Join thousands of creators and growth marketing teams publishing deterministically to Facebook, Instagram, YouTube, and X.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/login?mode=signup"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-semibold bg-white hover:bg-gray-100 text-gray-900 flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto px-6 py-3.5 rounded-full text-sm font-medium bg-gray-800 hover:bg-gray-700 text-gray-200 flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <span>Sign in with Google</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ================= 11. APPLE-STYLE CLEAN FOOTER ================= */}
      <footer className="px-6 py-12 max-w-6xl mx-auto border-t border-gray-100 text-xs text-gray-500 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 rounded-md bg-black flex items-center justify-center text-white font-bold text-xs">
            PB
          </div>
          <span className="font-bold text-gray-900 text-sm">PostBridge</span>
          <span>•</span>
          <span>Autonomous Multi-Platform Publishing Engine</span>
        </div>

        <div className="flex items-center space-x-6 text-gray-600">
          <a href="#preview" className="hover:text-black transition-colors">
            Interactive Engine
          </a>
          <a href="#channels" className="hover:text-black transition-colors">
            Channels
          </a>
          <a href="#pricing" className="hover:text-black transition-colors">
            Pricing
          </a>
          <Link href="/login" className="hover:text-black transition-colors">
            Sign In
          </Link>
          <a
            href="https://developers.facebook.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-black transition-colors"
          >
            Meta Graph API
          </a>
        </div>

        <div>
          &copy; 2026 PostBridge Technologies Inc. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
