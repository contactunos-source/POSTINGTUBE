'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Check,
  RefreshCw,
  Copy,
  Scissors,
  Plus,
  Hash,
  Tag,
  MessageSquare,
  Globe,
  Sliders,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  generateSocialContent,
  AiObjective,
  AiAudience,
  AiTone,
  AiFormat,
  AiGeneratedResult,
} from '@/lib/ai';
import { SocialPlatform } from '@/types/social';
import { PlatformLogo } from './SocialIcons';

export interface AiApplyPayload {
  title?: string;
  caption: string;
  hashtags?: string[];
  tags?: string[];
  cta?: string;
  platform?: SocialPlatform;
}

interface AiAssistantModalProps {
  initialPrompt?: string;
  initialTitle?: string;
  initialPlatform?: SocialPlatform;
  onInsert: (result: AiApplyPayload | string) => void;
  onClose: () => void;
}

const PLATFORM_NAMES: Record<SocialPlatform, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  facebook: 'Facebook',
  twitter: 'X (Twitter)',
  linkedin: 'LinkedIn',
  threads: 'Threads',
  pinterest: 'Pinterest',
  tiktok: 'TikTok',
  bluesky: 'Bluesky',
};

const LANGUAGES = [
  { code: 'en', name: 'English (US)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'pt', name: 'Portuguese (Português)' },
  { code: 'hi', name: 'Hindi (हिंदी)' },
  { code: 'ja', name: 'Japanese (日本語)' },
];

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  initialPrompt = '',
  initialTitle = '',
  initialPlatform = 'instagram',
  onInsert,
  onClose,
}) => {
  // Input Controls
  const [prompt, setPrompt] = useState(
    initialPrompt || 'Announce the launch of our new social media scheduling feature that saves creators hours every week'
  );
  const [platform, setPlatform] = useState<SocialPlatform>(initialPlatform);
  const [objective, setObjective] = useState<AiObjective>('engagement');
  const [audience, setAudience] = useState<AiAudience>('creators');
  const [tone, setTone] = useState<AiTone>('engaging');
  const [format, setFormat] = useState<AiFormat>('feed');
  const [language, setLanguage] = useState<string>('en');

  // Advanced context (collapsible)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [keywords, setKeywords] = useState('');
  const [productContext, setProductContext] = useState('');
  const [customCta, setCustomCta] = useState('');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Editable Output State
  const [editableTitle, setEditableTitle] = useState(initialTitle || '');
  const [editableHook, setEditableHook] = useState('');
  const [editableCaption, setEditableCaption] = useState('');
  const [editableCta, setEditableCta] = useState('');
  const [activeHashtags, setActiveHashtags] = useState<string[]>([]);
  const [activeKeywords, setActiveKeywords] = useState<string[]>([]);
  const [threadSuggestions, setThreadSuggestions] = useState<string[]>([]);
  const [variations, setVariations] = useState<string[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Execute AI generation
  const handleGenerate = async (
    action: 'generate' | 'shorter' | 'longer' | 'tone' | 'regenerate' = 'generate',
    overrideTone?: AiTone
  ) => {
    if (!prompt.trim()) return;
    setIsGenerating(true);

    try {
      const activeTone = overrideTone || tone;
      const result: AiGeneratedResult = await generateSocialContent({
        prompt,
        platform,
        objective,
        audience,
        tone: activeTone,
        format,
        language,
        keywords,
        productContext,
        customCta,
        action,
      });

      if (result.title) setEditableTitle(result.title);
      setEditableHook(result.hook || '');
      setEditableCaption(result.caption || '');
      setEditableCta(result.cta || '');
      setActiveHashtags(result.hashtags || []);
      setActiveKeywords(result.keywords || []);
      setThreadSuggestions(result.threadSuggestions || []);
      setVariations(result.variations || []);
      setHasGenerated(true);
    } catch (err) {
      console.error('Failed to generate AI content:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Initial trigger if prompt was passed
  useEffect(() => {
    if (initialPrompt && !hasGenerated) {
      handleGenerate('generate');
    }
  }, []);

  // Copy helper with visual feedback
  const handleCopy = (text: string, fieldName: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // Toggle hashtag inclusion
  const toggleHashtag = (tag: string) => {
    setActiveHashtags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Apply to post
  const handleApply = () => {
    // Build combined caption text
    let finalCaption = editableCaption.trim();

    // If hashtags are present and not already inside the caption text, append them
    if (activeHashtags.length > 0) {
      const tagsString = activeHashtags.join(' ');
      if (!finalCaption.includes(activeHashtags[0])) {
        finalCaption = `${finalCaption}\n\n${tagsString}`;
      }
    }

    onInsert({
      title: editableTitle.trim() || undefined,
      caption: finalCaption,
      hashtags: activeHashtags,
      tags: activeKeywords,
      cta: editableCta.trim() || undefined,
      platform,
    });
  };

  // Character counter for Twitter or general
  const charLimit = platform === 'twitter' ? 280 : 2200;
  const isOverLimit = editableCaption.length > charLimit;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 font-sans animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-5xl w-full h-[92vh] max-h-[850px] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-gray-900">AI Social Assistant</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 flex items-center space-x-1">
                  <PlatformLogo platform={platform} className="w-3 h-3" />
                  <span>{PLATFORM_NAMES[platform]}</span>
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Generate platform-tailored hooks, captions, SEO tags, and CTAs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column Responsive Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-hidden">
          {/* LEFT COLUMN: Input Controls */}
          <div className="lg:col-span-5 border-r border-gray-100 p-5 overflow-y-auto space-y-4 bg-gray-50/40">
            {/* Primary Prompt Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800 flex items-center justify-between">
                <span>What do you want to post about?</span>
                <span className="text-[11px] text-gray-400 font-normal">Primary Prompt</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="E.g., Announce our new AI assistant feature with early access discount..."
                className="w-full text-xs p-3 rounded-xl border border-gray-200/90 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white placeholder:text-gray-400 leading-relaxed resize-none shadow-2xs"
              />

              {/* Sample Prompt Starters */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px]">
                <span className="text-gray-400 shrink-0">Try:</span>
                <button
                  type="button"
                  onClick={() =>
                    setPrompt('Top 3 mistakes creators make when scheduling content across multiple channels')
                  }
                  className="px-2 py-0.5 rounded-lg bg-white border border-gray-200 hover:border-emerald-400 text-gray-600 hover:text-emerald-700 truncate cursor-pointer transition-colors"
                >
                  💡 3 Mistakes
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPrompt('Announcing our brand new 2.0 release with real-time multi-platform publishing')
                  }
                  className="px-2 py-0.5 rounded-lg bg-white border border-gray-200 hover:border-emerald-400 text-gray-600 hover:text-emerald-700 truncate cursor-pointer transition-colors"
                >
                  🚀 Product Launch
                </button>
              </div>
            </div>

            {/* Target Platform Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800 block">Target Platform</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['youtube', 'instagram', 'facebook', 'twitter', 'linkedin', 'threads'] as SocialPlatform[]).map(
                  (plat) => {
                    const isSelected = platform === plat;
                    return (
                      <button
                        key={plat}
                        type="button"
                        onClick={() => setPlatform(plat)}
                        className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/80 border-emerald-500 text-emerald-900 shadow-2xs'
                            : 'bg-white border-gray-200/80 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <PlatformLogo platform={plat} className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{PLATFORM_NAMES[plat]}</span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Grid of Key Strategy Selectors */}
            <div className="grid grid-cols-2 gap-3">
              {/* Content Objective */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 block">Content Objective</label>
                <select
                  value={objective}
                  onChange={(e) => setObjective(e.target.value as AiObjective)}
                  className="w-full text-xs p-2 rounded-xl border border-gray-200 bg-white focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                >
                  <option value="engagement">💬 Drive Engagement</option>
                  <option value="promote">🚀 Promote a Product</option>
                  <option value="tip">💡 Share a Pro Tip</option>
                  <option value="story">📖 Tell a Story</option>
                  <option value="question">❓ Ask a Question</option>
                  <option value="news">📢 Announce News</option>
                </select>
              </div>

              {/* Target Audience */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 block">Target Audience</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as AiAudience)}
                  className="w-full text-xs p-2 rounded-xl border border-gray-200 bg-white focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                >
                  <option value="creators">Creators & Marketers</option>
                  <option value="founders">Founders & Startups</option>
                  <option value="developers">Developers & Tech</option>
                  <option value="consumers">Consumers & Buyers</option>
                  <option value="general">General Audience</option>
                </select>
              </div>

              {/* Voice and Tone */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 block">Voice & Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as AiTone)}
                  className="w-full text-xs p-2 rounded-xl border border-gray-200 bg-white focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                >
                  <option value="engaging">✨ Engaging & Friendly</option>
                  <option value="bold">⚡ Bold & Disruptive</option>
                  <option value="professional">👔 Professional & Authoritative</option>
                  <option value="humorous">😄 Humorous & Playful</option>
                  <option value="informative">📚 Informative & Educational</option>
                  <option value="concise">🎯 Concise & Direct</option>
                </select>
              </div>

              {/* Content Format */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 block">Content Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as AiFormat)}
                  className="w-full text-xs p-2 rounded-xl border border-gray-200 bg-white focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                >
                  <option value="feed">Standard Feed Post</option>
                  <option value="reel_short">Reel / Short Script</option>
                  <option value="long_form">Long-Form Story</option>
                  <option value="carousel">Carousel Breakdown</option>
                  <option value="thread">Thread Series</option>
                </select>
              </div>
            </div>

            {/* Language Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-700 flex items-center space-x-1">
                <Globe className="w-3 h-3 text-gray-400" />
                <span>Language</span>
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-gray-200 bg-white focus:outline-hidden focus:border-emerald-500 cursor-pointer"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Collapsible Advanced Context (Keywords, Product, CTA) */}
            <div className="border border-gray-200/80 rounded-xl bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <span className="flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5 text-gray-400" />
                  <span>Advanced Context (Keywords, Brand, CTA)</span>
                </span>
                {showAdvanced ? (
                  <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                )}
              </button>

              {showAdvanced && (
                <div className="p-3 border-t border-gray-100 space-y-3 bg-gray-50/30 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block mb-1">
                      Target Keywords (SEO / Search)
                    </label>
                    <input
                      type="text"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder="e.g., saas, productivity, automation, nextjs"
                      className="w-full text-xs p-2 rounded-lg border border-gray-200 bg-white focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block mb-1">
                      Product or Brand Context
                    </label>
                    <input
                      type="text"
                      value={productContext}
                      onChange={(e) => setProductContext(e.target.value)}
                      placeholder="e.g., PostBridge SaaS - cross-post to 6 platforms with one click"
                      className="w-full text-xs p-2 rounded-lg border border-gray-200 bg-white focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block mb-1">
                      Custom Call to Action
                    </label>
                    <input
                      type="text"
                      value={customCta}
                      onChange={(e) => setCustomCta(e.target.value)}
                      placeholder="e.g., Click the link in bio to try our free trial today!"
                      className="w-full text-xs p-2 rounded-lg border border-gray-200 bg-white focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Primary Generate Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleGenerate('generate')}
                disabled={isGenerating || !prompt.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.99] text-white text-xs font-bold shadow-md shadow-emerald-600/15 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-100" />
                    <span>Crafting High-Converting Copy...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-200" />
                    <span>Generate Platform Content</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Structured Workspace */}
          <div className="lg:col-span-7 flex flex-col min-h-0 bg-white">
            {/* Top Toolbar: Iterative Refinements */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2 bg-gray-50/50 shrink-0">
              <div className="flex items-center space-x-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mr-1">
                  Refine:
                </span>
                <button
                  type="button"
                  onClick={() => handleGenerate('regenerate')}
                  disabled={isGenerating || !hasGenerated}
                  className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold text-xs flex items-center space-x-1 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                  title="Regenerate from fresh angle"
                >
                  <RefreshCw className="w-3 h-3 text-gray-500" />
                  <span>Regenerate</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGenerate('shorter')}
                  disabled={isGenerating || !hasGenerated}
                  className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold text-xs flex items-center space-x-1 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                  title="Make copy more concise"
                >
                  <Scissors className="w-3 h-3 text-amber-600" />
                  <span>Make Shorter</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGenerate('longer')}
                  disabled={isGenerating || !hasGenerated}
                  className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold text-xs flex items-center space-x-1 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                  title="Expand with more detail and examples"
                >
                  <Plus className="w-3 h-3 text-blue-600" />
                  <span>Make Longer</span>
                </button>

                {/* Quick Tone Switcher */}
                <select
                  disabled={isGenerating || !hasGenerated}
                  onChange={(e) => {
                    const newTone = e.target.value as AiTone;
                    setTone(newTone);
                    handleGenerate('tone', newTone);
                  }}
                  value={tone}
                  className="px-2 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 font-semibold text-xs cursor-pointer shadow-2xs disabled:opacity-40 focus:outline-hidden"
                >
                  <option value="engaging">Tone: Engaging</option>
                  <option value="bold">Tone: Bold</option>
                  <option value="professional">Tone: Professional</option>
                  <option value="humorous">Tone: Humorous</option>
                  <option value="informative">Tone: Informative</option>
                </select>
              </div>

              {/* Copy Complete Post */}
              {hasGenerated && (
                <button
                  type="button"
                  onClick={() => {
                    const fullText = [
                      editableTitle ? `TITLE: ${editableTitle}` : '',
                      editableCaption,
                      activeHashtags.length > 0 ? activeHashtags.join(' ') : '',
                    ]
                      .filter(Boolean)
                      .join('\n\n');
                    handleCopy(fullText, 'all');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold text-xs flex items-center space-x-1 transition-colors cursor-pointer shadow-2xs"
                >
                  {copiedField === 'all' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-gray-500" />
                      <span>Copy All</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Structured Content Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {!hasGenerated ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-700 mb-1">
                    Ready to Generate for {PLATFORM_NAMES[platform]}
                  </h4>
                  <p className="text-xs text-gray-400 max-w-sm mb-4">
                    Enter what you want to post about on the left, then click{' '}
                    <span className="font-semibold text-emerald-600">Generate Platform Content</span>.
                  </p>
                  <div className="text-[11px] bg-gray-50 rounded-xl p-3 border border-gray-100 max-w-md text-left text-gray-500 space-y-1">
                    <div className="font-bold text-gray-700">Platform Intelligence:</div>
                    <div>• <strong>YouTube:</strong> High-CTR Title, SEO tags, video hook, and outline.</div>
                    <div>• <strong>Instagram:</strong> Curiosity hook, clean paragraph spacing, strategic tags.</div>
                    <div>• <strong>X (Twitter):</strong> Punchy copy strictly within 280 chars & thread cards.</div>
                    <div>• <strong>Facebook:</strong> Community-focused discussion question and storytelling.</div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Platform Intelligence Banner */}
                  <div className="flex items-center justify-between text-xs px-3.5 py-2 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-900">
                    <div className="flex items-center space-x-2">
                      <PlatformLogo platform={platform} className="w-4 h-4" />
                      <span className="font-semibold">
                        Optimized for {PLATFORM_NAMES[platform]}
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-medium">
                      {platform === 'twitter'
                        ? `${editableCaption.length}/280 chars`
                        : `${editableCaption.length} characters`}
                    </span>
                  </div>

                  {/* 1. Title / Hook Section (Always for YouTube or if title present) */}
                  {(platform === 'youtube' || editableTitle) && (
                    <div className="border border-gray-200/80 rounded-xl p-3.5 space-y-2 bg-gray-50/30">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-800 flex items-center space-x-1.5">
                          <span>{platform === 'youtube' ? 'Video Title (Required)' : 'Title / Headline'}</span>
                          <span className="text-[10px] text-gray-400 font-normal">
                            ({editableTitle.length}/100 chars)
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleCopy(editableTitle, 'title')}
                          className="text-[11px] text-gray-500 hover:text-gray-800 flex items-center space-x-1 cursor-pointer"
                        >
                          {copiedField === 'title' ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedField === 'title' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={editableTitle}
                        onChange={(e) => setEditableTitle(e.target.value)}
                        maxLength={100}
                        className="w-full text-xs font-semibold p-2.5 rounded-lg border border-gray-200 bg-white focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                  )}

                  {/* 2. Main Caption / Post Text */}
                  <div className="border border-gray-200/80 rounded-xl p-3.5 space-y-2 bg-white">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-800 flex items-center space-x-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                        <span>Main Caption & Post Text</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleCopy(editableCaption, 'caption')}
                        className="text-[11px] text-gray-500 hover:text-gray-800 flex items-center space-x-1 cursor-pointer"
                      >
                        {copiedField === 'caption' ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedField === 'caption' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <textarea
                      value={editableCaption}
                      onChange={(e) => setEditableCaption(e.target.value)}
                      rows={8}
                      className="w-full text-xs p-3 rounded-lg border border-gray-200 bg-white focus:outline-hidden focus:border-emerald-500 leading-relaxed font-sans resize-none"
                    />

                    {isOverLimit && platform === 'twitter' && (
                      <div className="flex items-center space-x-1.5 text-xs text-rose-700 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Exceeds Twitter/X 280-char limit ({editableCaption.length}/280). Use &quot;Make Shorter&quot; or trim manually.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 3. Call to Action (CTA) */}
                  {editableCta && (
                    <div className="border border-gray-200/80 rounded-xl p-3 space-y-1.5 bg-gray-50/30">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-800">Call to Action (CTA)</label>
                        <button
                          type="button"
                          onClick={() => handleCopy(editableCta, 'cta')}
                          className="text-[11px] text-gray-500 hover:text-gray-800 flex items-center space-x-1 cursor-pointer"
                        >
                          {copiedField === 'cta' ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedField === 'cta' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={editableCta}
                        onChange={(e) => setEditableCta(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-gray-200 bg-white focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                  )}

                  {/* 4. Hashtags (Interactive Toggle Chips) */}
                  {activeHashtags.length > 0 && (
                    <div className="border border-gray-200/80 rounded-xl p-3 space-y-2 bg-white">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-800 flex items-center space-x-1">
                          <Hash className="w-3.5 h-3.5 text-gray-400" />
                          <span>Strategic Hashtags ({activeHashtags.length})</span>
                          <span className="text-[10px] text-gray-400 font-normal">
                            (Click chip to toggle on/off)
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleCopy(activeHashtags.join(' '), 'tags')}
                          className="text-[11px] text-gray-500 hover:text-gray-800 flex items-center space-x-1 cursor-pointer"
                        >
                          {copiedField === 'tags' ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedField === 'tags' ? 'Copied' : 'Copy All'}</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {activeHashtags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleHashtag(tag)}
                            className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors cursor-pointer"
                            title="Click to remove tag"
                          >
                            {tag} &times;
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5. Keywords / SEO Tags (For YouTube / Discovery) */}
                  {activeKeywords.length > 0 && (
                    <div className="border border-gray-200/80 rounded-xl p-3 space-y-2 bg-gray-50/20">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-800 flex items-center space-x-1">
                          <Tag className="w-3.5 h-3.5 text-gray-400" />
                          <span>Search & SEO Keywords</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleCopy(activeKeywords.join(', '), 'keywords')}
                          className="text-[11px] text-gray-500 hover:text-gray-800 flex items-center space-x-1 cursor-pointer"
                        >
                          {copiedField === 'keywords' ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedField === 'keywords' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {activeKeywords.map((kw, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-200"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 6. Twitter Thread Suggestions (if thread format) */}
                  {threadSuggestions.length > 0 && (
                    <div className="border border-sky-100 rounded-xl p-3.5 space-y-2 bg-sky-50/40">
                      <div className="text-xs font-bold text-sky-950 flex items-center space-x-1.5">
                        <span>🧵 Thread Continuation Breakdown:</span>
                      </div>
                      <div className="space-y-2">
                        {threadSuggestions.map((tweet, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg bg-white border border-sky-200/80 text-xs text-gray-800 flex items-start justify-between space-x-2"
                          >
                            <span className="leading-relaxed">{tweet}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(tweet, `tweet-${idx}`)}
                              className="text-[11px] text-sky-700 hover:text-sky-900 shrink-0 cursor-pointer font-medium"
                            >
                              {copiedField === `tweet-${idx}` ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 7. Alternative Hook Variations */}
                  {variations.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        Alternative Opening Hooks (Click to swap):
                      </div>
                      <div className="space-y-1.5">
                        {variations.map((v, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              // Replace opening line of caption with selected variation
                              const lines = editableCaption.split('\n');
                              lines[0] = v;
                              setEditableCaption(lines.join('\n'));
                            }}
                            className="w-full text-left p-2 rounded-lg bg-white border border-gray-200 hover:border-emerald-400 text-xs text-gray-700 transition-colors flex items-center justify-between group cursor-pointer"
                          >
                            <span className="truncate">{v}</span>
                            <span className="text-[11px] font-bold text-emerald-600 group-hover:underline shrink-0 ml-2">
                              Use Hook
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-white shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleApply}
                disabled={!hasGenerated || !editableCaption.trim()}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center space-x-2 transition-all disabled:opacity-40 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>
                  Apply to {PLATFORM_NAMES[platform]} Post
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
