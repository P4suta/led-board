import { fc, test as fcTest } from '@fast-check/vitest';
import { describe, expect, it } from 'vitest';
import { ContractError } from '../contracts';
import { PixelBuffer } from './pixel-buffer';

describe('PixelBuffer', () => {
  describe('create', () => {
    it('produces a buffer with the requested dimensions, all cells off', () => {
      const buf = PixelBuffer.create(8, 4);
      expect(buf.cols).toBe(8);
      expect(buf.rows).toBe(4);
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 8; x++) {
          expect(buf.get(x, y)).toBe(0);
        }
      }
    });

    it('handles 1×1 (smallest possible grid)', () => {
      const buf = PixelBuffer.create(1, 1);
      expect(buf.cols).toBe(1);
      expect(buf.rows).toBe(1);
      expect(buf.get(0, 0)).toBe(0);
    });

    it('handles a large 256×128 grid', () => {
      const buf = PixelBuffer.create(256, 128);
      expect(buf.cols).toBe(256);
      expect(buf.rows).toBe(128);
      expect(buf.get(255, 127)).toBe(0);
    });

    it('rejects zero or negative cols', () => {
      expect(() => PixelBuffer.create(0, 4)).toThrow(ContractError);
      expect(() => PixelBuffer.create(-1, 4)).toThrow(ContractError);
    });

    it('rejects zero or negative rows', () => {
      expect(() => PixelBuffer.create(4, 0)).toThrow(ContractError);
      expect(() => PixelBuffer.create(4, -1)).toThrow(ContractError);
    });

    it('rejects non-integer dimensions', () => {
      expect(() => PixelBuffer.create(4.5, 4)).toThrow(ContractError);
      expect(() => PixelBuffer.create(4, 4.5)).toThrow(ContractError);
    });
  });

  describe('get / set', () => {
    it('round-trips a value at every cell', () => {
      const buf = PixelBuffer.create(4, 3);
      buf.set(2, 1, 7);
      expect(buf.get(2, 1)).toBe(7);
    });

    it('accepts the boundary brightness values 0 and 15', () => {
      const buf = PixelBuffer.create(2, 2);
      buf.set(0, 0, 0);
      buf.set(1, 1, 15);
      expect(buf.get(0, 0)).toBe(0);
      expect(buf.get(1, 1)).toBe(15);
    });

    it('rejects coordinates out of bounds (negative)', () => {
      const buf = PixelBuffer.create(4, 3);
      expect(() => buf.get(-1, 0)).toThrow(ContractError);
      expect(() => buf.get(0, -1)).toThrow(ContractError);
      expect(() => buf.set(-1, 0, 5)).toThrow(ContractError);
      expect(() => buf.set(0, -1, 5)).toThrow(ContractError);
    });

    it('rejects coordinates out of bounds (>= cols/rows)', () => {
      const buf = PixelBuffer.create(4, 3);
      expect(() => buf.get(4, 0)).toThrow(ContractError);
      expect(() => buf.get(0, 3)).toThrow(ContractError);
      expect(() => buf.set(4, 0, 5)).toThrow(ContractError);
      expect(() => buf.set(0, 3, 5)).toThrow(ContractError);
    });

    it('rejects brightness levels outside 0..15', () => {
      const buf = PixelBuffer.create(4, 3);
      expect(() => buf.set(0, 0, -1)).toThrow(ContractError);
      expect(() => buf.set(0, 0, 16)).toThrow(ContractError);
      expect(() => buf.set(0, 0, 1.5)).toThrow(ContractError);
    });

    it('does not bleed across rows (uses correct y*cols+x indexing)', () => {
      const buf = PixelBuffer.create(4, 3);
      buf.set(3, 0, 9);
      // The cell at (0, 1) shares the linear index 4 only if cols=4 — verify NO leak.
      expect(buf.get(0, 1)).toBe(0);
      expect(buf.get(3, 0)).toBe(9);
    });
  });

  describe('clear', () => {
    it('zeroes every cell', () => {
      const buf = PixelBuffer.create(3, 2);
      buf.set(0, 0, 5);
      buf.set(2, 1, 15);
      buf.clear();
      for (let y = 0; y < 2; y++) {
        for (let x = 0; x < 3; x++) {
          expect(buf.get(x, y)).toBe(0);
        }
      }
    });
  });

  describe('fill', () => {
    it('sets every cell to the given level', () => {
      const buf = PixelBuffer.create(3, 2);
      buf.fill(11);
      for (let y = 0; y < 2; y++) {
        for (let x = 0; x < 3; x++) {
          expect(buf.get(x, y)).toBe(11);
        }
      }
    });

    it('rejects levels outside 0..15', () => {
      const buf = PixelBuffer.create(3, 2);
      expect(() => buf.fill(-1)).toThrow(ContractError);
      expect(() => buf.fill(16)).toThrow(ContractError);
    });
  });

  describe('copyFrom', () => {
    it('copies every cell from another buffer of equal size', () => {
      const a = PixelBuffer.create(3, 2);
      const b = PixelBuffer.create(3, 2);
      a.set(0, 0, 1);
      a.set(2, 1, 9);
      b.copyFrom(a);
      expect(b.get(0, 0)).toBe(1);
      expect(b.get(2, 1)).toBe(9);
    });

    it('rejects mismatched dimensions', () => {
      const a = PixelBuffer.create(3, 2);
      const b = PixelBuffer.create(4, 2);
      expect(() => b.copyFrom(a)).toThrow(ContractError);
      const c = PixelBuffer.create(3, 3);
      expect(() => c.copyFrom(a)).toThrow(ContractError);
    });
  });

  describe('multiply (fade)', () => {
    it('halves brightness when factor is 0.5', () => {
      const buf = PixelBuffer.create(2, 1);
      buf.set(0, 0, 10);
      buf.set(1, 0, 4);
      buf.multiply(0.5);
      expect(buf.get(0, 0)).toBe(5);
      expect(buf.get(1, 0)).toBe(2);
    });

    it('zeroes everything when factor is 0', () => {
      const buf = PixelBuffer.create(2, 1);
      buf.fill(15);
      buf.multiply(0);
      expect(buf.get(0, 0)).toBe(0);
      expect(buf.get(1, 0)).toBe(0);
    });

    it('clamps to max 15 when factor would overflow', () => {
      const buf = PixelBuffer.create(1, 1);
      buf.set(0, 0, 10);
      buf.multiply(2.0);
      expect(buf.get(0, 0)).toBe(15);
    });

    it('preserves identity when factor is 1', () => {
      const buf = PixelBuffer.create(2, 1);
      buf.set(0, 0, 7);
      buf.set(1, 0, 12);
      buf.multiply(1);
      expect(buf.get(0, 0)).toBe(7);
      expect(buf.get(1, 0)).toBe(12);
    });

    it('rejects negative factors', () => {
      const buf = PixelBuffer.create(1, 1);
      expect(() => buf.multiply(-0.1)).toThrow(ContractError);
    });
  });

  describe('bitOr', () => {
    it('takes the maximum brightness of each cell', () => {
      const a = PixelBuffer.create(2, 1);
      const b = PixelBuffer.create(2, 1);
      a.set(0, 0, 5);
      a.set(1, 0, 12);
      b.set(0, 0, 8);
      b.set(1, 0, 3);
      a.bitOr(b);
      expect(a.get(0, 0)).toBe(8); // max(5, 8)
      expect(a.get(1, 0)).toBe(12); // max(12, 3)
    });

    it('rejects mismatched dimensions', () => {
      const a = PixelBuffer.create(3, 2);
      const b = PixelBuffer.create(4, 2);
      expect(() => a.bitOr(b)).toThrow(ContractError);
    });
  });

  // ── Property tests ──────────────────────────────────────────────────
  describe('properties', () => {
    fcTest.prop({
      cols: fc.integer({ min: 1, max: 64 }),
      rows: fc.integer({ min: 1, max: 32 }),
      level: fc.integer({ min: 0, max: 15 }),
    })('set then get returns the same value', ({ cols, rows, level }) => {
      const buf = PixelBuffer.create(cols, rows);
      const x = (cols - 1) >> 1;
      const y = (rows - 1) >> 1;
      buf.set(x, y, level);
      expect(buf.get(x, y)).toBe(level);
    });

    fcTest.prop({
      cols: fc.integer({ min: 1, max: 32 }),
      rows: fc.integer({ min: 1, max: 16 }),
      level: fc.integer({ min: 0, max: 15 }),
    })('fill makes every cell equal to the given level', ({ cols, rows, level }) => {
      const buf = PixelBuffer.create(cols, rows);
      buf.fill(level);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          expect(buf.get(x, y)).toBe(level);
        }
      }
    });

    fcTest.prop({
      cols: fc.integer({ min: 1, max: 16 }),
      rows: fc.integer({ min: 1, max: 16 }),
    })('copyFrom is identity-preserving', ({ cols, rows }) => {
      const a = PixelBuffer.create(cols, rows);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          a.set(x, y, (x + y) & 0xf);
        }
      }
      const b = PixelBuffer.create(cols, rows);
      b.copyFrom(a);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          expect(b.get(x, y)).toBe(a.get(x, y));
        }
      }
    });

    fcTest.prop({
      level: fc.integer({ min: 0, max: 15 }),
    })('bitOr with self is identity', (props) => {
      const buf = PixelBuffer.create(4, 2);
      buf.fill(props.level);
      const copy = PixelBuffer.create(4, 2);
      copy.fill(props.level);
      buf.bitOr(copy);
      for (let y = 0; y < 2; y++) {
        for (let x = 0; x < 4; x++) {
          expect(buf.get(x, y)).toBe(props.level);
        }
      }
    });
  });
});
