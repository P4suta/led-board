import type { Font } from '@led/core';
import { type Component, createResource, createSignal, Show } from 'solid-js';
import { Board } from './components/Board';
import { ControlPanel } from './components/ControlPanel';
import { FullscreenButton } from './components/FullscreenButton';
import { KeyboardHelp } from './components/KeyboardHelp';
import { loadFont } from './font/loader';
import { useCursorAutoHide } from './hooks/useCursorAutoHide';
import { useFullscreen } from './hooks/useFullscreen';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useWakeLock } from './hooks/useWakeLock';
import { createAppState } from './state/store';

export const App: Component = () => {
  const state = createAppState();
  const fullscreen = useFullscreen();
  useWakeLock(fullscreen.isFullscreen);
  useCursorAutoHide(fullscreen.isFullscreen);
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
          <div class="app-header-brand">
            <span class="status-led status-led--power" aria-hidden="true" />
            <span class="status-led-label">PWR</span>
            <div class="app-header-divider" aria-hidden="true" />
            <div class="app-header-title-group">
              <h1 class="app-title">LED 電光掲示板</h1>
              <div class="app-header-meta">
                <span>MODEL</span>
                <strong>
                  LED-{state.settings().board.cols}×{state.settings().board.rows}
                </strong>
                <span class="app-header-meta-sep">/</span>
                <span>FONT</span>
                <strong>{state.settings().board.fontName}</strong>
                <span class="app-header-meta-sep">/</span>
                <span>FW</span>
                <strong>2026.04</strong>
              </div>
            </div>
          </div>
          <div class="app-header-actions">
            <button
              type="button"
              class="icon-button"
              aria-label="キーボードショートカット"
              onClick={() => setHelpOpen(true)}
              title="キーボードショートカット (?)"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
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
