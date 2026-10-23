'use client';

import React, { useState } from 'react';

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  avatarUrl,
  size = 'md',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  // Compute initials (e.g., "SKY SHORTS" -> "SK", "John" -> "JO")
  const initials = (() => {
    if (!name) return 'PB';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  })();

  // Optimize Google avatar URLs for high-resolution display
  const optimizedUrl = (() => {
    if (!avatarUrl) return null;
    if (avatarUrl.includes('googleusercontent.com') && avatarUrl.includes('=s96-c')) {
      return avatarUrl.replace('=s96-c', '=s256-c');
    }
    return avatarUrl;
  })();

  const sizeClasses = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-7 h-7 text-xs',
    lg: 'w-9 h-9 text-sm',
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;

  if (optimizedUrl && !imageError) {
    return (
      <div
        className={`relative ${currentSizeClass} shrink-0 rounded-full overflow-hidden bg-white border border-gray-200/90 shadow-2xs flex items-center justify-center ${className}`}
      >
        <img
          src={optimizedUrl}
          alt={name || 'User logo'}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // Crisp monogram fallback with subtle gradient and border
  return (
    <div
      className={`relative ${currentSizeClass} shrink-0 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold shadow-2xs flex items-center justify-center border border-emerald-600/20 tracking-wider ${className}`}
      title={name}
    >
      <span>{initials}</span>
    </div>
  );
};
