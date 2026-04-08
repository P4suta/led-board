import { type Accessor, createSignal, onCleanup } from 'solid-js';

export interface UseFullscreen {
  readonly isFullscreen: Accessor<boolean>;
  enter(el?: Element): Promise<void>;
  exit(): Promise<void>;
  toggle(el?: Element): Promise<void>;
}

/**
 * Solid primitive wrapping the modern, unprefixed Fullscreen API.
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API
 *
 * No `webkit*` prefixes — modern browsers (Baseline 2024) support the
 * unprefixed Promise-returning form. Escape is handled by the browser; we
 * react via `fullscreenchange`.
 */
export function useFullscreen(): UseFullscreen {
  const [isFullscreen, setIsFullscreen] = createSignal(
    typeof document !== 'undefined' && Boolean(document.fullscreenElement),
  );

  const onChange = (): void => {
    setIsFullscreen(Boolean(document.fullscreenElement));
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('fullscreenerror', onChange);
    onCleanup(() => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('fullscreenerror', onChange);
    });
  }

  const enter = async (el: Element = document.documentElement): Promise<void> => {
    if (typeof el.requestFullscreen !== 'function') return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen({ navigationUI: 'hide' });
    }
  };

  const exit = async (): Promise<void> => {
    if (typeof document.exitFullscreen !== 'function') return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  };

  const toggle = async (el?: Element): Promise<void> => {
    if (document.fullscreenElement) {
      await exit();
    } else {
      await enter(el);
    }
  };

  return { isFullscreen, enter, exit, toggle };
}
