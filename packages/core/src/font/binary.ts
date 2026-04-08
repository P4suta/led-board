import { ensures, requires } from '../contracts';
import type { Font, Glyph } from './types';

/**
 * Binary font format ("LBFB" — LED Board Font Binary).
 *
 * Layout (little-endian):
 * ```
 * offset  size  field
 * ──────  ────  ─────
 *   0      4    magic = "LBFB" (0x4C 0x42 0x46 0x42)
 *   4      1    version = 1
 *   5      1    cellWidth (pixels)
 *   6      1    cellHeight (pixels)
 *   7      1    nameLength (bytes, max 255)
 *   8      4    glyphCount (uint32)
 *  12      4    bytesPerGlyph (uint32) = ceil(cellWidth * cellHeight / 8)
 *  16      N    name (UTF-8, nameLength bytes)
 *  16+N    4*C  codepoints (uint32 * glyphCount, sorted ascending)
 *  16+N+4C C    advances (uint8 * glyphCount)
 *  16+N+5C BPG*C  bitmaps (bytesPerGlyph bytes per glyph)
 * ```
 *
 * Bitmap bit layout: row-major, MSB-first within each byte.
 * bit (7 - (x & 7)) of byte (y * bytesPerRow + (x >> 3)).
 */

const MAGIC = new Uint8Array([0x4c, 0x42, 0x46, 0x42]); // "LBFB"
const VERSION = 1;
const HEADER_SIZE = 16;

export interface FontSpec {
  readonly name: string;
  readonly cellWidth: number;
  readonly cellHeight: number;
  readonly glyphs: ReadonlyArray<{
    readonly codepoint: number;
    readonly advance: number;
    readonly bits: Uint8Array;
  }>;
}

function bytesPerGlyphFor(cellWidth: number, cellHeight: number): number {
  const bytesPerRow = (cellWidth + 7) >> 3;
  return bytesPerRow * cellHeight;
}

export function encodeFontBinary(spec: FontSpec): ArrayBuffer {
  const { name, cellWidth, cellHeight, glyphs } = spec;
  requires(glyphs.length > 0, 'font must have at least one glyph');
  requires(cellWidth > 0 && cellHeight > 0, 'cell dimensions must be positive');
  const nameBytes = new TextEncoder().encode(name);
  requires(nameBytes.length <= 255, 'font name must be ≤ 255 bytes UTF-8');

  // Validate sorted, unique codepoints and bit-buffer sizes.
  const bpg = bytesPerGlyphFor(cellWidth, cellHeight);
  for (let i = 0; i < glyphs.length; i++) {
    const g = glyphs[i] as FontSpec['glyphs'][number];
    requires(g.bits.length === bpg, `glyph ${i} bits length must equal bytesPerGlyph (${bpg})`);
    if (i > 0) {
      const prev = glyphs[i - 1] as FontSpec['glyphs'][number];
      requires(g.codepoint > prev.codepoint, 'glyphs must be sorted by codepoint, no duplicates');
    }
  }

  const total =
    HEADER_SIZE + nameBytes.length + glyphs.length * 4 + glyphs.length + glyphs.length * bpg;
  const buffer = new ArrayBuffer(total);
  const view = new DataView(buffer);
  const u8 = new Uint8Array(buffer);

  u8.set(MAGIC, 0);
  view.setUint8(4, VERSION);
  view.setUint8(5, cellWidth);
  view.setUint8(6, cellHeight);
  view.setUint8(7, nameBytes.length);
  view.setUint32(8, glyphs.length, true);
  view.setUint32(12, bpg, true);
  u8.set(nameBytes, HEADER_SIZE);

  let offset = HEADER_SIZE + nameBytes.length;
  for (const g of glyphs) {
    view.setUint32(offset, g.codepoint, true);
    offset += 4;
  }
  for (const g of glyphs) {
    view.setUint8(offset, g.advance);
    offset += 1;
  }
  for (const g of glyphs) {
    u8.set(g.bits, offset);
    offset += bpg;
  }
  ensures(offset === total, 'wrote exactly the predicted number of bytes');
  return buffer;
}

