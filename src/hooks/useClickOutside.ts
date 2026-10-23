import { useEffect, RefObject } from 'react';

export interface UseClickOutsideOptions {
  enabled?: boolean;
  onEscape?: () => void;
  /**
   * Optional refs that should be ignored when determining outside clicks
   * (useful for toggle buttons that trigger the menu).
   */
  ignoreRefs?: Array<RefObject<HTMLElement | null>>;
}

/**
 * Custom hook to detect clicks/taps outside a referenced DOM element
 * and handle Escape key dismissal across all browsers and devices.
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  handler: () => void,
  options: UseClickOutsideOptions = {}
) {
  const { enabled = true, onEscape, ignoreRefs = [] } = options;

  useEffect(() => {
    if (!enabled) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (!ref.current || ref.current.contains(target)) {
        return;
      }

      for (const ignoreRef of ignoreRefs) {
        if (ignoreRef.current && ignoreRef.current.contains(target)) {
          return;
        }
      }

      handler();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (onEscape) {
          onEscape();
        } else {
          handler();
        }
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [ref, handler, enabled, onEscape, ignoreRefs]);
}
