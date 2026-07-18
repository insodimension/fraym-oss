import { useEffect, useState } from "react";
import "../css/avatars.css";
import type { AvatarProps } from "../types";

export { Smiley as SmileyFace };

const EGGS = ["wink", "heart", "party"] as const;
/** Idle this long (ms) and the smiley nods off. */
const SLEEP_AFTER_MS = 30_000;

/**
 * Smiley — a face that wears the session's emotion.
 *
 * The expression is driven by the SAME signals every Vibr reads
 * (`state` × `mode` × `energy`), so it morphs with the agent's intent:
 *
 *   idle              → content, slow blink, gentle float
 *   idle (a long while) → asleep: closed eyes, zzz, slow breathing
 *   thinking · think  → a calm, friendly up-glance + thought dots…
 *                       …with the skeptical raised-brow "hmm" only now and then
 *   thinking · search → curious: eyes dart side to side
 *   thinking · read   → focused: eyes scan left → right
 *   thinking · run    → determined: brows down, flat mouth, sweat as energy climbs
 *   thinking · run + high energy → OVERWORKED: the whole face wobbles, sweat pours
 *   thinking · edit   → concentrating: one eye squints, tongue out
 *   thinking · skill  → cool: sunglasses + smirk + twinkling sparkles
 *   thinking · mcp    → wide-eyed "oh!" plugged into a server
 *   typing            → happy chatter: big ^^ eyes, a talking mouth
 *
 * Plus a rare easter egg while idle (wink + heart / heart-eyes / party hat).
 * Expression switching is pure CSS keyed on data-attributes; the small JS here
 * just flips `data-think` (occasional hmm), `data-sleep` (long idle), and
 * `data-egg` (rare), each reset whenever the session state changes.
 *
 * `energy` (0–1) speeds the animation and beads sweat when the work gets heavy.
 */
