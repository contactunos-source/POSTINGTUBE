import { SocialPlatform } from '@/types/social';

export type AiObjective =
  | 'promote'
  | 'tip'
  | 'story'
  | 'engagement'
  | 'question'
  | 'news';

export type AiAudience =
  | 'founders'
  | 'developers'
  | 'creators'
  | 'general'
  | 'consumers';

export type AiTone =
  | 'professional'
  | 'bold'
  | 'friendly'
  | 'humorous'
  | 'informative'
  | 'authoritative'
  | 'viral'
  | 'concise'
  | 'engaging';

export type AiFormat =
  | 'feed'
  | 'reel_short'
  | 'long_form'
  | 'carousel'
  | 'thread';

export interface AiGenerateOptions {
  prompt: string;
  platform?: SocialPlatform;
  objective?: AiObjective;
  audience?: AiAudience;
  tone?: AiTone;
  language?: string;
  format?: AiFormat;
  keywords?: string;
  productContext?: string;
  customCta?: string;
  action?: 'generate' | 'shorter' | 'longer' | 'tone' | 'regenerate';
  previousResult?: AiGeneratedResult;
  includeHashtags?: boolean;
  includeEmojis?: boolean;
}

export interface AiGeneratedResult {
  title?: string;
  hook: string;
  caption: string;
  hashtags: string[];
  keywords: string[];
  cta: string;
  threadSuggestions?: string[];
  variations: string[];
  platform: SocialPlatform;
}

// Common audience descriptors
const AUDIENCE_CONTEXT: Record<AiAudience, string> = {
  founders: 'startup founders, entrepreneurs, and indie hackers',
  developers: 'software engineers, developers, and tech leads',
  creators: 'content creators, digital marketers, and agency owners',
  general: 'ambitious professionals and curious minds',
  consumers: 'everyday users, shoppers, and community members',
};

// Common platform tag dictionaries
const PLATFORM_HASHTAGS: Record<SocialPlatform, string[]> = {
  instagram: ['#contentcreator', '#creators', '#growthmindset', '#digitalmarketing', '#socialmediatips', '#founderlife', '#marketingstrategy', '#reelsviral', '#buildinpublic'],
  youtube: ['#shorts', '#youtubetips', '#creatorjourney', '#techtutorial', '#growthstrategy', '#videoeditor'],
  facebook: ['#community', '#insights', '#entrepreneurship', '#trending', '#discussion', '#productivity'],
  twitter: ['#buildinpublic', '#tech', '#growth', '#saas', '#founder', '#startups'],
  linkedin: ['#leadership', '#innovation', '#technology', '#strategy', '#futureofwork', '#management'],
  threads: ['#threads', '#thoughts', '#buildinpublic', '#creators', '#techcommunity'],
  pinterest: ['#aesthetic', '#inspiration', '#productivitytips', '#designinspiration', '#howto', '#growth'],
  tiktok: ['#fyp', '#foryoupage', '#techfok', '#creatorsoftiktok', '#trending', '#learnontiktok'],
  bluesky: ['#bluesky', '#tech', '#webdev', '#openweb'],
};

const PLATFORM_KEYWORDS: Record<SocialPlatform, string[]> = {
  youtube: ['how to', 'tutorial', 'best practices', '2026 guide', 'step-by-step', 'review', 'workflow'],
  pinterest: ['ideas', 'aesthetic', 'checklist', 'inspiration', 'template', 'guide'],
  instagram: ['tips', 'hack', 'behind the scenes', 'creator tool', 'motivation'],
  facebook: ['community update', 'question of the day', 'discussion', 'announcement'],
  twitter: ['thread', 'lessons learned', 'framework', 'unpopular opinion'],
  linkedin: ['executive summary', 'case study', 'key takeaways', 'industry trends'],
  threads: ['daily thought', 'perspective', 'creator log'],
  tiktok: ['life hack', 'quick guide', 'watch this'],
  bluesky: ['discussion', 'tech log', 'updates'],
};

