'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface SpiderManLoadingScreenProps {
  message?: string;
}

/**
 * SpiderManLoadingScreen
 * Replaces the default box logo loading screen on page refresh.
 * Features Spider-Man hanging by a web thread passing off the top of the screen,
 * a middle web thread holding the "Loading your PostingTube session..." indicator,
 * and the silhouette of the girl hanging suspended below.
 */
export const SpiderManLoadingScreen: React.FC<SpiderManLoadingScreenProps> = ({
  message = 'Loading your PostingTube session...',
}) => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white overflow-hidden select-none font-sans">
      <style>{`
        @keyframes gentleSway {
          0%, 100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(0.65deg);
          }
        }
        .spider-sway {
          transform-origin: 48.6% 0px;
          animation: gentleSway 5.5s ease-in-out infinite;
        }
      `}</style>

      {/* Top thread connecting to the absolute top of the screen (passes away from screen) */}
      <div
        className="absolute top-0 w-[1.5px] bg-black pointer-events-none z-0"
        style={{
          left: '50%',
          transform: 'translateX(calc(-50% - 2.5px))',
          height: '50vh',
        }}
      />

      {/* Main Hanging Composition Container */}
      <div
        className="relative z-10 spider-sway flex flex-col items-center justify-center"
        style={{
          height: 'min(760px, 86vh)',
        }}
      >
        <div className="relative h-full aspect-[576/1024] flex items-center justify-center">
          {/* Transparent High-Quality Silhouette: Spider-Man hanging & Girl */}
          <img
            src="/images/spiderman-loading.png"
            alt="Spider-Man Loading"
            draggable={false}
            className="w-full h-full object-contain pointer-events-none select-none"
          />

          {/* Loading Indicator Pill - Centered exactly on the middle web thread */}
          <div
            className="absolute z-20 flex items-center space-x-2.5 px-4 py-2 rounded-full bg-white/95 backdrop-blur-xs border border-gray-200/90 shadow-sm"
            style={{
              top: '65.6%',
              left: '48.61%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <Loader2 className="w-4 h-4 animate-spin text-black shrink-0" />
            <span className="text-xs font-semibold text-gray-800 tracking-wide whitespace-nowrap">
              {message}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
