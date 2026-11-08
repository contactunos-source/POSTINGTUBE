'use client';

import { useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export const THEME_STORAGE_KEY = 'postingtube_theme';

/**
 * Returns stored user theme ('light' | 'dark' | 'system'), defaulting to 'system'.
 */
export function getStoredTheme(): ThemeMode {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
    } catch {}
  }
  return 'system';
}

/**
 * Checks the device/OS color scheme preference.
 */
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

/**
 * Resolves current active theme to either 'light' or 'dark'.
 */
export function getResolvedTheme(mode?: ThemeMode): 'light' | 'dark' {
  const target = mode || getStoredTheme();
  if (target === 'dark') return 'dark';
  if (target === 'light') return 'light';
  return getSystemTheme();
}

let transitionTimeout: NodeJS.Timeout | null = null;

/**
 * Applies the theme to the <html> document element with butter-smooth animation.
 */
export function applyTheme(mode: ThemeMode, withTransition: boolean = true): void {
  if (typeof window === 'undefined') return;

  const resolved = mode === 'system' ? getSystemTheme() : mode;
  const root = document.documentElement;

  if (withTransition) {
    root.classList.add('theme-transition');
    if (transitionTimeout) clearTimeout(transitionTimeout);
    transitionTimeout = setTimeout(() => {
      root.classList.remove('theme-transition');
    }, 350);
  }

  if (resolved === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  }

  window.dispatchEvent(
    new CustomEvent('postingtube:theme-changed', {
      detail: { theme: mode, resolved },
    })
  );
}

/**
 * Persists theme preference and updates active state across the entire window.
 */
export function setTheme(mode: ThemeMode): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.warn('Failed to persist theme:', e);
    }
  }
  applyTheme(mode, true);
}

/**
 * React hook to reactively subscribe to active theme and handle live updates.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => getStoredTheme());
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => getResolvedTheme(theme));

  useEffect(() => {
    // Initial sync
    const current = getStoredTheme();
    setThemeState(current);
    setResolvedTheme(getResolvedTheme(current));
    applyTheme(current, false);

    const handleThemeChange = () => {
      const updated = getStoredTheme();
      setThemeState(updated);
      setResolvedTheme(getResolvedTheme(updated));
    };

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (getStoredTheme() === 'system') {
        const res = getSystemTheme();
        setResolvedTheme(res);
        applyTheme('system', true);
      }
    };

    window.addEventListener('postingtube:theme-changed', handleThemeChange);
    window.addEventListener('storage', handleThemeChange);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange);
    } else {
      (mediaQuery as any).addListener(handleSystemChange);
    }

    return () => {
      window.removeEventListener('postingtube:theme-changed', handleThemeChange);
      window.removeEventListener('storage', handleThemeChange);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemChange);
      } else {
        (mediaQuery as any).removeListener(handleSystemChange);
      }
    };
  }, []);

  const changeTheme = (newMode: ThemeMode) => {
    setTheme(newMode);
    setThemeState(newMode);
    setResolvedTheme(getResolvedTheme(newMode));
  };

  return {
    theme,
    resolvedTheme,
    setTheme: changeTheme,
    isDark: resolvedTheme === 'dark',
  };
}
