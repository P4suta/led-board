import { type Component, For, Show } from 'solid-js';

export interface KeyboardHelpProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

interface Shortcut {
  readonly keys: ReadonlyArray<string>;
  readonly action: string;
}

const SHORTCUTS: ReadonlyArray<Shortcut> = [
  { keys: ['F'], action: 'フルスクリーン on/off' },
  { keys: ['Esc'], action: 'フルスクリーン解除 / モーダル閉じ' },
  { keys: ['?'], action: 'このヘルプを表示' },
];

export const KeyboardHelp: Component<KeyboardHelpProps> = (props) => {
  let dialogRef: HTMLDialogElement | undefined;

  // Sync the <dialog> element open state with the prop.
  const ensureOpen = (): void => {
    if (dialogRef === undefined) return;
    if (props.open && !dialogRef.open) {
      dialogRef.showModal();
    } else if (!props.open && dialogRef.open) {
      dialogRef.close();
    }
  };

  return (
    <Show when={props.open}>
      <dialog
        ref={(el) => {
          dialogRef = el;
          // Defer to next microtask so the ref is bound before showModal()
          queueMicrotask(ensureOpen);
          // Native <dialog> closes on Escape, so we only need to handle clicks
          // on the backdrop (when target === the dialog element itself).
          el.addEventListener('click', (event) => {
            if (event.target === el) props.onClose();
          });
        }}
        class="keyboard-help"
        onClose={() => props.onClose()}
      >
        <header class="keyboard-help-header">
          <h2 class="panel-heading">キーボードショートカット</h2>
          <button
            type="button"
            class="icon-button"
            aria-label="閉じる"
            onClick={() => props.onClose()}
          >
            ✕
          </button>
        </header>
        <table class="keyboard-help-table">
          <tbody>
            <For each={SHORTCUTS}>
              {(s) => (
                <tr>
                  <td>
                    <For each={s.keys}>{(k) => <kbd class="kbd">{k}</kbd>}</For>
                  </td>
                  <td>{s.action}</td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </dialog>
    </Show>
  );
};
