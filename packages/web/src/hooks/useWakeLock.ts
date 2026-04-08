import { type Accessor, createEffect, createSignal, onCleanup } from 'solid-js';

export interface UseWakeLock {
  readonly held: Accessor<boolean>;
}

/**
 * Solid primitive wrapping the Screen Wake Lock API.
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
 *
 * The lock is acquired whenever `active()` is true and the document is
 * visible. It is released automatically on visibility change (tab hidden) and
 * re-acquired when the document becomes visible again. Cleanup releases the
 * lock unconditionally.
 *
 * If the API is unavailable (insecure context, unsupported browser), all
 * operations are silent no-ops and `held()` always returns false.
 */
export function useWakeLock(active: Accessor<boolean>): UseWakeLock {
  const [held, setHeld] = createSignal(false);
  let sentinel: WakeLockSentinel | null = null;

  const acquire = async (): Promise<void> => {
    if (typeof navigator === 'undefined' || navigator.wakeLock === undefined || sentinel !== null) {
      return;
    }
    try {
      sentinel = await navigator.wakeLock.request('screen');
      sentinel.addEventListener('release', () => {
        sentinel = null;
        setHeld(false);
      });
      setHeld(true);
    } catch {
      // Permission denied / battery save / no user gesture — silent.
    }
  };

  const release = async (): Promise<void> => {
    try {
      await sentinel?.release();
    } finally {
      sentinel = null;
      setHeld(false);
    }
  };

  const onVisibility = (): void => {
    if (typeof document === 'undefined') return;
    if (document.visibilityState === 'visible' && active()) {
      void acquire();
    } else {
      void release();
    }
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibility);
  }

  createEffect(() => {
    void (active() ? acquire() : release()).catch(() => {});
  });

  onCleanup(() => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibility);
    }
    void release();
  });

  return { held };
}
