import { type Accessor, createEffect, createSignal, onCleanup, type Setter } from 'solid-js';

/**
 * Solid primitive: a signal that persists to `localStorage` under a key and
 * synchronizes across same-origin tabs via the `storage` event.
 *
 * `parse(raw)` is called with the JSON-decoded value when the cell is read.
 * It should return the validated `T`, or throw / return `initial` for invalid
 * data. Validation belongs to the caller — the hook does not assume a schema.
 *
 * If localStorage is unavailable (private mode, quota), the signal still
 * works in memory and writes are silently dropped.
 */
export function useStoredSignal<T>(
  key: string,
  initial: T,
  parse: (raw: unknown) => T,
): readonly [Accessor<T>, Setter<T>] {
  const read = (): T => {
    if (typeof localStorage === 'undefined') return initial;
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return initial;
      return parse(JSON.parse(raw));
    } catch {
      return initial;
    }
  };

  const [value, setValue] = createSignal<T>(read());

  createEffect(() => {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value()));
    } catch {
      // quota exceeded / disabled — silent
    }
  });

  if (typeof window !== 'undefined') {
    const onStorage = (e: StorageEvent): void => {
      if (e.key === key) {
        setValue(() => read());
      }
    };
    window.addEventListener('storage', onStorage);
    onCleanup(() => window.removeEventListener('storage', onStorage));
  }

  return [value, setValue];
}
