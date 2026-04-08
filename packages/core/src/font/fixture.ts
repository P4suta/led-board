/**
 * Test fixture font factory.
 *
 * Builds a tiny 8×8 font with a handful of glyphs for unit tests that
 * shouldn't depend on the bundled production fonts. Exposed as part of the
 * core public API so it can be reused across packages.
 */
import { encodeFontBinary, type FontSpec, parseFontBinary } from './binary';
import type { Font } from './types';

interface FixtureGlyphSpec {
  readonly codepoint: number;
  readonly advance: number;
  readonly bits: ReadonlyArray<number>;
}

const HALF: ReadonlyArray<FixtureGlyphSpec> = [
  // ASCII space — empty, half-width advance
  { codepoint: 0x0020, advance: 4, bits: [0, 0, 0, 0, 0, 0, 0, 0] },
  // 'A' — diamond outline
  {
    codepoint: 0x0041,
    advance: 4,
    bits: [
      0b01000000, 0b10100000, 0b10100000, 0b11100000, 0b10100000, 0b10100000, 0b10100000,
      0b00000000,
    ],
  },
  // 'B' — vertical bar + dots
  {
    codepoint: 0x0042,
    advance: 4,
    bits: [
      0b11100000, 0b10100000, 0b10100000, 0b11100000, 0b10100000, 0b10100000, 0b11100000,
      0b00000000,
    ],
  },
  // ' ' wide-space (full-width)
  { codepoint: 0x3000, advance: 8, bits: [0, 0, 0, 0, 0, 0, 0, 0] },
  // 'あ' — full-width simple shape (full of dots, just to be non-empty)
  {
    codepoint: 0x3042,
    advance: 8,
    bits: [
      0b00100000, 0b01111000, 0b00100000, 0b01111100, 0b10100100, 0b10100100, 0b10100100,
      0b01011000,
    ],
  },
  // 'ア' (katakana)
  {
    codepoint: 0x30a2,
    advance: 8,
    bits: [
      0b11111100, 0b00001000, 0b00010000, 0b00100000, 0b01000000, 0b01000000, 0b01000100,
      0b01111000,
    ],
  },
  // 'I' — narrow letter for kerning tests
  {
    codepoint: 0x0049,
    advance: 4,
    bits: [
      0b11100000, 0b01000000, 0b01000000, 0b01000000, 0b01000000, 0b01000000, 0b11100000,
      0b00000000,
    ],
  },
  // newline placeholder is handled by layoutText, no glyph needed
];

function buildSpec(): FontSpec {
  const sorted = [...HALF].sort((a, b) => a.codepoint - b.codepoint);
  return {
    name: 'fixture-8x8',
    cellWidth: 8,
    cellHeight: 8,
    glyphs: sorted.map((g) => ({
      codepoint: g.codepoint,
      advance: g.advance,
      bits: new Uint8Array(g.bits),
    })),
  };
}

let cached: Font | null = null;

/** Builds (and caches) a small 8×8 font usable in tests. */
export function fixtureFont(): Font {
  if (cached !== null) return cached;
  const buf = encodeFontBinary(buildSpec());
  cached = parseFontBinary(buf);
  return cached;
}
