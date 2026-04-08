/**
 * tools/build-font.ts
 *
 * Build-time script that converts a TrueType bitmap font (Misaki / k8x12L) to
 * the LBFB binary format consumed at runtime by `@led/core`.
 *
 * Source fonts (free for any use, commercial included):
 *   - 美咲フォント (Misaki Gothic)  https://littlelimit.net/misaki.htm
 *   - k8x12 / k8x12L                https://littlelimit.net/k8x12.html
 *
 * Both are © Num Kadoma, distributed under "Unlimited permission ... commercial
 * or non-commercial". See `docs/FONT.md` for the full license text.
 *
 * Usage:
 *   bun run tools/build-font.ts <input.ttf> <output.bin> <cellWidth> <cellHeight> <fontName>
 *
 * Or via the npm script which builds all fonts:
 *   bun run build:font
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import opentype from 'opentype.js';
import { encodeFontBinary } from '../packages/core/src/font/binary';

interface BuildOpts {
  ttfPath: string;
  outPath: string;
  cellWidth: number;
  cellHeight: number;
  fontName: string;
  fontSize: number; // pixel size to render at (= cellHeight for bitmap fonts)
}

function bitsForGlyph(
  ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
  fontFamily: string,
  fontSize: number,
  cellW: number,
  cellH: number,
  ch: string,
): { advance: number; bits: Uint8Array } {
  // Render with extra horizontal margin so wide glyphs don't get clipped.
  const canvasW = cellW * 2;
  const canvasH = cellH;
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = 'white';
  ctx.font = `${fontSize}px "${fontFamily}"`;
  ctx.textBaseline = 'top';
  ctx.fillText(ch, 0, 0);

  const img = ctx.getImageData(0, 0, canvasW, canvasH);

  // Determine actual visual width by scanning for the rightmost lit column
  // within the half-width region; full-width chars span the full cell width.
  let maxX = -1;
  for (let y = 0; y < cellH; y++) {
    for (let x = 0; x < canvasW; x++) {
      const i = (y * canvasW + x) * 4;
      const v = img.data[i] ?? 0;
      if (v > 127 && x > maxX) maxX = x;
    }
  }
  // Half-width if any lit pixel is within the first half of the cell only.
  // We approximate "advance" using the font's measured advance below.
  const halfWidth = cellW / 2;
  const advance = maxX >= halfWidth ? cellW : halfWidth;

  // Pack bits at the cell width (cellW columns) row-major, MSB-first.
  const bytesPerRow = (cellW + 7) >> 3;
  const bits = new Uint8Array(bytesPerRow * cellH);
  for (let y = 0; y < cellH; y++) {
    for (let x = 0; x < cellW; x++) {
      const i = (y * canvasW + x) * 4;
      const v = img.data[i] ?? 0;
      if (v > 127) {
        const byteIdx = y * bytesPerRow + (x >> 3);
        const bitIdx = 7 - (x & 7);
        bits[byteIdx] = (bits[byteIdx] ?? 0) | (1 << bitIdx);
      }
    }
  }
  return { advance, bits };
}

function build({ ttfPath, outPath, cellWidth, cellHeight, fontName, fontSize }: BuildOpts): void {
  console.warn(`[build-font] loading ${ttfPath}`);
  if (!existsSync(ttfPath)) {
    throw new Error(`TTF not found: ${ttfPath}`);
  }

  // Step 1: enumerate codepoints from the font's cmap.
  const otFont = opentype.loadSync(ttfPath);
  const cmap = otFont.tables.cmap;
  if (cmap === undefined) {
    throw new Error('font has no cmap table');
  }
  // opentype.js exposes a glyphIndexMap on the cmap-derived object.
  const codepoints = new Set<number>();
  // biome-ignore lint/suspicious/noExplicitAny: opentype.js types are incomplete for glyphIndexMap
  const glyphIndexMap = (cmap as any).glyphIndexMap as Record<string, number> | undefined;
  if (glyphIndexMap !== undefined) {
    for (const cpStr of Object.keys(glyphIndexMap)) {
      const cp = Number.parseInt(cpStr, 10);
      if (!Number.isNaN(cp) && cp > 0 && cp <= 0xffff) {
        codepoints.add(cp);
      }
    }
  } else {
    // Fallback: walk the glyphs and read their unicodes.
    for (let i = 0; i < otFont.glyphs.length; i++) {
      const g = otFont.glyphs.get(i);
      const us = g.unicodes ?? (g.unicode !== undefined ? [g.unicode] : []);
      for (const cp of us) {
        if (cp > 0 && cp <= 0xffff) codepoints.add(cp);
      }
    }
  }
  console.warn(`[build-font] ${codepoints.size} codepoints in cmap`);

  // Step 2: register the font with @napi-rs/canvas under our chosen family name.
  GlobalFonts.registerFromPath(ttfPath, fontName);

  // Step 3: rasterize each codepoint at native size.
  const canvas = createCanvas(cellWidth * 2, cellHeight);
  const ctx = canvas.getContext('2d');

  const sortedCps = Array.from(codepoints).sort((a, b) => a - b);
  const glyphs: { codepoint: number; advance: number; bits: Uint8Array }[] = [];

  for (const cp of sortedCps) {
    const ch = String.fromCodePoint(cp);
    const { advance, bits } = bitsForGlyph(ctx, fontName, fontSize, cellWidth, cellHeight, ch);
    // Skip glyphs that are completely empty AND not the space (0x20).
    // The space character is intentionally empty.
    const allEmpty = bits.every((b) => b === 0);
    if (allEmpty && cp !== 0x20 && cp !== 0x3000) continue;
    glyphs.push({ codepoint: cp, advance, bits });
  }
  console.warn(`[build-font] ${glyphs.length} glyphs after filtering empties`);

  // Step 4: encode and write.
  const buffer = encodeFontBinary({
    name: fontName,
    cellWidth,
    cellHeight,
    glyphs,
  });
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, new Uint8Array(buffer));
  console.warn(`[build-font] wrote ${outPath} (${buffer.byteLength} bytes)`);
}

// ─── CLI entry ──────────────────────────────────────────────────────────
const [, , ttfPath, outPath, cellWStr, cellHStr, fontName] = process.argv;
if (
  ttfPath === undefined ||
  outPath === undefined ||
  cellWStr === undefined ||
  cellHStr === undefined ||
  fontName === undefined
) {
  console.warn(
    'Usage: bun run tools/build-font.ts <input.ttf> <output.bin> <cellW> <cellH> <name>',
  );
  console.warn('');
  console.warn('Building all bundled fonts via the default targets...');
  // Default: build both fonts from /tmp/led-fonts (where the user's downloads were extracted).
  const FONTS = [
    {
      ttfPath: '/tmp/led-fonts/k8x12/k8x12L.ttf',
      outPath: 'packages/core/assets/k8x12.bin',
      cellWidth: 8,
      cellHeight: 12,
      fontName: 'k8x12L',
      fontSize: 12,
    },
    {
      ttfPath: '/tmp/led-fonts/misaki/misaki_gothic.ttf',
      outPath: 'packages/core/assets/misaki.bin',
      cellWidth: 8,
      cellHeight: 8,
      fontName: 'MisakiGothic',
      fontSize: 8,
    },
  ];
  for (const opts of FONTS) {
    build(opts);
  }
} else {
  build({
    ttfPath,
    outPath,
    cellWidth: Number.parseInt(cellWStr, 10),
    cellHeight: Number.parseInt(cellHStr, 10),
    fontName,
    fontSize: Number.parseInt(cellHStr, 10),
  });
}
