import { onCleanup } from 'solid-js';

/**
 * Solid primitive: subscribe to `requestAnimationFrame` and call the callback
 * with `(now, deltaMs)` each tick. The loop stops automatically on cleanup.
 *
 * `now` is the high-resolution timestamp from rAF (DOMHighResTimeStamp).
 * `delta` is the milliseconds since the previous tick (0 on the first call).
 */
export function useAnimationFrame(callback: (nowMs: number, deltaMs: number) => void): void {
  let raf = 0;
  let lastTime = 0;

  const tick = (now: number): void => {
    const delta = lastTime === 0 ? 0 : now - lastTime;
    lastTime = now;
    callback(now, delta);
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
  onCleanup(() => {
    cancelAnimationFrame(raf);
  });
}
