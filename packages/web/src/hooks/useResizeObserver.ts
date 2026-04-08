import { type Accessor, createSignal, onCleanup } from 'solid-js';

export interface Size {
  readonly width: number;
  readonly height: number;
}

/**
 * Track the content-box size of an element via `ResizeObserver`. Returns a
 * Solid accessor that updates whenever the element resizes.
 *
 * If the platform does not support ResizeObserver (e.g. happy-dom in some
 * versions), the accessor returns the initial value of `{0, 0}`.
 */
export function useResizeObserver(elAccessor: () => HTMLElement | undefined): Accessor<Size> {
  const [size, setSize] = createSignal<Size>({ width: 0, height: 0 });

  if (typeof ResizeObserver === 'undefined') {
    return size;
  }

  const ro = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (entry === undefined) return;
    const { width, height } = entry.contentRect;
    setSize({ width, height });
  });

  // Re-attach when the element changes.
  let currentEl: HTMLElement | undefined;
  const update = (): void => {
    const el = elAccessor();
    if (el === currentEl) return;
    if (currentEl !== undefined) ro.unobserve(currentEl);
    currentEl = el;
    if (el !== undefined) ro.observe(el);
  };
  update();
  // Solid signals re-run effects automatically when their inputs change;
  // for a Ref-style accessor we just call update() once and rely on the
  // caller to recreate the hook if the element changes (typical Solid pattern).

  onCleanup(() => ro.disconnect());
  return size;
}
