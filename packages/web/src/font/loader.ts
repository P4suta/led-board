import { type Font, parseFontBinary } from '@led/core';

// Vite resolves these `?url` imports to public URLs of the bundled binary
// assets. The actual font binaries live in packages/core/assets/.
import k8x12Url from '@led/core/assets/k8x12.bin?url';
import misakiUrl from '@led/core/assets/misaki.bin?url';

export type FontName = 'k8x12L' | 'MisakiGothic';

const FONT_URLS: Record<FontName, string> = {
  k8x12L: k8x12Url,
  MisakiGothic: misakiUrl,
};

const cache = new Map<FontName, Promise<Font>>();

/**
 * Fetch the binary for the named font and parse it. Promises are cached so
 * repeated calls share the same parse result.
 */
export function loadFont(name: FontName): Promise<Font> {
  let p = cache.get(name);
  if (p === undefined) {
    p = (async (): Promise<Font> => {
      const url = FONT_URLS[name];
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load font ${name}: HTTP ${res.status}`);
      }
      const buffer = await res.arrayBuffer();
      return parseFontBinary(buffer);
    })();
    cache.set(name, p);
  }
  return p;
}

/** Clears the in-memory cache (mainly for tests). */
export function clearFontCache(): void {
  cache.clear();
}
