import { fc, test as fcTest } from '@fast-check/vitest';
import { describe, expect, it } from 'vitest';
import { ContractError } from '../contracts';
import { fixtureFont } from '../font/fixture';
import { layoutText, measureText, wrapText } from './layout';

describe('text/measureText', () => {
  const font = fixtureFont();

  it('returns 0 for empty input', () => {
    expect(measureText('', font)).toBe(0);
  });

  it('returns the advance of a single half-width char', () => {
    expect(measureText('A', font)).toBe(4);
  });

  it('returns the advance of a single full-width char', () => {
    expect(measureText('あ', font)).toBe(8);
  });

  it('sums advances + (n-1) * gapPx for half-width', () => {
    // "AB" with gap=1 → 4 + 1 + 4 = 9
    expect(measureText('AB', font, { gapPx: 1 })).toBe(9);
  });

  it('sums advances with no gap when gapPx=0 (default)', () => {
    expect(measureText('AB', font)).toBe(8);
  });

  it('handles mixed half-/full-width', () => {
    // "Aあ" with gap=1 → 4 + 1 + 8 = 13
    expect(measureText('Aあ', font, { gapPx: 1 })).toBe(13);
  });

  it('returns the WIDEST line for multi-line text', () => {
    // Line 1: "AB" → 8, Line 2: "あ" → 8 (with gap 0)
    expect(measureText('AB\nあ', font)).toBe(8);
    // Line 1: "AAA" → 12, Line 2: "B" → 4
    expect(measureText('AAA\nB', font)).toBe(12);
  });

  it('uses tofu width for unmapped codepoints', () => {
    // 0x9999 not in fixture font → tofu glyph (advance = cellWidth = 8)
    expect(measureText('\u9999', font)).toBe(8);
  });
});

describe('text/layoutText', () => {
  const font = fixtureFont();

  it('returns no placements for empty text', () => {
    expect(layoutText('', font)).toEqual([]);
  });

  it('places a single glyph at (0, 0) by default', () => {
    const placements = layoutText('A', font);
    expect(placements).toHaveLength(1);
    expect(placements[0]?.x).toBe(0);
    expect(placements[0]?.y).toBe(0);
    expect(placements[0]?.codepoint).toBe(0x41);
  });

  it('advances x by glyph.advance for each char', () => {
    const placements = layoutText('AB', font);
    expect(placements).toHaveLength(2);
    expect(placements[0]?.x).toBe(0);
    expect(placements[1]?.x).toBe(4);
  });

  it('inserts gapPx between glyphs', () => {
    const placements = layoutText('AB', font, { gapPx: 2 });
    expect(placements[1]?.x).toBe(6); // 4 + 2
  });

  it('handles newline by resetting x and advancing y by cellHeight + lineGap', () => {
    const placements = layoutText('A\nB', font, { lineGapPx: 1 });
    expect(placements).toHaveLength(2);
    expect(placements[0]?.x).toBe(0);
    expect(placements[0]?.y).toBe(0);
    expect(placements[1]?.x).toBe(0);
    expect(placements[1]?.y).toBe(9); // 8 + 1
  });

  it('does not produce a placement for the newline character itself', () => {
    const placements = layoutText('AB\nCD', font);
    expect(placements).toHaveLength(4); // not 5
  });

  it('aligns center when align=center and align width is provided', () => {
    // "A" is 4px wide; in a 12px alignWidth, x = (12 - 4) / 2 = 4
    const placements = layoutText('A', font, { align: 'center', alignWidth: 12 });
    expect(placements[0]?.x).toBe(4);
  });

  it('aligns right when align=right', () => {
    const placements = layoutText('A', font, { align: 'right', alignWidth: 12 });
    expect(placements[0]?.x).toBe(8); // 12 - 4
  });

  it('aligns each line independently when multi-line + center', () => {
    // Line 1: "AAA" (12 wide) in 16 → x=2; line 2: "A" (4) in 16 → x=6
    const placements = layoutText('AAA\nA', font, { align: 'center', alignWidth: 16 });
    expect(placements[0]?.x).toBe(2); // first A of line 1
    expect(placements[3]?.x).toBe(6); // single A of line 2
  });

  it('handles surrogate pairs (codepoint > U+FFFF) correctly', () => {
    // 0x1F600 grinning face emoji — not in font, but tofu still returns a glyph
    const placements = layoutText('\u{1F600}', font);
    expect(placements).toHaveLength(1);
  });

  it('rejects negative gapPx', () => {
    expect(() => layoutText('A', font, { gapPx: -1 })).toThrow(ContractError);
  });

  it('rejects align without alignWidth', () => {
    expect(() => layoutText('A', font, { align: 'center' })).toThrow(ContractError);
  });
});

describe('text/wrapText', () => {
  const font = fixtureFont();

  it('returns the input unchanged when it fits', () => {
    expect(wrapText('AB', font, 16)).toEqual(['AB']);
  });

  it('breaks at character boundaries when text exceeds maxWidth', () => {
    // "AAAA" with each A = 4px = 16 total. maxWidth=8 → "AA", "AA"
    expect(wrapText('AAAA', font, 8)).toEqual(['AA', 'AA']);
  });

  it('breaks at spaces preferentially when present', () => {
    // "AA AA" — should break at the space, not mid-word
    // Each A = 4, space = 4, so AA + space + AA = 4+4+4+4+4 = 20
    // maxWidth=12 → "AA " (or "AA"), "AA"
    const lines = wrapText('AA AA', font, 12);
    expect(lines.length).toBe(2);
    expect(lines[0]?.replace(/\s+$/, '')).toBe('AA');
    expect(lines[1]?.replace(/\s+/, '')).toBe('AA');
  });

  it('handles existing newlines as hard breaks', () => {
    expect(wrapText('A\nB', font, 100)).toEqual(['A', 'B']);
  });

  it('returns single line for empty text', () => {
    expect(wrapText('', font, 100)).toEqual(['']);
  });

  it('handles a single character wider than maxWidth (degenerate case)', () => {
    // "あ" is 8 wide; maxWidth=4 → still emit it on its own line
    expect(wrapText('あ', font, 4)).toEqual(['あ']);
  });

  it('rejects maxWidth <= 0', () => {
    expect(() => wrapText('A', font, 0)).toThrow(ContractError);
    expect(() => wrapText('A', font, -1)).toThrow(ContractError);
  });
});

describe('text properties', () => {
  const font = fixtureFont();

  fcTest.prop({
    s: fc.stringMatching(/^[AB]{0,5}$/),
  })('measureText is sum of advances when no gap and single line', ({ s }) => {
    const expected = s.length * 4; // every glyph in [AB] is 4 wide
    expect(measureText(s, font)).toBe(expected);
  });

  fcTest.prop({
    s: fc.stringMatching(/^[AB]{1,5}$/),
    gap: fc.integer({ min: 0, max: 4 }),
  })('measureText respects gap = (n-1) * gapPx', ({ s, gap }) => {
    const advances = s.length * 4;
    const gaps = (s.length - 1) * gap;
    expect(measureText(s, font, { gapPx: gap })).toBe(advances + gaps);
  });

  fcTest.prop({
    s: fc.stringMatching(/^[AB]{1,8}$/),
  })('layoutText returns one placement per code point (no newlines)', ({ s }) => {
    const placements = layoutText(s, font);
    expect(placements.length).toBe(s.length);
  });
});
