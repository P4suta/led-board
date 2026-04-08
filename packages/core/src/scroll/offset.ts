import { requires } from '../contracts';

/**
 * Pure function: pixels of scroll offset elapsed since the scroll started.
 *
 * `elapsedMs` is the time since the scroll began (drift-free across frames).
 * `speedPxPerSec` is the scroll speed; positive scrolls left-to-right (offset
 * grows positive over time), negative scrolls right-to-left.
 *
 * The result is fractional — sub-pixel offsets are valid for the renderer to
 * interpret as anti-aliased motion.
 */
export function scrollOffset(elapsedMs: number, speedPxPerSec: number): number {
  requires(elapsedMs >= 0, 'elapsedMs must be non-negative');
  return (elapsedMs / 1000) * speedPxPerSec;
}

/**
 * Pure function: wrapped scroll offset for looping scroll over a fixed-width
 * pattern of width `totalWidth` (typically text width + gap pixels).
 *
 * The returned value is always in `[0, totalWidth)`. JavaScript's `%` operator
 * is sign-preserving, so we add and re-mod to normalize negative speeds.
 *
 * - speed > 0: scrolls left (offset increases) and wraps at totalWidth
 * - speed < 0: scrolls right and wraps at 0
 * - speed = 0: returns 0
 */
export function wrappedScrollOffset(
  elapsedMs: number,
  speedPxPerSec: number,
  totalWidth: number,
): number {
  requires(elapsedMs >= 0, 'elapsedMs must be non-negative');
  requires(totalWidth > 0, 'totalWidth must be positive');
  if (speedPxPerSec === 0) return 0;
  const raw = (elapsedMs / 1000) * speedPxPerSec;
  return ((raw % totalWidth) + totalWidth) % totalWidth;
}
