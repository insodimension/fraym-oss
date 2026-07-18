import { Icon } from "../icons/icon";
import { cn } from "../lib/cn";

const SIZE_PX = { xs: 12, sm: 14, md: 18, lg: 24 } as const;
const STROKE = { xs: 2, sm: 2, md: 2.25, lg: 2.5 } as const;

export type SpinnerSize = keyof typeof SIZE_PX;

/** The loader animation. Each is a distinct "working" affordance; pick per context
 *  the way you'd pick a `@fraym/vibr` avatar or wisp preset. */
export type SpinnerKind = "circular" | "dots" | "bars" | "signal" | "orbit" | "bounce";

/** Lifecycle state shared by every kind:
 *  - `running` — animating (the default)
 *  - `idle` — the kind's resting shape, dimmed, no animation
 *  - `success` — settled to a ✓ (token `fr-add`)
 *  - `error` — settled to a ✗ (token `fr-del`) */
export type SpinnerState = "running" | "idle" | "success" | "error";

export interface SpinnerProps {
	/** Which loader to render. Defaults to `circular`. */
	readonly kind?: SpinnerKind;
	/** Lifecycle state. Defaults to `running`. */
	readonly state?: SpinnerState;
	/** Diameter preset. */
	readonly size?: SpinnerSize;
	readonly className?: string;
	/** Screen-reader label. Omit to render the spinner as decorative (`aria-hidden`). */
	readonly label?: string;
}

interface KindProps {
	readonly px: number;
	readonly stroke: number;
	readonly animate: boolean;
}

/** circular — the atomic ring arc; color inherited via `currentColor`. */
function CircularSpinner({ px, stroke, animate }: KindProps) {
	return (
		<svg
			className={cn("inline-block", animate && "animate-spin motion-reduce:animate-none")}
			width={px}
			height={px}
			viewBox="0 0 24 24"
			fill="none"
		>
			<circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={stroke} opacity={0.2} />
			<path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
		</svg>
	);
}

/** Clockwise perimeter walk of a `cols`×`rows` grid as row-major cell indices —
 *  phases the orbiting head of the dot-matrix loader around the ring in order. */
function perimeterOrder(cols: number, rows: number): number[] {
	const at = (r: number, c: number) => r * cols + c;
	const seq: number[] = [];
	for (let c = 0; c < cols; c++) seq.push(at(0, c)); // top, L→R
	for (let r = 1; r < rows; r++) seq.push(at(r, cols - 1)); // right, T→B
	if (rows > 1) for (let c = cols - 2; c >= 0; c--) seq.push(at(rows - 1, c)); // bottom, R→L
	if (cols > 1) for (let r = rows - 2; r >= 1; r--) seq.push(at(r, 0)); // left, B→T
	return seq;
}

/** dots — a square dot matrix with a lit head orbiting the perimeter while the
 *  grid cycles the semantic palette (recreates Engine's TUI "Working…" spinner). */
function DotsSpinner({ px, animate }: KindProps) {
	const grid = px <= 12 ? 2 : 3;
	const dot = Math.max(2, Math.round(px / 5));
	const duration = 0.9;
	const colorDuration = 3.6;
	const seq = perimeterOrder(grid, grid);
	const n = seq.length;
	const orderPos: (number | undefined)[] = new Array(grid * grid);
	seq.forEach((cell, pos) => {
		orderPos[cell] = pos;
	});
	const color = `, fr-dotcolor ${colorDuration}s linear 0s infinite`;
	return (
		<span
			className="grid place-items-center"
			style={{ gridTemplateColumns: `repeat(${grid}, 1fr)`, gap: Math.max(2, Math.round(dot * 0.9)) }}
		>
			{Array.from({ length: grid * grid }).map((_, cell) => {
				const pos = orderPos[cell];
				const base: React.CSSProperties = { width: dot, height: dot };
				const style: React.CSSProperties = !animate
					? { ...base, backgroundColor: "var(--fr-accent)", opacity: 0.3 }
					: pos !== undefined
						? { ...base, animation: `fr-dotspin ${duration}s linear ${-(pos / n) * duration}s infinite${color}` }
						: { ...base, opacity: 0.18, animation: `fr-dotcolor ${colorDuration}s linear 0s infinite` };
				return <span key={cell} className="rounded-full bg-fr-accent" style={style} />;
			})}
		</span>
	);
}