export async function generateSocialContent(
  options: AiGenerateOptions
): Promise<AiGeneratedResult> {
  // Simulate natural generation latency (400ms)
  await new Promise((resolve) => setTimeout(resolve, 450));

  const platform: SocialPlatform = options.platform || 'instagram';
  const prompt = options.prompt.trim() || 'Exciting new product update and workflow improvements';
  const tone: AiTone = options.tone || 'engaging';
  const objective: AiObjective = options.objective || 'engagement';
  const audience: AiAudience = options.audience || 'general';
  const format: AiFormat = options.format || 'feed';
  const language = options.language || 'en';
  const customCta = options.customCta?.trim();
  const keywordsInput = options.keywords?.trim();
  const productContext = options.productContext?.trim();

  // Extract core keywords from prompt and inputs
  const parsedKeywords = (keywordsInput ? keywordsInput.split(/[,;\s]+/) : [])
    .concat(PLATFORM_KEYWORDS[platform] || [])
    .filter(Boolean)
    .slice(0, 8);

  // Generate platform-specific Hook, Title, Caption Body, CTA, and Hashtags
  let title = '';
  let hook = '';
  let body = '';
  let cta = customCta || '';
  let hashtags: string[] = [...(PLATFORM_HASHTAGS[platform] || [])];
  let threadSuggestions: string[] | undefined = undefined;

  // Language greeting prefixes if non-English requested
  let langGreeting = '';
  if (language === 'es') langGreeting = '¡Hola a todos! ';
  else if (language === 'fr') langGreeting = 'Bonjour à tous ! ';
  else if (language === 'de') langGreeting = 'Hallo zusammen! ';
  else if (language === 'pt') langGreeting = 'Olá a todos! ';
  else if (language === 'hi') langGreeting = 'नमस्ते दोस्तों! ';

  // Tone modulation phrases
  const isHumorous = tone === 'humorous';
  const isProfessional = tone === 'professional' || tone === 'authoritative';
  const isBold = tone === 'bold' || tone === 'viral';

  // 1. Platform-Specific Copy Generation
  if (platform === 'youtube') {
    title = isBold
      ? `How to ${prompt.slice(0, 50)} (The 2026 Complete Guide)`
      : isHumorous
      ? `I Tried ${prompt.slice(0, 45)} So You Don't Have To!`
      : `${prompt.slice(0, 55)} | Step-by-Step Breakdown`;

    hook = isBold
      ? `Stop doing this the hard way. Here is the exact strategy for ${prompt.toLowerCase()}.`
      : `In today's video, we break down everything you need to know about ${prompt.toLowerCase()}.`;

    body = `${langGreeting}${hook}\n\n` +
      `⏱️ TIMESTAMPS & OVERVIEW:\n` +
      `0:00 - Introduction & Why this matters\n` +
      `1:15 - Key Challenges & Common Pitfalls\n` +
      `3:40 - The Core Framework & Implementation\n` +
      `6:20 - Real-World Results & Next Steps\n\n` +
      (productContext ? `📌 FEATURED CONTEXT:\n${productContext}\n\n` : '') +
      `💡 KEY TAKEAWAY:\nMastering this workflow changes the game for ${AUDIENCE_CONTEXT[audience]}. Take your time to test each step!`;

    cta = cta || `🔔 Subscribe to the channel for weekly deep dives, hit like if this helped, and leave your thoughts in the comments below!`;
  } else if (platform === 'instagram') {
    hook = isBold
      ? `⚡ Don't scroll past this if you care about ${prompt.toLowerCase()}!`
      : isHumorous
      ? `😅 Confession time: we used to do ${prompt.toLowerCase()} completely wrong...`
      : `✨ Here's a game-changing perspective on ${prompt.toLowerCase()}:`;

    body = `${langGreeting}${hook}\n\n` +
      `Most ${AUDIENCE_CONTEXT[audience]} struggle with this one fundamental truth:\n\n` +
      `1️⃣ Execution always beats overthinking.\n` +
      `2️⃣ Simplicity scales faster than complexity.\n` +
      `3️⃣ High momentum creates its own luck.\n\n` +
      (productContext ? `Here's what makes this special:\n${productContext}\n\n` : '') +
      `When you build systems around your strengths, consistency feels effortless.`;

    cta = cta || `👉 Double tap ❤️ if you agree!\n📌 Save this post for your next planning session.\n💬 Share your biggest takeaway in the comments below!`;
  } else if (platform === 'facebook') {
    hook = isBold
      ? `Big announcement for our entire community today!`
      : `Let's have an honest conversation about ${prompt.toLowerCase()}.`;

    body = `${langGreeting}${hook}\n\n` +
      `Over the past few weeks, we've had numerous discussions with ${AUDIENCE_CONTEXT[audience]} about what truly moves the needle.\n\n` +
      `Here is the main takeaway: ${prompt}.\n\n` +
      (productContext ? `${productContext}\n\n` : '') +
      `We believe that by sharing our authentic journey, we can all learn and grow together.`;

    cta = cta || `We'd love to hear your thoughts! Have you experienced this in your own journey? Drop a comment below and let's discuss! 👇`;
  } else if (platform === 'twitter') {
    // Twitter/X: Strictly character conscious!
    if (format === 'thread') {
      hook = `Most people think ${prompt.toLowerCase()} is hard.\n\nThey're doing it backwards.\n\nHere is the 3-step playbook that changes everything 🧵👇`;
      body = hook;
      threadSuggestions = [
        `1/ First principle:\n\nFocus on the core bottleneck before optimizing edge cases. Most teams waste 80% of their effort on features nobody asked for.`,
        `2/ Distribution is leverage:\n\nIf you build in silence, you launch to silence. Share your learnings in public daily.`,
        `3/ The result:\n\nConsistent momentum compounds exponentially. Start today, refine tomorrow.`,
      ];
      cta = cta || `RT if you found this valuable & follow for more insights on building modern tech products!`;
    } else {
      hook = isBold
        ? `Unpopular opinion on ${prompt.toLowerCase()}:`
        : `Key takeaway from this week:`;
      body = `${hook}\n\n${prompt}.\n\nConsistency > intensity. Every single day.`;
      cta = cta || `What's your take? Agree or disagree?`;
    }
    hashtags = hashtags.slice(0, 3);
  } else if (platform === 'linkedin') {
    title = `A strategic lesson on ${prompt.slice(0, 40)}`;
    hook = isBold
      ? `The biggest mistake leaders make with ${prompt.toLowerCase()}? Treating it as an afterthought.`
      : `I have been reflecting deeply on our team's approach to ${prompt.toLowerCase()}.`;

    body = `${hook}\n\n` +
      `In today's fast-paced landscape, ${AUDIENCE_CONTEXT[audience]} face unprecedented pressure to deliver with speed and precision.\n\n` +
      `Here are 3 critical lessons we learned:\n\n` +
      `• Focus on high-leverage activities first.\n` +
      `• Automate repetitive friction points so your team can create freely.\n` +
      `• Feedback loops must be short, transparent, and actionable.\n\n` +
      (productContext ? `Context:\n${productContext}\n\n` : '') +
      `Leadership isn't about having all the answers—it's about creating the clarity for the right answers to emerge.`;

    cta = cta || `What has been your team's experience with this? I'd welcome your thoughts and perspectives in the comments.`;
  } else {
    // Default / General
    hook = `Exciting update: ${prompt}`;
    body = `${langGreeting}${hook}\n\n` +
      `Sharing our latest progress with ${AUDIENCE_CONTEXT[audience]}.\n\n` +
      (productContext ? `${productContext}\n\n` : '') +
      `Stay tuned for more updates soon!`;
    cta = cta || `Check out the details and let us know what you think!`;
  }

  // 2. Handle Refinement Actions
  if (options.action === 'shorter') {
    // Condense body to concise punchy bullet points
    body = `${hook}\n\n• ${prompt}\n• Keep it simple, execute fast.`;
  } else if (options.action === 'longer') {
    // Expand body with additional strategic insights
    body = `${body}\n\n` +
      `🔍 DEEPER DIVE:\n` +
      `When analyzing long-term outcomes, the data shows that teams who prioritize structured execution outperform those relying purely on inspiration. Don't wait for ideal conditions—create the conditions through action.`;
  } else if (options.action === 'tone') {
    if (isHumorous) {
      hook = `Spoiler alert: ${prompt.toLowerCase()} isn't as complicated as we all pretend it is 🍿`;
      body = `${hook}\n\nTested this so you don't have to stress. 10/10 would recommend doing it the easy way.\n\n${cta}`;
    } else if (isProfessional) {
      hook = `Executive Briefing: Strategic insights regarding ${prompt.toLowerCase()}.`;
      body = `${hook}\n\nKey finding: ${prompt}.\n\nImplementing structured workflows provides measurable operational efficiency for ${AUDIENCE_CONTEXT[audience]}.`;
    }
  }

  // Compose Full Caption
  const fullCaption = `${body}\n\n${cta}`.trim();

  // Alternative variations for one-click testing
  const variations = [
    `⚡ ${prompt} — here is the real secret behind it.`,
    `Stop scrolling if you want to master ${prompt.toLowerCase()}!`,
    `Behind the scenes: Why our approach to ${prompt.toLowerCase()} changed everything.`,
  ];

  return {
    title: title || undefined,
    hook,
    caption: fullCaption,
    hashtags,
    keywords: parsedKeywords,
    cta,
    threadSuggestions,
    variations,
    platform,
  };
}
