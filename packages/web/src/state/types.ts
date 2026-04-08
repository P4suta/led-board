import type { ClockFormat, Scene } from '@led/core';
import type { LedColorName } from '../canvas/colors';
import type { DotShape } from '../canvas/sprite-atlas';
import type { FontName } from '../font/loader';

/** A scene as edited by the user — keyed by id, with a discriminated kind. */
export type EditableSceneKind = 'scroll' | 'static' | 'clock';

export interface EditableScene {
  readonly id: string;
  readonly kind: EditableSceneKind;
  readonly text: string; // for scroll & static; ignored for clock
  readonly speedPxPerSec: number; // for scroll
  readonly clockFormat: ClockFormat;
  readonly color: LedColorName;
}

/** Convert an EditableScene to a runtime Scene that the renderer understands. */
export function toRuntimeScene(s: EditableScene): Scene {
  switch (s.kind) {
    case 'scroll':
      return {
        kind: 'scroll',
        text: s.text === '' ? ' ' : s.text,
        speedPxPerSec: s.speedPxPerSec,
        gapPx: 64,
      };
    case 'static':
      return {
        kind: 'static',
        lines: s.text === '' ? [' '] : s.text.split('\n'),
        align: 'center',
      };
    case 'clock':
      return {
        kind: 'clock',
        format: s.clockFormat,
        align: 'center',
        timeZone: 'Asia/Tokyo',
      };
  }
}

export interface BoardConfig {
  readonly cols: number;
  readonly rows: number;
  readonly shape: DotShape;
  readonly glow: number;
  readonly fontName: FontName;
}

export interface AppSettings {
  readonly version: 1;
  readonly scene: EditableScene;
  readonly board: BoardConfig;
}

export const DEFAULT_SETTINGS: AppSettings = {
  version: 1,
  scene: {
    id: 'default',
    kind: 'scroll',
    text: '東京 ▶ 新宿 ▶ 渋谷 ▶ 品川 ▶ 上野 ▶ 池袋  ●  LED 電光掲示板',
    speedPxPerSec: 60,
    clockFormat: 'HH:mm:ss',
    color: 'amber',
  },
  board: {
    cols: 128,
    rows: 16,
    shape: 'round',
    glow: 3,
    fontName: 'k8x12L',
  },
};

/** Validate raw localStorage data and return either a valid AppSettings or the default. */
export function parseSettings(raw: unknown): AppSettings {
  if (raw === null || typeof raw !== 'object') return DEFAULT_SETTINGS;
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) return DEFAULT_SETTINGS;
  // Trust the rest — caller already gated on version
  return raw as AppSettings;
}
