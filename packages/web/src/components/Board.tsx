import { type Font, PixelBuffer, renderScene, type Scene, SystemClock } from '@led/core';
import { type Component, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import type { LedColorName } from '../canvas/colors';
import { LedRenderer } from '../canvas/led-renderer';
import type { DotShape } from '../canvas/sprite-atlas';
import { useAnimationFrame } from '../hooks/useAnimationFrame';

export interface BoardProps {
  readonly font: Font;
  readonly scene: Scene;
  readonly cols: number;
  readonly rows: number;
  readonly color: LedColorName;
  readonly shape: DotShape;
  readonly glow: number;
  readonly background: string;
}

/**
 * The LED board itself — a `<canvas>` driven by `core/scene/render`.
 *
 * Owns one `LedRenderer`, one `PixelBuffer`, and a rAF loop. The buffer is
 * reused frame-to-frame (no per-frame allocation). When the props change
 * (cols, rows, color, shape, glow), the renderer is reconfigured in place.
 */
export const Board: Component<BoardProps> = (props) => {
  let canvasRef: HTMLCanvasElement | undefined;
  let containerRef: HTMLDivElement | undefined;
  const clock = new SystemClock();
  const [renderer, setRenderer] = createSignal<LedRenderer | null>(null);
  const [buffer, setBuffer] = createSignal<PixelBuffer | null>(null);
  let startMs: number | null = null;

  onMount(() => {
    if (canvasRef === undefined) return;
    const r = new LedRenderer({
      canvas: canvasRef,
      cols: props.cols,
      rows: props.rows,
      color: props.color,
      shape: props.shape,
      glow: props.glow,
      background: props.background,
    });
    setRenderer(r);
    setBuffer(PixelBuffer.create(props.cols, props.rows));

    const resize = (): void => {
      if (containerRef === undefined) return;
      const rect = containerRef.getBoundingClientRect();
      r.resize(rect.width, rect.height);
    };
    resize();
    if (typeof ResizeObserver !== 'undefined' && containerRef !== undefined) {
      const ro = new ResizeObserver(() => resize());
      ro.observe(containerRef);
      onCleanup(() => ro.disconnect());
    } else {
      window.addEventListener('resize', resize);
      onCleanup(() => window.removeEventListener('resize', resize));
    }
  });

  // Reconfigure renderer when visual props change (without rebuilding from scratch).
  createEffect(() => {
    const r = renderer();
    if (r === null) return;
    r.reconfigure({
      color: props.color,
      shape: props.shape,
      glow: props.glow,
      background: props.background,
    });
  });

  // Reallocate buffer if cols/rows change.
  createEffect(() => {
    setBuffer(PixelBuffer.create(props.cols, props.rows));
    startMs = null; // restart the scene clock when board reshapes
    const r = renderer();
    if (r !== null && containerRef !== undefined) {
      r.cols = props.cols;
      r.rows = props.rows;
      const rect = containerRef.getBoundingClientRect();
      r.resize(rect.width, rect.height);
    }
  });

  useAnimationFrame((now) => {
    const r = renderer();
    const buf = buffer();
    if (r === null || buf === null) return;
    if (startMs === null) startMs = now;
    const elapsed = now - startMs;
    renderScene(props.scene, { font: props.font, elapsedMs: elapsed, clock }, buf);
    r.draw(buf);
  });

  return (
    <div ref={containerRef} class="board-wrap">
      <canvas
        ref={canvasRef}
        class="board-canvas"
        aria-label={`LED ドットマトリクス表示、${props.cols}列×${props.rows}行`}
        role="img"
      />
    </div>
  );
};
