// @led/core — LED dot-matrix sign board domain logic.
// Public API barrel. Import only from here in @led/web.

export type { ClockFormat } from './clock/format';
export { formatTime } from './clock/format';
export { ClockRenderer, type ClockRendererOpts } from './clock/render';

export type { ContractKind } from './contracts';
export { ContractError, ensures, invariant, requires } from './contracts';
export { applyEffects } from './effects/pipeline';
export type { BlinkEffect, Effect, FadeInEffect, FadeOutEffect } from './effects/types';
export { encodeFontBinary, type FontSpec, parseFontBinary } from './font/binary';
export { fixtureFont } from './font/fixture';
export type { Font, Glyph } from './font/types';
export { PixelBuffer } from './pixel-buffer/pixel-buffer';

export { renderScene, type SceneRenderContext } from './scene/render';
export type {
  ClockScene,
  MultiLineRow,
  MultiLineScene,
  Scene,
  ScrollScene,
  StaticScene,
} from './scene/types';

export { scrollOffset, wrappedScrollOffset } from './scroll/offset';
export { renderScroll, type ScrollOpts } from './scroll/render';

export { evaluateSequence } from './sequence/engine';
export type { Sequence, SequenceItem, SequenceState, Transition } from './sequence/types';

export { type BlitOpts, type BlitTextOpts, blitGlyph, blitText } from './text/blit';
export {
  type Alignment,
  type GlyphPlacement,
  type LayoutOpts,
  layoutText,
  measureText,
  wrapText,
} from './text/layout';

export { type Clock, FakeClock, SystemClock } from './time/clock';
