/**
 * Resize a canvas to match its CSS display size at the current device pixel
 * ratio (capped at 2 to prevent excessive memory use on 4K Retina displays
 * for content that has no extra detail to gain).
 *
 * After this call, draw operations on the 2D context can be issued in CSS
 * pixels — `setTransform(dpr, 0, 0, dpr, 0, 0)` makes the context auto-scale.
 *
 * Returns the active DPR.
 */
export function resizeCanvasToDpr(
  canvas: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number,
): number {
  const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
  const targetW = Math.round(cssWidth * dpr);
  const targetH = Math.round(cssHeight * dpr);
  if (canvas.width !== targetW) canvas.width = targetW;
  if (canvas.height !== targetH) canvas.height = targetH;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  return dpr;
}
