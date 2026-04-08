import { formatOklch, LED_COLORS, type LedColorName, scaleIntensity } from './colors';

export type DotShape = 'round' | 'square' | 'rounded';

export interface SpriteAtlasOpts {
  readonly color: LedColorName;
  readonly shape: DotShape;
  /** Pixel width of one cell at native (DPR-scaled) resolution. */
  readonly pitchPx: number;
  /** Diameter of the lit dot at native resolution (typically pitchPx * 0.85). */
  readonly diameterPx: number;
}

/**
 * Pre-rendered LED dot sprites at 16 intensity levels (0..15).
 *
 * Each sprite is drawn ONCE on construction with a radial gradient that
 * mimics a physical LED's cone-shaped emission. The renderer then issues
 * one `drawImage(atlas[level], x, y)` call per cell per frame, which is
 * dramatically faster than re-issuing `arc()` paths every frame.
 *
 * The "off" sprite (level 0) is faintly lit (~8% of full brightness) so the
 * matrix retains physical character even when no scene is active.
 */
export class SpriteAtlas {
  readonly opts: SpriteAtlasOpts;
  readonly sprites: ReadonlyArray<OffscreenCanvas | HTMLCanvasElement>;

  constructor(opts: SpriteAtlasOpts) {
    this.opts = opts;
    this.sprites = buildSprites(opts);
  }

  get(level: number): OffscreenCanvas | HTMLCanvasElement {
    const clamped = level < 0 ? 0 : level > 15 ? 15 : level | 0;
    return this.sprites[clamped] as OffscreenCanvas | HTMLCanvasElement;
  }
}

function buildSprites(opts: SpriteAtlasOpts): Array<OffscreenCanvas | HTMLCanvasElement> {
  const sprites: Array<OffscreenCanvas | HTMLCanvasElement> = [];
  for (let i = 0; i < 16; i++) {
    sprites.push(buildOneSprite(opts, i));
  }
  return sprites;
}

function buildOneSprite(opts: SpriteAtlasOpts, level: number): OffscreenCanvas | HTMLCanvasElement {
  const size = opts.pitchPx;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  if (ctx === null) return canvas;

  // Off-dot is visible at ~8% intensity. Fade smoothly from there to full.
  const minFraction = 0.08;
  const intensity = level === 0 ? minFraction : minFraction + (1 - minFraction) * (level / 15);
  const baseColor = LED_COLORS[opts.color];
  const litColor = scaleIntensity(baseColor, intensity);

  drawDot(ctx, size, opts, litColor);
  return canvas;
}

function drawDot(
  ctx: CanvasRenderingContext2D,
  size: number,
  opts: SpriteAtlasOpts,
  color: ReturnType<typeof scaleIntensity>,
): void {
  const r = opts.diameterPx / 2;
  const cx = size / 2;
  const cy = size / 2;

  if (opts.shape === 'square') {
    ctx.fillStyle = formatOklch(color);
    const s = opts.diameterPx;
    ctx.fillRect(cx - r, cy - r, s, s);
    return;
  }

  // Round / rounded: use a radial gradient for the LED glow profile.
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, formatOklch({ l: Math.min(100, color.l + 12), c: color.c, h: color.h }));
  grad.addColorStop(0.5, formatOklch(color, 0.92));
  grad.addColorStop(0.85, formatOklch({ l: color.l * 0.55, c: color.c, h: color.h }, 0.55));
  grad.addColorStop(1.0, formatOklch({ l: color.l * 0.25, c: color.c, h: color.h }, 0.05));
  ctx.fillStyle = grad;

  if (opts.shape === 'rounded') {
    const s = opts.diameterPx;
    const corner = s * 0.3;
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(cx - r, cy - r, s, s, corner);
      ctx.fill();
      return;
    }
    // Fallback: simple square
    ctx.fillRect(cx - r, cy - r, s, s);
    return;
  }

  // round
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Create a canvas — `OffscreenCanvas` if supported, otherwise a detached
 * `HTMLCanvasElement`. happy-dom and SSR fall through to the latter.
 */
function createCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}
