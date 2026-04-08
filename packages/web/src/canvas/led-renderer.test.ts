import { PixelBuffer } from '@led/core';
import { describe, expect, it } from 'vitest';
import { LedRenderer, ledColorCss } from './led-renderer';

function makeRenderer(): LedRenderer {
  const canvas = document.createElement('canvas');
  return new LedRenderer({
    canvas,
    cols: 16,
    rows: 8,
    color: 'amber',
    shape: 'round',
    glow: 0,
    background: 'oklch(8% 0.01 240)',
  });
}

describe('canvas/LedRenderer', () => {
  it('constructs without throwing', () => {
    expect(() => makeRenderer()).not.toThrow();
  });

  it('exposes the public configuration as fields', () => {
    const r = makeRenderer();
    expect(r.cols).toBe(16);
    expect(r.rows).toBe(8);
    expect(r.color).toBe('amber');
    expect(r.shape).toBe('round');
    expect(r.glow).toBe(0);
  });

  it('reconfigure() updates the color and rebuilds the atlas', () => {
    const r = makeRenderer();
    r.resize(160, 80);
    r.reconfigure({ color: 'green' });
    expect(r.color).toBe('green');
  });

  it('reconfigure() updates the shape', () => {
    const r = makeRenderer();
    r.resize(160, 80);
    r.reconfigure({ shape: 'square' });
    expect(r.shape).toBe('square');
  });

  it('reconfigure() updates the glow', () => {
    const r = makeRenderer();
    r.resize(160, 80);
    r.reconfigure({ glow: 5 });
    expect(r.glow).toBe(5);
  });

  it('reconfigure() updates the background', () => {
    const r = makeRenderer();
    r.resize(160, 80);
    r.reconfigure({ background: 'black' });
    expect(r.background).toBe('black');
  });

  it('draw() with mismatched buffer dimensions is a no-op', () => {
    const r = makeRenderer();
    r.resize(160, 80);
    const wrong = PixelBuffer.create(32, 8);
    expect(() => r.draw(wrong)).not.toThrow();
  });

  it('draw() with the right buffer does not throw', () => {
    const r = makeRenderer();
    r.resize(160, 80);
    const buf = PixelBuffer.create(16, 8);
    expect(() => r.draw(buf)).not.toThrow();
  });

  it('draw() with glow > 0 does not throw', () => {
    const canvas = document.createElement('canvas');
    const r = new LedRenderer({
      canvas,
      cols: 16,
      rows: 8,
      color: 'amber',
      shape: 'round',
      glow: 3,
      background: 'oklch(8% 0.01 240)',
    });
    r.resize(160, 80);
    expect(() => r.draw(PixelBuffer.create(16, 8))).not.toThrow();
  });

  it('draw() with zero CSS size returns early', () => {
    const r = makeRenderer();
    // Default cssWidth/cssHeight are 0 since we never called resize().
    expect(() => r.draw(PixelBuffer.create(16, 8))).not.toThrow();
  });
});

describe('canvas/ledColorCss', () => {
  it('returns an oklch() string for a known color', () => {
    expect(ledColorCss('red')).toBe('oklch(65% 0.24 32)');
  });

  it('includes alpha when alpha < 1', () => {
    expect(ledColorCss('red', 0.5)).toBe('oklch(65% 0.24 32 / 0.5)');
  });
});
