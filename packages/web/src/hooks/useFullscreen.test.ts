import { createRoot } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { useFullscreen } from './useFullscreen';

describe('hooks/useFullscreen', () => {
  it('returns false initially when no fullscreen element', () => {
    createRoot((dispose) => {
      const fs = useFullscreen();
      expect(fs.isFullscreen()).toBe(false);
      dispose();
    });
  });

  it('exposes enter / exit / toggle methods', () => {
    createRoot((dispose) => {
      const fs = useFullscreen();
      expect(typeof fs.enter).toBe('function');
      expect(typeof fs.exit).toBe('function');
      expect(typeof fs.toggle).toBe('function');
      dispose();
    });
  });

  it('exit() resolves quickly when not in fullscreen', async () => {
    await createRoot(async (dispose) => {
      const fs = useFullscreen();
      await expect(fs.exit()).resolves.toBeUndefined();
      dispose();
    });
  });
});
