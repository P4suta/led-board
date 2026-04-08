import { fc, test as fcTest } from '@fast-check/vitest';
import { describe, expect, it } from 'vitest';
import { ContractError } from '../contracts';
import { scrollOffset, wrappedScrollOffset } from './offset';

describe('scroll/scrollOffset', () => {
  it('returns 0 at t=0', () => {
    expect(scrollOffset(0, 100)).toBe(0);
  });

  it('returns speedPxPerSec when t = 1000ms', () => {
    expect(scrollOffset(1000, 100)).toBe(100);
  });

  it('handles fractional ms (sub-pixel offset)', () => {
    expect(scrollOffset(500, 100)).toBe(50);
  });

  it('handles negative speed (right-to-left)', () => {
    expect(scrollOffset(1000, -50)).toBe(-50);
  });

  it('handles speed=0 (stationary)', () => {
    expect(scrollOffset(1000, 0)).toBe(0);
  });

  it('rejects negative elapsed time', () => {
    expect(() => scrollOffset(-1, 100)).toThrow(ContractError);
  });

  it('handles very large elapsed time without overflow', () => {
    // 10 minutes at 100 px/s = 60000 px
    expect(scrollOffset(600_000, 100)).toBe(60_000);
  });
});

describe('scroll/wrappedScrollOffset', () => {
  it('returns 0 when elapsed=0', () => {
    expect(wrappedScrollOffset(0, 100, 50)).toBe(0);
  });

  it('returns 0 when speed=0 regardless of elapsed', () => {
    expect(wrappedScrollOffset(5000, 0, 50)).toBe(0);
  });

  it('wraps modulo totalWidth', () => {
    // speed 100 px/s, totalWidth 50, t=1000ms → offset 100 → wrapped to 0
    expect(wrappedScrollOffset(1000, 100, 50)).toBe(0);
    // t=750ms → offset 75 → wrapped to 25
    expect(wrappedScrollOffset(750, 100, 50)).toBe(25);
  });

  it('handles negative speed (offsets become positive after wrap)', () => {
    // speed -10 px/s, totalWidth 50, t=1000ms → -10 → wraps to 40
    expect(wrappedScrollOffset(1000, -10, 50)).toBe(40);
  });

  it('rejects totalWidth <= 0', () => {
    expect(() => wrappedScrollOffset(0, 100, 0)).toThrow(ContractError);
    expect(() => wrappedScrollOffset(0, 100, -1)).toThrow(ContractError);
  });

  it('rejects negative elapsed time', () => {
    expect(() => wrappedScrollOffset(-1, 100, 50)).toThrow(ContractError);
  });
});

describe('scroll properties', () => {
  fcTest.prop({
    elapsed: fc.integer({ min: 0, max: 1_000_000 }),
    speed: fc.integer({ min: 1, max: 1000 }),
  })('scrollOffset is monotonic in elapsed when speed > 0', ({ elapsed, speed }) => {
    expect(scrollOffset(elapsed, speed)).toBeLessThanOrEqual(scrollOffset(elapsed + 1, speed));
  });

  fcTest.prop({
    elapsed: fc.integer({ min: 0, max: 100_000 }),
    speed: fc.integer({ min: 1, max: 200 }),
  })('scrollOffset is linear: f(2t) = 2*f(t) when starting from 0', ({ elapsed, speed }) => {
    const a = scrollOffset(elapsed, speed);
    const b = scrollOffset(elapsed * 2, speed);
    expect(b).toBe(a * 2);
  });

  fcTest.prop({
    speed: fc.integer({ min: 1, max: 100 }),
    width: fc.integer({ min: 1, max: 200 }),
    cycles: fc.integer({ min: 0, max: 5 }),
  })(
    'wrappedScrollOffset is periodic with period width/speed seconds',
    ({ speed, width, cycles }) => {
      const periodMs = (width / speed) * 1000;
      const t1 = 100;
      const t2 = 100 + cycles * periodMs;
      const a = wrappedScrollOffset(t1, speed, width);
      const b = wrappedScrollOffset(t2, speed, width);
      expect(Math.abs(a - b)).toBeLessThan(1e-6);
    },
  );

  fcTest.prop({
    elapsed: fc.integer({ min: 0, max: 100_000 }),
    speed: fc.integer({ min: -100, max: 100 }).filter((s) => s !== 0),
    width: fc.integer({ min: 1, max: 200 }),
  })('wrappedScrollOffset is always in [0, width)', ({ elapsed, speed, width }) => {
    const off = wrappedScrollOffset(elapsed, speed, width);
    expect(off).toBeGreaterThanOrEqual(0);
    expect(off).toBeLessThan(width);
  });
});
