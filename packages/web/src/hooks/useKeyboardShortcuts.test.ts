import { createRoot } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

function dispatch(
  key: string,
  opts: { ctrl?: boolean; shift?: boolean; alt?: boolean; target?: HTMLElement } = {},
): void {
  const event = new KeyboardEvent('keydown', {
    key,
    ctrlKey: opts.ctrl ?? false,
    shiftKey: opts.shift ?? false,
    altKey: opts.alt ?? false,
    bubbles: true,
  });
  if (opts.target !== undefined) {
    Object.defineProperty(event, 'target', { value: opts.target });
  }
  document.dispatchEvent(event);
}

describe('hooks/useKeyboardShortcuts', () => {
  it('triggers a handler on the matching key', () => {
    const handler = vi.fn();
    createRoot((dispose) => {
      useKeyboardShortcuts({ f: handler });
      dispatch('f');
      expect(handler).toHaveBeenCalledTimes(1);
      dispose();
    });
  });

  it('does not trigger on a non-matching key', () => {
    const handler = vi.fn();
    createRoot((dispose) => {
      useKeyboardShortcuts({ f: handler });
      dispatch('x');
      expect(handler).not.toHaveBeenCalled();
      dispose();
    });
  });

  it('respects modifier prefixes', () => {
    const ctrlS = vi.fn();
    const plainS = vi.fn();
    createRoot((dispose) => {
      useKeyboardShortcuts({ 'ctrl+s': ctrlS, s: plainS });
      dispatch('s', { ctrl: true });
      dispatch('s');
      expect(ctrlS).toHaveBeenCalledTimes(1);
      expect(plainS).toHaveBeenCalledTimes(1);
      dispose();
    });
  });

  it('does not trigger when focus is in an input', () => {
    const handler = vi.fn();
    createRoot((dispose) => {
      useKeyboardShortcuts({ f: handler });
      const input = document.createElement('input');
      document.body.appendChild(input);
      dispatch('f', { target: input });
      expect(handler).not.toHaveBeenCalled();
      input.remove();
      dispose();
    });
  });

  it('does not trigger when focus is in a textarea', () => {
    const handler = vi.fn();
    createRoot((dispose) => {
      useKeyboardShortcuts({ f: handler });
      const ta = document.createElement('textarea');
      document.body.appendChild(ta);
      dispatch('f', { target: ta });
      expect(handler).not.toHaveBeenCalled();
      ta.remove();
      dispose();
    });
  });
});
