import { describe, expect, it } from 'vitest';
import { ContractError } from '../contracts';
import type { Scene } from '../scene/types';
import { evaluateSequence } from './engine';
import type { Sequence } from './types';

const scene: Scene = { kind: 'static', lines: ['A'], align: 'left' };

function seq(items: { id: string; durationMs: number }[], loop: boolean): Sequence {
  return {
    items: items.map(({ id, durationMs }) => ({ id, scene, durationMs })),
    loop,
  };
}

describe('sequence/evaluateSequence', () => {
  it('returns null for an empty sequence', () => {
    expect(evaluateSequence({ items: [], loop: true }, 0)).toBeNull();
  });

  it('returns the first item at t=0', () => {
    const s = seq([{ id: 'a', durationMs: 1000 }], false);
    const state = evaluateSequence(s, 0);
    expect(state?.itemIndex).toBe(0);
    expect(state?.elapsedInItem).toBe(0);
    expect(state?.phase).toBe('play');
  });

  it('advances within the first item', () => {
    const s = seq([{ id: 'a', durationMs: 1000 }], false);
    const state = evaluateSequence(s, 500);
    expect(state?.itemIndex).toBe(0);
    expect(state?.elapsedInItem).toBe(500);
  });

  it('moves to the second item after the first ends', () => {
    const s = seq(
      [
        { id: 'a', durationMs: 1000 },
        { id: 'b', durationMs: 2000 },
      ],
      false,
    );
    const state = evaluateSequence(s, 1500);
    expect(state?.itemIndex).toBe(1);
    expect(state?.elapsedInItem).toBe(500);
  });

  it('returns null after the last item if loop=false', () => {
    const s = seq(
      [
        { id: 'a', durationMs: 1000 },
        { id: 'b', durationMs: 1000 },
      ],
      false,
    );
    expect(evaluateSequence(s, 2000)).toBeNull();
    expect(evaluateSequence(s, 5000)).toBeNull();
  });

  it('wraps around when loop=true', () => {
    const s = seq(
      [
        { id: 'a', durationMs: 1000 },
        { id: 'b', durationMs: 1000 },
      ],
      true,
    );
    // After full cycle (2000ms) → back to item 0
    expect(evaluateSequence(s, 2000)?.itemIndex).toBe(0);
    expect(evaluateSequence(s, 2500)?.itemIndex).toBe(0);
    expect(evaluateSequence(s, 2500)?.elapsedInItem).toBe(500);
  });

  it('handles enter transition phase', () => {
    const s: Sequence = {
      items: [
        {
          id: 'a',
          scene,
          durationMs: 1000,
          enterTransition: { kind: 'fade', durationMs: 200 },
        },
      ],
      loop: false,
    };
    const state = evaluateSequence(s, 100); // halfway through enter
    expect(state?.phase).toBe('enter');
    expect(state?.transitionProgress).toBeCloseTo(0.5);
  });

  it('handles exit transition phase', () => {
    const s: Sequence = {
      items: [
        {
          id: 'a',
          scene,
          durationMs: 1000,
          exitTransition: { kind: 'fade', durationMs: 200 },
        },
      ],
      loop: false,
    };
    // Item is 1000ms total + 200ms exit = 1200ms total
    // At t=1100, we're 100ms into the exit (halfway)
    const state = evaluateSequence(s, 1100);
    expect(state?.phase).toBe('exit');
    expect(state?.transitionProgress).toBeCloseTo(0.5);
  });

  it('cut transitions have 0ms duration and no enter/exit phases', () => {
    const s: Sequence = {
      items: [
        {
          id: 'a',
          scene,
          durationMs: 1000,
          enterTransition: { kind: 'cut' },
          exitTransition: { kind: 'cut' },
        },
      ],
      loop: false,
    };
    expect(evaluateSequence(s, 0)?.phase).toBe('play');
    expect(evaluateSequence(s, 999)?.phase).toBe('play');
  });

  it('rejects negative elapsedMs', () => {
    const s = seq([{ id: 'a', durationMs: 1000 }], false);
    expect(() => evaluateSequence(s, -1)).toThrow(ContractError);
  });

  it('returns null when loop=true and totalDuration is 0 (all items zero-duration)', () => {
    const s = seq([{ id: 'a', durationMs: 0 }], true);
    expect(evaluateSequence(s, 0)).toBeNull();
  });
});
