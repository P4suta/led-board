/**
 * Test helper: install a no-op stub for `HTMLCanvasElement.prototype.getContext`
 * so that code under test can call canvas APIs without happy-dom returning
 * `null`. The stub records nothing — it's purely a smoke-test enabler. For
 * real visual verification use the dev server or vitest browser mode.
 */

interface StubContext {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  filter: string;
  globalAlpha: number;
  globalCompositeOperation: GlobalCompositeOperation;
  beginPath(): void;
  closePath(): void;
  arc(x: number, y: number, r: number, a: number, b: number): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  fill(): void;
  stroke(): void;
  save(): void;
  restore(): void;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  drawImage(...args: unknown[]): void;
  createRadialGradient(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number,
  ): CanvasGradient;
  roundRect?(x: number, y: number, w: number, h: number, r: number): void;
  rect(x: number, y: number, w: number, h: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  measureText(text: string): TextMetrics;
}

function makeGradient(): CanvasGradient {
  // biome-ignore lint/suspicious/noExplicitAny: minimal gradient stub
  return { addColorStop(_offset: number, _color: string): void {} } as any;
}

function makeStubContext(): StubContext {
  return {
    fillStyle: '',
    strokeStyle: '',
    filter: 'none',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    beginPath() {},
    closePath() {},
    arc() {},
    moveTo() {},
    lineTo() {},
    fillRect() {},
    clearRect() {},
    fill() {},
    stroke() {},
    save() {},
    restore() {},
    setTransform() {},
    drawImage() {},
    createRadialGradient() {
      return makeGradient();
    },
    roundRect() {},
    rect() {},
    quadraticCurveTo() {},
    measureText(text: string): TextMetrics {
      // biome-ignore lint/suspicious/noExplicitAny: minimal TextMetrics stub
      return { width: text.length * 8 } as any;
    },
  };
}

let installed = false;

/**
 * Install the canvas stub on HTMLCanvasElement and OffscreenCanvas. Idempotent.
 * Call once at test bootstrap or per-suite via `beforeAll`.
 */
export function installCanvasStub(): void {
  if (installed) return;
  installed = true;
  // Patch HTMLCanvasElement
  if (typeof HTMLCanvasElement !== 'undefined') {
    const proto = HTMLCanvasElement.prototype as unknown as {
      getContext(type: string): unknown;
    };
    proto.getContext = (type: string): unknown => {
      if (type === '2d') return makeStubContext();
      return null;
    };
  }
  // Patch OffscreenCanvas if it exists
  if (typeof OffscreenCanvas !== 'undefined') {
    const proto = OffscreenCanvas.prototype as unknown as {
      getContext(type: string): unknown;
    };
    proto.getContext = (type: string): unknown => {
      if (type === '2d') return makeStubContext();
      return null;
    };
  }
}
