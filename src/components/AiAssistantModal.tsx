'use client';

import React, { useState } from 'react';
import { Sparkles, X, Check, RefreshCw, Copy, Layers } from 'lucide-react';
import { generateSocialContent } from '@/lib/ai';
import { SocialPlatform } from '@/types/social';
import { PlatformLogo } from './SocialIcons';

interface AiAssistantModalProps {
  initialPrompt?: string;
  onInsert: (caption: string) => void;
  onClose: () => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  initialPrompt = '',
  onInsert,
  onClose,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt || 'Announce the launch of our new SaaS feature that helps creators cross-post easily');
  const [platform, setPlatform] = useState<SocialPlatform>('instagram');
  const [tone, setTone] = useState<'engaging' | 'professional' | 'viral' | 'concise' | 'humorous'>('engaging');
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{
    caption: string;
    hashtags: string[];
    variations: string[];
  } | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const result = await generateSocialContent({
        prompt,
        platform,
        tone,
        includeHashtags,
      });
      setGeneratedResult(result);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">AI Social Assistant</h3>
              <p className="text-xs text-gray-400">Generate platform-optimized captions, hooks, and hashtags</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="py-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              What do you want to post about?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-hidden focus:border-purple-500"
              placeholder="Describe your announcement, product, tip, or thought..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Platform focus */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Target Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as SocialPlatform)}
                className="w-full text-xs p-2 rounded-lg border border-gray-200 focus:outline-hidden focus:border-purple-500 bg-white"
              >
                <option value="instagram">Instagram (Storytelling & Tags)</option>
                <option value="twitter">X / Twitter (Punchy & 280 chars)</option>
                <option value="linkedin">LinkedIn (Thought Leadership)</option>
                <option value="facebook">Facebook (Conversational)</option>
                <option value="tiktok">TikTok / Shorts (Script Hook)</option>
                <option value="threads">Threads (Micro-blogging)</option>
                <option value="bluesky">Bluesky (Open Web)</option>
              </select>
            </div>

            {/* Tone */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Tone & Voice</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as any)}
                className="w-full text-xs p-2 rounded-lg border border-gray-200 focus:outline-hidden focus:border-purple-500 bg-white"
              >
                <option value="engaging">Engaging & Friendly</option>
                <option value="viral">Viral & High-Energy</option>
                <option value="professional">Professional & Authoritative</option>
                <option value="concise">Concise & Direct</option>
                <option value="humorous">Humorous & Playful</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeHashtags}
                onChange={(e) => setIncludeHashtags(e.target.checked)}
                className="rounded accent-purple-600"
              />
              <span>Auto-append relevant hashtags</span>
            </label>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{isGenerating ? 'Generating with AI...' : 'Generate Content'}</span>
            </button>
          </div>

          {/* Generated Result Display */}
          {generatedResult && (
            <div className="mt-4 p-4 rounded-xl bg-purple-50/50 border border-purple-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900">Generated Caption</span>
                <button
                  onClick={() => onInsert(generatedResult.caption)}
                  className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs flex items-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Insert to Post</span>
                </button>
              </div>

              <div className="text-xs text-gray-800 whitespace-pre-line bg-white p-3 rounded-lg border border-purple-100 max-h-48 overflow-y-auto leading-relaxed">
                {generatedResult.caption}
              </div>

              {/* Variations */}
              <div>
                <div className="text-[11px] font-semibold text-gray-500 mb-1.5">Alternative Hook Variations:</div>
                <div className="space-y-1.5">
                  {generatedResult.variations.map((v, i) => (
                    <button
                      key={i}
                      onClick={() => onInsert(v)}
                      className="w-full text-left p-2 rounded-lg bg-white border border-gray-200 hover:border-purple-300 text-[11px] text-gray-700 transition-all flex items-center justify-between"
                    >
                      <span className="truncate">{v}</span>
                      <span className="text-purple-600 font-semibold shrink-0 ml-2">Use This</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
