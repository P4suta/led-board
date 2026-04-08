import { describe, expect, it, vi } from 'vitest';
import { ContractError } from '../contracts';
import { FakeClock, SystemClock } from './clock';

describe('SystemClock', () => {
  it('returns the current Date.now() value', () => {
    const fixed = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(fixed);
    const clock = new SystemClock();
    expect(clock.now()).toBe(fixed);
    vi.restoreAllMocks();
  });

  it('returns a non-negative number with no mock', () => {
    const clock = new SystemClock();
    expect(clock.now()).toBeGreaterThanOrEqual(0);
  });
});

describe('FakeClock', () => {
  it('starts at 0 by default', () => {
    const clock = new FakeClock();
    expect(clock.now()).toBe(0);
  });

  it('starts at the given initial value', () => {
    const clock = new FakeClock(500);
    expect(clock.now()).toBe(500);
  });

  it('advances by the given delta', () => {
    const clock = new FakeClock(100);
    clock.advance(50);
    expect(clock.now()).toBe(150);
    clock.advance(25);
    expect(clock.now()).toBe(175);
  });

  it('rejects negative advance deltas', () => {
    const clock = new FakeClock();
    expect(() => clock.advance(-1)).toThrow(ContractError);
  });

  it('allows advance(0) (no-op)', () => {
    const clock = new FakeClock(100);
    clock.advance(0);
    expect(clock.now()).toBe(100);
  });

  it('set() jumps to an absolute time', () => {
    const clock = new FakeClock(100);
    clock.set(50);
    expect(clock.now()).toBe(50);
  });

  it('set() rejects negative times', () => {
    const clock = new FakeClock();
    expect(() => clock.set(-1)).toThrow(ContractError);
  });

  it('set() allows time 0', () => {
    const clock = new FakeClock(100);
    clock.set(0);
    expect(clock.now()).toBe(0);
  });

  it('rejects negative initial values in constructor', () => {
    expect(() => new FakeClock(-1)).toThrow(ContractError);
  });
});
