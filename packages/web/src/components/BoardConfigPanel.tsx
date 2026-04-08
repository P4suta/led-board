import { type Component, For } from 'solid-js';
import type { DotShape } from '../canvas/sprite-atlas';
import type { FontName } from '../font/loader';
import type { BoardConfig } from '../state/types';
import { SliderRow } from './SliderRow';

export interface BoardConfigPanelProps {
  readonly config: BoardConfig;
  readonly onChange: (patch: Partial<BoardConfig>) => void;
}

const SHAPES: ReadonlyArray<{ value: DotShape; label: string; aria: string }> = [
  { value: 'round', label: '●', aria: '丸ドット' },
  { value: 'rounded', label: '◼', aria: '角丸ドット' },
  { value: 'square', label: '■', aria: '角ドット' },
];

const FONTS: ReadonlyArray<{ value: FontName; label: string }> = [
  { value: 'k8x12L', label: 'k8x12L (8×12)' },
  { value: 'MisakiGothic', label: '美咲ゴシック (8×8)' },
];

export const BoardConfigPanel: Component<BoardConfigPanelProps> = (props) => {
  return (
    <section class="panel-section">
      <header class="panel-section-header">
        <span class="status-led status-led--power" aria-hidden="true" />
        <h2 class="panel-heading">BOARD</h2>
        <span class="panel-section-id">BRD-01</span>
      </header>
      <div class="panel-section-body">
      <SliderRow
        id="cfg-cols"
        label="幅 (横方向 ↔)"
        value={props.config.cols}
        min={8}
        max={256}
        step={1}
        unit="ドット"
        onChange={(v) => props.onChange({ cols: v })}
      />

      <SliderRow
        id="cfg-rows"
        label="高さ (縦方向 ↕)"
        value={props.config.rows}
        min={8}
        max={128}
        step={1}
        unit="ドット"
        onChange={(v) => props.onChange({ rows: v })}
      />

      <fieldset class="field">
        <legend class="field-label">ドット形状</legend>
        <div class="segmented">
          <For each={SHAPES}>
            {(opt) => (
              <button
                type="button"
                aria-pressed={props.config.shape === opt.value}
                aria-label={opt.aria}
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

      <SliderRow
        id="cfg-glow"
        label="グロー (発光の滲み)"
        value={props.config.glow}
        min={0}
        max={12}
        step={1}
        onChange={(v) => props.onChange({ glow: v })}
      />

      <fieldset class="field">
        <label class="field-label" for="cfg-font">
          フォント
        </label>
        <select
          id="cfg-font"
          class="text-input"
          value={props.config.fontName}
          onChange={(e) => props.onChange({ fontName: e.currentTarget.value as FontName })}
        >
          <For each={FONTS}>{(f) => <option value={f.value}>{f.label}</option>}</For>
        </select>
      </fieldset>
      </div>
    </section>
  );
};
