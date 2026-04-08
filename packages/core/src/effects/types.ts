/**
 * Pure pixel-buffer transformations applied AFTER scene rendering.
 *
 * Effects compose in order — `applyEffects(buf, [blink, fade], t)` first
 * blinks, then fades. The buffer is mutated in place; callers should clone
 * if they need the unaffected version.
 */
export type Effect = BlinkEffect | FadeInEffect | FadeOutEffect;

export interface BlinkEffect {
  readonly kind: 'blink';
  /** Period of one full on/off cycle in milliseconds. */
  readonly intervalMs: number;
  /** Fraction of the period that the buffer is "on". 0..1, default 0.5. */
  readonly duty?: number;
}

export interface FadeInEffect {
  readonly kind: 'fade-in';
  readonly durationMs: number;
}

export interface FadeOutEffect {
  readonly kind: 'fade-out';
  readonly durationMs: number;
}
