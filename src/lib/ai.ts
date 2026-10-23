import { SocialPlatform } from '@/types/social';

export type CaptionLanguage = 'en' | 'te' | 'hi';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
] as const;

export interface AiGenerateOptions {
  prompt: string;
  platform?: SocialPlatform;
  language?: CaptionLanguage | string;
  action?: 'generate' | 'shorter' | 'longer' | 'regenerate';
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

// Platform-tailored hashtag pools (modern, non-spammy)
const PLATFORM_HASHTAGS: Record<SocialPlatform, string[]> = {
  instagram: ['#socialmediatips', '#contentcreator', '#growthmindset', '#creators', '#digitalmarketing', '#creatorstrategy', '#reels'],
  youtube: ['#shorts', '#youtubetips', '#contentcreation', '#techguide', '#growthstrategy', '#tutorial'],
  facebook: ['#community', '#insights', '#entrepreneurship', '#discussion', '#productivity', '#innovation'],
  linkedin: ['#leadership', '#innovation', '#technology', '#strategy', '#futureofwork', '#productivity'],
  threads: ['#threads', '#buildinpublic', '#creators', '#techcommunity', '#thoughts'],
  pinterest: ['#aesthetic', '#inspiration', '#productivitytips', '#designinspiration', '#howto', '#growth'],
  tiktok: ['#fyp', '#foryoupage', '#techfok', '#creatorsoftiktok', '#trending', '#learnontiktok'],
  bluesky: ['#bluesky', '#tech', '#openweb', '#buildinpublic'],
  twitter: ['#buildinpublic', '#tech', '#growth', '#saas', '#founder'],
};

// Platform SEO search keywords
const PLATFORM_KEYWORDS: Record<SocialPlatform, string[]> = {
  youtube: ['how to', 'tutorial', 'best practices', '2026 guide', 'step-by-step', 'workflow', 'tips'],
  pinterest: ['ideas', 'aesthetic', 'checklist', 'inspiration', 'template', 'guide'],
  instagram: ['tips', 'hack', 'behind the scenes', 'creator tool', 'motivation'],
  facebook: ['community update', 'question of the day', 'discussion', 'announcement'],
  linkedin: ['case study', 'key takeaways', 'industry trends', 'framework', 'leadership'],
  threads: ['daily thought', 'perspective', 'creator log'],
  tiktok: ['life hack', 'quick guide', 'watch this'],
  bluesky: ['discussion', 'tech log', 'updates'],
  twitter: ['insights', 'lessons', 'framework'],
};

/**
 * Intelligent client/server wrapper:
 * Attempts to call the server API (/api/ai/generate) if running in the browser
 * so any server-side GEMINI_API_KEY / OPENAI_API_KEY can be leveraged.
 * Seamlessly falls back to our advanced creative offline generation engine.
 */
export async function generateSocialContent(
  options: AiGenerateOptions
): Promise<AiGeneratedResult> {
  // If in browser, try calling /api/ai/generate
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
    } catch {
      // Fall through to offline dynamic engine
    }
  }

  // Fallback to our high-quality dynamic copywriting engine
  return generateDynamicContent(options);
}

/**
 * High-performing dynamic copywriting engine:
 * Extracts prompt nuance, detects intent, and generates creative, engaging, non-generic copy.
 */
