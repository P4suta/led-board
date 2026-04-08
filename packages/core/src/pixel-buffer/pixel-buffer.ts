import { requires } from '../contracts';

/**
 * A monochrome (4-bit grayscale) bitmap of LED on/off cells.
 *
 * Storage: one byte per cell, value range 0..15. The 16-step brightness lets
 * scrolling/blinking/fading apply anti-aliased intensity without sub-pixel
 * positioning. Memory is `cols * rows` bytes — at 256×128 that's 32 KiB.
 *
 * The buffer is mutable in place: the renderer reuses the same instance every
 * frame to avoid GC pressure on the hot path. Reading from `data` is allowed
 * but mutation should go through the methods so contracts hold.
 */
export class PixelBuffer {
  readonly cols: number;
  readonly rows: number;
  readonly data: Uint8Array;

  private constructor(cols: number, rows: number, data: Uint8Array) {
    this.cols = cols;
    this.rows = rows;
    this.data = data;
  }

  static create(cols: number, rows: number): PixelBuffer {
    requires(Number.isInteger(cols) && cols > 0, 'cols must be a positive integer');
    requires(Number.isInteger(rows) && rows > 0, 'rows must be a positive integer');
    return new PixelBuffer(cols, rows, new Uint8Array(cols * rows));
  }

  get(x: number, y: number): number {
    requires(x >= 0 && x < this.cols, 'x is in [0, cols)');
    requires(y >= 0 && y < this.rows, 'y is in [0, rows)');
    // Index is bounds-checked above; the cast eliminates the `| undefined`
    // narrowing forced by `noUncheckedIndexedAccess`.
    return this.data[y * this.cols + x] as number;
  }

  set(x: number, y: number, level: number): void {
    requires(x >= 0 && x < this.cols, 'x is in [0, cols)');
    requires(y >= 0 && y < this.rows, 'y is in [0, rows)');
    requires(Number.isInteger(level) && level >= 0 && level <= 15, 'level is integer 0..15');
    this.data[y * this.cols + x] = level;
  }

  clear(): void {
    this.data.fill(0);
  }

  fill(level: number): void {
    requires(Number.isInteger(level) && level >= 0 && level <= 15, 'level is integer 0..15');
    this.data.fill(level);
  }

  copyFrom(other: PixelBuffer): void {
    requires(
      other.cols === this.cols && other.rows === this.rows,
      'source buffer has matching dimensions',
    );
    this.data.set(other.data);
  }

  /**
   * Multiply every cell brightness by `factor`, clamped to [0, 15] and rounded.
   * Used for fade-in / fade-out effects.
   */
  multiply(factor: number): void {
    requires(factor >= 0, 'factor must be non-negative');
    const data = this.data;
    const len = data.length;
    for (let i = 0; i < len; i++) {
      const scaled = Math.round((data[i] as number) * factor);
      data[i] = scaled > 15 ? 15 : scaled;
    }
  }

  /**
   * Element-wise max with another buffer of equal size — used for compositing
   * multiple light sources without overflow (true OR-of-light).
   */
  bitOr(other: PixelBuffer): void {
    requires(
      other.cols === this.cols && other.rows === this.rows,
      'other buffer has matching dimensions',
    );
    const data = this.data;
    const otherData = other.data;
    const len = data.length;
    for (let i = 0; i < len; i++) {
      const a = data[i] as number;
      const b = otherData[i] as number;
      if (b > a) data[i] = b;
    }
  }
}
