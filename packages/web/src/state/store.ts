import type { Scene } from '@led/core';
import { type Accessor, createMemo } from 'solid-js';
import { useStoredSignal } from '../hooks/useStoredSignal';
import { type AppSettings, DEFAULT_SETTINGS, parseSettings, toRuntimeScene } from './types';

const STORAGE_KEY = 'led-board:settings:v1';

export interface AppState {
  readonly settings: Accessor<AppSettings>;
  readonly runtimeScene: Accessor<Scene>;
  setSettings(updater: (prev: AppSettings) => AppSettings): void;
}

/**
 * Create an app state instance backed by localStorage. Returned object is
 * stable for the lifetime of the Solid root that called it (typically App).
 */
export function createAppState(): AppState {
  const [settings, setSettingsRaw] = useStoredSignal<AppSettings>(
    STORAGE_KEY,
    DEFAULT_SETTINGS,
    parseSettings,
  );
  const runtimeScene = createMemo(() => toRuntimeScene(settings().scene));
  const setSettings = (updater: (prev: AppSettings) => AppSettings): void => {
    setSettingsRaw(updater);
  };
  return { settings, runtimeScene, setSettings };
}
