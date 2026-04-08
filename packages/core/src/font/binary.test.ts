import { describe, expect, it } from 'vitest';
import { ContractError } from '../contracts';
import { encodeFontBinary, parseFontBinary } from './binary';

// Build a tiny synthetic font with 3 glyphs to round-trip through the binary codec.
// Cell is 8×8 so bytesPerGlyph = 8 (1 byte per row, no row padding ambiguity).
function makeFixture(): {
  name: string;
  cellWidth: number;
  cellHeight: number;
  glyphs: { codepoint: number; advance: number; bits: Uint8Array }[];
} {
  const glyphs = [
    {
      codepoint: 0x0020, // space — all off
      advance: 4,
      bits: new Uint8Array(8),
    },
    {
      codepoint: 0x0041, // A — diagonal stripes pattern
      advance: 8,
      bits: new Uint8Array([
        0b00011000, 0b00100100, 0b01000010, 0b01000010, 0b01111110, 0b01000010, 0b01000010,
        0b00000000,
      ]),
    },
    {
      codepoint: 0x3042, // あ — full block (every cell on)
      advance: 8,
      bits: new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
    },
  ];
  return { name: 'fixture', cellWidth: 8, cellHeight: 8, glyphs };
}

describe('font/binary', () => {
  describe('round-trip', () => {
    it('encodes and decodes a tiny font preserving every glyph', () => {
      const fixture = makeFixture();
      const buffer = encodeFontBinary(fixture);
      const font = parseFontBinary(buffer);

      expect(font.name).toBe('fixture');
      expect(font.cellWidth).toBe(8);
      expect(font.cellHeight).toBe(8);

      expect(font.has(0x0020)).toBe(true);
      expect(font.has(0x0041)).toBe(true);
      expect(font.has(0x3042)).toBe(true);
      expect(font.has(0x9999)).toBe(false);

      const space = font.lookup(0x0020);
      expect(space.advance).toBe(4);
      expect(Array.from(space.bits)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);

      const a = font.lookup(0x0041);
      expect(a.advance).toBe(8);
      expect(Array.from(a.bits)).toEqual([
        0b00011000, 0b00100100, 0b01000010, 0b01000010, 0b01111110, 0b01000010, 0b01000010,
        0b00000000,
      ]);

      const aHira = font.lookup(0x3042);
      expect(Array.from(aHira.bits)).toEqual([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
    });

    it('returns the tofu glyph for codepoints not in the font', () => {
      const buffer = encodeFontBinary(makeFixture());
      const font = parseFontBinary(buffer);
      const tofu = font.lookup(0xffff);
      expect(tofu.advance).toBeGreaterThan(0);
      // Tofu is the same instance / shape regardless of codepoint
      expect(font.lookup(0xfffe).advance).toBe(tofu.advance);
    });
  });

  describe('encode', () => {
    it('rejects mismatched bits length', () => {
      expect(() => {
        encodeFontBinary({
          name: 'bad',
          cellWidth: 8,
          cellHeight: 8,
          glyphs: [{ codepoint: 0x41, advance: 8, bits: new Uint8Array([0xff]) }], // should be 8 bytes
        });
      }).toThrow(ContractError);
    });

    it('rejects empty glyph list', () => {
      expect(() => {
        encodeFontBinary({ name: 'empty', cellWidth: 8, cellHeight: 8, glyphs: [] });
      }).toThrow(ContractError);
    });

    it('rejects unsorted codepoints (caller must pre-sort)', () => {
      expect(() => {
        encodeFontBinary({
          name: 'unsorted',
          cellWidth: 8,
          cellHeight: 8,
          glyphs: [
            { codepoint: 0x42, advance: 8, bits: new Uint8Array(8) },
            { codepoint: 0x41, advance: 8, bits: new Uint8Array(8) },
          ],
        });
      }).toThrow(ContractError);
    });

    it('rejects duplicate codepoints', () => {
      expect(() => {
        encodeFontBinary({
          name: 'dup',
          cellWidth: 8,
          cellHeight: 8,
          glyphs: [
            { codepoint: 0x41, advance: 8, bits: new Uint8Array(8) },
            { codepoint: 0x41, advance: 8, bits: new Uint8Array(8) },
          ],
        });
      }).toThrow(ContractError);
    });
  });

  describe('parse', () => {
    it('rejects buffers with the wrong magic', () => {
      const buf = new Uint8Array(16).buffer;
      expect(() => parseFontBinary(buf)).toThrow(ContractError);
    });

    it('rejects buffers smaller than the header', () => {
      const buf = new Uint8Array(8).buffer;
      expect(() => parseFontBinary(buf)).toThrow(ContractError);
    });

    it('rejects unsupported version', () => {
      const fixture = makeFixture();
      const buffer = encodeFontBinary(fixture);
      // Tamper with the version byte
      const view = new Uint8Array(buffer);
      view[4] = 99; // version byte at offset 4
      expect(() => parseFontBinary(buffer)).toThrow(ContractError);
    });
  });

  describe('lookup performance characteristics', () => {
    it('binary search returns O(log n) lookups for sorted index', () => {
      // Synthesize a 256-glyph font and ensure mid + edge lookups all return correct glyphs
      const cellW = 8;
      const cellH = 8;
      const bytesPerGlyph = 8;
      const glyphs = Array.from({ length: 256 }, (_, i) => ({
        codepoint: 0x4000 + i,
        advance: 8,
        bits: new Uint8Array(bytesPerGlyph).fill(i & 0xff),
      }));
      const buf = encodeFontBinary({ name: 'big', cellWidth: cellW, cellHeight: cellH, glyphs });
      const font = parseFontBinary(buf);
      expect(font.lookup(0x4000).bits[0]).toBe(0);
      expect(font.lookup(0x407f).bits[0]).toBe(127);
      expect(font.lookup(0x40ff).bits[0]).toBe(255);
      expect(font.has(0x4100)).toBe(false);
    });
  });
});
