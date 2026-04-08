import type { ClockFormat } from '@led/core';
import { type Component, For } from 'solid-js';
import type { LedColorName } from '../canvas/colors';
import type { EditableScene, EditableSceneKind } from '../state/types';

export interface SceneEditorProps {
  readonly scene: EditableScene;
  readonly onChange: (patch: Partial<EditableScene>) => void;
}

const SCENE_KINDS: ReadonlyArray<{ value: EditableSceneKind; label: string }> = [
  { value: 'scroll', label: 'スクロール' },
  { value: 'static', label: '固定表示' },
  { value: 'clock', label: '時計' },
];

const COLORS: ReadonlyArray<{ value: LedColorName; label: string; cssVar: string }> = [
  { value: 'red', label: '赤', cssVar: 'var(--led-red)' },
  { value: 'amber', label: 'アンバー', cssVar: 'var(--led-amber)' },
  { value: 'jr-orange', label: 'JR橙', cssVar: 'var(--led-jr-orange)' },
  { value: 'green', label: '緑', cssVar: 'var(--led-green)' },
  { value: 'blue', label: '青', cssVar: 'var(--led-blue)' },
  { value: 'white', label: '白', cssVar: 'var(--led-white)' },
];

const CLOCK_FORMATS: ReadonlyArray<{ value: ClockFormat; label: string }> = [
  { value: 'HH:mm', label: '24:60' },
  { value: 'HH:mm:ss', label: '24:60:60' },
  { value: 'yyyy-MM-dd', label: '年月日' },
  { value: 'date-jp', label: 'M月D日(曜)' },
];

export const SceneEditor: Component<SceneEditorProps> = (props) => {
  return (
    <div class="scene-editor">
      <h2 class="panel-heading">シーン編集</h2>

      <fieldset class="field">
        <legend class="field-label">表示モード</legend>
        <div class="segmented">
          <For each={SCENE_KINDS}>
            {(opt) => (
              <button
                type="button"
                aria-pressed={props.scene.kind === opt.value}
                class="segmented-option"
                classList={{ 'segmented-option--active': props.scene.kind === opt.value }}
                onClick={() => props.onChange({ kind: opt.value })}
              >
                {opt.label}
              </button>
            )}
          </For>
        </div>
      </fieldset>

      {props.scene.kind !== 'clock' && (
        <fieldset class="field">
          <label class="field-label" for="scene-text">
            テキスト
          </label>
          <textarea
            id="scene-text"
            class="text-input"
            rows={3}
            value={props.scene.text}
            onInput={(e) => props.onChange({ text: e.currentTarget.value })}
            placeholder="表示するテキストを入力..."
          />
        </fieldset>
      )}

      {props.scene.kind === 'scroll' && (
        <fieldset class="field">
          <label class="field-label" for="scene-speed">
            スクロール速度: <span class="value-badge">{props.scene.speedPxPerSec} px/s</span>
          </label>
          <input
            id="scene-speed"
            type="range"
            min={10}
            max={200}
            step={5}
            value={props.scene.speedPxPerSec}
            onInput={(e) => props.onChange({ speedPxPerSec: Number(e.currentTarget.value) })}
            class="range-input"
          />
        </fieldset>
      )}

      {props.scene.kind === 'clock' && (
        <fieldset class="field">
          <legend class="field-label">フォーマット</legend>
          <div class="segmented">
            <For each={CLOCK_FORMATS}>
              {(opt) => (
                <button
                  type="button"
                  aria-pressed={props.scene.clockFormat === opt.value}
                  class="segmented-option"
                  classList={{
                    'segmented-option--active': props.scene.clockFormat === opt.value,
                  }}
                  onClick={() => props.onChange({ clockFormat: opt.value })}
                >
                  {opt.label}
                </button>
              )}
            </For>
          </div>
        </fieldset>
      )}

      <fieldset class="field">
        <legend class="field-label">カラー</legend>
        <div class="color-grid">
          <For each={COLORS}>
            {(c) => (
              <button
                type="button"
                class="color-swatch"
                classList={{ 'color-swatch--active': props.scene.color === c.value }}
                style={{ '--swatch-color': c.cssVar }}
                aria-label={c.label}
                aria-pressed={props.scene.color === c.value}
                onClick={() => props.onChange({ color: c.value })}
              />
            )}
          </For>
        </div>
      </fieldset>
    </div>
  );
};
