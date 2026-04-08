import type { Font } from '../font/types';
import type { PixelBuffer } from '../pixel-buffer/pixel-buffer';
import { blitText } from '../text/blit';
import { measureText } from '../text/layout';
import { wrappedScrollOffset } from './offset';

export interface ScrollOpts {
  readonly text: string;
  readonly font: Font;
  readonly elapsedMs: number;
  /** Pixels per second; positive scrolls left, negative scrolls right. */
  readonly speedPxPerSec: number;
  /**
   * Pixels of empty space appended after the text before it loops back. Doubles
   * as breathing room and as the wrap unit. Typical value: board width.
   */
  readonly gapPx: number;
  /** Brightness for lit pixels (default 15). */
  readonly level?: number;
  /** When true, do not clear the buffer first (overlay mode). */
  readonly additive?: boolean;
  /** Vertical offset (default 0 → top of buffer). */
  readonly y?: number;
}

/**
 * Render scrolling text into the destination buffer.
 *
 * The text is laid out once at logical x=0, then drawn at:
 *   - `-offset` (the primary copy)
 *   - `-offset + totalWidth` (the wrap-around copy)
 * where `totalWidth = textWidth + gapPx`.
 *
 * This produces seamless looping: as the first copy scrolls off the left
 * edge, the second copy enters from the right with no gap-between-loops gap
 * larger than `gapPx`.
 */
export function renderScroll(dest: PixelBuffer, opts: ScrollOpts): void {
  const { text, font, elapsedMs, speedPxPerSec, gapPx } = opts;
  const level = opts.level ?? 15;
  const y = opts.y ?? 0;

  if (opts.additive !== true) {
    dest.clear();
  }

  if (text === '') return;

  const textWidth = measureText(text, font);
  const totalWidth = textWidth + gapPx;
  const offset = wrappedScrollOffset(elapsedMs, speedPxPerSec, totalWidth);

  // wrappedScrollOffset guarantees offset ∈ [0, totalWidth), so the primary
  // copy starts in (-totalWidth, 0]. Draw it plus enough wrap-around copies
  // to cover the visible width on the right.
  let x = -offset;
  while (x < dest.cols) {
    blitText(dest, text, font, { offsetX: Math.round(x), offsetY: y, level });
    x += totalWidth;
  }
}
