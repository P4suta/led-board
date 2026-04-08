import type { Component } from 'solid-js';
import type { UseFullscreen } from '../hooks/useFullscreen';

export interface FullscreenButtonProps {
  readonly fullscreen: UseFullscreen;
}

export const FullscreenButton: Component<FullscreenButtonProps> = (props) => {
  const onClick = (): void => {
    void props.fullscreen.toggle();
  };

  return (
    <button
      type="button"
      class="icon-button"
      aria-label={props.fullscreen.isFullscreen() ? 'フルスクリーンを終了' : 'フルスクリーン'}
      aria-pressed={props.fullscreen.isFullscreen()}
      onClick={onClick}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        {props.fullscreen.isFullscreen() ? (
          <>
            <path d="M9 21H3v-6" />
            <path d="M21 9h-6V3" />
            <path d="M3 15l6-6" />
            <path d="M21 9l-6 6" />
          </>
        ) : (
          <>
            <path d="M3 9V3h6" />
            <path d="M21 9V3h-6" />
            <path d="M3 15v6h6" />
            <path d="M21 15v6h-6" />
          </>
        )}
      </svg>
    </button>
  );
};
