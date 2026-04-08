import { requires } from '../contracts';
import type { PixelBuffer } from '../pixel-buffer/pixel-buffer';
import type { BlinkEffect, Effect, FadeInEffect, FadeOutEffect } from './types';

function applyBlink(buf: PixelBuffer, fx: BlinkEffect, elapsedMs: number): void {
  requires(fx.intervalMs > 0, 'blink intervalMs must be positive');
  const duty = fx.duty ?? 0.5;
  requires(duty >= 0 && duty <= 1, 'blink duty must be in [0, 1]');
  const phase = (elapsedMs % fx.intervalMs) / fx.intervalMs;
  if (phase >= duty) {
    buf.clear();
  }
  // else: leave buffer unchanged (on phase)
}

function applyFadeIn(buf: PixelBuffer, fx: FadeInEffect, elapsedMs: number): void {
  requires(fx.durationMs > 0, 'fade-in durationMs must be positive');
  const factor = Math.min(1, elapsedMs / fx.durationMs);
  buf.multiply(factor);
}

function applyFadeOut(buf: PixelBuffer, fx: FadeOutEffect, elapsedMs: number): void {
  requires(fx.durationMs > 0, 'fade-out durationMs must be positive');
  const factor = Math.max(0, 1 - elapsedMs / fx.durationMs);
  buf.multiply(factor);
}

/**
 * Apply a chain of effects to the buffer in order. The buffer is mutated in
 * place; effects after the first see the result of the previous effect.
 */
export function applyEffects(
  buf: PixelBuffer,
  effects: ReadonlyArray<Effect>,
  elapsedMs: number,
): void {
  for (const fx of effects) {
    switch (fx.kind) {
      case 'blink':
        applyBlink(buf, fx, elapsedMs);
        break;
      case 'fade-in':
        applyFadeIn(buf, fx, elapsedMs);
        break;
      case 'fade-out':
        applyFadeOut(buf, fx, elapsedMs);
        break;
    }
  }
}
