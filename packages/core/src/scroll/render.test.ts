import { describe, expect, it } from 'vitest';
import { fixtureFont } from '../font/fixture';
import { PixelBuffer } from '../pixel-buffer/pixel-buffer';
import { measureText } from '../text/layout';
import { renderScroll } from './render';

function countLit(buf: PixelBuffer): number {
  let n = 0;
  for (let y = 0; y < buf.rows; y++) {
    for (let x = 0; x < buf.cols; x++) {
      if (buf.get(x, y) > 0) n++;
    }
  }
  return n;
}

describe('scroll/renderScroll', () => {
  const font = fixtureFont();

  it('renders text shifted left by scroll offset', () => {
    const buf = PixelBuffer.create(16, 8);
    renderScroll(buf, {
      text: 'AB',
      font,
      elapsedMs: 0,
      speedPxPerSec: 0, // stationary
      gapPx: 4, // 4px gap before the text repeats
    });
    // At elapsedMs=0, the text starts at x=0
    expect(buf.get(1, 0)).toBe(15); // top of A
  });

  it('shifts the text leftward as time advances', () => {
    const buf1 = PixelBuffer.create(32, 8);
    const buf2 = PixelBuffer.create(32, 8);
    renderScroll(buf1, { text: 'AB', font, elapsedMs: 0, speedPxPerSec: 1000, gapPx: 8 });
    renderScroll(buf2, { text: 'AB', font, elapsedMs: 4, speedPxPerSec: 1000, gapPx: 8 });
    // After 4ms at 1000 px/s = 4px shift
    // The shape should differ between buf1 and buf2
    const diff = (() => {
      let d = 0;
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 32; x++) {
          if (buf1.get(x, y) !== buf2.get(x, y)) d++;
        }
      }
      return d;
    })();
    expect(diff).toBeGreaterThan(0);
  });

  it('loops seamlessly: at one period the buffer matches t=0', () => {
    const text = 'AB';
    const totalWidth = measureText(text, font) + 8;
    const periodMs = (totalWidth / 100) * 1000;
    const buf1 = PixelBuffer.create(32, 8);
    const buf2 = PixelBuffer.create(32, 8);
    renderScroll(buf1, { text, font, elapsedMs: 0, speedPxPerSec: 100, gapPx: 8 });
    renderScroll(buf2, { text, font, elapsedMs: periodMs, speedPxPerSec: 100, gapPx: 8 });
    // The two snapshots should be identical (allowing exact equality since
    // periodMs is computed to land on an integer offset)
    let mismatches = 0;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 32; x++) {
        if (buf1.get(x, y) !== buf2.get(x, y)) mismatches++;
      }
    }
    expect(mismatches).toBe(0);
  });

  it('clears the buffer first by default (additive=false)', () => {
    const buf = PixelBuffer.create(16, 8);
    buf.fill(15); // start fully lit
    renderScroll(buf, { text: 'A', font, elapsedMs: 0, speedPxPerSec: 0, gapPx: 0 });
    // After render, only the A pixels should be lit
    expect(countLit(buf)).toBeLessThan(16 * 8);
  });

  it('keeps the existing buffer when additive=true', () => {
    const buf = PixelBuffer.create(16, 8);
    buf.set(15, 7, 5);
    renderScroll(buf, {
      text: 'A',
      font,
      elapsedMs: 0,
      speedPxPerSec: 0,
      gapPx: 0,
      additive: true,
    });
    expect(buf.get(15, 7)).toBe(5);
  });

  it('returns immediately when text is empty', () => {
    const buf = PixelBuffer.create(16, 8);
    buf.set(5, 5, 7);
    renderScroll(buf, { text: '', font, elapsedMs: 0, speedPxPerSec: 0, gapPx: 0, additive: true });
    expect(buf.get(5, 5)).toBe(7);
  });

  it('shows two copies of text when there is a gap and the buffer is wider', () => {
    const buf = PixelBuffer.create(32, 8);
    // text width = 4 (A) + 4 (gap) = 8 → totalWidth, board width = 32
    renderScroll(buf, {
      text: 'A',
      font,
      elapsedMs: 0,
      speedPxPerSec: 0,
      gapPx: 4,
    });
    // First copy at x=0; second copy at x=8; third at x=16; fourth at x=24
    // Each A occupies 1 lit pixel at column 1 of its origin → 4 lit cells per row
    let topRowLit = 0;
    for (let x = 0; x < 32; x++) {
      if (buf.get(x, 0) > 0) topRowLit++;
    }
    expect(topRowLit).toBeGreaterThanOrEqual(2); // at least 2 copies visible
  });
});
