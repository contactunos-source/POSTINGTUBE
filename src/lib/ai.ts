import { SocialPlatform } from '@/types/social';

export interface AiGenerateOptions {
  prompt: string;
  platform?: SocialPlatform;
  tone?: 'professional' | 'engaging' | 'viral' | 'concise' | 'humorous';
  includeHashtags?: boolean;
  includeEmojis?: boolean;
}

export async function generateSocialContent(options: AiGenerateOptions): Promise<{
  caption: string;
  hashtags: string[];
  variations: string[];
}> {
  // Simulate AI latency for realistic UX
  await new Promise((resolve) => setTimeout(resolve, 800));

  const prompt = options.prompt.trim();
  const tone = options.tone || 'engaging';

  let caption = '';
  let hashtags: string[] = [];

  if (options.platform === 'twitter') {
    caption = `🚀 ${prompt}\n\nKey takeaway: Consistency beats intensity every single day.\n\nWhat's your take on this?`;
    hashtags = ['#buildinpublic', '#tech', '#growth', '#saas'];
  } else if (options.platform === 'instagram') {
    caption = `✨ ${prompt}\n\nDrop a ❤️ if this resonates with your workflow!\n.\n.\nSave this post for later reference 📌`;
    hashtags = ['#creators', '#growthmindset', '#digitalmarketing', '#socialmediatips', '#founder'];
  } else if (options.platform === 'linkedin') {
    caption = `I’ve been thinking deeply about this:\n\n${prompt}\n\nHere are 3 critical lessons any team should remember:\n1. Execution is everything.\n2. Leverage distribution channels early.\n3. Keep the feedback loop tight.\n\nAgree or disagree? Let’s discuss in the comments below.`;
    hashtags = ['#leadership', '#strategy', '#entrepreneurship', '#innovation'];
  } else {
    // General
    caption = `${prompt}\n\nExcited to share this with our community. Check out the link in bio or below!`;
    hashtags = ['#updates', '#community', '#trending'];
  }

  if (options.includeHashtags && hashtags.length > 0) {
    caption += `\n\n${hashtags.join(' ')}`;
  }

  const variations = [
    `Quick thought on ${prompt}: The best time to start was yesterday, the next best is right now!`,
    `Stop scrolling! Here is what you need to know about ${prompt}.`,
    `Behind the scenes: How we tackle ${prompt} with our core team.`,
  ];

  return {
    caption,
    hashtags,
    variations,
  };
}
