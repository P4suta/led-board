import { installCanvasStub } from './canvas-stub';

// Make happy-dom's HTMLCanvasElement and OffscreenCanvas return a stub 2D
// context so the LedRenderer / SpriteAtlas can be exercised in unit tests.
installCanvasStub();
