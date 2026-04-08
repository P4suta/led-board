import { createRoot } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useStoredSignal } from './useStoredSignal';

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  localStorage.clear();
});

describe('hooks/useStoredSignal', () => {
  it('returns the initial value when nothing is stored', () => {
    createRoot((dispose) => {
      const [v] = useStoredSignal('test:key', 42, (raw) => raw as number);
      expect(v()).toBe(42);
      dispose();
    });
  });

  it('reads an existing value from localStorage on init', () => {
    localStorage.setItem('test:key', JSON.stringify(123));
    createRoot((dispose) => {
      const [v] = useStoredSignal('test:key', 42, (raw) => raw as number);
      expect(v()).toBe(123);
      dispose();
    });
  });

  it('writes the value to localStorage on change', async () => {
    await createRoot(async (dispose) => {
      const [, setV] = useStoredSignal<number>('test:key', 0, (raw) => raw as number);
      setV(99);
      // createEffect runs in a microtask after the synchronous batch.
      await Promise.resolve();
      expect(JSON.parse(localStorage.getItem('test:key') as string)).toBe(99);
      dispose();
    });
  });

  it('falls back to initial value when stored data is invalid JSON', () => {
    localStorage.setItem('test:key', '{not-json');
    createRoot((dispose) => {
      const [v] = useStoredSignal('test:key', 'fallback', (raw) => raw as string);
      expect(v()).toBe('fallback');
      dispose();
    });
  });

  it('respects the parse() validator and returns its result', () => {
    localStorage.setItem('test:key', JSON.stringify({ raw: 5 }));
    createRoot((dispose) => {
      const [v] = useStoredSignal<number>('test:key', 0, (raw) => {
        const obj = raw as { raw: number };
        return obj.raw * 2;
      });
      expect(v()).toBe(10);
      dispose();
    });
  });
});
