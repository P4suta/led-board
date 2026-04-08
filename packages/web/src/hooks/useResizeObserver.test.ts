import { createRoot } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useResizeObserver } from './useResizeObserver';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('hooks/useResizeObserver', () => {
  it('returns {0, 0} when ResizeObserver is unavailable', () => {
    const original = globalThis.ResizeObserver;
    Object.defineProperty(globalThis, 'ResizeObserver', { value: undefined, configurable: true });
    const dispose = createRoot((d) => {
      const size = useResizeObserver(() => undefined);
      expect(size()).toEqual({ width: 0, height: 0 });
      return d;
    });
    dispose();
    Object.defineProperty(globalThis, 'ResizeObserver', { value: original, configurable: true });
  });

  it('returns the initial size {0, 0} before any observation', () => {
    const dispose = createRoot((d) => {
      const el = document.createElement('div');
      const size = useResizeObserver(() => el);
      expect(size()).toEqual({ width: 0, height: 0 });
      return d;
    });
    dispose();
  });
});
