import type { ClockFormat } from '../clock/format';
import type { Alignment } from '../text/layout';

/**
 * A single visual unit on the LED board. The board's runtime composes a
 * sequence of scenes (see `sequence/types.ts`) and renders one at a time
 * (with optional crossfade) into the `PixelBuffer`.
 *
 * All scenes are pure data; rendering happens in `scene/render.ts`.
 */
export type Scene = ScrollScene | StaticScene | ClockScene | MultiLineScene;

export interface ScrollScene {
  readonly kind: 'scroll';
  /** The text to scroll. May contain Japanese, ASCII, or any codepoint in the font. */
  readonly text: string;
  /** Pixels per second; positive scrolls left, negative scrolls right. */
  readonly speedPxPerSec: number;
  /** Empty pixels appended after the text before it loops (typically board width). */
  readonly gapPx: number;
}

export interface StaticScene {
  readonly kind: 'static';
  /** Lines of text. Each line is laid out independently. */
  readonly lines: ReadonlyArray<string>;
  /** Horizontal alignment of each line within the board width. */
  readonly align: Alignment;
}

export interface ClockScene {
  readonly kind: 'clock';
  readonly format: ClockFormat;
  readonly align?: Alignment;
  /** IANA timezone (default: 'Asia/Tokyo'). */
  readonly timeZone?: string;
}

export interface MultiLineScene {
  readonly kind: 'multi-line';
  readonly rows: ReadonlyArray<MultiLineRow>;
}

export interface MultiLineRow {
  readonly text: string;
  readonly align?: Alignment;
}
