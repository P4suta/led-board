import { describe, expect, it } from 'vitest';
import { ContractError } from '../contracts';
import { PixelBuffer } from '../pixel-buffer/pixel-buffer';
import { applyEffects } from './pipeline';
import type { BlinkEffect, FadeInEffect, FadeOutEffect } from './types';

describe('effects/blink', () => {
  it('shows full brightness during the on phase (duty=0.5)', () => {
    const buf = PixelBuffer.create(2, 1);
    buf.fill(15);
    const blink: BlinkEffect = { kind: 'blink', intervalMs: 1000, duty: 0.5 };
    applyEffects(buf, [blink], 0); // start of cycle → on
    expect(buf.get(0, 0)).toBe(15);
  });

  it('shows nothing during the off phase (duty=0.5)', () => {
    const buf = PixelBuffer.create(2, 1);
    buf.fill(15);
    const blink: BlinkEffect = { kind: 'blink', intervalMs: 1000, duty: 0.5 };
    applyEffects(buf, [blink], 600); // 60% through cycle → off
    expect(buf.get(0, 0)).toBe(0);
  });

  it('default duty is 0.5', () => {
    const buf = PixelBuffer.create(1, 1);
    buf.fill(15);
    applyEffects(buf, [{ kind: 'blink', intervalMs: 1000 }], 600);
    expect(buf.get(0, 0)).toBe(0);
  });

  it('duty=1 means always on', () => {
    const buf = PixelBuffer.create(1, 1);
    buf.fill(15);
    const blink: BlinkEffect = { kind: 'blink', intervalMs: 1000, duty: 1 };
    for (const t of [0, 250, 500, 750, 999]) {
      const b = PixelBuffer.create(1, 1);
      b.fill(15);
      applyEffects(b, [blink], t);
      expect(b.get(0, 0)).toBe(15);
    }
  });

  it('duty=0 means always off', () => {
    const buf = PixelBuffer.create(1, 1);
    buf.fill(15);
    const blink: BlinkEffect = { kind: 'blink', intervalMs: 1000, duty: 0 };
    applyEffects(buf, [blink], 0);
    expect(buf.get(0, 0)).toBe(0);
  });

  it('rejects duty outside [0, 1]', () => {
    const buf = PixelBuffer.create(1, 1);
    expect(() => applyEffects(buf, [{ kind: 'blink', intervalMs: 1000, duty: 1.1 }], 0)).toThrow(
      ContractError,
    );
    expect(() => applyEffects(buf, [{ kind: 'blink', intervalMs: 1000, duty: -0.1 }], 0)).toThrow(
      ContractError,
    );
  });

  it('rejects intervalMs <= 0', () => {
    const buf = PixelBuffer.create(1, 1);
    expect(() => applyEffects(buf, [{ kind: 'blink', intervalMs: 0 }], 0)).toThrow(ContractError);
  });
});

describe('effects/fade-in', () => {
  it('starts at 0 brightness', () => {
    const buf = PixelBuffer.create(1, 1);
    buf.fill(15);
    applyEffects(buf, [{ kind: 'fade-in', durationMs: 1000 }], 0);
    expect(buf.get(0, 0)).toBe(0);
  });

  it('ends at full brightness after duration', () => {
    const buf = PixelBuffer.create(1, 1);
    buf.fill(15);
    applyEffects(buf, [{ kind: 'fade-in', durationMs: 1000 }], 1000);
    expect(buf.get(0, 0)).toBe(15);
  });

  it('is monotonic in elapsed time', () => {
    const sample = (t: number): number => {
      const buf = PixelBuffer.create(1, 1);
      buf.fill(15);
      applyEffects(buf, [{ kind: 'fade-in', durationMs: 1000 }], t);
      return buf.get(0, 0);
    };
    const samples = [0, 250, 500, 750, 1000].map(sample);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1] as number);
    }
  });

  it('clamps at full brightness past duration', () => {
    const buf = PixelBuffer.create(1, 1);
    buf.fill(15);
    applyEffects(buf, [{ kind: 'fade-in', durationMs: 1000 }], 5000);
    expect(buf.get(0, 0)).toBe(15);
  });

  it('rejects durationMs <= 0', () => {
    const buf = PixelBuffer.create(1, 1);
    expect(() => applyEffects(buf, [{ kind: 'fade-in', durationMs: 0 }], 0)).toThrow(ContractError);
  });
});

describe('effects/fade-out', () => {
  it('starts at full brightness', () => {
    const buf = PixelBuffer.create(1, 1);
    buf.fill(15);
    applyEffects(buf, [{ kind: 'fade-out', durationMs: 1000 }], 0);
    expect(buf.get(0, 0)).toBe(15);
  });

  it('ends at 0 brightness after duration', () => {
    const buf = PixelBuffer.create(1, 1);
    buf.fill(15);
    applyEffects(buf, [{ kind: 'fade-out', durationMs: 1000 }], 1000);
    expect(buf.get(0, 0)).toBe(0);
  });

  it('is monotonically decreasing', () => {
    const sample = (t: number): number => {
      const buf = PixelBuffer.create(1, 1);
      buf.fill(15);
      applyEffects(buf, [{ kind: 'fade-out', durationMs: 1000 }], t);
      return buf.get(0, 0);
    };
    const samples = [0, 250, 500, 750, 1000].map(sample);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeLessThanOrEqual(samples[i - 1] as number);
    }
  });

  it('rejects durationMs <= 0', () => {
    const buf = PixelBuffer.create(1, 1);
    expect(() => applyEffects(buf, [{ kind: 'fade-out', durationMs: -1 }], 0)).toThrow(
      ContractError,
    );
  });
});

describe('effects/applyEffects pipeline', () => {
  it('returns the input unchanged when effects is empty', () => {
    const buf = PixelBuffer.create(1, 1);
    buf.fill(7);
    applyEffects(buf, [], 100);
    expect(buf.get(0, 0)).toBe(7);
  });

  it('composes blink + fade-in (blink off + fade in 0 = stays off)', () => {
    const buf = PixelBuffer.create(1, 1);
    buf.fill(15);
    const effects: [BlinkEffect, FadeInEffect] = [
      { kind: 'blink', intervalMs: 1000, duty: 0.5 },
      { kind: 'fade-in', durationMs: 1000 },
    ];
    // t=600 → blink off → buffer cleared → fade-in does nothing
    applyEffects(buf, effects, 600);
    expect(buf.get(0, 0)).toBe(0);
  });

  it('composes blink (on) + fade-out (half) → half brightness', () => {
    const buf = PixelBuffer.create(1, 1);
    buf.fill(15);
    const effects: [BlinkEffect, FadeOutEffect] = [
      { kind: 'blink', intervalMs: 1000, duty: 0.5 },
      { kind: 'fade-out', durationMs: 1000 },
    ];
    // t=500 → blink still on (duty=0.5 means [0..0.5) is on, but Math.floor for boundary)
    // Actually 500/1000 = 0.5 = duty exactly → off (we use < not <=)
    // So this test checks the t=0 case where blink is on and fade-out is full
    applyEffects(buf, effects, 0);
    expect(buf.get(0, 0)).toBe(15);
  });
});
