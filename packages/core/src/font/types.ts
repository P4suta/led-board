/**
 * A single bitmap glyph.
 *
 * The cell is `cellWidth × cellHeight` pixels (font-wide constants on the
 * Font instance, not per-glyph). Bits are packed row-major, MSB-first within
 * each byte: bit (7 - (x & 7)) of byte (y * bytesPerRow + (x >> 3)).
 *
 * `advance` is the cursor advance after rendering this glyph (in pixels).
 * For monospaced bitmap fonts: half-width = cellWidth/2, full-width = cellWidth.
 */
export interface Glyph {
  readonly advance: number;
  readonly bits: Uint8Array;
}

/**
 * A bitmap font: codepoint → Glyph lookup.
 *
 * Implementations must always return a Glyph (never null/undefined). For
 * codepoints that aren't in the font, return a "tofu" fallback (typically an
 * empty rectangle or a question mark).
 */
export interface Font {
  readonly name: string;
  readonly cellWidth: number;
  readonly cellHeight: number;
  has(codepoint: number): boolean;
  lookup(codepoint: number): Glyph;
}