export function generateDynamicContent(
  options: AiGenerateOptions
): AiGeneratedResult {
  const platform: SocialPlatform = options.platform || 'instagram';
  const rawPrompt = options.prompt?.trim() || 'Exciting new product update and workflow improvements';
  const language = (options.language as CaptionLanguage) || 'en';
  const action = options.action || 'generate';

  // Extract core keywords from prompt
  const words = rawPrompt
    .replace(/[^\w\s]/gi, '')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .map((w) => w.toLowerCase());
  const promptKeywords = Array.from(new Set(words)).slice(0, 5);

  const parsedKeywords = Array.from(
    new Set([...promptKeywords, ...(PLATFORM_KEYWORDS[platform] || []).slice(0, 4)])
  ).slice(0, 8);

  // Intent detection
  const lower = rawPrompt.toLowerCase();
  const isLaunch = /launch|announc|release|introduc|brand new|feature|update|drop/.test(lower);
  const isTips = /tip|mistake|secret|how to|guide|hack|lesson|step|learn|way/.test(lower);
  const isStory = /built|journey|story|fail|struggle|started|experience|behind the scenes/.test(lower);
  const isThought = /unpopular opinion|future|truth|why|trend|think|perspective|agree/.test(lower);

  let title = '';
  let hook = '';
  let body = '';
  let cta = '';
  let hashtags: string[] = [...(PLATFORM_HASHTAGS[platform] || [])];
  let threadSuggestions: string[] | undefined = undefined;

  // Clean prompt subject (capitalized)
  const cleanSubject = rawPrompt.charAt(0).toUpperCase() + rawPrompt.slice(1).replace(/\.+$/, '');

  // ==================== TELUGU (తెలుగు) ====================
  if (language === 'te') {
    if (platform === 'youtube') {
      title = isLaunch
        ? `🚀 సరికొత్త ఫీచర్: ${cleanSubject.slice(0, 50)} | పూర్తి వివరాలు (2026)`
        : isTips
        ? `💡 ${cleanSubject.slice(0, 45)}: మీరు తప్పక తెలుసుకోవాల్సిన 3 రహస్యాలు!`
        : `${cleanSubject.slice(0, 50)} | పూర్తి గైడ్ & వివరణ (Step-by-Step)`;

      hook = `ఈ వీడియోలో మనం "${rawPrompt}" గురించి సమగ్రంగా, సులభంగా అర్థమయ్యే రీతిలో తెలుసుకుందాం! 🌟`;

      body = `${hook}\n\n` +
        `⏱️ ఈ వీడియోలోని ముఖ్య భాగాలు:\n` +
        `0:00 - పరిచయం & దీని ప్రాముఖ్యత\n` +
        `1:20 - మీరు ఎదుర్కొనే ప్రధాన సవాళ్లు\n` +
        `3:45 - సరైన పరిష్కారం & ప్రత్యక్ష అమలు విధానం\n` +
        `6:10 - ఫలితాలు & ఉత్తమ సూచనలు\n\n` +
        `💡 ముఖ్య గమనిక:\nసరైన ప్రణాళికతో పని చేస్తే ఫలితాలు వేగంగా వస్తాయి. మీ సందేహాలను కామెంట్స్‌లో అడగండి!`;

      cta = `🔔 ఇలాంటి మరిన్ని ఉపయోగకరమైన వీడియోల కోసం సబ్‌స్క్రైబ్ చేసుకోండి మరియు లైక్ చేయండి! 👇`;
      hashtags = ['#తెలుగు', '#వీడియో', '#ట్రెండింగ్', '#shorts', '#telugu', '#tips'];
    } else if (platform === 'facebook') {
      hook = isLaunch
        ? `🎉 మన కమ్యూనిటీ కోసం ఒక ప్రత్యేకమైన అప్‌డేట్! ✨`
        : `💬 స్నేహితులారా, ఒక ముఖ్యమైన విషయం గురించి మాట్లాడుకుందాం...`;

      body = `${hook}\n\n` +
        `${cleanSubject}.\n\n` +
        `మనం ప్రతిరోజూ చేసే చిన్న చిన్న ప్రయత్నాలే భవిష్యత్తులో గొప్ప విజయాలను తెచ్చిపెడతాయి. నా అనుభవంలో ఇది చాలా స్పష్టంగా అర్థమైంది.\n\n` +
        `ఈ అంశంపై మీ వ్యక్తిగత అభిప్రాయం ఏమిటి?`;

      cta = `మీ ఆలోచనలను క్రింద కామెంట్స్‌లో పంచుకోండి! 👇💬`;
      hashtags = ['#తెలుగు', '#కమ్యూనిటీ', '#ట్రెండింగ్', '#ఆలోచనలు'];
    } else if (platform === 'linkedin') {
      title = `ఒక ముఖ్యమైన ప్రొఫెషనల్ పాఠం: ${cleanSubject.slice(0, 40)}`;
      hook = `నిరంతర సాధన మరియు క్రమశిక్షణ ఎప్పుడూ అత్యుత్తమ ఫలితాలను ఇస్తాయి.`;

      body = `${hook}\n\n` +
        `${cleanSubject}.\n\n` +
        `ఈ విషయంలో మేము నేర్చుకున్న 3 ముఖ్యమైన విషయాలు:\n\n` +
        `• ప్రాథమిక అంశాలపై ఎక్కువ శ్రద్ధ పెట్టడం.\n` +
        `• సమయాన్ని ఆదా చేసే ఆధునిక పద్ధతులను అమలు చేయడం.\n` +
        `• ఫలితాల కంటే ప్రక్రియను నమ్ముతూ ముందుకు సాగడం.\n\n` +
        `మంచి ప్రణాళికతో ముందడుగు వేస్తే ఏ లక్ష్యమైనా సులభమవుతుంది.`;

      cta = `ఈ విషయంలో మీ సంస్థ లేదా వ్యక్తిగత అనుభవం ఎలా ఉంది? తెలియజేయండి.`;
      hashtags = ['#తెలుగు', '#Leadership', '#Growth', '#Productivity'];
    } else {
      // Instagram & General
      hook = isLaunch
        ? `🚀 ఒక అద్భుతమైన శుభవార్త! చివరకు ఇది సాధ్యమైంది! ✨`
        : isTips
        ? `⚡ మీ విలువైన సమయాన్ని ఆదా చేసే 3 అద్భుతమైన టిప్స్ ఇక్కడ ఉన్నాయి! 👇`
        : `✨ "${rawPrompt}" పై ఒక ప్రత్యేకమైన ఆలోచన:`;

      body = `${hook}\n\n` +
        `${cleanSubject}.\n\n` +
        `చాలామంది ఆలోచిస్తూ సమయం వృధా చేస్తారు. కానీ విజేతలు తక్షణమే కార్యాచరణలోకి దిగుతారు:\n\n` +
        `1️⃣ సంక్లిష్టత కంటే సరళత ఎప్పుడూ వేగంగా పనిచేస్తుంది.\n` +
        `2️⃣ నిలకడగా పని చేయడం వల్ల దీర్ఘకాలిక ఫలితాలు వస్తాయి.\n` +
        `3️⃣ చిన్న విజయాలను కూడా అభినందిస్తూ ముందుకు సాగండి.\n\n` +
        `మీరు ఎప్పటినుండో చేయాలనుకుంటున్న పనిని ఈరోజే ప్రారంభించండి!`;

      cta = `👉 ఈ పోస్ట్ నచ్చితే లైక్ ❤️ చేయండి!\n📌 భవిష్యత్తు కోసం సేవ్ చేసుకోండి.\n💬 మీ ఆలోచనలను కామెంట్ చేయండి!`;
      hashtags = ['#తెలుగు', '#క్రియేటర్స్', '#ఇన్‌స్టాగ్రామ్', '#రీల్స్', '#ట్రెండింగ్', '#telugu'];
    }
  }

  // ==================== HINDI (हिन्दी) ====================
  else if (language === 'hi') {
    if (platform === 'youtube') {
      title = isLaunch
        ? `🚀 नया अपडेट: ${cleanSubject.slice(0, 50)} | पूरी जानकारी (2026)`
        : isTips
        ? `💡 ${cleanSubject.slice(0, 45)}: 3 जरूरी बातें जो आपको पता होनी चाहिए!`
        : `${cleanSubject.slice(0, 50)} | आसान और पूरा Step-by-Step गाइड`;

      hook = `आज के वीडियो में हम "${rawPrompt}" के बारे में गहराई से और बहुत सरल भाषा में बात करेंगे! 🌟`;

      body = `${hook}\n\n` +
        `⏱️ मुख्य बिंदु और टाइमस्टैम्प्स:\n` +
        `0:00 - शुरुआत और परिचय\n` +
        `1:15 - सबसे बड़ी चुनौतियाँ और गलतियाँ\n` +
        `3:40 - सही रणनीति और आसान समाधान\n` +
        `6:20 - परिणाम और आगे की राह\n\n` +
        `💡 सबसे जरूरी सबक:\nअगर आपकी योजना सही है, तो कोई भी काम कठिन नहीं रहता। वीडियो पूरा देखें और अपने सवाल कमेंट में पूछें!`;

      cta = `🔔 ऐसे ही और बेहतरीन वीडियो देखने के लिए चैनल को सब्सक्राइब करें और लाइक करें! 👇`;
      hashtags = ['#हिंदी', '#वीडियो', '#ट्रेंडिंग', '#टिप्स', '#shorts', '#hindi'];
    } else if (platform === 'facebook') {
      hook = isLaunch
        ? `🎉 हमारे पूरे परिवार के लिए एक खास घोषणा! ✨`
        : `💬 दोस्तों, आज एक बहुत जरूरी विषय पर बात करने का मन हुआ...`;

      body = `${hook}\n\n` +
        `${cleanSubject}.\n\n` +
        `सफलता की राह में सबसे बड़ी बात होती है सही दिशा में निरंतर प्रयास। जब आप अपने काम को ईमानदारी और अनुशासन से करते हैं, तो रास्ते अपने आप बनते जाते हैं।\n\n` +
        `आप इस बारे में क्या सोचते हैं?`;

      cta = `कमेंट बॉक्स में अपनी राय जरूर साझा करें! 👇💬`;
      hashtags = ['#हिंदी', '#समुदाय', '#विचार', '#ट्रेंडिंग'];
    } else if (platform === 'linkedin') {
      title = `कार्यक्षेत्र का एक बड़ा सबक: ${cleanSubject.slice(0, 40)}`;
      hook = `निरंतरता और स्पष्टता ही किसी भी बड़ी उपलब्धि की नींव होती है।`;

      body = `${hook}\n\n` +
        `${cleanSubject}.\n\n` +
        `इस पूरी यात्रा से हमें 3 अहम बातें सीखने को मिलीं:\n\n` +
        `• बुनियादी बातों को कभी नजरअंदाज न करें।\n` +
        `• अपनी कार्यप्रणाली को सरल और प्रभावी बनाएं।\n` +
        `• त्वरित परिणामों के बजाय दीर्घकालिक मूल्य पर ध्यान दें।\n\n` +
        `सही सोच और स्पष्ट दिशा किसी भी टीम को असाधारण बना सकती है।`;

      cta = `इस विषय पर आपका क्या अनुभव रहा है? कमेंट्स में अपनी राय अवश्य साझा करें।`;
      hashtags = ['#हिंदी', '#Leadership', '#Growth', '#Professional'];
    } else {
      // Instagram & General
      hook = isLaunch
        ? `🚀 बहुत दिनों की मेहनत के बाद, आखिरकार यह तैयार है! ✨`
        : isTips
        ? `⚡ सोशल मीडिया पर घंटों का समय बचाने के लिए ये 3 बातें याद रखें! 👇`
        : `✨ "${rawPrompt}" पर एक नया और उपयोगी दृष्टिकोण:`;

      body = `${hook}\n\n` +
        `${cleanSubject}.\n\n` +
        `अधिकतर लोग सिर्फ सोचते रहते हैं, लेकिन जो आगे बढ़ते हैं वे काम शुरू करते हैं:\n\n` +
        `1️⃣ सादगी हमेशा जटिलता से ज्यादा तेजी से काम करती है।\n` +
        `2️⃣ हर दिन की छोटी कोशिशें मिलकर बड़ा बदलाव लाती हैं।\n` +
        `3️⃣ अपने लक्ष्य पर विश्वास रखें और लगातार सीखते रहें।\n\n` +
        `आज ही अपने अगले बड़े कदम की शुरुआत कीजिए!`;

      cta = `👉 अगर यह बात पसंद आई तो लाइक ❤️ करें!\n📌 भविष्य के लिए सेव करें।\n💬 कमेंट में अपनी राय बताएं!`;
      hashtags = ['#हिंदी', '#क्रिएटर्स', '#इंस्टाग्राम', '#रील्स', '#ट्रेंडिंग', '#hindi'];
    }
  }

  // ==================== ENGLISH (Default) ====================
  else {
    if (platform === 'youtube') {
      title = isLaunch
        ? `🚀 Introducing ${cleanSubject.slice(0, 50)} (Full Breakdown)`
        : isTips
        ? `Stop Doing This Wrong! 💡 ${cleanSubject.slice(0, 45)}`
        : `${cleanSubject.slice(0, 55)} | Step-by-Step Guide (2026)`;

      hook = isLaunch
        ? `Today we are thrilled to reveal ${rawPrompt.toLowerCase()}. Here is everything you need to know!`
        : `In this video, we break down the exact workflow behind ${rawPrompt.toLowerCase()} so you can implement it in minutes.`;

      body = `${hook}\n\n` +
        `⏱️ CHAPTERS & TIMESTAMPS:\n` +
        `0:00 - Introduction & The Big Problem\n` +
        `1:15 - Why Traditional Methods Fail\n` +
        `3:40 - The Step-by-Step Framework\n` +
        `6:20 - Real Examples, Walkthrough & Best Practices\n` +
        `8:45 - Key Takeaways & Action Plan\n\n` +
        `💡 CORE HIGHLIGHT:\n` +
        `Success isn't about working more hours—it's about building repeatable leverage into your workflow.`;

      cta = `🔔 Subscribe to the channel for weekly deep dives, drop a like if this brought value, and let me know your thoughts in the comments! 👇`;
    } else if (platform === 'instagram') {
      hook = isLaunch
        ? `🚀 It's finally here, and it changes everything.`
        : isTips
        ? `⚡ 90% of people get this wrong about ${rawPrompt.toLowerCase()}...`
        : isStory
        ? `✨ A behind-the-scenes look at how we approached ${rawPrompt.toLowerCase()}:`
        : `🔥 Here is the real truth about ${rawPrompt.toLowerCase()}:`;

      body = `${hook}\n\n` +
        `${cleanSubject}.\n\n` +
        `When you strip away the noise, here are the 3 non-negotiables that actually move the needle:\n\n` +
        `1️⃣ Focus on clarity before scale. If it's confusing, it won't convert.\n` +
        `2️⃣ Consistency beats intensity every single time.\n` +
        `3️⃣ Automate the repetitive friction so you can focus on creative excellence.\n\n` +
        `Save yourself the guesswork and test this framework on your next project.`;

      cta = `👉 Double tap ❤️ if this resonated!\n📌 Save this post for quick reference.\n💬 Drop your biggest takeaway in the comments below! 👇`;
    } else if (platform === 'linkedin') {
      title = `A strategic perspective on ${cleanSubject.slice(0, 40)}`;
      hook = isLaunch
        ? `Proud to share a major milestone: ${cleanSubject}.`
        : `Most teams overcomplicate ${rawPrompt.toLowerCase()}. Here is what actually delivers results.`;

      body = `${hook}\n\n` +
        `In today's fast-moving environment, the winners aren't those who move fastest in the wrong direction—they're the teams that engineer clarity into their systems.\n\n` +
        `3 high-leverage principles we rely on:\n\n` +
        `• Eliminate unnecessary friction: Focus 80% of resources on the core constraint.\n` +
        `• Protect focus: Modern tools should remove cognitive overload, not create it.\n` +
        `• Shorten feedback loops: Measure real outcomes instead of vanity metrics.\n\n` +
        `When systems work seamlessly in the background, your team is free to do their best creative work.`;

      cta = `What has been your team's experience with this? I'd love to hear your perspectives in the comments.`;
    } else if (platform === 'facebook') {
      hook = isLaunch
        ? `Exciting news to share with our amazing community today! 🎉`
        : `Let's have a quick, honest conversation about ${rawPrompt.toLowerCase()}...`;

      body = `${hook}\n\n` +
        `${cleanSubject}.\n\n` +
        `Over the past few weeks, we've had countless conversations about what truly makes a difference. The biggest insight?\n\n` +
        `Small, disciplined daily habits create monumental compound gains over time.\n\n` +
        `We'd love to know how you're approaching this in your own journey!`;

      cta = `Drop a comment below and let's discuss! 👇💬`;
    } else if (platform === 'threads' || platform === 'bluesky') {
      hook = isThought
        ? `Hot take on ${rawPrompt.toLowerCase()}:`
        : `Key realization from this week:`;

      body = `${hook}\n\n${cleanSubject}.\n\nSimplicity scales. Complexity breaks. Build the system once, let momentum do the rest. 🚀`;
      cta = `Agree or disagree? Drop your thoughts below 👇`;
      hashtags = hashtags.slice(0, 3);
    } else if (platform === 'pinterest') {
      title = `${cleanSubject.slice(0, 50)} | Inspiration & Step-by-Step Guide`;
      hook = `Looking for the best way to handle ${rawPrompt.toLowerCase()}? Here is your complete guide.`;
      body = `${hook}\n\n` +
        `Discover actionable ideas, templates, and proven strategies to master ${rawPrompt.toLowerCase()} effortlessly.\n\n` +
        `• Step-by-step roadmap\n` +
        `• Real examples\n` +
        `• Expert tips for maximum productivity`;
      cta = `📌 Save this pin to your favorite board and click the link to read the full breakdown!`;
    } else {
      hook = `Exciting update: ${cleanSubject}`;
      body = `${hook}\n\nSharing our latest progress and insights with the community.\n\nStay tuned for more updates soon!`;
      cta = `Let us know what you think in the comments! 👇`;
    }
  }

  // Refinements based on user action
  if (action === 'shorter') {
    if (language === 'te') {
      body = `${hook}\n\n• ${cleanSubject}\n• సరళమైన పద్ధతి, వేగవంతమైన ఫలితాలు.`;
    } else if (language === 'hi') {
      body = `${hook}\n\n• ${cleanSubject}\n• सादगी से काम लें, तेजी से आगे बढ़ें।`;
    } else {
      body = `${hook}\n\n• ${cleanSubject}\n• High impact, zero fluff. Build systems that scale.`;
    }
  } else if (action === 'longer') {
    if (language === 'te') {
      body = `${body}\n\n` +
        `🔍 లోతైన విశ్లేషణ:\nదీర్ఘకాలిక ఫలితాలను పరిశీలిస్తే, క్రమశిక్షణతో ప్రణాళికను అమలు చేసే వారు ఎల్లప్పుడూ ఇతరులకంటే ముందుంటారు. సరైన సాధనాలను ఉపయోగించడం వల్ల ఉత్పాదకత రెట్టింపు అవుతుంది.`;
    } else if (language === 'hi') {
      body = `${body}\n\n` +
        `🔍 विस्तृत विश्लेषण:\nलंबे समय के नतीजों को देखें तो स्पष्ट योजना और निरंतरता रखने वाले लोग हमेशा सबसे आगे रहते हैं। सही टूल्स का इस्तेमाल आपकी उत्पादकता को कई गुना बढ़ा देता है।`;
    } else {
      body = `${body}\n\n` +
        `🔍 DEEPER DIVE & CASE STUDY:\nWhen examining long-term outcomes, data consistently shows that operators who systemize execution outperform those relying purely on bursts of motivation. Test small, iterate fast, and measure results weekly.`;
    }
  }

  // Compose Full Caption
  const fullCaption = `${body}\n\n${cta}`.trim();

  // Fresh alternative hooks / variations
  const variations = language === 'te'
    ? [
        `⚡ ${cleanSubject} — ఇక్కడ ఉంది అసలైన రహస్యం!`,
        `ఈ ముఖ్యమైన సమాచారాన్ని మిస్ అవ్వకండి! 📌`,
        `మంచి ఫలితాల కోసం దీన్ని తప్పక పాటించండి ✨`,
      ]
    : language === 'hi'
    ? [
        `⚡ ${cleanSubject} — जानिए इसके पीछे की असली वजह!`,
        `इस जरूरी जानकारी को बिल्कुल मिस न करें! 📌`,
        `सफलता के लिए इन बातों को अपनी आदत बनाएं ✨`,
      ]
    : [
        `⚡ ${cleanSubject} — the playbook nobody talks about.`,
        `Stop scrolling: why our approach to ${rawPrompt.toLowerCase()} changed everything.`,
        `Behind the scenes: the exact framework we used to master this.`,
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
