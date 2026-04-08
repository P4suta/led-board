import { createRoot, createSignal } from 'solid-js';
import { afterEach, describe, expect, it } from 'vitest';
import { useCursorAutoHide } from './useCursorAutoHide';

// Use real timers with a tiny idleMs so the tests don't depend on
// vi.useFakeTimers (which interacts unpredictably with happy-dom's window).
const TINY_IDLE = 5;
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

afterEach(() => {
  document.body.style.cursor = '';
});

describe('hooks/useCursorAutoHide', () => {
  it('does not modify the cursor when inactive', () => {
    createRoot((dispose) => {
      const [active] = createSignal(false);
      useCursorAutoHide(active, TINY_IDLE);
      expect(document.body.style.cursor).toBe('');
      dispose();
    });
  });

  it('hides the cursor after the idle timeout when active', async () => {
    await createRoot(async (dispose) => {
      const [active] = createSignal(true);
      useCursorAutoHide(active, TINY_IDLE);
      // Initially the reset is fired so the cursor is visible
      expect(document.body.style.cursor).toBe('');
      await wait(TINY_IDLE * 4);
      expect(document.body.style.cursor).toBe('none');
      dispose();
    });
  });

  it('reveals the cursor on mousemove and re-arms the timer', async () => {
    await createRoot(async (dispose) => {
      const [active] = createSignal(true);
      useCursorAutoHide(active, TINY_IDLE);
      await wait(TINY_IDLE * 4);
      expect(document.body.style.cursor).toBe('none');
      document.dispatchEvent(new MouseEvent('mousemove'));
      expect(document.body.style.cursor).toBe('');
      await wait(TINY_IDLE * 4);
      expect(document.body.style.cursor).toBe('none');
      dispose();
    });
  });

  it('restores the cursor when active flips to false', async () => {
    await createRoot(async (dispose) => {
      const [active, setActive] = createSignal(true);
      useCursorAutoHide(active, TINY_IDLE);
      await wait(TINY_IDLE * 4);
      expect(document.body.style.cursor).toBe('none');
      setActive(false);
      // Effect re-runs synchronously and clears the cursor
      expect(document.body.style.cursor).toBe('');
      dispose();
    });
  });

  it('restores the cursor on cleanup', async () => {
    await createRoot(async (dispose) => {
      const [active] = createSignal(true);
      useCursorAutoHide(active, TINY_IDLE);
      await wait(TINY_IDLE * 4);
      expect(document.body.style.cursor).toBe('none');
      dispose();
      expect(document.body.style.cursor).toBe('');
    });
  });
});
