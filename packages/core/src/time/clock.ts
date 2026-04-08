import { requires } from '../contracts';

/**
 * Abstract clock for time-driven logic.
 *
 * `now()` returns a monotonically-increasing number of milliseconds. The actual
 * meaning (epoch ms vs since-page-load) is left to the implementation; only the
 * delta between two `now()` calls is observed by the domain.
 *
 * Implementations must allow injection so tests can run without real time.
 */
export interface Clock {
  now(): number;
}

/** Production clock — wall-clock time in epoch milliseconds. */
export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}

/**
 * Test clock — manually advanced. Use in unit tests for any time-dependent
 * code (scrolling, blinking, sequence advancement).
 */
export class FakeClock implements Clock {
  private t: number;

  constructor(initial: number = 0) {
    requires(initial >= 0, 'initial time must be non-negative');
    this.t = initial;
  }

  now(): number {
    return this.t;
  }

  advance(deltaMs: number): void {
    requires(deltaMs >= 0, 'advance delta must be non-negative');
    this.t += deltaMs;
  }

  set(timeMs: number): void {
    requires(timeMs >= 0, 'time must be non-negative');
    this.t = timeMs;
  }
}
