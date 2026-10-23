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

export type CaptionLanguage = 'en' | 'te' | 'hi';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
] as const;

export interface AiGenerateOptions {
  prompt: string;
  platform?: SocialPlatform;
  objective?: AiObjective;
  audience?: AiAudience;
  tone?: AiTone;
  language?: CaptionLanguage | string;
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
  await new Promise((resolve) => setTimeout(resolve, 400));

  const platform: SocialPlatform = options.platform || 'instagram';
  const prompt = options.prompt.trim() || 'Exciting new product update and workflow improvements';
  const tone: AiTone = options.tone || 'engaging';
  const objective: AiObjective = options.objective || 'engagement';
  const audience: AiAudience = options.audience || 'general';
  const format: AiFormat = options.format || 'feed';
  const language = (options.language as CaptionLanguage) || 'en';
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

  // Tone flags
  const isHumorous = tone === 'humorous';
  const isProfessional = tone === 'professional' || tone === 'authoritative';
  const isBold = tone === 'bold' || tone === 'viral';

  // ==================== TELUGU (తెలుగు) ====================
  if (language === 'te') {
    if (platform === 'youtube') {
      title = isBold
        ? `${prompt.slice(0, 50)}: పూర్తి గైడ్ & వివరణ (2026)`
        : `${prompt.slice(0, 50)} గురించి పూర్తి వివరాలు | Step-by-Step`;

      hook = `ఈ వీడియోలో మనం ${prompt.toLowerCase()} గురించి అత్యంత ముఖ్యమైన విషయాలను వివరంగా తెలుసుకుందాం! 🌟`;

      body = `${hook}\n\n` +
        `⏱️ ముఖ్య అంశాలు & టైమ్‌స్టాంప్స్:\n` +
        `0:00 - పరిచయం & దీని ప్రాముఖ్యత\n` +
        `1:15 - ప్రధాన సవాళ్లు & సాధారణ తప్పులు\n` +
        `3:40 - సులభమైన పరిష్కారం & అమలు విధానం\n` +
        `6:20 - నిజమైన ఫలితాలు & తదుపరి అడుగులు\n\n` +
        (productContext ? `📌 ప్రత్యేక గమనిక:\n${productContext}\n\n` : '') +
        `💡 ముఖ్యమైన ముగింపు:\nసరైన ప్రణాళికతో పని చేస్తే ఏదైనా సులభంగా సాధించవచ్చు. మీ అభిప్రాయాలను కామెంట్స్‌లో పంచుకోండి!`;

      cta = cta || `🔔 ఇలాంటి మరిన్ని ఉపయోగకరమైన వీడియోల కోసం సబ్‌స్క్రైబ్ చేయండి, లైక్ చేయండి మరియు మీ మిత్రులతో షేర్ చేయండి! 👇`;
      hashtags = ['#తెలుగు', '#వీడియో', '#ట్రెండింగ్', '#shorts', '#telugu', '#tips'];
    } else if (platform === 'twitter') {
      hook = isBold
        ? `ఒక ముఖ్యమైన ఆలోచన:`
        : `ఈ వారం నేర్చుకున్న పాఠం:`;
      body = `${hook}\n\n${prompt}.\n\nనిరంతర సాధన ఎప్పుడూ అత్యుత్తమ ఫలితాలను ఇస్తుంది. 🚀`;
      cta = cta || `మీ అభిప్రాయం ఏమిటి? రీట్వీట్ చేసి తెలియజేయండి! 💬`;
      hashtags = ['#తెలుగు', '#Telugu', '#Growth'];
    } else if (platform === 'facebook') {
      hook = `మన కమ్యూనిటీ కోసం ఒక ప్రత్యేకమైన అప్‌డేట్! ✨`;
      body = `${hook}\n\n` +
        `గత కొద్ది రోజులుగా ${prompt.toLowerCase()} గురించి చాలా మందితో మాట్లాడటం జరిగింది.\n\n` +
        `ఇక్కడ ప్రధాన విషయం ఏమిటంటే: సరైన దిశలో క్రమశిక్షణతో అడుగులు వేయడం.\n\n` +
        (productContext ? `${productContext}\n\n` : '') +
        `మీ అనుభవాలు ఎలా ఉన్నాయో మనందరితో పంచుకోండి.`;
      cta = cta || `మీ అభిప్రాయాన్ని క్రింద కామెంట్స్‌లో తెలియజేయండి! 👇💬`;
      hashtags = ['#తెలుగు', '#కమ్యూనిటీ', '#ట్రెండింగ్', '#ఆలోచనలు'];
    } else {
      // Instagram & General
      hook = isBold
        ? `⚡ ${prompt.toLowerCase()} గురించి తెలుసుకోవాలనుకుంటే దీన్ని తప్పక చదవండి!`
        : `✨ ${prompt.toLowerCase()} పై ఒక ఆసక్తికరమైన సమాచారం:`;

      body = `${hook}\n\n` +
        `చాలామంది ఎదుర్కొనే ప్రధాన సమస్యలకు ఇక్కడ 3 సులభమైన పరిష్కారాలు:\n\n` +
        `1️⃣ అతిగా ఆలోచించకుండా తక్షణమే ప్రారంభించండి.\n` +
        `2️⃣ సంక్లిష్టత కంటే సరళత ఎప్పుడూ వేగంగా ఫలితాన్నిస్తుంది.\n` +
        `3️⃣ చిన్న విజయాలను కూడా ఆస్వాదించడం నేర్చుకోండి.\n\n` +
        (productContext ? `${productContext}\n\n` : '') +
        `మంచి అలవాట్లే మనల్ని ముందుకు నడిపిస్తాయి.`;

      cta = cta || `👉 ఈ పోస్ట్ నచ్చితే లైక్ ❤️ చేయండి!\n📌 భవిష్యత్తు కోసం సేవ్ చేసుకోండి.\n💬 మీ ఆలోచనలను కామెంట్ చేయండి!`;
      hashtags = ['#తెలుగు', '#క్రియేటర్స్', '#ఇన్‌స్టాగ్రామ్', '#రీల్స్', '#ట్రెండింగ్', '#telugu'];
    }
  }