class TofuGlyph implements Glyph {
  readonly advance: number;
  readonly bits: Uint8Array;
  constructor(advance: number, bytesPerGlyph: number) {
    this.advance = advance;
    // Empty rectangle: outline only on the perimeter, faint marker.
    this.bits = new Uint8Array(bytesPerGlyph);
  }
}

class BinaryFont implements Font {
  readonly name: string;
  readonly cellWidth: number;
  readonly cellHeight: number;
  private readonly codepoints: Uint32Array;
  private readonly advances: Uint8Array;
  private readonly bitmaps: Uint8Array;
  private readonly bytesPerGlyph: number;
  private readonly tofu: TofuGlyph;

  constructor(
    name: string,
    cellWidth: number,
    cellHeight: number,
    codepoints: Uint32Array,
    advances: Uint8Array,
    bitmaps: Uint8Array,
    bytesPerGlyph: number,
  ) {
    this.name = name;
    this.cellWidth = cellWidth;
    this.cellHeight = cellHeight;
    this.codepoints = codepoints;
    this.advances = advances;
    this.bitmaps = bitmaps;
    this.bytesPerGlyph = bytesPerGlyph;
    this.tofu = new TofuGlyph(cellWidth, bytesPerGlyph);
  }

  has(codepoint: number): boolean {
    return this.indexOf(codepoint) >= 0;
  }

  lookup(codepoint: number): Glyph {
    const idx = this.indexOf(codepoint);
    if (idx < 0) return this.tofu;
    const start = idx * this.bytesPerGlyph;
    return {
      advance: this.advances[idx] as number,
      bits: this.bitmaps.subarray(start, start + this.bytesPerGlyph),
    };
  }

  /** Binary search by codepoint; returns -1 if not present. */
  private indexOf(codepoint: number): number {
    let lo = 0;
    let hi = this.codepoints.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const v = this.codepoints[mid] as number;
      if (v === codepoint) return mid;
      if (v < codepoint) lo = mid + 1;
      else hi = mid - 1;
    }
    return -1;
  }
}

export function parseFontBinary(buffer: ArrayBuffer): Font {
  requires(buffer.byteLength >= HEADER_SIZE, 'buffer too small for header');
  const u8 = new Uint8Array(buffer);
  const view = new DataView(buffer);
  for (let i = 0; i < 4; i++) {
    requires(u8[i] === MAGIC[i], 'invalid font binary magic');
  }
  const version = view.getUint8(4);
  requires(version === VERSION, `unsupported font binary version ${version} (expected ${VERSION})`);

  const cellWidth = view.getUint8(5);
  const cellHeight = view.getUint8(6);
  const nameLength = view.getUint8(7);
  const glyphCount = view.getUint32(8, true);
  const bytesPerGlyph = view.getUint32(12, true);

  const nameStart = HEADER_SIZE;
  const name = new TextDecoder().decode(u8.subarray(nameStart, nameStart + nameLength));

  const codepointsStart = nameStart + nameLength;
  // Uint32Array view requires aligned offset; copy if necessary.
  const codepointsBytes = u8.slice(codepointsStart, codepointsStart + glyphCount * 4);
  const codepoints = new Uint32Array(codepointsBytes.buffer);

  const advancesStart = codepointsStart + glyphCount * 4;
  const advances = u8.slice(advancesStart, advancesStart + glyphCount);

  const bitmapsStart = advancesStart + glyphCount;
  const bitmaps = u8.slice(bitmapsStart, bitmapsStart + glyphCount * bytesPerGlyph);

  return new BinaryFont(name, cellWidth, cellHeight, codepoints, advances, bitmaps, bytesPerGlyph);
}
