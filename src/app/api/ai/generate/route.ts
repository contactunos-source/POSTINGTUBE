import { NextRequest, NextResponse } from 'next/server';
import { generateDynamicContent, AiGenerateOptions, AiGeneratedResult } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AiGenerateOptions;

    if (!body || !body.prompt?.trim()) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;

    // 1. Try Google Gemini API if configured
    if (geminiKey && geminiKey.trim() !== '' && !geminiKey.includes('your_gemini_api_key')) {
      try {
        const geminiResult = await callGeminiApi(body, geminiKey);
        if (geminiResult) {
          return NextResponse.json({ success: true, data: geminiResult });
        }
      } catch (err) {
        console.warn('[AI API] Gemini call failed, falling back to dynamic engine:', err);
      }
    }

    // 2. Try OpenAI API if configured
    if (openAiKey && openAiKey.trim() !== '' && !openAiKey.includes('your_openai_api_key')) {
      try {
        const openAiResult = await callOpenAiApi(body, openAiKey);
        if (openAiResult) {
          return NextResponse.json({ success: true, data: openAiResult });
        }
      } catch (err) {
        console.warn('[AI API] OpenAI call failed, falling back to dynamic engine:', err);
      }
    }

    // 3. Fallback to our high-performing dynamic copywriting engine
    const result = generateDynamicContent(body);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('[API /api/ai/generate] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate AI content' },
      { status: 500 }
    );
  }
}

async function callGeminiApi(
  options: AiGenerateOptions,
  apiKey: string
): Promise<AiGeneratedResult | null> {
  const platform = options.platform || 'instagram';
  const language = options.language || 'en';
  const langName = language === 'te' ? 'Telugu (తెలుగు)' : language === 'hi' ? 'Hindi (हिन्दी)' : 'English';

  const systemPrompt = `You are PostingTube AI, an elite social media copywriter.
Generate engaging, platform-native social media content.
Target Platform: ${platform.toUpperCase()}
Target Language: ${langName}
User Prompt: "${options.prompt}"
Action: ${options.action || 'generate'}

IMPORTANT REQUIREMENTS:
- Produce creative, non-generic, high-converting copy that accurately follows the user's prompt.
- Do NOT use robotic cliches like "In today's fast paced world" or generic quotes.
- If target language is Telugu or Hindi, write entirely in natural, modern, native Telugu or Hindi script.
- Return ONLY valid JSON in this exact structure without markdown backticks:
{
  "title": "Short punchy title for YouTube/LinkedIn or null",
  "hook": "Scroll-stopping first line",
  "caption": "Full formatted caption with line breaks and CTA",
  "cta": "Call to action sentence",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "variations": ["Alternate hook 1", "Alternate hook 2", "Alternate hook 3"]
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  const parsed = JSON.parse(text);
  return {
    title: parsed.title || undefined,
    hook: parsed.hook || '',
    caption: parsed.caption || '',
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    cta: parsed.cta || '',
    variations: Array.isArray(parsed.variations) ? parsed.variations : [],
    platform,
  };
}

async function callOpenAiApi(
  options: AiGenerateOptions,
  apiKey: string
): Promise<AiGeneratedResult | null> {
  const platform = options.platform || 'instagram';
  const language = options.language || 'en';
  const langName = language === 'te' ? 'Telugu (తెలుగు)' : language === 'hi' ? 'Hindi (हिन्दी)' : 'English';

  const systemPrompt = `You are PostingTube AI, an elite social media copywriter.
Generate engaging, platform-native social media content.
Target Platform: ${platform.toUpperCase()}
Target Language: ${langName}
User Prompt: "${options.prompt}"
Action: ${options.action || 'generate'}

Respond ONLY with a JSON object:
{
  "title": "Short punchy title or null",
  "hook": "Scroll-stopping first line",
  "caption": "Full formatted caption with line breaks and CTA",
  "cta": "Call to action sentence",
  "hashtags": ["#tag1", "#tag2", "#tag3"],
  "keywords": ["keyword1", "keyword2"],
  "variations": ["Hook 1", "Hook 2", "Hook 3"]
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: systemPrompt }],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) return null;

  const parsed = JSON.parse(text);
  return {
    title: parsed.title || undefined,
    hook: parsed.hook || '',
    caption: parsed.caption || '',
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    cta: parsed.cta || '',
    variations: Array.isArray(parsed.variations) ? parsed.variations : [],
    platform,
  };
}
