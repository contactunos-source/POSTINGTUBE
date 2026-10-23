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
  Wand2,
  Film,
  Image as ImageIcon,
  Share2,
  AlertTriangle,
} from 'lucide-react';
import {
  generateSocialContent,
  AiObjective,
  AiAudience,
  AiTone,
  AiFormat,
  AiGeneratedResult,
  CaptionLanguage,
} from '@/lib/ai';
import { SocialPlatform, PostMedia } from '@/types/social';
import { PlatformLogo } from './SocialIcons';

export interface AiApplyPayload {
  title?: string;
  caption: string;
  hashtags?: string[];
  tags?: string[];
  cta?: string;
  platform?: SocialPlatform;
  applyToAll?: boolean;
}

interface AiAssistantModalProps {
  initialPrompt?: string;
  initialTitle?: string;
  initialPlatform?: SocialPlatform;
  media?: PostMedia;
  initialMode?: 'prompt' | 'media-analysis';
  existingCaption?: string;
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

// Exactly three supported caption languages as required
const LANGUAGES: { code: CaptionLanguage; name: string; native: string }[] = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
];

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  initialPrompt = '',
  initialTitle = '',
  initialPlatform = 'instagram',
  media,
  initialMode = 'prompt',
  existingCaption = '',
  onInsert,
  onClose,
}) => {
  // Mode: manual prompt vs media analysis
  const [activeMode, setActiveMode] = useState<'prompt' | 'media-analysis'>(
    initialMode === 'media-analysis' && media ? 'media-analysis' : 'prompt'
  );

  // Input Controls
  const [prompt, setPrompt] = useState(
    initialPrompt || 'Announce the launch of our new social media scheduling feature that saves creators hours every week'
  );
  const [platform, setPlatform] = useState<SocialPlatform>(initialPlatform);
  const [objective, setObjective] = useState<AiObjective>('engagement');
  const [audience, setAudience] = useState<AiAudience>('creators');
  const [tone, setTone] = useState<AiTone>('engaging');
  const [format, setFormat] = useState<AiFormat>('feed');
  const [language, setLanguage] = useState<CaptionLanguage>('en');

  // Advanced context (collapsible)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [keywords, setKeywords] = useState('');
  const [productContext, setProductContext] = useState('');
  const [customCta, setCustomCta] = useState('');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string | null>(null);
  const [providerWarning, setProviderWarning] = useState<string | null>(null);
  const [visualSummary, setVisualSummary] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Overwrite Confirmation State
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [pendingApplyAction, setPendingApplyAction] = useState<'current' | 'all' | null>(null);

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

  // Media Analysis Execution
  const handleAnalyzeMedia = async () => {
    if (!media) return;
    setIsGenerating(true);
    setProviderWarning(null);
    setVisualSummary(null);

    // Progressive loading state indications
    setAnalysisStep(
      media.type === 'video'
        ? 'Sampling video frames & analyzing motion context...'
        : 'Scanning image composition, objects & mood...'
    );

    try {
      setTimeout(() => {
        setAnalysisStep(`Crafting platform-tailored copy in ${LANGUAGES.find((l) => l.code === language)?.name}...`);
      }, 700);

      const res = await fetch('/api/ai/analyze-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaUrl: media.url,
          mediaType: media.type,
          mediaName: media.name,
          platform,
          objective,
          audience,
          tone,
          language,
          customCta,
          keywords,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        if (json.warning) {
          setProviderWarning(json.warning);
        }
        if (json.visualSummary) {
          setVisualSummary(json.visualSummary);
        }
        const result: AiGeneratedResult = json.data;
        if (result.title) setEditableTitle(result.title);
        setEditableHook(result.hook || '');
        setEditableCaption(result.caption || '');
        setEditableCta(result.cta || '');
        setActiveHashtags(result.hashtags || []);
        setActiveKeywords(result.keywords || []);
        setThreadSuggestions(result.threadSuggestions || []);
        setVariations(result.variations || []);
        setHasGenerated(true);
      }
    } catch (err) {
      console.error('Failed to analyze media:', err);
    } finally {
      setIsGenerating(false);
      setAnalysisStep(null);
    }
  };

  // Standard Text-Prompt Generation
  const handleGenerate = async (
    action: 'generate' | 'shorter' | 'longer' | 'tone' | 'regenerate' = 'generate',
    overrideTone?: AiTone
  ) => {
    if (activeMode === 'media-analysis' && media && action === 'generate') {
      return handleAnalyzeMedia();
    }

    if (!prompt.trim()) return;
    setIsGenerating(true);
    setProviderWarning(null);

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

  // Initial trigger if modal opened in media-analysis mode
  useEffect(() => {
    if (initialMode === 'media-analysis' && media && !hasGenerated) {
      handleAnalyzeMedia();
    } else if (initialPrompt && !hasGenerated) {
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

  // Build combined caption text
  const getPreparedCaption = () => {
    let finalCaption = editableCaption.trim();
    if (activeHashtags.length > 0) {
      const tagsString = activeHashtags.join(' ');
      if (!finalCaption.includes(activeHashtags[0])) {
        finalCaption = `${finalCaption}\n\n${tagsString}`;
      }
    }
    return finalCaption;
  };

  // Execute apply action safely
  const executeApply = (applyToAll: boolean) => {
    const finalCaption = getPreparedCaption();
    onInsert({
      title: editableTitle.trim() || undefined,
      caption: finalCaption,
      hashtags: activeHashtags,
      tags: activeKeywords,
      cta: editableCta.trim() || undefined,
      platform,
      applyToAll,
    });
  };

  // Safe apply handlers with overwrite protection
  const handleApplyClick = (applyToAll: boolean) => {
    const hasExistingText = existingCaption && existingCaption.trim().length > 0;
    if (hasExistingText) {
      setPendingApplyAction(applyToAll ? 'all' : 'current');
      setShowOverwriteModal(true);
    } else {
      executeApply(applyToAll);
    }
  };

  // Character counter for Twitter or general
  const charLimit = platform === 'twitter' ? 280 : 2200;
  const isOverLimit = editableCaption.length > charLimit;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 font-sans animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-5xl w-full h-[92vh] max-h-[860px] flex flex-col shadow-2xl border border-gray-100 overflow-hidden relative">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-gray-900">AI Social Assistant & Media Vision</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 flex items-center space-x-1">
                  <PlatformLogo platform={platform} className="w-3 h-3" />
                  <span>{PLATFORM_NAMES[platform]}</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                  {LANGUAGES.find((l) => l.code === language)?.native || 'English'}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Analyze uploaded media or prompt AI to craft platform-ready captions in English, Telugu & Hindi
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

        {/* Mode Selector Tabs (Prompt vs Media Analysis) */}
        {media && (
          <div className="px-6 py-2 bg-gray-50 border-b border-gray-200/80 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setActiveMode('media-analysis')}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  activeMode === 'media-analysis'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Analyze Uploaded Media</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('prompt')}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  activeMode === 'prompt'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Describe Post Topic</span>
              </button>
            </div>

            {/* Media Attachment Pill */}
            <div className="flex items-center space-x-2 text-xs text-gray-600 bg-white px-3 py-1 rounded-xl border border-gray-200">
              {media.type === 'video' ? (
                <Film className="w-3.5 h-3.5 text-blue-600" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span className="font-medium truncate max-w-[200px]">{media.name}</span>
              <span className="text-[10px] uppercase font-bold text-gray-400">
                ({media.type})
              </span>
            </div>
          </div>
        )}

        {/* 2-Column Responsive Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-hidden">
          {/* LEFT COLUMN: Input Controls */}
          <div className="lg:col-span-5 border-r border-gray-100 p-5 overflow-y-auto space-y-4 bg-gray-50/40">
            {/* Media Analysis Highlight Card (if media mode) */}
            {activeMode === 'media-analysis' && media ? (
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center space-x-1.5">
                    <Wand2 className="w-4 h-4 text-emerald-600" />
                    <span>Visual Media Vision Analysis</span>
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    {media.type}
                  </span>
                </div>

                <p className="text-xs text-emerald-800 leading-relaxed">
                  AI will analyze visual subjects, composition, activity, and setting in{' '}
                  <span className="font-semibold">{media.name}</span> to generate captions automatically.
                </p>

                <button
                  type="button"
                  onClick={handleAnalyzeMedia}
                  disabled={isGenerating}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{analysisStep || 'Analyzing visual context...'}</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Analyze Media &amp; Generate Caption</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Primary Prompt Input (if prompt mode) */
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 flex items-center justify-between">
                  <span>What do you want to post about?</span>
                  <span className="text-[11px] text-gray-400 font-normal">Primary Prompt</span>
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  placeholder="E.g., Announce our new product launch with early access discount..."
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
            )}

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

            {/* Exactly Three Caption Languages Selector (English, Telugu, Hindi) */}
            <div className="space-y-1.5 p-3 rounded-xl bg-white border border-gray-200 shadow-2xs">
              <label className="text-xs font-bold text-gray-800 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Caption Language</span>
                </span>
                <span className="text-[10px] text-gray-400">English, Telugu or Hindi</span>
              </label>

              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {LANGUAGES.map((lang) => {
                  const isSelected = language === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setLanguage(lang.code)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="text-xs">{lang.name}</div>
                      <div className={`text-[10px] font-normal ${isSelected ? 'text-emerald-100' : 'text-gray-500'}`}>
                        {lang.native}
                      </div>
                    </button>
                  );
                })}
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
                onClick={() =>
                  activeMode === 'media-analysis' && media
                    ? handleAnalyzeMedia()
                    : handleGenerate('generate')
                }
                disabled={isGenerating || (activeMode === 'prompt' && !prompt.trim())}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.99] text-white text-xs font-bold shadow-md shadow-emerald-600/15 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-100" />
                    <span>{analysisStep || 'Crafting High-Converting Copy...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-200" />
                    <span>
                      {activeMode === 'media-analysis' && media
                        ? 'Analyze Media & Generate Caption'
                        : `Generate Content (${LANGUAGES.find((l) => l.code === language)?.name})`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Structured Workspace */}
          <div className="lg:col-span-7 flex flex-col min-h-0 bg-white">
            {/* Provider Warning / Notice Banner if in testing mode */}
            {providerWarning && (
              <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200/80 text-amber-900 text-xs flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-medium">{providerWarning}</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-md">
                  Testing Mode
                </span>
              </div>
            )}

            {/* Top Toolbar: Iterative Refinements */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2 bg-gray-50/50 shrink-0">
              <div className="flex items-center space-x-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mr-1">
                  Actions:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    activeMode === 'media-analysis' && media
                      ? handleAnalyzeMedia()
                      : handleGenerate('regenerate')
                  }
                  disabled={isGenerating || !hasGenerated}
                  className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold text-xs flex items-center space-x-1 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                  title="Generate another variation"
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
                  <span>Improve Caption</span>
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
                      <span>Copy Caption</span>
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
                    {media ? <Wand2 className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
                  </div>
                  <h4 className="text-sm font-bold text-gray-700 mb-1">
                    {media
                      ? `Ready to Analyze ${media.name}`
                      : `Ready to Generate for ${PLATFORM_NAMES[platform]}`}
                  </h4>
                  <p className="text-xs text-gray-400 max-w-sm mb-4">
                    {media
                      ? 'Click "Analyze Media & Generate Caption" to inspect visual content and generate copy.'
                      : 'Choose your language (English, Telugu, Hindi) and click Generate Platform Content.'}
                  </p>
                  <div className="text-[11px] bg-gray-50 rounded-xl p-3 border border-gray-100 max-w-md text-left text-gray-500 space-y-1">
                    <div className="font-bold text-gray-700">Supported Languages:</div>
                    <div>• <strong>English:</strong> High-impact, engaging social copy.</div>
                    <div>• <strong>Telugu (తెలుగు):</strong> సహజమైన, స్పష్టమైన తెలుగు పదజాలం.</div>
                    <div>• <strong>Hindi (हिन्दी):</strong> सहज और असरदार हिंदी भाषा।</div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Platform & Language Intelligence Banner */}
                  <div className="flex items-center justify-between text-xs px-3.5 py-2 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-900">
                    <div className="flex items-center space-x-2">
                      <PlatformLogo platform={platform} className="w-4 h-4" />
                      <span className="font-semibold">
                        Optimized for {PLATFORM_NAMES[platform]} ({LANGUAGES.find((l) => l.code === language)?.name})
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-medium">
                      {platform === 'twitter'
                        ? `${editableCaption.length}/280 chars`
                        : `${editableCaption.length} characters`}
                    </span>
                  </div>

                  {/* Visual Summary if analyzed */}
                  {visualSummary && (
                    <div className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-700 flex items-center space-x-2">
                      <Wand2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span><strong>Visual Context:</strong> {visualSummary}</span>
                    </div>
                  )}

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
                        <span>Main Caption &amp; Post Text</span>
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

                  {/* 5. Keywords / SEO Tags */}
                  {activeKeywords.length > 0 && (
                    <div className="border border-gray-200/80 rounded-xl p-3 space-y-2 bg-gray-50/20">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-800 flex items-center space-x-1">
                          <Tag className="w-3.5 h-3.5 text-gray-400" />
                          <span>Search &amp; SEO Keywords</span>
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

              <div className="flex items-center space-x-2">
                {/* One-Click Apply to All Platforms */}
                <button
                  type="button"
                  onClick={() => handleApplyClick(true)}
                  disabled={!hasGenerated || !editableCaption.trim()}
                  className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 text-xs font-bold flex items-center space-x-1.5 transition-all disabled:opacity-40 cursor-pointer shadow-2xs"
                  title="Apply this caption across all selected accounts"
                >
                  <Share2 className="w-3.5 h-3.5 text-purple-600" />
                  <span>Insert for All Platforms</span>
                </button>

                {/* Apply to Current Platform */}
                <button
                  type="button"
                  onClick={() => handleApplyClick(false)}
                  disabled={!hasGenerated || !editableCaption.trim()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center space-x-2 transition-all disabled:opacity-40 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    Insert Caption ({PLATFORM_NAMES[platform]})
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Overwrite Confirmation Dialog */}
        {showOverwriteModal && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-gray-100 space-y-3 animate-in fade-in zoom-in-95">
              <div className="flex items-center space-x-2.5 text-amber-600">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h4 className="text-sm font-bold text-gray-900">Replace Existing Caption?</h4>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                You already have a manually written caption in the editor. Applying this AI-generated caption will overwrite your existing text. Are you sure you want to proceed?
              </p>
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowOverwriteModal(false);
                    setPendingApplyAction(null);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  Keep Existing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowOverwriteModal(false);
                    executeApply(pendingApplyAction === 'all');
                    setPendingApplyAction(null);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                >
                  Overwrite &amp; Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
