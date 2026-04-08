import type { Font } from '@led/core';
import { type Component, createResource, createSignal, Show } from 'solid-js';
import { Board } from './components/Board';
import { ControlPanel } from './components/ControlPanel';
import { FullscreenButton } from './components/FullscreenButton';
import { KeyboardHelp } from './components/KeyboardHelp';
import { loadFont } from './font/loader';
import { useFullscreen } from './hooks/useFullscreen';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useWakeLock } from './hooks/useWakeLock';
import { createAppState } from './state/store';

export const App: Component = () => {
  const state = createAppState();
  const fullscreen = useFullscreen();
  useWakeLock(fullscreen.isFullscreen);
  const [helpOpen, setHelpOpen] = createSignal(false);

  // Load the font that the user has selected, re-loading on selection change.
  const [font] = createResource<Font, string>(
    () => state.settings().board.fontName,
    (name) => loadFont(name as 'k8x12L' | 'MisakiGothic'),
  );

  useKeyboardShortcuts({
    f: () => {
      void fullscreen.toggle();
    },
    escape: () => {
      void fullscreen.exit();
      setHelpOpen(false);
    },
    '?': () => {
      setHelpOpen((v) => !v);
    },
    'shift+/': () => {
      setHelpOpen((v) => !v);
    },
  });

  return (
    <div class="app" classList={{ 'app--fullscreen': fullscreen.isFullscreen() }}>
      <Show when={!fullscreen.isFullscreen()}>
        <header class="app-header">
          <h1 class="app-title">LED 電光掲示板</h1>
          <div class="app-header-actions">
            <button
              type="button"
              class="icon-button"
              aria-label="キーボードショートカット"
              onClick={() => setHelpOpen(true)}
              title="キーボードショートカット (?)"
            >
              ?
            </button>
            <FullscreenButton fullscreen={fullscreen} />
          </div>
        </header>
      </Show>
      <KeyboardHelp open={helpOpen()} onClose={() => setHelpOpen(false)} />
      <main class="app-main">
        <Show when={!fullscreen.isFullscreen()}>
          <ControlPanel state={state} />
        </Show>
        <div class="board-stage">
          <Show when={font()} fallback={<p class="app-placeholder">フォント読み込み中…</p>}>
            {(loaded) => (
              <Board
                font={loaded()}
                scene={state.runtimeScene()}
                cols={state.settings().board.cols}
                rows={state.settings().board.rows}
                color={state.settings().scene.color}
                shape={state.settings().board.shape}
                glow={state.settings().board.glow}
                background="oklch(8% 0.01 240)"
              />
            )}
          </Show>
        </div>
      </main>
    </div>
  );
};
