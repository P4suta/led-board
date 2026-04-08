/**
 * LED color palette as OKLCH triples (Lightness, Chroma, Hue).
 * Mirrors the `--led-*` tokens declared in `styles/tokens.css` and
 * documented in `DESIGN.md` §3.2.
 *
 * The renderer uses these to generate per-intensity sprites — at intensity
 * 1.0 the sprite uses the full lightness; at lower intensities the lightness
 * scales linearly.
 */
export type LedColorName =
  | 'red'
  | 'amber'
  | 'jr-orange'
  | 'green'
  | 'blue'
  | 'white'
  | 'cool-white';

export interface OklchColor {
  /** Lightness percentage at full intensity (0..100). */
  readonly l: number;
  /** Chroma (typically 0..0.4). */
  readonly c: number;
  /** Hue angle in degrees. */
  readonly h: number;
}

export const LED_COLORS: Readonly<Record<LedColorName, OklchColor>> = {
  red: { l: 65, c: 0.24, h: 32 },
  amber: { l: 80, c: 0.18, h: 75 },
  'jr-orange': { l: 72, c: 0.19, h: 55 },
  green: { l: 85, c: 0.27, h: 145 },
  blue: { l: 65, c: 0.2, h: 245 },
  white: { l: 96, c: 0.02, h: 85 },
  'cool-white': { l: 96, c: 0.005, h: 240 },
};

/** Format an OKLCH color for use in CSS / canvas fillStyle. */
export function formatOklch(color: OklchColor, alpha: number = 1): string {
  return `oklch(${color.l}% ${color.c} ${color.h}${alpha < 1 ? ` / ${alpha}` : ''})`;
}

/**
 * Scale an OKLCH color's lightness by a factor (0..1). Used to dim a sprite
 * for lower brightness levels — the LED gets dimmer as intensity drops.
 */
export function scaleIntensity(color: OklchColor, factor: number): OklchColor {
  return { l: color.l * factor, c: color.c, h: color.h };
}
