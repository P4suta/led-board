import { onCleanup } from 'solid-js';

export type ShortcutHandler = (event: KeyboardEvent) => void;

export interface ShortcutMap {
  readonly [keyCombo: string]: ShortcutHandler;
}

/**
 * Solid primitive: bind keyboard shortcuts to the document. Keys are
 * normalized to lowercase, with modifier prefixes "ctrl+", "shift+", "alt+",
 * "meta+" in that order. Examples: `'f'`, `'shift+/'`, `'ctrl+s'`.
 *
 * Shortcuts are NOT triggered while focus is inside an `<input>`, `<textarea>`,
 * `<select>`, or any element with `contenteditable`, so the user can type
 * freely without firing global shortcuts.
 */
export function useKeyboardShortcuts(map: ShortcutMap): void {
  if (typeof document === 'undefined') return;

  const onKeyDown = (event: KeyboardEvent): void => {
    const target = event.target as HTMLElement | null;
    if (target !== null && isEditableTarget(target)) return;

    const key = event.key.toLowerCase();
    const parts: string[] = [];
    if (event.ctrlKey) parts.push('ctrl');
    if (event.shiftKey) parts.push('shift');
    if (event.altKey) parts.push('alt');
    if (event.metaKey) parts.push('meta');
    parts.push(key);
    const combo = parts.join('+');
    const handler = map[combo];
    if (handler !== undefined) {
      handler(event);
    }
  };

  document.addEventListener('keydown', onKeyDown);
  onCleanup(() => document.removeEventListener('keydown', onKeyDown));
}

function isEditableTarget(el: HTMLElement): boolean {
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}
