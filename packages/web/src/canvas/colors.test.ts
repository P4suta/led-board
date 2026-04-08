import { describe, expect, it } from 'vitest';
import { formatOklch, LED_COLORS, scaleIntensity } from './colors';

describe('canvas/colors', () => {
  describe('LED_COLORS palette', () => {
    it('contains all the expected named colors', () => {
      const names = ['red', 'amber', 'jr-orange', 'green', 'blue', 'white', 'cool-white'] as const;
      for (const n of names) {
        expect(LED_COLORS[n]).toBeDefined();
      }
    });

    it('uses the documented hex-equivalent OKLCH values from DESIGN.md §3.2', () => {
      expect(LED_COLORS.red).toEqual({ l: 65, c: 0.24, h: 32 });
      expect(LED_COLORS.amber).toEqual({ l: 80, c: 0.18, h: 75 });
      expect(LED_COLORS.green).toEqual({ l: 85, c: 0.27, h: 145 });
      expect(LED_COLORS.blue).toEqual({ l: 65, c: 0.2, h: 245 });
      expect(LED_COLORS.white).toEqual({ l: 96, c: 0.02, h: 85 });
    });
  });

  describe('formatOklch', () => {
    it('formats without alpha when alpha is 1 (default)', () => {
      const s = formatOklch({ l: 65, c: 0.24, h: 32 });
      expect(s).toBe('oklch(65% 0.24 32)');
    });

    it('formats with alpha when alpha < 1', () => {
      const s = formatOklch({ l: 50, c: 0.1, h: 200 }, 0.5);
      expect(s).toBe('oklch(50% 0.1 200 / 0.5)');
    });
  });

  describe('scaleIntensity', () => {
    it('halves lightness at factor 0.5', () => {
      const out = scaleIntensity({ l: 80, c: 0.18, h: 75 }, 0.5);
      expect(out.l).toBe(40);
    });

    it('preserves chroma and hue', () => {
      const out = scaleIntensity({ l: 80, c: 0.18, h: 75 }, 0.5);
      expect(out.c).toBe(0.18);
      expect(out.h).toBe(75);
    });

    it('returns the same color at factor 1', () => {
      const c = { l: 65, c: 0.24, h: 32 };
      expect(scaleIntensity(c, 1)).toEqual(c);
    });

    it('returns 0 lightness at factor 0', () => {
      expect(scaleIntensity({ l: 80, c: 0.1, h: 100 }, 0).l).toBe(0);
    });
  });
});
