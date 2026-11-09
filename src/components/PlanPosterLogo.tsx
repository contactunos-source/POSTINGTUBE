'use client';

import React from 'react';
import Link from 'next/link';
import { BRAND } from '@/lib/brandConfig';

export interface PlanPosterIconProps {
  size?: number | string;
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
  variant?: 'silhouette' | 'boxed';
}

/**
 * Plan Poster Bird Icon
 * Distinctive flying bird silhouette representing swift dispatch, elevation, and multi-channel scheduling.
 */
export const PlanPosterIcon: React.FC<PlanPosterIconProps> = ({
  size = 36,
  className = '',
  theme = 'light',
  variant = 'silhouette',
}) => {
  const numericSize = typeof size === 'number' ? size : parseInt(String(size), 10) || 36;

  if (variant === 'boxed') {
    return (
      <div
        className={`rounded-xl bg-black flex items-center justify-center shrink-0 shadow-xs ${className}`}
        style={{ width: numericSize, height: numericSize }}
      >
        <img
          src="/images/plan-poster-bird-white.png"
          alt="Plan Poster"
          className="w-[78%] h-[78%] object-contain select-none"
          draggable={false}
        />
      </div>
    );
  }

  const src =
    theme === 'dark'
      ? '/images/plan-poster-bird-white.png'
      : '/images/plan-poster-bird-black.png';

  return (
    <img
      src={src}
      alt="Plan Poster"
      draggable={false}
      style={{ width: numericSize, height: numericSize }}
      className={`object-contain select-none shrink-0 transition-transform ${className}`}
    />
  );
};

export interface PlanPosterLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'wordmark';
  theme?: 'dark' | 'light';
  href?: string;
  badge?: string;
  className?: string;
  iconVariant?: 'silhouette' | 'boxed';
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * Plan Poster Complete Brand Logo
 * Combines the bird emblem and official wordmark: "Plan Poster"
 */
export const PlanPosterLogo: React.FC<PlanPosterLogoProps> = ({
  size = 'md',
  variant = 'full',
  theme = 'light',
  href,
  badge,
  className = '',
  iconVariant = 'silhouette',
  onClick,
}) => {
  const iconSizes = {
    sm: 30,
    md: 40,
    lg: 50,
    xl: 60,
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
        <PlanPosterIcon
          size={iconSizes[size]}
          theme={theme}
          variant={iconVariant}
          className={`${isInteractive ? 'group-hover:scale-105 transition-transform' : ''}`}
        />
      )}

      {variant !== 'icon' && (
        <div className="flex items-center space-x-1.5">
          <span
            className={`font-bold tracking-tight ${textSizes[size]} ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            } ${isInteractive ? 'group-hover:text-black transition-colors' : ''}`}
          >
            Plan <span className="text-emerald-600">Poster</span>
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
        title="Plan Poster"
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
        title="Plan Poster"
      >
        {content}
      </button>
    );
  }

  return content;
};

// Aliases for seamless backward compatibility
export const PostingTubeIcon = PlanPosterIcon;
export const PostingTubeLogo = PlanPosterLogo;

export default PlanPosterLogo;
