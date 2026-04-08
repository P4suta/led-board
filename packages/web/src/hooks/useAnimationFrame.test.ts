import { createRoot } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAnimationFrame } from './useAnimationFrame';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('hooks/useAnimationFrame', () => {
  it('calls the callback on each rAF tick', () => {
    const captured: Array<(t: number) => void> = [];
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
      captured.push(cb);
      return captured.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});

    const calls: Array<{ now: number; delta: number }> = [];
    const dispose = createRoot((d) => {
      useAnimationFrame((now, delta) => {
        calls.push({ now, delta });
      });
      return d;
    });

    // Manually invoke each captured callback in turn (each tick captures the next).
    let next = captured[0];
    next?.(100);
    next = captured[1];
    next?.(116);
    next = captured[2];
    next?.(132);

    expect(calls.length).toBe(3);
    expect(calls[0]?.delta).toBe(0); // first tick has delta=0
    expect(calls[1]?.delta).toBe(16);
    expect(calls[2]?.delta).toBe(16);
    dispose();
  });

  it('cancels the rAF on cleanup', () => {
    const cancel = vi.fn();
    vi.stubGlobal('requestAnimationFrame', () => 42);
    vi.stubGlobal('cancelAnimationFrame', cancel);

    const dispose = createRoot((d) => {
      useAnimationFrame(() => {});
      return d;
    });
    dispose();
    expect(cancel).toHaveBeenCalledWith(42);
  });
});
