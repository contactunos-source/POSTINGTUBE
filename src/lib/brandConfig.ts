/**
 * Plan Poster - Central Brand Identity Configuration
 * Single source of truth for all brand names, slogans, domains, and asset paths.
 */
export const BRAND = {
  name: 'Plan Poster',
  shortName: 'Plan Poster',
  uppercaseName: 'PLAN POSTER',
  legalName: 'Plan Poster SaaS',
  domain: 'planposter.com',
  supportEmail: 'support@planposter.com',
  adminEmail: 'admin@planposter.com',
  tagline: 'Multi-Platform Social Media Scheduling, Management & Publishing',
  description: 'Schedule, edit, and publish content seamlessly across Instagram, Facebook, YouTube, LinkedIn, and Twitter from one unified workspace.',
  copyright: `© ${new Date().getFullYear()} Plan Poster. All rights reserved.`,
  assets: {
    logoBlack: '/images/plan-poster-bird-black.png',
    logoWhite: '/images/plan-poster-bird-white.png',
    logoDarkBoxed: '/images/plan-poster-logo-dark.png',
    favicon: '/icon.svg',
    birdSvg: '/plan-poster-bird.svg',
  },
} as const;

export default BRAND;
