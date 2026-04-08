/**
 * tools/gen-icons.ts
 *
 * Generates PWA icon PNGs (192/512 + maskable) by rendering an LED dot-matrix
 * "L" glyph with the same visual language as the running app. The output goes
 * to `packages/web/public/icons/`.
 *
 * Run via: bun run tools/gen-icons.ts
 *
 * The icon is intentionally minimal — a small grid of glowing dots forming
 * the letter "L" on a near-black background. This matches the DESIGN.md
 * "駅前ビジョン" theme without requiring a logo asset.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createCanvas } from '@napi-rs/canvas';

interface IconSpec {
  size: number;
  outPath: string;
  /** maskable icons require 10% safe-zone padding on each side. */
  maskable: boolean;
}

const SPECS: IconSpec[] = [
  { size: 192, outPath: 'packages/web/public/icons/icon-192.png', maskable: false },
  { size: 512, outPath: 'packages/web/public/icons/icon-512.png', maskable: false },
  { size: 192, outPath: 'packages/web/public/icons/maskable-192.png', maskable: true },
  { size: 512, outPath: 'packages/web/public/icons/maskable-512.png', maskable: true },
  { size: 180, outPath: 'packages/web/public/icons/apple-touch-icon.png', maskable: false },
];

// 8×8 bitmap of an "L" — column-major bits for clarity
// X = lit, . = off
// 0 1 2 3 4 5 6 7
// X . . . . . . .   row 0
// X . . . . . . .   row 1
// X . . . . . . .   row 2
// X . . . . . . .   row 3
// X . . . . . . .   row 4
// X . . . . . . .   row 5
// X . . . . . . .   row 6
// X X X X X X X .   row 7
const LED_L: ReadonlyArray<readonly boolean[]> = [
  [true, false, false, false, false, false, false, false],
  [true, false, false, false, false, false, false, false],
  [true, false, false, false, false, false, false, false],
  [true, false, false, false, false, false, false, false],
  [true, false, false, false, false, false, false, false],
  [true, false, false, false, false, false, false, false],
  [true, false, false, false, false, false, false, false],
  [true, true, true, true, true, true, true, false],
];

function renderIcon(spec: IconSpec): void {
  const cv = createCanvas(spec.size, spec.size);
  const ctx = cv.getContext('2d');

  // Background — near-black with a subtle warm tone
  ctx.fillStyle = '#0A0A0B';
  ctx.fillRect(0, 0, spec.size, spec.size);

  // Compute the dot grid layout. Maskable icons reserve 10% padding around
  // the edges so the safe zone is 80% of the canvas.
  const padFraction = spec.maskable ? 0.18 : 0.12;
  const padPx = Math.floor(spec.size * padFraction);
  const gridSize = spec.size - padPx * 2;
  const rows = LED_L.length;
  const cols = LED_L[0]?.length ?? 8;
  const cellSize = Math.floor(gridSize / Math.max(rows, cols));
  const dotRadius = cellSize * 0.42;
  const startX = Math.floor((spec.size - cellSize * cols) / 2);
  const startY = Math.floor((spec.size - cellSize * rows) / 2);

  for (let y = 0; y < rows; y++) {
    const row = LED_L[y] as readonly boolean[];
    for (let x = 0; x < cols; x++) {
      const cx = startX + x * cellSize + cellSize / 2;
      const cy = startY + y * cellSize + cellSize / 2;
      const lit = row[x] === true;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotRadius);
      if (lit) {
        // Warm amber LED (matches --led-amber from tokens.css)
        grad.addColorStop(0, '#FFD380');
        grad.addColorStop(0.45, '#FFAE00');
        grad.addColorStop(0.85, 'rgba(255, 130, 0, 0.45)');
        grad.addColorStop(1.0, 'rgba(255, 110, 0, 0.0)');
      } else {
        // Off-dot — visible at low intensity
        grad.addColorStop(0, 'rgba(40, 32, 20, 0.55)');
        grad.addColorStop(1, 'rgba(20, 16, 10, 0.0)');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  mkdirSync(dirname(spec.outPath), { recursive: true });
  const buf = cv.toBuffer('image/png');
  writeFileSync(spec.outPath, buf);
  console.warn(
    `[gen-icons] wrote ${spec.outPath} (${spec.size}×${spec.size}, ${buf.length} bytes)`,
  );
}

for (const spec of SPECS) {
  renderIcon(spec);
}

// Also write a simple SVG favicon
const SVG_FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#0A0A0B"/>
  <g fill="#FFAE00">
    <circle cx="14" cy="8" r="4"/>
    <circle cx="14" cy="16" r="4"/>
    <circle cx="14" cy="24" r="4"/>
    <circle cx="14" cy="32" r="4"/>
    <circle cx="14" cy="40" r="4"/>
    <circle cx="14" cy="48" r="4"/>
    <circle cx="14" cy="56" r="4"/>
    <circle cx="22" cy="56" r="4"/>
    <circle cx="30" cy="56" r="4"/>
    <circle cx="38" cy="56" r="4"/>
    <circle cx="46" cy="56" r="4"/>
  </g>
</svg>
`;
mkdirSync('packages/web/public/icons', { recursive: true });
writeFileSync('packages/web/public/icons/favicon.svg', SVG_FAVICON);
console.warn('[gen-icons] wrote packages/web/public/icons/favicon.svg');
