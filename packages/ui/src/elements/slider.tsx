import {
	type KeyboardEvent,
	type ReactNode,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useRef,
	useState,
} from "react";
import { cn } from "../lib/cn";
import { useHoverCapable } from "./media-queries";

/** Decorative tick count on the numeric track (matches the react-bits scrubber). */
const NUMERIC_TICKS = 9;
/** Stepped ticks/thumb ride an inset band so the edge steps are not clipped by the rounded track. */
const STEP_INSET = 8;
const TRACK_CLASS =
	"relative h-10 w-full select-none overflow-hidden rounded-md border border-fr-border-soft bg-fr-surface-2 outline-none touch-none focus-visible:ring-2 focus-visible:ring-fr-accent-line";

export interface SliderStep {
	readonly value: string;
	readonly label: string;
}

interface SliderCommonProps {
	readonly disabled?: boolean;
	readonly "aria-label"?: string;
	readonly className?: string;
}

export interface NumericSliderProps extends SliderCommonProps {
	/** Current value (controlled). Clamped to `[min, max]` and snapped to `step`. */
	readonly value: number;
	readonly onValueChange: (value: number) => void;
	/** Scale start. Default 0. */
	readonly min?: number;
	/** Scale end. Default 100. */
	readonly max?: number;
	/** Snap granularity. Default 1. */
	readonly step?: number;
	/** Inline caption rendered left, inside the track. */
	readonly label?: string;
	/** Formats the right-aligned readout. Default `String` at the step's precision. */
	readonly formatValue?: (value: number) => string;
	readonly steps?: undefined;
}

export interface SteppedSliderProps extends SliderCommonProps {
	/** Discrete ordered steps, low → high. Presence switches the slider to stepped mode. */
	readonly steps: readonly SliderStep[];
	/** Active step value; `undefined` renders no thumb (e.g. an external Auto mode). */
	readonly value: string | undefined;
	readonly onValueChange: (value: string) => void;
	/** Dim the track and hide the thumb when an external mode supersedes the scale. */
	readonly muted?: boolean;
	readonly startLabel?: string;
	readonly endLabel?: string;
}

export type SliderProps = NumericSliderProps | SteppedSliderProps;

/** Decimal places implied by a step like 0.05 → 2, so the drag readout matches the step. */
function stepPrecision(step: number): number {
	if (!Number.isFinite(step) || Math.floor(step) === step) return 0;
	const text = String(step);
	const dot = text.indexOf(".");
	return dot < 0 ? 0 : text.length - dot - 1;
}

/** The absolute-positioned track interior shared by both modes: value fill, tick bars,
 *  the capsule thumb (dim at rest, bright + full-size when active), and the inline label/readout. */
function ScrubberChrome({
	percent,
	ticks,
	thumbVisible,
	active,
	animate,
	label,
	value,
}: {
	readonly percent: number;
	readonly ticks: readonly number[];
	readonly thumbVisible: boolean;
	readonly active: boolean;
	readonly animate: boolean;
	readonly label?: string;
	readonly value?: string;
}): ReactNode {
	return (
		<>
			<span
				aria-hidden
				style={{ width: `${percent}%` }}
				className={cn(
					"pointer-events-none absolute inset-y-0 left-0 rounded-md bg-fr-text/[0.06]",
					animate && "transition-[width] duration-150 ease-out",
				)}
			/>
			<span aria-hidden className="pointer-events-none absolute inset-0">
				{ticks.map(left => (
					<span
						key={left}
						style={{ left: `${left}%` }}
						className="absolute top-1/2 h-2 w-px -translate-x-1/2 -translate-y-1/2 rounded-full bg-fr-border"
					/>
				))}
			</span>
			{thumbVisible && (
				<span
					aria-hidden
					style={{ left: `${percent}%`, marginLeft: "-6px" }}
					className={cn(
						"pointer-events-none absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2",
						animate && "transition-[left] duration-150 ease-out",
					)}
				>
					<span
						className={cn(
							"block h-[26px] w-[5px] rounded-full bg-fr-text transition-all duration-200 ease-out",
							active ? "scale-100 opacity-90" : "scale-75 opacity-20",
						)}
					/>
				</span>
			)}
			{label !== undefined && (
				<span className="pointer-events-none absolute left-3.5 top-1/2 z-20 -translate-y-1/2 fr-overflow text-[13px] text-fr-text-2">
					{label}
				</span>
			)}
			{value !== undefined && (
				<span className="pointer-events-none absolute right-3 top-1/2 z-20 -translate-y-1/2 font-secondary text-[13px] font-medium tabular-nums text-fr-text">
					{value}
				</span>
			)}
		</>
	);
}

