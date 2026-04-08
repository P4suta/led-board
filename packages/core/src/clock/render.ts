import type { Font } from '../font/types';
import type { PixelBuffer } from '../pixel-buffer/pixel-buffer';
import { blitText } from '../text/blit';
import { measureText } from '../text/layout';
import { type ClockFormat, formatTime } from './format';

export interface ClockRendererOpts {
  readonly font: Font;
  readonly format: ClockFormat;
  /** IANA timezone string (default UTC for tests, "Asia/Tokyo" in production). */
  readonly timeZone?: string;
  /** Horizontal alignment in the destination buffer. Default "center". */
  readonly align?: 'left' | 'center' | 'right';
  /** Brightness level for lit pixels. Default 15. */
  readonly level?: number;
}

/**
 * Stateful clock renderer that caches the most recently rendered formatted
 * string. Rendering the same string twice is a no-op for the buffer write
 * path — useful when rendering at 60fps but the visible string only changes
 * once per minute (HH:mm) or once per second (HH:mm:ss).
 */
export class ClockRenderer {
  readonly font: Font;
  readonly format: ClockFormat;
  readonly timeZone: string;
  readonly align: 'left' | 'center' | 'right';
  readonly level: number;

  /** The string most recently rendered into a buffer, or null if never rendered. */
  lastRenderedString: string | null = null;
  /** Number of times render() returned without re-blitting because the string was unchanged. */
  cacheHits = 0;
  /** Number of times render() actually re-blitted. */
  cacheMisses = 0;

  constructor(opts: ClockRendererOpts) {
    this.font = opts.font;
    this.format = opts.format;
    this.timeZone = opts.timeZone ?? 'UTC';
    this.align = opts.align ?? 'center';
    this.level = opts.level ?? 15;
  }

  /**
   * Render the clock for `timeMs` into `dest`. If the formatted string is the
   * same as the previous call, the destination buffer is left untouched
   * (callers can rely on the previous render still being visible).
   */
  render(dest: PixelBuffer, timeMs: number): void {
    const s = formatTime(timeMs, this.format, this.timeZone);
    if (s === this.lastRenderedString) {
      this.cacheHits++;
      return;
    }
    this.lastRenderedString = s;
    this.cacheMisses++;

    dest.clear();
    const width = measureText(s, this.font);
    const x =
      this.align === 'center'
        ? Math.floor((dest.cols - width) / 2)
        : this.align === 'right'
          ? dest.cols - width
          : 0;
    const y = Math.floor((dest.rows - this.font.cellHeight) / 2);
    blitText(dest, s, this.font, { offsetX: x, offsetY: y, level: this.level });
  }
}
