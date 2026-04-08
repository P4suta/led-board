import { type Component, For } from 'solid-js';
import type { DotShape } from '../canvas/sprite-atlas';
import type { FontName } from '../font/loader';
import type { BoardConfig } from '../state/types';

export interface BoardConfigPanelProps {
  readonly config: BoardConfig;
  readonly onChange: (patch: Partial<BoardConfig>) => void;
}

const SHAPES: ReadonlyArray<{ value: DotShape; label: string }> = [
  { value: 'round', label: '●' },
  { value: 'rounded', label: '◼' },
  { value: 'square', label: '■' },
];

const FONTS: ReadonlyArray<{ value: FontName; label: string }> = [
  { value: 'k8x12L', label: 'k8x12L (8×12)' },
  { value: 'MisakiGothic', label: '美咲ゴシック (8×8)' },
];

export const BoardConfigPanel: Component<BoardConfigPanelProps> = (props) => {
  return (
    <div class="board-config-panel">
      <h2 class="panel-heading">ボード設定</h2>

      <fieldset class="field">
        <label class="field-label" for="cfg-cols">
          列数: <span class="value-badge">{props.config.cols}</span>
        </label>
        <input
          id="cfg-cols"
          type="range"
          min={8}
          max={256}
          step={8}
          value={props.config.cols}
          onInput={(e) => props.onChange({ cols: Number(e.currentTarget.value) })}
          class="range-input"
        />
      </fieldset>

      <fieldset class="field">
        <label class="field-label" for="cfg-rows">
          行数: <span class="value-badge">{props.config.rows}</span>
        </label>
        <input
          id="cfg-rows"
          type="range"
          min={8}
          max={64}
          step={4}
          value={props.config.rows}
          onInput={(e) => props.onChange({ rows: Number(e.currentTarget.value) })}
          class="range-input"
        />
      </fieldset>

      <fieldset class="field">
        <legend class="field-label">ドット形状</legend>
        <div class="segmented">
          <For each={SHAPES}>
            {(opt) => (
              <button
                type="button"
                aria-pressed={props.config.shape === opt.value}
                class="segmented-option"
                classList={{ 'segmented-option--active': props.config.shape === opt.value }}
                onClick={() => props.onChange({ shape: opt.value })}
              >
                {opt.label}
              </button>
            )}
          </For>
        </div>
      </fieldset>

      <fieldset class="field">
        <label class="field-label" for="cfg-glow">
          グロー: <span class="value-badge">{props.config.glow}</span>
        </label>
        <input
          id="cfg-glow"
          type="range"
          min={0}
          max={12}
          step={1}
          value={props.config.glow}
          onInput={(e) => props.onChange({ glow: Number(e.currentTarget.value) })}
          class="range-input"
        />
      </fieldset>

      <fieldset class="field">
        <legend class="field-label">フォント</legend>
        <select
          class="text-input"
          value={props.config.fontName}
          onChange={(e) => props.onChange({ fontName: e.currentTarget.value as FontName })}
        >
          <For each={FONTS}>{(f) => <option value={f.value}>{f.label}</option>}</For>
        </select>
      </fieldset>
    </div>
  );
};
