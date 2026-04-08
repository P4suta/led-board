import { type Accessor, createEffect, onCleanup } from 'solid-js';

/**
 * Solid primitive: while `active()` is true, hide the document cursor after
 * `idleMs` of mouse inactivity. Any mousemove resets the timer and reveals
 * the cursor immediately.
 *
 * Used in fullscreen mode (DESIGN.md §9.2) so the cursor doesn't sit on top
 * of the LED board for the duration of an ambient session.
 *
 * The cursor is forcibly restored when:
 * - `active()` flips to false
 * - the component owning this hook unmounts (`onCleanup`)
 *
 * Default idle timeout is 3 seconds, matching the NN/G hover-reveal research
 * cited in DESIGN.md §9.2.
 */
export function useCursorAutoHide(active: Accessor<boolean>, idleMs: number = 3000): void {
  createEffect(() => {
    if (typeof document === 'undefined') return;
    if (!active()) {
      document.body.style.cursor = '';
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const reset = (): void => {
      document.body.style.cursor = '';
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => {
        document.body.style.cursor = 'none';
      }, idleMs);
    };

    document.addEventListener('mousemove', reset, { passive: true });
    reset();

    onCleanup(() => {
      document.removeEventListener('mousemove', reset);
      if (timer !== undefined) clearTimeout(timer);
      document.body.style.cursor = '';
    });
  });
}
