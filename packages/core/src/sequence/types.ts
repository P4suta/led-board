import type { Effect } from '../effects/types';
import type { Scene } from '../scene/types';

export interface Sequence {
  readonly items: ReadonlyArray<SequenceItem>;
  /** When true, the sequence loops indefinitely. */
  readonly loop: boolean;
}

export interface SequenceItem {
  readonly id: string;
  readonly scene: Scene;
  /** How long this item is on screen, in milliseconds. Excludes transitions. */
  readonly durationMs: number;
  /** Optional crossfade-in transition from the previous scene. */
  readonly enterTransition?: Transition;
  /** Optional fade-out transition into the next scene. */
  readonly exitTransition?: Transition;
  /** Optional pixel-buffer effects (blink, fade) applied while this item plays. */
  readonly effects?: ReadonlyArray<Effect>;
}

export type Transition =
  | { readonly kind: 'cut' }
  | { readonly kind: 'fade'; readonly durationMs: number };

export interface SequenceState {
  /** Index into `sequence.items` of the currently visible item. */
  readonly itemIndex: number;
  /** ms elapsed within the current item's display window. */
  readonly elapsedInItem: number;
  /** Phase: 'enter' (transition in), 'play' (steady-state), 'exit' (transition out). */
  readonly phase: 'enter' | 'play' | 'exit';
  /** 0..1 progress through the current transition. 1.0 during 'play'. */
  readonly transitionProgress: number;
}