  // ==================== HINDI (हिन्दी) ====================
  else if (language === 'hi') {
    if (platform === 'youtube') {
      title = isBold
        ? `${prompt.slice(0, 50)}: पूरी गाइड और आसान तरीका (2026)`
        : `${prompt.slice(0, 50)} के बारे में सब कुछ | Step-by-Step Breakdown`;

      hook = `आज के वीडियो में हम ${prompt.toLowerCase()} के बारे में पूरी गहराई से बात करेंगे! 🌟`;

      body = `${hook}\n\n` +
        `⏱️ मुख्य बिंदु और समय:\n` +
        `0:00 - शुरुआत और परिचय\n` +
        `1:15 - मुख्य चुनौतियाँ और गलतियाँ\n` +
        `3:40 - सही रणनीति और आसान समाधान\n` +
        `6:20 - परिणाम और आगे की राह\n\n` +
        (productContext ? `📌 विशेष संदर्भ:\n${productContext}\n\n` : '') +
        `💡 महत्वपूर्ण सबक:\nलगातार प्रयास और सही दिशा ही सबसे बड़ी सफलता लाती है।`;

      cta = cta || `🔔 ऐसी ही उपयोगी जानकारियों के लिए चैनल को सब्सक्राइब करें और वीडियो को लाइक करें! 👇`;
      hashtags = ['#हिंदी', '#वीडियो', '#ट्रेंडिंग', '#टिप्स', '#shorts', '#hindi'];
    } else if (platform === 'twitter') {
      hook = isBold
        ? `एक महत्वपूर्ण विचार:`
        : `आज का सबसे बड़ा सबक:`;
      body = `${hook}\n\n${prompt}.\n\nनिरंतरता हमेशा तीव्रता से बड़ी होती है। हर दिन आगे बढ़ते रहिए! 🚀`;
      cta = cta || `आपकी क्या राय है? रीट्वीट करके बताएं! 💬`;
      hashtags = ['#हिंदी', '#Hindi', '#Growth'];
    } else if (platform === 'facebook') {
      hook = `हमारे पूरे समुदाय के लिए एक खास बातचीत! ✨`;
      body = `${hook}\n\n` +
        `हाल ही में ${prompt.toLowerCase()} को लेकर काफी चर्चाएं हुईं।\n\n` +
        `मुख्य बात यह है कि जब आप सही योजना के साथ काम करते हैं, तो रास्ते आसान हो जाते हैं।\n\n` +
        (productContext ? `${productContext}\n\n` : '') +
        `आइए मिलकर इस पर विचार करें और एक-दूसरे के अनुभवों से सीखें।`;
      cta = cta || `कमेंट बॉक्स में अपनी राय जरूर साझा करें! 👇💬`;
      hashtags = ['#हिंदी', '#समुदाय', '#विचार', '#ट्रेंडिंग'];
    } else {
      // Instagram & General
      hook = isBold
        ? `⚡ ${prompt.toLowerCase()} के बारे में यह जानकारी आपके बहुत काम आएगी!`
        : `✨ ${prompt.toLowerCase()} पर एक नया और उपयोगी दृष्टिकोण:`;

      body = `${hook}\n\n` +
        `सफलता की राह में इन 3 बुनियादी बातों को कभी न भूलें:\n\n` +
        `1️⃣ सोचने में समय गंवाने से बेहतर है काम शुरू करना।\n` +
        `2️⃣ सादगी हमेशा जटिलता से ज्यादा तेजी से काम करती है।\n` +
        `3️⃣ छोटी-छोटी कोशिशें बड़ा बदलाव लाती हैं।\n\n` +
        (productContext ? `${productContext}\n\n` : '') +
        `अपने लक्ष्य पर अडिग रहें और निरंतर आगे बढ़ते रहें।`;

      cta = cta || `👉 अगर यह बात पसंद आई तो लाइक ❤️ करें!\n📌 भविष्य के लिए सेव करें।\n💬 कमेंट में अपनी राय बताएं!`;
      hashtags = ['#हिंदी', '#क्रिएटर्स', '#इंस्टाग्राम', '#रील्स', '#ट्रेंडिंग', '#hindi'];
    }
  }

