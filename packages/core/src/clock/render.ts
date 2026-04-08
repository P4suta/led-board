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
 * Stateless clock renderer.
 *
 * Each `render()` call clears the destination buffer and re-blits the
 * formatted time. There is intentionally NO per-string cache: the destination
 * buffer is shared across multiple scene renderers in the runtime, so a cache
 * keyed only on the formatted string would return early with stale buffer
 * state after another renderer wrote to the same buffer (see the regression
 * test in `render.test.ts` for the format-switch scenario).
 *
 * Blitting a clock face is fast (typically 5-10 glyphs at 8×12 cells), so the
 * cost saved by caching is dwarfed by the correctness risk.
 */
export class ClockRenderer {
  readonly font: Font;
  readonly format: ClockFormat;
  readonly timeZone: string;
  readonly align: 'left' | 'center' | 'right';
  readonly level: number;

  /** The string most recently rendered into a buffer (informational only). */
  lastRenderedString: string | null = null;

  constructor(opts: ClockRendererOpts) {
    this.font = opts.font;
    this.format = opts.format;
    this.timeZone = opts.timeZone ?? 'UTC';
    this.align = opts.align ?? 'center';
    this.level = opts.level ?? 15;
  }

  /** Render the clock for `timeMs` into `dest`. Always clears + re-blits. */
  render(dest: PixelBuffer, timeMs: number): void {
    const s = formatTime(timeMs, this.format, this.timeZone);
    this.lastRenderedString = s;

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
