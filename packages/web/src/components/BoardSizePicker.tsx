import { type Component, For } from 'solid-js';

export interface BoardSizePreset {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly cols: number;
  readonly rows: number;
}

/**
 * Real-world LED sign board sizes that map to recognizable use cases.
 *
 * Each preset is named like a hardware product line — picking "STANDARD"
 * feels like ordering a piece of equipment, not setting two abstract numbers.
 * The visual mini-board uses the actual cols/rows aspect so the user sees
 * exactly what they'll get.
 */
export const BOARD_PRESETS: ReadonlyArray<BoardSizePreset> = [
  { id: 'mini', label: 'MINI', description: '小型店頭', cols: 32, rows: 16 },
  { id: 'compact', label: 'COMPACT', description: '電光看板', cols: 64, rows: 16 },
  { id: 'standard', label: 'STANDARD', description: '駅構内案内', cols: 128, rows: 32 },
  { id: 'wide', label: 'WIDE', description: '大型駅案内', cols: 192, rows: 32 },
  { id: 'mega', label: 'MEGA', description: '街頭ビジョン', cols: 256, rows: 64 },
];

export interface BoardSizePickerProps {
  readonly cols: number;
  readonly rows: number;
  readonly onChange: (size: { cols: number; rows: number }) => void;
}

export const BoardSizePicker: Component<BoardSizePickerProps> = (props) => {
  const isActive = (p: BoardSizePreset): boolean => p.cols === props.cols && p.rows === props.rows;

  return (
    <fieldset class="field">
      <legend class="field-label">
        <span>サイズ</span>
        <span class="value-badge">
          {props.cols} × {props.rows}
        </span>
      </legend>
      <div class="board-preset-grid">
        <For each={BOARD_PRESETS}>
          {(preset) => (
            <button
              type="button"
              class="board-preset"
              classList={{ 'board-preset--active': isActive(preset) }}
              aria-pressed={isActive(preset)}
              onClick={() => props.onChange({ cols: preset.cols, rows: preset.rows })}
              title={`${preset.label} — ${preset.description} (${preset.cols} × ${preset.rows})`}
            >
              <span class="board-preset-thumb" aria-hidden="true">
                <span
                  class="board-preset-thumb-inner"
                  style={{
                    'aspect-ratio': `${preset.cols} / ${preset.rows}`,
                  }}
                />
              </span>
              <span class="board-preset-label">{preset.label}</span>
              <span class="board-preset-spec">
                {preset.cols}×{preset.rows}
              </span>
              <span class="board-preset-desc">{preset.description}</span>
            </button>
          )}
        </For>
      </div>
    </fieldset>
  );
};
