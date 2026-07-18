import type { ReactNode } from "react";

import { classNames } from "./utils";

export interface SliderStep { value: string; label: string }
interface SliderCommonProps { disabled?: boolean; "aria-label"?: string; className?: string }
export interface NumericSliderProps extends SliderCommonProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number | undefined;
  label?: string;
  formatValue?: (value: number) => string;
  steps?: undefined;
}
export interface SteppedSliderProps extends SliderCommonProps {
  steps: readonly SliderStep[];
  value: string | undefined;
  onValueChange: (value: string) => void;
  muted?: boolean;
  startLabel?: string | undefined;
  endLabel?: string | undefined;
}
export type SliderProps = NumericSliderProps | SteppedSliderProps;

function precision(step: number): number {
  const decimal = String(step).split(".")[1];
  return decimal?.length ?? 0;
}

export function Slider(props: SliderProps): ReactNode {
  if (props.steps !== undefined) {
    const index = Math.max(0, props.steps.findIndex((step) => step.value === props.value));
    const current = props.steps[index];
    return (
      <div className={classNames("fraym-slider-wrap", props.muted && "is-muted", props.className)}>
        <div className="fraym-slider">
          <input aria-label={props["aria-label"] ?? "Select value"} disabled={props.disabled} max={Math.max(0, props.steps.length - 1)} min={0} step={1} type="range" value={index} onChange={(event) => { const next = props.steps[Number(event.currentTarget.value)]; if (next) props.onValueChange(next.value); }} />
          <span className="fraym-slider__value">{current?.label}</span>
        </div>
        {props.startLabel || props.endLabel ? <div className="fraym-slider__captions"><span>{props.startLabel}</span><span>{props.endLabel}</span></div> : null}
      </div>
    );
  }
  const min = props.min ?? 0;
  const max = props.max ?? 100;
  const step = props.step ?? 1;
  const value = Math.min(max, Math.max(min, props.value));
  return (
    <div className={classNames("fraym-slider", props.className)} data-slot="slider">
      <input aria-label={props["aria-label"] ?? props.label ?? "Select value"} disabled={props.disabled} max={max} min={min} step={step} type="range" value={value} onChange={(event) => props.onValueChange(Number(event.currentTarget.value))} />
      {props.label ? <span className="fraym-slider__label">{props.label}</span> : null}
      <span className="fraym-slider__value">{props.formatValue ? props.formatValue(value) : value.toFixed(precision(step))}</span>
    </div>
  );
}
