import { afterEach, describe, expect, it, vi } from 'vitest';
import { resizeCanvasToDpr } from './dpr';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('canvas/resizeCanvasToDpr', () => {
  function makeCanvas(): HTMLCanvasElement {
    return document.createElement('canvas');
  }

  it('sets canvas.width and height to cssSize × dpr', () => {
    vi.stubGlobal('window', { devicePixelRatio: 2 });
    const c = makeCanvas();
    resizeCanvasToDpr(c, 100, 50);
    expect(c.width).toBe(200);
    expect(c.height).toBe(100);
  });

  it('caps DPR at 2 even on 4× displays', () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 4, configurable: true });
    const c = makeCanvas();
    const dpr = resizeCanvasToDpr(c, 100, 100);
    expect(dpr).toBe(2);
    expect(c.width).toBe(200);
  });

  it('returns 1 when devicePixelRatio is 1', () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true });
    const c = makeCanvas();
    const dpr = resizeCanvasToDpr(c, 100, 100);
    expect(dpr).toBe(1);
    expect(c.width).toBe(100);
  });

  it('sets the CSS style.width and style.height in CSS pixels', () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });
    const c = makeCanvas();
    resizeCanvasToDpr(c, 200, 75);
    expect(c.style.width).toBe('200px');
    expect(c.style.height).toBe('75px');
  });

  it('does not reassign canvas.width when already correct (avoids flicker)', () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true });
    const c = makeCanvas();
    c.width = 100;
    c.height = 50;
    // No change should occur
    resizeCanvasToDpr(c, 100, 50);
    expect(c.width).toBe(100);
    expect(c.height).toBe(50);
  });
});
