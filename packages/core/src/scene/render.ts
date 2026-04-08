import { ClockRenderer } from '../clock/render';
import type { Font } from '../font/types';
import type { PixelBuffer } from '../pixel-buffer/pixel-buffer';
import { renderScroll } from '../scroll/render';
import { blitText } from '../text/blit';
import type { Clock } from '../time/clock';
import type { ClockScene, MultiLineScene, Scene, ScrollScene, StaticScene } from './types';

export interface SceneRenderContext {
  readonly font: Font;
  /** ms since this scene started displaying. */
  readonly elapsedMs: number;
  readonly clock: Clock;
}

/** Top-level dispatch — renders any Scene variant into the destination buffer. */
export function renderScene(scene: Scene, ctx: SceneRenderContext, dest: PixelBuffer): void {
  switch (scene.kind) {
    case 'scroll':
      renderScrollScene(scene, ctx, dest);
      return;
    case 'static':
      renderStaticScene(scene, ctx, dest);
      return;
    case 'clock':
      renderClockScene(scene, ctx, dest);
      return;
    case 'multi-line':
      renderMultiLineScene(scene, ctx, dest);
      return;
  }
}

function renderScrollScene(scene: ScrollScene, ctx: SceneRenderContext, dest: PixelBuffer): void {
  const y = Math.floor((dest.rows - ctx.font.cellHeight) / 2);
  renderScroll(dest, {
    text: scene.text,
    font: ctx.font,
    elapsedMs: ctx.elapsedMs,
    speedPxPerSec: scene.speedPxPerSec,
    gapPx: scene.gapPx,
    y,
  });
}

function renderStaticScene(scene: StaticScene, ctx: SceneRenderContext, dest: PixelBuffer): void {
  dest.clear();
  const lineHeight = ctx.font.cellHeight;
  const totalHeight = scene.lines.length * lineHeight;
  const startY = Math.floor((dest.rows - totalHeight) / 2);
  for (let i = 0; i < scene.lines.length; i++) {
    const line = scene.lines[i] as string;
    const y = startY + i * lineHeight;
    blitText(dest, line, ctx.font, {
      offsetY: y,
      align: scene.align,
      alignWidth: dest.cols,
    });
  }
}

// ClockRenderer instances are stateful (cache by string) — keep one per
// (font, format, timeZone, align) so the cache survives across frames.
const clockRendererCache = new Map<string, ClockRenderer>();

function getClockRenderer(font: Font, scene: ClockScene): ClockRenderer {
  const key = `${font.name}|${scene.format}|${scene.timeZone ?? 'Asia/Tokyo'}|${scene.align ?? 'center'}`;
  let r = clockRendererCache.get(key);
  if (r === undefined) {
    r = new ClockRenderer({
      font,
      format: scene.format,
      timeZone: scene.timeZone ?? 'Asia/Tokyo',
      align: scene.align ?? 'center',
    });
    clockRendererCache.set(key, r);
  }
  return r;
}

function renderClockScene(scene: ClockScene, ctx: SceneRenderContext, dest: PixelBuffer): void {
  const r = getClockRenderer(ctx.font, scene);
  r.render(dest, ctx.clock.now());
}

function renderMultiLineScene(
  scene: MultiLineScene,
  ctx: SceneRenderContext,
  dest: PixelBuffer,
): void {
  dest.clear();
  const lineHeight = ctx.font.cellHeight;
  const totalHeight = scene.rows.length * lineHeight;
  const startY = Math.floor((dest.rows - totalHeight) / 2);
  for (let i = 0; i < scene.rows.length; i++) {
    const row = scene.rows[i] as MultiLineScene['rows'][number];
    const y = startY + i * lineHeight;
    blitText(dest, row.text, ctx.font, {
      offsetY: y,
      align: row.align ?? 'left',
      alignWidth: dest.cols,
    });
  }
}