  // ==================== ENGLISH (Default) ====================
  else {
    if (platform === 'youtube') {
      title = isBold
        ? `How to ${prompt.slice(0, 50)} (The 2026 Complete Guide)`
        : isHumorous
        ? `I Tried ${prompt.slice(0, 45)} So You Don't Have To!`
        : `${prompt.slice(0, 55)} | Step-by-Step Breakdown`;

      hook = isBold
        ? `Stop doing this the hard way. Here is the exact strategy for ${prompt.toLowerCase()}.`
        : `In today's video, we break down everything you need to know about ${prompt.toLowerCase()}.`;

      body = `${hook}\n\n` +
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

      body = `${hook}\n\n` +
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

      body = `${hook}\n\n` +
        `Over the past few weeks, we've had numerous discussions with ${AUDIENCE_CONTEXT[audience]} about what truly moves the needle.\n\n` +
        `Here is the main takeaway: ${prompt}.\n\n` +
        (productContext ? `${productContext}\n\n` : '') +
        `We believe that by sharing our authentic journey, we can all learn and grow together.`;

      cta = cta || `We'd love to hear your thoughts! Have you experienced this in your own journey? Drop a comment below and let's discuss! 👇`;
    } else if (platform === 'twitter') {
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
      hook = `Exciting update: ${prompt}`;
      body = `${hook}\n\n` +
        `Sharing our latest progress with ${AUDIENCE_CONTEXT[audience]}.\n\n` +
        (productContext ? `${productContext}\n\n` : '') +
        `Stay tuned for more updates soon!`;
      cta = cta || `Check out the details and let us know what you think!`;
    }
  }

  // Refinements
  if (options.action === 'shorter') {
    body = language === 'te'
      ? `${hook}\n\n• ${prompt}\n• సూటిగా, వేగంగా ఫలితాన్ని సాధించండి.`
      : language === 'hi'
      ? `${hook}\n\n• ${prompt}\n• सादगी से काम लें, तेजी से आगे बढ़ें।`
      : `${hook}\n\n• ${prompt}\n• Keep it simple, execute fast.`;
  } else if (options.action === 'longer') {
    body = `${body}\n\n` +
      (language === 'te'
        ? `🔍 విస్తృత సమాచారం:\nదీర్ఘకాలిక ఫలితాలను పరిశీలిస్తే, ప్రణాళికాబద్ధంగా పనిచేసే వారు ఎప్పుడూ ముందుంటారు. సమయం కోసం ఎదురుచూడకుండా మీరే అవకాశాలను సృష్టించుకోండి.`
        : language === 'hi'
        ? `🔍 विस्तृत जानकारी:\nलंबे समय के परिणामों को देखें तो स्पष्ट योजना के साथ काम करने वाले लोग हमेशा आगे रहते हैं। समय का इंतजार करने के बजाय अपनी गति से आगे बढ़ें।`
        : `🔍 DEEPER DIVE:\nWhen analyzing long-term outcomes, the data shows that teams who prioritize structured execution outperform those relying purely on inspiration. Don't wait for ideal conditions—create the conditions through action.`);
  }

  // Compose Full Caption
  const fullCaption = `${body}\n\n${cta}`.trim();

  // Alternative variations for one-click testing
  const variations = language === 'te'
    ? [
        `⚡ ${prompt} — ఇక్కడ ఉంది అసలైన రహస్యం!`,
        `ఈ ముఖ్యమైన సమాచారాన్ని మిస్ అవ్వకండి! 📌`,
        `మేము దీన్ని ఎలా సాధించామో ఇక్కడ చూడండి. ✨`,
      ]
    : language === 'hi'
    ? [
        `⚡ ${prompt} — जानिए इसके पीछे की असली वजह!`,
        `इस जरूरी जानकारी को बिल्कुल मिस न करें! 📌`,
        `जानिए हमने इसे कैसे संभव बनाया। ✨`,
      ]
    : [
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
