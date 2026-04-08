import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseFontBinary } from './binary';

/**
 * Integration test against the real bundled font binaries (committed assets).
 * Verifies that the build pipeline (tools/build-font.ts) produces a binary
 * that round-trips through parseFontBinary correctly.
 *
 * Skipped if the asset file is missing — see `bun run build:font`.
 */

function loadAsset(name: string): ArrayBuffer | null {
  const path = resolve(__dirname, '../../assets', name);
  try {
    const buf = readFileSync(path);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  } catch {
    return null;
  }
}

describe('font/binary integration', () => {
  describe('k8x12.bin', () => {
    const ab = loadAsset('k8x12.bin');
    if (ab === null) {
      it.skip('asset missing — run `bun run build:font` first', () => {
        /* skipped */
      });
      return;
    }
    const font = parseFontBinary(ab);

    it('has the expected cell dimensions (8×12)', () => {
      expect(font.cellWidth).toBe(8);
      expect(font.cellHeight).toBe(12);
    });

    it('contains ASCII A and reports advance 4 (half-width)', () => {
      const cp = 'A'.codePointAt(0) ?? 0;
      expect(font.has(cp)).toBe(true);
      expect(font.lookup(cp).advance).toBe(4);
    });

    it('contains hiragana あ and reports advance 8 (full-width)', () => {
      const cp = 'あ'.codePointAt(0) ?? 0;
      expect(font.has(cp)).toBe(true);
      expect(font.lookup(cp).advance).toBe(8);
    });

    it('contains the kanji 駅, 前, 東, 京 (Tokyo / station vocab)', () => {
      for (const ch of ['駅', '前', '東', '京', '渋', '谷', '新', '宿']) {
        const cp = ch.codePointAt(0) ?? 0;
        expect(font.has(cp)).toBe(true);
      }
    });

    it('returns the tofu glyph for unmapped codepoints', () => {
      // Pick a codepoint definitely outside JIS X 0208 (e.g. an emoji selector)
      const cp = 0xfe0f;
      const tofu = font.lookup(cp);
      expect(tofu.advance).toBeGreaterThan(0);
    });

    it('contains a non-empty bitmap for 駅 (sanity check the bits)', () => {
      const g = font.lookup('駅'.codePointAt(0) ?? 0);
      let lit = 0;
      for (const b of g.bits) lit += b;
      expect(lit).toBeGreaterThan(0);
    });
  });

  describe('misaki.bin', () => {
    const ab = loadAsset('misaki.bin');
    if (ab === null) {
      it.skip('asset missing — run `bun run build:font` first', () => {
        /* skipped */
      });
      return;
    }
    const font = parseFontBinary(ab);

    it('has the expected cell dimensions (8×8)', () => {
      expect(font.cellWidth).toBe(8);
      expect(font.cellHeight).toBe(8);
    });

    it('contains hiragana あ', () => {
      const cp = 'あ'.codePointAt(0) ?? 0;
      expect(font.has(cp)).toBe(true);
    });

    it('contains the kanji 駅', () => {
      expect(font.has('駅'.codePointAt(0) ?? 0)).toBe(true);
    });
  });
});
