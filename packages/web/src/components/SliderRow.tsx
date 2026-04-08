import type { Component } from 'solid-js';

export interface SliderRowProps {
  /** DOM id used to associate the visible label with the slider input. */
  readonly id: string;
  /** Visible label text. */
  readonly label: string;
  /** Current value. */
  readonly value: number;
  readonly min: number;
  readonly max: number;
  /** Default step is 1 — fine-grained adjustment unless the field needs coarse steps. */
  readonly step?: number;
  /** Optional unit suffix shown after the number input (e.g. "ドット", "px/s"). */
  readonly unit?: string;
  readonly onChange: (value: number) => void;
}

/**
 * A two-input row pairing a `<input type="range">` with a `<input type="number">`.
 *
 * The slider is for coarse interaction; the number input is for precise typing
 * (with `inputmode="numeric"` so mobile keyboards open the digits pad). Both
 * stay in sync via the same value/onChange contract. Out-of-range typed values
 * are clamped before being applied.
 */
export const SliderRow: Component<SliderRowProps> = (props) => {
  const clamp = (v: number): number => Math.max(props.min, Math.min(props.max, v));
  const handleNumberInput = (raw: string): void => {
    if (raw === '') return;
    const v = Number(raw);
    if (Number.isFinite(v)) props.onChange(clamp(v));
  };
  return (
    <fieldset class="field">
      <label class="field-label" for={props.id}>
        {props.label}
      </label>
      <div class="slider-row">
        <input
          id={props.id}
          type="range"
          min={props.min}
          max={props.max}
          step={props.step ?? 1}
          value={props.value}
          onInput={(e) => props.onChange(Number(e.currentTarget.value))}
          class="range-input"
        />
        <input
          type="number"
          inputmode="numeric"
          min={props.min}
          max={props.max}
          step={props.step ?? 1}
          value={props.value}
          onInput={(e) => handleNumberInput(e.currentTarget.value)}
          class="number-input"
          aria-label={props.label}
        />
        {props.unit !== undefined && <span class="unit-label">{props.unit}</span>}
      </div>
    </fieldset>
  );
};
