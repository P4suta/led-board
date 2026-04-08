import { requires } from '../contracts';
import type { Font, Glyph } from '../font/types';

export interface GlyphPlacement {
  readonly codepoint: number;
  readonly x: number;
  readonly y: number;
  readonly glyph: Glyph;
}

export type Alignment = 'left' | 'center' | 'right';

export interface LayoutOpts {
  /** Pixels of empty space inserted between adjacent glyphs (default 0). */
  readonly gapPx?: number;
  /** Pixels of empty space inserted between lines (default 0). Cell height is added on top. */
  readonly lineGapPx?: number;
  /** Horizontal alignment of each line within `alignWidth` (default 'left'). */
  readonly align?: Alignment;
  /** Required when `align` is 'center' or 'right'. The container width to align within. */
  readonly alignWidth?: number;
}

interface NormalizedOpts {
  readonly gapPx: number;
  readonly lineGapPx: number;
  readonly align: Alignment;
  readonly alignWidth: number;
}

function normalize(opts: LayoutOpts | undefined): NormalizedOpts {
  const gapPx = opts?.gapPx ?? 0;
  const lineGapPx = opts?.lineGapPx ?? 0;
  const align = opts?.align ?? 'left';
  requires(gapPx >= 0, 'gapPx must be non-negative');
  requires(lineGapPx >= 0, 'lineGapPx must be non-negative');
  if (align !== 'left') {
    requires(opts?.alignWidth !== undefined, 'alignWidth is required when align is center/right');
  }
  return { gapPx, lineGapPx, align, alignWidth: opts?.alignWidth ?? 0 };
}

/** Iterate codepoints (handles surrogate pairs). `for…of` over a string always
 * yields full codepoints, so `codePointAt(0)` is always defined. */
function* codepointsOf(text: string): IterableIterator<number> {
  for (const ch of text) {
    yield ch.codePointAt(0) as number;
  }
}

/** Split a string into lines on '\n'. `''.split('\n')` returns `['']`, which
 * is exactly the single-empty-line semantics we want. */
function splitLines(text: string): string[] {
  return text.split('\n');
}

/** Measure the unsigned width of a single line at the given gap. */
function measureLineWidth(line: string, font: Font, gapPx: number): number {
  let width = 0;
  let count = 0;
  for (const cp of codepointsOf(line)) {
    width += font.lookup(cp).advance;
    count++;
  }
  if (count > 1) width += (count - 1) * gapPx;
  return width;
}

/**
 * Total visual width of `text` in pixels. For multi-line input, returns the
 * width of the widest line. Empty input returns 0.
 */
export function measureText(text: string, font: Font, opts?: LayoutOpts): number {
  const { gapPx } = normalize(opts);
  if (text === '') return 0;
  let max = 0;
  for (const line of splitLines(text)) {
    const w = measureLineWidth(line, font, gapPx);
    if (w > max) max = w;
  }
  return max;
}

/**
 * Compute glyph placements for `text` rendered with `font`.
 *
 * Newlines (`\n`) reset the cursor's X to the line origin and advance Y by
 * `cellHeight + lineGapPx`. Surrogate pairs are iterated as single codepoints.
 *
 * For align='center' / 'right', the per-line width is computed independently
 * so each line is aligned within `alignWidth`.
 */
export function layoutText(text: string, font: Font, opts?: LayoutOpts): GlyphPlacement[] {
  const { gapPx, lineGapPx, align, alignWidth } = normalize(opts);
  if (text === '') return [];

  const result: GlyphPlacement[] = [];
  const lineHeight = font.cellHeight + lineGapPx;

  let lineIndex = 0;
  for (const line of splitLines(text)) {
    const y = lineIndex * lineHeight;
    let x: number;
    if (align === 'left') {
      x = 0;
    } else {
      const lineWidth = measureLineWidth(line, font, gapPx);
      x = align === 'center' ? Math.floor((alignWidth - lineWidth) / 2) : alignWidth - lineWidth;
    }

    let firstOnLine = true;
    for (const cp of codepointsOf(line)) {
      const glyph = font.lookup(cp);
      if (!firstOnLine) x += gapPx;
      result.push({ codepoint: cp, x, y, glyph });
      x += glyph.advance;
      firstOnLine = false;
    }
    lineIndex++;
  }
  return result;
}

/**
 * Greedy line wrapping. Splits `text` into lines that each measure at most
 * `maxWidthPx` pixels wide.
 *
 * Word breaking: prefers ASCII space boundaries. CJK characters (no spaces)
 * fall back to character-by-character breaking. A single character that is
 * wider than `maxWidthPx` is emitted on its own line (degenerate case — the
 * caller should pick a wider container).
 */
export function wrapText(
  text: string,
  font: Font,
  maxWidthPx: number,
  opts?: LayoutOpts,
): string[] {
  requires(maxWidthPx > 0, 'maxWidthPx must be positive');
  const { gapPx } = normalize(opts);
  if (text === '') return [''];

  const result: string[] = [];
  for (const hardLine of splitLines(text)) {
    let current = '';
    let currentWidth = 0;
    let lastSpaceIdx = -1;

    for (const ch of hardLine) {
      const cp = ch.codePointAt(0) as number;
      const glyph = font.lookup(cp);
      const advance = glyph.advance;
      const addedGap = current === '' ? 0 : gapPx;
      const next = current + ch;
      const nextWidth = currentWidth + addedGap + advance;

      if (nextWidth <= maxWidthPx || current === '') {
        if (ch === ' ') {
          lastSpaceIdx = current.length;
        }
        current = next;
        currentWidth = nextWidth;
        continue;
      }

      // Need to break before adding this character.
      if (lastSpaceIdx >= 0) {
        result.push(current.slice(0, lastSpaceIdx));
        current = current.slice(lastSpaceIdx + 1) + ch;
        currentWidth = measureLineWidth(current, font, gapPx);
        lastSpaceIdx = -1;
      } else {
        result.push(current);
        current = ch;
        currentWidth = advance;
      }
    }
    result.push(current);
  }
  return result;
}
