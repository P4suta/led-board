import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearFontCache, loadFont } from './loader';

// Mock the URL imports — Vite resolves these to strings at build time, but in
// the test runner we replace them with deterministic values.
vi.mock('@led/core/assets/k8x12.bin?url', () => ({ default: '/test/k8x12.bin' }));
vi.mock('@led/core/assets/misaki.bin?url', () => ({ default: '/test/misaki.bin' }));

describe('font/loader', () => {
  beforeEach(() => {
    clearFontCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when the fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      async () => new Response(null, { status: 404, statusText: 'Not Found' }),
    );
    await expect(loadFont('k8x12L')).rejects.toThrow(/Failed to load font/);
  });

  it('caches the promise so a second call returns the same one', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', async () => {
      calls++;
      // Return a malformed body so parseFontBinary throws — we just want to
      // verify fetch is only called once even if parsing fails.
      return new Response(new ArrayBuffer(0), { status: 200 });
    });
    await loadFont('k8x12L').catch(() => {});
    await loadFont('k8x12L').catch(() => {});
    expect(calls).toBe(1);
  });

  it('clearFontCache resets the cache so the next load re-fetches', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', async () => {
      calls++;
      return new Response(new ArrayBuffer(0), { status: 200 });
    });
    await loadFont('k8x12L').catch(() => {});
    clearFontCache();
    await loadFont('k8x12L').catch(() => {});
    expect(calls).toBe(2);
  });

  it('loads different fonts independently', async () => {
    const seen: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      seen.push(url);
      return new Response(new ArrayBuffer(0), { status: 200 });
    });
    await loadFont('k8x12L').catch(() => {});
    await loadFont('MisakiGothic').catch(() => {});
    expect(seen).toHaveLength(2);
    expect(seen[0]).not.toBe(seen[1]);
  });
});
