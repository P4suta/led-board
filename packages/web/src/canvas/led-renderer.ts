import type { PixelBuffer } from '@led/core';
import { formatOklch, LED_COLORS, type LedColorName } from './colors';
import { resizeCanvasToDpr } from './dpr';
import { type DotShape, SpriteAtlas } from './sprite-atlas';

export interface LedRendererOpts {
  /** The visible canvas to draw into. */
  readonly canvas: HTMLCanvasElement;
  /** Logical board columns and rows. */
  readonly cols: number;
  readonly rows: number;
  /** LED foreground color. */
  readonly color: LedColorName;
  /** Dot shape. */
  readonly shape: DotShape;
  /** Glow strength in pixels (0 disables the halation pass). */
  readonly glow: number;
  /** Background color (CSS string, typically very dark). */
  readonly background: string;
}

/**
 * Canvas LED dot-matrix renderer.
 *
 * Owns a sprite atlas (one per (color, shape, pitch)) and a per-frame
 * `drawImage` loop. The hot path allocates nothing inside the inner loop:
 * the data byte array is read directly from the `PixelBuffer` and the cell
 * coordinates are integers.
 *
 * Glow compositing is done in two passes when `glow > 0`:
 *   1. Blur an offscreen copy of the dots and composite onto the visible
 *      canvas with `globalCompositeOperation = 'screen'`.
 *   2. Draw the sharp dot canvas on top.
 */
export class LedRenderer {
  cols: number;
  rows: number;
  color: LedColorName;
  shape: DotShape;
  glow: number;
  background: string;

  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private pitch = 1; // CSS pixels per cell, computed on resize
  private cssWidth = 0;
  private cssHeight = 0;
  private atlas: SpriteAtlas;
  private dotCanvas: OffscreenCanvas | HTMLCanvasElement;

  constructor(opts: LedRendererOpts) {
    this.canvas = opts.canvas;
    const ctx = this.canvas.getContext('2d');
    if (ctx === null) {
      throw new Error('LedRenderer: 2D context unavailable');
    }
    this.ctx = ctx;
    this.cols = opts.cols;
    this.rows = opts.rows;
    this.color = opts.color;
    this.shape = opts.shape;
    this.glow = opts.glow;
    this.background = opts.background;

    // Initial sizing — caller should call `resize()` after the canvas is
    // attached to the DOM and we know its CSS size.
    this.atlas = this.buildAtlas(8); // 8px placeholder pitch
    this.dotCanvas = makeOffscreen(8, 8);
  }

  /**
   * Update the canvas to match `cssWidth × cssHeight` and recompute the
   * pitch (cells fit edge-to-edge while preserving the cols/rows aspect).
   */
  resize(cssWidth: number, cssHeight: number): void {
    this.cssWidth = cssWidth;
    this.cssHeight = cssHeight;
    this.dpr = resizeCanvasToDpr(this.canvas, cssWidth, cssHeight);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // Compute pitch in CSS pixels (then sprites use pitch * dpr internally)
    const pitchCss = Math.max(2, Math.floor(Math.min(cssWidth / this.cols, cssHeight / this.rows)));
    this.pitch = pitchCss;
    const pitchNative = Math.max(2, Math.round(pitchCss * this.dpr));
    this.atlas = this.buildAtlas(pitchNative);
    this.dotCanvas = makeOffscreen(this.canvas.width, this.canvas.height);
  }

  /** Reconfigure color/shape/glow without changing the size. */
  reconfigure(
    opts: Partial<Pick<LedRendererOpts, 'color' | 'shape' | 'glow' | 'background'>>,
  ): void {
    if (opts.color !== undefined) this.color = opts.color;
    if (opts.shape !== undefined) this.shape = opts.shape;
    if (opts.glow !== undefined) this.glow = opts.glow;
    if (opts.background !== undefined) this.background = opts.background;
    if (opts.color !== undefined || opts.shape !== undefined) {
      this.atlas = this.buildAtlas(Math.round(this.pitch * this.dpr));
    }
  }

  /**
   * Draw one frame from the given `PixelBuffer`. The buffer's dimensions
   * must match `cols × rows` (we don't validate every frame for speed).
   */
  draw(buffer: PixelBuffer): void {
    if (buffer.cols !== this.cols || buffer.rows !== this.rows) {
      // Buffer was resized externally — bail. Caller should call resize first.
      return;
    }

    const w = this.cssWidth;
    const h = this.cssHeight;
    if (w === 0 || h === 0) return;

    // Center the dot grid in the canvas with letterbox padding.
    const gridW = this.pitch * this.cols;
    const gridH = this.pitch * this.rows;
    const offsetX = Math.floor((w - gridW) / 2);
    const offsetY = Math.floor((h - gridH) / 2);

    // Background fill
    this.ctx.save();
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.fillStyle = this.background;
    this.ctx.fillRect(0, 0, w, h);
    this.ctx.restore();

    if (this.glow > 0) {
      // Render dots into the offscreen, then composite with blur.
      const offCtx = this.dotCanvas.getContext('2d') as
        | CanvasRenderingContext2D
        | OffscreenCanvasRenderingContext2D
        | null as CanvasRenderingContext2D | null;
      if (offCtx !== null) {
        offCtx.setTransform(1, 0, 0, 1, 0, 0);
        offCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        offCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.drawDots(offCtx, offsetX, offsetY, buffer);
      }
      // Glow pass
      this.ctx.save();
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.filter = `blur(${this.glow * this.dpr}px)`;
      this.ctx.globalCompositeOperation = 'screen';
      this.ctx.globalAlpha = 0.6;
      this.ctx.drawImage(
        this.dotCanvas as CanvasImageSource,
        0,
        0,
        this.canvas.width,
        this.canvas.height,
      );
      this.ctx.restore();
      // Sharp pass
      this.ctx.save();
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.filter = 'none';
      this.ctx.drawImage(
        this.dotCanvas as CanvasImageSource,
        0,
        0,
        this.canvas.width,
        this.canvas.height,
      );
      this.ctx.restore();
    } else {
      this.ctx.save();
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.drawDots(this.ctx, offsetX, offsetY, buffer);
      this.ctx.restore();
    }
  }

  private drawDots(
    ctx: CanvasRenderingContext2D,
    offsetX: number,
    offsetY: number,
    buffer: PixelBuffer,
  ): void {
    const cols = this.cols;
    const rows = this.rows;
    const pitch = this.pitch;
    const data = buffer.data;
    for (let y = 0; y < rows; y++) {
      const yPx = offsetY + y * pitch;
      const rowOffset = y * cols;
      for (let x = 0; x < cols; x++) {
        const level = data[rowOffset + x] as number;
        const sprite = this.atlas.get(level);
        ctx.drawImage(sprite as CanvasImageSource, offsetX + x * pitch, yPx, pitch, pitch);
      }
    }
  }

  private buildAtlas(pitchNative: number): SpriteAtlas {
    const diameter = Math.max(2, Math.round(pitchNative * 0.85));
    return new SpriteAtlas({
      color: this.color,
      shape: this.shape,
      pitchPx: pitchNative,
      diameterPx: diameter,
    });
  }
}

function makeOffscreen(w: number, h: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(w, h);
  }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Convenience: format a CSS color from an LED color name (used by callers). */
export function ledColorCss(name: LedColorName, alpha: number = 1): string {
  return formatOklch(LED_COLORS[name], alpha);
}
