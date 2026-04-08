import { describe, expect, it } from 'vitest';
import { SpriteAtlas } from './sprite-atlas';

describe('canvas/SpriteAtlas', () => {
  it('produces 16 sprites for 16 brightness levels', () => {
    const atlas = new SpriteAtlas({
      color: 'amber',
      shape: 'round',
      pitchPx: 8,
      diameterPx: 6,
    });
    expect(atlas.sprites).toHaveLength(16);
  });

  it('clamps level access to [0, 15]', () => {
    const atlas = new SpriteAtlas({
      color: 'amber',
      shape: 'round',
      pitchPx: 8,
      diameterPx: 6,
    });
    expect(atlas.get(-5)).toBe(atlas.sprites[0]);
    expect(atlas.get(99)).toBe(atlas.sprites[15]);
    expect(atlas.get(7)).toBe(atlas.sprites[7]);
    expect(atlas.get(7.9)).toBe(atlas.sprites[7]); // truncated
  });

  it('preserves the requested options on the instance', () => {
    const atlas = new SpriteAtlas({
      color: 'red',
      shape: 'square',
      pitchPx: 12,
      diameterPx: 10,
    });
    expect(atlas.opts.color).toBe('red');
    expect(atlas.opts.shape).toBe('square');
    expect(atlas.opts.pitchPx).toBe(12);
    expect(atlas.opts.diameterPx).toBe(10);
  });

  it('does not throw for any of the supported shapes', () => {
    for (const shape of ['round', 'square', 'rounded'] as const) {
      expect(() => {
        new SpriteAtlas({ color: 'green', shape, pitchPx: 10, diameterPx: 8 });
      }).not.toThrow();
    }
  });

  it('does not throw for any of the supported colors', () => {
    const colors = ['red', 'amber', 'jr-orange', 'green', 'blue', 'white', 'cool-white'] as const;
    for (const color of colors) {
      expect(() => {
        new SpriteAtlas({ color, shape: 'round', pitchPx: 8, diameterPx: 6 });
      }).not.toThrow();
    }
  });
});
