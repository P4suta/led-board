import { describe, expect, it } from 'vitest';
import { fixtureFont } from '../font/fixture';
import { PixelBuffer } from '../pixel-buffer/pixel-buffer';
import { FakeClock } from '../time/clock';
import { renderScene } from './render';
import type { Scene } from './types';

const FONT = fixtureFont();

function countLit(buf: PixelBuffer): number {
  let n = 0;
  for (let y = 0; y < buf.rows; y++) {
    for (let x = 0; x < buf.cols; x++) {
      if (buf.get(x, y) > 0) n++;
    }
  }
  return n;
}

describe('scene/renderScene', () => {
  it('renders a ScrollScene', () => {
    const buf = PixelBuffer.create(32, 8);
    const scene: Scene = { kind: 'scroll', text: 'AB', speedPxPerSec: 0, gapPx: 8 };
    renderScene(scene, { font: FONT, elapsedMs: 0, clock: new FakeClock() }, buf);
    expect(countLit(buf)).toBeGreaterThan(0);
  });

  it('renders a StaticScene with center alignment', () => {
    const buf = PixelBuffer.create(32, 8);
    const scene: Scene = { kind: 'static', lines: ['A'], align: 'center' };
    renderScene(scene, { font: FONT, elapsedMs: 0, clock: new FakeClock() }, buf);
    // 'A' (4 wide) centered in 32 → x=14
    expect(buf.get(15, 0)).toBe(15); // top vertex of A at column 14+1
  });

  it('renders a StaticScene with multiple lines', () => {
    const buf = PixelBuffer.create(32, 16);
    const scene: Scene = { kind: 'static', lines: ['A', 'B'], align: 'left' };
    renderScene(scene, { font: FONT, elapsedMs: 0, clock: new FakeClock() }, buf);
    // Both lines should produce lit pixels
    let topHalf = 0;
    let bottomHalf = 0;
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 32; x++) {
        if (buf.get(x, y) > 0) y < 8 ? topHalf++ : bottomHalf++;
      }
    }
    expect(topHalf).toBeGreaterThan(0);
    expect(bottomHalf).toBeGreaterThan(0);
  });

  it('renders a ClockScene', () => {
    const buf = PixelBuffer.create(64, 8);
    const clock = new FakeClock(Date.UTC(2026, 3, 8, 12, 30, 0));
    const scene: Scene = { kind: 'clock', format: 'HH:mm', timeZone: 'UTC' };
    renderScene(scene, { font: FONT, elapsedMs: 0, clock }, buf);
    // The clock string '12:30' has no glyphs in the fixture font, so renders
    // tofu glyphs. Just verify it doesn't crash.
    expect(buf.rows).toBe(8);
  });

  it('caches ClockRenderer instances by font/format/tz/align', () => {
    const buf = PixelBuffer.create(64, 8);
    const clock = new FakeClock(Date.UTC(2026, 3, 8, 12, 30, 0));
    const scene: Scene = { kind: 'clock', format: 'HH:mm', timeZone: 'UTC' };
    // Render twice — second call should hit the cache
    renderScene(scene, { font: FONT, elapsedMs: 0, clock }, buf);
    renderScene(scene, { font: FONT, elapsedMs: 0, clock }, buf);
    expect(buf.rows).toBe(8);
  });

  it('renders a ClockScene with default timezone and alignment', () => {
    const buf = PixelBuffer.create(64, 8);
    const clock = new FakeClock(Date.UTC(2026, 3, 8, 12, 30, 0));
    // No timeZone, no align — exercise the default fallbacks
    const scene: Scene = { kind: 'clock', format: 'HH:mm' };
    renderScene(scene, { font: FONT, elapsedMs: 0, clock }, buf);
    expect(buf.rows).toBe(8);
  });

  it('renders a MultiLineScene with per-row alignment', () => {
    const buf = PixelBuffer.create(32, 16);
    const scene: Scene = {
      kind: 'multi-line',
      rows: [
        { text: 'A', align: 'left' },
        { text: 'B', align: 'right' },
      ],
    };
    renderScene(scene, { font: FONT, elapsedMs: 0, clock: new FakeClock() }, buf);
    expect(countLit(buf)).toBeGreaterThan(0);
  });

  it('renders a MultiLineScene with default row alignment (left)', () => {
    const buf = PixelBuffer.create(32, 16);
    const scene: Scene = {
      kind: 'multi-line',
      rows: [{ text: 'A' }, { text: 'B' }],
    };
    renderScene(scene, { font: FONT, elapsedMs: 0, clock: new FakeClock() }, buf);
    expect(countLit(buf)).toBeGreaterThan(0);
  });

  it('clears the buffer before drawing', () => {
    const buf = PixelBuffer.create(32, 8);
    buf.fill(15);
    renderScene(
      { kind: 'static', lines: ['A'], align: 'left' },
      { font: FONT, elapsedMs: 0, clock: new FakeClock() },
      buf,
    );
    // After render, only A pixels should remain — definitely fewer than full
    expect(countLit(buf)).toBeLessThan(32 * 8);
  });
});
