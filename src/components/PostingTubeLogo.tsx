'use client';

import React from 'react';
import Link from 'next/link';

export interface PostingTubeIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

/**
 * PostingTube Vector Brand Icon
 * A distinctive geometric emblem representing multi-platform publishing,
 * video tube streaming, and automated dispatch.
 */
export const PostingTubeIcon: React.FC<PostingTubeIconProps> = ({
  size = 32,
  className = '',
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform ${className}`}
      {...props}
    >
      <defs>
        {/* Background Gradient: Rich Deep Tech Slate to Emerald Obsidian */}
        <linearGradient id="pt-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0B132B" />
          <stop offset="55%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#064E3B" />
        </linearGradient>

        {/* Main Brand Gradient: Radiant Emerald to Vibrant Mint */}
        <linearGradient id="pt-brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="50%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>

        {/* Play/Publish Symbol Gradient */}
        <linearGradient id="pt-play-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E6FFFA" />
        </linearGradient>

        {/* Drop Shadow Filter */}
        <filter id="pt-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#047857" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Squircle Base */}
      <rect width="36" height="36" rx="9" fill="url(#pt-bg-grad)" />

      {/* Subtle Inner Glow Border for perfect contrast on any background */}
      <rect
        x="0.75"
        y="0.75"
        width="34.5"
        height="34.5"
        rx="8.25"
        stroke="white"
        strokeOpacity="0.14"
        strokeWidth="1.5"
      />

      {/* Left Publisher Column (The 'P' Pillar) */}
      <rect x="8" y="9.5" width="4" height="17" rx="2" fill="url(#pt-brand-grad)" />

      {/* Top Crossbar / Broadcast Beam (The 'T' Beam & 'P' Loop) */}
      <path
        d="M8 11.5C8 10.3954 8.89543 9.5 10 9.5H23C24.1046 9.5 25 10.3954 25 11.5C25 12.6046 24.1046 13.5 23 13.5H10C8.89543 13.5 8 12.6046 8 11.5Z"
        fill="url(#pt-brand-grad)"
      />

      {/* Central Play/Publish Arrow (Forward launch + Video Tube) */}
      <path
        d="M15 15.2C15 14.3854 15.9126 13.8969 16.5946 14.3414L23.9536 19.1414C24.5804 19.5503 24.5804 20.4497 23.9536 20.8586L16.5946 25.6586C15.9126 26.1031 15 25.6146 15 24.8V15.2Z"
        fill="url(#pt-play-grad)"
        filter="url(#pt-shadow)"
      />

      {/* Syndication Signal Arc (Multi-platform broadcast wave) */}
      <path
        d="M26.5 16C27.5 17.2 28 18.5 28 20C28 21.5 27.5 22.8 26.5 24"
        stroke="#34D399"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
};

export interface PostingTubeLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'wordmark';
  theme?: 'dark' | 'light';
  href?: string;
  badge?: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * PostingTube Complete Brand Logo
 * Combines the custom icon and the official wordmark: "PostingTube"
 * (capital P and T, all other letters lowercase).
 */
export const PostingTubeLogo: React.FC<PostingTubeLogoProps> = ({
  size = 'md',
  variant = 'full',
  theme = 'light',
  href,
  badge,
  className = '',
  onClick,
}) => {
  const iconSizes = {
    sm: 24,
    md: 32,
    lg: 38,
    xl: 46,
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  const isInteractive = Boolean(href || onClick);

  const content = (
    <div
      className={`inline-flex items-center space-x-2.5 select-none ${
        isInteractive ? 'cursor-pointer group' : ''
      } ${className}`}
    >
      {variant !== 'wordmark' && (
        <PostingTubeIcon
          size={iconSizes[size]}
          className={`shadow-xs ${isInteractive ? 'group-hover:scale-105 transition-transform' : ''}`}
        />
      )}

      {variant !== 'icon' && (
        <div className="flex items-center space-x-1.5">
          <span
            className={`font-bold tracking-tight ${textSizes[size]} ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            } ${isInteractive ? 'group-hover:text-black transition-colors' : ''}`}
          >
            Posting<span className="text-emerald-600">Tube</span>
          </span>

          {badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 leading-none">
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className="inline-flex items-center group cursor-pointer focus:outline-none"
        title="PostingTube"
      >
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center group cursor-pointer text-left bg-transparent border-0 p-0 focus:outline-none"
        title="PostingTube"
      >
        {content}
      </button>
    );
  }

  return content;
};

export default PostingTubeLogo;