export function Smiley({ state = "idle", mode = "", energy = 0, className }: AvatarProps) {
	const e = Math.max(0, Math.min(1, energy));
	const [sleeping, setSleeping] = useState(false);
	const [skeptical, setSkeptical] = useState(false);
	const [egg, setEgg] = useState<(typeof EGGS)[number] | "">("");

	// Doze off after a long idle; wake the instant the session does anything.
	useEffect(() => {
		if (state !== "idle") {
			setSleeping(false);
			return;
		}
		const timer = window.setTimeout(() => setSleeping(true), SLEEP_AFTER_MS);
		return () => window.clearTimeout(timer);
	}, [state]);

	// Thinking variety: mostly the calm face, the skeptical "hmm" once in a while.
	useEffect(() => {
		if (state !== "thinking" || mode !== "think") {
			setSkeptical(false);
			return;
		}
		let timer: number;
		const tick = () => {
			timer = window.setTimeout(
				() => {
					setSkeptical(Math.random() < 0.3);
					tick();
				},
				2600 + Math.random() * 2400,
			);
		};
		tick();
		return () => window.clearTimeout(timer);
	}, [state, mode]);

	// Rare easter egg while idle and awake.
	useEffect(() => {
		if (state !== "idle" || sleeping) {
			setEgg("");
			return;
		}
		let on: number;
		let off: number;
		const schedule = () => {
			on = window.setTimeout(
				() => {
					setEgg(EGGS[Math.floor(Math.random() * EGGS.length)] ?? "wink");
					off = window.setTimeout(() => setEgg(""), 1900);
					schedule();
				},
				22_000 + Math.random() * 48_000,
			);
		};
		schedule();
		return () => {
			window.clearTimeout(on);
			window.clearTimeout(off);
		};
	}, [state, sleeping]);

	return (
		<span
			className={`smiley${className ? ` ${className}` : ""}`}
			data-slot="vibr-smiley"
			data-state={state}
			data-mode={mode}
			data-load={e > 0.8 ? "high" : undefined}
			data-sleep={sleeping ? "" : undefined}
			data-think={skeptical ? "hmm" : undefined}
			data-egg={egg || undefined}
			style={{ "--sm-energy": e } as React.CSSProperties}
			aria-hidden="true"
		>
			<svg className="sm-svg" viewBox="0 0 32 32" width="20" height="20">
				<defs>
					<radialGradient id="sm-face-fill" cx="42%" cy="36%" r="72%">
						<stop offset="0%" stopColor="color-mix(in srgb, var(--warn) 60%, #fff)" />
						<stop offset="62%" stopColor="var(--warn)" />
						<stop offset="100%" stopColor="color-mix(in srgb, var(--warn) 72%, #000)" />
					</radialGradient>
				</defs>

				<circle className="sm-face" cx="16" cy="16" r="13" />

				<g className="sm-eyes">
					<g className="sm-eye sm-eye-l">
						<circle className="sm-pupil" cx="11" cy="14" r="2.1" />
						<path className="sm-arc" d="M8 15.4 Q11 11.8 14 15.4" />
					</g>
					<g className="sm-eye sm-eye-r">
						<circle className="sm-pupil" cx="21" cy="14" r="2.1" />
						<path className="sm-arc" d="M18 15.4 Q21 11.8 24 15.4" />
					</g>
				</g>

				<g className="sm-brows">
					<line className="sm-brow sm-brow-l" x1="7.6" y1="10.2" x2="14" y2="11.4" />
					<line className="sm-brow sm-brow-r" x1="18" y1="11.4" x2="24.4" y2="10.2" />
				</g>

				<path className="sm-mouth m-smile" d="M9.4 19 Q16 25 22.6 19" />
				<path className="sm-mouth m-think" d="M11.6 20.6 Q16 22.6 20.4 20.6" />
				<path className="sm-mouth m-hmm" d="M10.8 21 Q13.6 19 16.3 20.6 Q19 22.2 21.4 20" />
				<path className="sm-mouth m-flat" d="M11 21.2 L21 21.2" />
				<path className="sm-mouth m-smirk" d="M10.4 21.4 Q16 24.6 22 18.4" />
				<ellipse className="sm-mouth m-o" cx="16" cy="21" rx="2.6" ry="3" />
				<ellipse className="sm-mouth m-talk" cx="16" cy="20.6" rx="3" ry="2.3" />

				<path className="sm-tongue" d="M13.2 21.2 Q16 25.6 18.8 21.2 Z" />

				<g className="sm-shades">
					<path d="M6.6 12.4 H14.2 V14.6 Q14.2 17.4 10.4 17.4 Q6.6 17.4 6.6 14.6 Z" />
					<path d="M17.8 12.4 H25.4 V14.6 Q25.4 17.4 21.6 17.4 Q17.8 17.4 17.8 14.6 Z" />
					<line x1="14.2" y1="13" x2="17.8" y2="13" />
					<line className="sm-glint" x1="8.4" y1="13.6" x2="10.2" y2="16" />
				</g>

				<g className="sm-sparks">
					<path className="sm-spark s1" d="M6 7 L6.7 8.6 L8.3 9.3 L6.7 10 L6 11.6 L5.3 10 L3.7 9.3 L5.3 8.6 Z" />
					<path
						className="sm-spark s2"
						d="M26 8 L26.6 9.3 L27.9 9.9 L26.6 10.5 L26 11.8 L25.4 10.5 L24.1 9.9 L25.4 9.3 Z"
					/>
				</g>

				<path className="sm-sweat" d="M25.4 7.4 Q27.4 10.6 27.4 12.2 A2 2 0 1 1 23.4 12.2 Q23.4 10.6 25.4 7.4 Z" />

				<g className="sm-dots">
					<circle className="sm-dot d1" cx="22.5" cy="6.4" r="0.9" />
					<circle className="sm-dot d2" cx="26" cy="4.6" r="1.15" />
					<circle className="sm-dot d3" cx="29.6" cy="3.2" r="1.45" />
				</g>

				{/* sleep zzz (hidden until data-sleep) */}
				<g className="sm-zzz">
					<path className="z1" d="M21.4 9.4 h2 l-2 2.4 h2" />
					<path className="z2" d="M24.4 6.2 h2.6 l-2.6 3 h2.6" />
					<path className="z3" d="M28 2.8 h3.2 l-3.2 3.6 h3.2" />
				</g>

				{/* easter-egg props (hidden until data-egg) */}
				<path
					className="sm-heart"
					d="M16 9.2 C14.6 6.9 11.8 7.4 11.8 9.5 C11.8 11.2 14.2 12.6 16 14.2 C17.8 12.6 20.2 11.2 20.2 9.5 C20.2 7.4 17.4 6.9 16 9.2 Z"
				/>
				<g className="sm-party">
					<path className="sm-hat" d="M16 0.5 L11 8 L21 8 Z" />
					<circle className="sm-pom" cx="16" cy="0.8" r="1.1" />
					<circle className="sm-cf c1" cx="6" cy="5" r="0.9" />
					<circle className="sm-cf c2" cx="26" cy="5" r="0.9" />
					<circle className="sm-cf c3" cx="9" cy="2" r="0.8" />
					<circle className="sm-cf c4" cx="23" cy="2" r="0.8" />
					<circle className="sm-cf c5" cx="16" cy="1" r="0.8" />
				</g>
			</svg>
		</span>
	);
}
