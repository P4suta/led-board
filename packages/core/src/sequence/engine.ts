import { requires } from '../contracts';
import type { Sequence, SequenceState, Transition } from './types';

function transitionDuration(t: Transition | undefined): number {
  if (t === undefined || t.kind === 'cut') return 0;
  return t.durationMs;
}

/**
 * Pure function: given a sequence and elapsed time (since the sequence started),
 * return the current playback state.
 *
 * Returns `null` for empty sequences and for non-looping sequences that have
 * passed their final item.
 *
 * Each item's total wall-clock duration is:
 *   `enterTransition.durationMs + durationMs + exitTransition.durationMs`
 *
 * Phase classification:
 *   - `[0, enter)` → enter (fade in)
 *   - `[enter, enter + duration)` → play
 *   - `[enter + duration, enter + duration + exit)` → exit (fade out)
 */
export function evaluateSequence(seq: Sequence, elapsedMs: number): SequenceState | null {
  requires(elapsedMs >= 0, 'elapsedMs must be non-negative');
  if (seq.items.length === 0) return null;

  const totalDuration = seq.items.reduce(
    (sum, item) =>
      sum +
      transitionDuration(item.enterTransition) +
      item.durationMs +
      transitionDuration(item.exitTransition),
    0,
  );

  let t = elapsedMs;
  if (seq.loop) {
    if (totalDuration === 0) return null;
    t = t % totalDuration;
  } else if (t >= totalDuration) {
    return null;
  }

  let cursor = 0;
  let found: SequenceState | null = null;
  for (let i = 0; i < seq.items.length && found === null; i++) {
    const item = seq.items[i] as Sequence['items'][number];
    const enter = transitionDuration(item.enterTransition);
    const exit = transitionDuration(item.exitTransition);
    const itemTotal = enter + item.durationMs + exit;

    if (t < cursor + itemTotal) {
      const localT = t - cursor;
      // If we're below `enter`, enter must be positive (localT >= 0).
      // Likewise the exit branch requires exit > 0 to be reachable. Both
      // ternaries collapse to the divide form because the zero case is dead.
      if (localT < enter) {
        found = {
          itemIndex: i,
          elapsedInItem: 0,
          phase: 'enter',
          transitionProgress: localT / enter,
        };
      } else if (localT < enter + item.durationMs) {
        found = {
          itemIndex: i,
          elapsedInItem: localT - enter,
          phase: 'play',
          transitionProgress: 1,
        };
      } else {
        found = {
          itemIndex: i,
          elapsedInItem: item.durationMs,
          phase: 'exit',
          transitionProgress: (localT - enter - item.durationMs) / exit,
        };
      }
    }
    cursor += itemTotal;
  }
  return found;
}
