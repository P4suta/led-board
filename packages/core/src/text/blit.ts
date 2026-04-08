import { requires } from '../contracts';
import type { Font, Glyph } from '../font/types';
import type { PixelBuffer } from '../pixel-buffer/pixel-buffer';
import { type LayoutOpts, layoutText } from './layout';

export interface BlitOpts {
  /** Brightness level applied to each lit pixel (default 15 — full on). */
  readonly level?: number;
}

export interface BlitTextOpts extends LayoutOpts, BlitOpts {
  /** Origin X in the destination buffer (default 0). */
  readonly offsetX?: number;
  /** Origin Y in the destination buffer (default 0). */
  readonly offsetY?: number;
}

/**
 * Draw a single glyph into the destination buffer at (`originX`, `originY`).
 * Pixels outside the buffer are silently clipped. The destination is NOT
 * cleared first.
 */
export function blitGlyph(
  dest: PixelBuffer,
  glyph: Glyph,
  originX: number,
  originY: number,
  opts?: BlitOpts,
): void {
  const level = opts?.level ?? 15;
  requires(Number.isInteger(level) && level >= 0 && level <= 15, 'level is integer 0..15');
  // We don't know the glyph's "width" from Glyph alone — we use the bits
  // length and assume the cell width matches the font that produced it.
  // The caller passes glyphs from `font.lookup(cp)`; we infer cellWidth from
  // (bits.length / cellHeight) — but that's awkward. Instead, blitGlyph here
  // uses a simpler convention: walk all bytes, and stop columns at the first
  // unset bit position would be wrong. Walk every bit position.
  //
  // We require knowing cellWidth here; expose it via the optional `cellWidth`
  // and `cellHeight` parameters or via the font signature. For simplicity,
  // we infer cellHeight from `glyph.bits.length` assuming cellWidth = advance.
  //
  // BUT: advance ≠ cellWidth in general (advance is the cursor step; cellWidth
  // is the bit grid). For our bitmap fonts they happen to match for full-width
  // glyphs but differ for half-width (advance=4, cellWidth=8).
  //
  // To do this correctly we need cellWidth from the Font. Use blitText() which
  // has access to the Font, OR pass it via opts. Below we choose to walk based
  // on bits.length / 1 byte per row → cellHeight, and bytesPerRow * 8 → cellW.
  const cellHeight = inferHeight(glyph);
  const bytesPerRow = glyph.bits.length / cellHeight;
  const cellWidth = bytesPerRow * 8;
  for (let y = 0; y < cellHeight; y++) {
    const dy = originY + y;
    if (dy < 0 || dy >= dest.rows) continue;
    for (let x = 0; x < cellWidth; x++) {
      const dx = originX + x;
      if (dx < 0 || dx >= dest.cols) continue;
      const byte = glyph.bits[y * bytesPerRow + (x >> 3)] as number;
      const bit = (byte >> (7 - (x & 7))) & 1;
      if (bit !== 0) dest.set(dx, dy, level);
    }
  }
}

function inferHeight(glyph: Glyph): number {
  // For 8-wide cells (the only width currently shipped), bytesPerRow=1, so
  // cellHeight = bits.length. For wider cells, callers should use blitText
  // which has the Font available.
  return glyph.bits.length;
}

/**
 * Render `text` into `dest` using `font`. Pixels outside the buffer are
 * silently clipped. The buffer is NOT cleared first — callers should clear
 * the region they want overwritten.
 */
export function blitText(dest: PixelBuffer, text: string, font: Font, opts?: BlitTextOpts): void {
  const level = opts?.level ?? 15;
  requires(Number.isInteger(level) && level >= 0 && level <= 15, 'level is integer 0..15');
  const offsetX = opts?.offsetX ?? 0;
  const offsetY = opts?.offsetY ?? 0;

  const placements = layoutText(text, font, opts);
  const bytesPerRow = (font.cellWidth + 7) >> 3;

  for (const p of placements) {
    const baseX = p.x + offsetX;
    const baseY = p.y + offsetY;
    for (let y = 0; y < font.cellHeight; y++) {
      const dy = baseY + y;
      if (dy < 0 || dy >= dest.rows) continue;
      for (let x = 0; x < font.cellWidth; x++) {
        const dx = baseX + x;
        if (dx < 0 || dx >= dest.cols) continue;
        const byte = p.glyph.bits[y * bytesPerRow + (x >> 3)] as number;
        const bit = (byte >> (7 - (x & 7))) & 1;
        if (bit !== 0) dest.set(dx, dy, level);
      }
    }
  }
}