/** bars — an equalizer of vertical bars scaling on staggered offsets. */
function BarsSpinner({ px, animate }: KindProps) {
	const bars = 4;
	const bar = Math.max(2, Math.round(px / 7));
	return (
		<span className="inline-flex items-center" style={{ height: px, gap: Math.max(1, Math.round(px / 9)) }}>
			{Array.from({ length: bars }).map((_, i) => (
				<span
					key={i}
					className={cn("rounded-full bg-current", animate && "motion-reduce:animate-none")}
					style={{
						width: bar,
						height: px,
						transformOrigin: "center",
						animation: animate ? `fr-bar-scale 0.9s ease-in-out ${i * 0.12}s infinite` : undefined,
						transform: animate ? undefined : "scaleY(0.5)",
					}}
				/>
			))}
		</span>
	);
}

/** signal — a solid core with a ring that expands and fades (ping). */
function SignalSpinner({ px, animate }: KindProps) {
	const core = Math.max(4, Math.round(px * 0.55));
	return (
		<span className="relative inline-grid place-items-center" style={{ width: px, height: px }}>
			{animate && (
				<span
					className="col-start-1 row-start-1 rounded-full bg-current motion-reduce:hidden"
					style={{ width: px, height: px, animation: "fr-spinner-ping 1.1s cubic-bezier(0,0,0.2,1) infinite" }}
				/>
			)}
			<span className="col-start-1 row-start-1 rounded-full bg-current" style={{ width: core, height: core }} />
		</span>
	);
}

/** orbit — a faint track ring with a dot orbiting it. */
function OrbitSpinner({ px, animate }: KindProps) {
	const dot = Math.max(3, Math.round(px * 0.3));
	return (
		<span
			className={cn("relative inline-block", animate && "animate-spin motion-reduce:animate-none")}
			style={{ width: px, height: px }}
		>
			<span className="absolute inset-0 rounded-full border border-current opacity-20" />
			<span
				className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full bg-current"
				style={{ width: dot, height: dot }}
			/>
		</span>
	);
}

/** bounce — three dots bouncing on staggered offsets (the classic "thinking" /
 *  typing indicator; powers {@link ThinkingDots}). */
function BounceSpinner({ px, animate }: KindProps) {
	const dot = Math.max(3, Math.round(px / 2.8));
	const delays = [0, 0.15, 0.3];
	return (
		<span className="inline-flex items-center" style={{ height: px, gap: Math.max(2, Math.round(dot * 0.6)) }}>
			{delays.map((d, i) => (
				<span
					key={i}
					className="rounded-full bg-current"
					style={{
						width: dot,
						height: dot,
						animation: animate ? `fr-bounce 1.2s ${d}s infinite` : undefined,
						opacity: animate ? undefined : 0.4,
					}}
				/>
			))}
		</span>
	);
}

function KindBody({ kind, ...props }: KindProps & { readonly kind: SpinnerKind }) {
	switch (kind) {
		case "dots":
			return <DotsSpinner {...props} />;
		case "bars":
			return <BarsSpinner {...props} />;
		case "signal":
			return <SignalSpinner {...props} />;
		case "orbit":
			return <OrbitSpinner {...props} />;
		case "bounce":
			return <BounceSpinner {...props} />;
		default:
			return <CircularSpinner {...props} />;
	}
}

/**
 * Spinner — the loader category. `kind` selects the animation (circular ring, dots
 * matrix, equalizer bars, signal, orbiting dot, bouncing dots) the way a `@fraym/vibr`
 * avatar/wisp preset is chosen; `state` drives the lifecycle (running / idle /
 * success ✓ / error ✗). Color is inherited via `currentColor` (the `dots` kind
 * owns the semantic palette), so it matches its text context — set
 * `text-fr-accent` to override. For staged multi-step waits use {@link Labor}.
 */
export function Spinner({ kind = "circular", state = "running", size = "sm", className, label }: SpinnerProps) {
	const px = SIZE_PX[size];
	const a11y = label ? ({ role: "status", "aria-label": label } as const) : ({ "aria-hidden": true } as const);
	const root = (children: React.ReactNode) => (
		<span
			data-slot="spinner"
			data-spinner-kind={kind}
			data-spinner-state={state}
			{...a11y}
			className={cn("inline-flex items-center justify-center", state === "idle" && "opacity-40", className)}
		>
			{children}
		</span>
	);
	if (state === "success" || state === "error") {
		return root(
			<Icon
				name={state === "success" ? "check" : "x"}
				size={px}
				strokeWidth={2.4}
				className={state === "success" ? "text-fr-add" : "text-fr-del"}
			/>,
		);
	}
	return root(<KindBody kind={kind} px={px} stroke={STROKE[size]} animate={state === "running"} />);
}