/**
 * A fill-bar slider (a faithful port of react-bits' scrubber): the whole 40px row IS
 * the track, a subtle fill grows from the left to the value, tick bars mark the scale,
 * and a capsule thumb rides the value edge — dim at rest, bright on hover/drag. Drag
 * anywhere on the row (no thumb to hunt for).
 *
 * Two modes, one look, selected by the `steps` prop:
 * - **Numeric** (default): a smooth `[min, max]` range snapped to `step`, with nine
 *   decorative ticks, an optional inline `label` (left) + readout (right).
 * - **Stepped** (`steps` given): a DISCRETE labeled scale — one tick per step, the thumb
 *   snaps to the nearest step, optional `startLabel`/`endLabel` captions below, and a
 *   `muted` state (no thumb) for when an external mode supersedes the scale. Commits only
 *   on release/keypress and holds a local echo so an async consumer never flickers the knob.
 *
 * Theme-native (tokens flip per theme) and keyboard-complete (arrows step, Numeric
 * PageUp/Down jump ×10, Home/End clamp).
 */
export function Slider(props: SliderProps): ReactNode {
	if (props.steps) return <SteppedSliderImpl {...props} />;
	return <NumericSliderImpl {...props} />;
}

function NumericSliderImpl({
	value,
	onValueChange,
	min = 0,
	max = 100,
	step = 1,
	label,
	formatValue,
	disabled = false,
	className,
	"aria-label": ariaLabel,
}: NumericSliderProps): ReactNode {
	const trackRef = useRef<HTMLDivElement>(null);
	const [dragging, setDragging] = useState(false);
	const [hovering, setHovering] = useState(false);
	const hoverDevice = useHoverCapable();

	const span = max - min;
	const clamped = Math.min(max, Math.max(min, value));
	const percent = span <= 0 ? 0 : ((clamped - min) / span) * 100;
	const active = dragging || (hoverDevice && hovering);
	const readout = formatValue ? formatValue(clamped) : clamped.toFixed(stepPrecision(step));

	const snap = useCallback(
		(raw: number): number => {
			const stepped = Math.round((raw - min) / step) * step + min;
			const bounded = Math.min(max, Math.max(min, stepped));
			return Number(bounded.toFixed(stepPrecision(step)));
		},
		[min, max, step],
	);

	const valueFromClientX = useCallback(
		(clientX: number): number | null => {
			const rect = trackRef.current?.getBoundingClientRect();
			if (!rect || rect.width <= 0) return null;
			const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
			return snap(min + ratio * span);
		},
		[snap, min, span],
	);

	const onPointerDown = useCallback(
		(event: ReactPointerEvent<HTMLDivElement>) => {
			if (disabled) return;
			event.currentTarget.setPointerCapture(event.pointerId);
			setDragging(true);
			const next = valueFromClientX(event.clientX);
			if (next !== null && next !== clamped) onValueChange(next);
		},
		[disabled, valueFromClientX, clamped, onValueChange],
	);

	const onPointerMove = useCallback(
		(event: ReactPointerEvent<HTMLDivElement>) => {
			if (!dragging || disabled) return;
			const next = valueFromClientX(event.clientX);
			if (next !== null && next !== clamped) onValueChange(next);
		},
		[dragging, disabled, valueFromClientX, clamped, onValueChange],
	);

	const endDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		setDragging(false);
	}, []);

	const onKeyDown = useCallback(
		(event: KeyboardEvent<HTMLDivElement>) => {
			if (disabled) return;
			const page = step * 10;
			const moves: Record<string, number> = {
				ArrowRight: step,
				ArrowUp: step,
				ArrowLeft: -step,
				ArrowDown: -step,
				PageUp: page,
				PageDown: -page,
			};
			let next: number | null = null;
			const delta = moves[event.key];
			if (delta !== undefined) next = snap(clamped + delta);
			else if (event.key === "Home") next = min;
			else if (event.key === "End") next = max;
			if (next === null) return;
			event.preventDefault();
			if (next !== clamped) onValueChange(next);
		},
		[disabled, step, snap, clamped, min, max, onValueChange],
	);

	const ticks = Array.from({ length: NUMERIC_TICKS }, (_, i) => ((i + 1) / (NUMERIC_TICKS + 1)) * 100);

	return (
		<div
			ref={trackRef}
			data-slot="slider"
			role="slider"
			tabIndex={disabled ? -1 : 0}
			aria-label={ariaLabel ?? label}
			aria-valuemin={min}
			aria-valuemax={max}
			aria-valuenow={clamped}
			aria-disabled={disabled || undefined}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={endDrag}
			onPointerCancel={endDrag}
			onPointerEnter={() => setHovering(true)}
			onPointerLeave={() => setHovering(false)}
			onKeyDown={onKeyDown}
			className={cn(TRACK_CLASS, disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer", className)}
		>
			<ScrubberChrome
				percent={percent}
				ticks={ticks}
				thumbVisible
				active={active}
				animate={!dragging}
				{...(label !== undefined ? { label } : {})}
				value={readout}
			/>
		</div>
	);
}

function SteppedSliderImpl({
	steps,
	value,
	onValueChange,
	muted = false,
	startLabel,
	endLabel,
	disabled = false,
	className,
	"aria-label": ariaLabel,
}: SteppedSliderProps): ReactNode {
	const trackRef = useRef<HTMLDivElement>(null);
	const dragRectRef = useRef<DOMRect | null>(null);
	const [dragIndex, setDragIndex] = useState<number | null>(null);
	// Held echo: after committing, keep showing the committed step until the controlled
	// `value` round-trips off its pre-commit value, so an async consumer never flickers.
	const echoFromRef = useRef<{ index: number; from: string | undefined } | null>(null);
	const [hovering, setHovering] = useState(false);
	const hoverDevice = useHoverCapable();

	const last = steps.length - 1;
	const valueIndex = value === undefined ? -1 : steps.findIndex(s => s.value === value);
	if (echoFromRef.current !== null && value !== echoFromRef.current.from) echoFromRef.current = null;
	const activeIndex = dragIndex ?? echoFromRef.current?.index ?? valueIndex;
	// Ride an inset band so step 0 and step N are not clipped by the rounded/overflow track.
	const stepLeft = (index: number): number => (last <= 0 ? 50 : STEP_INSET + (index / last) * (100 - 2 * STEP_INSET));

	const indexFromClientX = useCallback(
		(clientX: number, rect: DOMRect | null): number | null => {
			if (!rect || rect.width <= 0 || last < 0) return null;
			const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
			const band = (ratio * 100 - STEP_INSET) / (100 - 2 * STEP_INSET);
			return Math.min(last, Math.max(0, Math.round(band * last)));
		},
		[last],
	);

	const commit = useCallback(
		(index: number | null) => {
			if (disabled || index === null || index < 0 || index > last) return;
			const step = steps[index];
			if (!step || step.value === value) return;
			echoFromRef.current = { index, from: value };
			onValueChange(step.value);
		},
		[disabled, last, steps, value, onValueChange],
	);

	const showThumb = activeIndex >= 0 && !muted;
	const active = !muted && (dragIndex !== null || (hoverDevice && hovering));
	const percent = activeIndex >= 0 ? stepLeft(activeIndex) : 0;
	const ticks = steps.map((_, index) => stepLeft(index));

	return (
		<div data-slot="slider-stepped" className={cn("select-none", muted && "opacity-60", className)}>
			<div
				ref={trackRef}
				role="slider"
				tabIndex={disabled ? -1 : 0}
				aria-label={ariaLabel}
				aria-valuemin={0}
				aria-valuemax={Math.max(0, last)}
				aria-valuenow={activeIndex >= 0 ? activeIndex : 0}
				aria-valuetext={activeIndex >= 0 ? steps[activeIndex]?.label : undefined}
				aria-disabled={disabled || undefined}
				className={cn(TRACK_CLASS, disabled ? "cursor-not-allowed" : "cursor-pointer")}
				onPointerDown={event => {
					if (disabled) return;
					const rect = event.currentTarget.getBoundingClientRect();
					dragRectRef.current = rect;
					try {
						event.currentTarget.setPointerCapture(event.pointerId);
					} catch {
						// Best-effort: a drag still tracks via pointermove without capture.
					}
					const index = indexFromClientX(event.clientX, rect);
					echoFromRef.current = null;
					if (index !== null) setDragIndex(index);
				}}
				onPointerMove={event => {
					if (disabled || event.buttons === 0 || dragRectRef.current === null) return;
					const index = indexFromClientX(event.clientX, dragRectRef.current);
					if (index !== null) setDragIndex(index);
				}}
				onPointerUp={event => {
					if (disabled) return;
					const index = indexFromClientX(event.clientX, dragRectRef.current);
					dragRectRef.current = null;
					setDragIndex(null);
					commit(index);
				}}
				onPointerCancel={() => {
					dragRectRef.current = null;
					echoFromRef.current = null;
					setDragIndex(null);
				}}
				onPointerEnter={() => setHovering(true)}
				onPointerLeave={() => setHovering(false)}
				onKeyDown={event => {
					if (disabled) return;
					const base = activeIndex < 0 ? 0 : activeIndex;
					if (event.key === "ArrowRight" || event.key === "ArrowUp") {
						event.preventDefault();
						commit(Math.min(last, base + 1));
					} else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
						event.preventDefault();
						commit(Math.max(0, base - 1));
					} else if (event.key === "Home") {
						event.preventDefault();
						commit(0);
					} else if (event.key === "End") {
						event.preventDefault();
						commit(last);
					}
				}}
			>
				<ScrubberChrome
					percent={percent}
					ticks={ticks}
					thumbVisible={showThumb}
					active={active}
					animate={dragIndex === null}
				/>
			</div>
			{(startLabel || endLabel) && (
				<div className="mt-1 flex items-center justify-between px-0.5 font-secondary text-fr-2xs text-fr-text-3">
					<span>{startLabel}</span>
					<span>{endLabel}</span>
				</div>
			)}
		</div>
	);
}
